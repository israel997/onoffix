# Référence technique — OOffix

Fichier vivant : design system, commandes, hébergement et workflow. À compléter au fur et à mesure qu'on ajoute des choses.

---

## 0. Fonctionnalités actuellement disponibles

### Comptes & authentification
- **Inscription avec vérification obligatoire par code (OTP)** : le formulaire d'inscription crée le compte + l'organisation mais **ne connecte pas** l'utilisateur — un code à 6 chiffres est envoyé par email (`EmailVerificationToken`, expire en 10 min), et `/verify-otp` doit être validé avant qu'une session ne soit ouverte. Objectif : empêcher la création de comptes avec des adresses email invalides/non possédées. Bouton "Resend code" avec cooldown de 60s.
- **Connexion** (`/login`) : si le compte n'est pas encore vérifié, `login()` refuse et redirige automatiquement vers `/verify-otp` (avec renvoi auto d'un code). JWT access 15 min + refresh 7 jours.
- **Sign in with Google** (OAuth) : flux redirect-based (`/auth/google` → Google → `/auth/google/callback`). Premier login = création auto de compte + organisation + Organizer personnel ; email considéré vérifié d'office (pas d'OTP, Google a déjà prouvé la possession de l'adresse).
- **Comptes invités** (via lien d'invitation) : idem, pas d'OTP requis — cliquer le lien envoyé à l'adresse invitée constitue déjà une preuve de possession.
- Mot de passe oublié / réinitialisation par email (réponse toujours silencieuse pour ne pas révéler si un email est enregistré).
- Champ mot de passe avec bouton afficher/masquer sur tous les formulaires auth.
- **Multi-organisation** : un même compte (email) peut appartenir à plusieurs organisations ; sélection de l'organisation au login si ambigu, bascule (`switch-organisation`) et création d'une organisation supplémentaire (limite 2 possédées) depuis un compte existant.
- **Modération de compte** (voir Panneau admin) : `banned` bloque toute connexion immédiatement (vérifié à chaque requête, même sur un token déjà émis) ; `restricted` limite le compte aux requêtes de lecture (GET) uniquement.

### Organisation & membres
- Page organisation (nom, logo).
- Créer une nouvelle organisation depuis un compte existant.
- **Liste des membres** avec rôles (Admin / Membre).
- **Inviter un membre avec un rôle choisi à l'invitation** (Admin ou Membre) : rattachement immédiat si un compte existe déjà pour cet email (avec le rôle choisi), sinon email d'invitation avec deux boutons — **Accept** (bleu, mène à `/accept-invite` : définir un mot de passe puis rejoindre) et **Decline** (rouge, mène à `/decline-invite` : supprime l'invitation). Expire après 7 jours.
- Annuler une invitation en attente (action côté organisation, différente du Decline côté invité).
- Changer le rôle d'un membre à tout moment (réservé au propriétaire de l'organisation), retirer un membre.
- Stats organisation : nombre de membres, nombre de tâches.

### Bureaux (offices)
- Créer / modifier / supprimer un bureau (limite : 10 par organisation), réordonner.
- **Ajout de membre à un bureau soumis à consentement** : un manager qui ajoute un collaborateur crée une `BureauInvitation` en attente (pas d'accès immédiat) — la personne reçoit un email + une notification in-app, et voit l'invitation sur `/offices` avec **Accept**/**Decline**. L'adhésion réelle (`UserBureau`) n'est créée qu'à l'acceptation. Le manager voit les invitations en attente dans la liste des membres du bureau (badge orange "Pending") et peut les annuler.
- Rôle par bureau (Manager / Collaborateur), changeable à tout moment par un manager.
- Paramètres du bureau : heure de déclaration quotidienne, délai de relance, visibilité du classement de fiabilité, couleur, photo.
- Chat d'équipe par bureau (temps réel, WebSocket, pièces jointes).

### Organizer (brain dump → tâches)
- Un Organizer personnel (privé, par utilisateur) + un Organizer par bureau.
- **Subjects** : plusieurs fils de discussion nommés par Organizer, chacun avec son propre chat et sa propre génération de tâches.
- Génération de tâches par IA (Google Gemini) : **chaque message déclenche son propre traitement**, quasi immédiatement (job BullMQ par message, pas d'accumulation ni de poll fixe) — un échec IA sur un message ne fait perdre que celui-là, pas tout un batch (retry automatique en plus, cf. §3).
- Ajout manuel d'une tâche dans un Organizer (sans passer par l'IA).
- **Plan structuré via IA** : à partir d'un Subject, l'IA suggère `{projetNom, tâches priorisées}` — aperçu affiché côté client, rien n'est persisté tant que l'utilisateur n'a pas explicitement validé la conversion (`/plan/convertir`), qui crée un **vrai Projet** + ses tâches.

### Tâches
- Cycle de vie : à faire → acceptée → en cours → déclarée → validée / à revoir.
- **Santé** (`sante`) : Normal / À surveiller / À risque / Bloquée — distincte du statut, reflète le risque.
- **Priorité** : Basse / Normale / Haute / Urgente.
- **Blocages** : type (tâche/personne/décision/client/ressource/externe) + cause + responsable ; ouvrir un blocage passe automatiquement la santé à Bloquée, le résoudre repasse la santé à Normal quand plus aucun blocage n'est actif.
- **Chronomètre** par tâche et par utilisateur (start/stop), alimente le temps réellement passé.
- Assignation / **réassignation** d'une tâche à un autre membre du bureau (manager).
- Modale de détail (santé, priorité, blocages, chrono, tag Subject d'origine), suppression (admin pour les tâches de bureau).
- "Mes tâches" : toutes les tâches assignées à l'utilisateur, tous bureaux + Organizer personnel confondus.

### Projets (réels) & Rapport de projet
- Un **vrai Projet** naît de la conversion d'un plan Organizer (pas de création manuelle dans l'UI actuellement). Liste consultable depuis l'onglet **Projects** d'un bureau.
- Stats projet : progression, temps prévu vs réel, tâches en retard, blocages, risques.
- **Rapport de projet complet** (`/offices/:id/projects/:projetId`) :
  - **Synthèse exécutive** : progression, tâches terminées/en retard, écart de temps (réel − estimé).
  - **Comparatif prévu vs réel** : dates de début/fin planifiées vs constatées, durée, écart en jours.
  - **Timeline rejouable, jour par jour** : reconstituée en rejouant chronologiquement les événements de tâches (créée/démarrée/déclarée/validée) et de blocages (ouvert/résolu) ; contrôle Play/Pause/Prev/Next + curseur, chaque événement est cliquable.
  - **Évolution quotidienne de l'équipe** : dérivée du même replay (tâches validées/démarrées cumulées, blocages actifs, jour par jour).
  - **Contribution par membre** : tâches assignées/terminées, temps loggé, blocages rencontrés.
  - **Blocages & dépendances** : historique complet (actifs et résolus) avec durée.
  - **Analyse narrative générée par IA** + **bilan** (points positifs / points à améliorer / recommandations) — best-effort, jamais bloquant si l'IA est indisponible.

### Alertes & dashboard
- **Détection automatique des tâches à risque** : santé À risque/Bloquée, blocage actif, échéance dépassée ou dans les 3 prochains jours. Portée : mes tâches + celles des bureaux que je manage (tout l'org pour un admin).
- Le **dashboard** sépare "Needs your attention" (liste avec badges de raison) de "tout va bien" (compteur "X tasks on track"), avec actions rapides par tâche : **View** (aller à la tâche), **Contact** (mailto vers l'assigné), **Reassign** (managers, sélecteur inline).

### Rituel quotidien (déclaration de progression)
- Vue "Aujourd'hui" : tâches du jour à déclarer (faites / pas faites).
- Déclaration de la journée par le collaborateur, notification aux managers/admins.
- Validation par le manager (OK / litige) le lendemain.
- Score de fiabilité par membre (calculé à partir des déclarations validées).
- **Daily Team Brief** par bureau : synthèse quotidienne (terminé/en cours/bloqué/à risque, blocages actifs, % de rituel complété) — remplace une partie du DSM traditionnel.

### Statistiques (3 niveaux)
- **Individuel** : tâches assignées/validées/à revoir, heures travaillées, taux de déclaration à temps, blocages rencontrés, respect des délais.
- **Équipe (bureau)** : progression, charge (membres actifs), tâches bloquées, respect des délais.
- **Organisation** : nombre de membres, nombre de tâches.
- Tout calculé en direct depuis Prisma (pas de table de snapshot/cache).

### Notifications
- Liste des notifications, compteur non-lues, marquer comme lue(s)/toutes lues.
- Types : assignation, acceptation, rappel de déclaration, relance de retard, validation à faire, tâche validée/à revoir, résumé quotidien, rapport hebdomadaire, invitation à un bureau.

### Panneau admin (super admin)
- Réservé au(x) email(s) listé(s) dans `SUPER_ADMIN_EMAILS` (défaut : `israellawani.pro@gmail.com`), protégé côté serveur (`SuperAdminGuard`) — pas seulement caché côté UI.
- **Organisations** : liste (propriétaire, nb membres, date de création), suppression (cascade + nettoyage des comptes devenus orphelins).
- **Membres** (tableau, toutes organisations confondues) : nom, email, organisation, rôle, date d'inscription, **pays auto-détecté via géolocalisation IP** à l'inscription (best-effort, jamais bloquant), statut (Active/Banned/Restricted).
- Actions : **promouvoir admin**, **restreindre** (lecture seule) / lever la restriction, **supprimer le compte** définitivement (cascade sur toutes ses adhésions). Actions destructrices confirmées par une modale simple (pas de mot de passe pour l'instant — retiré temporairement, à réintroduire plus tard).

### Chat
- Chat d'équipe par bureau, temps réel (WebSocket), envoi de fichiers.

### Profil & paramètres
- Modifier son profil (nom, poste, bio, photo).
- Paramètres de l'organisation (Admin).

### Polish / UX
- Toasts et modales de confirmation (remplacent `window.confirm`).
- Pages d'erreur stylées (404, 500).
- Animations d'entrée sobres (modales, toasts, menus), respectent `prefers-reduced-motion`.
- Images compressées (palette PNG) pour un chargement plus rapide.
- CORS multi-origine (`ALLOWED_ORIGINS`) pour supporter plusieurs domaines pendant une transition.

### Landing page publique
- Page marketing (`/`) avec démo visuelle du produit, comparatif, étapes, CTA.

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
- Format de message de commit type : `feat: ...` / `fix: ...` / `style: ...`. **Pas de trailer `Co-Authored-By`** (retiré à la demande). Commits groupés par liste de tâches, push une seule fois à la fin plutôt qu'après chaque sous-tâche.
- Le hook applique aussi `prettier --fix` automatiquement → il arrive qu'un second commit `style: prettier formatting` soit nécessaire juste après si le hook a reformaté des fichiers post-staging.

---

## 3. Hébergement & services externes

| Service | Rôle | Notes |
|---|---|---|
| **Railway** | Héberge l'API NestJS + PostgreSQL + Redis (prod) | Déploiement auto sur push vers `main`. Start command lance `prisma migrate deploy` avant `node dist/main`. |
| **Vercel** | Héberge le frontend Next.js (prod), domaine `ooffix.site` | Déploiement auto sur push vers `main`. Root directory : `apps/web`. Env `NEXT_PUBLIC_API_URL` pointant vers l'API Railway. |
| **Cloudflare R2** | Stockage des fichiers (pièces jointes chat, logos) | S3-compatible, via `@aws-sdk/client-s3`. Variables encore nommées `SPACES_*` dans le code (héritage du nom "DigitalOcean Spaces" d'origine) mais pointent vers R2 en prod. |
| **Resend** | Envoi des emails transactionnels (OTP, invitations, reset password) | API HTTPS (`RESEND_API_KEY`) via `fetch` brut (pas de SDK), pas de SMTP — Railway bloque les ports SMTP sortants. Domaine `ooffix.site` vérifié. Remplace Brevo (lui-même un remplacement d'un essai SMTP Gmail initial). |
| **Google AI (Gemini)** | Classification des messages Organizer en tâches, plan structuré, analyse narrative des rapports de projet | Modèle configurable via `GOOGLE_AI_MODEL` (actuellement `gemini-flash-latest`). Toutes les méthodes sont best-effort : ne lèvent jamais, retournent un résultat vide/`null` si la clé est absente ou l'appel échoue. |
| **Google Cloud (OAuth)** | Sign in with Google | `passport-google-oauth20`, flux redirect. |
| **ip-api.com** | Géolocalisation IP → pays, à l'inscription (panneau admin) | Appel best-effort, jamais bloquant. |

URL prod actuelles :
- Web : `https://ooffix.site`
- API : `https://onoffix-production.up.railway.app`

---

## 4. Variables d'environnement (voir `.env.example`)

```
PORT, DATABASE_URL, REDIS_HOST/REDIS_PORT (ou REDIS_URL en prod)
JWT_ACCESS_SECRET, JWT_ACCESS_EXPIRES_IN, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN
FRONTEND_URL
ALLOWED_ORIGINS                   # CORS multi-domaine, séparés par des virgules ; repli sur FRONTEND_URL
RESEND_API_KEY, EMAIL_FROM_ADDRESS, EMAIL_FROM_NAME
GOOGLE_AI_API_KEY, GOOGLE_AI_MODEL
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL   # Sign in with Google
SUPER_ADMIN_EMAILS                # emails autorisés sur /admin, séparés par des virgules
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
- [ ] Rotation des secrets prod (JWT, Google AI, R2) — voir mémoire de session du 2026-08-11.
- [ ] Réintroduire une confirmation par mot de passe avant Ban/Delete dans le panneau admin (retirée temporairement à la demande).
- [ ] Pas de création manuelle de Projet dans l'UI — un vrai Projet naît uniquement de la conversion d'un plan Organizer.
