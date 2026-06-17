import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { ContestProblem } from './contest-problem.entity';
import { ContestRegistration } from './contest-registration.entity';

export enum ContestTypeEnum {
  RATED = 'rated',
  UNRATED = 'unrated',
  VIRTUAL = 'virtual',
}

export enum ContestStatusEnum {
  UPCOMING = 'upcoming',
  LIVE = 'live',
  ENDED = 'ended',
}

@Entity('contests')
export class Contest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamptz', name: 'start_time' })
  startTime: Date;

  @Column({ type: 'timestamptz', name: 'end_time' })
  endTime: Date;

  @Column({
    type: 'enum',
    enum: ContestTypeEnum,
    default: ContestTypeEnum.UNRATED,
  })
  type: ContestTypeEnum;

  @Column({
    type: 'enum',
    enum: ContestStatusEnum,
    default: ContestStatusEnum.UPCOMING,
  })
  status: ContestStatusEnum;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @Column({ type: 'jsonb', nullable: true })
  rules: Record<string, any>;

  @Column({ name: 'is_public', default: true })
  isPublic: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // ─── Relations ────────────────────────────

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => ContestProblem, (cp) => cp.contest, { cascade: true })
  contestProblems: ContestProblem[];

  @OneToMany(() => ContestRegistration, (reg) => reg.contest)
  registrations: ContestRegistration[];
}
