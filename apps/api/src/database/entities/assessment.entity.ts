import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Company } from './company.entity';
import { AssessmentCandidate } from './assessment-candidate.entity';

@Entity('assessments')
export class Assessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ length: 255 })
  title: string;

  @Column({ unique: true, name: 'invite_code', length: 20 })
  inviteCode: string;

  @Column({ type: 'timestamptz', name: 'start_time' })
  startTime: Date;

  @Column({ type: 'timestamptz', name: 'end_time' })
  endTime: Date;

  @Column({ type: 'int', name: 'duration_minutes' })
  durationMinutes: number;

  @Column({ name: 'proctoring_enabled', default: false })
  proctoringEnabled: boolean;

  @Column({ type: 'jsonb', name: 'anti_cheat_config', nullable: true })
  antiCheatConfig: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // ─── Relations ────────────────────────────

  @ManyToOne(() => Company, (company) => company.assessments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToMany(() => AssessmentCandidate, (ac) => ac.assessment)
  candidates: AssessmentCandidate[];
}
