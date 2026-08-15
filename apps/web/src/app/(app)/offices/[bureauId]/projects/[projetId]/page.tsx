'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { OfficeNav } from '@/components/offices/office-nav';
import { ReportTimeline } from '@/components/projects/report-timeline';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { getProjetRapport, type RapportProjet } from '@/lib/api';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatMinutes(minutes: number) {
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.round(Math.abs(minutes) % 60);
  const sign = minutes < 0 ? '-' : '';
  if (h === 0) return `${sign}${m}m`;
  return `${sign}${h}h ${m}m`;
}

function formatDays(days: number | null) {
  if (days === null) return '—';
  return `${days} day${Math.abs(days) === 1 ? '' : 's'}`;
}

const BLOCAGE_TYPE_LABEL: Record<string, string> = {
  TACHE: 'Depends on task',
  PERSONNE: 'Waiting on someone',
  DECISION: 'Waiting on a decision',
  CLIENT: 'Waiting on client',
  RESSOURCE: 'Missing resource',
  EXTERNE: 'External blocker',
};

export default function ProjectReportPage() {
  const params = useParams<{ bureauId: string; projetId: string }>();
  const { bureauId, projetId } = params;

  const [rapport, setRapport] = useState<RapportProjet | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProjetRapport(projetId)
      .then(setRapport)
      .catch((err) => setError(err instanceof Error ? err.message : 'Something went wrong'));
  }, [projetId]);

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Offices', href: '/offices' },
            { label: 'Report' },
          ]}
        />
        <Card>
          <CardDescription>{error}</CardDescription>
        </Card>
      </div>
    );
  }

  if (!rapport) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const { projet, syntheseExecutive: s, comparatifPrevuReel: c } = rapport;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Offices', href: '/offices' },
          { label: projet.bureau.nom, href: `/offices/${bureauId}` },
          { label: 'Projects', href: `/offices/${bureauId}/projects` },
          { label: projet.nom },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold text-foreground">{projet.nom} — Report</h1>
        {projet.description && <p className="mt-1 text-sm text-muted-foreground">{projet.description}</p>}
      </div>

      <OfficeNav bureauId={bureauId} showSettings={false} />

      <Card>
        <CardTitle>Executive summary</CardTitle>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-lg font-bold text-foreground">
              {s.progression === null ? '—' : `${s.progression}%`}
            </p>
            <p className="text-xs text-muted-foreground">Progress</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">
              {s.tachesTerminees} / {s.tachesTotal}
            </p>
            <p className="text-xs text-muted-foreground">Tasks done</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{s.tachesEnRetard}</p>
            <p className="text-xs text-muted-foreground">Overdue tasks</p>
          </div>
          <div>
            <p className={`text-lg font-bold ${s.ecartTempsMinutes > 0 ? 'text-status-review' : 'text-status-validated'}`}>
              {s.ecartTempsMinutes > 0 ? '+' : ''}
              {formatMinutes(s.ecartTempsMinutes)}
            </p>
            <p className="text-xs text-muted-foreground">Time gap (actual vs estimated)</p>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>Planned vs actual</CardTitle>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium" />
                <th className="py-2 pr-4 font-medium">Planned</th>
                <th className="py-2 pr-4 font-medium">Actual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="py-2 pr-4 text-muted-foreground">Start</td>
                <td className="py-2 pr-4 text-foreground">{formatDate(c.dateDebutPrevue)}</td>
                <td className="py-2 pr-4 text-foreground">{formatDate(c.dateDebutReelle)}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-muted-foreground">End</td>
                <td className="py-2 pr-4 text-foreground">{formatDate(c.dateFinPrevue)}</td>
                <td className="py-2 pr-4 text-foreground">
                  {c.dateFinReelle ? formatDate(c.dateFinReelle) : 'In progress'}
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-muted-foreground">Duration</td>
                <td className="py-2 pr-4 text-foreground">{formatDays(c.dureePrevueJours)}</td>
                <td className="py-2 pr-4 text-foreground">{formatDays(c.dureeReelleJours)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {c.ecartJours !== null && (
          <p className={`mt-3 text-sm font-medium ${c.ecartJours > 0 ? 'text-status-review' : 'text-status-validated'}`}>
            {c.ecartJours > 0
              ? `Running ${formatDays(c.ecartJours)} longer than planned.`
              : c.ecartJours < 0
                ? `${formatDays(Math.abs(c.ecartJours))} ahead of schedule.`
                : 'Exactly on schedule.'}
          </p>
        )}
      </Card>

      <Card>
        <CardTitle>Timeline</CardTitle>
        <CardDescription>Replay the project day by day.</CardDescription>
        <div className="mt-4">
          <ReportTimeline rapport={rapport} bureauId={bureauId} />
        </div>
      </Card>

      <Card>
        <CardTitle>Contribution by member</CardTitle>
        {rapport.contributionMembres.length === 0 ? (
          <CardDescription className="mt-3">No task assigned yet.</CardDescription>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Member</th>
                  <th className="py-2 pr-4 font-medium">Assigned</th>
                  <th className="py-2 pr-4 font-medium">Done</th>
                  <th className="py-2 pr-4 font-medium">Time logged</th>
                  <th className="py-2 pr-4 font-medium">Blockers hit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rapport.contributionMembres.map((m) => (
                  <tr key={m.user.id}>
                    <td className="py-2 pr-4 font-medium text-foreground">{m.user.nom}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{m.tachesAssignees}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{m.tachesTerminees}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{formatMinutes(m.tempsReelMinutes)}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{m.blocagesRencontres}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Blockers & dependencies</CardTitle>
        {rapport.blocages.length === 0 ? (
          <CardDescription className="mt-3">No blocker was recorded on this project.</CardDescription>
        ) : (
          <div className="mt-3 flex flex-col divide-y divide-border">
            {rapport.blocages.map((b) => (
              <div key={b.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{b.tache.titre}</p>
                  <p className="text-xs text-muted-foreground">
                    {BLOCAGE_TYPE_LABEL[b.type] ?? b.type}
                    {b.cause && ` — ${b.cause}`}
                    {b.responsable && ` · ${b.responsable.nom}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={b.dateFin ? 'validated' : 'review'}>{b.dateFin ? 'Resolved' : 'Active'}</Badge>
                  <Badge tone="neutral">{formatDays(b.dureeJours)}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>AI analysis</CardTitle>
        {rapport.analyseNarrative ? (
          <div className="mt-3 flex flex-col gap-4">
            <p className="text-sm text-foreground">{rapport.analyseNarrative}</p>
            {rapport.bilan && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-status-validated">
                    What went well
                  </p>
                  <ul className="mt-2 flex flex-col gap-1 text-sm text-foreground">
                    {rapport.bilan.pointsPositifs.map((p, i) => (
                      <li key={i}>• {p}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-status-declared">
                    To improve
                  </p>
                  <ul className="mt-2 flex flex-col gap-1 text-sm text-foreground">
                    {rapport.bilan.pointsAmelioration.map((p, i) => (
                      <li key={i}>• {p}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
                    Recommendations
                  </p>
                  <ul className="mt-2 flex flex-col gap-1 text-sm text-foreground">
                    {rapport.bilan.recommandations.map((p, i) => (
                      <li key={i}>• {p}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : (
          <CardDescription className="mt-3">AI analysis is unavailable right now.</CardDescription>
        )}
      </Card>
    </div>
  );
}
