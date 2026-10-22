import { WINDOW_PATTERNS } from '../../sim/catalog/facades';
import type { PartMaterial } from '../../sim/parts';
import type { Design } from '../../sim/types';

/** The material textures the game ships (see public/textures/LICENSES.md). */
export type LibraryId =
  | 'brick-red'
  | 'brick-buff'
  | 'limestone'
  | 'granite'
  | 'terracotta'
  | 'concrete-board'
  | 'concrete-precast'
  | 'metal-panel'
  | 'copper'
  | 'wood'
  | 'roofing'
  | 'paving';

export interface LibraryMaterial {
  /** Poly Haven asset the texture was made from. */
  source: string;
  /** Real-world size of one repeat of the texture, metres. */
  sizeM: number;
  /** How far the detail map lightens and darkens the colour (the maps all share one spread; 1 = full). */
  contrast: number;
  /** How strongly the surface bumps catch the light (1 = as photographed). */
  normalStrength: number;
}

export const LIBRARY: Record<LibraryId, LibraryMaterial> = {
  'brick-red': { source: 'red_brick_03', sizeM: 1.0, contrast: 1.0, normalStrength: 1.0 },
  'brick-buff': { source: 'yellow_brick', sizeM: 2.0, contrast: 1.0, normalStrength: 1.0 },
  limestone: { source: 'white_sandstone_blocks_02', sizeM: 2.0, contrast: 0.8, normalStrength: 0.6 },
  granite: { source: 'granite_tile', sizeM: 2.3, contrast: 0.7, normalStrength: 0.6 },
  terracotta: { source: 'rectangular_facade_tiles_02', sizeM: 2.1, contrast: 0.8, normalStrength: 0.6 },
  'concrete-board': { source: 'wood_textured_concrete', sizeM: 1.8, contrast: 1.0, normalStrength: 0.9 },
  'concrete-precast': { source: 'precast_concrete_wall', sizeM: 1.59, contrast: 0.8, normalStrength: 0.7 },
  'metal-panel': { source: 'metal_plate_02', sizeM: 2.0, contrast: 0.5, normalStrength: 0.4 },
  copper: { source: 'green_metal_rust', sizeM: 1.0, contrast: 0.8, normalStrength: 0.5 },
  wood: { source: 'weathered_planks', sizeM: 2.0, contrast: 1.0, normalStrength: 0.8 },
  roofing: { source: 'tarred_gravel', sizeM: 2.2, contrast: 0.8, normalStrength: 0.6 },
  paving: { source: 'concrete_pavers', sizeM: 1.92, contrast: 0.8, normalStrength: 0.8 },
};

export const LIBRARY_IDS = Object.keys(LIBRARY) as LibraryId[];

/** What a tower's walls and its trim (frames, bands, mouldings) are made of. */
export interface Surfaces {
  wall: LibraryId;
  trim: LibraryId;
}

/** Masonry by style: each style's own brick or stone, and the stone of its trim. */
const MASONRY: Partial<Record<Design['style'], Surfaces>> = {
  'chicago-school': { wall: 'brick-red', trim: 'terracotta' },
  'gothic-revival': { wall: 'limestone', trim: 'limestone' },
  'art-deco': { wall: 'brick-buff', trim: 'limestone' },
  postmodern: { wall: 'granite', trim: 'granite' },
};

export function surfacesFor(design: Design): Surfaces {
  switch (design.facade) {
    case 'glass':
    case 'metal':
      return { wall: 'metal-panel', trim: 'metal-panel' };
    case 'precast':
      return design.style === 'brutalist'
        ? { wall: 'concrete-board', trim: 'concrete-board' }
        : { wall: 'concrete-precast', trim: 'concrete-precast' };
    case 'masonry':
      return MASONRY[design.style] ?? { wall: 'limestone', trim: 'limestone' };
  }
}

/**
 * What the painted facade's wall area is made of. Usually the tower's wall material, but a glass-grid
 * pattern's wall is glass-coloured spandrel panels — its brick or stone shows on the piers and ornaments.
 */
export function facadeWall(design: Design): LibraryId {
  return WINDOW_PATTERNS[design.windowPattern].glassWall ? 'metal-panel' : surfacesFor(design).wall;
}

/** The library material a part is drawn with: its tower's wall or trim, or a fixed one. Glass, plants and lights get none. */
export function partLibrary(material: PartMaterial, surfaces: Surfaces | undefined): LibraryId | null {
  switch (material) {
    case 'body':
      return surfaces?.wall ?? null;
    case 'accent':
      return surfaces?.trim ?? null;
    case 'stone':
      return 'limestone';
    case 'concrete':
      return 'concrete-board';
    case 'copper':
      return 'copper';
    case 'gold':
    case 'steel':
    case 'girder':
      return 'metal-panel';
    case 'wood':
      return 'wood';
    default:
      return null;
  }
}

/**
 * The colour a surface shows: the palette's colour, lightened and darkened by the texture about its
 * average (0.5), so a blue brick wall is blue with its mortar still showing. JS twin of the shaders.
 */
export function modulate(rgb: [number, number, number], detail: number, contrast: number): [number, number, number] {
  const k = Math.max(0, 1 + (detail - 0.5) * 2 * contrast);
  return [rgb[0] * k, rgb[1] * k, rgb[2] * k];
}
