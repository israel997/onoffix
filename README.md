# OnOffix

SaaS de gestion et documentation du travail d'équipe (organisation → bureau → projet → tâche).

## Structure du monorepo

```
apps/
  api/    # Backend NestJS (API REST, Auth, Prisma, BullMQ)
  web/    # Frontend Next.js
packages/
  shared/ # Types et utilitaires partagés
```

## Prérequis

- Node.js >= 20
- pnpm >= 10
- Docker (pour PostgreSQL + Redis en local)

## Démarrage

```bash
pnpm install
cp .env.example .env
docker compose up -d      # PostgreSQL + Redis
pnpm --filter @onoffix/api prisma:migrate
pnpm dev:api               # API sur http://localhost:3001
pnpm dev:web                # Web sur http://localhost:3000
```

## Stack

- **Frontend** : Next.js (React)
- **Backend** : NestJS
- **Base de données** : PostgreSQL (Prisma ORM), multi-tenant via `organisation_id`
- **File d'attente** : Redis + BullMQ (rituels quotidiens : rappels, relances, résumés)
- **Auth** : JWT + refresh token, RBAC (admin organisation / manager bureau / collaborateur)

Version web uniquement pour cette phase (mobile hors scope).
