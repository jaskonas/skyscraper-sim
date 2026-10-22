import { describe, expect, it } from 'vitest';
import type { PartShape } from '../../sim/parts';
import { partGeometry } from './geometries';

const SHAPES: PartShape[] = ['box', 'cylinder', 'cone', 'pyramid', 'sphere', 'dome', 'torus', 'arch', 'wedge', 'plan', 'plan-cone', 'octagon', 'frustum', 'ogee', 'lancet'];

describe('part geometries', () => {
  it('every shape fills the unit cube (so scale is size in metres)', () => {
    for (const shape of SHAPES) {
      const box = partGeometry(shape, 'square').boundingBox!;
      expect(box.min.y, shape).toBeCloseTo(-0.5, 2);
      expect(box.max.y, shape).toBeCloseTo(0.5, 2);
      expect(box.max.x - box.min.x, shape).toBeCloseTo(1, 1);
      expect(box.max.z - box.min.z, shape).toBeCloseTo(1, 1);
    }
  });

  it('caches geometries and keeps plan shapes apart', () => {
    expect(partGeometry('cone', 'square')).toBe(partGeometry('cone', 'circle'));
    expect(partGeometry('plan', 'square')).not.toBe(partGeometry('plan', 'circle'));
  });

  it('the ogee swells and then draws up to a point at the very top', () => {
    const pos = partGeometry('ogee', 'square').getAttribute('position');
    let upper = 0;
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) > 0.2 && pos.getY(i) < 0.3) upper = Math.max(upper, Math.hypot(pos.getX(i), pos.getZ(i)));
    expect(upper).toBeGreaterThan(0.05);
  });
});
