import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission, LanguageEnum, VerdictEnum } from '../../database/entities/submission.entity';
import { ProblemsService } from '../problems/problems.service';
import { SubmissionsGateway } from './submissions.gateway';
import { JudgeQueueService } from './judge-queue.service';
import { CreateSubmissionDto, RunCodeDto, SubmissionQueryDto } from './dto/submission.dto';
import { MinioService } from '../../common/services/minio.service';

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
    private readonly problemsService: ProblemsService,
    private readonly gateway: SubmissionsGateway,
    private readonly judgeQueue: JudgeQueueService,
    private readonly minioService: MinioService,
  ) {}

  // ─── Submit Code ────────────────────────────

  async create(dto: CreateSubmissionDto, userId: string) {
    // Validate problem exists and get test case count
    const problem = await this.problemsService.findWithAllTestCases(dto.problemId);

    // Check source code size (max 64KB)
    if (Buffer.byteLength(dto.code, 'utf8') > 64 * 1024) {
      throw new BadRequestException('Source code exceeds 64KB limit');
    }

    // Create submission record
    const submission = new Submission();
    submission.userId = userId;
    submission.problemId = dto.problemId;
    submission.contestId = dto.contestId || null;
    submission.language = dto.language as LanguageEnum;
    submission.verdict = VerdictEnum.PENDING;
    submission.totalTestCases = problem.testCases.length;

    const saved = await this.submissionRepo.save(submission);

    // Upload code to MinIO object storage
    let codeKey: string | null = null;
    try {
      codeKey = await this.minioService.uploadCode(saved.id, dto.code, dto.language);
      await this.submissionRepo.update(saved.id, { codeKey });
      saved.codeKey = codeKey;
    } catch (err) {
      // Fail gracefully or log
    }

    // Notify via WebSocket
    this.gateway.emitSubmissionStatus(saved.id, {
      submissionId: saved.id,
      status: 'PENDING',
      message: 'Submission received, queued for judging',
    });

    // Enqueue to Redis for the Go judge engine
    await this.judgeQueue.enqueueSubmission(
      saved.id,
      userId,
      dto.problemId,
      dto.language,
      dto.code,
      dto.contestId,
    );

    // Update status to JUDGING
    this.gateway.emitSubmissionStatus(saved.id, {
      submissionId: saved.id,
      status: 'JUDGING',
      message: 'Code sent to judge engine, compiling...',
    });

    return {
      id: saved.id,
      status: 'PENDING',
      message: 'Submission queued for judging',
    };
  }

  // ─── Run Custom Test (No submission saved) ──

  async runCode(dto: RunCodeDto, userId: string) {
    const runId = `run-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    try {
      const result = await this.judgeQueue.enqueueCustomRun(
        runId,
        userId,
        dto.language,
        dto.code,
        dto.customInput
      );

      // Extract actual output from the first test case
      const output = result.details && result.details.length > 0
        ? result.details[0].actual_output || result.details[0].stderr || result.compiler_output
        : result.compiler_output || 'No output';

      return {
        status: 'completed',
        output: output,
        runtime: result.runtime_ms || 0,
        memory: result.memory_kb || 0,
        verdict: result.verdict,
      };
    } catch (error) {
      return {
        status: 'error',
        output: `Error executing code: ${error.message}`,
        runtime: 0,
        memory: 0,
        verdict: 'RE',
      };
    }
  }

  // ─── Get Single Submission ──────────────────

  async findOne(id: string) {
    const submission = await this.submissionRepo.findOne({
      where: { id },
      relations: ['problem', 'user'],
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    // Remove sensitive user data
    if (submission.user) {
      const { passwordHash, refreshToken, ...safeUser } = submission.user as any;
      submission.user = safeUser;
    }

    // Fetch code content from MinIO
    let code = '';
    if (submission.codeKey) {
      try {
        code = await this.minioService.getCode(submission.codeKey);
      } catch (err) {
        code = '/* Error loading code from S3 storage */';
      }
    }

    return {
      ...submission,
      code,
    };
  }

  // ─── List Submissions (Paginated) ───────────

  async findAll(query: SubmissionQueryDto) {
    const { page = 1, limit = 20, problemId, userId, language, verdict } = query;
    const skip = (page - 1) * limit;

    const qb = this.submissionRepo
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.problem', 'problem')
      .leftJoin('submission.user', 'user')
      .addSelect(['user.id', 'user.username', 'user.avatarUrl', 'user.rating'])
      .orderBy('submission.submittedAt', 'DESC');

    if (problemId) {
      qb.andWhere('submission.problemId = :problemId', { problemId });
    }

    if (userId) {
      qb.andWhere('submission.userId = :userId', { userId });
    }

    if (language) {
      qb.andWhere('submission.language = :language', { language });
    }

    if (verdict) {
      qb.andWhere('submission.verdict = :verdict', { verdict });
    }

    const [submissions, total] = await qb
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: submissions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── Get User's Submissions for a Problem ───

  async findByUserAndProblem(userId: string, problemId: string) {
    return this.submissionRepo.find({
      where: { userId, problemId },
      order: { submittedAt: 'DESC' },
      take: 20,
    });
  }
}
