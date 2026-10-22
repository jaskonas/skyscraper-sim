import { describe, expect, it } from 'vitest';
import { floorUses } from '../../sim/analysis/massing';
import { facadeRecipe } from '../../sim/facade';
import { FLOOR_HEIGHT, floorSlices } from '../../sim/geometry';
import type { Part } from '../../sim/parts';
import { designFor } from '../../sim/testUtils';
import type { Design } from '../../sim/types';
import { fastestMs } from '../../test/fastest';
import { isMechanicalFloor, roomBlinds, roomDark } from '../facadeDetail';
import { TILE_HEIGHT_M, openingFor } from '../facadeTile';
import { NIGHT_LIGHTS, windowLit } from '../nightWindows';
import { planFaces } from '../parts/placement';
import { chunkLook, chunkParts } from './chunkParts';
import { towerChunks, type Chunk } from './chunks';

const chicago = (patch: Partial<Design> = {}) =>
  designFor('chicago', { style: 'chicago-school', facade: 'masonry', windowPattern: 'chicago', shape: 'square', floors: 40, plateWidth: 30, ...patch }).design;
const front = (d: Design, floor = 20): Chunk =>
  towerChunks(d).find((c) => c.floor0 <= floor && c.floor1 > floor && (c.normal ? c.normal[1] > 0.9 : c.centre[2] > Math.abs(c.centre[0])))!;
const panesOf = (parts: Part[]) => parts.filter((p) => (p.material === 'pane' || p.material === 'interior') && p.scale[2] < 0.06);

describe('chunk parts', () => {
  it("builds every floor's cells as 3D bays, without the tower's own slab band", () => {
    const d = chicago();
    const c = front(d);
    const parts = chunkParts(d, c);
    const perBay = facadeRecipe(d).pattern.panes.length;
    expect(panesOf(parts)).toHaveLength((c.floor1 - c.floor0) * (c.cell1 - c.cell0) * perBay);
    const plant = towerChunks(d).find((k) => k.floor0 <= 29 && k.floor1 > 29)!;
    expect(chunkParts(d, plant).some((p) => p.position[1] >= 29 * FLOOR_HEIGHT && p.position[1] < 30 * FLOOR_HEIGHT)).toBe(false);
    const slab = FLOOR_HEIGHT - TILE_HEIGHT_M;
    expect(parts.some((p) => p.material === 'accent' && Math.abs(p.scale[1] - slab) < 1e-9 && p.scale[2] === 0.4)).toBe(false);
  });

  it('lights, darkens and blinds the same windows as the shader', () => {
    const d = chicago({ useMix: { retail: 0, office: 50, hotel: 0, residential: 50 } });
    const uses = floorUses(d);
    const slices = floorSlices(d);
    let lit = 0;
    for (const c of towerChunks(d).filter((c) => c.normal && c.normal[1] > 0.9)) {
      const parts = chunkParts(d, c);
      for (let f = c.floor0; f < c.floor1; f++)
        for (let cell = c.cell0; cell < c.cell1; cell++) {
          // Plant floors keep their louvres on the shader facade.
          if (isMechanicalFloor(f, slices.length)) continue;
          const y0 = slices[f].y;
          const x = (cell + 0.5) * facadeRecipe(d).pattern.bayWidth;
          const here = panesOf(parts).filter((p) => p.position[1] > y0 && p.position[1] < y0 + FLOOR_HEIGHT && Math.abs(p.position[0] - x) < 1.6);
          expect(here.length).toBeGreaterThan(0);
          const on = windowLit(cell, f, NIGHT_LIGHTS[uses[f]].lit);
          for (const p of here) {
            expect(!!p.glow).toBe(on);
            if (on) expect(p.glowColor).toBe(NIGHT_LIGHTS[uses[f]].color);
            expect(p.material).toBe(roomDark(cell, f) ? 'interior' : 'pane');
          }
          if (on) lit++;
          const blinds = parts.filter((p) => p.material === 'blind' && p.position[1] > y0 && p.position[1] < y0 + FLOOR_HEIGHT && Math.abs(p.position[0] - x) < 1.6);
          expect(blinds.length > 0).toBe(roomBlinds(cell, f) > 0);
          for (const b of blinds) expect(b.position[1] + b.scale[1] / 2).toBeCloseTo(y0 + (openingFor(d.windowRatio).y + openingFor(d.windowRatio).h) * TILE_HEIGHT_M, 1);
        }
    }
    expect(lit).toBeGreaterThan(0);
  });

  it('sits on the wall it replaces, even on a twisted tower', () => {
    for (const p of chunkParts(chicago(), front(chicago()))) {
      expect(p.position[2]).toBeGreaterThanOrEqual(14.4);
      expect(p.position[2]).toBeLessThanOrEqual(15.3);
    }
    const twisted = chicago({ twist: 90 });
    const slices = floorSlices(twisted);
    for (const c of towerChunks(twisted).slice(0, 40))
      for (const p of chunkParts(twisted, c)) {
        const s = slices[Math.min(slices.length - 1, Math.floor(p.position[1] / FLOOR_HEIGHT))];
        const f = planFaces('square', s.width, s.depth)[c.face];
        const yaw = f.yaw + s.rotation;
        const out = p.position[0] * Math.sin(yaw) + p.position[2] * Math.cos(yaw) - Math.hypot(f.x, f.z);
        expect(Math.abs(out)).toBeLessThan(1);
      }
  });

  it('bends to the drum on a round tower', () => {
    const d = chicago({ shape: 'circle' });
    const bay = facadeRecipe(d).pattern.bayWidth;
    const parts = chunkParts(d, front(d));
    expect(parts.length).toBeGreaterThan(20);
    for (const p of parts) {
      const r = Math.hypot(p.position[0], p.position[2]);
      expect(r).toBeGreaterThanOrEqual(14.3);
      expect(r).toBeLessThanOrEqual(15.4);
      if (p.shape === 'box' && !p.rotation?.[0]) expect(p.scale[0]).toBeLessThanOrEqual(bay / 2 + 0.13);
    }
  });

  it('adds sills under punched windows and caps on glass grids', () => {
    const d = chicago();
    const c = front(d);
    const sills = chunkParts(d, c).filter((p) => p.material === 'accent' && p.position[2] > 15.02 && p.scale[1] < 0.1);
    expect(sills).toHaveLength((c.floor1 - c.floor0) * (c.cell1 - c.cell0));
    const grid = chicago({ windowPattern: 'flush-grid', facade: 'glass' });
    const caps = chunkParts(grid, front(grid)).filter((p) => p.material === 'accent' && p.position[2] > 15.02 && Math.abs(p.scale[1] - TILE_HEIGHT_M) < 1e-9);
    expect(caps.length).toBeGreaterThan(0);
  });

  it('wears the facade colours and the facade wall material', () => {
    const grid = chicago({ windowPattern: 'flush-grid' });
    const look = chunkLook(grid);
    expect(look.palette.body).toBe(facadeRecipe(grid).colors.wall);
    expect(look.surfaces).toEqual({ wall: 'metal-panel', trim: 'terracotta' });
  });

  it('is quick to build', () => {
    const d = chicago({ floors: 120 });
    const c = front(d, 60);
    expect(fastestMs(5, () => chunkParts(d, c))).toBeLessThan(8);
  });
});
