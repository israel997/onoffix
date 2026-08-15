'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { OfficeNav } from '@/components/offices/office-nav';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card, CardDescription } from '@/components/ui/card';
import { getBureau, listProjets, type BureauDetail, type Projet } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const STATUT_TONE: Record<Projet['statut'], 'neutral' | 'declared' | 'validated' | 'review' | 'brand'> = {
  EN_COURS: 'brand',
  TERMINE: 'validated',
  ARCHIVE: 'neutral',
};

const STATUT_LABEL: Record<Projet['statut'], string> = {
  EN_COURS: 'In progress',
  TERMINE: 'Done',
  ARCHIVE: 'Archived',
};

export default function ProjectsPage() {
  const params = useParams<{ bureauId: string }>();
  const bureauId = params.bureauId;
  const { user } = useAuth();

  const [projets, setProjets] = useState<Projet[] | null>(null);
  const [bureau, setBureau] = useState<BureauDetail | null>(null);

  useEffect(() => {
    async function load() {
      const [p, bur] = await Promise.all([listProjets(bureauId), getBureau(bureauId)]);
      setProjets(p);
      setBureau(bur);
    }
    load();
  }, [bureauId]);

  const isAdmin = user?.roleGlobal === 'ADMIN';
  const isManager =
    isAdmin || bureau?.membres.some((m) => m.user.id === user?.id && m.roleDansBureau === 'MANAGER') || false;

  if (!projets || !bureau) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Offices', href: '/offices' },
          { label: bureau.nom, href: `/offices/${bureauId}` },
          { label: 'Projects' },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Structured projects converted from the Organizer, with a full report for each.
        </p>
      </div>

      <OfficeNav bureauId={bureauId} showSettings={isManager} />

      {projets.length === 0 ? (
        <Card>
          <CardDescription>
            No project yet. Convert a plan from the Organizer to create one.
          </CardDescription>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {projets.map((projet) => (
            <Link key={projet.id} href={`/offices/${bureauId}/projects/${projet.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{projet.nom}</p>
                    {projet.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{projet.description}</p>
                    )}
                  </div>
                  <Badge tone={STATUT_TONE[projet.statut]}>{STATUT_LABEL[projet.statut]}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
