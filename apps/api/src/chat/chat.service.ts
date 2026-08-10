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

  async ensureConversationForBureau(bureauId: string) {
    const existing = await this.prisma.conversation.findUnique({ where: { bureauId } });
    if (existing) return existing;
    return this.prisma.conversation.create({ data: { bureauId } });
  }

  async ensureConversationForProjet(projetId: string) {
    const existing = await this.prisma.conversation.findUnique({ where: { projetId } });
    if (existing) return existing;
    return this.prisma.conversation.create({ data: { projetId } });
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
