import { describe, expect, it } from 'vitest';
import { analyze } from '../../sim/analysis';
import { constructionState } from '../../sim/construction/stages';
import { FLOOR_HEIGHT } from '../../sim/geometry';
import { designFor } from '../../sim/testUtils';
import { cameraFrame, lotCenter } from '../layout';
import { structureParts } from '../structure/structureParts';
import { STAGE_SECONDS, stageFrame, visibleStructure } from './reveal';

const setup = (patch = {}) => {
  const { site, design } = designFor('chicago', { floors: 40, ...patch });
  const analysis = analyze(site, design);
  return { site, design, analysis, parts: structureParts(design) };
};

describe('visibleStructure', () => {
  it('shows each kind of piece up to its own height, and nothing hidden inside the finished facade', () => {
    const { design, analysis, parts } = setup({ material: 'steel', system: 'core-outrigger' });
    const s = constructionState(design, analysis, 2, 0.6);
    const shown = visibleStructure(parts, s);
    const roleOf = new Map(parts.map((p) => [p.part, p]));
    expect(shown.length).toBeGreaterThan(0);
    for (const part of shown) {
      const p = roleOf.get(part)!;
      const limit = p.role === 'core' || p.role === 'wall' ? s.coreTop : p.role === 'slab' ? s.slabTop : s.frameTop;
      // Multi-floor runs (core, walls, columns) go up once work is a floor into them; the rest by their top.
      const reached = ['core', 'wall', 'column'].includes(p.role) ? p.bottom + FLOOR_HEIGHT : p.top;
      expect(reached).toBeLessThanOrEqual(limit + 0.01);
      expect(p.top).toBeGreaterThan(s.facadeTop - 0.01);
    }
  });

  it('never shows beams or slabs above the core and columns holding them up, even on tall towers', () => {
    for (const patch of [
      { floors: 150, material: 'concrete' as const, system: 'core-outrigger' as const },
      { floors: 150, material: 'steel' as const, system: 'rigid-frame' as const },
      { floors: 90, material: 'composite' as const, system: 'framed-tube' as const },
    ]) {
      const { design, analysis, parts } = setup(patch);
      const roleOf = new Map(parts.map((p) => [p.part, p]));
      for (let i = 1; i <= 40; i++) {
        const shown = visibleStructure(parts, constructionState(design, analysis, 2, i / 40)).map((p) => roleOf.get(p)!);
        const highest = (roles: string[]) => Math.max(-Infinity, ...shown.filter((p) => roles.includes(p.role)).map((p) => p.top));
        const floor = highest(['beam', 'slab']);
        if (floor === -Infinity) continue;
        const label = `${patch.system} ${patch.material} t=${i / 40}`;
        expect(highest(['core']), label).toBeGreaterThanOrEqual(floor - 0.01);
        expect(highest(['column']), label).toBeGreaterThanOrEqual(floor - 0.01);
      }
    }
  });

  it('grows as the frame rises', () => {
    const { design, analysis, parts } = setup();
    const at = (t: number) => visibleStructure(parts, constructionState(design, analysis, 2, t)).length;
    expect(at(0)).toBe(0);
    expect(at(0.2)).toBeGreaterThan(0);
    expect(at(0.15)).toBeLessThanOrEqual(at(0.2));
  });

  it('keeps the exposed bracing, sets the isolators in the foundation stage and hangs the damper with the crown', () => {
    const { design, analysis, parts } = setup({ exposedStructure: true, baseIsolation: true, damping: 'tmd' });
    const isolators = parts.filter((p) => p.role === 'isolator').map((p) => p.part);
    const damper = parts.filter((p) => p.role === 'mass-damper').map((p) => p.part);
    const braces = parts.filter((p) => p.role === 'brace').map((p) => p.part);
    const has = (stage: number, t: number, list: typeof isolators) => {
      const shown = new Set(visibleStructure(parts, constructionState(design, analysis, stage, t)));
      return list.every((p) => shown.has(p));
    };
    expect(has(1, 0.5, isolators)).toBe(false);
    expect(has(1, 1, isolators)).toBe(true);
    expect(has(3, 1, damper)).toBe(false);
    expect(has(4, 1, damper)).toBe(true);
    expect(has(5, 1, braces)).toBe(true);
  });
});

describe('stageFrame', () => {
  it('looks low and close at the dig, up at the crown, and ends on the usual view', () => {
    const { site, design, analysis } = setup();
    const normal = cameraFrame(site, analysis.tipHeightM);
    const dig = stageFrame(site, design, analysis, 0);
    expect(dig.target[1]).toBeLessThan(0);
    expect(Math.hypot(dig.position[0] - dig.target[0], dig.position[2] - dig.target[2])).toBeLessThan(
      Math.hypot(normal.position[0] - normal.target[0], normal.position[2] - normal.target[2]),
    );
    expect(stageFrame(site, design, analysis, 4).target[1]).toBeCloseTo(analysis.heightM * 0.85, 0);
    expect(stageFrame(site, design, analysis, 5)).toEqual(normal);
    expect(dig.target[2]).toBeCloseTo(lotCenter(site)[1], 0);
  });

  it('gives every stage a time to play', () => {
    expect(STAGE_SECONDS).toEqual([6, 8, 15, 8, 8, 8]);
  });
});
