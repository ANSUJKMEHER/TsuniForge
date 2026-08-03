import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MongodbLoggerService } from '../services/mongodb-logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly mongoLogger: MongodbLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const ip = request.ip || '';
    const userId = request.user?.id;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;
        const duration = Date.now() - now;

        this.logger.log(
          `${method} ${url} ${statusCode} - ${duration}ms`,
        );

        this.mongoLogger
          .logRequest(method, url, statusCode, duration, ip, userId)
          .catch((err) => {
            this.logger.error('Failed to log request in MongoDB:', err);
          });
      }),
    );
  }
}
