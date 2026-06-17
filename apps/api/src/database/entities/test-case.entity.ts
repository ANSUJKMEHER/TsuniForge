import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Problem } from './problem.entity';

@Entity('test_cases')
export class TestCase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'problem_id', type: 'uuid' })
  problemId: string;

  @Column({ type: 'text' })
  input: string;

  @Column({ type: 'text', name: 'expected_output' })
  expectedOutput: string;

  @Column({ name: 'is_sample', default: false })
  isSample: boolean;

  @Column({ type: 'int', name: 'order_index', default: 0 })
  orderIndex: number;

  @Column({ type: 'float', name: 'score_weight', default: 1.0 })
  scoreWeight: number;

  // ─── Relations ────────────────────────────

  @ManyToOne(() => Problem, (problem) => problem.testCases, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'problem_id' })
  problem: Problem;
}
