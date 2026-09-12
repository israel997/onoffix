'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LockIcon, LockOpenIcon } from '@/components/icons/office-icons';
import { BlockEditor } from '@/components/reporting/block-editor';
import { BulletListEditor } from '@/components/reporting/bullet-list-editor';
import {
  parseBlocks,
  parseList,
  stringifyBlocks,
  stringifyList,
  type ContentBlock,
} from '@/components/reporting/report-content';
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
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useConfirm } from '@/lib/confirm-context';
import { useToast } from '@/lib/toast-context';

const JOURS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const NOTES_MAX_LENGTH = 2000;

interface JourDraft {
  contenu: string;
  bonsPoints: string[];
  pointsNegatifs: string[];
  objectifs: string[];
}

function ImageGallery({
  images,
  editing,
  onUpload,
  onRemove,
  progress,
}: {
  images: RapportImageItem[];
  editing: boolean;
  onUpload: (file: File) => void;
  onRemove: (imageId: string) => void;
  /** null = pas d'upload en cours ; 0-100 = progression. */
  progress: number | null;
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
        <label className="relative flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-brand-blue/50">
          {progress === null ? (
            '+ Image'
          ) : (
            <>
              <span className="text-[11px] font-semibold text-brand-blue">{progress}%</span>
              <div className="h-1 w-12 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-brand-blue transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={progress !== null}
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
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const [nom, setNom] = useState('');
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [jours, setJours] = useState<Record<number, JourDraft>>({});
  const [mentionedIds, setMentionedIds] = useState<Set<string>>(new Set());

  async function load() {
    const data = await getRapport(rapportId);
    setRapport(data);
    setNom(data.nom);
    setBlocks(parseBlocks(data.contenu));
    setJours(
      Object.fromEntries(
        data.jours.map((j) => [
          j.jour,
          {
            contenu: j.contenu ?? '',
            bonsPoints: parseList(j.bonsPoints),
            pointsNegatifs: parseList(j.pointsNegatifs),
            objectifs: parseList(j.objectifs),
          },
        ]),
      ),
    );
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

  const EMPTY_JOUR: JourDraft = { contenu: '', bonsPoints: [], pointsNegatifs: [], objectifs: [] };

  function updateJour(jour: number, patch: Partial<JourDraft>) {
    setJours((prev) => {
      const current = prev[jour] ?? EMPTY_JOUR;
      return { ...prev, [jour]: { ...current, ...patch } };
    });
  }

  async function handleSave() {
    setBusy(true);
    try {
      await updateRapport(rapportId, {
        nom,
        contenu: rapport!.type === 'GENERAL' ? stringifyBlocks(blocks) : undefined,
        jours:
          rapport!.type === 'WEEKLY'
            ? Array.from({ length: 7 }, (_, jour) => {
                const d = jours[jour];
                return {
                  jour,
                  contenu: d?.contenu ?? '',
                  bonsPoints: stringifyList(d?.bonsPoints ?? []),
                  pointsNegatifs: stringifyList(d?.pointsNegatifs ?? []),
                  objectifs: stringifyList(d?.objectifs ?? []),
                };
              })
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
      toast(err instanceof Error ? err.message : 'PDF export failed', 'error');
    }
  }

  async function handleUpload(key: string, file: File, jourId?: string) {
    setUploadProgress((prev) => ({ ...prev, [key]: 0 }));
    try {
      await uploadRapportImage(rapportId, file, jourId, (percent) =>
        setUploadProgress((prev) => ({ ...prev, [key]: percent })),
      );
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Image upload failed', 'error');
    } finally {
      setUploadProgress((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
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
            <Button size="sm" variant="primary" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
          {editing && (
            <>
              <Button size="sm" variant="primary" disabled={busy} onClick={handleSave}>
                {busy ? 'Saving…' : 'Save'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
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
            <Button size="sm" variant="warning" onClick={handleArchive}>
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
          <div className="mt-3">
            <BlockEditor blocks={blocks} onChange={setBlocks} editing={editing} />
          </div>
          <ImageGallery
            images={rapport.images}
            editing={editing}
            progress={uploadProgress.general ?? null}
            onUpload={(file) => handleUpload('general', file)}
            onRemove={handleRemoveImage}
          />
        </Card>
      ) : (
        rapport.jours.map((j) => {
          const draft = jours[j.jour];
          const isEmpty =
            !j.contenu &&
            !j.bonsPoints &&
            !j.pointsNegatifs &&
            !j.objectifs &&
            j.images.length === 0;
          if (!editing && isEmpty) return null;
          return (
            <Card key={j.jour}>
              <CardTitle>{JOURS[j.jour]}</CardTitle>
              <div className="mt-3 flex flex-col gap-3">
                <Label>
                  Notes
                  {editing ? (
                    <textarea
                      value={draft?.contenu ?? ''}
                      onChange={(e) => updateJour(j.jour, { contenu: e.target.value.slice(0, NOTES_MAX_LENGTH) })}
                      rows={3}
                      maxLength={NOTES_MAX_LENGTH}
                      className="max-h-48 w-full resize-y overflow-y-auto rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-blue"
                    />
                  ) : (
                    <p className="max-h-48 overflow-y-auto whitespace-pre-wrap text-sm text-foreground">
                      {j.contenu || '—'}
                    </p>
                  )}
                </Label>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Label>
                    Good points
                    <BulletListEditor
                      items={draft?.bonsPoints ?? parseList(j.bonsPoints)}
                      onChange={(items) => updateJour(j.jour, { bonsPoints: items })}
                      editing={editing}
                      tone="positive"
                      placeholder="A good point…"
                    />
                  </Label>
                  <Label>
                    Negative points
                    <BulletListEditor
                      items={draft?.pointsNegatifs ?? parseList(j.pointsNegatifs)}
                      onChange={(items) => updateJour(j.jour, { pointsNegatifs: items })}
                      editing={editing}
                      tone="negative"
                      placeholder="A negative point…"
                    />
                  </Label>
                  <Label>
                    Objectives
                    <BulletListEditor
                      items={draft?.objectifs ?? parseList(j.objectifs)}
                      onChange={(items) => updateJour(j.jour, { objectifs: items })}
                      editing={editing}
                      tone="neutral"
                      placeholder="An objective…"
                    />
                  </Label>
                </div>
                <ImageGallery
                  images={j.images}
                  editing={editing}
                  progress={uploadProgress[j.id] ?? null}
                  onUpload={(file) => handleUpload(j.id, file, j.id)}
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
