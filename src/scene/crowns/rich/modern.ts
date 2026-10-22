import { strutPart, type Part, type PartMaterial } from '../../../sim/parts';
import { planFaces } from '../../parts/placement';
import { aroundPlan, atCorners, finial, lattice, placeAt, roofSize, tier, windowPane } from '../kit';
import type { CrownBuilder, CrownContext } from '../types';

/** Modern crowns. y = 0 is the roof; the tip is at H. Open roofs keep their deck where the simple crown has it. */

const slab = (ctx: CrownContext, y0: number, y1: number, w: number, material: PartMaterial, extra: Partial<Part> = {}): Part => ({
  shape: 'plan',
  position: [0, (y0 + y1) / 2, 0],
  scale: [ctx.W * w, y1 - y0, ctx.D * w],
  material,
  ...extra,
});

/** 40 Wall Street: setback tiers with corner piers and lit windows, a copper pyramid with dormers, and a spire. */
const fortyWall: CrownBuilder = (ctx) => {
  const { H } = ctx;
  const r = roofSize(ctx);
  const parts: Part[] = [];
  const tiers: [number, number, number][] = [
    [0, 0.18, 0.75],
    [0.18, 0.34, 0.6],
    [0.34, 0.48, 0.46],
  ];
  for (const [a, b, w] of tiers) {
    parts.push(...tier(ctx, a * H, b * H, w, 'accent', { windows: 5 }));
    parts.push(...atCorners(ctx, w, () => ({ shape: 'box', position: [0, ((a + b) / 2) * H, 0], scale: [0.06 * w * r, (b - a) * H, 0.06 * w * r], material: 'accent' })));
  }
  const p0 = 0.48 * H;
  const p1 = 0.86 * H;
  const pw = 0.44;
  parts.push({ shape: 'plan-cone', position: [0, (p0 + p1) / 2, 0], scale: [ctx.W * pw, p1 - p0, ctx.D * pw], material: 'copper' });
  for (const f of planFaces(ctx.shape, ctx.W * pw, ctx.D * pw)) {
    const out = Math.hypot(f.x, f.z);
    const t = 0.3;
    const d = Math.min(1, 0.03 * r);
    const at: [number, number, number] = [(f.x / out) * out * (1 - t), p0 + (p1 - p0) * t, (f.z / out) * out * (1 - t)];
    parts.push(
      ...[
        { shape: 'box', position: [0, d * 0.4, 0], scale: [d, d * 0.8, d], material: 'copper', fine: true },
        { shape: 'pyramid', position: [0, d, 0], scale: [d * 1.1, d * 0.5, d], material: 'copper', fine: true },
      ].map((p) => placeAt(p as Part, at, f.yaw)),
    );
  }
  parts.push({ shape: 'cone', position: [0, (p1 + H) / 2, 0], scale: [0.04 * r, H - p1, 0.04 * r], material: 'steel' });
  return parts;
};

/** Transamerica Pyramid: a tall pyramid in bands of lit windows, two wings for the lifts and stairs, and a lit spire. */
const transamerica: CrownBuilder = (ctx) => {
  const { H } = ctx;
  const r = roofSize(ctx);
  const top = 0.82 * H;
  const parts: Part[] = [{ shape: 'plan-cone', position: [0, top / 2, 0], scale: [ctx.W, top, ctx.D], material: 'accent' }];
  // Windows in bands up every face, stepping in with the slope.
  const bands = 7;
  for (const f of planFaces(ctx.shape, ctx.W, ctx.D)) {
    const out = Math.hypot(f.x, f.z);
    const slope = Math.atan2(out, top);
    for (let b = 0; b < bands; b++) {
      const t = (b + 0.5) / bands;
      const n = Math.max(1, Math.round(5 * (1 - t)));
      for (let k = 0; k < n; k++) {
        const along = ((k + 0.5) / n - 0.5) * f.length * (1 - t) * 0.8;
        const inward = out * (1 - t) + 0.05;
        const at: [number, number, number] = [(f.x / out) * inward + Math.cos(f.yaw) * along, top * t, (f.z / out) * inward - Math.sin(f.yaw) * along];
        parts.push(placeAt(windowPane([Math.min(1.6, f.length * 0.06), Math.min(0.06 * top, 2), 0.1], [0, 0, 0], { rotation: [-slope, 0, 0] }), at, f.yaw));
      }
    }
  }
  // The two wings, leaning in with the pyramid.
  for (const side of [-1, 1])
    parts.push({ shape: 'wedge', position: [side * 0.38 * ctx.W, 0.3 * top, 0], scale: [0.14 * ctx.W, 0.6 * top, 0.22 * ctx.D], rotation: [0, side > 0 ? Math.PI : 0, 0], material: 'accent' });
  parts.push({ shape: 'cone', position: [0, top + 0.06 * H, 0], scale: [0.05 * r, 0.12 * H, 0.05 * r], material: 'light', glow: true });
  parts.push({ shape: 'cone', position: [0, 0.94 * H + 0.03 * H, 0], scale: [0.02 * r, 0.06 * H, 0.02 * r], material: 'steel' });
  return parts;
};

/** Citigroup Center: the 45° roof in a grid of mullions, low side walls and a lit top edge. */
const citigroup: CrownBuilder = (ctx) => {
  const { H, W, D } = ctx;
  const parts: Part[] = [{ shape: 'wedge', position: [0, H / 2, 0], scale: [W, H, D], material: 'accent' }];
  const y = (x: number) => H * (0.5 - x / W) + 0.05;
  const t = Math.max(0.08, Math.min(0.15, 0.01 * W));
  for (let i = 0; i <= 10; i++) {
    const z = -D / 2 + (D * (i + 0.5)) / 11;
    parts.push({ ...strutPart([-W / 2 + 0.05, y(-W / 2 + 0.05), z], [W / 2 - 0.05, y(W / 2 - 0.05), z], t, 'steel'), fine: true });
  }
  for (let j = 1; j < 12; j++) {
    const x = -W / 2 + (W * j) / 12;
    parts.push({ ...strutPart([x, y(x), -D / 2 + 0.05], [x, y(x), D / 2 - 0.05], t, 'steel'), fine: true });
  }
  for (const side of [-1, 1]) parts.push({ shape: 'wedge', position: [0, H / 2, side * (D / 2 - 0.15)], scale: [W, H, 0.3], material: 'body' });
  parts.push({ shape: 'box', position: [-W / 2 + 0.2, H - 0.15, 0], scale: [0.3, 0.3, D * 0.98], material: 'light', glow: true, fine: true });
  return parts;
};

/** 550 Madison (AT&T): a split pediment with a round oculus in the notch, a dentilled cornice and acroteria at the ends. */
const att: CrownBuilder = (ctx) => {
  const { H, W, D } = ctx;
  const parts: Part[] = [
    slab(ctx, 0, 0.36 * H, 1, 'body'),
    slab(ctx, 0.36 * H, 0.4 * H, 1.03, 'accent'),
    { shape: 'wedge', position: [-0.28 * W, 0.7 * H, 0], scale: [0.44 * W, 0.6 * H, 0.9 * D], rotation: [0, Math.PI, 0], material: 'accent' },
    { shape: 'wedge', position: [0.28 * W, 0.7 * H, 0], scale: [0.44 * W, 0.6 * H, 0.9 * D], material: 'accent' },
    { shape: 'torus', position: [0, 0.62 * H, 0], scale: [0.14 * W, 0.92 * D, 0.14 * W], rotation: [Math.PI / 2, 0, 0], material: 'accent' },
  ];
  parts.push(...aroundPlan(ctx, 0, 0.5, 0.33 * H, () => ({ shape: 'box', position: [0, 0, 0.1], scale: [0.2, Math.min(0.35, 0.05 * H), 0.2], material: 'accent', fine: true })));
  for (const side of [-1, 1]) parts.push(...finial(side * 0.48 * W, 0.4 * H, 0, Math.min(0.3 * H, 3), 'accent'));
  return parts;
};

/** Bank of America Plaza: an open gold lattice pyramid round a tall obelisk, glowing at night. */
const boaPlaza: CrownBuilder = (ctx) => {
  const { H } = ctx;
  const r = roofSize(ctx);
  const parts: Part[] = [slab(ctx, 0, 0.17 * H, 0.5, 'body'), slab(ctx, 0.17 * H, 0.2 * H, 0.52, 'gold', { glow: true })];
  parts.push(...lattice(0.2 * H, 0.85 * H, 0.21 * r, 0.02 * r, 4, 6, Math.max(0.15, 0.01 * r), 'gold').map((p) => ({ ...p, glow: true })));
  parts.push({ shape: 'box', position: [0, 0.52 * H, 0], scale: [0.06 * r, 0.64 * H, 0.06 * r], material: 'gold', glow: true });
  parts.push({ shape: 'pyramid', position: [0, 0.89 * H, 0], scale: [0.06 * r, 0.08 * H, 0.06 * r], material: 'gold', glow: true });
  parts.push(...finial(0, 0.93 * H, 0, 0.07 * H, 'gold'));
  return parts;
};

/** Seagram Building: a bronze fascia with its mullions running up past the roof line. The roof kit sits on the deck. */
const seagram: CrownBuilder = (ctx) => {
  const { H } = ctx;
  const parts: Part[] = [slab(ctx, 0, 0.42 * H, 0.96, 'accent'), slab(ctx, 0.42 * H, 0.5 * H, 0.965, 'accent')];
  // The mullions are the crown's outline (its tallest part), so they are drawn at every distance.
  parts.push(...aroundPlan(ctx, 0, 1.5, 0.5 * H, () => ({ shape: 'box', position: [0, 0, 0.05], scale: [0.12, H, 0.15], material: 'accent' }), 0.96));
  return parts;
};

/** Barbican: an overhanging concrete cap, its soffit coffered with ribs and its edge in bush-hammered fins. */
const barbican: CrownBuilder = (ctx) => {
  const { H } = ctx;
  const parts: Part[] = [slab(ctx, 0, 0.3 * H, 0.8, 'concrete'), slab(ctx, 0.3 * H, H, 1.12, 'concrete')];
  // Soffit ribs running out under the overhang.
  parts.push(...aroundPlan(ctx, 0, 1.2, 0.3 * H - 0.15, () => ({ shape: 'box', position: [0, 0, -0.6], scale: [0.2, 0.3, 1.6], material: 'concrete', fine: true }), 1.05));
  // Fins down the cap's face.
  parts.push(...aroundPlan(ctx, 0, 0.6, 0.65 * H, () => ({ shape: 'box', position: [0, 0, 0.08], scale: [0.18, 0.6 * H, 0.16], material: 'concrete', fine: true }), 1.12));
  return parts;
};

export const MODERN_CROWNS = {
  stepped: fortyWall,
  pointed: transamerica,
  sloped: citigroup,
  'split-pediment': att,
  'gold-obelisk': boaPlaza,
  flat: seagram,
  'concrete-cap': barbican,
} satisfies Record<string, CrownBuilder>;
