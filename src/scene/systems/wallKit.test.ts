import { describe, expect, it } from 'vitest';
import { applyAction } from '../../sim/actions';
import { floorUses } from '../../sim/analysis/massing';
import { facadeRecipe } from '../../sim/facade';
import { FLOOR_HEIGHT, floorSlices } from '../../sim/geometry';
import { rotateYXZ, type Part } from '../../sim/parts';
import { designFor } from '../../sim/testUtils';
import type { Design, StyleId } from '../../sim/types';
import { fastestMs } from '../../test/fastest';
import { chunkCells } from '../closeWalls/chunks';
import { isMechanicalFloor } from '../facadeDetail';
import { planFaces } from '../parts/placement';
import { entranceParts } from '../dressing/dressing';
import { AC_SHARE, wallKitParts } from './wallKit';

const homes = { retail: 0, office: 0, hotel: 0, residential: 100 };
const styled = (style: StyleId, patch: Partial<Design> = {}) => {
  const { site, design } = designFor('chicago');
  return { ...applyAction(design, { type: 'apply_style_preset', style }, site), floors: 40, useMix: homes, ...patch };
};
const acUnits = (parts: Part[]) => parts.filter((p) => p.material === 'steel' && !p.fine && p.scale[0] === 0.75);
const floorOf = (p: Part) => Math.floor(p.position[1] / FLOOR_HEIGHT);

describe('wall kit', () => {
  it('puts AC units under about 15% of home windows, on old styles only, and only on home or hotel floors', () => {
    expect(AC_SHARE).toBe(0.15);
    const d = styled('chicago-school');
    const slices = floorSlices(d);
    const bay = facadeRecipe(d).pattern.bayWidth;
    let windows = 0;
    for (const s of slices) {
      if (s.index === 0 || isMechanicalFloor(s.index, slices.length)) continue;
      for (const f of planFaces(d.shape, s.width, s.depth)) {
        const [a, b] = chunkCells(d, s, f);
        windows += b - a;
      }
    }
    void bay;
    const share = acUnits(wallKitParts(d)).length / windows;
    expect(share).toBeGreaterThan(AC_SHARE - 0.04);
    expect(share).toBeLessThan(AC_SHARE + 0.04);
    expect(acUnits(wallKitParts(styled('chicago-school', { useMix: { retail: 0, office: 100, hotel: 0, residential: 0 } })))).toHaveLength(0);
    expect(acUnits(wallKitParts(styled('international')))).toHaveLength(0);
  });

  it('sits each unit under its window, on its own floor’s wall, even on a setback tower', () => {
    for (const d of [styled('chicago-school', { shape: 'square' }), styled('art-deco', { shape: 'square', setbacks: 'wedding-cake', floors: 60 })]) {
      const slices = floorSlices(d);
      const uses = floorUses(d);
      const bay = facadeRecipe(d).pattern.bayWidth;
      const units = acUnits(wallKitParts(d));
      expect(units.length).toBeGreaterThan(0);
      for (const p of units) {
        const s = slices[floorOf(p)];
        expect(isMechanicalFloor(s.index, slices.length)).toBe(false);
        expect(['residential', 'hotel']).toContain(uses[s.index]);
        const [x, , z] = rotateYXZ(p.position, [0, -s.rotation, 0]);
        // Out from whichever wall it is on, and centred on a window cell along it.
        const out = Math.max(Math.abs(x) - s.width / 2, Math.abs(z) - s.depth / 2);
        expect(out).toBeGreaterThan(0.2);
        expect(out).toBeLessThan(0.4);
        const along = Math.abs(x) - s.width / 2 > Math.abs(z) - s.depth / 2 ? z : x;
        const k = along / bay - 0.5;
        expect(Math.abs(k - Math.round(k))).toBeLessThan(1e-6);
      }
    }
  });

  it('follows the drum on a round tower', () => {
    const d = styled('chicago-school', { shape: 'circle' });
    const slices = floorSlices(d);
    const units = acUnits(wallKitParts(d));
    expect(units.length).toBeGreaterThan(0);
    for (const p of units) {
      const r = Math.hypot(p.position[0], p.position[2]) - slices[floorOf(p)].width / 2;
      expect(r).toBeGreaterThan(0.15);
      expect(r).toBeLessThan(0.45);
    }
  });

  it('louvres over the front door and vent grilles at the base of every wall', () => {
    const d = styled('international', { shape: 'square' });
    const parts = wallKitParts(d);
    const slats = parts.filter((p) => p.fine && p.material === 'steel' && p.position[1] > 2.7 && p.position[1] < 3.4);
    expect(slats.length).toBeGreaterThanOrEqual(4);
    const vents = parts.filter((p) => !p.fine && p.material === 'steel' && p.position[1] < 1.2);
    const s = floorSlices(d)[0];
    const sides = new Set(vents.map((p) => (Math.abs(p.position[0]) > Math.abs(p.position[2]) ? (p.position[0] > 0 ? 'e' : 'w') : p.position[2] > 0 ? 'n' : 's')));
    expect(sides.size).toBe(4);
    for (const p of vents) expect(Math.max(Math.abs(p.position[0]) - s.width / 2, Math.abs(p.position[2]) - s.depth / 2)).toBeLessThan(0.3);
  });

  it('stays within budget and is quick on a 150-floor tower', () => {
    const d = styled('chicago-school', { floors: 150, plateWidth: 60 });
    const parts = wallKitParts(d);
    expect(parts.filter((p) => !p.fine).length).toBeLessThanOrEqual(3000);
    expect(parts.filter((p) => p.fine).length).toBeLessThanOrEqual(6000);
    expect(fastestMs(3, () => wallKitParts(d))).toBeLessThan(20);
  });

  it('AC units sit in the window, never sunk into the floor slab, at every window area', () => {
    for (const windowRatio of [0.2, 0.35, 0.5, 0.7, 0.95]) {
      const d = styled('chicago-school', { windowRatio });
      const slices = floorSlices(d);
      for (const p of wallKitParts(d).filter((q) => q.material === 'steel' && q.position[1] > 4)) {
        const s = slices[floorOf(p)];
        expect(p.position[1] - p.scale[1] / 2, `${windowRatio}`).toBeGreaterThanOrEqual(s.y + 0.05);
        expect(p.position[1] + p.scale[1] / 2, `${windowRatio}`).toBeLessThanOrEqual(s.y + 3.4);
      }
    }
  });

  it('keeps vents clear of the front door, and the louvres above the lobby glass', () => {
    for (const plateWidth of [20, 30, 40, 44]) {
      const d = styled('international', { shape: 'square', plateWidth, plateDepth: plateWidth });
      const s = floorSlices(d)[0];
      const width = Math.min(10, s.width * 0.4);
      const frontVents = wallKitParts(d).filter((p) => !p.fine && p.position[1] < 1.2 && p.position[2] > s.depth / 2 - 0.5);
      for (const v of frontVents) expect(Math.abs(v.position[0]), `${plateWidth}`).toBeGreaterThan(width / 2 + 2);
    }
    const d = styled('international', { shape: 'square' });
    const louvreBottom = Math.min(...wallKitParts(d).filter((p) => p.position[1] > 2.5 && p.position[1] < 3.5).map((p) => p.position[1] - p.scale[1] / 2));
    const lobby = entranceParts(d).find((p) => p.material === 'pane')!;
    expect(lobby.position[1] + lobby.scale[1] / 2).toBeLessThanOrEqual(louvreBottom);
  });
});
