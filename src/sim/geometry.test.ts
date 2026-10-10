import { describe, expect, it } from 'vitest';
import { FLOOR_HEIGHT, crownHeight, floorSlices, setbackScale, shapeAreaFactor } from './geometry';
import { designFor } from './testUtils';
import type { PlanShape, Setbacks } from './types';

describe('geometry', () => {
  it('makes one slice per floor stacked by floor height', () => {
    const { design } = designFor('chicago', { floors: 12 });
    const slices = floorSlices(design);
    expect(slices).toHaveLength(12);
    expect(slices[11].y).toBe(11 * FLOOR_HEIGHT);
  });

  it('tapers the top floor by the taper fraction', () => {
    const { design } = designFor('chicago', { shape: 'square', plateWidth: 40, taper: 0.5, setbacks: 'none' });
    const slices = floorSlices(design);
    expect(slices[0].width).toBeCloseTo(40);
    expect(slices[slices.length - 1].width).toBeCloseTo(20);
  });

  it('rotates the top floor by the full twist', () => {
    const { design } = designFor('chicago', { twist: 90 });
    const slices = floorSlices(design);
    expect(slices[0].rotation).toBe(0);
    expect(slices[slices.length - 1].rotation).toBeCloseTo(Math.PI / 2);
  });

  it('steps setbacks down as the tower rises', () => {
    expect(setbackScale('none', 0.9)).toBe(1);
    expect(setbackScale('few', 0.6)).toBe(0.85);
    expect(setbackScale('wedding-cake', 0.85)).toBe(0.6);
  });

  it('gives round floors less area than square ones of the same width', () => {
    expect(shapeAreaFactor('circle')).toBeLessThan(shapeAreaFactor('square'));
  });

  it('adds the most height for a spire', () => {
    expect(crownHeight('spire', 200)).toBeGreaterThan(crownHeight('pointed', 200));
    expect(crownHeight('flat', 200)).toBeGreaterThan(0);
  });

  it('never produces a zero or negative floor size at extremes', () => {
    const shapes: PlanShape[] = ['square', 'rectangle', 'circle', 'triangle'];
    const setbacks: Setbacks[] = ['none', 'few', 'wedding-cake'];
    for (const shape of shapes)
      for (const sb of setbacks)
        for (const floors of [5, 150]) {
          const { design } = designFor('shanghai', { shape, setbacks: sb, floors, taper: 0.6, twist: 120, plateWidth: 15, plateDepth: 15 });
          for (const s of floorSlices(design)) {
            expect(s.width).toBeGreaterThan(0);
            expect(s.depth).toBeGreaterThan(0);
          }
        }
  });
});
