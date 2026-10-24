import { windShapeFactor } from '../analysis/wind';
import { FLOOR_HEIGHT } from '../geometry';
import type { Analysis, CheckId, CheckStatus, Design, SeismicOutcome, Site } from '../types';

/** How much bigger than real the wind sway is drawn. */
export const WIND_EXAGGERATION = 5;
/** Metres of drawn ground motion per g of design shaking. */
export const QUAKE_METRES_PER_G = 10;
/** With base isolation, this share of the ground's motion reaches the tower's base. */
export const ISOLATED_BASE_SHARE = 0.2;
/** One quake: calm, build-up, strong shaking, fade, pause — seconds. */
export const QUAKE_CYCLE_S = 14;

/**
 * How a cantilever bends under a sideways push: 0 at the base, 1 at the top, curving so the upper
 * floors move most. `y` is height above the base and `height` the tower's height, both metres.
 */
export function bendShape(y: number, height: number): number {
  if (height <= 0) return 0;
  const s = Math.min(1, Math.max(0, y / height));
  return 1.5 * s * s - 0.5 * s * s * s;
}

const statusOf = (analysis: Analysis, id: CheckId): CheckStatus => analysis.checks.find((c) => c.id === id)!.status;

export interface WindMotion {
  /** Steady lean of the top in the design storm, real metres. */
  leanM: number;
  /** Back-and-forth sway of the top about that lean, real metres. */
  swayM: number;
  periodS: number;
  exaggeration: number;
  /** 1 = a blunt square box; smaller for round, tapered, set-back or twisted towers. */
  eddyStrength: number;
  comfort: CheckStatus;
  strength: CheckStatus;
}

export function windMotion(_site: Site, design: Design, analysis: Analysis): WindMotion {
  const periodS = analysis.seismic.periodS;
  const accel = (analysis.wind.accelMg * 9.81) / 1000;
  const omega = (2 * Math.PI) / periodS;
  return {
    leanM: analysis.wind.driftRatio * design.floors * FLOOR_HEIGHT,
    swayM: accel / (omega * omega),
    periodS,
    exaggeration: WIND_EXAGGERATION,
    eddyStrength: windShapeFactor(design),
    comfort: statusOf(analysis, 'windComfort'),
    strength: statusOf(analysis, 'windStrength'),
  };
}

/**
 * Size of the drawn back-and-forth swing, real metres: doubled when the tower would fail, but never more
 * than the lean, so the tower always bends downwind (the wind never pulls it upwind).
 */
export function windSwing(m: WindMotion): number {
  return Math.min(m.swayM * (m.strength === 'fail' ? 2 : 1), m.leanM);
}

/** The biggest drawn offset of the top, metres (lean plus swing, exaggerated). */
export function windPeak(m: WindMotion): number {
  return m.exaggeration * (m.leanM + windSwing(m));
}

/** Drawn sideways offset of the top, metres, `t` seconds after the wind was switched on. */
export function windTop(m: WindMotion, t: number): number {
  const ramp = Math.min(1, Math.max(0, t / 2));
  return m.exaggeration * ramp * (m.leanM + windSwing(m) * Math.sin((2 * Math.PI * t) / m.periodS));
}

export interface QuakeMotion {
  /** Drawn ground motion at full strength, metres. */
  groundM: number;
  periodS: number;
  /** Drawn bending of the top relative to its base at full strength, metres. */
  responseM: number;
  /** Share of the ground's motion that reaches the tower's base. */
  baseShare: number;
  outcome: SeismicOutcome;
  /** How far a failing tower leans over by the end of the strong shaking, degrees. */
  failLeanDeg: number;
}

const OUTCOME_FACTOR: Record<SeismicOutcome, number> = { operational: 1, damaged: 1.5, fails: 2 };

export function quakeMotion(site: Site, design: Design, analysis: Analysis): QuakeMotion {
  const { outcome, ratio, periodS } = analysis.seismic;
  const groundM = QUAKE_METRES_PER_G * site.seismicHazard;
  return {
    groundM,
    periodS,
    responseM: groundM * Math.min(1.5, ratio) * 0.8 * OUTCOME_FACTOR[outcome],
    baseShare: design.baseIsolation ? ISOLATED_BASE_SHARE : 1,
    outcome,
    failLeanDeg: outcome === 'fails' ? 3 : 0,
  };
}

const cycle = (t: number) => ((t % QUAKE_CYCLE_S) + QUAKE_CYCLE_S) % QUAKE_CYCLE_S;

/** Strength of the shaking, 0..1: 2 s calm, 2 s building, 5 s strong, 3 s fading, 2 s pause. */
export function quakeEnvelope(t: number): number {
  const c = cycle(t);
  if (c < 2) return 0;
  if (c < 4) return (c - 2) / 2;
  if (c < 9) return 1;
  if (c < 12) return 1 - (c - 9) / 3;
  return 0;
}

/** The ground's sideways offset, metres: quick jolts at about 1–3 per second, within ±groundM. */
export function groundOffset(t: number, groundM: number): number {
  const w = 2 * Math.PI;
  const jolts = 0.5 * Math.sin(w * 1.1 * t) + 0.3 * Math.sin(w * 1.9 * t + 1) + 0.2 * Math.sin(w * 2.7 * t + 2);
  return groundM * quakeEnvelope(t) * jolts;
}

/** The top's drawn offset relative to its base, metres: the tower's own swing, a quarter period behind. */
export function quakeTop(m: QuakeMotion, t: number): number {
  const lag = t - m.periodS / 4;
  return m.responseM * quakeEnvelope(lag) * Math.sin((2 * Math.PI * lag) / m.periodS);
}

/** A failing tower's lean, radians: grows through the strong shaking, holds, and eases back upright in the pause. */
export function quakeLean(m: QuakeMotion, t: number): number {
  if (m.failLeanDeg === 0) return 0;
  const c = cycle(t);
  const progress = c < 4 ? 0 : c < 9 ? (c - 4) / 5 : c < 12 ? 1 : 1 - (c - 12) / 2;
  return (m.failLeanDeg * Math.PI * progress) / 180;
}
