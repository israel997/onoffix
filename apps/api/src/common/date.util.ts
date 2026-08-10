/** Minuit UTC du jour courant — correspond à la façon dont Prisma stocke les colonnes `@db.Date`. */
export function todayDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
