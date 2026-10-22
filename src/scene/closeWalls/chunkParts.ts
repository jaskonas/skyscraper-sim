import { floorUses } from '../../sim/analysis/massing';
import { facadeRecipe } from '../../sim/facade';
import { floorSlices } from '../../sim/geometry';
import type { Part } from '../../sim/parts';
import * as THREE from 'three';
import type { Design, Palette } from '../../sim/types';
import { placeAtAnchor, worldAnchor } from '../detail/frame';
import { GLASS_RECESS, wallBay } from '../detail/wallBay';
import { isMechanicalFloor, roomBlinds, roomDark } from '../facadeDetail';
import { TILE_HEIGHT_M, openingFor } from '../facadeTile';
import { facadeWall, surfacesFor, type Surfaces } from '../materials/library';
import { NIGHT_LIGHTS, windowLit } from '../nightWindows';
import { alongFace, planFaces } from '../parts/placement';
import type { Chunk } from './chunks';

/** The painted facade's glass also reflects the sky; the 3D panes stand in for that by being a little lighter. */
const PANE_SKY = new THREE.Color('#bcd4e6');
const PANE_SKY_SHARE = 0.35;

/** Colours and materials of the 3D walls: the painted facade's own, so the swap doesn't show. */
export function chunkLook(design: Design): { palette: Palette; surfaces: Surfaces } {
  const colors = facadeRecipe(design).colors;
  const glass = '#' + new THREE.Color(design.palette.glass).lerp(PANE_SKY, PANE_SKY_SHARE).getHexString();
  return {
    palette: { ...design.palette, body: colors.wall, accent: colors.frame, glass },
    surfaces: { wall: facadeWall(design), trim: surfacesFor(design).trim },
  };
}

const box = (position: [number, number, number], scale: [number, number, number], material: Part['material']): Part => ({
  shape: 'box',
  position,
  scale,
  material,
});

/** Blinds glow a little dimmer than the room behind them (the painted facade's 0.8). */
const blindGlow = (hex: string) => '#' + new THREE.Color(hex).multiplyScalar(0.8).getHexString();

/** A drum's bay is bent to the curve: wide boxes are halved, and every piece stands on the arc at its own spot. */
function splitWide(parts: Part[], limit: number): Part[] {
  const out: Part[] = [];
  for (const p of parts) {
    if (p.shape !== 'box' || p.rotation || p.scale[0] <= limit) {
      out.push(p);
      continue;
    }
    const half = p.scale[0] / 2;
    for (const dx of [-half / 2, half / 2]) out.push({ ...p, position: [p.position[0] + dx, p.position[1], p.position[2]], scale: [half, p.scale[1], p.scale[2]] });
  }
  return out;
}

/**
 * One chunk of wall as true 3D bays, in building coordinates: the Close-up's wall bay for every whole
 * cell on every floor, with the shader facade's own lit, dark and blinded windows, plus sills under punched
 * windows and caps on glass grids. The tower's own slab bands stay as they are.
 */
export function chunkParts(design: Design, chunk: Chunk): Part[] {
  const recipe = facadeRecipe(design);
  const bay = recipe.pattern.bayWidth;
  const slices = floorSlices(design);
  const uses = floorUses(design);
  const o = openingFor(design.windowRatio);
  const H = TILE_HEIGHT_M;
  const round = design.shape === 'circle';
  const out: Part[] = [];
  for (let f = chunk.floor0; f < Math.min(chunk.floor1, slices.length); f++) {
    if (isMechanicalFloor(f, slices.length)) continue;
    const slice = slices[f];
    const face = planFaces(design.shape, slice.width, slice.depth)[round ? 0 : chunk.face];
    const use = uses[f] ?? 'office';
    for (let cell = chunk.cell0; cell < chunk.cell1; cell++) {
      const s = (cell + 0.5) * bay;
      const lit = windowLit(cell, f, NIGHT_LIGHTS[use].lit);
      const dark = roomDark(cell, f);
      const blinds = roomBlinds(cell, f);
      const glassLook = (p: Part): Part => ({
        ...p,
        material: dark ? 'interior' : 'pane',
        ...(lit && { glow: true, glowColor: NIGHT_LIGHTS[use].color }),
      });
      const pieces = wallBay(recipe, bay, 'body', design.windowRatio);
      // The first piece is the slab band, which the tower already has.
      const local = pieces.parts.slice(1).map((p) => (p.material === 'glass' ? glassLook(p) : p));
      for (const u of pieces.panes) {
        local.push(glassLook(u.pane));
        if (blinds > 0) {
          const top = u.pane.position[1] + u.pane.scale[1] / 2;
          const bottom = Math.max(u.pane.position[1] - u.pane.scale[1] / 2, (1 - blinds) * H);
          if (top > bottom)
            local.push({
              // Just behind the glass: lit with the room (a little dimmer, like the painted blinds), dim in a dark room.
              ...box([u.pane.position[0], (top + bottom) / 2, -GLASS_RECESS - 0.05], [u.pane.scale[0] - 0.02, top - bottom, 0.02], dark ? 'interior' : 'blind'),
              ...(lit && { glow: true, glowColor: blindGlow(NIGHT_LIGHTS[use].color) }),
            });
        }
      }
      if (recipe.pattern.glassWall) {
        // Pressure caps over the mullions at the bay edges, standing proud of the glass.
        local.push(box([-bay / 2, H / 2, 0.06], [0.07, H, 0.12], 'accent'));
        if (cell === chunk.cell1 - 1) local.push(box([bay / 2, H / 2, 0.06], [0.07, H, 0.12], 'accent'));
      } else {
        // A sill under the opening, sloping water off the wall.
        local.push(box([-bay / 2 + (o.x + o.w / 2) * bay, o.y * H - 0.035, 0.05], [o.w * bay + 0.12, 0.07, 0.16], 'accent'));
      }
      if (round) {
        for (const p of splitWide(local, bay / 2)) {
          const a = worldAnchor(slice, alongFace(design.shape, slice.width, slice.depth, face, s + p.position[0]));
          out.push(placeAtAnchor({ ...p, position: [0, p.position[1], p.position[2]] }, a));
        }
      } else {
        const a = worldAnchor(slice, alongFace(design.shape, slice.width, slice.depth, face, s));
        for (const p of local) out.push(placeAtAnchor(p, a));
      }
    }
  }
  return out;
}
