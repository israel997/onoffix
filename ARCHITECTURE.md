# Architecture d'OnOffix — guide détaillé

Ce document explique **comment le projet est construit** et **pourquoi**, pour quelqu'un qui découvre le code. Il complète le [README.md](README.md) (qui donne juste les commandes de démarrage).

---

## 1. Vue d'ensemble : c'est quoi tout ça ?

OnOffix est composé de **deux applications séparées** qui se parlent par le réseau (HTTP) :

```
┌─────────────────────┐          requêtes HTTP          ┌──────────────────────┐
│                      │   ────────────────────────▶     │                      │
│   apps/web           │                                  │   apps/api           │
│   (le site que       │                                  │   (le "cerveau" qui  │
│   l'utilisateur       │   ◀────────────────────────     │   gère les données   │
│   voit dans           │        réponses JSON             │   et la logique)     │
│   son navigateur)     │                                  │                      │
└─────────────────────┘                                   └──────────┬───────────┘
                                                                       │
                                                          ┌────────────┴────────────┐
                                                          │                          │
                                                   ┌──────▼──────┐           ┌───────▼──────┐
                                                   │ PostgreSQL   │           │ Redis         │
                                                   │ (les données │           │ (les tâches   │
                                                   │  permanentes)│           │  planifiées)  │
                                                   └──────────────┘           └──────────────┘
```

**Pourquoi séparer web et api ?** Parce que plus tard il pourra y avoir une appli mobile qui parle à la même API. Le "cerveau" (règles métier, base de données) ne doit pas être mélangé avec l'affichage.

Chaque dossier (`apps/web`, `apps/api`) est un **projet Node.js indépendant**, avec son propre `package.json`. Le fichier `pnpm-workspace.yaml` à la racine dit à pnpm : "ces dossiers font partie du même monorepo, tu peux les gérer ensemble".

---

## 2. apps/api — le backend (NestJS)

C'est un serveur qui expose des routes HTTP (ex. `POST /auth/login`). Il est écrit avec **NestJS**, un framework qui organise le code en **modules**.

### 2.1 Comment lire un module NestJS

Chaque fonctionnalité vit dans son propre dossier avec 3 types de fichiers :

| Fichier | Rôle |
|---|---|
| `xxx.module.ts` | La "carte d'identité" du module : quels fichiers il contient, ce qu'il expose |
| `xxx.controller.ts` | Reçoit les requêtes HTTP (ex. `POST /auth/login`) et appelle le service |
| `xxx.service.ts` | Contient la vraie logique (ex. vérifier le mot de passe) |

Le contrôleur ne fait jamais de logique lui-même — il délègue toujours au service. Ça sépare "recevoir une requête" de "faire le travail".

### 2.2 Les modules du projet

```
apps/api/src/
├── main.ts                  ← point d'entrée : démarre le serveur
├── app.module.ts             ← assemble tous les modules ensemble
│
├── auth/                     ← inscription, connexion, tokens
│   ├── auth.controller.ts     routes: /auth/register, /auth/login, /auth/refresh, /auth/logout
│   ├── auth.service.ts        logique : hash du mot de passe, génération des tokens JWT
│   ├── dto/                   forme attendue des données envoyées par le client
│   ├── guards/                bloque l'accès si pas connecté
│   └── strategies/            vérifie qu'un token JWT est valide
│
├── prisma/                   ← connexion à la base de données PostgreSQL
│   ├── prisma.service.ts      le client qui parle à la base
│   ├── tenant-prisma.factory.ts  ajoute automatiquement le filtre organisation_id
│   └── tenant-prisma.service.ts  version prête à l'emploi, par requête
│
├── queue/                    ← tâches planifiées (rappels, résumés...)
│   ├── queue.module.ts        connexion à Redis
│   ├── rituels.scheduler.ts   programme les horaires (ex. "tous les jours à 18h30")
│   └── rituels.processor.ts   exécute le travail quand l'horaire arrive
│
└── common/                   ← outils réutilisés partout
    ├── decorators/             raccourcis (@Public(), @Roles(), @CurrentUser())
    └── guards/                 vérifications d'accès (rôle admin ? rôle manager ?)
```

### 2.3 Le fichier `main.ts` : le point de départ

```ts
const app = await NestFactory.create(AppModule);
app.enableCors();                    // autorise le site web à appeler l'API
app.useGlobalPipes(new ValidationPipe(...)); // vérifie automatiquement les données reçues
await app.listen(3001);              // écoute sur le port 3001
```

C'est la toute première chose qui s'exécute quand on lance `pnpm dev:api`.

### 2.4 Comment une requête est traitée, étape par étape

Exemple : un utilisateur clique sur "Se connecter" sur le site web.

1. Le navigateur envoie `POST http://localhost:3001/auth/login` avec `{ email, password }`.
2. NestJS regarde dans `auth.controller.ts` : la route `login` existe → elle appelle `authService.login(dto)`.
3. `auth.service.ts` :
   - cherche l'utilisateur dans la base via Prisma (`prisma.user.findUnique`)
   - compare le mot de passe envoyé avec le mot de passe haché stocké (avec `bcrypt`)
   - si ça correspond, génère deux **tokens JWT** : un `accessToken` (courte durée, 15 min) et un `refreshToken` (longue durée, 7 jours)
4. La réponse `{ accessToken, refreshToken }` repart vers le navigateur.
5. Le site web stocke ces tokens et les renvoie dans l'en-tête `Authorization: Bearer <token>` pour toutes les requêtes suivantes.

### 2.5 Comment l'API sait qui est connecté (JWT)

Un **JWT** est un texte signé qui contient des informations (ici : `userId`, `organisationId`, `roleGlobal`) sans avoir besoin de revérifier la base à chaque requête — l'API vérifie juste que la signature est valide.

- `jwt.strategy.ts` : lit le token dans l'en-tête `Authorization`, vérifie sa signature, et si tout est bon, attache les infos de l'utilisateur à `request.user`.
- `guards/jwt-auth.guard.ts` : appliqué **globalement** (voir `app.module.ts`) — toute route est protégée par défaut. Pour rendre une route publique (comme `/auth/login`), on ajoute le décorateur `@Public()` au-dessus.

### 2.6 Les rôles et permissions (RBAC)

Le cahier des charges définit 3 rôles : Admin (organisation), Manager (bureau), Collaborateur. Deux guards s'en occupent :

- `RolesGuard` + `@Roles(RoleGlobal.ADMIN)` : vérifie le rôle **global** de l'utilisateur (est-il admin de son organisation ?).
- `BureauRoleGuard` + `@BureauRole(RoleBureau.MANAGER)` : vérifie que l'utilisateur est bien **manager du bureau précis** ciblé par l'URL (ex. `/bureaux/:bureauId/...`). Un admin d'organisation passe toujours, peu importe le bureau.

### 2.7 L'isolation multi-tenant (organisation_id)

Toutes les organisations (entreprises clientes) partagent les **mêmes tables** en base — chaque ligne a juste une colonne `organisation_id` qui dit à qui elle appartient. C'est le choix "schéma partagé" recommandé pour un MVP (cf. cahier des charges §3.2).

Le risque : oublier de filtrer par `organisation_id` dans une requête, et laisser une entreprise voir les données d'une autre. Pour éviter ça, `tenant-prisma.factory.ts` crée une version "augmentée" de Prisma qui **ajoute automatiquement** `organisation_id` à chaque requête sur les tables sensibles (`Bureau`, `User`). Tu n'as pas besoin d'y penser à chaque fois que tu écris une requête.

### 2.8 La base de données (Prisma + PostgreSQL)

Le schéma de la base est décrit dans **un seul fichier** : `apps/api/prisma/schema.prisma`. C'est le fichier le plus important à comprendre :

```
Organisation → Bureau → Projet → Tâche → Sous-tâche
```

Chaque `model Xxx { ... }` dans ce fichier devient une table SQL. Quand tu modifies ce fichier, tu dois lancer `pnpm --filter @onoffix/api prisma:migrate` pour que la vraie base de données PostgreSQL soit mise à jour pour correspondre — c'est ce qu'on appelle une **migration**. L'historique des migrations est dans `apps/api/prisma/migrations/`.

Prisma génère aussi un **client** (du code TypeScript) qui te permet d'écrire `prisma.tache.findMany(...)` au lieu d'écrire du SQL à la main.

### 2.9 La file d'attente (Redis + BullMQ)

Certaines actions doivent se déclencher **automatiquement à une heure précise**, pas en réponse à une requête HTTP : le rappel de déclaration à 18h30, la relance de retard, le résumé du soir, le rapport hebdomadaire (cf. cahier des charges §2.4).

- **Redis** est une base de données ultra-rapide utilisée ici comme "tableau de tâches en attente".
- **BullMQ** est la bibliothèque qui gère ces tâches planifiées (comme un cron job, mais robuste et redémarrable).
- `rituels.scheduler.ts` : au démarrage de l'API, programme les horaires pour chaque bureau existant (selon son `heureDeclaration`).
- `rituels.processor.ts` : le "travailleur" qui exécute réellement l'action quand l'horaire arrive (pour l'instant, juste un `log` — la vraie logique métier sera branchée plus tard).

**Important** : sans Redis démarré, l'API se lance quand même (le module gère l'erreur proprement), mais aucun rituel automatique ne fonctionnera.

---

## 3. apps/web — le frontend (Next.js)

C'est le site que l'utilisateur voit. Construit avec **Next.js** (React) et **Tailwind CSS** (classes utilitaires pour le style, ex. `className="text-sm font-bold"`).

```
apps/web/src/
├── app/
│   ├── layout.tsx        ← le "cadre" commun à toutes les pages (police, <html>, etc.)
│   ├── page.tsx           ← la page d'accueil (route "/")
│   ├── login/page.tsx      ← la page de connexion (route "/login")
│   └── register/page.tsx   ← la page d'inscription (route "/register")
│
└── lib/
    └── api.ts             ← toutes les fonctions qui appellent l'API (fetch)
```

**Comment ça marche** : Next.js utilise le système de fichiers pour créer les routes. Un dossier `app/login/page.tsx` devient automatiquement accessible sur `/login`. Pas besoin de configurer un routeur à la main.

`'use client'` en haut d'un fichier veut dire "ce composant s'exécute dans le navigateur" (nécessaire pour utiliser `useState`, gérer un formulaire, etc.).

`lib/api.ts` centralise les appels réseau vers l'API (ex. `login(email, password)`), pour ne pas répéter le code `fetch(...)` dans chaque page. Les tokens reçus sont stockés dans le `localStorage` du navigateur.

---

## 4. Comment tout communique

```
Navigateur                apps/web (port 3000)          apps/api (port 3001)         PostgreSQL / Redis
    │                            │                              │                          │
    │  1. Ouvre /login           │                              │                          │
    │ ─────────────────────────▶ │                              │                          │
    │                            │                              │                          │
    │  2. Remplit le formulaire  │                              │                          │
    │     et clique "Connexion"  │                              │                          │
    │                            │  3. fetch POST /auth/login   │                          │
    │                            │ ─────────────────────────────▶                          │
    │                            │                              │  4. lit/écrit en base    │
    │                            │                              │ ─────────────────────────▶
    │                            │  5. { accessToken, ... }     │                          │
    │                            │ ◀───────────────────────────  │                          │
    │  6. redirigé, connecté     │                              │                          │
    │ ◀───────────────────────── │                              │                          │
```

---

## 5. Où sont les "réglages" (variables d'environnement) ?

Les informations sensibles ou qui changent selon l'environnement (mot de passe base de données, clés secrètes JWT...) ne sont **jamais écrites en dur dans le code**. Elles vivent dans un fichier `.env` (ignoré par git, jamais commité).

- `.env.example` à la racine : le **modèle**, avec des valeurs d'exemple. C'est celui-ci qui est commité sur git.
- `apps/api/.env` : ta copie personnelle, à créer avec `cp .env.example apps/api/.env`.

---

## 6. Résumé en une phrase par dossier

| Dossier | En une phrase |
|---|---|
| `apps/api/src/auth` | Qui es-tu, et comment je te fais confiance ensuite ? |
| `apps/api/src/prisma` | Comment je parle à la base de données, sans mélanger les organisations |
| `apps/api/src/queue` | Que faire automatiquement, à quelle heure |
| `apps/api/src/common` | Petits outils partagés (vérifications d'accès) |
| `apps/api/prisma/schema.prisma` | La forme des données, de A à Z |
| `apps/web/src/app` | Ce que l'utilisateur voit, page par page |
| `apps/web/src/lib/api.ts` | Comment le site parle à l'API |
| `docker-compose.yml` | Comment démarrer PostgreSQL + Redis en local |
