import { describe, expect, it } from 'vitest';
import { DIORAMA } from './layout';
import { CONTACT_MARGIN, SHADOW_MAP_SIZE, SUN_DIRECTION, SUN_DISTANCE, contactPatches, shadowFrame, snapToTexel } from './sunShadow';

const sub = (a: number[], b: number[]) => a.map((v, i) => v - b[i]);
const len = (a: number[]) => Math.hypot(...a);

describe('shadow frame', () => {
  it("sits on the sun's side of the target, far enough to see the whole tower", () => {
    const f = shadowFrame([10, 50, -20], 300);
    const d = sub(f.position, f.target);
    const sun = SUN_DIRECTION.map((v) => v / len(SUN_DIRECTION));
    expect(d.reduce((s, v, i) => s + (v / len(d)) * sun[i], 0)).toBeGreaterThan(0.999);
    expect(len(d)).toBeCloseTo(SUN_DISTANCE, 3);
    expect(SUN_DISTANCE).toBe(1500);
    expect(f.far - f.near).toBeGreaterThanOrEqual(2 * 1500 - 1);
  });

  it('is tight up close and wide far out', () => {
    expect(shadowFrame([0, 0, 0], 20).halfSize).toBe(30);
    expect(shadowFrame([0, 0, 0], 40).halfSize).toBe(30);
    expect(shadowFrame([0, 0, 0], 400).halfSize).toBe(300);
    expect(shadowFrame([0, 0, 0], 2500).halfSize).toBe(600);
  });

  it('covers the diorama from the furthest orbit', () => {
    expect(shadowFrame([0, 0, 0], 2500).halfSize).toBeGreaterThanOrEqual(Math.hypot(DIORAMA.width, DIORAMA.depth) / 2);
  });

  it('snaps the frame to whole texels, moving it less than one texel', () => {
    const p: [number, number, number] = [12.34, 56.7, -8.9];
    const q = snapToTexel(p, 300);
    const texel = 600 / SHADOW_MAP_SIZE;
    expect(len(sub(q, p))).toBeLessThanOrEqual(texel);
    const again = snapToTexel(q, 300);
    expect(len(sub(again, q))).toBeLessThan(1e-9);
  });
});

describe('contact patches', () => {
  it('grows each footprint by the margin and keeps its turn', () => {
    expect(CONTACT_MARGIN).toBe(6);
    expect(contactPatches([{ x: 1, z: 2, width: 30, depth: 20, rotation: 0.3 }])).toEqual([{ x: 1, z: 2, width: 42, depth: 32, rotation: 0.3 }]);
    expect(contactPatches([{ x: 0, z: 0, width: 10, depth: 10 }])[0].rotation).toBe(0);
  });
});
