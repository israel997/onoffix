import type { PrioriteTache, SanteTache, StatutTache } from '@/lib/api';

type Tone = 'neutral' | 'declared' | 'validated' | 'review' | 'brand';

export const STATUT_TONE: Record<StatutTache, Tone> = {
  A_FAIRE: 'neutral',
  ACCEPTEE: 'brand',
  EN_COURS: 'brand',
  DECLARE: 'declared',
  VALIDE: 'validated',
  A_REVOIR: 'review',
};

export const STATUT_LABEL: Record<StatutTache, string> = {
  A_FAIRE: 'To do',
  ACCEPTEE: 'Accepted',
  EN_COURS: 'In progress',
  DECLARE: 'Waiting for validation',
  VALIDE: 'Validated',
  A_REVOIR: 'Needs rework',
};

export const STATUT_PROGRESS: Record<StatutTache, number> = {
  A_FAIRE: 0,
  ACCEPTEE: 20,
  EN_COURS: 50,
  A_REVOIR: 60,
  DECLARE: 80,
  VALIDE: 100,
};

export const SANTE_TONE: Record<SanteTache, Tone> = {
  NORMAL: 'neutral',
  A_SURVEILLER: 'declared',
  A_RISQUE: 'review',
  BLOQUEE: 'review',
};

export const SANTE_LABEL: Record<SanteTache, string> = {
  NORMAL: 'Normal',
  A_SURVEILLER: 'Watch',
  A_RISQUE: 'At risk',
  BLOQUEE: 'Blocked',
};

export const PRIORITE_TONE: Record<PrioriteTache, Tone> = {
  BASSE: 'neutral',
  NORMALE: 'neutral',
  HAUTE: 'declared',
  URGENTE: 'review',
};
