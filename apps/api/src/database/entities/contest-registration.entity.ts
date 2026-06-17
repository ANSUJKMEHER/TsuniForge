import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  CreateDateColumn,
} from 'typeorm';
import { Contest } from './contest.entity';
import { User } from './user.entity';

@Entity('contest_registrations')
export class ContestRegistration {
  @PrimaryColumn({ name: 'contest_id', type: 'uuid' })
  contestId: string;

  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @CreateDateColumn({ name: 'registered_at' })
  registeredAt: Date;

  @Column({ type: 'int', name: 'final_rank', nullable: true })
  finalRank: number;

  @Column({ type: 'float', name: 'total_score', default: 0 })
  totalScore: number;

  @Column({ type: 'int', name: 'penalty_time', default: 0 })
  penaltyTime: number;

  // ─── Relations ────────────────────────────

  @ManyToOne(() => Contest, (contest) => contest.registrations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contest_id' })
  contest: Contest;

  @ManyToOne(() => User, (user) => user.contestRegistrations)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
