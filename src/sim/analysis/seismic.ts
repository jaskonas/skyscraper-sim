import { COEFFICIENTS } from '../catalog/coefficients';
import type { Analysis, Design, Site } from '../types';
import type { Massing } from './massing';

export function analyzeSeismic(site: Site, design: Design, m: Massing): Analysis['seismic'] {
  const C = COEFFICIENTS.seismic;
  const periodS = Math.max(0.2, design.floors * C.periodPerFloor);
  const spectral = site.seismicHazard * Math.sqrt(Math.min(1, C.cornerPeriodS / periodS));
  const irregularity =
    C.shapeIrregularity[design.shape] *
    C.setbackIrregularity[design.setbacks] *
    (design.amenities.includes('pool') ? C.poolIrregularity : 1);
  const demand =
    (spectral * (m.unitWeight / C.referenceKNPerM2) * irregularity) /
    ((design.baseIsolation ? C.isolationReduction : 1) * C.dampingReduction[design.damping]);
  const capacity =
    C.baseCapacityG * C.ductilityByMaterial[design.material] * C.ductilityBySystem[design.system];
  const ratio = demand / capacity;
  const outcome = ratio <= C.operationalRatio ? 'operational' : ratio <= C.damagedRatio ? 'damaged' : 'fails';
  return { periodS, ratio, outcome };
}
