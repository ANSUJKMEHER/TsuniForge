jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    zadd: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    zrevrange: jest.fn().mockResolvedValue([]),
    eval: jest.fn().mockResolvedValue(1),
    lpush: jest.fn().mockResolvedValue(1),
    subscribe: jest.fn((channel: string, cb?: any) => {
      if (typeof cb === 'function') cb(null);
      return Promise.resolve();
    }),
    unsubscribe: jest.fn().mockResolvedValue('OK'),
    pipeline: jest.fn().mockReturnValue({
      get: jest.fn(),
      exec: jest.fn().mockResolvedValue([]),
    }),
    disconnect: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
  }));
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AuthService } from './modules/auth/auth.service';
import { User, UserRoleEnum } from './database/entities/user.entity';
import { JudgeQueueService } from './modules/submissions/judge-queue.service';
import { Submission, VerdictEnum, LanguageEnum } from './database/entities/submission.entity';
import { SubmissionsGateway } from './modules/submissions/submissions.gateway';
import { LeaderboardService } from './modules/contests/leaderboard.service';
import { ProblemsService } from './modules/problems/problems.service';
import { MinioService } from './common/services/minio.service';
import { GeminiService } from './common/services/gemini.service';
import { MongodbLoggerService } from './common/services/mongodb-logger.service';
import { AssessmentsService } from './modules/assessments/assessments.service';
import { Company } from './database/entities/company.entity';
import { Assessment } from './database/entities/assessment.entity';
import { AssessmentCandidate, CandidateStatusEnum } from './database/entities/assessment-candidate.entity';

describe('EMPIRICAL ADVERSARIAL CHALLENGE SUITE (M4 Verification)', () => {
  // ─────────────────────────────────────────────────────────────────
  // 1. OAUTH ACCOUNT TAKEOVER CHALLENGES
  // ─────────────────────────────────────────────────────────────────
  describe('Challenge 1: OAuth Linking Protection & Account Takeover', () => {
    let authService: AuthService;
    let userRepo: any;
    let jwtService: any;
    let configService: any;

    beforeEach(async () => {
      userRepo = {
        findOne: jest.fn(),
        create: jest.fn((dto) => ({ ...dto, id: 'new-user-id' })),
        save: jest.fn((u) => Promise.resolve({ ...u, id: u.id || 'saved-user-id' })),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      jwtService = {
        signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
        verify: jest.fn(),
      };
      configService = {
        get: jest.fn((k, def) => def || 'test_secret_32_characters_long_min!'),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: getRepositoryToken(User), useValue: userRepo },
          { provide: JwtService, useValue: jwtService },
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      authService = module.get<AuthService>(AuthService);
    });

    it('C1.1: Should reject OAuth login if victim registered via email/password (no auto-linking)', async () => {
      // Victim has normal account
      const victimUser: Partial<User> = {
        id: 'victim-id',
        username: 'alice',
        email: 'alice@example.com',
        passwordHash: '$2b$12$hashedpassword',
        oauthProvider: undefined,
        oauthId: undefined,
      };

      // Attacker tries OAuth with alice's email
      userRepo.findOne
        .mockResolvedValueOnce(null) // no user with oauthProvider=github & oauthId=attacker-gh-id
        .mockResolvedValueOnce(victimUser); // existing user with email alice@example.com

      await expect(
        authService.oauthLogin('github', {
          id: 'attacker-gh-id',
          email: 'alice@example.com',
          displayName: 'Alice Attacker',
        }),
      ).rejects.toThrow(ConflictException);

      // Verify attacker did NOT overwrite oauthId or get tokens
      expect(userRepo.update).not.toHaveBeenCalled();
      expect(userRepo.save).not.toHaveBeenCalled();
    });

    it('C1.2: Should reject OAuth login if email exists under a different OAuth provider', async () => {
      const victimUser: Partial<User> = {
        id: 'victim-id',
        username: 'alice',
        email: 'alice@example.com',
        oauthProvider: 'google',
        oauthId: 'google-uid-12345',
      };

      // Attacker tries to hijack via GitHub
      userRepo.findOne
        .mockResolvedValueOnce(null) // no user with github & attacker-gh-id
        .mockResolvedValueOnce(victimUser); // existing user with alice@example.com

      await expect(
        authService.oauthLogin('github', {
          id: 'attacker-gh-id',
          email: 'alice@example.com',
          displayName: 'Attacker Fake Alice',
        }),
      ).rejects.toThrow(ConflictException);

      expect(userRepo.update).not.toHaveBeenCalled();
    });

    it('C1.3: Should permit legitimate OAuth login if provider and oauthId match', async () => {
      const existingLinkedUser: Partial<User> = {
        id: 'legit-user-id',
        username: 'alice_gh',
        email: 'alice@example.com',
        oauthProvider: 'github',
        oauthId: 'gh-legit-777',
      };

      userRepo.findOne.mockResolvedValueOnce(existingLinkedUser);

      const result = await authService.oauthLogin('github', {
        id: 'gh-legit-777',
        email: 'alice@example.com',
        displayName: 'Alice Legit',
      });

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.refreshToken).toBe('mock-jwt-token');
      expect(result.user.id).toBe('legit-user-id');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 2. REFRESH TOKEN ROTATION & RACE CONDITIONS
  // ─────────────────────────────────────────────────────────────────
  describe('Challenge 2: Refresh Token Rotation Concurrency & Grace Window', () => {
    let authService: AuthService;
    let userRepo: any;
    let jwtService: any;
    let configService: any;

    beforeEach(async () => {
      userRepo = {
        findOne: jest.fn(),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      jwtService = {
        signAsync: jest.fn().mockResolvedValue('new-token'),
        verify: jest.fn(),
      };
      configService = {
        get: jest.fn((k, def) => def || 'test_secret_32_characters_long_min!'),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: getRepositoryToken(User), useValue: userRepo },
          { provide: JwtService, useValue: jwtService },
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      authService = module.get<AuthService>(AuthService);
    });

    it('C2.1: Grace window permits concurrent request presenting previous token within 30s', async () => {
      const currentToken = 'token-gen-2';
      const previousToken = 'token-gen-1';
      const hashedCurrentToken = await bcrypt.hash(currentToken, 10);
      const hashedPreviousToken = await bcrypt.hash(previousToken, 10);

      jwtService.verify.mockReturnValue({ sub: 'user-1' });

      userRepo.findOne.mockResolvedValue({
        id: 'user-1',
        refreshToken: hashedCurrentToken,
        profileMetadata: {
          previousRefreshToken: hashedPreviousToken,
          tokenRotatedAt: Date.now() - 10000, // 10s ago (<30s)
          currentTokens: { accessToken: 'new-acc', refreshToken: currentToken },
        },
      });

      // Present previous token within grace window
      const result = await authService.refreshTokens({ refreshToken: previousToken });
      expect(result).toEqual({ accessToken: 'new-acc', refreshToken: currentToken });
      // Session should NOT be wiped
      expect(userRepo.update).not.toHaveBeenCalledWith('user-1', { refreshToken: '' });
    });

    it('C2.2: Grace window expired (>30s) wipes session on reuse of previous token (breach detection)', async () => {
      const currentToken = 'token-gen-2';
      const previousToken = 'token-gen-1';
      const hashedCurrentToken = await bcrypt.hash(currentToken, 10);
      const hashedPreviousToken = await bcrypt.hash(previousToken, 10);

      jwtService.verify.mockReturnValue({ sub: 'user-1' });

      userRepo.findOne.mockResolvedValue({
        id: 'user-1',
        refreshToken: hashedCurrentToken,
        profileMetadata: {
          previousRefreshToken: hashedPreviousToken,
          tokenRotatedAt: Date.now() - 35000, // 35s ago (>30s grace window)
        },
      });

      await expect(
        authService.refreshTokens({ refreshToken: previousToken }),
      ).rejects.toThrow(UnauthorizedException);

      // Verify user session was invalidated (wiped)
      expect(userRepo.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ refreshToken: '' }),
      );
    });

    it('C2.3: Stolen / unknown token immediately invalidates active session', async () => {
      const currentToken = 'token-gen-2';
      const hashedCurrentToken = await bcrypt.hash(currentToken, 10);

      jwtService.verify.mockReturnValue({ sub: 'user-1' });

      userRepo.findOne.mockResolvedValue({
        id: 'user-1',
        refreshToken: hashedCurrentToken,
        profileMetadata: {
          previousRefreshToken: null,
          tokenRotatedAt: null,
        },
      });

      await expect(
        authService.refreshTokens({ refreshToken: 'attacker-forged-token' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(userRepo.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ refreshToken: '' }),
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 3. WATCHDOG STUCK-SUBMISSION RECONCILIATION
  // ─────────────────────────────────────────────────────────────────
  describe('Challenge 3: Stuck-Submission Watchdog Reconciliation to SE', () => {
    let judgeQueueService: JudgeQueueService;
    let submissionRepo: any;
    let gateway: any;

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

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JudgeQueueService,
          { provide: getRepositoryToken(Submission), useValue: submissionRepo },
          {
            provide: ConfigService,
            useValue: { get: jest.fn(() => 'localhost') },
          },
          { provide: SubmissionsGateway, useValue: gateway },
          { provide: LeaderboardService, useValue: { processSubmission: jest.fn() } },
          { provide: ProblemsService, useValue: { updateStats: jest.fn() } },
          { provide: MinioService, useValue: { getCode: jest.fn() } },
          { provide: GeminiService, useValue: { reviewCode: jest.fn() } },
          { provide: MongodbLoggerService, useValue: { logExecution: jest.fn().mockResolvedValue({}) } },
        ],
      }).compile();

      judgeQueueService = module.get<JudgeQueueService>(JudgeQueueService);
    });

    afterEach(async () => {
      await judgeQueueService.onModuleDestroy();
    });

    it('C3.1: Reconciles all submissions in PENDING or JUDGING past 60s to VerdictEnum.SE', async () => {
      const qbMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { id: 'sub-stuck-pending', verdict: VerdictEnum.PENDING },
          { id: 'sub-stuck-judging', verdict: VerdictEnum.JUDGING },
        ]),
      };
      submissionRepo.createQueryBuilder.mockReturnValue(qbMock);

      const count = await judgeQueueService.reconcileStuckSubmissions();

      expect(count).toBe(2);
      expect(submissionRepo.update).toHaveBeenCalledWith('sub-stuck-pending', {
        verdict: VerdictEnum.SE,
      });
      expect(submissionRepo.update).toHaveBeenCalledWith('sub-stuck-judging', {
        verdict: VerdictEnum.SE,
      });
      expect(gateway.emitSubmissionStatus).toHaveBeenCalledWith('sub-stuck-pending', {
        submissionId: 'sub-stuck-pending',
        status: VerdictEnum.SE,
        message: expect.stringContaining('Judging timed out'),
      });
      expect(gateway.emitSubmissionStatus).toHaveBeenCalledWith('sub-stuck-judging', {
        submissionId: 'sub-stuck-judging',
        status: VerdictEnum.SE,
        message: expect.stringContaining('Judging timed out'),
      });
    });

    it('C3.2: Does not touch submissions when no stuck jobs exist', async () => {
      const qbMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      submissionRepo.createQueryBuilder.mockReturnValue(qbMock);

      const count = await judgeQueueService.reconcileStuckSubmissions();
      expect(count).toBe(0);
      expect(submissionRepo.update).not.toHaveBeenCalled();
      expect(gateway.emitSubmissionStatus).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 4. ICPC SCORING, OUT-OF-ORDER EXECUTION & COMPILE ERROR EXCLUSION
  // ─────────────────────────────────────────────────────────────────
  describe('Challenge 4: ICPC Scoring, Out-of-Order Execution & Error Rules', () => {
    let leaderboardService: LeaderboardService;
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
            useValue: { get: jest.fn(() => 'localhost') },
          },
        ],
      }).compile();

      leaderboardService = module.get<LeaderboardService>(LeaderboardService);
      (leaderboardService as any).redis = mockRedis;
    });

    it('C4.1: ICPC rules - Compile Error (CE) does not add 20 min penalty', async () => {
      // 3 CEs followed by AC at 10m
      await leaderboardService.processSubmission('c1', 'u1', 'user1', 'p1', 'CE', 60000);
      await leaderboardService.processSubmission('c1', 'u1', 'user1', 'p1', 'CE', 120000);
      await leaderboardService.processSubmission('c1', 'u1', 'user1', 'p1', 'CE', 180000);
      await leaderboardService.processSubmission('c1', 'u1', 'user1', 'p1', 'AC', 600000);

      const stateStr = store.get('contest:c1:user:u1');
      const state = JSON.parse(stateStr!);

      expect(state.score).toBe(1);
      expect(state.problemsSolved['p1'].wrongAttempts).toBe(0);
      expect(state.penaltyMs).toBe(600000); // Only solve time, 0 wrong attempts
    });

    it('C4.2: Out-of-order execution - Late arriving WA before AC recomputes penalty correctly', async () => {
      // AC at 20m arrives FIRST
      await leaderboardService.processSubmission('c1', 'u2', 'user2', 'p1', 'AC', 1200000);
      // WA at 10m arrives SECOND
      await leaderboardService.processSubmission('c1', 'u2', 'user2', 'p1', 'WA', 600000);

      const stateStr = store.get('contest:c1:user:u2');
      const state = JSON.parse(stateStr!);

      expect(state.score).toBe(1);
      expect(state.problemsSolved['p1'].wrongAttempts).toBe(1);
      // Solve time 20m + 1 wrong attempt (20m) = 40m = 2,400,000 ms
      expect(state.penaltyMs).toBe(1200000 + 20 * 60 * 1000);
    });

    it('C4.3: Submissions arriving AFTER AC do not incur penalty points', async () => {
      // AC at 10m
      await leaderboardService.processSubmission('c1', 'u3', 'user3', 'p1', 'AC', 600000);
      // User submits another solution at 25m and gets WA
      await leaderboardService.processSubmission('c1', 'u3', 'user3', 'p1', 'WA', 1500000);

      const stateStr = store.get('contest:c1:user:u3');
      const state = JSON.parse(stateStr!);

      expect(state.score).toBe(1);
      expect(state.problemsSolved['p1'].wrongAttempts).toBe(0);
      expect(state.penaltyMs).toBe(600000); // WA after AC ignored
    });

    it('C4.4: Multi-problem aggregation and tie-breaking zscore', async () => {
      // User solves p1 at 10m with 1 WA (at 5m) -> 10m + 20m = 30m = 1,800,000 ms
      await leaderboardService.processSubmission('c1', 'u4', 'user4', 'p1', 'WA', 300000);
      await leaderboardService.processSubmission('c1', 'u4', 'user4', 'p1', 'AC', 600000);

      // User solves p2 at 30m with 0 WA -> 30m = 1,800,000 ms
      await leaderboardService.processSubmission('c1', 'u4', 'user4', 'p2', 'AC', 1800000);

      const stateStr = store.get('contest:c1:user:u4');
      const state = JSON.parse(stateStr!);

      expect(state.score).toBe(2);
      expect(state.penaltyMs).toBe(1800000 + 1800000); // 3,600,000 ms
    });

    it('C4.5 (Adversarial Check): Behavior of System Error (SE) in leaderboard', async () => {
      // What happens if SE occurs?
      await leaderboardService.processSubmission('c1', 'u5', 'user5', 'p1', 'SE', 100000);
      await leaderboardService.processSubmission('c1', 'u5', 'user5', 'p1', 'AC', 600000);

      const stateStr = store.get('contest:c1:user:u5');
      const state = JSON.parse(stateStr!);

      // Observation: currently line 140 checks `sub.verdict !== 'CE'`.
      // So SE is currently counted as a wrong attempt (+1) unless explicitly exempted.
      expect(state.problemsSolved['p1'].wrongAttempts).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 5. BOLA GUARDS & PROCTORING PERSISTENCE
  // ─────────────────────────────────────────────────────────────────
  describe('Challenge 5: BOLA Guards & Proctoring Cheat Event Persistence', () => {
    let assessmentsService: AssessmentsService;
    let companyRepo: any;
    let assessmentRepo: any;
    let candidateRepo: any;
    let userRepo: any;

    beforeEach(async () => {
      companyRepo = {
        findOne: jest.fn(),
        create: jest.fn((dto) => ({ ...dto, id: 'comp-1' })),
        save: jest.fn((c) => Promise.resolve(c)),
      };
      assessmentRepo = {
        findOne: jest.fn(),
        find: jest.fn().mockResolvedValue([]),
        save: jest.fn((a) => Promise.resolve(a)),
      };
      candidateRepo = {
        findOne: jest.fn(),
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

      assessmentsService = module.get<AssessmentsService>(AssessmentsService);
    });

    it('C5.1: BOLA Prevention - Attacker company user cannot access other company assessments', async () => {
      companyRepo.findOne.mockResolvedValue({
        id: 'target-company',
        adminUserId: 'legit-company-admin',
      });

      await expect(
        assessmentsService.getCompanyAssessments(
          'target-company',
          'attacker-user-id',
          'company',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('C5.2: BOLA Prevention - Attacker company user cannot view candidate reports for other assessments', async () => {
      assessmentRepo.findOne.mockResolvedValue({
        id: 'target-assessment',
        companyId: 'company-x',
      });
      companyRepo.findOne.mockResolvedValue({
        id: 'company-x',
        adminUserId: 'legit-admin',
      });

      await expect(
        assessmentsService.getCandidates('target-assessment', 'attacker-admin'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('C5.3: Proctoring telemetry persistence - Tab switch, blur, copy/paste are appended to entity', async () => {
      const candidate: Partial<AssessmentCandidate> = {
        assessmentId: 'a1',
        userId: 'u1',
        status: CandidateStatusEnum.STARTED,
        proctoringEvents: [],
      };
      candidateRepo.findOne.mockResolvedValue(candidate);

      await assessmentsService.reportCheatEvent('a1', 'u1', {
        eventType: 'tab_switch',
        timestamp: '2026-10-18T12:00:00Z',
        metadata: { url: 'https://cheating-site.com' },
      });

      await assessmentsService.reportCheatEvent('a1', 'u1', {
        eventType: 'blur',
        timestamp: '2026-10-18T12:05:00Z',
      });

      expect(candidateRepo.save).toHaveBeenCalledTimes(2);
      expect(candidate.proctoringEvents).toHaveLength(2);
      expect(candidate.proctoringEvents![0].type).toBe('tab_switch');
      expect(candidate.proctoringEvents![1].type).toBe('blur');
    });

    it('C5.4: Cannot report cheat events or submit after status is COMPLETED', async () => {
      const candidate: Partial<AssessmentCandidate> = {
        assessmentId: 'a1',
        userId: 'u1',
        status: CandidateStatusEnum.COMPLETED,
        proctoringEvents: [],
      };
      candidateRepo.findOne.mockResolvedValue(candidate);

      await expect(
        assessmentsService.reportCheatEvent('a1', 'u1', {
          eventType: 'tab_switch',
        }),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        assessmentsService.submitAssessment('a1', 'u1', { answers: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('C5.5: Expired assessment validity window (endTime) prevents submission', async () => {
      const candidate: Partial<AssessmentCandidate> = {
        assessmentId: 'a1',
        userId: 'u1',
        status: CandidateStatusEnum.STARTED,
        assessment: {
          endTime: new Date(Date.now() - 60000), // Expired 1 min ago
        } as any,
        proctoringEvents: [],
      };
      candidateRepo.findOne.mockResolvedValue(candidate);

      await expect(
        assessmentsService.submitAssessment('a1', 'u1', { answers: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('C5.6 (Adversarial Gap Discovery): Candidate duration timeout vs assessment validity window', async () => {
      // If assessment validity window ends tomorrow, but duration is 90 mins and candidate started 5 hours ago:
      const candidate: Partial<AssessmentCandidate> = {
        assessmentId: 'a1',
        userId: 'u1',
        status: CandidateStatusEnum.STARTED,
        startedAt: new Date(Date.now() - 5 * 3600 * 1000), // 5 hours ago
        assessment: {
          durationMinutes: 90, // 90 min duration
          endTime: new Date(Date.now() + 86400 * 1000), // End time is tomorrow!
        } as any,
        proctoringEvents: [],
      };
      candidateRepo.findOne.mockResolvedValue(candidate);

      // In current implementation, submitAssessment only checks candidate.assessment?.endTime < new Date().
      // It does NOT check (Date.now() - candidate.startedAt > durationMinutes).
      // So this submission currently SUCCEEDS instead of throwing BadRequestException!
      const result = await assessmentsService.submitAssessment('a1', 'u1', { answers: [] });
      expect(result.status).toBe(CandidateStatusEnum.COMPLETED);
      // This empirically proves the timer duration enforcement gap!
    });
  });
});
