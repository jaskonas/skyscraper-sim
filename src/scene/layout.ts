import type { Site } from '../sim/types';

/** The site is shown as a diorama block: a slab of city with its soil visible on the sides. */
export const DIORAMA = { width: 420, depth: 320 } as const;
/** Gap between the lot and the front edge of the diorama, metres. */
export const SIDEWALK = 15;
/** Deepest soil shown, metres. */
export const MAX_SOIL_SHOWN = 100;
export const BEDROCK_COLOR = '#56514c';

/** Centre of the lot, [x, z]. The lot sits at the front so its foundation shows through the soil. */
export function lotCenter(site: Site): [number, number] {
  return [0, DIORAMA.depth / 2 - SIDEWALK - site.lot.depth / 2];
}

export function soilDepthShown(site: Site): number {
  return Math.min(site.bedrockDepth + 15, MAX_SOIL_SHOWN);
}

export interface SoilBand {
  name: string;
  color: string;
  /** Metres below ground of the band's top. */
  top: number;
  thickness: number;
}

/** Soil layers clipped to the shown depth, with bedrock filling the rest if it is in view. */
export function soilBands(site: Site): SoilBand[] {
  const shown = soilDepthShown(site);
  const bands: SoilBand[] = [];
  let top = 0;
  for (const layer of site.soil) {
    if (top >= shown) break;
    const thickness = Math.min(layer.thickness, shown - top);
    bands.push({ name: layer.name, color: layer.color, top, thickness });
    top += thickness;
  }
  if (top < shown) {
    const isRock = site.bedrockDepth <= shown;
    bands.push({
      name: isRock ? 'Bedrock' : site.soil[site.soil.length - 1].name,
      color: isRock ? BEDROCK_COLOR : site.soil[site.soil.length - 1].color,
      top,
      thickness: shown - top,
    });
  }
  return bands;
}

export interface NeighborBlock {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
}

/** Small deterministic PRNG so each city always looks the same. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const BLOCK_PITCH = 50;
const LOT_MARGIN = 12;

export function generateNeighbors(site: Site): NeighborBlock[] {
  const rand = mulberry32(hashString(site.id));
  const [lx, lz] = lotCenter(site);
  const halfW = site.lot.width / 2 + LOT_MARGIN;
  const halfD = site.lot.depth / 2 + LOT_MARGIN;
  const [minH, maxH] = site.visuals.neighborHeight;
  const blocks: NeighborBlock[] = [];
  for (let x = -DIORAMA.width / 2 + BLOCK_PITCH / 2; x < DIORAMA.width / 2; x += BLOCK_PITCH) {
    for (let z = -DIORAMA.depth / 2 + BLOCK_PITCH / 2; z < DIORAMA.depth / 2 - SIDEWALK; z += BLOCK_PITCH) {
      const width = 26 + rand() * 16;
      const depth = 26 + rand() * 16;
      const height = minH + rand() * rand() * (maxH - minH);
      const color = site.visuals.neighborColors[Math.floor(rand() * site.visuals.neighborColors.length)];
      const plaza = rand() < 0.2;
      const overlapsLot = Math.abs(x - lx) < halfW + width / 2 && Math.abs(z - lz) < halfD + depth / 2;
      const fits =
        Math.abs(x) + width / 2 <= DIORAMA.width / 2 && Math.abs(z) + depth / 2 <= DIORAMA.depth / 2 - SIDEWALK / 2;
      if (!plaza && !overlapsLot && fits) blocks.push({ x, z, width, depth, height, color });
    }
  }
  return blocks;
}

/** Famous local building, placed on the skyline well behind the diorama. */
export const LANDMARK_POSITION: [number, number, number] = [-DIORAMA.width / 2 - 260, 0, -DIORAMA.depth / 2 - 380];

export interface CameraFrame {
  position: [number, number, number];
  target: [number, number, number];
}

/** A three-quarter view that fits a tower of `heightM` on this site's lot. */
export function cameraFrame(site: Site, heightM: number): CameraFrame {
  const [lx, lz] = lotCenter(site);
  const span = Math.max(heightM, 160);
  const target: [number, number, number] = [lx, span * 0.42, lz];
  const distance = span * 1.5 + 150;
  // Unit-ish direction: from the front-right, a little above the target.
  const dir: [number, number, number] = [0.55, 0.3, 0.78];
  const len = Math.hypot(...dir);
  return {
    target,
    position: [target[0] + (dir[0] / len) * distance, target[1] + (dir[1] / len) * distance, target[2] + (dir[2] / len) * distance],
  };
}
