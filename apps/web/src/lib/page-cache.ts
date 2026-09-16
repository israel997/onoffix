// Cache mémoire très simple, à l'échelle de l'onglet — pas de librairie de data-fetching.
// But : réafficher instantanément les données déjà vues en revenant sur une page (au lieu
// du skeleton à chaque fois), tout en laissant le useEffect existant de la page continuer à
// refetch en arrière-plan pour rafraîchir. Perdu au rechargement complet du navigateur,
// ce qui est très bien : on ne veut qu'un confort de navigation intra-session.
const cache = new Map<string, unknown>();

export function getCached<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function setCached<T>(key: string, value: T): T {
  cache.set(key, value);
  return value;
}
