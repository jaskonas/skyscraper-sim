import type { CustomCrownId } from '../../sim/catalog/crowns';
import { strutPart, type Part } from '../../sim/parts';
import { planCorners, planFaces } from '../parts/placement';
import type { CrownBuilder } from './types';

/** Tribune Tower: a central lantern held up by stone arms leaping from corner pinnacles. */
const flyingButtresses: CrownBuilder = ({ shape, W, D, H }) => {
  const r = Math.min(W, D);
  const parts: Part[] = [
    { shape: 'cylinder', position: [0, 0.4 * H, 0], scale: [0.45 * r, 0.8 * H, 0.45 * r], material: 'stone' },
    { shape: 'cone', position: [0, 0.9 * H, 0], scale: [0.45 * r, 0.2 * H, 0.45 * r], material: 'copper' },
    { shape: 'cylinder', position: [0, 0.65 * H, 0], scale: [0.46 * r, 0.12 * H, 0.46 * r], material: 'light', glow: true },
  ];
  for (const c of planCorners(shape, W * 0.9, D * 0.9)) {
    parts.push({ shape: 'cone', position: [c.x, 0.3 * H, c.z], scale: [0.1 * r, 0.6 * H, 0.1 * r], material: 'stone' });
    parts.push(strutPart([c.x, 0.45 * H, c.z], [c.x * 0.25, 0.7 * H, c.z * 0.25], 0.04 * r, 'stone'));
  }
  return parts;
};

/** The Shard: tall glass panes leaning inward that never quite meet. */
const glassShards: CrownBuilder = ({ shape, W, D, H }) => {
  const tilt = 0.12;
  const thickness = 0.5;
  const tops = [1, 0.85, 0.75, 0.9];
  return planFaces(shape, W * 0.9, D * 0.9).map((f, i) => {
    const top = tops[i % tops.length] * H;
    const h = top / Math.cos(tilt);
    const y = top - 0.5 * (h * Math.cos(tilt) + thickness * Math.sin(tilt));
    return {
      shape: 'box',
      position: [f.x, y, f.z],
      scale: [f.length * 0.55, h, thickness],
      rotation: [-tilt, f.yaw, 0],
      material: 'glass',
      glow: true,
    } satisfies Part;
  });
};

/** Strata SE1: three spinning turbines set into an open frame on the roof. */
const windTurbines: CrownBuilder = ({ W, D, H }) => {
  const parts: Part[] = [
    { shape: 'plan', position: [0, 0.125 * H, 0], scale: [0.95 * W, 0.25 * H, 0.95 * D], material: 'body' },
    { shape: 'box', position: [0, 0.95 * H, 0], scale: [0.95 * W, 0.1 * H, 0.3 * D], material: 'steel' },
  ];
  for (const x of [-0.475, -0.155, 0.155, 0.475]) {
    parts.push({ shape: 'box', position: [x * W, 0.6 * H, 0], scale: [0.04 * W, 0.7 * H, 0.3 * D], material: 'steel' });
  }
  const diameter = Math.min(0.28 * W, 0.6 * H);
  for (const x of [-0.31, 0, 0.31]) {
    const hub: [number, number, number] = [x * W, 0.6 * H, 0];
    parts.push({ shape: 'cylinder', position: hub, scale: [0.12 * diameter, 0.3, 0.12 * diameter], rotation: [Math.PI / 2, 0, 0], material: 'steel' });
    for (const a of [0, Math.PI / 2]) {
      parts.push({ shape: 'box', position: hub, scale: [0.08 * diameter, diameter, 0.1], rotation: [0, 0, a], material: 'steel', animate: 'spin' });
    }
  }
  return parts;
};

/** Every crown marked `custom: true` in the catalog must appear here — the compiler checks. */
export const CUSTOM_CROWN_BUILDERS: Record<CustomCrownId, CrownBuilder> = {
  'flying-buttresses': flyingButtresses,
  'glass-shards': glassShards,
  'wind-turbines': windTurbines,
};
