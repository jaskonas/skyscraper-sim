import type { FacadeRecipe } from '../../sim/facade';
import { FLOOR_HEIGHT } from '../../sim/geometry';
import { strutPart, type Part, type PartMaterial } from '../../sim/parts';
import { TILE_HEIGHT_M, openingFor } from '../facadeTile';

/** One window pane and the dim room behind it, kept apart so night mode can light them. */
export interface PaneUnit {
  pane: Part;
  room: Part;
}

export interface BayPieces {
  parts: Part[];
  panes: PaneUnit[];
}

/** How deep the glass sits behind the wall face, metres. */
export const GLASS_RECESS = 0.3;
const WALL_DEPTH = 0.3;

const box = (position: [number, number, number], scale: [number, number, number], material: PartMaterial): Part => ({
  shape: 'box',
  position,
  scale,
  material,
});

/**
 * One bay of one floor, in real 3D, in the bay's own frame: x runs along the wall from -width/2 to
 * width/2, y is up from the floor (0 to FLOOR_HEIGHT), z points out of the wall (the face is z = 0).
 * Window panes come from the same catalog data and opening size that paint the main tower's tile.
 */
export function wallBay(recipe: FacadeRecipe, width: number, wallMaterial: PartMaterial, windowRatio = recipe.windowRatio): BayPieces {
  const { pattern, spandrel } = recipe;
  const H = TILE_HEIGHT_M;
  const o = openingFor(windowRatio);
  const left = -width / 2;
  const x0 = left + o.x * width;
  const w = o.w * width;
  const y0 = o.y * H;
  const h = o.h * H;
  const archH = pattern.arch ? h * 0.22 : 0;
  const t = Math.max(0.05, pattern.frame * width);
  const zWall = -WALL_DEPTH / 2;
  const parts: Part[] = [];
  const panes: PaneUnit[] = [];

  // Slab edge between floors, sticking out a little, in the accent colour like the main tower's bands.
  parts.push(box([0, H + (FLOOR_HEIGHT - H) / 2, -0.1], [width, FLOOR_HEIGHT - H, 0.4], 'accent'));
  // Wall around the opening: below (the spandrel), above, left and right.
  parts.push(box([0, y0 / 2, zWall], [width, y0, WALL_DEPTH], wallMaterial));
  parts.push(box([0, (y0 + h + H) / 2, zWall], [width, H - y0 - h, WALL_DEPTH], wallMaterial));
  parts.push(box([(left + x0) / 2, y0 + h / 2, zWall], [x0 - left, h, WALL_DEPTH], wallMaterial));
  parts.push(box([(x0 + w + width / 2) / 2, y0 + h / 2, zWall], [width / 2 - x0 - w, h, WALL_DEPTH], wallMaterial));

  let cursor = 0;
  for (const p of pattern.panes) {
    // Wall-coloured piers fill any gap inside the opening between panes.
    if (p.x0 > cursor + 1e-9) {
      const gx = x0 + cursor * w;
      const gw = (p.x0 - cursor) * w;
      parts.push(box([gx + gw / 2, y0 + h / 2, zWall], [gw, h, WALL_DEPTH], wallMaterial));
    }
    cursor = p.x1;
    const px = x0 + p.x0 * w;
    const pw = (p.x1 - p.x0) * w;
    const ph = h - archH;
    const cx = px + pw / 2;
    panes.push({
      pane: box([cx, y0 + ph / 2, -GLASS_RECESS], [pw, ph, 0.05], 'glass'),
      room: box([cx, y0 + ph / 2, -GLASS_RECESS - 1.05], [pw, ph, 2], 'interior'),
    });
    if (archH > 0) {
      // A pointed head: two ramps rising to meet in the middle.
      parts.push({ shape: 'wedge', position: [px + pw / 4, y0 + ph + archH / 2, -GLASS_RECESS], scale: [pw / 2, archH, 0.05], rotation: [0, Math.PI, 0], material: 'glass' });
      parts.push({ shape: 'wedge', position: [px + (3 * pw) / 4, y0 + ph + archH / 2, -GLASS_RECESS], scale: [pw / 2, archH, 0.05], material: 'glass' });
    }
    const zf = -GLASS_RECESS + 0.06;
    parts.push(box([cx, y0 + t / 2, zf], [pw, t, 0.08], 'accent'));
    parts.push(box([cx, y0 + ph - t / 2, zf], [pw, t, 0.08], 'accent'));
    parts.push(box([px + t / 2, y0 + ph / 2, zf], [t, ph, 0.08], 'accent'));
    parts.push(box([px + pw - t / 2, y0 + ph / 2, zf], [t, ph, 0.08], 'accent'));
  }
  if (cursor < 1 - 1e-9) {
    const gx = x0 + cursor * w;
    const gw = (1 - cursor) * w;
    parts.push(box([gx + gw / 2, y0 + h / 2, zWall], [gw, h, WALL_DEPTH], wallMaterial));
  }
  if (pattern.diagonals) {
    const z = -GLASS_RECESS + 0.08;
    parts.push(strutPart([x0, y0, z], [x0 + w, y0 + h, z], t, 'accent'));
    parts.push(strutPart([x0, y0 + h, z], [x0 + w, y0, z], t, 'accent'));
  }

  // Spandrel decoration in relief on the wall below the window.
  if (spandrel.motif === 'chevron') {
    const top = y0 * 0.85;
    for (let i = 0; i < 8; i++) {
      const a: [number, number, number] = [left + (i / 8) * width, i % 2 === 0 ? top * 0.25 : top, 0.04];
      const b: [number, number, number] = [left + ((i + 1) / 8) * width, i % 2 === 0 ? top : top * 0.25, 0.04];
      parts.push(strutPart(a, b, 0.1, 'accent'));
    }
  } else if (spandrel.motif === 'stripes') {
    parts.push(box([0, y0 * 0.325, 0.04], [width, y0 * 0.25, 0.08], 'accent'));
    parts.push(box([0, y0 * 0.725, 0.04], [width, y0 * 0.25, 0.08], 'accent'));
  }
  return { parts, panes };
}
