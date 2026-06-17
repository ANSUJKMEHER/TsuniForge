import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContestsController } from './contests.controller';
import { ContestsService } from './contests.service';
import { LeaderboardService } from './leaderboard.service';
import {
  Contest,
  ContestProblem,
  ContestRegistration,
} from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contest, ContestProblem, ContestRegistration]),
  ],
  controllers: [ContestsController],
  providers: [ContestsService, LeaderboardService],
  exports: [ContestsService, LeaderboardService],
})
export class ContestsModule {}
