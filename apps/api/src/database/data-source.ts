import { DataSource } from 'typeorm';
import { config } from 'dotenv';
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
} from './entities';

config(); // load .env

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'tsuniforge',
  password: process.env.DB_PASSWORD || 'tsuniforge_secret',
  database: process.env.DB_DATABASE || 'tsuniforge',
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
  migrations: ['src/database/migrations/*.ts'],
  synchronize: process.env.NODE_ENV === 'development', // auto-sync in dev only
  logging: process.env.NODE_ENV === 'development',
});
