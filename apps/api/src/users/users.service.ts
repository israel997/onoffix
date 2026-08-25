import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nom: true,
        email: true,
        poste: true,
        bio: true,
        photoUrl: true,
        roleGlobal: true,
        emailVerifie: true,
        hierarchie: true,
        dateAnniversaire: true,
        aime: true,
        naimePas: true,
        organisation: { select: { id: true, nom: true, logoUrl: true, proprietaireId: true } },
        bureaux: {
          select: {
            roleDansBureau: true,
            roleInterne: true,
            bureau: { select: { id: true, nom: true } },
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    return user;
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    const { dateAnniversaire, ...rest } = dto;
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...rest,
        dateAnniversaire:
          dateAnniversaire === undefined
            ? undefined
            : dateAnniversaire
              ? new Date(dateAnniversaire)
              : null,
      },
      select: {
        id: true,
        nom: true,
        email: true,
        poste: true,
        bio: true,
        photoUrl: true,
        roleGlobal: true,
        hierarchie: true,
        dateAnniversaire: true,
        aime: true,
        naimePas: true,
      },
    });
  }

  async setPhoto(userId: string, photoUrl: string | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { photoUrl },
      select: {
        id: true,
        nom: true,
        email: true,
        poste: true,
        bio: true,
        photoUrl: true,
        roleGlobal: true,
      },
    });
  }
}
