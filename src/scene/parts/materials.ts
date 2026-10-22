import type { PartMaterial } from '../../sim/parts';
import type { Palette } from '../../sim/types';

export interface MaterialLook {
  color: string;
  roughness: number;
  metalness: number;
}

/** Fixed colours for real materials; body, accent and glass come from the design's palette. */
export function materialLook(m: PartMaterial, palette: Palette): MaterialLook {
  switch (m) {
    case 'body':
      return { color: palette.body, roughness: 0.7, metalness: 0.1 };
    case 'accent':
      return { color: palette.accent, roughness: 0.5, metalness: 0.3 };
    case 'glass':
      return { color: palette.glass, roughness: 0.15, metalness: 0.5 };
    case 'stone':
      return { color: '#d9d2c3', roughness: 0.9, metalness: 0 };
    case 'concrete':
      return { color: '#9c9a94', roughness: 0.95, metalness: 0 };
    case 'copper':
      // Old copper turns green: this is the patina colour.
      return { color: '#5fa58f', roughness: 0.6, metalness: 0.3 };
    case 'gold':
      return { color: '#d4af37', roughness: 0.3, metalness: 0.8 };
    case 'steel':
      return { color: '#9aa3ab', roughness: 0.35, metalness: 0.7 };
    case 'foliage':
      return { color: '#3f8f3a', roughness: 0.9, metalness: 0 };
    case 'ruby':
      return { color: '#c2182b', roughness: 0.4, metalness: 0.2 };
    case 'light':
      return { color: '#fff3c4', roughness: 0.5, metalness: 0 };
    case 'girder':
      // Bare structural steel seen during construction: darker and duller than finished steel trim.
      return { color: '#4f5860', roughness: 0.55, metalness: 0.6 };
    case 'wood':
      // Rooftop water tanks and tree trunks.
      return { color: '#7a5233', roughness: 0.9, metalness: 0 };
    case 'blind':
      // Window blinds pulled down behind the glass.
      return { color: '#dcd9cf', roughness: 0.8, metalness: 0 };
    case 'interior':
      // The dim room behind a window, seen in the close-up.
      return { color: '#2a2f36', roughness: 0.9, metalness: 0 };
  }
}

/** Colour a glowing part gives off at night. */
export function glowColor(m: PartMaterial, palette: Palette): string {
  if (m === 'ruby') return '#ff2a3d';
  if (m === 'gold' || m === 'light') return '#ffd98a';
  return palette.accent;
}
