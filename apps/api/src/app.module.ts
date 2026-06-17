import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

// Database entities
import {
  User,
  Problem,
  TestCase,
  Submission,
  Contest,
  ContestProblem,
  ContestRegistration,
  Company,
  Assessment,
  AssessmentCandidate,
} from './database/entities';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { ProblemsModule } from './modules/problems/problems.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { ContestsModule } from './modules/contests/contests.module';
import { AssessmentsModule } from './modules/assessments/assessments.module';

// Common
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'tsuniforge'),
        password: configService.get<string>('DB_PASSWORD', 'tsuniforge_secret'),
        database: configService.get<string>('DB_DATABASE', 'tsuniforge'),
        entities: [
          User,
          Problem,
          TestCase,
          Submission,
          Contest,
          ContestProblem,
          ContestRegistration,
          Company,
          Assessment,
          AssessmentCandidate,
        ],
        synchronize: configService.get<string>('NODE_ENV') === 'development',
        logging: configService.get<string>('NODE_ENV') === 'development',
        autoLoadEntities: true,
      }),
    }),

    // Feature Modules
    AuthModule,
    ProblemsModule,
    SubmissionsModule,
    ContestsModule,
    AssessmentsModule,
  ],
  providers: [
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // Global logging interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // Global JWT auth guard (use @Public() to skip)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
