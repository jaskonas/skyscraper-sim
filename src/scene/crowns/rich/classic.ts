import { strutPart, type Part, type PartMaterial } from '../../../sim/parts';
import { planCorners, planFaces } from '../../parts/placement';
import { aroundPlan, atCorners, finial, pinnacle, placeAt, ring, roofSize, tier, windowPane } from '../kit';
import type { CrownBuilder, CrownContext } from '../types';

/** Gothic and classical crowns. y = 0 is the roof; the tip is at H. */

const slab = (ctx: CrownContext, y0: number, y1: number, w: number, material: PartMaterial): Part => ({
  shape: 'plan',
  position: [0, (y0 + y1) / 2, 0],
  scale: [ctx.W * w, y1 - y0, ctx.D * w],
  material,
});

const solid = (shape: Part['shape'], y0: number, y1: number, w: number, material: PartMaterial, extra: Partial<Part> = {}): Part => ({
  shape,
  position: [0, (y0 + y1) / 2, 0],
  scale: [w, y1 - y0, w],
  material,
  ...extra,
});

/** A dormer: a little gabled window standing on a sloping roof, facing out. */
const dormer = (w: number, h: number, roof: PartMaterial): Part[] => [
  { shape: 'box', position: [0, h * 0.35, 0], scale: [w, h * 0.7, w * 0.8], material: 'body', fine: true },
  windowPane([w * 0.6, h * 0.5, 0.05], [0, h * 0.35, w * 0.41]),
  { shape: 'pyramid', position: [0, h * 0.85, 0], scale: [w * 1.1, h * 0.3, w * 0.9], material: roof, fine: true },
];

/** Woolworth Building: a steep copper roof with dormers, crocketed corner pinnacles, lancet tracery, and a lantern. */
const woolworth: CrownBuilder = (ctx) => {
  const { H } = ctx;
  const r = roofSize(ctx);
  const parts: Part[] = [...tier(ctx, 0, 0.15 * H, 0.9, 'stone', { windows: 6, band: true })];
  // Tracery: a row of pointed arches round the top tier.
  parts.push(
    ...aroundPlan(ctx, 0, Math.max(1.5, (r * 0.9) / 6), 0.075 * H, () => ({ shape: 'lancet', position: [0, 0, 0.05], scale: [Math.min(1.4, (r * 0.9) / 8), Math.min(0.1 * H, 4), 0.15], material: 'stone', fine: true }), 0.9),
  );
  const c0 = 0.15 * H;
  const c1 = 0.86 * H;
  const cw = 0.74;
  parts.push({ shape: 'plan-cone', position: [0, (c0 + c1) / 2, 0], scale: [ctx.W * cw, c1 - c0, ctx.D * cw], material: 'copper' });
  // Dormers in two rows up each face of the roof.
  for (const f of planFaces(ctx.shape, ctx.W * cw, ctx.D * cw)) {
    const out = Math.hypot(f.x, f.z);
    for (const t of [0.18, 0.42])
      for (const s of [-0.22, 0.22]) {
        const y = c0 + (c1 - c0) * t;
        const inward = out * (1 - t);
        const along = f.length * s * (1 - t);
        const d = Math.min(1.6, 0.04 * r);
        const at: [number, number, number] = [(f.x / out) * inward + Math.cos(f.yaw) * along, y, (f.z / out) * inward - Math.sin(f.yaw) * along];
        parts.push(...dormer(d, Math.min(2.2, 0.05 * H), 'copper').map((p) => placeAt(p, at, f.yaw)));
      }
  }
  parts.push(...atCorners(ctx, 0.92, () => pinnacle(0, 0, 0, 0.55 * H, Math.max(0.5, 0.06 * r), 'stone', 8)));
  parts.push(solid('octagon', c1, 0.95 * H, Math.max(0.5, 0.08 * r), 'light', { glow: true }));
  parts.push(...finial(0, 0.95 * H, 0, 0.05 * H, 'copper'));
  return parts;
};

/** Tribune Tower: an octagonal lantern with lancet windows, held up by buttress arms leaping from corner pinnacles. */
const tribune: CrownBuilder = (ctx) => {
  const { H } = ctx;
  const r = roofSize(ctx);
  const lw = 0.45 * r;
  const parts: Part[] = [solid('octagon', 0, 0.8 * H, lw, 'stone'), solid('octagon', 0.4 * H, 0.6 * H, lw * 0.98, 'light', { glow: true })];
  parts.push(...ring(8, lw / 2, 0.5 * H, () => ({ shape: 'lancet', position: [0, 0, 0.03], scale: [lw * 0.22, 0.3 * H, 0.1], material: 'light', glow: true, fine: true }), Math.PI / 8));
  // The pierced parapet round the lantern's top.
  parts.push(...ring(16, lw / 2 + 0.1, 0.8 * H + 0.3, () => ({ shape: 'box', position: [0, 0, 0], scale: [lw * 0.08, 0.6, 0.3], material: 'stone', fine: true })));
  for (const c of planCorners(ctx.shape, ctx.W * 0.9, ctx.D * 0.9)) {
    parts.push(...pinnacle(c.x, 0, c.z, 0.6 * H, Math.max(0.5, 0.08 * r), 'stone', 6));
    // Two arms from each pinnacle to the lantern, one high and one low.
    for (const [from, to] of [
      [0.3, 0.5],
      [0.45, 0.7],
    ])
      parts.push(strutPart([c.x, from * H, c.z], [c.x * 0.28, to * H, c.z * 0.28], Math.max(0.3, 0.03 * r), 'stone'));
  }
  parts.push(solid('cone', 0.8 * H, 0.95 * H, lw, 'copper'));
  parts.push(...finial(0, 0.95 * H, 0, 0.05 * H, 'copper'));
  return parts;
};

/** Ribs following a dome's curve from its foot to its crown, as short straight pieces. */
function domeRibs(n: number, R: number, y0: number, h: number, thickness: number, material: PartMaterial): Part[] {
  const out: Part[] = [];
  const steps = 3;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    for (let k = 0; k < steps; k++) {
      const t0 = k / steps;
      const t1 = (k + 1) / steps;
      const pt = (t: number): [number, number, number] => {
        const rr = R * Math.sqrt(Math.max(0, 1 - t * t)) + thickness / 2;
        return [Math.sin(a) * rr, y0 + h * t, Math.cos(a) * rr];
      };
      out.push(strutPart(pt(t0), pt(t1), thickness, material));
    }
  }
  return out;
}

/** Singer Building: a columned drum carrying a ribbed copper dome with oculi, and a columned lantern. */
const singer: CrownBuilder = (ctx) => {
  const { H } = ctx;
  const r = roofSize(ctx);
  const dw = 0.55 * r;
  const parts: Part[] = [...tier(ctx, 0, 0.25 * H, 0.7, 'stone', { windows: 5, band: true }), solid('cylinder', 0.25 * H, 0.37 * H, dw, 'stone')];
  parts.push(...ring(16, dw / 2 + 0.1, 0.31 * H, () => ({ shape: 'cylinder', position: [0, 0, 0], scale: [0.35, 0.11 * H, 0.35], material: 'stone', fine: true })));
  parts.push({ shape: 'dome', position: [0, 0.56 * H, 0], scale: [dw, 0.38 * H, dw], material: 'copper' });
  parts.push(...domeRibs(12, dw / 2, 0.37 * H, 0.38 * H, Math.max(0.15, 0.012 * r), 'copper'));
  parts.push(
    ...ring(8, dw * 0.42, 0.45 * H, () => ({ shape: 'torus', position: [0, 0, 0], scale: [Math.min(1.2, dw * 0.08), Math.min(1.2, dw * 0.08), 0.3], rotation: [Math.PI / 2, 0, 0], material: 'stone', fine: true }), Math.PI / 8),
  );
  const lw = 0.12 * r;
  parts.push(solid('cylinder', 0.75 * H, 0.87 * H, lw, 'light', { glow: true }));
  parts.push(...ring(6, lw / 2 + 0.05, 0.81 * H, () => ({ shape: 'cylinder', position: [0, 0, 0], scale: [0.15, 0.12 * H, 0.15], material: 'stone', fine: true })));
  parts.push(solid('cone', 0.87 * H, 0.95 * H, lw * 1.1, 'copper'));
  parts.push(...finial(0, 0.95 * H, 0, 0.05 * H, 'copper'));
  return parts;
};

/** Metropolitan Life Tower: a campanile with clocks on four sides, an arcaded loggia, a gold pyramid and a lantern. */
const metLife: CrownBuilder = (ctx) => {
  const { H } = ctx;
  const sw = 0.45;
  const side = roofSize(ctx) * sw;
  const parts: Part[] = [slab(ctx, 0, 0.42 * H, sw, 'stone')];
  parts.push(...atCorners(ctx, sw * 1.02, () => ({ shape: 'box', position: [0, 0.21 * H, 0], scale: [side * 0.12, 0.42 * H, side * 0.12], material: 'stone' })));
  for (const f of planFaces(ctx.shape, ctx.W * sw, ctx.D * sw)) {
    const dial = Math.min(side * 0.6, 0.2 * H);
    const clock: Part[] = [
      { shape: 'cylinder', position: [0, 0.28 * H, 0.08], scale: [dial, 0.12, dial], rotation: [Math.PI / 2, 0, 0], material: 'light', glow: true },
      { shape: 'box', position: [0, 0.28 * H + dial * 0.15, 0.18], scale: [dial * 0.05, dial * 0.32, 0.05], material: 'steel', fine: true },
      { shape: 'box', position: [dial * 0.1, 0.28 * H, 0.18], scale: [dial * 0.22, dial * 0.05, 0.05], material: 'steel', fine: true },
    ];
    // The loggia's arcade: four arches on each side.
    const span = Math.min(f.length, side) * 0.9;
    for (let k = 0; k < 4; k++)
      clock.push({ shape: 'arch', position: [(-0.375 + k * 0.25) * span, 0.49 * H, 0.05], scale: [span * 0.22, 0.1 * H, 0.3], material: 'stone' });
    parts.push(...clock.map((p) => placeAt(p, [f.x, 0, f.z], f.yaw)));
  }
  parts.push(slab(ctx, 0.42 * H, 0.44 * H, sw * 1.05, 'stone'), slab(ctx, 0.54 * H, 0.56 * H, sw * 1.05, 'stone'));
  parts.push(slab(ctx, 0.44 * H, 0.54 * H, sw * 0.7, 'interior'));
  parts.push({ shape: 'pyramid', position: [0, 0.69 * H, 0], scale: [side * 0.95, 0.26 * H, side * 0.95], material: 'gold' });
  parts.push(solid('octagon', 0.8 * H, 0.9 * H, side * 0.18, 'light', { glow: true }));
  parts.push(...finial(0, 0.9 * H, 0, 0.1 * H, 'gold'));
  return parts;
};

/** The Plaza: a dentilled stone cornice, a steep copper mansard with dormers, iron cresting, and corner turrets. */
const plaza: CrownBuilder = (ctx) => {
  const { H } = ctx;
  const r = roofSize(ctx);
  const parts: Part[] = [slab(ctx, 0, 0.12 * H, 1.02, 'stone'), slab(ctx, 0.12 * H, 0.16 * H, 1.05, 'stone')];
  parts.push(...aroundPlan(ctx, 0, 0.6, 0.1 * H, () => ({ shape: 'box', position: [0, 0, 0.08], scale: [0.25, Math.min(0.3, 0.05 * H), 0.25], material: 'stone', fine: true }), 1.02));
  parts.push(slab(ctx, 0.16 * H, 0.45 * H, 0.92, 'copper'), slab(ctx, 0.45 * H, 0.72 * H, 0.84, 'copper'), slab(ctx, 0.72 * H, 0.8 * H, 0.74, 'copper'));
  parts.push(
    ...aroundPlan(ctx, 0, Math.max(3, r / 5), 0.2 * H, () => dormer(Math.min(1.4, 0.05 * r), Math.min(0.28 * H, 2.4), 'copper').map((p) => ({ ...p, position: [p.position[0], p.position[1], p.position[2] + 0.4] as [number, number, number] })), 0.9),
  );
  // Iron cresting along the flat top.
  parts.push(...aroundPlan(ctx, 0, 0.8, 0.83 * H, () => ({ shape: 'cylinder', position: [0, 0, 0], scale: [0.08, 0.06 * H, 0.08], material: 'copper', fine: true }), 0.74));
  parts.push(
    ...atCorners(ctx, 0.92, () => [
      solid('octagon', 0, 0.7 * H, Math.max(0.8, 0.08 * r), 'stone'),
      solid('ogee', 0.7 * H, H, Math.max(1, 0.1 * r), 'copper'),
    ]),
  );
  return parts;
};

/** Reliance Building: a deep cornice carried on brackets, with a dentil course and a frieze. The roof stays open. */
const reliance: CrownBuilder = (ctx) => {
  const { H } = ctx;
  const parts: Part[] = [slab(ctx, 0, 0.4 * H, 1, 'body'), slab(ctx, 0.12 * H, 0.32 * H, 1.015, 'accent'), slab(ctx, 0.4 * H, 0.85 * H, 1.06, 'accent'), slab(ctx, 0.85 * H, H, 1.1, 'accent')];
  // Brackets under the overhang, and a dentil course along its foot.
  parts.push(...aroundPlan(ctx, 0, 1.2, 0.55 * H, () => ({ shape: 'box', position: [0, 0, 0.25], scale: [0.3, 0.5 * H, 0.5], material: 'accent', fine: true })));
  parts.push(...aroundPlan(ctx, 0, 0.45, 0.42 * H, () => ({ shape: 'box', position: [0, 0, 0.45], scale: [0.18, 0.08 * H, 0.16], material: 'accent', fine: true }), 1.04));
  return parts;
};

export const CLASSIC_CROWNS = {
  'gothic-pinnacles': woolworth,
  'flying-buttresses': tribune,
  'dome-lantern': singer,
  'clock-tower': metLife,
  mansard: plaza,
  cornice: reliance,
} satisfies Record<string, CrownBuilder>;
