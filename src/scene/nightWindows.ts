import { floorUses } from '../sim/analysis/massing';
import type { Design, UseType } from '../sim/types';

/** Share of windows lit at night, and their colour, by what the floor is used for. */
export const NIGHT_LIGHTS: Record<UseType, { lit: number; color: string }> = {
  office: { lit: 0.4, color: '#dfe8ff' },
  residential: { lit: 0.6, color: '#ffcf7a' },
  hotel: { lit: 0.6, color: '#ffd89a' },
  retail: { lit: 0.9, color: '#fff4d6' },
};

/** GLSL-style mod: always positive. */
const mod = (x: number, y: number) => x - y * Math.floor(x / y);

/**
 * Same hash the facade shader uses: a fixed pseudo-random number 0..1 for a window.
 * Inputs are wrapped to small numbers because GPU sine loses precision on big ones.
 */
export function windowHash(bay: number, floor: number): number {
  const v = Math.sin(mod(bay, 101) * 12.9898 + mod(floor, 89) * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/** Whether the window in this bay on this floor is lit, for a lit share 0..1. Never flickers. */
export function windowLit(bay: number, floor: number, share: number): boolean {
  return windowHash(bay, floor) < share;
}

/** GLSL twin of windowHash, used by the facade material. */
export const WINDOW_HASH_GLSL = /* glsl */ `
float windowHash(float bay, float floorIndex) {
  return fract(sin(mod(bay, 101.0) * 12.9898 + mod(floorIndex, 89.0) * 78.233) * 43758.5453);
}`;

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Per-floor instance data for the facade shader: floor index, lit share and light colour. */
export function nightWindowAttributes(design: Design): { floor: Float32Array; lit: Float32Array; color: Float32Array } {
  const uses = floorUses(design);
  const floor = new Float32Array(uses.length);
  const lit = new Float32Array(uses.length);
  const color = new Float32Array(uses.length * 3);
  uses.forEach((u, i) => {
    floor[i] = i;
    lit[i] = NIGHT_LIGHTS[u].lit;
    color.set(rgb(NIGHT_LIGHTS[u].color), i * 3);
  });
  return { floor, lit, color };
}
