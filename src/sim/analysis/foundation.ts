import { COEFFICIENTS } from '../catalog/coefficients';
import type { Analysis, Design, Site } from '../types';
import type { Massing } from './massing';

export function analyzeFoundation(site: Site, design: Design, m: Massing): Analysis['foundation'] {
  const soil = site.foundation[design.foundation];
  const pressureKPa = m.weightKN / m.footprint;
  const utilization = pressureKPa / soil.capacity;
  return {
    pressureKPa,
    capacityKPa: soil.capacity,
    utilization,
    settlementCm: utilization * soil.settlementCm,
  };
}

export function foundationCost(site: Site, design: Design, m: Massing): number {
  const rate = COEFFICIENTS.foundation.costPerM2[design.foundation];
  return m.footprint * rate * site.foundation[design.foundation].costFactor * (1 + design.floors / 100);
}
