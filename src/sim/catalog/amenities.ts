import type { AmenityId } from '../types';

export interface AmenityDef {
  id: AmenityId;
  label: string;
  explain: string;
}

export const AMENITIES: Record<AmenityId, AmenityDef> = {
  helipad: {
    id: 'helipad',
    label: 'Helipad',
    explain: 'A landing pad on the roof. Needs a flat top and a strong roof structure.',
  },
  pool: {
    id: 'pool',
    label: 'Rooftop pool',
    explain: 'Water is heavy — a rooftop pool adds about 2,000 tonnes high up, which makes earthquakes worse.',
  },
  'observation-deck': {
    id: 'observation-deck',
    label: 'Observation deck',
    explain: 'A public viewing floor near the top. Visitors pay to see the city.',
  },
  'sky-garden': {
    id: 'sky-garden',
    label: 'Sky garden',
    explain: 'Trees and plants partway up the tower. Soil is heavy, but residents love it.',
  },
};

export const AMENITY_IDS = Object.keys(AMENITIES) as AmenityId[];
