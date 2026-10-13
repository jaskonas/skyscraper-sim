import type { Site } from '../sim/types';

/** Sky and light for day or night. Night is a simple dusk palette — no light simulation. */
export function lighting(site: Site, night: boolean) {
  return night
    ? { sky: '#0b1426', hemi: 0.4, hemiSky: '#6f85b5', sun: 0.35, sunColor: '#9fb4ff' }
    : { sky: site.visuals.sky, hemi: 0.9, hemiSky: '#ffffff', sun: 1.8, sunColor: '#ffffff' };
}
