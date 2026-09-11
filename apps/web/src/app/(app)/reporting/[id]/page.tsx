'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LockIcon, LockOpenIcon } from '@/components/icons/office-icons';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageSkeleton } from '@/components/ui/skeleton';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  archiveRapport,
  deleteRapport,
  deleteRapportImage,
  downloadRapportPdf,
  getRapport,
  listOrganisationMembres,
  setRapportVisibilite,
  updateRapport,
  uploadRapportImage,
  type OrganisationMembre,
  type RapportDetail,
  type RapportImageItem,
  type RapportJourDetail,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useConfirm } from '@/lib/confirm-context';
import { useToast } from '@/lib/toast-context';

const JOURS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function ImageGallery({
  images,
  editing,
  onUpload,
  onRemove,
  uploading,
}: {
  images: RapportImageItem[];
  editing: boolean;
  onUpload: (file: File) => void;
  onRemove: (imageId: string) => void;
  uploading: boolean;
}) {
  if (images.length === 0 && !editing) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {images.map((img) => (
        <div key={img.id} className="group relative">
          <img src={img.url} alt={img.nom} className="h-20 w-20 rounded-lg object-cover" />
          {editing && (
            <button
              type="button"
              onClick={() => onRemove(img.id)}
              aria-label="Remove image"
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-status-review text-xs text-white shadow"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      {editing && (
        <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-brand-blue/50">
          {uploading ? '…' : '+ Image'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = '';
            }}
          />
        </label>
      )}
    </div>
  );
}

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const rapportId = params.id;
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const confirmDialog = useConfirm();

  const [rapport, setRapport] = useState<RapportDetail | null>(null);
  const [members, setMembers] = useState<OrganisationMembre[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const [nom, setNom] = useState('');
  const [contenu, setContenu] = useState('');
  const [jours, setJours] = useState<Record<number, Partial<RapportJourDetail>>>({});
  const [mentionedIds, setMentionedIds] = useState<Set<string>>(new Set());

  async function load() {
    const data = await getRapport(rapportId);
    setRapport(data);
    setNom(data.nom);
    setContenu(data.contenu ?? '');
    setJours(Object.fromEntries(data.jours.map((j) => [j.jour, j])));
    setMentionedIds(new Set(data.mentions.map((m) => m.user.id)));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    listOrganisationMembres().then(setMembers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rapportId]);

  if (!rapport || !user) return <PageSkeleton />;

  const isAdmin = user.roleGlobal === 'ADMIN';
  const canEdit = isAdmin || rapport.createur.id === user.id;

  function updateJour(jour: number, patch: Partial<RapportJourDetail>) {
    setJours((prev) => ({ ...prev, [jour]: { ...prev[jour], ...patch } }));
  }

  async function handleSave() {
    setBusy(true);
    try {
      await updateRapport(rapportId, {
        nom,
        contenu: rapport!.type === 'GENERAL' ? contenu : undefined,
        jours:
          rapport!.type === 'WEEKLY'
            ? Array.from({ length: 7 }, (_, jour) => ({
                jour,
                contenu: jours[jour]?.contenu ?? '',
                bonsPoints: jours[jour]?.bonsPoints ?? '',
                pointsNegatifs: jours[jour]?.pointsNegatifs ?? '',
                objectifs: jours[jour]?.objectifs ?? '',
              }))
            : undefined,
        mentionedUserIds: [...mentionedIds],
      });
      await load();
      setEditing(false);
      toast('Report saved');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    const ok = await confirmDialog({
      title: `Delete "${rapport!.nom}"?`,
      description: 'This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteRapport(rapportId);
      toast('Report deleted');
      router.push('/reporting');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    }
  }

  async function handleArchive() {
    try {
      await archiveRapport(rapportId, !rapport!.estArchive);
      await load();
      toast(rapport!.estArchive ? 'Report unarchived' : 'Report archived');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    }
  }

  async function handleToggleVisibilite() {
    try {
      await setRapportVisibilite(rapportId, !rapport!.estPrive);
      await load();
      toast(rapport!.estPrive ? 'Report made public' : 'Report made private');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    }
  }

  async function handleExportPdf() {
    try {
      await downloadRapportPdf(rapportId, `${rapport!.nom}.pdf`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    }
  }

  async function handleUploadGeneral(file: File) {
    setUploadingKey('general');
    try {
      await uploadRapportImage(rapportId, file);
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    } finally {
      setUploadingKey(null);
    }
  }

  async function handleUploadJour(jourId: string, file: File) {
    setUploadingKey(jourId);
    try {
      await uploadRapportImage(rapportId, file, jourId);
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    } finally {
      setUploadingKey(null);
    }
  }

  async function handleRemoveImage(imageId: string) {
    try {
      await deleteRapportImage(rapportId, imageId);
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    }
  }

  const mentionedUsers = members?.filter((m) => mentionedIds.has(m.id)) ?? [];
  const mentionOptions = (members ?? []).filter((m) => !mentionedIds.has(m.id));

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Reporting', href: '/reporting' },
          { label: rapport.nom },
        ]}
      />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {editing ? (
              <Input value={nom} onChange={(e) => setNom(e.target.value)} className="max-w-md" />
            ) : (
              <h1 className="text-2xl font-bold text-foreground">{rapport.nom}</h1>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              {rapport.createur.nom} · {new Date(rapport.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge tone={rapport.type === 'WEEKLY' ? 'brand' : 'neutral'}>
              {rapport.type === 'WEEKLY' ? 'Weekly' : 'General'}
            </Badge>
            {isAdmin && (
              <button
                type="button"
                onClick={handleToggleVisibilite}
                aria-label={rapport.estPrive ? 'Make public' : 'Make private'}
                title={rapport.estPrive ? 'Private — click to make public' : 'Public — click to make private'}
                className={`rounded p-1.5 ${rapport.estPrive ? 'text-status-review' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {rapport.estPrive ? <LockIcon className="h-4 w-4" /> : <LockOpenIcon className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          {canEdit && !editing && (
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
          {editing && (
            <>
              <Button size="sm" disabled={busy} onClick={handleSave}>
                {busy ? 'Saving…' : 'Save'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setEditing(false);
                  load();
                }}
              >
                Cancel
              </Button>
            </>
          )}
          <Button size="sm" variant="secondary" onClick={handleExportPdf}>
            Export PDF
          </Button>
          {canEdit && (
            <Button size="sm" variant="secondary" onClick={handleArchive}>
              {rapport.estArchive ? 'Unarchive' : 'Archive'}
            </Button>
          )}
          {canEdit && (
            <Button size="sm" variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          )}
        </div>
      </Card>

      {rapport.type === 'GENERAL' ? (
        <Card>
          <CardTitle>Content</CardTitle>
          {editing ? (
            <textarea
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
              rows={10}
              className="mt-3 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-blue"
              placeholder="Write the report…"
            />
          ) : (
            <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">
              {rapport.contenu || <span className="text-muted-foreground">No content yet.</span>}
            </p>
          )}
          <ImageGallery
            images={rapport.images}
            editing={editing}
            uploading={uploadingKey === 'general'}
            onUpload={handleUploadGeneral}
            onRemove={handleRemoveImage}
          />
        </Card>
      ) : (
        rapport.jours.map((j) => {
          const draft = jours[j.jour] ?? j;
          const isEmpty = !j.contenu && !j.bonsPoints && !j.pointsNegatifs && !j.objectifs && j.images.length === 0;
          if (!editing && isEmpty) return null;
          return (
            <Card key={j.jour}>
              <CardTitle>{JOURS[j.jour]}</CardTitle>
              <div className="mt-3 flex flex-col gap-3">
                <Label>
                  Notes
                  {editing ? (
                    <textarea
                      value={draft.contenu ?? ''}
                      onChange={(e) => updateJour(j.jour, { contenu: e.target.value })}
                      rows={3}
                      className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-blue"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap text-sm text-foreground">{j.contenu || '—'}</p>
                  )}
                </Label>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Label>
                    Good points
                    {editing ? (
                      <textarea
                        value={draft.bonsPoints ?? ''}
                        onChange={(e) => updateJour(j.jour, { bonsPoints: e.target.value })}
                        rows={2}
                        className="w-full resize-y rounded-lg border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand-blue"
                      />
                    ) : (
                      <p className="text-xs text-foreground">{j.bonsPoints || '—'}</p>
                    )}
                  </Label>
                  <Label>
                    Negative points
                    {editing ? (
                      <textarea
                        value={draft.pointsNegatifs ?? ''}
                        onChange={(e) => updateJour(j.jour, { pointsNegatifs: e.target.value })}
                        rows={2}
                        className="w-full resize-y rounded-lg border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand-blue"
                      />
                    ) : (
                      <p className="text-xs text-foreground">{j.pointsNegatifs || '—'}</p>
                    )}
                  </Label>
                  <Label>
                    Objectives
                    {editing ? (
                      <textarea
                        value={draft.objectifs ?? ''}
                        onChange={(e) => updateJour(j.jour, { objectifs: e.target.value })}
                        rows={2}
                        className="w-full resize-y rounded-lg border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand-blue"
                      />
                    ) : (
                      <p className="text-xs text-foreground">{j.objectifs || '—'}</p>
                    )}
                  </Label>
                </div>
                <ImageGallery
                  images={j.images}
                  editing={editing}
                  uploading={uploadingKey === j.id}
                  onUpload={(file) => handleUploadJour(j.id, file)}
                  onRemove={handleRemoveImage}
                />
              </div>
            </Card>
          );
        })
      )}

      <Card>
        <CardTitle>Mentioned</CardTitle>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {mentionedUsers.length === 0 && !editing && (
            <p className="text-sm text-muted-foreground">No one mentioned.</p>
          )}
          {mentionedUsers.map((m) => (
            <span
              key={m.id}
              className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-xs text-foreground"
            >
              {m.nom}
              {editing && (
                <button
                  type="button"
                  onClick={() =>
                    setMentionedIds((prev) => {
                      const next = new Set(prev);
                      next.delete(m.id);
                      return next;
                    })
                  }
                  aria-label={`Remove ${m.nom}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </span>
          ))}
        </div>
        {editing && (
          <div className="mt-2">
            <SearchableSelect
              placeholder="Mention someone…"
              options={mentionOptions.map((m) => ({ value: m.id, label: m.nom }))}
              onSelect={(id) => setMentionedIds((prev) => new Set(prev).add(id))}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
