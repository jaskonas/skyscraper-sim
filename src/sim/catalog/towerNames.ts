import { FLOOR_HEIGHT } from '../geometry';
import type { Design, Site, SiteId } from '../types';

/** Words from each city for name ideas, chosen to avoid famous real towers' names. */
export const CITY_WORDS: Record<SiteId, string[]> = {
  'new-york': ['Hudson', 'Midtown', 'Broadway', 'Harbor', 'Empire Park'],
  tokyo: ['Sakura', 'Sumida', 'Kanto', 'Shinjuku Sky', 'Fuji View'],
  chicago: ['Lakeshore', 'Prairie', 'Windy City', 'Riverbend', 'Loop'],
  shanghai: ['Pearl River', 'Bund', 'Huangpu', 'Jade', 'Lotus'],
};

export const BASE_FORMS = ['Tower', 'Heights', 'Point', 'Summit', 'Plaza'];

/** The form words for this design: ones that fit its look come first, so they show up in the first ideas. */
function forms(design: Design): string[] {
  const extra: string[] = [];
  if (design.crown === 'spire') extra.push('Spire');
  if ((design.floors * FLOOR_HEIGHT) / design.plateWidth > 8) extra.push('Needle');
  if (design.twist >= 30) extra.push('Twist');
  return [...extra, ...BASE_FORMS];
}

/**
 * Name idea number `n` for this tower: "The <city word> <form word>". Every pair of words comes up once before any
 * repeats, and the next idea always changes the city word.
 */
export function suggestTowerName(site: Site, design: Design, n: number): string {
  const city = CITY_WORDS[site.id];
  const form = forms(design);
  const k = ((Math.floor(n) % (city.length * form.length)) + city.length * form.length) % (city.length * form.length);
  const c = k % city.length;
  const round = Math.floor(k / city.length);
  return `The ${city[c]} ${form[(c + round) % form.length]}`;
}
