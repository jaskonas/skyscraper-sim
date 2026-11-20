/** The longest tower name, in characters (code points, so an emoji counts as one). */
export const TOWER_NAME_MAX = 40;

/** Tidy a typed tower name: one space between words, no control characters, at most 40 characters. '' when nothing is left. */
export function cleanTowerName(raw: string): string {
  const tidy = raw.replace(/\s+/g, ' ').replace(/\p{Cc}/gu, '').trim();
  return Array.from(tidy).slice(0, TOWER_NAME_MAX).join('').trimEnd();
}

/** A file-name-safe version of the name (a–z, 0–9 and dashes, at most 30), or `fallback` when nothing is left. */
export function towerFileSlug(name: string | null, fallback: string): string {
  const slug = (name ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}
