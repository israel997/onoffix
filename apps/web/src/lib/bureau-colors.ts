import type { CouleurBureau } from './api';

export const BUREAU_COLORS: Record<
  CouleurBureau,
  { label: string; bg: string; text: string; dot: string; bubble: string; bubbleDark: string }
> = {
  BLUE: { label: 'Blue', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', bubble: 'bg-blue-600', bubbleDark: 'bg-blue-700' },
  PURPLE: { label: 'Purple', bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500', bubble: 'bg-purple-600', bubbleDark: 'bg-purple-700' },
  GREEN: { label: 'Green', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', bubble: 'bg-emerald-600', bubbleDark: 'bg-emerald-700' },
  AMBER: { label: 'Amber', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', bubble: 'bg-amber-600', bubbleDark: 'bg-amber-700' },
  PINK: { label: 'Pink', bg: 'bg-pink-100', text: 'text-pink-700', dot: 'bg-pink-500', bubble: 'bg-pink-600', bubbleDark: 'bg-pink-700' },
  SLATE: { label: 'Slate', bg: 'bg-slate-200', text: 'text-slate-700', dot: 'bg-slate-500', bubble: 'bg-slate-600', bubbleDark: 'bg-slate-700' },
  RED: { label: 'Red', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', bubble: 'bg-red-600', bubbleDark: 'bg-red-700' },
  ORANGE: { label: 'Orange', bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500', bubble: 'bg-orange-600', bubbleDark: 'bg-orange-700' },
  TEAL: { label: 'Teal', bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500', bubble: 'bg-teal-600', bubbleDark: 'bg-teal-700' },
  CYAN: { label: 'Cyan', bg: 'bg-cyan-100', text: 'text-cyan-700', dot: 'bg-cyan-500', bubble: 'bg-cyan-600', bubbleDark: 'bg-cyan-700' },
  INDIGO: { label: 'Indigo', bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500', bubble: 'bg-indigo-600', bubbleDark: 'bg-indigo-700' },
  ROSE: { label: 'Rose', bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500', bubble: 'bg-rose-600', bubbleDark: 'bg-rose-700' },
};

export const BUREAU_COLOR_KEYS = Object.keys(BUREAU_COLORS) as CouleurBureau[];
