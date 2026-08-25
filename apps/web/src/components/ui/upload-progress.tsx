/** Barre indéterminée pendant un upload — l'API ne remonte pas de vraie progression. */
export function UploadProgress({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-surface-muted">
      <div className="animate-upload-progress h-full w-1/2 rounded-full bg-brand-blue" />
    </div>
  );
}
