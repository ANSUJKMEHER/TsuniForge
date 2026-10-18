import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { Company } from '../../database/entities/company.entity';
import { Assessment } from '../../database/entities/assessment.entity';
import { AssessmentCandidate, CandidateStatusEnum } from '../../database/entities/assessment-candidate.entity';
import { User } from '../../database/entities/user.entity';

describe('AssessmentsService (Milestone 2 Data Integrity & BOLA Audit)', () => {
  let service: AssessmentsService;
  let companyRepo: any;
  let assessmentRepo: any;
  let candidateRepo: any;
  let userRepo: any;

  beforeEach(async () => {
    companyRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto, id: 'company-uuid-1' })),
      save: jest.fn((c) => Promise.resolve({ ...c, id: c.id || 'company-uuid-1' })),
    };

    assessmentRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn((a) => Promise.resolve({ ...a, id: 'assessment-uuid-1' })),
    };

    candidateRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((c) => Promise.resolve(c)),
    };

    userRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentsService,
        { provide: getRepositoryToken(Company), useValue: companyRepo },
        { provide: getRepositoryToken(Assessment), useValue: assessmentRepo },
        { provide: getRepositoryToken(AssessmentCandidate), useValue: candidateRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get<AssessmentsService>(AssessmentsService);
  });

  describe('DATA-INTEG-01: Auto-Derivation & Default Fields', () => {
    it('should auto-derive company domain if omitted', async () => {
      const company = await service.createCompany(
        { name: 'Acme Corp', website: 'https://acme.org/about' },
        'admin-user-1',
      );

      expect(companyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: 'acme.org',
          adminUserId: 'admin-user-1',
        }),
      );
    });

    it('should generate an 8-character uppercase alphanumeric inviteCode for new assessments', async () => {
      companyRepo.findOne.mockResolvedValue({
        id: 'company-1',
        adminUserId: 'admin-user-1',
      });

      const assessment = await service.createAssessment(
        {
          companyId: 'company-1',
          title: 'Senior Backend Engineer Assessment',
          durationMinutes: 90,
          validFrom: new Date().toISOString(),
          validUntil: new Date(Date.now() + 86400000).toISOString(),
          requireCamera: true,
          requireScreenShare: true,
          strictProctoring: true,
          problemIds: ['p1', 'p2'],
        },
        'admin-user-1',
      );

      expect(assessment.inviteCode).toBeDefined();
      expect(assessment.inviteCode).toMatch(/^[A-F0-9]{8}$/);
    });

    it('should populate candidate.email from user.email in addCandidate', async () => {
      companyRepo.findOne.mockResolvedValue({
        id: 'company-1',
        adminUserId: 'admin-user-1',
      });
      assessmentRepo.findOne.mockResolvedValue({
        id: 'assessment-1',
        companyId: 'company-1',
      });
      userRepo.findOne.mockResolvedValue({
        id: 'candidate-user-1',
        email: 'applicant@example.com',
      });

      await service.addCandidate(
        'assessment-1',
        { userId: 'candidate-user-1' },
        'admin-user-1',
      );

      expect(candidateRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          assessmentId: 'assessment-1',
          userId: 'candidate-user-1',
          email: 'applicant@example.com',
          status: CandidateStatusEnum.INVITED,
        }),
      );
    });
  });

  describe('SEC-AUTH-06: BOLA Prevention in Company Assessments', () => {
    it('should throw ForbiddenException if calling company user does not own the company', async () => {
      companyRepo.findOne.mockResolvedValue({
        id: 'company-target',
        adminUserId: 'company-owner-uuid',
      });

      await expect(
        service.getCompanyAssessments(
          'company-target',
          'attacker-user-uuid',
          'company',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should permit platform admin to inspect any company assessments', async () => {
      companyRepo.findOne.mockResolvedValue({
        id: 'company-target',
        adminUserId: 'company-owner-uuid',
      });

      const result = await service.getCompanyAssessments(
        'company-target',
        'admin-user-uuid',
        'admin',
      );
      expect(result).toBeDefined();
    });
  });

  describe('PROC-01 & PROC-02: Proctoring Events & Final Submission', () => {
    it('should durably record proctoring cheat events', async () => {
      candidateRepo.findOne.mockResolvedValue({
        assessmentId: 'assessment-1',
        userId: 'candidate-1',
        status: CandidateStatusEnum.STARTED,
        proctoringEvents: [],
      });

      const updated = await service.reportCheatEvent('assessment-1', 'candidate-1', {
        eventType: 'tab_switch',
        metadata: { tabUrl: 'https://stackoverflow.com' },
      });

      expect(updated.proctoringEvents).toHaveLength(1);
      expect(updated.proctoringEvents[0].type).toBe('tab_switch');
    });

    it('should transition candidate status to COMPLETED and record answers on submission', async () => {
      candidateRepo.findOne.mockResolvedValue({
        assessmentId: 'assessment-1',
        userId: 'candidate-1',
        status: CandidateStatusEnum.STARTED,
        proctoringEvents: [],
      });

      const updated = await service.submitAssessment('assessment-1', 'candidate-1', {
        answers: [
          { questionId: 'q1', code: 'console.log("hello");', language: 'javascript' },
        ],
      });

      expect(updated.status).toBe(CandidateStatusEnum.COMPLETED);
      expect(updated.completedAt).toBeDefined();
      expect(updated.proctoringEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'assessment_submission',
            answersCount: 1,
          }),
        ]),
      );
    });

    it('should throw BadRequestException if candidate has already completed assessment', async () => {
      candidateRepo.findOne.mockResolvedValue({
        assessmentId: 'assessment-1',
        userId: 'candidate-1',
        status: CandidateStatusEnum.COMPLETED,
        proctoringEvents: [],
      });

      await expect(
        service.submitAssessment('assessment-1', 'candidate-1', { answers: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if assessment end time has passed', async () => {
      candidateRepo.findOne.mockResolvedValue({
        assessmentId: 'assessment-1',
        userId: 'candidate-1',
        status: CandidateStatusEnum.STARTED,
        assessment: {
          endTime: new Date(Date.now() - 3600000), // 1 hour ago
        },
        proctoringEvents: [],
      });

      await expect(
        service.submitAssessment('assessment-1', 'candidate-1', { answers: [] }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
