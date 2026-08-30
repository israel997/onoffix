import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';

const NOTIFICATIONS_LIMIT = 50;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  async create(userId: string, type: NotificationType, message: string, lien?: string) {
    const notification = await this.prisma.notification.create({
      data: { userId, type, message, lien },
    });
    // Le push part en fire-and-forget : un échec d'envoi (abonnement expiré, réseau)
    // ne doit jamais faire échouer l'action métier qui a déclenché la notification.
    this.push
      .notifyUser(userId, { title: 'OOffix', body: message, url: lien })
      .catch(() => undefined);
    return notification;
  }

  findAllForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: NOTIFICATIONS_LIMIT,
    });
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, lue: false } });
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) throw new NotFoundException('Notification introuvable');
    if (notification.userId !== userId) {
      throw new ForbiddenException('Cette notification ne vous appartient pas');
    }
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { lue: true },
    });
  }

  async markAsUnread(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) throw new NotFoundException('Notification introuvable');
    if (notification.userId !== userId) {
      throw new ForbiddenException('Cette notification ne vous appartient pas');
    }
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { lue: false },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, lue: false },
      data: { lue: true },
    });
  }

  async delete(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) throw new NotFoundException('Notification introuvable');
    if (notification.userId !== userId) {
      throw new ForbiddenException('Cette notification ne vous appartient pas');
    }
    await this.prisma.notification.delete({ where: { id: notificationId } });
  }

  async deleteAll(userId: string) {
    await this.prisma.notification.deleteMany({ where: { userId } });
  }
}
