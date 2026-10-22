import type { Part, PartMaterial, Vec3 } from '../../../sim/parts';
import { planFaces } from '../../parts/placement';
import { aroundPlan, atCorners, finial, lattice, pinnacle, placeAt, ribs, ring, roofSize, tier, windowPane } from '../kit';
import type { CrownBuilder } from '../types';

/** Spires and needles, each modelled on the building in its catalog entry. y = 0 is the roof; the tip is at H. */

const shift = (parts: Part[], dx: number, dz: number): Part[] => parts.map((p) => ({ ...p, position: [p.position[0] + dx, p.position[1], p.position[2] + dz] as Vec3 }));

/** A round segment of a mast or drum from y0 to y1. */
const drum = (shape: 'cylinder' | 'frustum' | 'octagon', y0: number, y1: number, w: number, material: PartMaterial, extra: Partial<Part> = {}): Part => ({
  shape,
  position: [0, (y0 + y1) / 2, 0],
  scale: [w, y1 - y0, w],
  material,
  ...extra,
});

const ringAt = (y: number, w: number, material: PartMaterial, fine = false): Part => ({
  shape: 'torus',
  position: [0, y, 0],
  scale: [w, Math.max(0.05, w * 0.06), w],
  material,
  ...(fine && { fine: true as const }),
});

/** One World Trade Center: an octagonal parapet, the radome drum, a mast in segments with maintenance rings and ladders, a beacon and the needle. */
const oneWtc: CrownBuilder = ({ H, ...ctx }) => {
  const r = roofSize({ H, ...ctx });
  const parts: Part[] = [
    drum('octagon', 0, 0.03 * H, 0.46 * r, 'accent'),
    drum('octagon', 0.03 * H, 0.045 * H, 0.5 * r, 'steel'),
    drum('cylinder', 0.045 * H, 0.11 * H, 0.26 * r, 'steel'),
    ringAt(0.11 * H, 0.3 * r, 'steel'),
  ];
  // The chamfered corners of the parapet.
  parts.push(...ring(8, 0.24 * r, 0.02 * H, () => ({ shape: 'wedge', position: [0, 0, 0], scale: [0.06 * r, 0.04 * H, 0.06 * r], material: 'accent' }), Math.PI / 8));
  const segs = 7;
  const y0 = 0.11 * H;
  const y1 = 0.9 * H;
  for (let i = 0; i < segs; i++) {
    const a = y0 + ((y1 - y0) * i) / segs;
    const b = y0 + ((y1 - y0) * (i + 1)) / segs;
    const w = r * (0.15 - 0.11 * (i / segs));
    parts.push(drum('frustum', a, b, w, 'steel'));
    parts.push(ringAt(b, w * 0.75, 'steel'));
    // Ladder rungs up one side.
    for (let k = 0; k < 5; k++) {
      const y = a + ((b - a) * (k + 0.5)) / 5;
      const t = (y - a) / (b - a);
      const rr = (w / 2) * (1 - 0.5 * t);
      parts.push({ shape: 'box', position: [0, y, rr + 0.08], scale: [Math.max(0.2, w * 0.15), 0.05, 0.05], material: 'steel', fine: true });
    }
  }
  // Light-weight panels between the rings.
  parts.push(...ribs(8, 0.075 * r, 0.02 * r, y0, y1, Math.max(0.08, 0.006 * r), 'steel', true));
  parts.push(drum('cylinder', 0.9 * H, 0.93 * H, 0.05 * r, 'light', { glow: true }));
  parts.push(drum('cylinder', 0.93 * H, H, Math.max(0.12, 0.015 * r), 'steel', { animate: 'blink' }));
  return parts;
};

/** Burj Khalifa: glass setbacks stepping in, each wrapped in vertical fins, until the core becomes a ribbed spire. */
const burj: CrownBuilder = (ctx) => {
  const { H } = ctx;
  const r = roofSize(ctx);
  const widths = [0.62, 0.5, 0.4, 0.31, 0.23];
  const parts: Part[] = [];
  widths.forEach((w, i) => {
    const a = i * 0.1 * H;
    const b = (i + 1) * 0.1 * H;
    parts.push({ shape: 'plan', position: [0, (a + b) / 2, 0], scale: [ctx.W * w, b - a, ctx.D * w], material: 'glass' });
    // Fins: thin steel blades standing proud of the glass all round.
    parts.push(
      ...aroundPlan(ctx, 0, Math.max(1.2, (ctx.W * w) / 5), (a + b) / 2, () => ({ shape: 'box', position: [0, 0, 0.15], scale: [0.12, (b - a) * 0.96, 0.35], material: 'steel', fine: true }), w),
    );
  });
  const s0 = 0.5 * H;
  const s1 = 0.95 * H;
  parts.push(drum('frustum', s0, 0.65 * H, 0.16 * r, 'steel'));
  parts.push(drum('frustum', 0.65 * H, 0.8 * H, 0.09 * r, 'steel'));
  parts.push(drum('frustum', 0.8 * H, s1, 0.05 * r, 'steel'));
  parts.push(...ribs(6, 0.085 * r, 0.015 * r, s0, s1, Math.max(0.1, 0.008 * r), 'steel'));
  parts.push(ringAt(0.6 * H, 0.2 * r, 'steel'), ringAt(0.75 * H, 0.12 * r, 'steel'));
  parts.push(drum('cylinder', s1, H, Math.max(0.1, 0.012 * r), 'steel', { animate: 'blink' }));
  return parts;
};

/** Petronas Towers: stepped drums ringed with pointed ribs, stainless rings between them, a ball, and a ringed needle. */
const petronas: CrownBuilder = (ctx) => {
  const { H } = ctx;
  const r = roofSize(ctx);
  const drums: [number, number, number][] = [
    [0, 0.17, 0.48],
    [0.17, 0.3, 0.38],
    [0.3, 0.41, 0.3],
    [0.41, 0.5, 0.22],
  ];
  const parts: Part[] = [];
  for (const [a, b, w] of drums) {
    parts.push(drum('cylinder', a * H, b * H, w * r, 'steel'));
    parts.push(ringAt(b * H, w * r * 1.08, 'steel'));
    // A crown of narrow ribs round each drum.
    parts.push(
      ...ring(16, (w * r) / 2 + 0.05, ((a + b) / 2) * H, () => ({ shape: 'box', position: [0, 0, 0], scale: [0.15, (b - a) * H * 0.9, 0.2], material: 'steel', fine: true })),
    );
  }
  parts.push(drum('frustum', 0.5 * H, 0.6 * H, 0.14 * r, 'steel'));
  parts.push({ shape: 'sphere', position: [0, 0.63 * H, 0], scale: [0.1 * r, 0.06 * H, 0.1 * r], material: 'steel' });
  parts.push(drum('cylinder', 0.66 * H, H, Math.max(0.12, 0.018 * r), 'steel', { animate: 'blink' }));
  for (let k = 0; k < 7; k++) parts.push(ringAt((0.7 + k * 0.035) * H, Math.max(0.4, 0.05 * r), 'steel', true));
  return parts;
};

/** Moscow State University: stacked tiers with corner pinnacles and lit windows, a ribbed gold spire, a wreath and a ruby star. */
const sevenSisters: CrownBuilder = (ctx) => {
  const { H } = ctx;
  const r = roofSize(ctx);
  const tiers: [number, number, number][] = [
    [0, 0.12, 0.55],
    [0.12, 0.21, 0.42],
    [0.21, 0.29, 0.32],
  ];
  const parts: Part[] = [];
  for (const [a, b, w] of tiers) {
    parts.push(...tier(ctx, a * H, b * H, w, 'body', { windows: 5, band: true }));
    parts.push(
      ...atCorners(ctx, w * 0.95, () => pinnacle(0, b * H, 0, Math.min(0.06 * H, 0.2 * w * r), Math.max(0.3, 0.05 * w * r), 'body', 4)),
    );
  }
  const s0 = 0.29 * H;
  const s1 = 0.86 * H;
  parts.push({ shape: 'cone', position: [0, (s0 + s1) / 2, 0], scale: [0.14 * r, s1 - s0, 0.14 * r], material: 'gold' });
  parts.push(...ribs(8, 0.072 * r, 0.004 * r, s0, s1, Math.max(0.08, 0.008 * r), 'gold'));
  parts.push({ shape: 'torus', position: [0, 0.88 * H, 0], scale: [0.08 * H, 0.02 * H, 0.02 * H], rotation: [Math.PI / 2, 0, 0], material: 'gold' });
  // The ruby star: five points round a centre, standing upright.
  const c = 0.94 * H;
  const L = 0.06 * H;
  parts.push({ shape: 'sphere', position: [0, c, 0], scale: [L * 0.5, L * 0.5, L * 0.3], material: 'ruby', glow: true });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    parts.push({ shape: 'pyramid', position: [Math.sin(a) * (L / 2), c + Math.cos(a) * (L / 2), 0], scale: [L * 0.4, L, L * 0.2], rotation: [0, 0, -a], material: 'ruby', glow: true });
  }
  return parts;
};

/** Empire State Building: setback shoulders, a finned lantern with tall lit windows, a dome, the stepped mast and an antenna. */
const empireState: CrownBuilder = (ctx) => {
  const { H } = ctx;
  const r = roofSize(ctx);
  const parts: Part[] = [...tier(ctx, 0, 0.08 * H, 0.62, 'body', { windows: 6, band: true }), ...tier(ctx, 0.08 * H, 0.16 * H, 0.5, 'body', { windows: 5, band: true })];
  const l0 = 0.16 * H;
  const l1 = 0.36 * H;
  const lw = 0.3 * r;
  parts.push({ shape: 'box', position: [0, (l0 + l1) / 2, 0], scale: [lw, l1 - l0, lw], material: 'accent' });
  // Tall windows on every side and aluminium fins between them.
  parts.push(
    ...ring(12, lw / 2 + 0.02, (l0 + l1) / 2, () => windowPane([lw * 0.12, (l1 - l0) * 0.75, 0.1]), Math.PI / 12),
  );
  parts.push(...ring(12, lw / 2 + 0.15, (l0 + l1) / 2, () => ({ shape: 'box', position: [0, 0, 0], scale: [0.18, (l1 - l0) * 0.98, 0.3], material: 'steel' })));
  parts.push({ shape: 'dome', position: [0, 0.4 * H, 0], scale: [lw * 1.05, 0.08 * H, lw * 1.05], material: 'accent' });
  const steps: [number, number, number][] = [
    [0.44, 0.54, 0.14],
    [0.54, 0.61, 0.1],
    [0.61, 0.67, 0.07],
  ];
  for (const [a, b, w] of steps) {
    parts.push(drum('cylinder', a * H, b * H, w * r, 'steel'));
    parts.push(ringAt(b * H, w * r * 1.2, 'steel'));
  }
  parts.push(drum('cylinder', 0.67 * H, H, Math.max(0.12, 0.02 * r), 'steel', { animate: 'blink' }));
  return parts;
};

/** Chrysler Building: tiers of stainless sunburst arches pierced by triangular windows, steel eagles, and the needle. */
const chrysler: CrownBuilder = (ctx) => {
  const { H } = ctx;
  const r = roofSize(ctx);
  const parts: Part[] = [{ shape: 'plan', position: [0, 0.03 * H, 0], scale: [ctx.W * 0.8, 0.06 * H, ctx.D * 0.8], material: 'body' }];
  // Eagle gargoyles leaning out from the corners.
  parts.push(
    ...atCorners(ctx, 0.78, () => {
      const e = Math.min(1, 0.05 * H);
      return [
        { shape: 'box', position: [0, 0.06 * H + e * 0.3, e * 0.6], scale: [e * 0.6, e * 0.6, e * 1.2], material: 'steel' },
        { shape: 'wedge', position: [0, 0.06 * H + e * 0.35, e * 1.6], scale: [e * 0.5, e * 0.5, e * 0.8], rotation: [0, Math.PI / 2, 0], material: 'steel' },
      ] satisfies Part[];
    }),
  );
  const tiers = 6;
  const t0 = 0.06;
  const t1 = 0.6;
  for (let k = 0; k < tiers; k++) {
    const a = (t0 + ((t1 - t0) * k) / tiers) * H;
    const b = (t0 + ((t1 - t0) * (k + 1)) / tiers) * H;
    const w = 0.74 - (0.44 * k) / (tiers - 1);
    const h = b - a;
    parts.push({ shape: 'plan', position: [0, a + h * 0.3, 0], scale: [ctx.W * w * 0.94, h * 0.6, ctx.D * w * 0.94], material: 'steel' });
    for (const f of planFaces(ctx.shape, ctx.W * w, ctx.D * w)) {
      const len = Math.min(f.length, ctx.W * w) * 0.92;
      const face: Part[] = [{ shape: 'arch', position: [0, a + h / 2, 0], scale: [len, h, 0.4], material: 'steel' }];
      // A sunburst of triangular windows inside the arch, fanning out from its foot.
      const n = 4;
      for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + (Math.PI * (i + 0.5)) / n;
        const R = Math.min(len * 0.25, h * 0.45);
        face.push({
          shape: 'wedge',
          position: [Math.sin(ang) * R, a + h * 0.15 + Math.cos(ang) * R * 0.8, 0.05],
          scale: [Math.min(len * 0.12, h * 0.3), Math.min(h * 0.45, len * 0.2), 0.12],
          rotation: [0, 0, -ang],
          material: 'light',
          glow: true,
          fine: true,
        });
      }
      parts.push(...face.map((p) => placeAt(p, [f.x, 0, f.z], f.yaw)));
    }
  }
  // Stainless ribs up the corners, and the needle.
  parts.push(...ribs(8, 0.36 * r, 0.08 * r, t0 * H, t1 * H, Math.max(0.1, 0.006 * r), 'steel', true));
  parts.push({ shape: 'cone', position: [0, (t1 * H + H) / 2, 0], scale: [0.07 * r, H - t1 * H, 0.07 * r], material: 'steel' });
  return parts;
};

/** One braced broadcast mast from y0 up to `top`, with dishes and guy rings. */
function broadcastMast(r: number, y0: number, top: number, H: number): Part[] {
  const lat = top - 0.12 * H;
  const parts: Part[] = [...lattice(y0, lat, 0.035 * r, 0.02 * r, 3, 6, Math.max(0.12, 0.006 * r), 'steel')];
  parts.push(drum('cylinder', lat, top, Math.max(0.12, 0.01 * r), 'steel', { animate: 'blink' }));
  for (const t of [0.3, 0.55]) {
    const y = y0 + (lat - y0) * t;
    parts.push({ shape: 'cylinder', position: [0.035 * r, y, 0], scale: [0.025 * r, 0.12, 0.025 * r], rotation: [0, 0, Math.PI / 2], material: 'steel', fine: true });
    parts.push({ shape: 'cylinder', position: [-0.03 * r, y + 1.5, 0], scale: [0.02 * r, 0.1, 0.02 * r], rotation: [Math.PI / 2, 0, 0], material: 'steel', fine: true });
  }
  for (const t of [0.4, 0.8]) parts.push(ringAt(y0 + (lat - y0) * t, 0.06 * r, 'steel', true));
  return parts;
}

/** Willis Tower: two broadcast masts of different heights on a plinth. */
const willis: CrownBuilder = (ctx) => {
  const { H } = ctx;
  const r = roofSize(ctx);
  return [
    { shape: 'box', position: [0, 0.025 * H, 0], scale: [ctx.W * 0.3, 0.05 * H, ctx.D * 0.3], material: 'steel' },
    ...shift(broadcastMast(r, 0.05 * H, H, H), -0.2 * ctx.W, 0.1 * ctx.D),
    ...shift(broadcastMast(r, 0.05 * H, 0.85 * H, H), 0.2 * ctx.W, -0.1 * ctx.D),
  ];
};

/** Lloyd's Building: a braced lattice tower with platforms, a crane gantry, service pods with ribbed panels, and a mast. */
const lloyds: CrownBuilder = (ctx) => {
  const { H } = ctx;
  const r = roofSize(ctx);
  const parts: Part[] = [{ shape: 'box', position: [0, 0.03 * H, 0], scale: [ctx.W * 0.5, 0.06 * H, ctx.D * 0.5], material: 'steel' }];
  parts.push(...lattice(0.06 * H, 0.85 * H, 0.2 * r, 0.13 * r, 4, 6, Math.max(0.15, 0.008 * r), 'accent'));
  for (const t of [0.35, 0.6]) parts.push({ shape: 'box', position: [0, (0.06 + 0.79 * t) * H, 0], scale: [0.26 * r, 0.15, 0.26 * r], material: 'girder' });
  // The gantry crane across the top, with its hoist.
  parts.push({ shape: 'box', position: [0, 0.86 * H, 0], scale: [0.5 * r, 0.02 * H, 0.04 * r], material: 'girder' });
  parts.push({ shape: 'box', position: [0.15 * r, 0.83 * H, 0], scale: [0.05 * r, 0.03 * H, 0.05 * r], material: 'accent' });
  // Service pods on two sides, clad in ribbed panels.
  for (const side of [-1, 1]) {
    const x = side * 0.32 * ctx.W;
    const h = 0.3 * H;
    parts.push({ shape: 'box', position: [x, 0.06 * H + h / 2, 0], scale: [0.12 * ctx.W, h, 0.16 * ctx.D], material: 'body' });
    for (let k = 0; k < 6; k++)
      parts.push({ shape: 'box', position: [x + side * 0.061 * ctx.W, 0.06 * H + (h * (k + 0.5)) / 6, 0], scale: [0.04, h / 6 - 0.15, 0.15 * ctx.D], material: 'body', fine: true });
  }
  parts.push(drum('cylinder', 0.06 * H, H, Math.max(0.15, 0.03 * r), 'steel', { animate: 'blink' }));
  parts.push(...finial(0, 0.86 * H, 0.2 * r, 0.04 * H, 'accent'));
  return parts;
};

export const SPIRE_CROWNS = {
  spire: oneWtc,
  'stepped-needle': burj,
  'ringed-pinnacle': petronas,
  'star-spire': sevenSisters,
  'mooring-mast': empireState,
  'deco-arches': chrysler,
  'twin-antennas': willis,
  'lattice-mast': lloyds,
} satisfies Record<string, CrownBuilder>;
