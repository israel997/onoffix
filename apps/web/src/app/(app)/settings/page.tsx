'use client';

import { PageSkeleton } from '@/components/ui/skeleton';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MasterKeyIcon } from '@/components/icons/office-icons';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadProgress } from '@/components/ui/upload-progress';
import {
  clearTokens,
  deleteOrganisation,
  getOrganisation,
  removeOrganisationLogo,
  resolveAssetUrl,
  updateOrganisation,
  uploadOrganisationLogo,
  type Organisation,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function OrganisationSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [nom, setNom] = useState('');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    const data = await getOrganisation();
    setOrganisation(data);
    setNom(data.nom);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const isAdmin = user?.roleGlobal === 'ADMIN';
  const isOwner = !!user && !!organisation && user.id === organisation.proprietaireId;

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const updated = await updateOrganisation({ nom });
      setOrganisation(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setError(null);
    try {
      const updated = await uploadOrganisationLogo(file);
      setOrganisation(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemoveLogo() {
    setUploadingLogo(true);
    try {
      const updated = await removeOrganisationLogo();
      setOrganisation(updated);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleDelete() {
    if (!organisation) return;
    if (
      !confirm(
        `Delete "${organisation.nom}"? This permanently removes every office, project, task and account in it. This cannot be undone.`,
      )
    )
      return;
    setDeleting(true);
    try {
      await deleteOrganisation();
      clearTokens();
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setDeleting(false);
    }
  }

  if (!organisation) return <PageSkeleton />;

  if (!isAdmin) {
    return <p className="text-sm text-muted-foreground">You don&apos;t have access to this page.</p>;
  }

  const logoSrc = resolveAssetUrl(organisation.logoUrl);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Organisation settings' }]} />
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-bold text-foreground">
          <MasterKeyIcon className="h-6 w-6 text-brand-blue" />
          Organisation settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{organisation.nom}</p>
      </div>

      <Card>
        <CardTitle>Logo</CardTitle>
        <CardDescription className="mt-1">Shown across the app and on the sidebar.</CardDescription>
        <div className="mt-4 flex items-center gap-4">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} alt={organisation.nom} className="h-16 w-16 rounded-xl object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-surface-muted text-xs text-muted-foreground">
              No logo
            </div>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={uploadingLogo}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadingLogo ? 'Uploading…' : 'Upload logo'}
            </Button>
            {logoSrc && (
              <Button type="button" variant="ghost" size="sm" disabled={uploadingLogo} onClick={handleRemoveLogo}>
                Remove
              </Button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleLogoChange}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">PNG, JPEG or WebP, up to 2MB.</p>
        <UploadProgress active={uploadingLogo} />
      </Card>

      <Card>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <Label>
            Organisation name
            <Input required value={nom} onChange={(e) => setNom(e.target.value)} />
          </Label>

          {error && <p className="text-sm text-status-review">{error}</p>}
          {saved && <p className="text-sm text-status-validated">Settings saved.</p>}
          <Button type="submit" disabled={saving} className="w-fit">
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </Card>

      {isOwner && (
        <Card className="border-status-review/30">
          <CardTitle className="text-status-review">Danger zone</CardTitle>
          <CardDescription className="mt-1">
            Deleting the organisation removes every office, project, task and account permanently.
          </CardDescription>
          <Button variant="danger" className="mt-4 w-fit" disabled={deleting} onClick={handleDelete}>
            {deleting ? 'Deleting…' : 'Delete this organisation'}
          </Button>
        </Card>
      )}
    </div>
  );
}
