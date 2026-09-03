/**
 * Backfill unique pour le passage du rôle Manager/Collaborateur d'un attribut par
 * bureau (UserBureau.roleDansBureau) à un attribut global à la personne
 * (User.roleGlobal). Idempotent — peut être relancé sans effet de bord.
 *
 * Règles :
 *  - Manager dans au moins un bureau aujourd'hui -> Manager global.
 *  - Exception explicite : Honorine Gabiam -> Authority (pas juste Manager).
 *  - Tout le reste (déjà Admin, ou jamais manager nulle part) -> inchangé.
 *
 * Lancer : pnpm --filter onoffix-api backfill:role-manager
 */
import { PrismaClient, RoleGlobal } from '@prisma/client';

const prisma = new PrismaClient();

// Confirmé par l'utilisateur le 2026-09-03.
const HONORINE_EMAIL = 'honoringabiam0@gmail.com';

async function main() {
  const promotedToManager = await prisma.user.updateMany({
    where: {
      roleGlobal: RoleGlobal.MEMBRE,
      bureaux: { some: { roleDansBureau: 'MANAGER' } },
    },
    data: { roleGlobal: RoleGlobal.MANAGER },
  });
  console.log(`Promus Manager (global) : ${promotedToManager.count}`);

  const honorine = await prisma.user.findFirst({ where: { email: HONORINE_EMAIL } });
  if (!honorine) {
    console.warn(`Aucun utilisateur trouvé pour ${HONORINE_EMAIL} — exception ignorée.`);
  } else if (honorine.roleGlobal !== RoleGlobal.ADMIN) {
    await prisma.user.update({ where: { id: honorine.id }, data: { roleGlobal: RoleGlobal.ADMIN } });
    console.log(`${honorine.nom} (${honorine.email}) promue Authority.`);
  } else {
    console.log(`${honorine.nom} (${honorine.email}) est déjà Authority.`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
