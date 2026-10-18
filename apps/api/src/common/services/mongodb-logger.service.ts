import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoClient, Db, Collection } from 'mongodb';

@Injectable()
export class MongodbLoggerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MongodbLoggerService.name);
  private client: MongoClient;
  private db: Db;
  private apiLogsCollection: Collection;
  private execLogsCollection: Collection;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.logger.log('Connecting to MongoDB for logging...');
    const uri = this.configService.get<string>(
      'MONGODB_URI',
      'mongodb://tsuniforge:tsuniforge_secret@localhost:27017/tsuniforge?authSource=admin',
    );

    try {
      this.client = new MongoClient(uri, { serverSelectionTimeoutMS: 1500 });
      await this.client.connect();
      this.db = this.client.db();
      
      this.apiLogsCollection = this.db.collection('api_logs');
      this.execLogsCollection = this.db.collection('execution_logs');
      this.isConnected = true;
      this.logger.log('Successfully connected to MongoDB');

      // Create indexes for fast querying of logs in future
      await this.apiLogsCollection.createIndex({ timestamp: -1 });
      await this.execLogsCollection.createIndex({ timestamp: -1 });
      await this.execLogsCollection.createIndex({ submissionId: 1 });
    } catch (error) {
      this.logger.error('Failed to connect to MongoDB:', error);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      this.logger.log('Closing MongoDB logger connection...');
      await this.client.close();
      this.isConnected = false;
    }
  }

  /**
   * Log an HTTP Request to MongoDB
   */
  async logRequest(
    method: string,
    url: string,
    statusCode: number,
    durationMs: number,
    ip: string,
    userId?: string,
  ): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.apiLogsCollection.insertOne({
        timestamp: new Date(),
        method,
        url,
        statusCode,
        durationMs,
        ip,
        userId: userId || null,
      });
    } catch (error) {
      this.logger.error('Failed to write HTTP log to MongoDB:', error);
    }
  }

  /**
   * Log a Code Execution event to MongoDB
   */
  async logExecution(
    submissionId: string,
    problemId: string,
    verdict: string,
    runtimeMs: number,
    memoryKb: number,
    testCasesPassed: number,
    totalTestCases: number,
  ): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.execLogsCollection.insertOne({
        timestamp: new Date(),
        submissionId,
        problemId,
        verdict,
        runtimeMs,
        memoryKb,
        testCasesPassed,
        totalTestCases,
      });
      this.logger.log(`Logged execution metrics for submission ${submissionId} to MongoDB`);
    } catch (error) {
      this.logger.error('Failed to write execution log to MongoDB:', error);
    }
  }
}
