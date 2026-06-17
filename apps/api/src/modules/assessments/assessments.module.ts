import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';
import {
  Company,
  Assessment,
  AssessmentCandidate,
  User
} from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, Assessment, AssessmentCandidate, User]),
  ],
  controllers: [AssessmentsController],
  providers: [AssessmentsService],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}
