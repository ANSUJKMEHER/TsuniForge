import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { SubmissionsGateway } from './submissions.gateway';
import { JudgeQueueService } from './judge-queue.service';
import { Submission } from '../../database/entities';
import { ProblemsModule } from '../problems/problems.module';
import { ContestsModule } from '../contests/contests.module';
import { MinioService } from '../../common/services/minio.service';
import { GeminiService } from '../../common/services/gemini.service';
import { MongodbLoggerService } from '../../common/services/mongodb-logger.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Submission]),
    ProblemsModule,
    ContestsModule,
    AuthModule,
  ],
  controllers: [SubmissionsController],
  providers: [
    SubmissionsService,
    SubmissionsGateway,
    JudgeQueueService,
    MinioService,
    GeminiService,
    MongodbLoggerService,
  ],
  exports: [SubmissionsService, SubmissionsGateway],
})
export class SubmissionsModule {}
