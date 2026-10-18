jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    zadd: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    zrevrange: jest.fn().mockResolvedValue([]),
    eval: jest.fn().mockResolvedValue(1),
    pipeline: jest.fn().mockReturnValue({
      get: jest.fn(),
      exec: jest.fn().mockResolvedValue([]),
    }),
    disconnect: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
  }));
});

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConflictException } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

describe('LeaderboardService (Milestone 2 Concurrency & ICPC Audit)', () => {
  let service: LeaderboardService;
  let mockRedis: any;
  const store = new Map<string, string>();

  beforeEach(async () => {
    store.clear();

    mockRedis = {
      on: jest.fn(),
      get: jest.fn((k: string) => Promise.resolve(store.get(k) || null)),
      set: jest.fn((k: string, v: string) => {
        store.set(k, v);
        return Promise.resolve('OK');
      }),
      zadd: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      zrevrange: jest.fn().mockResolvedValue([]),
      eval: jest.fn().mockResolvedValue(1),
      pipeline: jest.fn().mockReturnValue({
        get: jest.fn(),
        exec: jest.fn().mockResolvedValue([]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaderboardService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def?: any) => {
              if (key === 'REDIS_HOST') return 'localhost';
              if (key === 'REDIS_PORT') return 6379;
              return def;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<LeaderboardService>(LeaderboardService);
    // Replace internal redis client with mock
    (service as any).redis = mockRedis;
  });

  describe('WS-REALTIME-03: ICPC Penalty Calculation', () => {
    it('should NOT incur 20-minute penalty for Compile Errors (CE)', async () => {
      const contestId = 'contest-1';
      const userId = 'user-1';
      const username = 'coder1';
      const problemId = 'prob-1';

      // 1. Submit CE at 5 minutes (300,000 ms)
      await service.processSubmission(
        contestId,
        userId,
        username,
        problemId,
        'CE',
        300000,
      );

      // 2. Submit WA at 10 minutes (600,000 ms)
      await service.processSubmission(
        contestId,
        userId,
        username,
        problemId,
        'WA',
        600000,
      );

      // 3. Submit AC at 15 minutes (900,000 ms)
      await service.processSubmission(
        contestId,
        userId,
        username,
        problemId,
        'AC',
        900000,
      );

      const userStateStr = store.get(`contest:${contestId}:user:${userId}`);
      expect(userStateStr).toBeDefined();
      const state = JSON.parse(userStateStr!);

      expect(state.score).toBe(1);
      // Expected ICPC penalty: solve time (900,000 ms) + 1 wrong attempt (20 mins = 1,200,000 ms)
      // CE should NOT add 20 minutes!
      const expectedPenaltyMs = 900000 + 1 * 20 * 60 * 1000; // 2,100,000 ms
      expect(state.penaltyMs).toBe(expectedPenaltyMs);
      expect(state.problemsSolved[problemId].wrongAttempts).toBe(1);
    });

    it('should correctly calculate penalty if submissions arrive out-of-order', async () => {
      const contestId = 'contest-2';
      const userId = 'user-2';
      const username = 'coder2';
      const problemId = 'prob-2';

      // AC at 15 mins arrives FIRST
      await service.processSubmission(
        contestId,
        userId,
        username,
        problemId,
        'AC',
        900000,
      );

      // Earlier WA at 10 mins arrives SECOND (due to worker delay)
      await service.processSubmission(
        contestId,
        userId,
        username,
        problemId,
        'WA',
        600000,
      );

      const userStateStr = store.get(`contest:${contestId}:user:${userId}`);
      const state = JSON.parse(userStateStr!);

      expect(state.score).toBe(1);
      // Even though AC arrived first, the WA was at 10m (< 15m), so 1 wrong attempt penalty must be counted!
      const expectedPenaltyMs = 900000 + 1 * 20 * 60 * 1000;
      expect(state.penaltyMs).toBe(expectedPenaltyMs);
    });

    it('should throw ConflictException if distributed lock cannot be acquired without synchronous retry delays', async () => {
      // Mock acquireLock directly to avoid 15x50ms (750ms) synchronous retry wait
      jest.spyOn(service as any, 'acquireLock').mockResolvedValue(null);

      await expect(
        service.processSubmission(
          'contest-1',
          'user-1',
          'coder1',
          'prob-1',
          'AC',
          50000,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should return null from acquireLock when redis set fails (tested with 0 delay)', async () => {
      mockRedis.set.mockResolvedValue(null);
      const token = await (service as any).acquireLock('test-lock-key', 5000, 1, 0);
      expect(token).toBeNull();
    });
  });
});
