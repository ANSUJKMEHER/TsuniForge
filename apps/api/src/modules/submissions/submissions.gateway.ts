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

  // ─── Connection Lifecycle ───────────────────

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ─── Subscribe to Submission Updates ────────

  @SubscribeMessage('subscribe_submission')
  handleSubscribeSubmission(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { submissionId: string },
  ) {
    const room = `submission:${data.submissionId}`;
    client.join(room);
    this.logger.log(
      `Client ${client.id} subscribed to submission ${data.submissionId}`,
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
    // Emit to the specific submission room
    this.server
      ?.to(`submission:${submissionId}`)
      .emit('submission_status', data);

    // Also emit globally for anyone listening
    this.server?.emit('submission_update', {
      submissionId,
      ...data,
    });
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
