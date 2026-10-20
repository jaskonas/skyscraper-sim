/**
 * Window-to-window variety for the facade: blinds, dark panes and glass tint. Every choice
 * is a fixed pseudo-random number per (bay, floor) — the same every frame, here and in the shader — salted
 * so it is independent of the night-light choice.
 */

/** Share of windows with blinds pulled. */
export const BLINDS_SHARE = 0.3;
/** Share of rooms dark by day. */
export const DARK_SHARE = 0.03;
/** Glass tint varies by up to this much either way. */
export const TINT_RANGE = 0.06;

const mod = (x: number, y: number) => x - y * Math.floor(x / y);

/** A fixed number 0..1 for a window and a salt (each choice uses its own salt). */
export function detailHash(bay: number, floor: number, salt: number): number {
  const v = Math.sin(mod(bay + salt * 17, 101) * 12.9898 + mod(floor + salt * 7, 89) * 78.233 + salt * 3.1) * 43758.5453;
  return v - Math.floor(v);
}

/** How far the blinds come down from the top of the pane, 0 (none) or 0.2..0.9. */
export function roomBlinds(bay: number, floor: number): number {
  return detailHash(bay, floor, 1) < BLINDS_SHARE ? 0.2 + 0.7 * detailHash(bay, floor, 2) : 0;
}

/** Whether the room is dark by day (lights off). */
export function roomDark(bay: number, floor: number): boolean {
  return detailHash(bay, floor, 3) < DARK_SHARE;
}

/** Lightness change of this pane's glass, -0.06..0.06. */
export function paneTint(bay: number, floor: number): number {
  return (detailHash(bay, floor, 4) - 0.5) * 2 * TINT_RANGE;
}

/** Plant floors with louvres instead of windows: every 30 floors on towers of 40 floors or more, never the roof. */
export function mechanicalFloors(floors: number): number[] {
  if (floors < 40) return [];
  const out: number[] = [];
  for (let i = 29; i < floors - 1; i += 30) out.push(i);
  return out;
}

export function isMechanicalFloor(index: number, floors: number): boolean {
  return floors >= 40 && index < floors - 1 && index % 30 === 29;
}

/** GLSL twins of the choices above, for the facade shader. */
export const FACADE_DETAIL_GLSL = /* glsl */ `
float detailHash(float bay, float floorIndex, float salt) {
  return fract(sin(mod(bay + salt * 17.0, 101.0) * 12.9898 + mod(floorIndex + salt * 7.0, 89.0) * 78.233 + salt * 3.1) * 43758.5453);
}
float roomBlinds(float bay, float floorIndex) {
  return detailHash(bay, floorIndex, 1.0) < ${BLINDS_SHARE.toFixed(3)} ? 0.2 + 0.7 * detailHash(bay, floorIndex, 2.0) : 0.0;
}
float roomDark(float bay, float floorIndex) {
  return detailHash(bay, floorIndex, 3.0) < ${DARK_SHARE.toFixed(3)} ? 1.0 : 0.0;
}
float paneTint(float bay, float floorIndex) {
  return (detailHash(bay, floorIndex, 4.0) - 0.5) * ${(2 * TINT_RANGE).toFixed(3)};
}`;
