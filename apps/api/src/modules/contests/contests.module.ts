import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContestsController } from './contests.controller';
import { ContestsService } from './contests.service';
import { LeaderboardService } from './leaderboard.service';
import { PlagiarismService } from './plagiarism.service';
import { MinioService } from '../../common/services/minio.service';
import {
  Contest,
  ContestProblem,
  ContestRegistration,
  Submission,
} from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contest, ContestProblem, ContestRegistration, Submission]),
  ],
  controllers: [ContestsController],
  providers: [ContestsService, LeaderboardService, PlagiarismService, MinioService],
  exports: [ContestsService, LeaderboardService, PlagiarismService],
})
export class ContestsModule {}
