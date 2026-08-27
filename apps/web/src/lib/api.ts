const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/** Files are stored as full URLs (S3-compatible storage) — kept for any legacy relative path. */
export function resolveAssetUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_URL}${path}`;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface Me {
  id: string;
  nom: string;
  email: string;
  poste: string | null;
  bio: string | null;
  photoUrl: string | null;
  roleGlobal: 'ADMIN' | 'MEMBRE';
  emailVerifie: boolean;
  hierarchie: string | null;
  dateAnniversaire: string | null;
  aime: string | null;
  naimePas: string | null;
  organisation: { id: string; nom: string; logoUrl: string | null; proprietaireId: string };
  bureaux: {
    roleDansBureau: 'MANAGER' | 'COLLABORATEUR';
    roleInterne: string | null;
    bureau: { id: string; nom: string };
  }[];
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function parseErrorMessage(res: Response): Promise<string> {
  const payload = await res.json().catch(() => null);
  if (!payload?.message) return `Error ${res.status}`;
  return Array.isArray(payload.message) ? payload.message.join(', ') : payload.message;
}

async function publicRequest<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function publicGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);
  return res.json();
}

export function registerOrganisation(data: {
  organisationNom: string;
  nom: string;
  email: string;
  password: string;
}) {
  return publicRequest<{ email: string }>('/auth/register', data);
}

export interface OrganisationOption {
  id: string;
  nom: string;
  logoUrl: string | null;
}

export interface NeedsOrganisationSelection {
  needsOrganisationSelection: true;
  organisations: OrganisationOption[];
}

export interface NeedsVerification {
  needsVerification: true;
  email: string;
}

export function isNeedsOrganisationSelection(
  result: AuthTokens | NeedsOrganisationSelection | NeedsVerification,
): result is NeedsOrganisationSelection {
  return 'needsOrganisationSelection' in result;
}

export function isNeedsVerification(
  result: AuthTokens | NeedsOrganisationSelection | NeedsVerification,
): result is NeedsVerification {
  return 'needsVerification' in result;
}

export function login(data: { email: string; password: string; organisationId?: string }) {
  return publicRequest<AuthTokens | NeedsOrganisationSelection | NeedsVerification>('/auth/login', data);
}

export function verifyOtp(email: string, code: string) {
  return publicRequest<AuthTokens>('/auth/verify-otp', { email, code });
}

export function resendOtp(email: string) {
  return publicRequest<void>('/auth/resend-otp', { email });
}

export interface InvitationPreview {
  email: string;
  nom: string;
  organisationNom: string;
  roleGlobal: 'ADMIN' | 'MEMBRE';
}

export function getInvitationPreview(token: string) {
  return publicGet<InvitationPreview>(`/auth/invitations/${token}`);
}

export function acceptInvitation(token: string, password: string) {
  return publicRequest<AuthTokens>('/auth/accept-invitation', { token, password });
}

export function declineInvitation(token: string) {
  return publicRequest<void>('/auth/decline-invitation', { token });
}

export function forgotPassword(email: string) {
  return publicRequest<void>('/auth/forgot-password', { email });
}

export function resetPassword(token: string, password: string) {
  return publicRequest<void>('/auth/reset-password', { token, password });
}

const TOKENS_KEY = 'onoffix_tokens';

export function storeTokens(tokens: AuthTokens) {
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

export function getStoredTokens(): AuthTokens | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(TOKENS_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearTokens() {
  localStorage.removeItem(TOKENS_KEY);
}

async function refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new ApiError('Session expirée', 401);
  const tokens: AuthTokens = await res.json();
  storeTokens(tokens);
  return tokens;
}

/** At most one refresh in flight — several requests hitting 401 at once share the same retry. */
let refreshPromise: Promise<AuthTokens> | null = null;

export function refreshOnce(refreshToken: string): Promise<AuthTokens> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken(refreshToken).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/**
 * Authenticated fetch: attaches the stored access token, and if the API replies 401
 * (access token expired — it's short-lived), transparently refreshes it once and retries.
 * Throws only if there is no session, or the refresh itself fails (session truly over).
 */
async function authorizedFetch(path: string, init: RequestInit): Promise<Response> {
  const tokens = getStoredTokens();
  if (!tokens) throw new ApiError('Non authentifié', 401);

  const withAuth = (accessToken: string): RequestInit => ({
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${accessToken}` },
  });

  let res = await fetch(`${API_URL}${path}`, withAuth(tokens.accessToken));

  if (res.status === 401) {
    try {
      const refreshed = await refreshOnce(tokens.refreshToken);
      res = await fetch(`${API_URL}${path}`, withAuth(refreshed.accessToken));
    } catch {
      clearTokens();
      throw new ApiError('Session expirée, merci de vous reconnecter', 401);
    }
  }

  return res;
}

export async function authFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await authorizedFetch(path, {
    method: options.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);
  if (res.status === 204) return undefined as T;
  return res.json();
}

/** Same as authFetch but for multipart/form-data uploads (no Content-Type — the browser sets the boundary). */
async function authFetchForm<T>(path: string, formData: FormData): Promise<T> {
  const res = await authorizedFetch(path, { method: 'POST', body: formData });
  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);
  return res.json();
}

export function getMe() {
  return authFetch<Me>('/users/me');
}

export type CouleurBureau =
  | 'BLUE'
  | 'PURPLE'
  | 'GREEN'
  | 'AMBER'
  | 'PINK'
  | 'SLATE'
  | 'RED'
  | 'ORANGE'
  | 'TEAL'
  | 'CYAN'
  | 'INDIGO'
  | 'ROSE';
export type NiveauAlerte = 'AUCUNE' | 'ORANGE' | 'ROUGE';

export interface Bureau {
  id: string;
  nom: string;
  fuseauHoraire: string;
  heureDeclaration: string;
  delaiRelanceMinutes: number;
  classementFiabiliteVisible: boolean;
  couleur: CouleurBureau;
  photoUrl: string | null;
  ordre: number;
  createdAt: string;
  _count: { membres: number };
  unreadCount: number;
  niveauAlerte: NiveauAlerte;
  alerteJusqua: string | null;
  tachesCount: number;
}

export interface Membre {
  roleDansBureau: 'MANAGER' | 'COLLABORATEUR';
  roleInterne: string | null;
  user: { id: string; nom: string; email: string; photoUrl: string | null };
}

export interface BureauDetail extends Bureau {
  membres: Membre[];
}

export function listBureaux() {
  return authFetch<Bureau[]>('/bureaux');
}

export function createBureau(data: { nom: string }) {
  return authFetch<Bureau>('/bureaux', { method: 'POST', body: data });
}

export function getBureau(bureauId: string) {
  return authFetch<BureauDetail>(`/bureaux/${bureauId}`);
}

export function updateBureau(bureauId: string, data: { nom?: string }) {
  return authFetch<Bureau>(`/bureaux/${bureauId}`, { method: 'PATCH', body: data });
}

export function updateBureauParametres(
  bureauId: string,
  data: Partial<{
    heureDeclaration: string;
    fuseauHoraire: string;
    delaiRelanceMinutes: number;
    classementFiabiliteVisible: boolean;
    couleur: CouleurBureau;
  }>,
) {
  return authFetch<Bureau>(`/bureaux/${bureauId}/parametres`, { method: 'PATCH', body: data });
}

export function deleteBureau(bureauId: string) {
  return authFetch<void>(`/bureaux/${bureauId}`, { method: 'DELETE' });
}

export function setBureauAlerte(bureauId: string, data: { niveau: NiveauAlerte; jours?: number; heures?: number }) {
  return authFetch<Bureau>(`/bureaux/${bureauId}/alerte`, { method: 'PATCH', body: data });
}

export function reorderBureaux(ordre: string[]) {
  return authFetch<void>('/bureaux/reordonner', { method: 'PATCH', body: { ordre } });
}

export function uploadBureauPhoto(bureauId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return authFetchForm<Bureau>(`/bureaux/${bureauId}/photo`, formData);
}

export function removeBureauPhoto(bureauId: string) {
  return authFetch<Bureau>(`/bureaux/${bureauId}/photo`, { method: 'DELETE' });
}

export interface BureauInvitation {
  id: string;
  roleDansBureau: 'MANAGER' | 'COLLABORATEUR';
  roleInterne: string | null;
  createdAt: string;
  user: { id: string; nom: string; email: string; photoUrl: string | null };
}

export interface MyBureauInvitation {
  id: string;
  roleDansBureau: 'MANAGER' | 'COLLABORATEUR';
  roleInterne: string | null;
  createdAt: string;
  bureau: { id: string; nom: string };
}

export function addMembre(
  bureauId: string,
  data: { email: string; roleDansBureau: 'MANAGER' | 'COLLABORATEUR'; roleInterne?: string },
) {
  return authFetch<BureauInvitation>(`/bureaux/${bureauId}/membres`, { method: 'POST', body: data });
}

export function listBureauInvitations(bureauId: string) {
  return authFetch<BureauInvitation[]>(`/bureaux/${bureauId}/invitations`);
}

export function cancelBureauInvitation(bureauId: string, invitationId: string) {
  return authFetch<void>(`/bureaux/${bureauId}/invitations/${invitationId}`, { method: 'DELETE' });
}

export function listMyBureauInvitations() {
  return authFetch<MyBureauInvitation[]>('/bureaux/invitations/mine');
}

export function acceptBureauInvitation(invitationId: string) {
  return authFetch<void>(`/bureaux/invitations/${invitationId}/accept`, { method: 'POST' });
}

export function declineBureauInvitation(invitationId: string) {
  return authFetch<void>(`/bureaux/invitations/${invitationId}/decline`, { method: 'POST' });
}

export function updateMembre(
  bureauId: string,
  userId: string,
  data: { roleDansBureau?: 'MANAGER' | 'COLLABORATEUR'; roleInterne?: string },
) {
  return authFetch<Membre>(`/bureaux/${bureauId}/membres/${userId}`, {
    method: 'PATCH',
    body: data,
  });
}

export function removeMembre(bureauId: string, userId: string) {
  return authFetch<void>(`/bureaux/${bureauId}/membres/${userId}`, { method: 'DELETE' });
}

export interface OrganisationMembre {
  id: string;
  nom: string;
  email: string;
  poste: string | null;
  photoUrl: string | null;
  roleGlobal: 'ADMIN' | 'MEMBRE';
  createdAt: string;
  hierarchie: string | null;
  dateAnniversaire: string | null;
  aime: string | null;
  naimePas: string | null;
  bureaux: { roleDansBureau: 'MANAGER' | 'COLLABORATEUR'; bureau: { id: string; nom: string } }[];
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  auteurId: string;
  contenu: string | null;
  edited: boolean;
  createdAt: string;
  fichierUrl: string | null;
  fichierNom: string | null;
  fichierType: string | null;
  fichierTailleOctets: number | null;
  auteur: { id: string; nom: string; photoUrl: string | null };
  replyTo: {
    id: string;
    contenu: string | null;
    fichierNom: string | null;
    auteur: { id: string; nom: string };
  } | null;
}

export function listMessages(bureauId: string) {
  return authFetch<ChatMessage[]>(`/bureaux/${bureauId}/messages`);
}

function sendFile(path: string, file: File, contenu?: string, replyToId?: string): Promise<ChatMessage> {
  const formData = new FormData();
  formData.append('file', file);
  if (contenu) formData.append('contenu', contenu);
  if (replyToId) formData.append('replyToId', replyToId);
  return authFetchForm<ChatMessage>(path, formData);
}

export function sendBureauFile(bureauId: string, file: File, contenu?: string, replyToId?: string) {
  return sendFile(`/bureaux/${bureauId}/messages/fichier`, file, contenu, replyToId);
}

export interface Organisation {
  id: string;
  nom: string;
  logoUrl: string | null;
  proprietaireId: string;
  dateCreation: string;
}

export function getOrganisation() {
  return authFetch<Organisation>('/organisation');
}

export function updateOrganisation(data: { nom: string }) {
  return authFetch<Organisation>('/organisation', { method: 'PATCH', body: data });
}

export function deleteOrganisation() {
  return authFetch<void>('/organisation', { method: 'DELETE' });
}

export function uploadOrganisationLogo(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return authFetchForm<Organisation>('/organisation/logo', formData);
}

export function removeOrganisationLogo() {
  return authFetch<Organisation>('/organisation/logo', { method: 'DELETE' });
}

export function updateOrganisationMembreRole(userId: string, roleGlobal: 'ADMIN' | 'MEMBRE') {
  return authFetch<OrganisationMembre>(`/organisation/membres/${userId}/role`, {
    method: 'PATCH',
    body: { roleGlobal },
  });
}

export function removeOrganisationMembre(userId: string) {
  return authFetch<void>(`/organisation/membres/${userId}`, { method: 'DELETE' });
}

export function listOrganisationMembres() {
  return authFetch<OrganisationMembre[]>('/organisation/membres');
}

export interface OrganisationStats {
  membresCount: number;
  tachesCount: number;
}

export function getOrganisationStats() {
  return authFetch<OrganisationStats>('/organisation/stats');
}

export interface MembreStats {
  tachesAssignees: number;
  tachesValidees: number;
  tachesARevoir: number;
  heuresTravaillees: number;
  tauxDeclarationsATemps: number | null;
  blocagesRencontres: number;
  respectDeadlines: number | null;
}

export function getMembreStats(userId: string) {
  return authFetch<MembreStats>(`/organisation/membres/${userId}/stats`);
}

export interface BureauStats {
  totalTaches: number;
  progression: number | null;
  tachesTerminees: number;
  tachesEnCours: number;
  tachesBloquees: number;
  charge: number | null;
  respectDeadlines: number | null;
}

export function getBureauStats(bureauId: string) {
  return authFetch<BureauStats>(`/bureaux/${bureauId}/stats`);
}

export type StatutProjet = 'EN_COURS' | 'TERMINE' | 'ARCHIVE';

export interface Projet {
  id: string;
  nom: string;
  description: string | null;
  statut: StatutProjet;
  dateDebut: string | null;
  dateFin: string | null;
  bureauId: string | null;
  estOrganizer: boolean;
  createdAt: string;
}

export function listProjets(bureauId: string) {
  return authFetch<Projet[]>(`/bureaux/${bureauId}/projets`);
}

export interface EvenementRapport {
  type: 'TACHE_CREEE' | 'TACHE_DEMARREE' | 'TACHE_DECLAREE' | 'TACHE_VALIDEE' | 'BLOCAGE_OUVERT' | 'BLOCAGE_RESOLU';
  tacheId: string;
  titre: string;
  detail: string | null;
}

export interface RapportProjet {
  projet: {
    id: string;
    nom: string;
    description: string | null;
    statut: StatutProjet;
    dateDebut: string | null;
    dateFin: string | null;
    createdAt: string;
    bureau: { id: string; nom: string };
  };
  syntheseExecutive: {
    tachesTotal: number;
    tachesTerminees: number;
    tachesEnRetard: number;
    progression: number | null;
    tempsPrevuMinutes: number;
    tempsReelMinutes: number;
    ecartTempsMinutes: number;
  };
  comparatifPrevuReel: {
    dateDebutPrevue: string | null;
    dateFinPrevue: string | null;
    dateDebutReelle: string;
    dateFinReelle: string | null;
    dureePrevueJours: number | null;
    dureeReelleJours: number | null;
    ecartJours: number | null;
  };
  timeline: { date: string; evenements: EvenementRapport[] }[];
  evolutionEquipe: { date: string; tachesValidees: number; tachesDemarrees: number; blocagesActifs: number }[];
  contributionMembres: {
    user: { id: string; nom: string };
    tachesAssignees: number;
    tachesTerminees: number;
    tempsReelMinutes: number;
    blocagesRencontres: number;
  }[];
  blocages: {
    id: string;
    type: TypeBlocage;
    cause: string | null;
    tache: { id: string; titre: string };
    responsable: { id: string; nom: string } | null;
    dateDebut: string;
    dateFin: string | null;
    dureeJours: number;
  }[];
  analyseNarrative: string | null;
  bilan: { pointsPositifs: string[]; pointsAmelioration: string[]; recommandations: string[] } | null;
}

export function getProjetRapport(projetId: string) {
  return authFetch<RapportProjet>(`/projets/${projetId}/rapport`);
}

export type AddMembreResult =
  | { status: 'added'; membre: OrganisationMembre }
  | { status: 'invited'; invitation: { id: string; email: string; nom: string } };

export function addOrganisationMembre(data: { email: string; nom: string; poste?: string }) {
  return authFetch<AddMembreResult>('/organisation/membres', { method: 'POST', body: data });
}

export function updateMembrePoste(userId: string, poste: string | null) {
  return authFetch<OrganisationMembre>(`/organisation/membres/${userId}/poste`, {
    method: 'PATCH',
    body: { poste },
  });
}

export interface Invitation {
  id: string;
  email: string;
  nom: string;
  poste: string | null;
  createdAt: string;
}

export function listOrganisationInvitations() {
  return authFetch<Invitation[]>('/organisation/invitations');
}

export function cancelOrganisationInvitation(invitationId: string) {
  return authFetch<void>(`/organisation/invitations/${invitationId}`, { method: 'DELETE' });
}

export function updateProfile(data: {
  nom?: string;
  poste?: string;
  bio?: string;
  photoUrl?: string;
  hierarchie?: string;
  dateAnniversaire?: string | null;
  aime?: string;
  naimePas?: string;
}) {
  return authFetch<Me>('/users/me', { method: 'PATCH', body: data });
}

export function uploadProfilePhoto(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return authFetchForm<Me>('/users/me/photo', formData);
}

export function removeProfilePhoto() {
  return authFetch<Me>('/users/me/photo', { method: 'DELETE' });
}

export type NotificationType =
  | 'TACHE_ASSIGNEE'
  | 'TACHE_ACCEPTEE'
  | 'RAPPEL_DECLARATION'
  | 'RELANCE_RETARD'
  | 'VALIDATION_A_FAIRE'
  | 'TACHE_VALIDEE'
  | 'TACHE_A_REVOIR'
  | 'RESUME_QUOTIDIEN'
  | 'RAPPORT_HEBDOMADAIRE'
  | 'INVITATION_BUREAU'
  | 'MENTION';

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  lien: string | null;
  lue: boolean;
  createdAt: string;
}

export function listNotifications() {
  return authFetch<AppNotification[]>('/notifications');
}

export function getUnreadNotificationsCount() {
  return authFetch<{ count: number }>('/notifications/unread-count');
}

export function markNotificationAsRead(notificationId: string) {
  return authFetch<AppNotification>(`/notifications/${notificationId}/read`, { method: 'PATCH' });
}

export function markNotificationAsUnread(notificationId: string) {
  return authFetch<AppNotification>(`/notifications/${notificationId}/unread`, { method: 'PATCH' });
}

export function markAllNotificationsAsRead() {
  return authFetch<void>('/notifications/read-all', { method: 'PATCH' });
}

export type StatutTache = 'A_FAIRE' | 'ACCEPTEE' | 'EN_COURS' | 'DECLARE' | 'VALIDE' | 'A_REVOIR';
export type SanteTache = 'NORMAL' | 'A_SURVEILLER' | 'A_RISQUE' | 'BLOQUEE';
export type PrioriteTache = 'BASSE' | 'NORMALE' | 'HAUTE' | 'URGENTE';
export type TypeBlocage = 'TACHE' | 'PERSONNE' | 'DECISION' | 'CLIENT' | 'RESSOURCE' | 'EXTERNE';

export interface Tache {
  id: string;
  titre: string;
  description: string | null;
  statut: StatutTache;
  sante: SanteTache;
  priorite: PrioriteTache;
  dateEcheance: string | null;
  dureeEstimeeMinutes: number | null;
  assigneAId: string | null;
  assigneParId: string | null;
  dateDebut: string | null;
  dateDeclaration: string | null;
  dateValidation: string | null;
  valideParId: string | null;
  dateCible: string | null;
  createdAt: string;
  assigneA: { id: string; nom: string } | null;
  assignePar: { id: string; nom: string } | null;
  valideur: { id: string; nom: string } | null;
  conversation: { id: string; nom: string } | null;
}

export function assignerTache(tacheId: string, userId: string) {
  return authFetch<Tache>(`/taches/${tacheId}/assigner`, { method: 'PATCH', body: { userId } });
}

export function updateTache(
  tacheId: string,
  data: {
    titre?: string;
    description?: string;
    dateCible?: string | null;
    conversationId?: string | null;
    priorite?: PrioriteTache;
    dureeEstimeeMinutes?: number | null;
    dateEcheance?: string | null;
  },
) {
  return authFetch<Tache>(`/taches/${tacheId}`, { method: 'PATCH', body: data });
}

export function deleteTache(tacheId: string) {
  return authFetch<void>(`/taches/${tacheId}`, { method: 'DELETE' });
}

export function accepterTache(tacheId: string) {
  return authFetch<Tache>(`/taches/${tacheId}/accepter`, { method: 'POST' });
}

export function demarrerTache(tacheId: string) {
  return authFetch<Tache>(`/taches/${tacheId}/demarrer`, { method: 'POST' });
}

export function declarerTache(tacheId: string) {
  return authFetch<Tache>(`/taches/${tacheId}/declarer`, { method: 'POST' });
}

export function validerTache(tacheId: string, decision: 'ok' | 'litige') {
  return authFetch<Tache>(`/taches/${tacheId}/valider`, { method: 'POST', body: { decision } });
}

export function reouvrirTache(tacheId: string) {
  return authFetch<Tache>(`/taches/${tacheId}/reouvrir`, { method: 'POST' });
}

export function listBureauTaches(bureauId: string) {
  return authFetch<Tache[]>(`/bureaux/${bureauId}/taches`);
}

export interface TacheBlocage {
  id: string;
  type: TypeBlocage;
  cause: string | null;
  dateDebut: string;
  dateFin: string | null;
  responsable: { id: string; nom: string } | null;
  bloquantTache: { id: string; titre: string } | null;
}

export function listBlocages(tacheId: string) {
  return authFetch<TacheBlocage[]>(`/taches/${tacheId}/blocages`);
}

export function creerBlocage(tacheId: string, data: { type: TypeBlocage; cause?: string }) {
  return authFetch<TacheBlocage>(`/taches/${tacheId}/blocages`, { method: 'POST', body: data });
}

export function resoudreBlocage(tacheId: string, blocageId: string) {
  return authFetch<TacheBlocage>(`/taches/${tacheId}/blocages/${blocageId}/resoudre`, {
    method: 'PATCH',
  });
}

export interface ChronoStatut {
  dureeReelleMinutes: number;
  enCours: boolean;
}

export function getChronoStatut(tacheId: string) {
  return authFetch<ChronoStatut>(`/taches/${tacheId}/chrono`);
}

export interface Subject {
  id: string;
  projetId: string | null;
  nom: string;
  derniereGenerationTaches: string | null;
  createdAt: string;
}

export interface OrganizerDetail {
  id: string;
  bureauId: string | null;
  proprietaireId: string | null;
  nom: string;
  estOrganizer: boolean;
  createdAt: string;
  taches: Tache[];
  conversations: Subject[];
}

export function listOrganizerSubjects(projetId: string) {
  return authFetch<Subject[]>(`/organizers/${projetId}/subjects`);
}

export function createOrganizerSubject(projetId: string, nom: string) {
  return authFetch<Subject>(`/organizers/${projetId}/subjects`, { method: 'POST', body: { nom } });
}

export function renameOrganizerSubject(projetId: string, subjectId: string, nom: string) {
  return authFetch<Subject>(`/organizers/${projetId}/subjects/${subjectId}`, {
    method: 'PATCH',
    body: { nom },
  });
}

export function deleteOrganizerSubject(projetId: string, subjectId: string) {
  return authFetch<void>(`/organizers/${projetId}/subjects/${subjectId}`, { method: 'DELETE' });
}

/** Chaque bureau a exactement un Organizer, créé automatiquement à la création du bureau. */
export function getBureauOrganizer(bureauId: string) {
  return authFetch<OrganizerDetail>(`/bureaux/${bureauId}/organizer`);
}

/** Chaque utilisateur a un Organizer personnel, strictement privé, créé automatiquement à l'inscription. */
export function getMyOrganizer() {
  return authFetch<OrganizerDetail>('/me/organizer');
}

export interface MyTache extends Tache {
  projet: {
    id: string;
    nom: string;
    proprietaireId: string | null;
    bureau: { id: string; nom: string } | null;
  };
}

/** Toutes les tâches qui me concernent : assignées dans un bureau + Organizer personnel. */
export function getMyTasks() {
  return authFetch<MyTache[]>('/taches/mes-taches');
}

export function getOrganisationTasks() {
  return authFetch<MyTache[]>('/taches/organisation');
}

export type RaisonAlerte = 'A_RISQUE' | 'BLOQUEE' | 'ECHEANCE_PROCHE' | 'ECHEANCE_DEPASSEE';

export interface AlerteTache {
  id: string;
  titre: string;
  statut: StatutTache;
  sante: SanteTache;
  priorite: PrioriteTache;
  dateEcheance: string | null;
  assigneA: { id: string; nom: string; email: string } | null;
  blocages: { id: string; type: TypeBlocage; cause: string | null }[];
  projet: { id: string; nom: string; bureau: { id: string; nom: string } | null };
  raisons: RaisonAlerte[];
  lien: string;
  peutReassigner: boolean;
}

export interface Alertes {
  attention: AlerteTache[];
  okCount: number;
  totalCount: number;
}

/** Tâches à risque pour l'utilisateur : les siennes + celles des bureaux qu'il manage. */
export function getAlertes() {
  return authFetch<Alertes>('/taches/alertes');
}

export type StatutValidationDeclaration = 'EN_ATTENTE' | 'VALIDEE' | 'LITIGE';

export interface RituelTache {
  id: string;
  titre: string;
  description: string | null;
  statut: StatutTache;
  dateCible: string | null;
  projet: { id: string; nom: string; bureau: { id: string; nom: string } | null };
  cocheParMembre: boolean;
  cocheParAdmin: boolean;
}

export interface Journee {
  taches: RituelTache[];
  declare: boolean;
  statutValidation: StatutValidationDeclaration | null;
  pourcentage: number | null;
}

export interface Aujourdhui extends Journee {
  date: string;
}

export function getAujourdhui() {
  return authFetch<Aujourdhui>('/rituel/aujourdhui');
}

export function declarerRituel(tacheIds: string[]) {
  return authFetch<Aujourdhui>('/rituel/declarer', { method: 'POST', body: { tacheIds } });
}

export interface BureauRituelMembre extends Journee {
  user: { id: string; nom: string };
}

export function getBureauRituel(bureauId: string) {
  return authFetch<BureauRituelMembre[]>(`/bureaux/${bureauId}/rituel`);
}

export function validerRituelMembre(bureauId: string, userId: string, tacheIds: string[]) {
  return authFetch<BureauRituelMembre>(`/bureaux/${bureauId}/rituel/membres/${userId}/valider`, {
    method: 'POST',
    body: { tacheIds },
  });
}

export interface DailyBrief {
  date: string;
  termine: number;
  enCours: number;
  bloque: number;
  aRisque: { id: string; titre: string }[];
  blocagesActifs: {
    id: string;
    type: TypeBlocage;
    cause: string | null;
    tache: { id: string; titre: string };
    responsable: { id: string; nom: string } | null;
    depuis: string;
  }[];
  pourcentageRituel: number | null;
}

export function getDailyBrief(bureauId: string) {
  return authFetch<DailyBrief>(`/bureaux/${bureauId}/rituel/brief`);
}

export function listOrganizerMessages(projetId: string, subjectId: string) {
  return authFetch<ChatMessage[]>(`/organizers/${projetId}/subjects/${subjectId}/messages`);
}

export function sendOrganizerFile(
  projetId: string,
  subjectId: string,
  file: File,
  contenu?: string,
  replyToId?: string,
) {
  return sendFile(`/organizers/${projetId}/subjects/${subjectId}/messages/fichier`, file, contenu, replyToId);
}

export interface DirectConversation {
  id: string;
  otherUser: { id: string; nom: string; photoUrl: string | null };
  lastMessage: { contenu: string | null; fichierNom: string | null; auteurId: string; createdAt: string } | null;
  lastActivity: string;
  unread: boolean;
}

export function getUnreadDirectMessagesCount() {
  return authFetch<{ hasUnread: boolean }>('/me/direct-messages/unread');
}

export function listDirectConversations() {
  return authFetch<DirectConversation[]>('/me/direct-messages');
}

export function startDirectConversation(otherUserId: string) {
  return authFetch<{ id: string }>(`/me/direct-messages/${otherUserId}`, { method: 'POST' });
}

export function listDirectMessages(conversationId: string) {
  return authFetch<ChatMessage[]>(`/direct-messages/${conversationId}/messages`);
}

export function sendDirectFile(conversationId: string, file: File, contenu?: string, replyToId?: string) {
  return sendFile(`/direct-messages/${conversationId}/messages/fichier`, file, contenu, replyToId);
}

export function createTache(
  projetId: string,
  data: { titre: string; description?: string; priorite?: PrioriteTache; dateEcheance?: string },
) {
  return authFetch<Tache>(`/organizers/${projetId}/taches`, { method: 'POST', body: data });
}

export interface MyOrganisation extends OrganisationOption {
  roleGlobal: 'ADMIN' | 'MEMBRE';
  current: boolean;
}

/** All organisations the logged-in account belongs to (for the org switcher). */
export function getMyOrganisations() {
  return authFetch<MyOrganisation[]>('/auth/organisations');
}

/** Creates a new organisation owned by the current account and returns tokens scoped to it. */
export function createOrganisation(nom: string) {
  return authFetch<AuthTokens>('/auth/organisations', { method: 'POST', body: { nom } });
}

/** Switches session to another organisation the current account already belongs to. */
export function switchOrganisation(organisationId: string) {
  return authFetch<AuthTokens>('/auth/switch-organisation', {
    method: 'POST',
    body: { organisationId },
  });
}

export async function logout() {
  const tokens = getStoredTokens();
  if (tokens) {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    }).catch(() => undefined);
  }
  clearTokens();
}

export interface AdminOrganisation {
  id: string;
  nom: string;
  dateCreation: string;
  membresCount: number;
  proprietaire: { id: string; nom: string; email: string } | null;
}

export interface AdminMembre {
  userId: string;
  accountId: string;
  nom: string;
  email: string;
  organisationNom: string;
  roleGlobal: 'ADMIN' | 'MEMBRE';
  dateInscription: string;
  pays: string | null;
  banned: boolean;
  restricted: boolean;
}

export function adminListOrganisations() {
  return authFetch<AdminOrganisation[]>('/admin/organisations');
}

export function adminListMembers() {
  return authFetch<AdminMembre[]>('/admin/members');
}

export function adminPromote(userId: string) {
  return authFetch<void>(`/admin/users/${userId}/promote`, { method: 'PATCH' });
}

export function adminBan(accountId: string, password: string) {
  return authFetch<void>(`/admin/accounts/${accountId}/ban`, { method: 'PATCH', body: { password } });
}

export function adminUnban(accountId: string) {
  return authFetch<void>(`/admin/accounts/${accountId}/unban`, { method: 'PATCH' });
}

export function adminSetRestricted(accountId: string, restricted: boolean) {
  return authFetch<void>(`/admin/accounts/${accountId}/${restricted ? 'restrict' : 'unrestrict'}`, {
    method: 'PATCH',
  });
}

export function adminDeleteOrganisation(organisationId: string) {
  return authFetch<void>(`/admin/organisations/${organisationId}`, { method: 'DELETE' });
}

export function adminDeleteAccount(accountId: string) {
  return authFetch<void>(`/admin/accounts/${accountId}`, { method: 'DELETE' });
}

export { ApiError };
