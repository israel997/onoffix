/** Minuit UTC du jour courant — correspond à la façon dont Prisma stocke les colonnes `@db.Date`. */
export function todayDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Dernier instant du jour reçu en "to" d'une plage from/to (ex. "2026-08-30"). Un
 * `new Date("2026-08-30")` vaut minuit UTC pile — utilisé tel quel comme borne "to",
 * une plage "aujourd'hui" ne couvrirait quasiment aucune heure de la journée.
 */
export function endOfDay(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}
