import { mulberry32 } from '../../layout';
import { rotateYXZ, strutPart, type Part, type PartMaterial, type Vec3 } from '../../../sim/parts';
import { planFaces } from '../../parts/placement';
import { aroundPlan, atCorners, finial, lattice, roofSize } from '../kit';
import type { CrownBuilder, CrownContext } from '../types';

/** Crowns from around the world and eco experiments. y = 0 is the roof; the tip is at H. */

const slab = (ctx: CrownContext, y0: number, y1: number, w: number, material: PartMaterial, extra: Partial<Part> = {}): Part => ({
  shape: 'plan',
  position: [0, (y0 + y1) / 2, 0],
  scale: [ctx.W * w, y1 - y0, ctx.D * w],
  material,
  ...extra,
});

/** Jin Mao / Taipei 101: tiers each crowned by flared eaves on bracket rows, glass between them, and a ringed finial spire. */
const jinMao: CrownBuilder = (ctx) => {
  const { H } = ctx;
  const r = roofSize(ctx);
  const tiers: [number, number, number][] = [
    [0, 0.17, 0.8],
    [0.19, 0.34, 0.64],
    [0.36, 0.5, 0.5],
    [0.52, 0.64, 0.38],
  ];
  const parts: Part[] = [];
  tiers.forEach(([a, b, w], i) => {
    parts.push(slab(ctx, a * H, b * H, w, 'body'));
    if (i > 0) parts.push(slab(ctx, (tiers[i - 1][1] + 0.005) * H, a * H, w * 0.96, 'glass', { glow: true }));
    const eave = Math.min(2.5, 0.06 * w * r, (b - a) * H * 0.8);
    const y = b * H;
    // The eaves: ramps leaning out from the wall all round, with bracket blocks beneath.
    parts.push(
      ...aroundPlan(ctx, 0, Math.max(1, (w * r) / 8), y - eave * 0.2, () => ({ shape: 'wedge', position: [0, 0, eave / 2], scale: [eave, eave * 0.45, Math.max(1, (w * r) / 8)], rotation: [0, -Math.PI / 2, 0], material: 'accent' }), w),
    );
    parts.push(...aroundPlan(ctx, 0, Math.max(0.8, (w * r) / 12), y - eave * 0.55, () => ({ shape: 'box', position: [0, 0, eave * 0.15], scale: [0.25, eave * 0.25, eave * 0.3], material: 'accent', fine: true }), w));
    // Upturned corner tips.
    parts.push(...atCorners(ctx, w, () => ({ shape: 'cone', position: [0, y, eave * 0.9], scale: [eave * 0.3, eave * 0.8, eave * 0.3], rotation: [0.9, 0, 0], material: 'accent' })));
  });
  const s0 = 0.66 * H;
  parts.push({ shape: 'cone', position: [0, (s0 + 0.97 * H) / 2, 0], scale: [0.08 * r, 0.97 * H - s0, 0.08 * r], material: 'gold' });
  for (const t of [0.72, 0.8, 0.88]) parts.push({ shape: 'torus', position: [0, t * H, 0], scale: [0.06 * r * (1.2 - t), 0.01 * H, 0.06 * r * (1.2 - t)], material: 'gold' });
  parts.push(...finial(0, 0.97 * H, 0, 0.03 * H, 'gold'));
  return parts;
};

/** Kingdom Centre: two finned prongs around a parabolic opening, joined high up by a glass sky bridge. */
const kingdomCentre: CrownBuilder = (ctx) => {
  const { H, W, D } = ctx;
  const parts: Part[] = [];
  for (const side of [-1, 1]) {
    parts.push({ shape: 'box', position: [side * 0.35 * W, H / 2, 0], scale: [0.3 * W, H, 0.9 * D], material: 'body' });
    // Vertical fins on the prong's outer faces.
    for (let k = 0; k < 6; k++) {
      const z = -0.4 * D + (0.8 * D * (k + 0.5)) / 6;
      parts.push({ shape: 'box', position: [side * 0.5 * W + side * 0.05, H / 2, z], scale: [0.12, H * 0.96, 0.15], material: 'steel', fine: true });
      parts.push({ shape: 'box', position: [side * 0.35 * W, H / 2, 0.45 * D + 0.05], scale: [0.12, H * 0.96, 0.12], material: 'steel', fine: true });
    }
  }
  // The parabolic arch along the inner edges, below the bridge.
  const half = 0.2 * W;
  const yOf = (x: number) => 0.15 * H + 0.5 * H * (1 - (x / half) ** 2);
  for (let k = 0; k < 10; k++) {
    const x0 = -half + (2 * half * k) / 10;
    const x1 = -half + (2 * half * (k + 1)) / 10;
    parts.push(strutPart([x0, yOf(x0), 0.44 * D], [x1, yOf(x1), 0.44 * D], Math.max(0.2, 0.01 * W), 'steel'));
  }
  parts.push({ shape: 'box', position: [0, 0.75 * H, 0], scale: [0.42 * W, 0.1 * H, 0.5 * D], material: 'glass', glow: true });
  for (let k = 0; k < 12; k++)
    parts.push({ shape: 'box', position: [-0.2 * W + (0.4 * W * (k + 0.5)) / 12, 0.8 * H + 0.5, 0.25 * D], scale: [0.06, 1, 0.06], material: 'steel', fine: true });
  return parts;
};

/** Shanghai World Financial Center: two legs and a bridge framing a trapezoid hole, gridded with mullions; an observation floor glows in the bridge. */
const swfc: CrownBuilder = (ctx) => {
  const { H, W, D } = ctx;
  const parts: Part[] = [
    { shape: 'box', position: [-0.39 * W, H / 2, 0], scale: [0.22 * W, H, D], material: 'body' },
    { shape: 'box', position: [0.39 * W, H / 2, 0], scale: [0.22 * W, H, D], material: 'body' },
    { shape: 'box', position: [0, 0.925 * H, 0], scale: [W, 0.15 * H, D], material: 'body' },
    // The hole's sloping top corners make it a trapezoid.
    { shape: 'wedge', position: [-0.22 * W, 0.8 * H, 0], scale: [0.12 * W, 0.1 * H, D * 0.98], rotation: [Math.PI, 0, 0], material: 'body' },
    { shape: 'wedge', position: [0.22 * W, 0.8 * H, 0], scale: [0.12 * W, 0.1 * H, D * 0.98], rotation: [Math.PI, Math.PI, 0], material: 'body' },
    { shape: 'box', position: [0, 0.87 * H, 0], scale: [0.55 * W, 0.04 * H, 0.9 * D], material: 'light', glow: true },
  ];
  for (const f of planFaces('square', W, D))
    for (let k = 0; k < 9; k++) {
      const s = (-0.45 + (0.9 * k) / 8) * f.length;
      const along = [Math.cos(f.yaw) * s, -Math.sin(f.yaw) * s];
      parts.push({ shape: 'box', position: [f.x + along[0] + Math.sin(f.yaw) * 0.06, H / 2, f.z + along[1] + Math.cos(f.yaw) * 0.06], scale: [0.1, H * 0.98, 0.1], rotation: [0, f.yaw, 0], material: 'steel', fine: true });
    }
  return parts;
};

/** The Gherkin: a glass dome wrapped in a diagrid spiralling both ways, a lens at the top and a glowing restaurant ring. */
const gherkin: CrownBuilder = (ctx) => {
  const { H } = ctx;
  const R = roofSize(ctx) / 2;
  const parts: Part[] = [{ shape: 'dome', position: [0, H / 2, 0], scale: [2 * R, H, 2 * R], material: 'glass', glow: true }];
  const t = Math.max(0.08, 0.008 * R * 2);
  const pt = (a: number, u: number): Vec3 => {
    const rr = R * Math.sqrt(Math.max(0, 1 - u * u)) + t / 2;
    return [Math.sin(a) * rr, H * u, Math.cos(a) * rr];
  };
  const n = 16;
  const steps = 3;
  for (const dir of [-1, 1])
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      for (let k = 0; k < steps; k++) {
        const u0 = (0.9 * k) / steps;
        const u1 = (0.9 * (k + 1)) / steps;
        parts.push({ ...strutPart(pt(a0 + dir * u0 * 1.2, u0), pt(a0 + dir * u1 * 1.2, u1), t, 'steel'), fine: true });
      }
    }
  parts.push({ shape: 'sphere', position: [0, H * 0.97, 0], scale: [R * 0.45, H * 0.06, R * 0.45], material: 'steel' });
  const ringY = 0.55 * H;
  const ringR = R * Math.sqrt(1 - 0.55 * 0.55);
  parts.push({ shape: 'torus', position: [0, ringY, 0], scale: [2 * ringR * 1.02, 0.05 * H, 2 * ringR * 1.02], material: 'light', glow: true });
  return parts;
};

/** The Shard: glass shards leaning in, framed at the edges and banded with mullions, with an open spire frame between their tips. */
const shard: CrownBuilder = (ctx) => {
  const { H } = ctx;
  const r = roofSize(ctx);
  const tilt = 0.12;
  const thickness = 0.5;
  const tops = [1, 0.85, 0.75, 0.9];
  const parts: Part[] = [];
  planFaces(ctx.shape, ctx.W * 0.9, ctx.D * 0.9).forEach((f, i) => {
    const top = tops[i % tops.length] * H;
    const h = top / Math.cos(tilt);
    const y = top - 0.5 * (h * Math.cos(tilt) + thickness * Math.sin(tilt));
    const w = f.length * 0.55;
    const rot: Vec3 = [-tilt, f.yaw, 0];
    const centre: Vec3 = [f.x, y, f.z];
    const local = (v: Vec3): Vec3 => {
      const o = rotateYXZ(v, rot);
      return [centre[0] + o[0], centre[1] + o[1], centre[2] + o[2]];
    };
    parts.push({ shape: 'box', position: centre, scale: [w, h, thickness], rotation: rot, material: 'glass', glow: true });
    for (const side of [-1, 1]) parts.push({ shape: 'box', position: local([(side * w) / 2, 0, 0.3]), scale: [0.2, h, 0.2], rotation: rot, material: 'steel', fine: true });
    for (let k = 1; k < 6; k++) parts.push({ shape: 'box', position: local([0, -h / 2 + (h * k) / 6, 0.3]), scale: [w, 0.1, 0.1], rotation: rot, material: 'steel', fine: true });
  });
  parts.push(...lattice(0.55 * H, H, 0.05 * r, 0.01 * r, 3, 4, Math.max(0.1, 0.005 * r), 'steel'));
  return parts;
};

/** Strata SE1: three turbines with nacelles and five-bladed rotors, set in round venturi openings in a finned frame. The deck stays put. */
const strata: CrownBuilder = (ctx) => {
  const { H, W, D } = ctx;
  const parts: Part[] = [slab(ctx, 0, 0.25 * H, 0.95, 'body'), { shape: 'box', position: [0, 0.95 * H, 0], scale: [0.95 * W, 0.1 * H, 0.3 * D], material: 'steel' }];
  for (const x of [-0.475, -0.155, 0.155, 0.475]) parts.push({ shape: 'box', position: [x * W, 0.6 * H, 0], scale: [0.04 * W, 0.7 * H, 0.3 * D], material: 'steel' });
  // Fins across the frame's face.
  for (let k = 0; k < 16; k++) parts.push({ shape: 'box', position: [-0.47 * W + (0.94 * W * (k + 0.5)) / 16, 0.6 * H, 0.15 * D + 0.05], scale: [0.08, 0.7 * H, 0.1], material: 'steel', fine: true });
  const diameter = Math.min(0.28 * W, 0.6 * H);
  for (const x of [-0.31, 0, 0.31]) {
    const hub: Vec3 = [x * W, 0.6 * H, 0];
    parts.push({ shape: 'torus', position: hub, scale: [diameter * 1.15, 0.3 * D, diameter * 1.15], rotation: [Math.PI / 2, 0, 0], material: 'steel' });
    parts.push({ shape: 'cylinder', position: [hub[0], hub[1], -0.3], scale: [0.18 * diameter, 1.2, 0.18 * diameter], rotation: [Math.PI / 2, 0, 0], material: 'steel' });
    parts.push({ shape: 'cylinder', position: hub, scale: [0.12 * diameter, 0.4, 0.12 * diameter], rotation: [Math.PI / 2, 0, 0], material: 'steel' });
    for (let b = 0; b < 5; b++) parts.push({ shape: 'box', position: hub, scale: [0.07 * diameter, diameter, 0.08], rotation: [0, 0, (b * Math.PI) / 5], material: 'steel', animate: 'spin' });
  }
  return parts;
};

/** Bosco Verticale: planters round the edge, a grove of trees of mixed sizes, shrubs, and a timber pergola. */
const boscoVerticale: CrownBuilder = (ctx) => {
  const { H, W, D } = ctx;
  const parts: Part[] = [slab(ctx, 0, 0.3 * H, 0.95, 'concrete')];
  const deck = 0.3 * H;
  parts.push(...aroundPlan(ctx, 0, 2.5, deck + 0.3, () => ({ shape: 'box', position: [0, 0, -0.5], scale: [2.3, 0.6, 1], material: 'concrete', fine: true }), 0.9));
  const rand = mulberry32(Math.round(W * 97 + D * 13));
  const reach = Math.min(W, D) * 0.36;
  const trees = 22;
  for (let i = 0; i < trees; i++) {
    // The first tree is the tallest and reaches the crown's full height.
    const size = i === 0 ? 1 : 0.45 + 0.5 * rand();
    const h = (H - deck) * size;
    const a = rand() * Math.PI * 2;
    const d = reach * Math.sqrt(rand());
    const x = Math.sin(a) * d * (W / Math.min(W, D));
    const z = Math.cos(a) * d * (D / Math.min(W, D));
    const crown = Math.min(h * 0.6, 3.5);
    const trunk = h - crown * 0.6;
    parts.push({ shape: 'cylinder', position: [x, deck + trunk / 2, z], scale: [Math.max(0.15, h * 0.06), trunk, Math.max(0.15, h * 0.06)], material: 'wood' });
    const blobs = 2 + (i % 2);
    for (let k = 0; k < blobs; k++) {
      const s = crown * (1 - k * 0.25);
      const blob: Part = { shape: 'sphere', position: [x + (k - 1) * s * 0.2, deck + h - s / 2 - k * s * 0.15, z + (k % 2) * s * 0.15], scale: [s, s, s], material: 'foliage' };
      parts.push(k > 0 ? { ...blob, fine: true } : blob);
    }
  }
  for (let i = 0; i < 12; i++) {
    const a = rand() * Math.PI * 2;
    const d = reach * (0.6 + 0.4 * rand());
    parts.push({ shape: 'sphere', position: [Math.sin(a) * d, deck + 0.35, Math.cos(a) * d], scale: [0.9, 0.7, 0.9], material: 'foliage', fine: true });
  }
  // A small timber pergola.
  const ph = Math.min(2.4, (H - deck) * 0.7);
  for (const [px, pz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ])
    parts.push({ shape: 'box', position: [px * 1.5, deck + ph / 2, pz * 1.2], scale: [0.15, ph, 0.15], material: 'wood' });
  for (const pz of [-1.2, 1.2]) parts.push({ shape: 'box', position: [0, deck + ph, pz], scale: [3.4, 0.15, 0.15], material: 'wood' });
  return parts;
};

export const WORLD_CROWNS = {
  pagoda: jinMao,
  'sky-bridge-arch': kingdomCentre,
  'open-frame': swfc,
  'glass-dome': gherkin,
  'glass-shards': shard,
  'wind-turbines': strata,
  'roof-forest': boscoVerticale,
} satisfies Record<string, CrownBuilder>;
