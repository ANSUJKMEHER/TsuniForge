import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan, MoreThan, And, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Contest, ContestTypeEnum } from '../../database/entities/contest.entity';
import { ContestProblem } from '../../database/entities/contest-problem.entity';
import { ContestRegistration } from '../../database/entities/contest-registration.entity';
import { CreateContestDto, ContestQueryDto } from './dto/contest.dto';

@Injectable()
export class ContestsService {
  constructor(
    @InjectRepository(Contest)
    private readonly contestRepo: Repository<Contest>,
    @InjectRepository(ContestProblem)
    private readonly contestProblemRepo: Repository<ContestProblem>,
    @InjectRepository(ContestRegistration)
    private readonly registrationRepo: Repository<ContestRegistration>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Create Contest (Admin) ─────────────────

  async create(dto: CreateContestDto, userId: string) {
    const savedContestId = await this.dataSource.transaction(async (manager) => {
      const contest = manager.create(Contest, {
        title: dto.title,
        description: dto.descriptionMd,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        type: dto.type,
        isPublic: dto.isPublic !== undefined ? dto.isPublic : true,
        createdBy: userId,
      });

      const saved = await manager.save(contest);

      if (dto.problems && dto.problems.length > 0) {
        const contestProblems = dto.problems.map((p) =>
          manager.create(ContestProblem, {
            contestId: saved.id,
            problemId: p.problemId,
            label: p.label,
            maxScore: p.score,
          }),
        );
        await manager.save(contestProblems);
      }

      return saved.id;
    });

    return this.findOne(savedContestId);
  }

  // ─── List Contests ──────────────────────────

  async findAll(query: ContestQueryDto) {
    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;

    const qb = this.contestRepo
      .createQueryBuilder('contest')
      .select([
        'contest.id',
        'contest.title',
        'contest.startTime',
        'contest.endTime',
        'contest.type',
      ])
      .orderBy('contest.startTime', 'DESC');

    const now = new Date();

    if (status === 'upcoming') {
      qb.andWhere('contest.startTime > :now', { now });
      qb.orderBy('contest.startTime', 'ASC');
    } else if (status === 'active') {
      qb.andWhere('contest.startTime <= :now AND contest.endTime >= :now', { now });
    } else if (status === 'past') {
      qb.andWhere('contest.endTime < :now', { now });
    }

    const [contests, total] = await qb
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: contests,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── Get Single Contest ─────────────────────

  async findOne(id: string) {
    const contest = await this.contestRepo.findOne({
      where: { id },
    });

    if (!contest) {
      throw new NotFoundException('Contest not found');
    }

    // Determine status
    const now = new Date();
    let status = 'active';
    if (now < contest.startTime) status = 'upcoming';
    if (now > contest.endTime) status = 'past';

    return { ...contest, status };
  }

  // ─── Get Contest Problems (If Active/Registered) ─

  async getContestProblems(contestId: string, userId: string) {
    const contest = await this.findOne(contestId);
    
    // Check if user is registered
    const isRegistered = await this.registrationRepo.findOne({
      where: { contestId, userId },
    });

    if (!isRegistered && !contest.isPublic) {
      throw new ForbiddenException('You must register for this contest first');
    }

    if (contest.status === 'upcoming') {
      throw new ForbiddenException('Contest has not started yet');
    }

    return this.contestProblemRepo.find({
      where: { contestId },
      relations: ['problem'],
      order: { label: 'ASC' },
    });
  }

  // ─── Register for Contest ───────────────────

  async register(contestId: string, userId: string, password?: string) {
    const contest = await this.contestRepo.findOne({ where: { id: contestId } });

    if (!contest) {
      throw new NotFoundException('Contest not found');
    }

    if (!contest.isPublic) {
      throw new ForbiddenException('Contest is private');
    }

    const existing = await this.registrationRepo.findOne({
      where: { contestId, userId },
    });

    if (existing) {
      throw new BadRequestException('Already registered for this contest');
    }

    const registration = this.registrationRepo.create({
      contestId,
      userId,
    });

    await this.registrationRepo.save(registration);

    // Participant count would be dynamically calculated or we can add it later if needed.

    return { message: 'Successfully registered for contest' };
  }
}
