import { PrismaService } from './prisma.service';

type TenantScopedModel = 'bureau' | 'user';
const TENANT_SCOPED_MODELS: readonly TenantScopedModel[] = ['bureau', 'user'];

function isTenantScopedModel(model: string): model is TenantScopedModel {
  return (TENANT_SCOPED_MODELS as readonly string[]).includes(model);
}

/**
 * Client Prisma scopé à une organisation : injecte organisation_id sur
 * chaque lecture/écriture des modèles qui portent ce champ directement
 * (Bureau, User). Sécurise l'isolation multi-tenant (cf. 3.5) sans devoir
 * répéter le filtre dans chaque service.
 */
export function forOrganisation(prisma: PrismaService, organisationId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const modelName = model?.toLowerCase();
          if (!modelName || !isTenantScopedModel(modelName)) {
            return query(args);
          }

          const scopedArgs = args as { where?: object; data?: object };
          if (
            [
              'findMany',
              'findFirst',
              'findUnique',
              'count',
              'update',
              'updateMany',
              'delete',
              'deleteMany',
            ].includes(operation)
          ) {
            scopedArgs.where = { ...(scopedArgs.where ?? {}), organisationId };
          }
          if (['create'].includes(operation)) {
            scopedArgs.data = { ...(scopedArgs.data ?? {}), organisationId };
          }

          return query(args);
        },
      },
    },
  });
}

export type ScopedPrismaClient = ReturnType<typeof forOrganisation>;
