import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, RoleGlobal } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

const AUTEUR_SELECT = { id: true, nom: true, photoUrl: true };
const MESSAGE_INCLUDE = {
  auteur: { select: AUTEUR_SELECT },
  replyTo: {
    select: {
      id: true,
      contenu: true,
      fichierNom: true,
      auteur: { select: { id: true, nom: true } },
    },
  },
};

const MESSAGE_PREVIEW_SELECT = {
  contenu: true,
  fichierNom: true,
  auteurId: true,
  createdAt: true,
};

export interface MessageFile {
  url: string;
  nom: string;
  type: string;
  tailleOctets: number;
}

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Vérifie que l'utilisateur appartient au bureau (ou est admin) avant tout accès à son chat. */
  async assertBureauAccess(
    bureauId: string,
    userId: string,
    organisationId: string,
    roleGlobal: RoleGlobal,
  ) {
    const bureau = await this.prisma.bureau.findFirst({
      where: { id: bureauId, organisationId },
      select: { id: true },
    });
    if (!bureau) throw new NotFoundException('Bureau introuvable');

    if (roleGlobal === RoleGlobal.ADMIN) return;

    const membership = await this.prisma.userBureau.findUnique({
      where: { userId_bureauId: { userId, bureauId } },
    });
    if (!membership) throw new ForbiddenException('Vous ne faites pas partie de ce bureau');
  }

  /**
   * Vérifie l'accès à l'organizer : bureau propriétaire (ou admin) pour un
   * organizer de bureau, strictement le propriétaire pour un organizer personnel.
   */
  async assertOrganizerAccess(
    projetId: string,
    userId: string,
    organisationId: string,
    roleGlobal: RoleGlobal,
  ) {
    const projet = await this.prisma.projet.findUnique({
      where: { id: projetId },
      select: {
        estOrganizer: true,
        bureauId: true,
        proprietaireId: true,
        bureau: { select: { organisationId: true } },
      },
    });
    if (!projet || !projet.estOrganizer) throw new NotFoundException('Organizer introuvable');

    if (projet.proprietaireId) {
      if (projet.proprietaireId !== userId) {
        throw new ForbiddenException('Cet organizer est personnel et privé');
      }
      return;
    }

    if (!projet.bureau || projet.bureau.organisationId !== organisationId) {
      throw new NotFoundException('Organizer introuvable');
    }

    if (roleGlobal === RoleGlobal.ADMIN) return;

    const membership = await this.prisma.userBureau.findUnique({
      where: { userId_bureauId: { userId, bureauId: projet.bureauId! } },
    });
    if (!membership) throw new ForbiddenException('Vous ne faites pas partie de ce bureau');
  }

  /** Même vérification que assertOrganizerAccess, mais à partir d'un Subject (Conversation). */
  async assertOrganizerSubjectAccess(
    subjectId: string,
    userId: string,
    organisationId: string,
    roleGlobal: RoleGlobal,
  ) {
    const subject = await this.prisma.conversation.findUnique({
      where: { id: subjectId },
      select: { projetId: true },
    });
    if (!subject?.projetId) throw new NotFoundException('Subject introuvable');
    await this.assertOrganizerAccess(subject.projetId, userId, organisationId, roleGlobal);
  }

  async assertSubjectBelongsToProjet(subjectId: string, projetId: string) {
    const subject = await this.prisma.conversation.findUnique({
      where: { id: subjectId },
      select: { projetId: true },
    });
    if (!subject || subject.projetId !== projetId) {
      throw new NotFoundException('Subject introuvable');
    }
  }

  async getConversationRoomInfo(conversationId: string) {
    const conversation = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      select: { bureauId: true, userAId: true },
    });
    return conversation;
  }

  async ensureConversationForBureau(bureauId: string) {
    const existing = await this.prisma.conversation.findUnique({ where: { bureauId } });
    if (existing) return existing;
    return this.prisma.conversation.create({ data: { bureauId } });
  }

  listSubjects(projetId: string) {
    return this.prisma.conversation.findMany({
      where: { projetId },
      orderBy: { createdAt: 'desc' },
    });
  }

  createSubject(projetId: string, nom: string) {
    return this.prisma.conversation.create({ data: { projetId, nom } });
  }

  renameSubject(subjectId: string, nom: string) {
    return this.prisma.conversation.update({ where: { id: subjectId }, data: { nom } });
  }

  deleteSubject(subjectId: string) {
    return this.prisma.conversation.delete({ where: { id: subjectId } });
  }

  async listMessages(conversationId: string, limit = 50) {
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: MESSAGE_INCLUDE,
    });
    return messages.reverse();
  }

  async createMessage(
    conversationId: string,
    auteurId: string,
    options: {
      contenu?: string;
      fichier?: MessageFile;
      replyToId?: string;
      mentionedUserIds?: string[];
      lien?: string;
    } = {},
  ) {
    const { contenu, fichier, replyToId, mentionedUserIds, lien } = options;
    if (!contenu?.trim() && !fichier) {
      throw new BadRequestException('Un message doit contenir du texte ou une pièce jointe');
    }
    // On ignore silencieusement une référence de réponse invalide (message supprimé
    // entre-temps, ou d'une autre conversation) plutôt que de bloquer l'envoi.
    const validReplyToId = replyToId
      ? (
          await this.prisma.message.findFirst({
            where: { id: replyToId, conversationId },
            select: { id: true },
          })
        )?.id
      : undefined;

    // On ne garde que des ids d'utilisateurs réels — une référence invalide (ou
    // périmée) ne doit jamais faire échouer l'envoi du message.
    const validMentionedIds = mentionedUserIds?.length
      ? (
          await this.prisma.user.findMany({
            where: { id: { in: [...new Set(mentionedUserIds)] } },
            select: { id: true },
          })
        ).map((u) => u.id)
      : [];

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        auteurId,
        contenu: contenu?.trim() || null,
        fichierUrl: fichier?.url,
        fichierNom: fichier?.nom,
        fichierType: fichier?.type,
        fichierTailleOctets: fichier?.tailleOctets,
        replyToId: validReplyToId,
        mentionedUserIds: validMentionedIds,
      },
      include: MESSAGE_INCLUDE,
    });

    const notifiedIds = validMentionedIds.filter((id) => id !== auteurId);
    await Promise.all(
      notifiedIds.map((userId) =>
        this.notifications.create(
          userId,
          NotificationType.MENTION,
          `${message.auteur.nom} vous a mentionné : « ${(contenu?.trim() ?? fichier?.nom ?? '').slice(0, 80)} »`,
          lien,
        ),
      ),
    );

    // Message direct 1:1 : l'autre personne est notifiée de tout nouveau message
    // (pas seulement des mentions, qui n'ont de sens que dans un groupe).
    const direct = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userAId: true, userBId: true },
    });
    const otherUserId =
      direct?.userAId || direct?.userBId
        ? direct.userAId === auteurId
          ? direct.userBId
          : direct.userAId
        : null;
    if (otherUserId && !notifiedIds.includes(otherUserId)) {
      await this.notifications.create(
        otherUserId,
        NotificationType.NOUVEAU_MESSAGE,
        `${message.auteur.nom} vous a envoyé un message : « ${(contenu?.trim() ?? fichier?.nom ?? '').slice(0, 80)} »`,
        lien ?? `/chat/${conversationId}`,
      );
    }

    return message;
  }

  /** Seul l'auteur peut modifier son propre message. */
  async updateMessage(messageId: string, userId: string, contenu: string) {
    const existing = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { auteurId: true },
    });
    if (!existing) throw new NotFoundException('Message introuvable');
    if (existing.auteurId !== userId) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres messages');
    }
    return this.prisma.message.update({
      where: { id: messageId },
      data: { contenu, edited: true },
      include: MESSAGE_INCLUDE,
    });
  }

  /** Seul l'auteur peut supprimer son propre message. Renvoie la room à notifier. */
  async deleteMessage(messageId: string, userId: string) {
    const existing = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: {
        auteurId: true,
        conversationId: true,
        conversation: { select: { bureauId: true } },
      },
    });
    if (!existing) throw new NotFoundException('Message introuvable');
    if (existing.auteurId !== userId) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres messages');
    }
    await this.prisma.message.delete({ where: { id: messageId } });
    return { conversationId: existing.conversationId, bureauId: existing.conversation.bureauId };
  }

  // ---------- Messages directs (1:1) ----------

  /** Retrouve (ou crée) la conversation directe entre deux membres de la même organisation. */
  async findOrCreateDirectConversation(
    userId: string,
    otherUserId: string,
    organisationId: string,
  ) {
    if (userId === otherUserId) {
      throw new BadRequestException('Impossible de démarrer une conversation avec vous-même');
    }
    const other = await this.prisma.user.findFirst({
      where: { id: otherUserId, organisationId },
      select: { id: true },
    });
    if (!other) throw new NotFoundException('Membre introuvable');

    const [userAId, userBId] = [userId, otherUserId].sort();
    const existing = await this.prisma.conversation.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
    });
    if (existing) return existing;
    return this.prisma.conversation.create({ data: { userAId, userBId } });
  }

  async assertDirectAccess(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userAId: true, userBId: true },
    });
    if (!conversation || (!conversation.userAId && !conversation.userBId)) {
      throw new NotFoundException('Conversation introuvable');
    }
    if (conversation.userAId !== userId && conversation.userBId !== userId) {
      throw new ForbiddenException('Vous ne faites pas partie de cette conversation');
    }
  }

  /** Toutes les conversations directes de l'utilisateur, triées par dernière activité. */
  async listMyDirectConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      include: {
        userA: { select: { id: true, nom: true, photoUrl: true } },
        userB: { select: { id: true, nom: true, photoUrl: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: MESSAGE_PREVIEW_SELECT },
      },
    });

    return conversations
      .map((c) => {
        const other = c.userA?.id === userId ? c.userB! : c.userA!;
        const lastMessage = c.messages[0] ?? null;
        return {
          id: c.id,
          otherUser: other,
          lastMessage,
          lastActivity: lastMessage?.createdAt ?? c.createdAt,
          unread: this.isConversationUnread(c, userId),
          // Dernière lecture de l'autre personne — sert à afficher "Seen" sous ton
          // dernier message dès qu'elle a ouvert la conversation après son envoi.
          otherLastReadAt: c.userAId === userId ? c.lastReadAtB : c.lastReadAtA,
        };
      })
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
  }

  /** Marque un chat de groupe (bureau ou Subject d'organizer) comme lu par cet utilisateur. */
  async markConversationRead(conversationId: string, userId: string) {
    await this.prisma.conversationRead.upsert({
      where: { conversationId_userId: { conversationId, userId } },
      create: { conversationId, userId },
      update: { lastReadAt: new Date() },
    });
  }

  /** Nombre de messages non lus (pas de soi-même) dans le chat d'un bureau, pour cet utilisateur. */
  async getBureauUnreadCount(bureauId: string, userId: string): Promise<number> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { bureauId },
      select: { id: true },
    });
    if (!conversation) return 0;

    const read = await this.prisma.conversationRead.findUnique({
      where: { conversationId_userId: { conversationId: conversation.id, userId } },
    });

    return this.prisma.message.count({
      where: {
        conversationId: conversation.id,
        auteurId: { not: userId },
        ...(read ? { createdAt: { gt: read.lastReadAt } } : {}),
      },
    });
  }

  /** Marque une conversation directe comme lue par cet utilisateur (à l'ouverture). */
  async markDirectConversationRead(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userAId: true, userBId: true },
    });
    if (!conversation) return;
    if (conversation.userAId === userId) {
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastReadAtA: new Date() },
      });
    } else if (conversation.userBId === userId) {
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastReadAtB: new Date() },
      });
    }
  }

  /** Vrai si au moins une conversation directe a un message plus récent que la dernière lecture. */
  async hasUnreadDirectMessages(userId: string): Promise<boolean> {
    const conversations = await this.prisma.conversation.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      select: {
        userAId: true,
        userBId: true,
        lastReadAtA: true,
        lastReadAtB: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { auteurId: true, createdAt: true },
        },
      },
    });
    return conversations.some((c) => this.isConversationUnread(c, userId));
  }

  private isConversationUnread(
    conversation: {
      userAId: string | null;
      userBId: string | null;
      lastReadAtA: Date | null;
      lastReadAtB: Date | null;
      messages: { auteurId: string; createdAt: Date }[];
    },
    userId: string,
  ): boolean {
    const lastMessage = conversation.messages[0];
    if (!lastMessage || lastMessage.auteurId === userId) return false;
    const lastReadAt =
      conversation.userAId === userId ? conversation.lastReadAtA : conversation.lastReadAtB;
    return !lastReadAt || lastMessage.createdAt > lastReadAt;
  }
}
