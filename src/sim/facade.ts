import { ORNAMENTS, SPANDRELS, WINDOW_PATTERNS, type OrnamentDef, type SpandrelDef, type WindowPatternDef } from './catalog/facades';
import type { Design, FacadeType } from './types';

/** The chosen ornaments that actually get built: amount None drops the purely decorative ones. */
export function activeOrnaments(design: Design): OrnamentDef[] {
  return design.ornaments.map((id) => ORNAMENTS[id]).filter((o) => design.ornament !== 'none' || !o.decorative);
}

/** None keeps working parts at the Low size. */
export function amountLevel(design: Design): 'low' | 'high' {
  return design.ornament === 'high' ? 'high' : 'low';
}

export interface FacadeColors {
  wall: string;
  glass: string;
  frame: string;
  spandrel: string;
  accent: string;
}

export interface FacadeRecipe {
  pattern: WindowPatternDef;
  spandrel: SpandrelDef;
  windowRatio: number;
  colors: FacadeColors;
  /** Surface finish of the wall material. */
  roughness: number;
  metalness: number;
}

const FINISH: Record<FacadeType, { roughness: number; metalness: number }> = {
  glass: { roughness: 0.15, metalness: 0.5 },
  metal: { roughness: 0.35, metalness: 0.6 },
  precast: { roughness: 0.9, metalness: 0 },
  masonry: { roughness: 0.85, metalness: 0 },
};

/** Everything the painted facade tile needs, from style choices and settings. */
export function facadeRecipe(design: Design): FacadeRecipe {
  const pattern = WINDOW_PATTERNS[design.windowPattern];
  const { body, accent, glass } = design.palette;
  const wall = pattern.glassWall || design.facade === 'glass' ? glass : body;
  return {
    pattern,
    spandrel: SPANDRELS[design.spandrel],
    windowRatio: design.windowRatio,
    colors: { wall, glass, frame: accent, spandrel: wall, accent },
    ...FINISH[design.facade],
  };
}
