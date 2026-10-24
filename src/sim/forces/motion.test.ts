import { describe, expect, it } from 'vitest';
import { analyze } from '../analysis';
import { designFor } from '../testUtils';
import type { Design, SiteId } from '../types';
import { QUAKE_CYCLE_S, bendShape, groundOffset, quakeEnvelope, quakeLean, quakeMotion, quakeTop, windMotion, windTop } from './motion';

const setup = (siteId: SiteId, patch: Partial<Design> = {}) => {
  const { site, design } = designFor(siteId, patch);
  return { site, design, analysis: analyze(site, design) };
};
const wind = (siteId: SiteId, patch: Partial<Design> = {}) => {
  const s = setup(siteId, patch);
  return windMotion(s.site, s.design, s.analysis);
};
const quake = (siteId: SiteId, patch: Partial<Design> = {}) => {
  const s = setup(siteId, patch);
  return quakeMotion(s.site, s.design, s.analysis);
};

describe('bendShape', () => {
  it('is 0 at the base, 1 at the top and never goes down', () => {
    expect(bendShape(0, 200)).toBe(0);
    expect(bendShape(200, 200)).toBe(1);
    let last = -1;
    for (let y = -10; y <= 220; y += 5) {
      const s = bendShape(y, 200);
      expect(Number.isFinite(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(last);
      last = s;
    }
    expect(bendShape(100, 0)).toBe(0);
  });

  it('curves: the top half bends much more than the bottom half', () => {
    expect(bendShape(50, 100)).toBeLessThan(0.4);
  });
});

describe('windMotion', () => {
  it('leans by the drift and sways by the felt acceleration at the natural period', () => {
    const s = setup('chicago', { floors: 50 });
    const m = windMotion(s.site, s.design, s.analysis);
    expect(m.leanM).toBeCloseTo(s.analysis.wind.driftRatio * 50 * 4, 6);
    expect(m.periodS).toBe(s.analysis.seismic.periodS);
    const a = (s.analysis.wind.accelMg * 9.81) / 1000;
    expect(m.swayM).toBeCloseTo(a / (2 * Math.PI / m.periodS) ** 2, 9);
    expect(m.exaggeration).toBe(5);
  });

  it('dampers shrink the sway but not the lean', () => {
    const none = wind('chicago', { damping: 'none' });
    const tmd = wind('chicago', { damping: 'tmd' });
    expect(tmd.swayM).toBeLessThan(none.swayM);
    expect(tmd.leanM).toBeCloseTo(none.leanM, 9);
  });

  it('round, tapered and twisted towers shed smaller eddies than a square box', () => {
    const box = wind('chicago', { shape: 'square', twist: 0, taper: 0, setbacks: 'none' }).eddyStrength;
    expect(wind('chicago', { shape: 'circle', twist: 0, taper: 0, setbacks: 'none' }).eddyStrength).toBeLessThan(box);
    expect(wind('chicago', { shape: 'square', twist: 90, taper: 0, setbacks: 'none' }).eddyStrength).toBeLessThan(box);
    expect(wind('chicago', { shape: 'square', twist: 0, taper: 0.4, setbacks: 'none' }).eddyStrength).toBeLessThan(box);
  });

  it('reports the same comfort and strength results as the assessment', () => {
    for (const patch of [{}, { floors: 120, plateWidth: 20, system: 'rigid-frame' as const }]) {
      const s = setup('shanghai', patch);
      const m = windMotion(s.site, s.design, s.analysis);
      expect(m.comfort).toBe(s.analysis.checks.find((c) => c.id === 'windComfort')!.status);
      expect(m.strength).toBe(s.analysis.checks.find((c) => c.id === 'windStrength')!.status);
    }
  });

  it('the top eases into its lean, then sways about it, all 5 times bigger', () => {
    const m = wind('chicago');
    expect(windTop(m, 0)).toBe(0);
    const later = [5, 5.5, 6, 6.5, 7].map((t) => windTop(m, t));
    for (const v of later) {
      expect(v).toBeGreaterThanOrEqual(m.exaggeration * (m.leanM - m.swayM) - 1e-9);
      expect(v).toBeLessThanOrEqual(m.exaggeration * (m.leanM + m.swayM) + 1e-9);
    }
  });

  it('sways twice as wildly when the tower would fail in this wind', () => {
    const m = wind('chicago');
    const failing = { ...m, strength: 'fail' as const };
    const swing = (x: typeof m) => Math.max(...[0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => windTop(x, 10 + (k * x.periodS) / 8))) - x.exaggeration * x.leanM;
    expect(swing(failing)).toBeCloseTo(2 * swing(m), 6);
  });
});

describe('quakeMotion', () => {
  it('shakes Tokyo far harder than Chicago, at 10 m of display motion per g', () => {
    const tokyo = setup('tokyo');
    expect(quakeMotion(tokyo.site, tokyo.design, tokyo.analysis).groundM).toBeCloseTo(10 * tokyo.site.seismicHazard, 9);
    expect(quake('tokyo').groundM).toBeGreaterThan(5 * quake('chicago').groundM);
  });

  it('base isolation lets only a fifth of the ground motion reach the tower', () => {
    expect(quake('tokyo', { baseIsolation: false }).baseShare).toBe(1);
    expect(quake('tokyo', { baseIsolation: true }).baseShare).toBe(0.2);
  });

  it('taller towers swing more slowly', () => {
    expect(quake('tokyo', { floors: 80 }).periodS).toBeGreaterThan(quake('tokyo', { floors: 20 }).periodS);
  });

  it('follows the assessment: damaged swings harder, failing harder still and leans', () => {
    for (const patch of [{}, { floors: 100, material: 'concrete' as const, system: 'rigid-frame' as const, baseIsolation: false, damping: 'none' as const }]) {
      const s = setup('tokyo', patch);
      const m = quakeMotion(s.site, s.design, s.analysis);
      expect(m.outcome).toBe(s.analysis.seismic.outcome);
      const factor = m.outcome === 'operational' ? 1 : m.outcome === 'damaged' ? 1.5 : 2;
      expect(m.responseM).toBeCloseTo(m.groundM * Math.min(1.5, s.analysis.seismic.ratio) * 0.8 * factor, 9);
      expect(m.failLeanDeg).toBe(m.outcome === 'fails' ? 3 : 0);
    }
  });
});

describe('the quake cycle', () => {
  it('is calm, builds, holds, fades and pauses, every 14 seconds', () => {
    expect(QUAKE_CYCLE_S).toBe(14);
    expect(quakeEnvelope(1)).toBe(0);
    expect(quakeEnvelope(3)).toBeCloseTo(0.5);
    expect(quakeEnvelope(6)).toBe(1);
    expect(quakeEnvelope(10.5)).toBeCloseTo(0.5);
    expect(quakeEnvelope(13)).toBe(0);
    expect(quakeEnvelope(6 + 14)).toBe(1);
  });

  it('keeps the ground within its shaking size, and still when calm', () => {
    for (let t = 0; t < 28; t += 0.07) expect(Math.abs(groundOffset(t, 4.5))).toBeLessThanOrEqual(4.5 + 1e-9);
    expect(groundOffset(1, 4.5)).toBe(0);
    expect(Math.max(...Array.from({ length: 200 }, (_, i) => Math.abs(groundOffset(4 + i * 0.025, 4.5))))).toBeGreaterThan(2);
  });

  it('the top swings by the response size, a quarter period behind the ground', () => {
    const m = quake('tokyo');
    expect(quakeTop(m, 1)).toBe(0);
    const peak = Math.max(...Array.from({ length: 400 }, (_, i) => Math.abs(quakeTop(m, 4 + i * 0.02))));
    expect(peak).toBeLessThanOrEqual(m.responseM + 1e-9);
    expect(peak).toBeGreaterThan(m.responseM * 0.5);
  });

  it('a failing tower leans over during the strong shaking and eases back upright in the pause', () => {
    const m = { ...quake('tokyo'), outcome: 'fails' as const, failLeanDeg: 3 };
    const full = (3 * Math.PI) / 180;
    expect(quakeLean(m, 1)).toBe(0);
    expect(quakeLean(m, 9)).toBeCloseTo(full, 9);
    expect(quakeLean(m, 13)).toBeCloseTo(full / 2, 9);
    expect(quakeLean(m, 14)).toBe(0);
    // No sudden jumps anywhere in the cycle.
    for (let t = 0; t < 28; t += 0.05) expect(Math.abs(quakeLean(m, t + 0.05) - quakeLean(m, t))).toBeLessThan(full / 20);
    expect(quakeLean(quake('chicago'), 9)).toBe(0);
  });
});
