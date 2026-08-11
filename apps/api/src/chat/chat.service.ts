import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleGlobal } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const AUTEUR_SELECT = { id: true, nom: true, photoUrl: true };

export interface MessageFile {
  url: string;
  nom: string;
  type: string;
  tailleOctets: number;
}

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

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

  async ensureConversationForBureau(bureauId: string) {
    const existing = await this.prisma.conversation.findUnique({ where: { bureauId } });
    if (existing) return existing;
    return this.prisma.conversation.create({ data: { bureauId } });
  }

  listSubjects(projetId: string) {
    return this.prisma.conversation.findMany({
      where: { projetId },
      orderBy: { createdAt: 'asc' },
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
      include: { auteur: { select: AUTEUR_SELECT } },
    });
    return messages.reverse();
  }

  createMessage(conversationId: string, auteurId: string, contenu?: string, fichier?: MessageFile) {
    if (!contenu?.trim() && !fichier) {
      throw new BadRequestException('Un message doit contenir du texte ou une pièce jointe');
    }
    return this.prisma.message.create({
      data: {
        conversationId,
        auteurId,
        contenu: contenu?.trim() || null,
        fichierUrl: fichier?.url,
        fichierNom: fichier?.nom,
        fichierType: fichier?.type,
        fichierTailleOctets: fichier?.tailleOctets,
      },
      include: { auteur: { select: AUTEUR_SELECT } },
    });
  }
}
