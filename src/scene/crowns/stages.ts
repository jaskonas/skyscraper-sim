import type { CrownStage } from '../../sim/catalog/crowns';
import type { Part } from '../../sim/parts';
import { planCorners } from '../parts/placement';
import type { CrownContext } from './types';

/** Turns declarative stages into parts. */
export function buildStages(stages: readonly CrownStage[], ctx: CrownContext): Part[] {
  const { W, D, H } = ctx;
  const parts: Part[] = [];
  for (const s of stages) {
    const w = s.w * W;
    const d = (s.d ?? s.w) * D;
    const h = (s.y1 - s.y0) * H;
    const y = ((s.y0 + s.y1) / 2) * H;
    const [ox, oz] = s.offset ?? [0, 0];
    const spread = s.spread ?? 1;
    let spots: [number, number][];
    if (s.at === 'corners') {
      spots = planCorners(ctx.shape, W * spread, D * spread).map((c) => [c.x, c.z]);
    } else if (s.at === 'grid') {
      spots = [];
      for (const gx of [-1, 0, 1]) for (const gz of [-1, 0, 1]) spots.push([(gx * W * spread) / 3, (gz * D * spread) / 3]);
    } else {
      spots = [[0, 0]];
    }
    for (const [x, z] of spots) {
      const part: Part = {
        shape: s.shape,
        position: [x + ox * W, y, z + oz * D],
        scale: [w, h, d],
        material: s.material,
      };
      if (s.rotY) part.rotation = [0, s.rotY, 0];
      if (s.glow) part.glow = true;
      if (s.animate) part.animate = s.animate;
      parts.push(part);
    }
  }
  return parts;
}
