import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
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
  ) {}

  // ─── Create Problem (Admin) ─────────────────

  async create(dto: CreateProblemDto, userId: string) {
    const slug = this.generateSlug(dto.title);

    const problem = this.problemRepo.create({
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

    const savedProblem = await this.problemRepo.save(problem);

    // Create test cases
    if (dto.testCases && dto.testCases.length > 0) {
      const testCases = dto.testCases.map((tc, index) =>
        this.testCaseRepo.create({
          problemId: savedProblem.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isSample: tc.isSample,
          orderIndex: tc.orderIndex ?? index,
          scoreWeight: tc.scoreWeight ?? 1.0,
        }),
      );
      await this.testCaseRepo.save(testCases);
    }

    return this.findBySlug(savedProblem.slug);
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
    const problem = await this.problemRepo.findOne({ where: { id } });

    if (!problem) {
      throw new NotFoundException('Problem not found');
    }

    await this.testCaseRepo.delete({ problemId: id });
    await this.problemRepo.remove(problem);

    return { message: 'Problem deleted successfully' };
  }

  // ─── Update Problem Stats ──────────────────

  async updateStats(problemId: string, accepted: boolean) {
    const problem = await this.problemRepo.findOne({
      where: { id: problemId },
    });

    if (!problem) return;

    problem.totalSubmissions += 1;

    // Recalculate acceptance rate
    if (accepted) {
      const totalAccepted = Math.round(
        (problem.acceptanceRate / 100) * (problem.totalSubmissions - 1),
      ) + 1;
      problem.acceptanceRate = parseFloat(
        ((totalAccepted / problem.totalSubmissions) * 100).toFixed(1),
      );
    } else {
      const totalAccepted = Math.round(
        (problem.acceptanceRate / 100) * (problem.totalSubmissions - 1),
      );
      problem.acceptanceRate = parseFloat(
        ((totalAccepted / problem.totalSubmissions) * 100).toFixed(1),
      );
    }

    await this.problemRepo.save(problem);
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
