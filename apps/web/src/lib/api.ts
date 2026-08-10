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

export function registerOrganisation(data: {
  organisationNom: string;
  nom: string;
  email: string;
  password: string;
}) {
  return publicRequest<AuthTokens>('/auth/register', data);
}

export function login(data: { email: string; password: string }) {
  return publicRequest<AuthTokens>('/auth/login', data);
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

function refreshOnce(refreshToken: string): Promise<AuthTokens> {
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

export function verifyEmail(token: string) {
  return publicRequest<void>('/auth/verify-email', { token });
}

export function resendVerification() {
  return authFetch<void>('/auth/resend-verification', { method: 'POST' });
}

export type CouleurBureau = 'BLUE' | 'PURPLE' | 'GREEN' | 'AMBER' | 'PINK' | 'SLATE';

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

export function addMembre(
  bureauId: string,
  data: { email: string; roleDansBureau: 'MANAGER' | 'COLLABORATEUR'; roleInterne?: string },
) {
  return authFetch<Membre>(`/bureaux/${bureauId}/membres`, { method: 'POST', body: data });
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
  bureaux: { roleDansBureau: 'MANAGER' | 'COLLABORATEUR'; bureau: { id: string; nom: string } }[];
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  auteurId: string;
  contenu: string | null;
  createdAt: string;
  fichierUrl: string | null;
  fichierNom: string | null;
  fichierType: string | null;
  fichierTailleOctets: number | null;
  auteur: { id: string; nom: string; photoUrl: string | null };
}

export function listMessages(bureauId: string) {
  return authFetch<ChatMessage[]>(`/bureaux/${bureauId}/messages`);
}

function sendFile(path: string, file: File, contenu?: string): Promise<ChatMessage> {
  const formData = new FormData();
  formData.append('file', file);
  if (contenu) formData.append('contenu', contenu);
  return authFetchForm<ChatMessage>(path, formData);
}

export function sendBureauFile(bureauId: string, file: File, contenu?: string) {
  return sendFile(`/bureaux/${bureauId}/messages/fichier`, file, contenu);
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

export function listOrganisationMembres() {
  return authFetch<OrganisationMembre[]>('/organisation/membres');
}

export function addOrganisationMembre(data: { email: string; nom: string; password: string }) {
  return authFetch<OrganisationMembre>('/organisation/membres', { method: 'POST', body: data });
}

export function updateProfile(data: { nom?: string; poste?: string; bio?: string; photoUrl?: string }) {
  return authFetch<Me>('/users/me', { method: 'PATCH', body: data });
}

export type NotificationType =
  | 'TACHE_ASSIGNEE'
  | 'RAPPEL_DECLARATION'
  | 'RELANCE_RETARD'
  | 'VALIDATION_A_FAIRE'
  | 'TACHE_VALIDEE'
  | 'TACHE_A_REVOIR'
  | 'RESUME_QUOTIDIEN'
  | 'RAPPORT_HEBDOMADAIRE';

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

export function markAllNotificationsAsRead() {
  return authFetch<void>('/notifications/read-all', { method: 'PATCH' });
}

export type StatutTache = 'A_FAIRE' | 'ACCEPTEE' | 'EN_COURS' | 'DECLARE' | 'VALIDE' | 'A_REVOIR';

export interface Tache {
  id: string;
  titre: string;
  description: string | null;
  statut: StatutTache;
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
}

export function assignerTache(tacheId: string, userId: string) {
  return authFetch<Tache>(`/taches/${tacheId}/assigner`, { method: 'PATCH', body: { userId } });
}

export function updateTache(
  tacheId: string,
  data: { titre?: string; description?: string; dateCible?: string | null },
) {
  return authFetch<Tache>(`/taches/${tacheId}`, { method: 'PATCH', body: data });
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

export interface OrganizerDetail {
  id: string;
  bureauId: string | null;
  proprietaireId: string | null;
  nom: string;
  estOrganizer: boolean;
  derniereGenerationTaches: string | null;
  createdAt: string;
  taches: Tache[];
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

export function listOrganizerMessages(projetId: string) {
  return authFetch<ChatMessage[]>(`/organizers/${projetId}/messages`);
}

export function sendOrganizerFile(projetId: string, file: File, contenu?: string) {
  return sendFile(`/organizers/${projetId}/messages/fichier`, file, contenu);
}

export function createTache(projetId: string, data: { titre: string; description?: string }) {
  return authFetch<Tache>(`/organizers/${projetId}/taches`, { method: 'POST', body: data });
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

export { ApiError };
