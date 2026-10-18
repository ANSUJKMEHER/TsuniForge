import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from '../../database/entities/submission.entity';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/ws',
})
export class SubmissionsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SubmissionsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
  ) {}

  // ─── Connection Lifecycle ───────────────────

  handleConnection(client: Socket) {
    try {
      const auth = client.handshake.auth;
      const headers = client.handshake.headers;
      const query = client.handshake.query;
      let token = auth?.token || headers?.authorization || query?.token;

      if (!token) {
        this.logger.warn(`Rejecting unauthenticated socket connection: ${client.id}`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect(true);
        return;
      }

      if (typeof token === 'string' && token.startsWith('Bearer ')) {
        token = token.slice(7).trim();
      }

      const secret = this.configService.get<string>('JWT_SECRET', 'tsuniforge_jwt_secret_dev');
      const payload = this.jwtService.verify(token as string, { secret });
      client.data.user = payload;
      this.logger.log(`Client authenticated: ${client.id} (user: ${payload.sub || payload.id})`);
    } catch (err: any) {
      this.logger.warn(`Socket authentication failed for ${client.id}: ${err.message}`);
      client.emit('error', { message: 'Invalid or expired authentication token' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ─── Subscribe to Submission Updates ────────

  @SubscribeMessage('subscribe_submission')
  async handleSubscribeSubmission(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { submissionId: string },
  ) {
    const user = client.data?.user;
    if (!user) {
      client.disconnect(true);
      return { event: 'error', data: { message: 'Unauthorized' } };
    }

    if (!data?.submissionId) {
      return { event: 'error', data: { message: 'submissionId is required' } };
    }

    const submission = await this.submissionRepo.findOne({
      where: { id: data.submissionId },
    });

    if (!submission) {
      return { event: 'error', data: { message: 'Submission not found' } };
    }

    const userId = user.sub || user.id;
    const isOwner = submission.userId === userId;
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isAdmin) {
      this.logger.warn(
        `User ${userId} attempted to subscribe to unauthorized submission ${data.submissionId}`,
      );
      return {
        event: 'error',
        data: { message: 'Forbidden: You do not own this submission' },
      };
    }

    const room = `submission:${data.submissionId}`;
    client.join(room);
    this.logger.log(
      `Client ${client.id} (user: ${userId}) subscribed to submission ${data.submissionId}`,
    );
    return { event: 'subscribed', data: { room } };
  }

  @SubscribeMessage('unsubscribe_submission')
  handleUnsubscribeSubmission(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { submissionId: string },
  ) {
    const room = `submission:${data.submissionId}`;
    client.leave(room);
    return { event: 'unsubscribed', data: { room } };
  }

  // ─── Contest Rooms ──────────────────────────

  @SubscribeMessage('join_contest')
  handleJoinContest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { contestId: string },
  ) {
    const room = `contest:${data.contestId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined contest ${data.contestId}`);
    return { event: 'joined_contest', data: { room } };
  }

  @SubscribeMessage('leave_contest')
  handleLeaveContest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { contestId: string },
  ) {
    const room = `contest:${data.contestId}`;
    client.leave(room);
    return { event: 'left_contest', data: { room } };
  }

  // ─── Emit Methods (called by services) ──────

  emitSubmissionStatus(submissionId: string, data: any) {
    // Emit ONLY to the specific submission room — global broadcast removed to prevent data leakage
    this.server
      ?.to(`submission:${submissionId}`)
      .emit('submission_status', data);
  }

  emitLeaderboardUpdate(contestId: string, rankings: any[]) {
    this.server
      ?.to(`contest:${contestId}`)
      .emit('leaderboard_update', { contestId, rankings });
  }

  emitContestAnnouncement(contestId: string, message: string) {
    this.server
      ?.to(`contest:${contestId}`)
      .emit('contest_announcement', { contestId, message });
  }
}
