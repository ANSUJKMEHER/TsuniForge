import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  penaltyMs: number;
  problemsSolved: Record<string, {
    verdict: string;
    attempts: number;
    wrongAttempts?: number;
    timeMs: number;
    submissions?: Array<{ verdict: string; timeMs: number }>;
  }>;
}

@Injectable()
export class LeaderboardService {
  private readonly redis: Redis;
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
    });

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis for Leaderboards');
    });
    
    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error', err);
    });
  }

  // ─── Distributed Lock Helpers ──────────────

  private async acquireLock(
    key: string,
    ttlMs = 5000,
    maxRetries = 15,
    retryDelayMs = 50,
  ): Promise<string | null> {
    const token =
      Math.random().toString(36).substring(2) + Date.now().toString(36);
    for (let i = 0; i < maxRetries; i++) {
      const res = await this.redis.set(key, token, 'PX', ttlMs, 'NX');
      if (res === 'OK') {
        return token;
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
    return null;
  }

  private async releaseLock(key: string, token: string): Promise<void> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    try {
      await this.redis.eval(script, 1, key, token);
    } catch (err) {
      this.logger.error(`Error releasing lock ${key}:`, err);
    }
  }

  // ─── Update Leaderboard (ICPC Style) ────────

  async processSubmission(
    contestId: string,
    userId: string,
    username: string,
    problemId: string,
    verdict: string,
    timeMs: number, // Time from contest start in milliseconds
  ) {
    const key = `contest:${contestId}:leaderboard`;
    const userStateKey = `contest:${contestId}:user:${userId}`;
    const lockKey = `lock:contest:${contestId}:user:${userId}`;

    const lockToken = await this.acquireLock(lockKey);
    if (!lockToken) {
      this.logger.error(
        `Failed to acquire lock for contest ${contestId} user ${userId}; rejecting concurrent update`,
      );
      throw new ConflictException(
        `Concurrent leaderboard update in progress for user ${userId}. Please retry.`,
      );
    }

    try {
      // Get current state
      const stateStr = await this.redis.get(userStateKey);
      let state: LeaderboardEntry = stateStr
        ? JSON.parse(stateStr)
        : { userId, username, score: 0, penaltyMs: 0, problemsSolved: {} };

      // Initialize problem state if missing
      if (!state.problemsSolved[problemId]) {
        state.problemsSolved[problemId] = {
          verdict: 'PENDING',
          attempts: 0,
          wrongAttempts: 0,
          timeMs: 0,
          submissions: [],
        };
      }

      const pState = state.problemsSolved[problemId];
      if (!pState.submissions) {
        pState.submissions = [];
      }

      // Record submission event
      pState.submissions.push({ verdict, timeMs });

      // Deterministically sort all submissions by submission timestamp (timeMs)
      pState.submissions.sort((a, b) => a.timeMs - b.timeMs);

      // Recompute problem statistics from chronologically sorted history
      pState.attempts = pState.submissions.length;
      let solved = false;
      let solveTime = 0;
      let wrongAttemptsBeforeAc = 0;

      for (const sub of pState.submissions) {
        if (sub.verdict === 'AC') {
          solved = true;
          solveTime = sub.timeMs;
          break;
        }
        // ICPC Rule: Compile Errors (CE) do NOT incur wrong attempt penalties
        if (sub.verdict !== 'CE') {
          wrongAttemptsBeforeAc += 1;
        }
      }

      if (solved) {
        pState.verdict = 'AC';
        pState.timeMs = solveTime;
        pState.wrongAttempts = wrongAttemptsBeforeAc;
      } else {
        const lastSub = pState.submissions[pState.submissions.length - 1];
        pState.verdict = lastSub ? lastSub.verdict : verdict;
        pState.timeMs = 0;
        pState.wrongAttempts = pState.submissions.filter((s) => s.verdict !== 'CE').length;
      }

      // Recompute total score and total penalty for the user across all problems
      let totalScore = 0;
      let totalPenaltyMs = 0;

      for (const probId of Object.keys(state.problemsSolved)) {
        const prob = state.problemsSolved[probId];
        if (prob.verdict === 'AC') {
          totalScore += 1;
          const wrongAttempts = prob.wrongAttempts ?? 0;
          totalPenaltyMs += prob.timeMs + wrongAttempts * 20 * 60 * 1000;
        }
      }

      state.score = totalScore;
      state.penaltyMs = totalPenaltyMs;

      // Save state with a 14-day TTL to avoid unbounded Redis memory growth
      const TTL_SECONDS = 14 * 86400;
      await this.redis.set(userStateKey, JSON.stringify(state), 'EX', TTL_SECONDS);

      // Update ZSET (Sorted by Score descending, then Penalty ascending)
      const zscore = state.score * 1000000000 - state.penaltyMs;
      await this.redis.zadd(key, zscore, userId);
      await this.redis.expire(key, TTL_SECONDS);

    } finally {
      if (lockToken) {
        await this.releaseLock(lockKey, lockToken);
      }
    }

    return this.getLeaderboard(contestId);
  }

  // ─── Get Leaderboard ────────────────────────

  async getLeaderboard(contestId: string, limit = 100): Promise<LeaderboardEntry[]> {
    const key = `contest:${contestId}:leaderboard`;
    
    // Get top N users (ZREVRANGE for descending order)
    const userIds = await this.redis.zrevrange(key, 0, limit - 1);
    
    if (userIds.length === 0) return [];

    // Fetch user states
    const pipeline = this.redis.pipeline();
    for (const userId of userIds) {
      pipeline.get(`contest:${contestId}:user:${userId}`);
    }
    
    const results = await pipeline.exec();
    
    return results
      ?.map(([err, val]) => (val ? JSON.parse(val as string) : null))
      .filter((v) => v !== null) as LeaderboardEntry[];
  }
}
