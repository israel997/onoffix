'use client';

import { useRef, useState, type FormEvent } from 'react';
import { IdBadgeIcon } from '@/components/icons/office-icons';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { removeProfilePhoto, resolveAssetUrl, updateProfile, uploadProfilePhoto } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [nom, setNom] = useState(user?.nom ?? '');
  const [poste, setPoste] = useState(user?.poste ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [hierarchie, setHierarchie] = useState(user?.hierarchie ?? '');
  const [dateAnniversaire, setDateAnniversaire] = useState(user?.dateAnniversaire?.slice(0, 10) ?? '');
  const [aime, setAime] = useState(user?.aime ?? '');
  const [naimePas, setNaimePas] = useState(user?.naimePas ?? '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      await uploadProfilePhoto(file);
      await refresh();
      toast('Profile photo updated');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }

  async function handleRemovePhoto() {
    setUploadingPhoto(true);
    try {
      await removeProfilePhoto();
      await refresh();
      toast('Profile photo removed');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await updateProfile({
        nom,
        poste,
        bio,
        hierarchie,
        dateAnniversaire: dateAnniversaire || null,
        aime,
        naimePas,
      });
      await refresh();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Profile' }]} />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your personal information.</p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IdBadgeIcon className="h-5 w-5 text-brand-blue" />
            Personal information
          </CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>

        <div className="mb-4 flex items-center gap-4">
          {resolveAssetUrl(user.photoUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveAssetUrl(user.photoUrl)!}
              alt={user.nom}
              className="h-16 w-16 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-navy text-lg font-semibold text-white">
              {initials(user.nom)}
            </span>
          )}
          <div className="flex flex-col gap-1.5">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handlePhotoChange}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={uploadingPhoto}
                onClick={() => photoInputRef.current?.click()}
              >
                {uploadingPhoto ? 'Uploading…' : 'Change photo'}
              </Button>
              {user.photoUrl && (
                <Button type="button" size="sm" variant="ghost" disabled={uploadingPhoto} onClick={handleRemovePhoto}>
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">PNG, JPEG or WebP, up to 2MB.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Label>
            Full name
            <Input required value={nom} onChange={(e) => setNom(e.target.value)} />
          </Label>
          <Label>
            Role / title
            <Input value={poste} onChange={(e) => setPoste(e.target.value)} placeholder="Developer, Designer…" />
          </Label>
          <Label>
            Short bio
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            />
          </Label>

          <div className="mt-2 border-t border-border pt-4">
            <p className="text-sm font-semibold text-foreground">Team profile</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Visible to everyone in your organisation, on your Members card.
            </p>
          </div>
          <Label>
            Hierarchy / reports to
            <Input
              value={hierarchie}
              onChange={(e) => setHierarchie(e.target.value)}
              placeholder="e.g. Reports to the CTO"
            />
          </Label>
          <Label>
            Birthday
            <Input type="date" value={dateAnniversaire} onChange={(e) => setDateAnniversaire(e.target.value)} />
          </Label>
          <Label>
            What I like
            <textarea
              value={aime}
              onChange={(e) => setAime(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            />
          </Label>
          <Label>
            What I don&apos;t like
            <textarea
              value={naimePas}
              onChange={(e) => setNaimePas(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            />
          </Label>

          {error && <p className="text-sm text-status-review">{error}</p>}
          {saved && <p className="text-sm text-status-validated">Profile updated.</p>}
          <Button type="submit" disabled={saving} className="w-fit">
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
