import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
} from 'typeorm';
import { Contest } from './contest.entity';
import { Problem } from './problem.entity';

@Entity('contest_problems')
export class ContestProblem {
  @PrimaryColumn({ name: 'contest_id', type: 'uuid' })
  contestId: string;

  @PrimaryColumn({ name: 'problem_id', type: 'uuid' })
  problemId: string;

  @Column({ length: 5 })
  label: string; // A, B, C, ...

  @Column({ type: 'int', name: 'max_score', default: 100 })
  maxScore: number;

  // ─── Relations ────────────────────────────

  @ManyToOne(() => Contest, (contest) => contest.contestProblems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contest_id' })
  contest: Contest;

  @ManyToOne(() => Problem)
  @JoinColumn({ name: 'problem_id' })
  problem: Problem;
}
