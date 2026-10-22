import { describe, expect, it } from 'vitest';
import { applyAction } from '../../sim/actions';
import { facadeRecipe } from '../../sim/facade';
import { floorSlices } from '../../sim/geometry';
import { designFor } from '../../sim/testUtils';
import type { Design } from '../../sim/types';
import { fastestMs } from '../../test/fastest';
import { planFaces } from '../parts/placement';
import { CHUNK_BAYS, CHUNK_FLOORS, ENTER_M, LEAVE_M, MAX_CHUNKS, chunkCells, chunkDistance, nearChunks, towerChunks } from './chunks';

const square = (patch: Partial<Design> = {}) => designFor('chicago', { shape: 'square', floors: 40, plateWidth: 30, ...patch }).design;
const none = new Set<string>();
const few = () => 100;

describe('wall chunks', () => {
  it('are 4 floors by 6 bays at most', () => {
    expect([CHUNK_FLOORS, CHUNK_BAYS, ENTER_M, LEAVE_M, MAX_CHUNKS]).toEqual([4, 6, 110, 130, 8]);
    for (const c of towerChunks(square())) {
      expect(c.floor1 - c.floor0).toBeLessThanOrEqual(4);
      expect(c.cell1 - c.cell0).toBeLessThanOrEqual(6);
      expect(c.cell1).toBeGreaterThan(c.cell0);
    }
  });

  it('cover each wall with whole cells only, on every floor of the chunk', () => {
    const { site, design } = designFor('new-york');
    const deco = applyAction(design, { type: 'apply_style_preset', style: 'art-deco' }, site);
    for (const d of [square({ taper: 0.4, floors: 60 }), deco, square({ shape: 'triangle' }), square({ shape: 'circle', taper: 0.3 })]) {
      const slices = floorSlices(d);
      for (const c of towerChunks(d))
        for (let f = c.floor0; f < c.floor1; f++) {
          const s = slices[f];
          const face = planFaces(d.shape, s.width, s.depth)[c.face];
          const [a, b] = chunkCells(d, s, face);
          expect(c.cell0).toBeGreaterThanOrEqual(a);
          expect(c.cell1).toBeLessThanOrEqual(b);
        }
    }
  });

  it('picks the walls in front of a close camera, and none behind', () => {
    const near = nearChunks(square(), [0, 82, 15 + 20], none, few);
    expect(near.length).toBeGreaterThan(0);
    for (const c of near) expect(c.normal![1]).toBeGreaterThan(0.9);
    expect(near.some((c) => c.floor0 <= 20 && c.floor1 > 20)).toBe(true);
    const ds = near.map((c) => chunkDistance(c, [0, 82, 35]));
    expect([...ds].sort((a, b) => a - b)).toEqual(ds);
  });

  it('takes nothing from far away', () => {
    expect(nearChunks(square(), [0, 80, 400], none, few)).toEqual([]);
  });

  it('keeps a chunk it already shows until 130 m, but only takes new ones inside 110 m', () => {
    const d = square();
    const camera: [number, number, number] = [0, 82, 15 + 135];
    const between = towerChunks(d).find((c) => c.normal![1] > 0.9 && chunkDistance(c, camera) > 112 && chunkDistance(c, camera) < 128)!;
    expect(between).toBeDefined();
    expect(nearChunks(d, camera, none, few).map((c) => c.key)).not.toContain(between.key);
    expect(nearChunks(d, camera, new Set([between.key]), few).map((c) => c.key)).toContain(between.key);
  });

  it('stays within 8 chunks and 3,000 parts', () => {
    expect(nearChunks(square(), [0, 82, 20], none, () => 700).length).toBeLessThanOrEqual(4);
    expect(nearChunks(square(), [0, 82, 20], none, () => 1).length).toBeLessThanOrEqual(8);
  });

  it('runs along the drum on a round tower', () => {
    const d = square({ shape: 'circle' });
    const bay = facadeRecipe(d).pattern.bayWidth;
    const near = nearChunks(d, [0, 82, 15 + 20], none, few);
    expect(near.length).toBeGreaterThan(0);
    for (const c of near) {
      expect(c.normal).toBeNull();
      expect(c.cell0).toBeGreaterThanOrEqual(0);
      expect(c.cell1).toBeLessThanOrEqual(Math.floor((Math.PI * 30) / bay));
      expect(c.centre[2]).toBeGreaterThan(0);
    }
  });

  it('is quick to choose', () => {
    const d = designFor('chicago', { shape: 'rectangle', floors: 150, plateWidth: 60, plateDepth: 40 }).design;
    towerChunks(d);
    expect(fastestMs(5, () => nearChunks(d, [0, 300, 60], none, few))).toBeLessThan(3);
  });

  it('keys a chunk by its whole extent, so a changed design never reuses an old build', () => {
    const c = towerChunks(square())[0];
    expect(c.key).toBe(`${c.floor0}-${c.floor1}:${c.face}:${c.cell0}-${c.cell1}`);
  });

  it("holds on to the chunks it shows unless a new one is clearly nearer, so the edge doesn't sweep", () => {
    const d = square();
    const camera: [number, number, number] = [0, 82, 15 + 60];
    const ranked = towerChunks(d)
      .filter((c) => c.normal![1] > 0.9)
      .sort((x, y) => chunkDistance(x, camera) - chunkDistance(y, camera));
    // Showing the 7 nearest and the 9th; the 8th is only a little nearer than the 9th.
    const ninth = ranked[8];
    expect(chunkDistance(ninth, camera) - chunkDistance(ranked[7], camera)).toBeLessThan(20);
    const shown = new Set([...ranked.slice(0, 7), ninth].map((c) => c.key));
    expect(nearChunks(d, camera, shown, few).map((c) => c.key)).toContain(ninth.key);
    expect(nearChunks(d, camera, none, few).map((c) => c.key)).not.toContain(ninth.key);
  });
});
