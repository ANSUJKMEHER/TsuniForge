import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../../database/entities/company.entity';
import { Assessment } from '../../database/entities/assessment.entity';
import { AssessmentCandidate, CandidateStatusEnum } from '../../database/entities/assessment-candidate.entity';
import { User } from '../../database/entities/user.entity';
import { 
  CreateCompanyDto, 
  CreateAssessmentDto, 
  AddCandidateDto,
  ReportCheatEventDto 
} from './dto/assessment.dto';

@Injectable()
export class AssessmentsService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Assessment)
    private readonly assessmentRepo: Repository<Assessment>,
    @InjectRepository(AssessmentCandidate)
    private readonly candidateRepo: Repository<AssessmentCandidate>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ─── Company Management ─────────────────────

  async createCompany(dto: CreateCompanyDto, adminUserId: string) {
    const company = this.companyRepo.create({
      ...dto,
      adminUserId,
    });
    return this.companyRepo.save(company);
  }

  async getCompany(id: string) {
    const company = await this.companyRepo.findOne({ where: { id } });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  // ─── Assessment Management ──────────────────

  async createAssessment(dto: CreateAssessmentDto, adminUserId: string) {
    // Verify admin owns the company
    const company = await this.getCompany(dto.companyId);
    if (company.adminUserId !== adminUserId) {
      throw new ForbiddenException('Not authorized to create assessment for this company');
    }

    const assessment = new Assessment();
    assessment.companyId = dto.companyId;
    assessment.title = dto.title;
    assessment.durationMinutes = dto.durationMinutes;
    assessment.startTime = new Date(dto.validFrom);
    assessment.endTime = new Date(dto.validUntil);
    assessment.proctoringEnabled = dto.strictProctoring || dto.requireCamera || dto.requireScreenShare;
    assessment.antiCheatConfig = {
      requireCamera: dto.requireCamera,
      requireScreenShare: dto.requireScreenShare,
      strictProctoring: dto.strictProctoring,
      problemIds: dto.problemIds,
    };

    return this.assessmentRepo.save(assessment);
  }

  async getAssessment(id: string) {
    const assessment = await this.assessmentRepo.findOne({
      where: { id },
      relations: ['company'],
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    return assessment;
  }

  async getCompanyAssessments(companyId: string) {
    return this.assessmentRepo.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  // ─── Candidate Management & Proctoring ──────

  async addCandidate(assessmentId: string, dto: AddCandidateDto, adminUserId: string) {
    const assessment = await this.getAssessment(assessmentId);
    const company = await this.getCompany(assessment.companyId);
    if (company.adminUserId !== adminUserId) {
      throw new ForbiddenException('Not authorized');
    }

    // Verify user exists
    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');

    const candidate = this.candidateRepo.create({
      assessmentId,
      userId: dto.userId,
      status: CandidateStatusEnum.INVITED,
    });

    return this.candidateRepo.save(candidate);
  }

  async getCandidates(assessmentId: string, adminUserId: string) {
    const assessment = await this.getAssessment(assessmentId);
    const company = await this.getCompany(assessment.companyId);
    if (company.adminUserId !== adminUserId) {
      throw new ForbiddenException('Not authorized');
    }

    return this.candidateRepo.find({
      where: { assessmentId },
      relations: ['user'],
    });
  }

  async getCandidateSession(assessmentId: string, userId: string) {
    const candidate = await this.candidateRepo.findOne({
      where: { assessmentId, userId },
      relations: ['assessment'],
    });

    if (!candidate) throw new NotFoundException('Candidate invite not found');
    return candidate;
  }

  async startAssessment(assessmentId: string, userId: string) {
    const candidate = await this.getCandidateSession(assessmentId, userId);
    
    if (candidate.status !== CandidateStatusEnum.INVITED) {
      throw new ForbiddenException('Assessment already started or completed');
    }

    candidate.status = CandidateStatusEnum.STARTED;
    candidate.startedAt = new Date();
    
    return this.candidateRepo.save(candidate);
  }

  async completeAssessment(assessmentId: string, userId: string) {
    const candidate = await this.getCandidateSession(assessmentId, userId);
    
    if (candidate.status !== CandidateStatusEnum.STARTED) {
      throw new ForbiddenException('Assessment is not in progress');
    }

    candidate.status = CandidateStatusEnum.COMPLETED;
    candidate.completedAt = new Date();
    
    return this.candidateRepo.save(candidate);
  }

  async reportCheatEvent(assessmentId: string, userId: string, dto: ReportCheatEventDto) {
    const candidate = await this.getCandidateSession(assessmentId, userId);
    
    if (candidate.status !== CandidateStatusEnum.STARTED) {
      throw new ForbiddenException('Can only report events while in progress');
    }

    // Increment cheat flags and log event
    const currentFlags = candidate.proctoringEvents || [];
    currentFlags.push({
      timestamp: new Date().toISOString(),
      type: dto.eventType,
      metadata: dto.metadata,
    });

    candidate.proctoringEvents = currentFlags;
    return this.candidateRepo.save(candidate);
  }
}
