// Sérialisation des listes (bons points/négatifs/objectifs) et blocs (rapport Général)
// dans les champs texte existants (`contenu`, `bonsPoints`, `pointsNegatifs`, `objectifs`) —
// pas de migration de schéma nécessaire. Reste compatible avec un ancien texte brut déjà
// enregistré : s'il n'est pas du JSON valide, il devient un seul item/bloc "texte".

export const LIST_MAX_ITEMS = 8;
export const LIST_ITEM_MAX_LENGTH = 150;

export function parseList(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    // Pas du JSON : ancien texte brut, on le garde comme unique item.
  }
  return [value];
}

export function stringifyList(items: string[]): string {
  return JSON.stringify(items.filter((i) => i.trim().length > 0));
}

export type BlockType = 'heading' | 'subheading' | 'text';

export interface ContentBlock {
  type: BlockType;
  content: string;
}

export const BLOCK_TEXT_MAX_LENGTH = 2000;
export const BLOCK_HEADING_MAX_LENGTH = 120;

export function parseBlocks(value: string | null | undefined): ContentBlock[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((b) => b && typeof b.content === 'string')) {
      return parsed as ContentBlock[];
    }
  } catch {
    // Pas du JSON : ancien texte brut, on le garde comme unique bloc de texte.
  }
  return [{ type: 'text', content: value }];
}

export function stringifyBlocks(blocks: ContentBlock[]): string {
  return JSON.stringify(blocks.filter((b) => b.content.trim().length > 0));
}
