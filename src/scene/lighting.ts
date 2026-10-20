import type { Site } from '../sim/types';

/**
 * Sky and light for day or night. Night is a simple dusk palette — no light simulation. With sun shadows
 * on, the sky's fill light is raised so faces in shadow stay readable rather than near-black.
 */
export function lighting(site: Site, night: boolean, shadows = false) {
  return night
    ? { sky: '#0b1426', hemi: 0.4, hemiSky: '#6f85b5', sun: 0.35, sunColor: '#9fb4ff' }
    : { sky: site.visuals.sky, hemi: shadows ? 1.15 : 0.9, hemiSky: '#ffffff', sun: 1.8, sunColor: '#ffffff' };
}
