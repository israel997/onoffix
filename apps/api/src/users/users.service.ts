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
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
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
