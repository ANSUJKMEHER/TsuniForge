import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
} from 'typeorm';
import { Assessment } from './assessment.entity';
import { User } from './user.entity';

export enum CandidateStatusEnum {
  INVITED = 'invited',
  STARTED = 'started',
  COMPLETED = 'completed',
  EVALUATED = 'evaluated',
}

@Entity('assessment_candidates')
export class AssessmentCandidate {
  @PrimaryColumn({ name: 'assessment_id', type: 'uuid' })
  assessmentId: string;

  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ length: 255 })
  email: string;

  @Column({
    type: 'enum',
    enum: CandidateStatusEnum,
    default: CandidateStatusEnum.INVITED,
  })
  status: CandidateStatusEnum;

  @Column({ type: 'float', name: 'total_score', default: 0 })
  totalScore: number;

  @Column({ type: 'jsonb', name: 'proctoring_events', nullable: true })
  proctoringEvents: Record<string, any>[];

  @Column({ type: 'timestamptz', name: 'started_at', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt: Date;

  // ─── Relations ────────────────────────────

  @ManyToOne(() => Assessment, (assessment) => assessment.candidates, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'assessment_id' })
  assessment: Assessment;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
