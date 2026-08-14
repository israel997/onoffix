/** Résout le pays d'une IP publique via ip-api.com. Best-effort : ne lève jamais. */
export async function resolveCountryFromIp(ip: string | undefined): Promise<string | null> {
  if (!ip) return null;
  const clean = ip.replace('::ffff:', '');
  const isPrivate =
    clean === '127.0.0.1' ||
    clean === '::1' ||
    clean.startsWith('10.') ||
    clean.startsWith('192.168.') ||
    clean.startsWith('172.16.') ||
    clean.startsWith('172.17.') ||
    clean.startsWith('172.18.') ||
    clean.startsWith('172.19.') ||
    clean.startsWith('172.2') ||
    clean.startsWith('172.30.') ||
    clean.startsWith('172.31.');
  if (isPrivate) return null;

  try {
    const response = await fetch(`http://ip-api.com/json/${clean}?fields=status,country`);
    const data = (await response.json()) as { status?: string; country?: string };
    if (data.status === 'success' && data.country) return data.country;
  } catch {
    // Géolocalisation indisponible — ne bloque jamais l'inscription.
  }
  return null;
}
