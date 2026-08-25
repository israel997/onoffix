'use client';

import { Loading } from '@/components/ui/loading';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { OfficeNav } from '@/components/offices/office-nav';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadProgress } from '@/components/ui/upload-progress';
import {
  deleteBureau,
  getBureau,
  removeBureauPhoto,
  resolveAssetUrl,
  setBureauAlerte,
  updateBureau,
  updateBureauParametres,
  uploadBureauPhoto,
  type BureauDetail,
  type CouleurBureau,
} from '@/lib/api';
import { BUREAU_COLOR_KEYS, BUREAU_COLORS } from '@/lib/bureau-colors';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/cn';

export default function OfficeSettingsPage() {
  const params = useParams<{ bureauId: string }>();
  const bureauId = params.bureauId;
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bureau, setBureau] = useState<BureauDetail | null>(null);
  const [nom, setNom] = useState('');
  const [heureDeclaration, setHeureDeclaration] = useState('18:30');
  const [fuseauHoraire, setFuseauHoraire] = useState('UTC');
  const [delaiRelanceMinutes, setDelaiRelanceMinutes] = useState(60);
  const [classementFiabiliteVisible, setClassementFiabiliteVisible] = useState(true);
  const [couleur, setCouleur] = useState<CouleurBureau>('BLUE');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [alerteJours, setAlerteJours] = useState(0);
  const [alerteHeures, setAlerteHeures] = useState(1);
  const [settingAlerte, setSettingAlerte] = useState(false);
  const [alerteError, setAlerteError] = useState<string | null>(null);

  async function load() {
    const data = await getBureau(bureauId);
    setBureau(data);
    setNom(data.nom);
    setHeureDeclaration(data.heureDeclaration);
    setFuseauHoraire(data.fuseauHoraire);
    setDelaiRelanceMinutes(data.delaiRelanceMinutes);
    setClassementFiabiliteVisible(data.classementFiabiliteVisible);
    setCouleur(data.couleur);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bureauId]);

  const isManager =
    user?.roleGlobal === 'ADMIN' ||
    bureau?.membres.some((m) => m.user.id === user?.id && m.roleDansBureau === 'MANAGER');

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await updateBureau(bureauId, { nom });
      await updateBureauParametres(bureauId, {
        heureDeclaration,
        fuseauHoraire,
        delaiRelanceMinutes,
        classementFiabiliteVisible,
        couleur,
      });
      await load();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setError(null);
    try {
      await uploadBureauPhoto(bureauId, file);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemovePhoto() {
    setUploadingPhoto(true);
    try {
      await removeBureauPhoto(bureauId);
      await load();
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSetAlerte(niveau: 'ORANGE' | 'ROUGE' | 'AUCUNE') {
    setAlerteError(null);
    setSettingAlerte(true);
    try {
      await setBureauAlerte(bureauId, { niveau, jours: alerteJours, heures: alerteHeures });
      await load();
    } catch (err) {
      setAlerteError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSettingAlerte(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${bureau?.nom}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteBureau(bureauId);
      router.push('/offices');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setDeleting(false);
    }
  }

  if (!bureau) return <Loading className="text-sm" />;

  if (!isManager) {
    return <p className="text-sm text-muted-foreground">You don&apos;t have access to this page.</p>;
  }

  const photoSrc = resolveAssetUrl(bureau.photoUrl);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Offices', href: '/offices' },
          { label: bureau.nom, href: `/offices/${bureauId}` },
          { label: 'Settings' },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Office settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">{bureau.nom}</p>
      </div>

      <OfficeNav bureauId={bureauId} showSettings />

      <Card>
        <CardTitle>Photo</CardTitle>
        <CardDescription className="mt-1">Shown on the offices list.</CardDescription>
        <div className="mt-4 flex items-center gap-4">
          {photoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoSrc} alt={bureau.nom} className="h-16 w-16 rounded-xl object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-surface-muted text-xs text-muted-foreground">
              No photo
            </div>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={uploadingPhoto}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadingPhoto ? 'Uploading…' : 'Upload photo'}
            </Button>
            {photoSrc && (
              <Button type="button" variant="ghost" size="sm" disabled={uploadingPhoto} onClick={handleRemovePhoto}>
                Remove
              </Button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">PNG, JPEG or WebP, up to 2MB.</p>
        <UploadProgress active={uploadingPhoto} />
      </Card>

      <Card>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <Label>
            Office name
            <Input required value={nom} onChange={(e) => setNom(e.target.value)} />
          </Label>

          <div className="grid gap-4 sm:grid-cols-2">
            <Label>
              Daily check-in time
              <Input
                type="time"
                required
                value={heureDeclaration}
                onChange={(e) => setHeureDeclaration(e.target.value)}
              />
            </Label>
            <Label>
              Timezone
              <Input value={fuseauHoraire} onChange={(e) => setFuseauHoraire(e.target.value)} placeholder="UTC" />
            </Label>
            <Label>
              Reminder delay (minutes)
              <Input
                type="number"
                min={0}
                required
                value={delaiRelanceMinutes}
                onChange={(e) => setDelaiRelanceMinutes(Number(e.target.value))}
              />
            </Label>
            <Label className="flex-row items-center gap-2 sm:flex sm:pt-6">
              <input
                type="checkbox"
                checked={classementFiabiliteVisible}
                onChange={(e) => setClassementFiabiliteVisible(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Show reliability leaderboard to the team
            </Label>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Color</p>
            <div className="flex gap-2">
              {BUREAU_COLOR_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCouleur(key)}
                  title={BUREAU_COLORS[key].label}
                  className={cn(
                    'h-8 w-8 rounded-full',
                    BUREAU_COLORS[key].dot,
                    couleur === key && 'ring-2 ring-offset-2 ring-brand-navy',
                  )}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-status-review">{error}</p>}
          {saved && <p className="text-sm text-status-validated">Settings saved.</p>}
          <Button type="submit" disabled={saving} className="w-fit">
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </Card>

      {user?.roleGlobal === 'ADMIN' && (
        <Card className="border-status-review/30">
          <CardTitle className="text-status-review">Alert status</CardTitle>
          <CardDescription className="mt-1">
            Flag this office as on alert or on fire — the card turns colored on the Offices page and a
            banner shows up when entering the office, for a set duration.
          </CardDescription>

          {bureau.niveauAlerte !== 'AUCUNE' && (
            <div
              className={`mt-4 rounded-lg px-3 py-2 text-sm font-medium text-white ${bureau.niveauAlerte === 'ROUGE' ? 'bg-status-review' : 'bg-status-declared'}`}
            >
              {bureau.niveauAlerte === 'ROUGE' ? 'This office is on fire' : 'This office is on alert!'}
              {bureau.alerteJusqua && ` — until ${new Date(bureau.alerteJusqua).toLocaleString()}`}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <Label>
              Days
              <Input
                type="number"
                min={0}
                value={alerteJours}
                onChange={(e) => setAlerteJours(Number(e.target.value))}
                className="w-24"
              />
            </Label>
            <Label>
              Hours
              <Input
                type="number"
                min={0}
                value={alerteHeures}
                onChange={(e) => setAlerteHeures(Number(e.target.value))}
                className="w-24"
              />
            </Label>
            <Button type="button" variant="warning" disabled={settingAlerte} onClick={() => handleSetAlerte('ORANGE')}>
              Set to Orange
            </Button>
            <Button type="button" variant="danger" disabled={settingAlerte} onClick={() => handleSetAlerte('ROUGE')}>
              Set to Red
            </Button>
            {bureau.niveauAlerte !== 'AUCUNE' && (
              <Button type="button" variant="ghost" disabled={settingAlerte} onClick={() => handleSetAlerte('AUCUNE')}>
                Clear alert
              </Button>
            )}
          </div>
          {alerteError && <p className="mt-2 text-sm text-status-review">{alerteError}</p>}
        </Card>
      )}

      {user?.roleGlobal === 'ADMIN' && (
        <Card className="border-status-review/30">
          <CardTitle className="text-status-review">Danger zone</CardTitle>
          <CardDescription className="mt-1">
            Deleting an office removes its projects, tasks and chat history permanently.
          </CardDescription>
          <Button variant="danger" className="mt-4 w-fit" disabled={deleting} onClick={handleDelete}>
            {deleting ? 'Deleting…' : 'Delete this office'}
          </Button>
        </Card>
      )}
    </div>
  );
}
