import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { TestCase } from './test-case.entity';
import { Submission } from './submission.entity';

export enum DifficultyEnum {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

@Entity('problems')
export class Problem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ unique: true, length: 255 })
  @Index()
  slug: string;

  @Column({ type: 'text', name: 'description_md' })
  descriptionMd: string;

  @Column({
    type: 'enum',
    enum: DifficultyEnum,
    default: DifficultyEnum.MEDIUM,
  })
  @Index()
  difficulty: DifficultyEnum;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'int', name: 'time_limit_ms', default: 2000 })
  timeLimitMs: number;

  @Column({ type: 'int', name: 'memory_limit_mb', default: 256 })
  memoryLimitMb: number;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @Column({ name: 'is_published', default: false })
  isPublished: boolean;

  @Column({ type: 'float', name: 'acceptance_rate', default: 0 })
  acceptanceRate: number;

  @Column({ type: 'int', name: 'total_submissions', default: 0 })
  totalSubmissions: number;

  @Column({ type: 'jsonb', nullable: true })
  constraints: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // ─── Relations ────────────────────────────

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => TestCase, (tc) => tc.problem, { cascade: true })
  testCases: TestCase[];

  @OneToMany(() => Submission, (sub) => sub.problem)
  submissions: Submission[];
}
