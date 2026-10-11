import { CROWNS } from './catalog/crowns';
import { ORNAMENTS, SPANDRELS, WINDOW_PATTERNS } from './catalog/facades';
import { STYLE_PRESETS, type StyleSettings } from './catalog/styles';
import type { Design, Site, StyleId } from './types';

export function maxPlateWidth(site: Site, design: Pick<Design, 'shape'>): number {
  return design.shape === 'rectangle' ? site.lot.width : Math.min(site.lot.width, site.lot.depth);
}

export function maxPlateDepth(site: Site): number {
  return site.lot.depth;
}

/**
 * Clamp anything that depends on the site (plate size) or is otherwise out of range, and replace
 * look ids that no longer exist (an old export, a renamed option) with the style's own choice.
 * Returns the same object when nothing changes.
 */
export function normalizeDesign(design: Design, site: Site): Design {
  const preset = STYLE_PRESETS[design.style].settings;
  const patch: Partial<Design> = {};
  const plateWidth = Math.min(design.plateWidth, maxPlateWidth(site, design));
  const plateDepth = Math.min(design.plateDepth, maxPlateDepth(site));
  if (plateWidth !== design.plateWidth) patch.plateWidth = plateWidth;
  if (plateDepth !== design.plateDepth) patch.plateDepth = plateDepth;
  if (!Object.hasOwn(CROWNS, design.crown)) patch.crown = preset.crown;
  if (!Object.hasOwn(WINDOW_PATTERNS, design.windowPattern)) patch.windowPattern = preset.windowPattern;
  if (!Object.hasOwn(SPANDRELS, design.spandrel)) patch.spandrel = preset.spandrel;
  const ornaments = [...new Set((design.ornaments ?? []).filter((o) => Object.hasOwn(ORNAMENTS, o)))];
  if (ornaments.length !== design.ornaments?.length) patch.ornaments = ornaments;
  return Object.keys(patch).length === 0 ? design : { ...design, ...patch };
}

export function applyStylePreset(design: Design, style: StyleId): Design {
  return { ...design, ...STYLE_PRESETS[style].settings, style };
}

const STYLE_KEYS = Object.keys(STYLE_PRESETS.international.settings) as (keyof StyleSettings)[];

/** True when any style-controlled field differs from the current preset. */
export function isStyleModified(design: Design): boolean {
  const preset = STYLE_PRESETS[design.style].settings;
  return STYLE_KEYS.some((k) => JSON.stringify(design[k]) !== JSON.stringify(preset[k]));
}

export function defaultDesign(site: Site): Design {
  const base: Design = {
    style: 'international',
    floors: 40,
    plateWidth: 40,
    plateDepth: 40,
    shape: 'square',
    setbacks: 'none',
    taper: 0,
    twist: 0,
    crown: 'flat',
    useMix: { retail: 10, office: 90, hotel: 0, residential: 0 },
    system: 'core-outrigger',
    material: 'concrete',
    exposedStructure: false,
    damping: 'none',
    baseIsolation: false,
    foundation: 'mat',
    facade: 'glass',
    windowRatio: 0.9,
    elevators: 12,
    zoning: 'single',
    systemsGrade: 'standard',
    amenities: [],
    palette: STYLE_PRESETS.international.settings.palette,
    ornament: 'none',
    windowPattern: 'flush-grid',
    spandrel: 'plain',
    ornaments: [],
  };
  return normalizeDesign(applyStylePreset(base, 'international'), site);
}
