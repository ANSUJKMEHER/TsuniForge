import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { Submission, VerdictEnum } from '../../database/entities/submission.entity';
import { SubmissionsGateway } from './submissions.gateway';
import { ProblemsService } from '../problems/problems.service';
import { LeaderboardService } from '../contests/leaderboard.service';
import { MinioService } from '../../common/services/minio.service';
import { GeminiService } from '../../common/services/gemini.service';
import { MongodbLoggerService } from '../../common/services/mongodb-logger.service';

interface JudgeResult {
  submission_id: string;
  verdict: string;
  total_score: number;
  runtime_ms: number;
  memory_kb: number;
  test_cases_passed: number;
  total_test_cases: number;
  details: Array<{
    test_case_id: string;
    verdict: string;
    runtime_ms: number;
    memory_kb: number;
    actual_output: string;
    expected_output: string;
    stderr?: string;
  }>;
  compiler_output?: string;
  error?: string;
}

@Injectable()
export class JudgeQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JudgeQueueService.name);
  private publisher: Redis;
  private subscriber: Redis;
  private isListening = false;

  private readonly SUBMISSION_QUEUE = 'bull:submission_queue:waiting';
  private readonly RESULT_CHANNEL = 'submission_results';
  private watchdogInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
    private readonly gateway: SubmissionsGateway,
    private readonly problemsService: ProblemsService,
    private readonly leaderboardService: LeaderboardService,
    private readonly minioService: MinioService,
    private readonly geminiService: GeminiService,
    private readonly mongodbLogger: MongodbLoggerService,
  ) {
    const redisConfig = {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      maxRetriesPerRequest: null,
    };

    this.publisher = new Redis(redisConfig);
    this.subscriber = new Redis(redisConfig);
  }

  async onModuleInit() {
    this.logger.log('Initializing Judge Queue Service...');

    this.publisher.on('connect', () => {
      this.logger.log('Publisher connected to Redis');
    });

    this.publisher.on('error', (err) => {
      this.logger.error('Publisher Redis connection error:', err);
    });

    this.subscriber.on('connect', () => {
      this.logger.log('Subscriber connected to Redis');
    });

    this.subscriber.on('error', (err) => {
      this.logger.error('Subscriber Redis connection error:', err);
    });

    // Start listening for judge results
    await this.startResultListener();

    // Start watchdog for stuck PENDING/JUDGING submissions
    this.startWatchdog();
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Judge Queue Service...');
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = null;
    }
    if (this.subscriber) {
      await this.subscriber.unsubscribe(this.RESULT_CHANNEL);
      this.subscriber.disconnect();
    }
    if (this.publisher) {
      this.publisher.disconnect();
    }
  }

  // ─── Reconciliation Watchdog ─────────────────────

  private startWatchdog(): void {
    // Run watchdog every 30 seconds
    this.watchdogInterval = setInterval(async () => {
      try {
        await this.reconcileStuckSubmissions();
      } catch (err) {
        this.logger.error('Error during stuck submission reconciliation watchdog:', err);
      }
    }, 30000);
  }

  async reconcileStuckSubmissions(): Promise<number> {
    const thresholdDate = new Date(Date.now() - 60 * 1000); // 60 seconds ago

    const stuckSubmissions = await this.submissionRepo
      .createQueryBuilder('submission')
      .where('submission.verdict IN (:...verdicts)', {
        verdicts: [VerdictEnum.PENDING, VerdictEnum.JUDGING],
      })
      .andWhere('submission.submittedAt < :threshold', {
        threshold: thresholdDate,
      })
      .getMany();

    if (stuckSubmissions.length === 0) {
      return 0;
    }

    this.logger.warn(
      `Watchdog detected ${stuckSubmissions.length} stuck submissions (>60s). Reconciling...`,
    );

    for (const sub of stuckSubmissions) {
      try {
        await this.submissionRepo.update(sub.id, {
          verdict: VerdictEnum.SE,
        });

        this.gateway.emitSubmissionStatus(sub.id, {
          submissionId: sub.id,
          status: VerdictEnum.SE,
          message: 'Judging timed out: Worker did not return evaluation within 60 seconds',
        });

        this.logger.log(`Reconciled stuck submission ${sub.id} -> SE`);
      } catch (err) {
        this.logger.error(`Failed to reconcile submission ${sub.id}:`, err);
      }
    }

    return stuckSubmissions.length;
  }

  // ─── Enqueue a submission for the Go judge ───────

  async enqueueSubmission(
    submissionId: string,
    userId: string,
    problemId: string,
    language: string,
    sourceCode: string,
    contestId?: string | null,
  ): Promise<void> {
    // Fetch all test cases for this problem
    const problem = await this.problemsService.findWithAllTestCases(problemId);

    const job = {
      submission_id: submissionId,
      user_id: userId,
      problem_id: problemId,
      contest_id: contestId || '',
      language,
      source_code: sourceCode,
      time_limit_ms: problem.timeLimitMs || 2000,
      memory_limit_mb: problem.memoryLimitMb || 256,
      test_cases: problem.testCases.map((tc) => ({
        id: tc.id,
        input: tc.input,
        expected_output: tc.expectedOutput,
        score_weight: tc.scoreWeight ?? 1.0,
      })),
    };

    // Push to Redis list (Go judge does BLPOP on this key)
    await this.publisher.lpush(
      this.SUBMISSION_QUEUE,
      JSON.stringify(job),
    );

    this.logger.log(
      `Enqueued submission ${submissionId} [${language}] for problem ${problemId} (${problem.testCases.length} test cases)`,
    );
  }

  // ─── Listen for results from the Go judge ────────

  private async startResultListener(): Promise<void> {
    if (this.isListening) return;
    this.isListening = true;

    this.subscriber.subscribe(this.RESULT_CHANNEL, (err) => {
      if (err) {
        this.logger.error(`Failed to subscribe to ${this.RESULT_CHANNEL}:`, err);
        return;
      }
      this.logger.log(`Listening for judge results on channel: ${this.RESULT_CHANNEL}`);
    });

    this.subscriber.on('message', async (channel, message) => {
      if (channel !== this.RESULT_CHANNEL) return;

      try {
        const result: JudgeResult = JSON.parse(message);
        await this.handleJudgeResult(result);
      } catch (err) {
        this.logger.error('Failed to process judge result:', err);
      }
    });
  }

  // ─── Process a judge result ──────────────────────

  private pendingCustomRuns = new Map<string, (result: any) => void>();

  async enqueueCustomRun(
    runId: string,
    userId: string,
    language: string,
    sourceCode: string,
    customInput: string,
  ): Promise<any> {
    const job = {
      submission_id: runId,
      user_id: userId,
      problem_id: 'custom-playground',
      contest_id: '',
      language,
      source_code: sourceCode,
      time_limit_ms: 5000,
      memory_limit_mb: 256,
      test_cases: [
        {
          id: 'custom-1',
          input: customInput || '',
          expected_output: '', // No expected output for playground
          score_weight: 1.0,
        },
      ],
    };

    return new Promise((resolve, reject) => {
      // Set a timeout of 15 seconds so we don't leak memory if the engine crashes
      const timeout = setTimeout(() => {
        this.pendingCustomRuns.delete(runId);
        reject(new Error('Code execution timed out (15s)'));
      }, 15000);

      this.pendingCustomRuns.set(runId, (result) => {
        clearTimeout(timeout);
        this.pendingCustomRuns.delete(runId);
        resolve(result);
      });

      this.publisher.lpush(this.SUBMISSION_QUEUE, JSON.stringify(job)).catch(reject);
    });
  }

  private async handleJudgeResult(result: JudgeResult): Promise<void> {
    const submissionId = result.submission_id;
    this.logger.log(`Received result for submission ${submissionId}: ${result.verdict}`);

    // If this is a custom playground run, resolve the promise and skip DB
    if (submissionId.startsWith('run-')) {
      const resolver = this.pendingCustomRuns.get(submissionId);
      if (resolver) {
        resolver(result);
      }
      return;
    }

    // Map Go verdict strings to our enum
    const verdictMap: Record<string, VerdictEnum> = {
      AC: VerdictEnum.AC,
      WA: VerdictEnum.WA,
      TLE: VerdictEnum.TLE,
      MLE: VerdictEnum.MLE,
      RE: VerdictEnum.RE,
      CE: VerdictEnum.CE,
      SE: VerdictEnum.SE,
    };

    const verdict = verdictMap[result.verdict] || VerdictEnum.RE;

    // Update the submission in the database
    await this.submissionRepo.update(submissionId, {
      verdict,
      runtimeMs: result.runtime_ms,
      memoryKb: result.memory_kb,
      testCasesPassed: result.test_cases_passed,
      totalTestCases: result.total_test_cases,
      score:
        result.total_test_cases > 0
          ? (result.test_cases_passed / result.total_test_cases) * 100
          : 0,
    });

    // Update problem stats
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId },
      relations: ['user', 'contest', 'problem'],
    });

    if (submission) {
      await this.problemsService.updateStats(
        submission.problemId,
        verdict === VerdictEnum.AC,
      );

      // Trigger AI review asynchronously if Accepted (AC)
      if (verdict === VerdictEnum.AC) {
        this.runAsyncAiReview(submission).catch((err) => {
          this.logger.error(`AI Review trigger error for ${submission.id}:`, err);
        });
      }

      // Update contest leaderboard if applicable
      if (submission.contestId && submission.user) {
        const contestStartTime =
          submission.contest?.startTime?.getTime() || Date.now();
        const submissionTime = submission.submittedAt
          ? new Date(submission.submittedAt).getTime()
          : Date.now();
        const timeMs = Math.max(0, submissionTime - contestStartTime);

        const leaderboard = await this.leaderboardService.processSubmission(
          submission.contestId,
          submission.userId,
          submission.user.username,
          submission.problemId,
          result.verdict,
          timeMs,
        );

        this.gateway.emitLeaderboardUpdate(submission.contestId, leaderboard);
      }
    }

    // Emit real-time updates via WebSocket
    // First emit per-test-case details
    if (result.details) {
      for (let i = 0; i < result.details.length; i++) {
        const detail = result.details[i];
        this.gateway.emitSubmissionStatus(submissionId, {
          submissionId,
          status: 'JUDGING',
          testCase: i + 1,
          totalTestCases: result.total_test_cases,
          testCaseVerdict: detail.verdict,
          message: `Test case ${i + 1}/${result.total_test_cases}: ${detail.verdict}`,
        });
      }
    }

    // Then emit final result
    this.gateway.emitSubmissionStatus(submissionId, {
      submissionId,
      status: verdict,
      runtimeMs: result.runtime_ms,
      memoryKb: result.memory_kb,
      testCasesPassed: result.test_cases_passed,
      totalTestCases: result.total_test_cases,
      compilerOutput: result.compiler_output,
      message: `Judging complete: ${verdict}`,
    });

    // Log execution metrics to MongoDB
    this.mongodbLogger.logExecution(
      submissionId,
      submission?.problemId || 'unknown-problem',
      result.verdict,
      result.runtime_ms,
      result.memory_kb,
      result.test_cases_passed,
      result.total_test_cases
    ).catch((err) => {
      this.logger.error('Failed to log execution in MongoDB:', err);
    });
  }

  private async runAsyncAiReview(submission: Submission) {
    try {
      this.logger.log(`Starting background AI Code Review for submission ${submission.id}...`);

      if (!submission.codeKey) {
        this.logger.warn(`No codeKey found for submission ${submission.id}. Skipping AI review.`);
        return;
      }

      // 1. Fetch source code from MinIO
      const code = await this.minioService.getCode(submission.codeKey);

      // 2. Request Gemini Code Review
      const aiReview = await this.geminiService.reviewCode(
        code,
        submission.language,
        submission.problem?.title || 'Coding Problem',
        submission.problem?.descriptionMd || 'Analyze this code.',
      );

      if (aiReview) {
        // 3. Persist AI review result in Postgres
        await this.submissionRepo.update(submission.id, { aiReview });
        this.logger.log(`AI Code Review saved in DB for submission ${submission.id}`);

        // 4. Broadcast the review details via WebSocket
        this.gateway.emitSubmissionStatus(submission.id, {
          submissionId: submission.id,
          status: submission.verdict,
          aiReview,
          message: 'AI Code Review complete',
        });
      }
    } catch (error: any) {
      this.logger.error(`Failed to run background AI review for ${submission.id}:`, error);
    }
  }
}
