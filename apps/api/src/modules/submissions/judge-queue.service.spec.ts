jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    lpush: jest.fn().mockResolvedValue(1),
    subscribe: jest.fn((channel: string, cb?: any) => {
      if (typeof cb === 'function') cb(null);
      return Promise.resolve();
    }),
    unsubscribe: jest.fn().mockResolvedValue('OK'),
    disconnect: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
  }));
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JudgeQueueService } from './judge-queue.service';
import { Submission, VerdictEnum } from '../../database/entities/submission.entity';
import { SubmissionsGateway } from './submissions.gateway';
import { LeaderboardService } from '../contests/leaderboard.service';
import { ProblemsService } from '../problems/problems.service';
import { MinioService } from '../../common/services/minio.service';
import { GeminiService } from '../../common/services/gemini.service';
import { MongodbLoggerService } from '../../common/services/mongodb-logger.service';

describe('JudgeQueueService (Milestone 2 Stuck Submissions Watchdog & Concurrency)', () => {
  let service: JudgeQueueService;
  let submissionRepo: any;
  let gateway: any;
  let leaderboardService: any;
  let problemsService: any;

  beforeEach(async () => {
    submissionRepo = {
      createQueryBuilder: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(),
    };

    gateway = {
      emitSubmissionStatus: jest.fn(),
      emitLeaderboardUpdate: jest.fn(),
    };

    leaderboardService = {
      processSubmission: jest.fn().mockResolvedValue([]),
    };

    problemsService = {
      updateStats: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JudgeQueueService,
        { provide: getRepositoryToken(Submission), useValue: submissionRepo },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((k: string, def?: any) => {
              if (k === 'REDIS_HOST') return 'localhost';
              if (k === 'REDIS_PORT') return 6379;
              return def;
            }),
          },
        },
        { provide: SubmissionsGateway, useValue: gateway },
        { provide: LeaderboardService, useValue: leaderboardService },
        { provide: ProblemsService, useValue: problemsService },
        { provide: MinioService, useValue: { getCode: jest.fn() } },
        { provide: GeminiService, useValue: { reviewCode: jest.fn() } },
        { provide: MongodbLoggerService, useValue: { logExecution: jest.fn().mockResolvedValue({}) } },
      ],
    }).compile();

    service = module.get<JudgeQueueService>(JudgeQueueService);
  });

  afterEach(async () => {
    if (service) {
      await service.onModuleDestroy();
    }
  });

  describe('reconcileStuckSubmissions', () => {
    it('should reconcile stuck submissions to VerdictEnum.SE and emit gateway notification', async () => {
      const qbMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { id: 'sub-stuck-1', verdict: VerdictEnum.PENDING },
          { id: 'sub-stuck-2', verdict: VerdictEnum.JUDGING },
        ]),
      };
      submissionRepo.createQueryBuilder.mockReturnValue(qbMock);

      const reconciledCount = await service.reconcileStuckSubmissions();

      expect(reconciledCount).toBe(2);
      expect(submissionRepo.update).toHaveBeenCalledWith('sub-stuck-1', {
        verdict: VerdictEnum.SE,
      });
      expect(submissionRepo.update).toHaveBeenCalledWith('sub-stuck-2', {
        verdict: VerdictEnum.SE,
      });
      expect(gateway.emitSubmissionStatus).toHaveBeenCalledWith('sub-stuck-1', {
        submissionId: 'sub-stuck-1',
        status: VerdictEnum.SE,
        message: expect.stringContaining('Judging timed out'),
      });
      expect(gateway.emitSubmissionStatus).toHaveBeenCalledWith('sub-stuck-2', {
        submissionId: 'sub-stuck-2',
        status: VerdictEnum.SE,
        message: expect.stringContaining('Judging timed out'),
      });
    });

    it('should return 0 when no submissions are stuck', async () => {
      const qbMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      submissionRepo.createQueryBuilder.mockReturnValue(qbMock);

      const count = await service.reconcileStuckSubmissions();
      expect(count).toBe(0);
      expect(submissionRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('handleJudgeResult (CONCUR-QUEUE-06 Penalty Time Calculation)', () => {
    it('should calculate contest penalty time using submission.submittedAt instead of completion time', async () => {
      const contestStartTime = new Date('2026-10-18T10:00:00Z');
      const submissionTime = new Date('2026-10-18T10:15:00Z'); // 15 mins = 900,000 ms

      submissionRepo.findOne.mockResolvedValue({
        id: 'sub-contest-1',
        problemId: 'prob-1',
        contestId: 'contest-1',
        userId: 'user-1',
        user: { username: 'coder1' },
        contest: { startTime: contestStartTime },
        submittedAt: submissionTime,
      });

      await (service as any).handleJudgeResult({
        submission_id: 'sub-contest-1',
        verdict: 'AC',
        total_score: 100,
        runtime_ms: 120,
        memory_kb: 4096,
        test_cases_passed: 10,
        total_test_cases: 10,
        details: [],
      });

      expect(leaderboardService.processSubmission).toHaveBeenCalledWith(
        'contest-1',
        'user-1',
        'coder1',
        'prob-1',
        'AC',
        900000, // Exactly 15 minutes in ms: Math.max(0, submissionTime - contestStartTime)
      );
      expect(gateway.emitLeaderboardUpdate).toHaveBeenCalledWith('contest-1', []);
    });
  });
});
