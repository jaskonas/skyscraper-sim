import type { Vec3 } from '../../sim/parts';
import type { DetailFocus } from './detailModel';

/** How far the player may drag the close-up around, radians. */
export const MAX_DRAG_YAW = (30 * Math.PI) / 180;
export const MAX_DRAG_PITCH = (15 * Math.PI) / 180;

export interface Drag {
  yaw: number;
  pitch: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Adds a pointer movement (pixels) to the drag, kept within the allowed range. */
export function dragBy(d: Drag, dx: number, dy: number): Drag {
  return {
    yaw: clamp(d.yaw - dx * 0.006, -MAX_DRAG_YAW, MAX_DRAG_YAW),
    pitch: clamp(d.pitch + dy * 0.006, -MAX_DRAG_PITCH, MAX_DRAG_PITCH),
  };
}

/** One step of easing back to the framed view after the player lets go (`dt` in seconds). */
export function easeBack(d: Drag, dt: number): Drag {
  const k = Math.exp(-dt / 0.08);
  const next = { yaw: d.yaw * k, pitch: d.pitch * k };
  // Snap the last half-degree so the canvas can stop redrawing.
  return Math.abs(next.yaw) < 0.01 && Math.abs(next.pitch) < 0.01 ? { yaw: 0, pitch: 0 } : next;
}

/** Camera position for a framed view plus the current drag. +z is out of the wall, toward the viewer. */
export function cameraPose(f: DetailFocus, d: Drag): { position: Vec3; target: Vec3 } {
  const yaw = f.yaw + d.yaw;
  const pitch = f.pitch + d.pitch;
  const [tx, ty, tz] = f.target;
  return {
    position: [
      tx + f.distance * Math.sin(yaw) * Math.cos(pitch),
      ty + f.distance * Math.sin(pitch),
      tz + f.distance * Math.cos(yaw) * Math.cos(pitch),
    ],
    target: f.target,
  };
}
