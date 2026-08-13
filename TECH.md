# Référence technique — OnOffix

Fichier vivant : design system, commandes, hébergement et workflow. À compléter au fur et à mesure qu'on ajoute des choses.

---

## 1. Design system (apps/web)

### 1.1 Polices

| Usage | Police | Variable CSS | Où |
|---|---|---|---|
| App (dashboard, formulaires, etc.) | **Geist** | `--font-geist-sans` | `app/layout.tsx` |
| App — monospace | **Geist Mono** | `--font-geist-mono` | `app/layout.tsx` |
| Landing page — titres (h1/h2/h3) | **Space Grotesk** | `--font-display-src` → `--font-display` | `app/page.tsx` + `landing.css` |
| Landing page — corps de texte | **IBM Plex Sans** | `--font-body-src` → `--font-body` | `app/page.tsx` + `landing.css` |
| Landing page — mono (badges, labels, chiffres) | **IBM Plex Mono** | `--font-mono-src` → `--font-mono` | `app/page.tsx` + `landing.css` |

Toutes chargées via `next/font/google`. La landing page (`/`) a son propre système de polices, séparé du reste de l'app.

### 1.2 Couleurs — app (globals.css)

```
--background:        #eef0f6
--foreground:        #0a1440

--brand-navy:         #0a1440
--brand-navy-light:   #16225c
--brand-blue:         #0b63f6
--brand-blue-dark:    #0030a0
--brand-blue-light:   #eaf1ff

--surface:            #ffffff
--surface-muted:      #f2f4f8
--border:             #e3e7f0
--muted-foreground:   #5b6178

--status-todo:        #8a8fa3
--status-declared:    #d97706
--status-validated:   #16a34a
--status-review:      #dc2626
```

Exposées comme classes Tailwind (`bg-brand-blue`, `text-status-review`, etc.) via `@theme inline` dans `globals.css`.

### 1.3 Couleurs — landing page (landing.css, scope `.landing`)

```
--ink:            #0b1b3f   (texte principal)
--ink-2:          #16264d
--blue:           #2e5cff   (accent landing — différent de --brand-blue de l'app)
--blue-light:     #5b9bff
--lp-bg:          #f6f8fe
--lp-surface:     #ffffff
--slate:          #5b6478   (texte secondaire)
--slate-soft:     #8891a6   (texte tertiaire / labels)
--lp-line:        #e3e8f7   (bordures)
--success:        #17a05b
--success-bg:     #e8f7ef
--amber:          #e8a23d
--amber-bg:       #fbf1e2
```

⚠️ La landing page a sa **propre palette bleue** (`--blue: #2e5cff`), légèrement différente du `--brand-blue: #0b63f6` de l'app. Attention si on veut harmoniser.

### 1.4 Composants UI (apps/web/src/components/ui)

- **Button** (`button.tsx`) : variants `primary | secondary | ghost | danger`, tailles `sm | default | lg`. `rounded-lg`, transitions sur hover.
- **Badge** (`badge.tsx`) : tones `neutral | declared | validated | review | brand`, toujours `rounded-full`, `text-xs font-semibold`.
- **Card** (`card.tsx`) : `rounded-2xl border border-border bg-surface p-6 shadow-sm`. Sous-composants `CardHeader`, `CardTitle` (`text-lg font-bold`), `CardDescription` (`text-sm text-muted-foreground`).
- **Input / Label / Breadcrumbs** : voir fichiers correspondants, mêmes conventions (`border-border`, `rounded-lg`, focus ring `brand-blue/20`).

### 1.5 Conventions d'espacement / style

- Rayons : `rounded-lg` (boutons/inputs), `rounded-2xl` (cards), `rounded-full` (badges/pills landing).
- Landing : boutons en pills (`border-radius: 99px`), sections `padding: 100px 0`, container `max-width: 1180px` (`.wrap`).
- Ombres : `shadow-sm` (cards app), ombres portées plus marquées sur la landing (`0 24px 60px -30px rgba(11,27,63,.35)`).
- Titres landing en `clamp()` pour être responsive (ex. hero h1 : `clamp(38px, 4.6vw, 60px)`).

---

## 2. Commandes

### 2.1 Dev local

```bash
docker compose up -d              # Postgres (port 5434) + Redis (port 6379)
pnpm dev:api                      # API NestJS sur :3001 (nest start --watch)
pnpm dev:web                      # Web Next.js sur :3000
```

### 2.2 Build / qualité (racine, tourne sur les deux apps via pnpm -r)

```bash
pnpm build
pnpm lint
pnpm typecheck
pnpm format                       # prettier --write sur tout le repo
```

### 2.3 Base de données (apps/api)

```bash
pnpm --filter @onoffix/api prisma:generate   # régénère le client Prisma
pnpm --filter @onoffix/api prisma:migrate    # migration dev (crée + applique, interactif)
pnpm --filter @onoffix/api prisma:deploy     # applique les migrations existantes (prod/CI)
pnpm --filter @onoffix/api prisma:seed
```

### 2.4 Git / commit

- Hook **husky pre-commit** : lance lint + typecheck sur tout le monorepo (~2-4 min). Toujours committer avec un timeout long / en arrière-plan.
- Format de message de commit type : `feat: ...` / `fix: ...` / `style: ...`, footer `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` quand le code est généré avec Claude.
- Le hook applique aussi `prettier --fix` automatiquement → il arrive qu'un second commit `style: prettier formatting` soit nécessaire juste après si le hook a reformaté des fichiers post-staging.

---

## 3. Hébergement & services externes

| Service | Rôle | Notes |
|---|---|---|
| **Railway** | Héberge l'API NestJS + PostgreSQL + Redis (prod) | Déploiement auto sur push vers `main`. Start command lance `prisma migrate deploy` avant `node dist/main`. |
| **Vercel** | Héberge le frontend Next.js (prod) | Déploiement auto sur push vers `main`. Root directory : `apps/web`. Env `NEXT_PUBLIC_API_URL` pointant vers l'API Railway. |
| **Cloudflare R2** | Stockage des fichiers (pièces jointes chat, logos) | S3-compatible, via `@aws-sdk/client-s3`. Variables encore nommées `SPACES_*` dans le code (héritage du nom "DigitalOcean Spaces" d'origine) mais pointent vers R2 en prod. |
| **Brevo** | Envoi des emails transactionnels (invitations, reset password, vérification email) | API HTTPS (`BREVO_API_KEY`), pas de SMTP — Railway bloque les ports SMTP sortants, d'où ce choix. Sender vérifié par email (pas de domaine custom requis). |
| **Google AI (Gemini)** | Classification des messages Organizer en tâches | Modèle configurable via `GOOGLE_AI_MODEL` (actuellement `gemini-flash-latest`). |

URL prod actuelles :
- Web : `https://onoffix-web.vercel.app`
- API : `https://onoffix-production.up.railway.app`

---

## 4. Variables d'environnement (voir `.env.example`)

```
PORT, DATABASE_URL, REDIS_HOST/REDIS_PORT (ou REDIS_URL en prod)
JWT_ACCESS_SECRET, JWT_ACCESS_EXPIRES_IN, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN
FRONTEND_URL
BREVO_API_KEY, EMAIL_FROM_ADDRESS, EMAIL_FROM_NAME
GOOGLE_AI_API_KEY, GOOGLE_AI_MODEL
ORGANIZER_DEBOUNCE_SECONDS        # délai avant classification IA après le dernier message (défaut 30s)
SPACES_ENDPOINT, SPACES_REGION, SPACES_BUCKET, SPACES_KEY, SPACES_SECRET, SPACES_PUBLIC_URL
NEXT_PUBLIC_API_URL               # côté web
```

---

## 5. Workflow de développement d'une fonctionnalité

Le déroulé suivi pour chaque nouvelle fonctionnalité de ce projet :

1. **Cadrage** — si la fonctionnalité implique un choix de design/architecture (ex. modèle de données, découpage), on en discute et on valide l'approche avant de coder. Sinon, on part direct à l'implémentation.
2. **Schéma d'abord** — si la feature touche la base : modifier `schema.prisma`, générer la migration (`prisma migrate dev` en local), l'appliquer, régénérer le client.
3. **Backend** — implémenter service(s) + controller(s) + DTOs. Toujours **tester via `curl` en local avant de toucher au frontend** (register/login de test, appeler les nouveaux endpoints, vérifier les réponses et les cas d'erreur/permissions).
4. **Frontend** — implémenter les pages/composants, en consommant les endpoints déjà validés.
5. **Vérification** — `pnpm typecheck` sur les deux apps (une seule fois à la fin, pas à chaque fichier). Test end-to-end local si la feature a une partie asynchrone (queue, IA, email...).
6. **Commit + push** — `git commit` puis `git push origin main` (le hook husky prend 2-4 min, toujours en arrière-plan). Un second commit `style: prettier formatting` arrive parfois si le hook reformate après coup.
7. **Déploiement auto** — push sur `main` déclenche Railway (API, avec `prisma migrate deploy`) et Vercel (web) automatiquement. Pas de branche de staging à ce stade.
8. **Vérification en prod** — smoke test rapide (`curl` ou test réel via l'UI) sur la fonctionnalité déployée, pas juste "ça build".

Autres conventions :
- **Monorepo pnpm** : `apps/api` (NestJS) + `apps/web` (Next.js), gérés ensemble via `pnpm-workspace.yaml`.
- **Migrations Prisma** : jamais de modification manuelle de la base — tout passe par `schema.prisma` + une migration versionnée.
- **Env locale vs prod** : `.env.example` est la seule source commitée ; les vraies valeurs vivent dans `apps/api/.env` (local, gitignore) et dans les variables Railway/Vercel (prod).

---

## 6. À compléter au fil de l'eau

- [ ] Design tokens supplémentaires si on introduit un dark mode.
- [ ] Rename OnOffix → OOffix (logo déjà mis à jour, reste : nom affiché, favicon, éventuellement identifiants techniques).
- [ ] Rotation des secrets prod (JWT, Google AI, R2) — voir mémoire de session du 2026-08-11.
