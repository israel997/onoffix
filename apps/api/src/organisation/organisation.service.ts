import { ConflictException, Injectable } from '@nestjs/common';
import { RoleGlobal } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AddOrganisationMembreDto } from './dto/add-organisation-membre.dto';

const MEMBRE_SELECT = {
  id: true,
  nom: true,
  email: true,
  poste: true,
  photoUrl: true,
  roleGlobal: true,
  bureaux: {
    select: { roleDansBureau: true, bureau: { select: { id: true, nom: true } } },
  },
};

@Injectable()
export class OrganisationService {
  constructor(private readonly prisma: PrismaService) {}

  listMembres(organisationId: string) {
    return this.prisma.user.findMany({
      where: { organisationId },
      select: MEMBRE_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMembre(organisationId: string, dto: AddOrganisationMembreDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        organisationId,
        nom: dto.nom,
        email: dto.email,
        passwordHash,
        roleGlobal: RoleGlobal.MEMBRE,
      },
      select: MEMBRE_SELECT,
    });

    return user;
  }
}
