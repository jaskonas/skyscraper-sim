import type { SeismicOutcome, UseType } from '../types';

/** Every word on the Wind and Earthquake readout cards. */
export const USE_PLURAL: Record<UseType, string> = { retail: 'shops', office: 'offices', hotel: 'hotels', residential: 'homes' };

export const WIND_TEXT = {
  title: 'Wind',
  storm: (speed: number, city: string) => `Wind: ${speed} m/s — ${city}'s design storm`,
  sway: (leanM: string, swayM: string) => `Top of tower leans ${leanM} m and sways ±${swayM} m`,
  overpowered: 'The wind would push the top further than the structure can take',
  felt: (mg: string, use: string, limit: number) => `People at the top feel ${mg} mg; the limit for ${use} is ${limit} mg`,
  feltOver: (use: string, limit: number) => `People at the top would feel more than 10 times the limit for ${use} (${limit} mg) — everyone up there would feel seasick`,
  queasy: ' — some people at the top would feel queasy',
  seasick: ' — people at the top would feel seasick',
  tmd: (pct: number) => `The tuned mass damper cuts the sway people feel by about ${pct}%.`,
  viscous: (pct: number) => `The viscous dampers cut the sway people feel by about ${pct}%.`,
  banner: 'Would fail in this wind',
  note: (x: number) => `Sway shown ${x}× bigger`,
};

export const QUAKE_TEXT = {
  title: 'Earthquake',
  shaking: (city: string, g: number) => `${city}'s design earthquake: ${g} g of ground shaking`,
  rare: ' — strong earthquakes are rare here',
  period: (s: string) => `Your tower swings back and forth once every ${s} s`,
  slow: ' — much slower than the quick jolts, so it rides them out',
  fast: " — close to the jolts' rhythm, so it gets shaken hard",
  ratio: (pct: number, workingPct: number) => `The quake pushes it to ${pct}% of its breaking point; it stays fully working below ${workingPct}%`,
  outcome: {
    operational: 'Would stay open for business',
    damaged: 'Damaged — needs repairs before reopening',
    fails: 'Would fail: the structure cannot take this quake',
  } satisfies Record<SeismicOutcome, string>,
  isolation: 'Base isolation: the ground moves, the tower barely does.',
  tmd: 'The tuned mass damper calms the shaking a little (it is tuned for wind).',
  viscous: 'Viscous dampers in the frame soak up some of the shaking.',
  banner: 'Would fail in this earthquake',
  note: 'Motion shown much bigger',
};
