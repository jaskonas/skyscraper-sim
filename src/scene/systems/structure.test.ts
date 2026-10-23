import { describe, expect, it } from 'vitest';
import { FLOOR_HEIGHT, floorSlices } from '../../sim/geometry';
import { rotateYXZ, type Part } from '../../sim/parts';
import { designFor } from '../../sim/testUtils';
import type { Design } from '../../sim/types';
import { braceDetailParts, beltTrussParts } from './structure';

const tower = (patch: Partial<Design>) => designFor('chicago', { floors: 40, shape: 'square', plateWidth: 30, exposedStructure: true, ...patch }).design;
/** How far a part's centre is outside the floor's outline at its height (negative: inside). */
function outsideBy(d: Design, p: Part): number {
  const slices = floorSlices(d);
  const s = slices[Math.max(0, Math.min(slices.length - 1, Math.floor(p.position[1] / FLOOR_HEIGHT)))];
  const [x, , z] = rotateYXZ(p.position, [0, -s.rotation, 0]);
  if (d.shape === 'circle') return Math.hypot(x, z) - s.width / 2;
  return Math.max(Math.abs(x) - s.width / 2, Math.abs(z) - s.depth / 2);
}

describe('engineered exposed structure', () => {
  it('X-braces get flanges, node plates, gussets and bolts', () => {
    const d = tower({ system: 'framed-tube' });
    const p = braceDetailParts(d);
    const xs = 4 * 4; // 4 ten-floor segments × 4 faces
    expect(p.filter((q) => q.shape === 'box' && !q.fine && q.scale[2] < 0.3).length).toBe(xs);
    expect(p.filter((q) => q.fine && q.shape === 'box' && !!q.rotation && Math.abs(q.rotation[0]) > 1e-6).length).toBe(xs * 2 * 2);
    expect(p.filter((q) => q.fine && q.shape === 'box' && q.scale[2] < 0.3 && Math.abs(q.rotation?.[0] ?? 0) < 1e-6).length).toBe(xs * 4);
    expect(p.filter((q) => q.fine && q.shape === 'cylinder').length).toBeGreaterThanOrEqual(xs * 8);
    for (const q of p) expect(Math.abs(outsideBy(d, q))).toBeLessThan(2);
  });

  it('a diagrid has cast nodes where its members cross', () => {
    const d = tower({ system: 'diagrid' });
    const nodes = braceDetailParts(d).filter((q) => q.shape === 'octagon');
    expect(nodes.length).toBeGreaterThanOrEqual(16);
    for (const q of nodes) expect(Math.abs(outsideBy(d, q))).toBeLessThan(1.5);
  });

  it('nothing without exposed structure', () => {
    expect(braceDetailParts(tower({ exposedStructure: false }))).toEqual([]);
  });

  it('belt trusses wrap the plant floors of outrigger and bundled-tube towers', () => {
    const d = tower({ system: 'core-outrigger', floors: 70, exposedStructure: false });
    const t = beltTrussParts(d);
    expect(t.length).toBeGreaterThan(0);
    for (const q of t) {
      const f = q.position[1] / FLOOR_HEIGHT;
      expect((f >= 29 && f <= 30) || (f >= 59 && f <= 60)).toBe(true);
      expect(Math.abs(outsideBy(d, q))).toBeLessThan(1);
    }
    expect(beltTrussParts({ ...d, system: 'bundled-tube' }).length).toBeGreaterThan(0);
    expect(beltTrussParts({ ...d, system: 'rigid-frame' })).toEqual([]);
  });

  it('round and twisted towers keep their structure on the wall', () => {
    const d = tower({ shape: 'circle', twist: 90, system: 'framed-tube' });
    for (const q of braceDetailParts(d).filter((q) => !q.fine)) expect(Math.abs(outsideBy(d, q))).toBeLessThan(2.5);
    const t = beltTrussParts({ ...d, system: 'core-outrigger', floors: 70 });
    for (const q of t) expect(Math.abs(outsideBy({ ...d, floors: 70 }, q))).toBeLessThan(1.5);
  });
});
