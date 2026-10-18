import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ILike, In } from 'typeorm';
import { Problem, DifficultyEnum } from '../../database/entities/problem.entity';
import { TestCase } from '../../database/entities/test-case.entity';
import { CreateProblemDto, UpdateProblemDto, ProblemQueryDto } from './dto/problem.dto';

@Injectable()
export class ProblemsService {
  constructor(
    @InjectRepository(Problem)
    private readonly problemRepo: Repository<Problem>,
    @InjectRepository(TestCase)
    private readonly testCaseRepo: Repository<TestCase>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Create Problem (Admin) ─────────────────

  async create(dto: CreateProblemDto, userId: string) {
    const slug = this.generateSlug(dto.title);

    const savedSlug = await this.dataSource.transaction(async (manager) => {
      const problem = manager.create(Problem, {
        title: dto.title,
        slug,
        descriptionMd: dto.descriptionMd,
        difficulty: dto.difficulty as DifficultyEnum,
        tags: dto.tags,
        timeLimitMs: dto.timeLimitMs || 2000,
        memoryLimitMb: dto.memoryLimitMb || 256,
        createdBy: userId,
        isPublished: false,
      });

      const savedProblem = await manager.save(problem);

      // Create test cases
      if (dto.testCases && dto.testCases.length > 0) {
        const testCases = dto.testCases.map((tc, index) =>
          manager.create(TestCase, {
            problemId: savedProblem.id,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isSample: tc.isSample,
            orderIndex: tc.orderIndex ?? index,
            scoreWeight: tc.scoreWeight ?? 1.0,
          }),
        );
        await manager.save(testCases);
      }

      return savedProblem.slug;
    });

    return this.findBySlug(savedSlug);
  }

  // ─── List Problems (Paginated + Filtered) ───

  async findAll(query: ProblemQueryDto, includeUnpublished = false) {
    const { page = 1, limit = 20, difficulty, tags, search } = query;
    const skip = (page - 1) * limit;

    const qb = this.problemRepo
      .createQueryBuilder('problem')
      .select([
        'problem.id',
        'problem.title',
        'problem.slug',
        'problem.difficulty',
        'problem.tags',
        'problem.acceptanceRate',
        'problem.totalSubmissions',
        'problem.isPublished',
        'problem.createdAt',
      ])
      .orderBy('problem.createdAt', 'DESC');

    if (!includeUnpublished) {
      qb.andWhere('problem.isPublished = :isPublished', { isPublished: true });
    }

    if (difficulty) {
      qb.andWhere('problem.difficulty = :difficulty', { difficulty });
    }

    if (tags) {
      const tagList = tags.split(',').map((t) => t.trim());
      qb.andWhere('problem.tags && :tags', { tags: tagList });
    }

    if (search) {
      qb.andWhere(
        '(problem.title ILIKE :search OR problem.slug ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [problems, total] = await qb
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: problems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── Get Single Problem by Slug ─────────────

  async findBySlug(slug: string, includeSampleTestCases = true) {
    const qb = this.problemRepo
      .createQueryBuilder('problem')
      .where('problem.slug = :slug', { slug });

    if (includeSampleTestCases) {
      qb.leftJoinAndSelect(
        'problem.testCases',
        'testCase',
        'testCase.isSample = :isSample',
        { isSample: true },
      );
    }

    const problem = await qb.getOne();

    if (!problem) {
      throw new NotFoundException(`Problem '${slug}' not found`);
    }

    return problem;
  }

  // ─── Get Problem with ALL Test Cases (for Judge) ─

  async findWithAllTestCases(problemId: string) {
    const problem = await this.problemRepo.findOne({
      where: { id: problemId },
      relations: ['testCases'],
    });

    if (!problem) {
      throw new NotFoundException(`Problem not found`);
    }

    // Sort test cases by order
    problem.testCases.sort((a, b) => a.orderIndex - b.orderIndex);

    return problem;
  }

  // ─── Update Problem (Admin) ─────────────────

  async update(id: string, dto: UpdateProblemDto, userId: string) {
    const problem = await this.problemRepo.findOne({ where: { id } });

    if (!problem) {
      throw new NotFoundException('Problem not found');
    }

    if (dto.title) {
      problem.slug = this.generateSlug(dto.title);
    }

    Object.assign(problem, dto);
    await this.problemRepo.save(problem);

    return this.findBySlug(problem.slug);
  }

  // ─── Delete Problem (Admin) ─────────────────

  async remove(id: string) {
    return await this.dataSource.transaction(async (manager) => {
      const problem = await manager.findOne(Problem, { where: { id } });

      if (!problem) {
        throw new NotFoundException('Problem not found');
      }

      await manager.delete(TestCase, { problemId: id });
      await manager.remove(problem);

      return { message: 'Problem deleted successfully' };
    });
  }

  // ─── Update Problem Stats ──────────────────

  async updateStats(problemId: string, accepted: boolean) {
    // Atomic SQL query builder increment avoiding non-atomic read-modify-write lost updates
    await this.problemRepo
      .createQueryBuilder()
      .update(Problem)
      .set({
        totalSubmissions: () => 'total_submissions + 1',
        acceptanceRate: () =>
          accepted
            ? 'ROUND((( (acceptance_rate / 100.0) * total_submissions + 1.0 ) / (total_submissions + 1.0) * 100.0)::numeric, 1)'
            : 'ROUND((( (acceptance_rate / 100.0) * total_submissions ) / (total_submissions + 1.0) * 100.0)::numeric, 1)',
      })
      .where('id = :id', { id: problemId })
      .execute();
  }

  // ─── Helpers ────────────────────────────────

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);
  }
}
