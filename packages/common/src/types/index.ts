// ============================================
// TsuniForge — Shared Type Definitions
// ============================================

// ─── User Types ───────────────────────────────

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  COMPANY = 'company',
}

export interface IUser {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  rating: number;
  problemsSolved: number;
  profileMetadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserProfile extends IUser {
  totalSubmissions: number;
  acceptedSubmissions: number;
  contestsParticipated: number;
  currentStreak: number;
  maxStreak: number;
  skillBreakdown: Record<string, number>;
}

// ─── Problem Types ────────────────────────────

export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export interface IProblem {
  id: string;
  title: string;
  slug: string;
  descriptionMd: string;
  difficulty: Difficulty;
  tags: string[];
  timeLimitMs: number;
  memoryLimitMb: number;
  createdBy: string;
  isPublished: boolean;
  acceptanceRate: number;
  totalSubmissions: number;
  constraints?: Record<string, any>;
  createdAt: Date;
}

export interface ITestCase {
  id: string;
  problemId: string;
  input: string;
  expectedOutput: string;
  isSample: boolean;
  orderIndex: number;
  scoreWeight: number;
}

// ─── Submission Types ─────────────────────────

export enum Language {
  CPP = 'cpp',
  JAVA = 'java',
  PYTHON = 'python',
}

export enum Verdict {
  PENDING = 'PENDING',
  JUDGING = 'JUDGING',
  ACCEPTED = 'AC',
  WRONG_ANSWER = 'WA',
  TIME_LIMIT_EXCEEDED = 'TLE',
  MEMORY_LIMIT_EXCEEDED = 'MLE',
  RUNTIME_ERROR = 'RE',
  COMPILATION_ERROR = 'CE',
}

export interface ISubmission {
  id: string;
  userId: string;
  problemId: string;
  contestId?: string;
  language: Language;
  verdict: Verdict;
  runtimeMs: number;
  memoryKb: number;
  score: number;
  testCasesPassed: number;
  totalTestCases: number;
  submittedAt: Date;
}

export interface ISubmissionDetail extends ISubmission {
  sourceCode: string;
  compilerOutput?: string;
  executionDetails: IExecutionDetail[];
  aiReview?: IAIReview;
}

export interface IExecutionDetail {
  testCaseId: string;
  actualOutput: string;
  expectedOutput: string;
  runtimeMs: number;
  memoryKb: number;
  verdict: Verdict;
  stderr?: string;
}

// ─── Contest Types ────────────────────────────

export enum ContestType {
  RATED = 'rated',
  UNRATED = 'unrated',
  VIRTUAL = 'virtual',
}

export enum ContestStatus {
  UPCOMING = 'upcoming',
  LIVE = 'live',
  ENDED = 'ended',
}

export interface IContest {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  type: ContestType;
  status: ContestStatus;
  createdBy: string;
  rules?: Record<string, any>;
  isPublic: boolean;
}

export interface IContestProblem {
  contestId: string;
  problemId: string;
  label: string; // A, B, C, ...
  maxScore: number;
  problem?: IProblem;
}

export interface ILeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl?: string;
  totalScore: number;
  penaltyTime: number;
  solvedProblems: string[]; // problem labels
  problemDetails: Record<string, {
    score: number;
    attempts: number;
    solvedAt?: Date;
    penalty: number;
  }>;
}

// ─── Company/Assessment Types ─────────────────

export interface ICompany {
  id: string;
  name: string;
  domain: string;
  logoUrl?: string;
  adminUserId: string;
  settings?: Record<string, any>;
  createdAt: Date;
}

export enum AssessmentCandidateStatus {
  INVITED = 'invited',
  STARTED = 'started',
  COMPLETED = 'completed',
  EVALUATED = 'evaluated',
}

export interface IAssessment {
  id: string;
  companyId: string;
  title: string;
  inviteCode: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  proctoringEnabled: boolean;
  antiCheatConfig?: Record<string, any>;
  createdAt: Date;
}

export interface IAssessmentCandidate {
  assessmentId: string;
  userId: string;
  email: string;
  status: AssessmentCandidateStatus;
  totalScore: number;
  proctoringEvents?: Record<string, any>[];
  startedAt?: Date;
  completedAt?: Date;
}

// ─── AI Review Types ──────────────────────────

export enum SuggestionType {
  OPTIMIZATION = 'optimization',
  BUG = 'bug',
  STYLE = 'style',
  SECURITY = 'security',
}

export enum Severity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export interface IAISuggestion {
  type: SuggestionType;
  lineRange: [number, number];
  message: string;
  severity: Severity;
  suggestedCode?: string;
}

export interface IAIReview {
  summary: string;
  suggestions: IAISuggestion[];
  timeComplexity: string;
  spaceComplexity: string;
  reviewedAt: Date;
}

// ─── API Response Types ───────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── WebSocket Event Types ────────────────────

export enum WSEvent {
  // Client → Server
  JOIN_CONTEST = 'join_contest',
  LEAVE_CONTEST = 'leave_contest',
  SUBSCRIBE_SUBMISSION = 'subscribe_submission',

  // Server → Client
  SUBMISSION_STATUS = 'submission_status',
  LEADERBOARD_UPDATE = 'leaderboard_update',
  CONTEST_ANNOUNCEMENT = 'contest_announcement',
  CONTEST_TIMER = 'contest_timer',
  NEW_SUBMISSION = 'new_submission',
}

export interface WSSubmissionStatus {
  submissionId: string;
  status: Verdict;
  testCase?: number;
  totalTestCases?: number;
}

export interface WSLeaderboardUpdate {
  contestId: string;
  rankings: ILeaderboardEntry[];
}

// ─── Auth Types ───────────────────────────────

export interface ITokenPayload {
  sub: string; // user id
  username: string;
  email: string;
  role: UserRole;
}

export interface IAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: IUser;
}

export interface ILoginDto {
  email: string;
  password: string;
}

export interface IRegisterDto {
  username: string;
  email: string;
  password: string;
}
