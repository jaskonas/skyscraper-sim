import { STYLE_PRESETS, type StyleSettings } from './catalog/styles';
import type { Design, Site, StyleId } from './types';

export function maxPlateWidth(site: Site, design: Pick<Design, 'shape'>): number {
  return design.shape === 'rectangle' ? site.lot.width : Math.min(site.lot.width, site.lot.depth);
}

export function maxPlateDepth(site: Site): number {
  return site.lot.depth;
}

/** Clamp anything that depends on the site (plate size) or is otherwise out of range. */
export function normalizeDesign(design: Design, site: Site): Design {
  const plateWidth = Math.min(design.plateWidth, maxPlateWidth(site, design));
  const plateDepth = Math.min(design.plateDepth, maxPlateDepth(site));
  if (plateWidth === design.plateWidth && plateDepth === design.plateDepth) return design;
  return { ...design, plateWidth, plateDepth };
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
  };
  return normalizeDesign(applyStylePreset(base, 'international'), site);
}
