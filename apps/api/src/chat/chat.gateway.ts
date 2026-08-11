import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { RoleGlobal } from '@prisma/client';
import type { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

interface SocketUser {
  userId: string;
  organisationId: string;
  roleGlobal: RoleGlobal;
}

function bureauRoom(bureauId: string) {
  return `bureau:${bureauId}`;
}

function organizerRoom(subjectId: string) {
  return `organizer:${subjectId}`;
}

function getUser(client: Socket): SocketUser {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return client.data.user as SocketUser;
}

function setUser(client: Socket, user: SocketUser): void {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  client.data.user = user;
}

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly chatService: ChatService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) throw new UnauthorizedException();

      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        organisationId: string;
        roleGlobal: RoleGlobal;
      }>(token, { secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET') });

      const user: SocketUser = {
        userId: payload.sub,
        organisationId: payload.organisationId,
        roleGlobal: payload.roleGlobal,
      };
      setUser(client, user);
    } catch {
      this.logger.warn(`Connexion WebSocket refusée (token invalide) — ${client.id}`);
      client.disconnect();
    }
  }

  @SubscribeMessage('bureau:join')
  async handleBureauJoin(
    @MessageBody() data: { bureauId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = getUser(client);
    await this.chatService.assertBureauAccess(
      data.bureauId,
      user.userId,
      user.organisationId,
      user.roleGlobal,
    );
    await client.join(bureauRoom(data.bureauId));
  }

  @SubscribeMessage('bureau:leave')
  async handleBureauLeave(
    @MessageBody() data: { bureauId: string },
    @ConnectedSocket() client: Socket,
  ) {
    await client.leave(bureauRoom(data.bureauId));
  }

  @SubscribeMessage('bureau:message')
  async handleBureauMessage(
    @MessageBody() data: { bureauId: string; contenu: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = getUser(client);
    const contenu = data.contenu?.trim();
    if (!contenu || contenu.length > 4000) return;

    await this.chatService.assertBureauAccess(
      data.bureauId,
      user.userId,
      user.organisationId,
      user.roleGlobal,
    );
    const conversation = await this.chatService.ensureConversationForBureau(data.bureauId);
    const message = await this.chatService.createMessage(conversation.id, user.userId, contenu);

    this.server.to(bureauRoom(data.bureauId)).emit('bureau:message', message);
  }

  @SubscribeMessage('organizer:join')
  async handleOrganizerJoin(
    @MessageBody() data: { subjectId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = getUser(client);
    await this.chatService.assertOrganizerSubjectAccess(
      data.subjectId,
      user.userId,
      user.organisationId,
      user.roleGlobal,
    );
    await client.join(organizerRoom(data.subjectId));
  }

  @SubscribeMessage('organizer:leave')
  async handleOrganizerLeave(
    @MessageBody() data: { subjectId: string },
    @ConnectedSocket() client: Socket,
  ) {
    await client.leave(organizerRoom(data.subjectId));
  }

  @SubscribeMessage('organizer:message')
  async handleOrganizerMessage(
    @MessageBody() data: { subjectId: string; contenu: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = getUser(client);
    const contenu = data.contenu?.trim();
    if (!contenu || contenu.length > 4000) return;

    await this.chatService.assertOrganizerSubjectAccess(
      data.subjectId,
      user.userId,
      user.organisationId,
      user.roleGlobal,
    );
    const message = await this.chatService.createMessage(data.subjectId, user.userId, contenu);

    this.server.to(organizerRoom(data.subjectId)).emit('organizer:message', message);
  }

  /** Diffuse un message créé hors WebSocket (ex. upload de fichier via REST) aux clients connectés. */
  broadcastBureauMessage(bureauId: string, message: unknown) {
    this.server.to(bureauRoom(bureauId)).emit('bureau:message', message);
  }

  broadcastOrganizerMessage(subjectId: string, message: unknown) {
    this.server.to(organizerRoom(subjectId)).emit('organizer:message', message);
  }
}
