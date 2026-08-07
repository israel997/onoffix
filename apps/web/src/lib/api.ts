const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

async function request<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.message ?? `Erreur ${res.status}`);
  }

  return res.json();
}

export function registerOrganisation(data: {
  organisationNom: string;
  nom: string;
  email: string;
  password: string;
}) {
  return request<AuthTokens>('/auth/register', data);
}

export function login(data: { email: string; password: string }) {
  return request<AuthTokens>('/auth/login', data);
}

const TOKENS_KEY = 'onoffix_tokens';

export function storeTokens(tokens: AuthTokens) {
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

export function getStoredTokens(): AuthTokens | null {
  const raw = localStorage.getItem(TOKENS_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearTokens() {
  localStorage.removeItem(TOKENS_KEY);
}
