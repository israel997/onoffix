const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/** Prefixes a relative path (e.g. a stored photoUrl) with the API origin. */
export function resolveAssetUrl(path: string | null): string | null {
  if (!path) return null;
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
  organisation: { id: string; nom: string };
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

/** Authenticated request, attaching the stored access token. Throws on 401 so callers can log the user out. */
export async function authFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const tokens = getStoredTokens();
  if (!tokens) throw new ApiError('Non authentifié', 401);

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.accessToken}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);
  if (res.status === 204) return undefined as T;
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

export async function uploadBureauPhoto(bureauId: string, file: File) {
  const tokens = getStoredTokens();
  if (!tokens) throw new ApiError('Non authentifié', 401);

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/bureaux/${bureauId}/photo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
    body: formData,
  });
  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);
  return res.json() as Promise<Bureau>;
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

async function sendFile(path: string, file: File, contenu?: string): Promise<ChatMessage> {
  const tokens = getStoredTokens();
  if (!tokens) throw new ApiError('Non authentifié', 401);

  const formData = new FormData();
  formData.append('file', file);
  if (contenu) formData.append('contenu', contenu);

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
    body: formData,
  });
  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);
  return res.json();
}

export function sendBureauFile(bureauId: string, file: File, contenu?: string) {
  return sendFile(`/bureaux/${bureauId}/messages/fichier`, file, contenu);
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

export type StatutTache = 'A_FAIRE' | 'EN_COURS' | 'DECLARE' | 'VALIDE' | 'A_REVOIR';

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
  createdAt: string;
  assigneA: { id: string; nom: string } | null;
  assignePar: { id: string; nom: string } | null;
  valideur: { id: string; nom: string } | null;
}

export function assignerTache(tacheId: string, userId: string) {
  return authFetch<Tache>(`/taches/${tacheId}/assigner`, { method: 'PATCH', body: { userId } });
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

export interface Organizer {
  id: string;
  nom: string;
  createdAt: string;
  derniereGenerationTaches: string | null;
  _count: { membres: number; taches: number };
}

export interface OrganizerMembre {
  user: { id: string; nom: string; email: string; photoUrl: string | null };
}

export interface OrganizerDetail {
  id: string;
  bureauId: string;
  nom: string;
  estOrganizer: boolean;
  derniereGenerationTaches: string | null;
  createdAt: string;
  membres: OrganizerMembre[];
  taches: Tache[];
}

export function listOrganizers(bureauId: string) {
  return authFetch<Organizer[]>(`/bureaux/${bureauId}/organizers`);
}

export function createOrganizer(bureauId: string, data: { nom: string }) {
  return authFetch<{ id: string }>(`/bureaux/${bureauId}/organizers`, { method: 'POST', body: data });
}

export function getOrganizer(projetId: string) {
  return authFetch<OrganizerDetail>(`/organizers/${projetId}`);
}

export function listOrganizerMessages(projetId: string) {
  return authFetch<ChatMessage[]>(`/organizers/${projetId}/messages`);
}

export function sendOrganizerFile(projetId: string, file: File, contenu?: string) {
  return sendFile(`/organizers/${projetId}/messages/fichier`, file, contenu);
}

export function addOrganizerMembre(projetId: string, email: string) {
  return authFetch<OrganizerMembre['user']>(`/organizers/${projetId}/membres`, {
    method: 'POST',
    body: { email },
  });
}

export function removeOrganizerMembre(projetId: string, userId: string) {
  return authFetch<void>(`/organizers/${projetId}/membres/${userId}`, { method: 'DELETE' });
}

export function deleteOrganizer(projetId: string) {
  return authFetch<void>(`/organizers/${projetId}`, { method: 'DELETE' });
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
