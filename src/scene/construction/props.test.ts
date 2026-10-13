import { describe, expect, it } from 'vitest';
import { analyze } from '../../sim/analysis';
import { constructionState, type VehicleId } from '../../sim/construction/stages';
import { plateDims } from '../../sim/geometry';
import { partBounds, partIsFinite, type Part } from '../../sim/parts';
import { designFor } from '../../sim/testUtils';
import { constructionProps, craneParts, vehicleParts } from './props';

const VEHICLES: VehicleId[] = ['excavator', 'dump-truck', 'pile-rig', 'mixer', 'flatbed'];
const bounds = (parts: Part[]) => {
  const b = parts.map(partBounds);
  return {
    min: [0, 1, 2].map((i) => Math.min(...b.map((x) => x.min[i]))),
    max: [0, 1, 2].map((i) => Math.max(...b.map((x) => x.max[i]))),
  };
};

describe('construction props', () => {
  it('builds every vehicle at real size, standing on the ground', () => {
    for (const id of VEHICLES)
      for (const clock of [0, 1.3, 7.9]) {
        const parts = vehicleParts(id, clock);
        expect(parts.length, id).toBeGreaterThan(2);
        expect(parts.every(partIsFinite), id).toBe(true);
        const b = bounds(parts);
        expect(b.min[1], id).toBeGreaterThanOrEqual(-0.01);
        expect(b.max[0] - b.min[0], id).toBeGreaterThan(4);
        expect(b.max[0] - b.min[0], id).toBeLessThan(16);
        expect(b.max[1], id).toBeLessThan(id === 'pile-rig' ? 30 : 8);
      }
  });

  it('stands the crane next to the core with its jib at the given height, turning without moving the mast', () => {
    const { design } = designFor('chicago', { floors: 40 });
    const a = craneParts(design, 100, 0);
    const b = craneParts(design, 100, 1);
    const mastA = a.find((p) => p.scale[1] > 50)!;
    const mastB = b.find((p) => p.scale[1] > 50)!;
    expect(partBounds(mastA).max[1]).toBeCloseTo(100, 5);
    expect(mastA.position).toEqual(mastB.position);
    expect(bounds(a).max[1]).toBeGreaterThan(100);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
    expect(a.every(partIsFinite)).toBe(true);
  });

  it('shows the crane only while it is up, and one cluster of parts per vehicle on site', () => {
    const { site, design } = designFor('chicago', { floors: 40, material: 'steel', foundation: 'piles' });
    const analysis = analyze(site, design);
    const dig = constructionState(design, analysis, 0, 0.5);
    expect(constructionProps(design, dig, 0)).toHaveLength(vehicleParts('excavator', 0).length + vehicleParts('dump-truck', 0).length);
    const frame = constructionState(design, analysis, 2, 0.5);
    const crane = craneParts(design, frame.crane.top, 0).length;
    const trucks = frame.vehicles.reduce((s, v) => s + vehicleParts(v, 0).length, 0);
    expect(constructionProps(design, frame, 0)).toHaveLength(crane + trucks);
    expect(constructionProps(design, constructionState(design, analysis, 5, 1), 0)).toHaveLength(0);
  });

  it('parks the trucks in front of the tower, clear of its footprint', () => {
    const { site, design } = designFor('chicago', { floors: 40, material: 'composite' });
    const { depth } = plateDims(design);
    const frame = constructionState(design, analyze(site, design), 2, 0.5);
    for (const clock of [0, 3, 11]) {
      const parts = constructionProps(design, { ...frame, crane: { top: 0, up: false } }, clock);
      expect(bounds(parts).min[2]).toBeGreaterThan(depth / 2);
    }
  });
});
