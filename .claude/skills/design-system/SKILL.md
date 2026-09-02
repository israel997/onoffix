---
name: design-system
description: Use before writing or changing any UI in OOffix — new component, new screen, or visual tweak. Reference for colors, components, icons, loading/empty/confirmation patterns, and mobile behavior, so new UI stays consistent with what's already there instead of improvising per-component.
---

# OOffix design system

The product has one visual language. A new screen should look like it was built by
the same person who built the last one — that's what this file protects. When
something here doesn't cover your case, extend the pattern that's closest rather than
inventing a new one from scratch.

## Colors

Defined in `apps/web/src/app/globals.css`, exposed as Tailwind tokens — always use the
token, never a raw hex value.

| Token | Hex | Meaning |
|---|---|---|
| `brand-blue` | `#0b63f6` | Primary action, links, active nav state |
| `brand-blue-light` / `brand-blue-dark` | | Tints for hover/active backgrounds |
| `brand-navy` | `#0a1440` | Logo, headings on dark surfaces |
| `surface` | `#ffffff` | Card/page background |
| `surface-muted` | `#f2f4f8` | Subtle fill (hover rows, disabled state, secondary buttons) |
| `border` | `#e3e7f0` | All borders |
| `foreground` | `#0a1440` | Body text |
| `muted-foreground` | `#5b6178` | Secondary text, captions |
| `status-validated` | `#16a34a` (green) | Done, success, approved |
| `status-declared` | `#d97706` (amber) | Waiting/warning/in-review |
| `status-review` | `#dc2626` (red) | Blocked, error, destructive |
| `status-todo` | `#8a8fa3` (gray) | Not started |

No dark mode yet — don't add `dark:` variants speculatively.

## Components (always reuse, never rebuild inline)

- **`Card`** (`components/ui/card.tsx`) — the only container for a block of content.
  `CardTitle`, `CardDescription`, `CardHeader` go inside it.
- **`Badge`** (`components/ui/badge.tsx`) — small status/category pill. Tones:
  `neutral` (gray, default/inert), `declared` (amber), `validated` (green), `review`
  (red), `brand` (blue), `indigo` (used specifically to mean "this concerns you" —
  e.g. a task assigned to the current user — don't repurpose it for anything else).
- **`Button`** (`components/ui/button.tsx`) — variants `primary` (default action),
  `secondary` (neutral/cancel), `ghost` (low-emphasis inline action), `success`
  (green — advances a task forward: Start, Done, Approve), `warning` (amber — a pause/
  hold action, not yet used elsewhere so keep it reserved for that meaning), `danger`
  (red — destructive or "report a problem"). Pick by *meaning*, not by what looks
  good next to it.
- **`EmptyState`** — "nothing here yet," never a bare `<p>No data</p>`.
- **`useConfirm()`** (`lib/confirm-context.tsx`) — any destructive/irreversible action
  goes through this, never a raw `window.confirm` or an unguarded button.
- **`useToast()`** (`lib/toast-context.tsx`) — see Toasts below.

## Icons

Hand-drawn inline SVG only, from `components/icons/office-icons.tsx`
(`viewBox="0 0 24 24"`, `stroke="currentColor"` or `fill="currentColor"`, ~1.6
stroke-width to match the existing set). **No emoji, no Unicode symbols (▶, ✎, 🗑,
✕) for interface chrome** — they render inconsistently across devices (this is why
the old "▶" accordion triangle got replaced with `ChevronIcon`). A few older buttons
still use `✎`/`🗑`/`✕` glyphs; when you touch one of those files, replace it with a
matching SVG rather than leaving it — don't spread the old pattern further.

## Toasts

`useToast()` renders a `surface` background card with a colored left border and a
tone icon (`CheckCircleIcon` success, `AlertTriangleIcon` warning, `XCircleIcon`
error) — never a solid saturated color fill. Auto-dismiss timing is tone-based
(success 3.5s, warning 4.5s, error 5.5s — an error deserves more reading time), and
pauses while the pointer is over it.

Use `{ persistent: true }` only for something the user must actively acknowledge
(e.g. "you've run over the estimated time on this task") — it renders a "Got it"
button instead of auto-dismissing. Don't reach for `persistent` by default; most
confirmations (task updated, assigned, deleted) are fine as a normal transient toast.
A toast is for feedback on an action the user just took — it is not the right tool
for something they need to review later (that belongs on the Dashboard/Notifications)
or for a decision they need to make (that belongs in a dialog/inline UI).

## Loading state: Skeleton vs spinner

- **`Skeleton`** (`components/ui/skeleton.tsx`) — use when you already know the shape
  of what's coming (a stats grid, a list of rows, a card). Build 2-3 placeholder rows
  that roughly match the real layout's dimensions.
- **`Loading`** (`components/ui/loading.tsx`, the footprint animation) — use only for
  a brief/unshaped wait where a skeleton would be overkill (a button's own busy state,
  a tiny inline fetch) — not for a whole page's initial data load.

## Onboarding / one-time tips

`ButtonTip` (`components/tasks/task-item.tsx` pattern) — a dismissible speech-bubble
tip anchored on a specific control, shown once ever (tracked in `localStorage` by a
stable key, not per-record) and never again after dismissal. Use this pattern — not a
modal, not a permanent banner — when introducing a first-time user to a specific
control's purpose. Keep the copy to one short sentence.

## Mobile / responsive

- Default to `flex-col` and stack; widen with `sm:flex-row` / `lg:grid-cols-*` — never
  design desktop-first and hide things on mobile as an afterthought.
- A page that genuinely needs the full viewport width (a data grid, a two-pane
  layout like the DM inbox) opts out of the centered `max-w-5xl` content column via
  `isFullWidthPage` in `app/(app)/layout.tsx` — don't fight the centered layout with
  your own width overrides inside a page.
- Long task/member rows collapse to essentials on mobile; secondary detail goes in a
  modal/detail view (see the task card's collapsed-by-default pattern) rather than
  wrapping awkwardly.

## Before you consider UI work done

- Does it reuse `Card`/`Badge`/`Button`/`EmptyState` instead of ad hoc `div`s and
  inline colors?
- Does every icon come from `office-icons.tsx` — zero emoji, zero Unicode chrome?
- Does the loading state match its content's shape (Skeleton) or is it a brief
  incidental wait (Loading)?
- Would someone who has never used OOffix understand this control without being told?
