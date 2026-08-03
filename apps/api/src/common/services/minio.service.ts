import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private s3Client: S3Client;
  private readonly bucketName = 'tsuniforge-submissions';

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.logger.log('Initializing MinIO/S3 Storage Service...');
    
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'http://localhost:9000');
    const accessKeyId = this.configService.get<string>('MINIO_ROOT_USER', 'tsuniforge');
    const secretAccessKey = this.configService.get<string>('MINIO_ROOT_PASSWORD', 'tsuniforge_secret');

    this.s3Client = new S3Client({
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      region: 'us-east-1', // Required parameter, but unused by MinIO
      forcePathStyle: true, // Necessary for MinIO compatibility
    });

    await this.ensureBucketExists();
  }

  private async ensureBucketExists() {
    try {
      // Check if the bucket already exists
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      this.logger.log(`Bucket '${this.bucketName}' exists`);
    } catch (error: any) {
      // If bucket does not exist, create it
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        this.logger.log(`Bucket '${this.bucketName}' not found. Creating it...`);
        try {
          await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
          this.logger.log(`Bucket '${this.bucketName}' created successfully`);
        } catch (createErr: any) {
          this.logger.error(`Failed to create bucket '${this.bucketName}':`, createErr);
        }
      } else {
        this.logger.error('Failed to verify bucket existence:', error);
      }
    }
  }

  /**
   * Upload code to MinIO submission bucket
   * @returns The S3 key representing the file path
   */
  async uploadCode(submissionId: string, code: string, language: string): Promise<string> {
    const extensions: Record<string, string> = {
      cpp: '.cpp',
      java: '.java',
      python: '.py',
    };
    const ext = extensions[language] || '.txt';
    const key = `submissions/${submissionId}${ext}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: code,
          ContentType: 'text/plain',
        }),
      );
      this.logger.log(`Uploaded code for submission ${submissionId} to S3 Key: ${key}`);
      return key;
    } catch (error: any) {
      this.logger.error(`Failed to upload code for submission ${submissionId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch code from MinIO submission bucket
   */
  async getCode(key: string): Promise<string> {
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );

      if (!response.Body) {
        throw new Error(`Empty body returned from S3 for key ${key}`);
      }

      // Convert stream to string
      return await this.streamToString(response.Body);
    } catch (error: any) {
      this.logger.error(`Failed to retrieve code for S3 Key: ${key}:`, error);
      throw error;
    }
  }

  private streamToString(stream: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: any[] = [];
      stream.on('data', (chunk: any) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
  }
}
