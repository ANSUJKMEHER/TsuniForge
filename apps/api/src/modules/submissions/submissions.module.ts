import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { SubmissionsGateway } from './submissions.gateway';
import { JudgeQueueService } from './judge-queue.service';
import { Submission } from '../../database/entities';
import { ProblemsModule } from '../problems/problems.module';
import { ContestsModule } from '../contests/contests.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Submission]),
    ProblemsModule,
    ContestsModule,
  ],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, SubmissionsGateway, JudgeQueueService],
  exports: [SubmissionsService, SubmissionsGateway],
})
export class SubmissionsModule {}
