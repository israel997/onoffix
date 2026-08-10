import { randomUUID } from 'crypto';
import { PrismaClient, RoleBureau, RoleGlobal, StatutTache } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);
  const adminId = randomUUID();

  const organisation = await prisma.organisation.create({
    data: { nom: 'Acme SARL', proprietaireId: adminId },
  });

  const admin = await prisma.user.create({
    data: {
      id: adminId,
      organisationId: organisation.id,
      nom: 'Admin Acme',
      email: 'admin@acme.test',
      passwordHash,
      roleGlobal: RoleGlobal.ADMIN,
    },
  });

  const manager = await prisma.user.create({
    data: {
      organisationId: organisation.id,
      nom: 'Manager Dev',
      email: 'manager@acme.test',
      passwordHash,
      roleGlobal: RoleGlobal.MEMBRE,
    },
  });

  const collaborateur = await prisma.user.create({
    data: {
      organisationId: organisation.id,
      nom: 'Collaborateur Dev',
      email: 'collaborateur@acme.test',
      passwordHash,
      roleGlobal: RoleGlobal.MEMBRE,
    },
  });

  const bureau = await prisma.bureau.create({
    data: {
      organisationId: organisation.id,
      nom: 'Bureau Développement',
      membres: {
        create: [
          { userId: admin.id, roleDansBureau: RoleBureau.MANAGER, roleInterne: 'Admin' },
          { userId: manager.id, roleDansBureau: RoleBureau.MANAGER, roleInterne: 'Lead Dev' },
          { userId: collaborateur.id, roleDansBureau: RoleBureau.COLLABORATEUR, roleInterne: 'Développeur' },
        ],
      },
    },
  });

  const projet = await prisma.projet.create({
    data: {
      bureauId: bureau.id,
      nom: 'Refonte du site vitrine',
      description: 'Nouvelle version du site public',
    },
  });

  await prisma.tache.create({
    data: {
      projetId: projet.id,
      titre: 'Intégrer la page contact',
      assigneAId: collaborateur.id,
      statut: StatutTache.A_FAIRE,
      sousTaches: {
        create: [{ titre: 'Créer le formulaire' }, { titre: 'Brancher l’envoi email' }],
      },
    },
  });

  console.log('Seed terminé:', {
    organisation: organisation.nom,
    admin: admin.email,
    manager: manager.email,
    collaborateur: collaborateur.email,
    motDePasse: 'password123',
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
