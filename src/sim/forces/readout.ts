import { floorUses } from '../analysis/massing';
import { COEFFICIENTS } from '../catalog/coefficients';
import { QUAKE_TEXT, USE_PLURAL, WIND_TEXT } from '../catalog/forces';
import type { Analysis, CheckStatus, Design, SeismicOutcome, Site } from '../types';
import { WIND_EXAGGERATION, windMotion } from './motion';

export interface ReadoutLine {
  text: string;
  /** Shown as a tick, warning or cross when set. */
  status?: CheckStatus;
}

export interface Readout {
  title: string;
  lines: ReadoutLine[];
  /** A warning shown across the scene when the design would fail. */
  banner?: string;
  /** How exaggerated the motion is. */
  note: string;
}

const OUTCOME_STATUS: Record<SeismicOutcome, CheckStatus> = { operational: 'pass', damaged: 'marginal', fails: 'fail' };
const cutPct = (reduction: number) => Math.round((1 - 1 / reduction) * 100);

/** The Wind card: the storm, the lean and sway, how it feels at the top, and what dampers do. */
export function windReadout(site: Site, design: Design, analysis: Analysis): Readout {
  const m = windMotion(site, design, analysis);
  const comfort = analysis.checks.find((c) => c.id === 'windComfort')!;
  const top = floorUses(design).at(-1) ?? 'office';
  const limit = analysis.wind.comfortLimitMg;
  // Far outside the model's range the numbers stop meaning anything, so say it in words.
  const felt =
    analysis.wind.accelMg > 10 * limit
      ? WIND_TEXT.feltOver(USE_PLURAL[top], limit)
      : WIND_TEXT.felt(analysis.wind.accelMg.toFixed(1), USE_PLURAL[top], limit) +
        (comfort.status === 'fail' ? WIND_TEXT.seasick : comfort.status === 'marginal' ? WIND_TEXT.queasy : '');
  const lines: ReadoutLine[] = [
    { text: WIND_TEXT.storm(site.windSpeed, site.city) },
    { text: m.strength === 'fail' ? WIND_TEXT.overpowered : WIND_TEXT.sway(m.leanM.toFixed(2), m.swayM.toFixed(2)) },
    { text: felt, status: comfort.status },
  ];
  const reduction = COEFFICIENTS.wind.dampingReduction;
  if (design.damping === 'tmd') lines.push({ text: WIND_TEXT.tmd(cutPct(reduction.tmd)) });
  if (design.damping === 'viscous') lines.push({ text: WIND_TEXT.viscous(cutPct(reduction.viscous)) });
  return {
    title: WIND_TEXT.title,
    lines,
    banner: m.strength === 'fail' ? WIND_TEXT.banner : undefined,
    note: WIND_TEXT.note(WIND_EXAGGERATION),
  };
}

/** The Earthquake card: the site's shaking, the tower's own swing, how hard it is worked and the result. */
export function quakeReadout(site: Site, design: Design, analysis: Analysis): Readout {
  const { periodS, ratio, outcome } = analysis.seismic;
  const rhythm = periodS >= 2 ? QUAKE_TEXT.slow : periodS < 1 ? QUAKE_TEXT.fast : '';
  const lines: ReadoutLine[] = [
    { text: QUAKE_TEXT.shaking(site.city, site.seismicHazard) + (site.seismicHazard < 0.1 ? QUAKE_TEXT.rare : '') },
    { text: QUAKE_TEXT.period(periodS.toFixed(1)) + rhythm },
    { text: QUAKE_TEXT.ratio(Math.round(ratio * 100), Math.round(COEFFICIENTS.seismic.operationalRatio * 100)) },
    { text: QUAKE_TEXT.outcome[outcome], status: OUTCOME_STATUS[outcome] },
  ];
  if (design.baseIsolation) lines.push({ text: QUAKE_TEXT.isolation });
  if (design.damping === 'tmd') lines.push({ text: QUAKE_TEXT.tmd });
  if (design.damping === 'viscous') lines.push({ text: QUAKE_TEXT.viscous });
  return {
    title: QUAKE_TEXT.title,
    lines,
    banner: outcome === 'fails' ? QUAKE_TEXT.banner : undefined,
    note: QUAKE_TEXT.note,
  };
}
