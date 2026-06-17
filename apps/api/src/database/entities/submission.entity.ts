import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Problem } from './problem.entity';
import { Contest } from './contest.entity';

export enum LanguageEnum {
  CPP = 'cpp',
  JAVA = 'java',
  PYTHON = 'python',
}

export enum VerdictEnum {
  PENDING = 'PENDING',
  JUDGING = 'JUDGING',
  AC = 'AC',
  WA = 'WA',
  TLE = 'TLE',
  MLE = 'MLE',
  RE = 'RE',
  CE = 'CE',
}

@Entity('submissions')
export class Submission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'problem_id', type: 'uuid' })
  @Index()
  problemId: string;

  @Column({ name: 'contest_id', type: 'uuid', nullable: true })
  @Index()
  contestId: string | null;

  @Column({
    type: 'enum',
    enum: LanguageEnum,
  })
  language: LanguageEnum;

  @Column({
    type: 'enum',
    enum: VerdictEnum,
    default: VerdictEnum.PENDING,
  })
  verdict: VerdictEnum;

  @Column({ type: 'int', name: 'runtime_ms', default: 0 })
  runtimeMs: number;

  @Column({ type: 'int', name: 'memory_kb', default: 0 })
  memoryKb: number;

  @Column({ type: 'float', default: 0 })
  score: number;

  @Column({ type: 'int', name: 'test_cases_passed', default: 0 })
  testCasesPassed: number;

  @Column({ type: 'int', name: 'total_test_cases', default: 0 })
  totalTestCases: number;

  @CreateDateColumn({ name: 'submitted_at' })
  submittedAt: Date;

  // ─── Relations ────────────────────────────

  @ManyToOne(() => User, (user) => user.submissions)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Problem, (problem) => problem.submissions)
  @JoinColumn({ name: 'problem_id' })
  problem: Problem;

  @ManyToOne(() => Contest, { nullable: true })
  @JoinColumn({ name: 'contest_id' })
  contest: Contest;
}
