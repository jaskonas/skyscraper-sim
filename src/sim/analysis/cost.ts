import { COEFFICIENTS } from '../catalog/coefficients';
import { activeOrnaments } from '../facade';
import type { CostBreakdown, Design, Site } from '../types';
import { USE_ORDER } from '../types';
import { elevatorCost } from './elevators';
import { foundationCost } from './foundation';
import type { Massing } from './massing';

export function analyzeCost(site: Site, design: Design, m: Massing): CostBreakdown {
  const C = COEFFICIENTS.cost;
  const structure =
    m.gfa *
    C.structurePerM2[design.material] *
    C.systemCostFactor[design.system] *
    (1 + design.floors / C.heightPremiumFloors) *
    (design.exposedStructure ? C.exposedStructureFactor : 1);
  const wallRate = design.windowRatio * C.windowPerM2 + (1 - design.windowRatio) * C.opaquePerM2[design.facade];
  const facade =
    m.facadeArea *
    wallRate *
    C.ornamentFactor[design.ornament] *
    (1 + C.perOrnamentFactor * activeOrnaments(design).length);
  const interiors = USE_ORDER.reduce((s, u) => s + m.areaByUse[u] * C.interiorsPerM2[u], 0);
  const systems = m.gfa * C.systemsPerM2[design.systemsGrade];
  const elevators = elevatorCost(design);
  const damping = C.dampingCost60[design.damping] * (design.floors / 60);
  const isolation = design.baseIsolation ? m.footprint * C.isolationPerM2 : 0;
  const amenities = design.amenities.reduce((s, a) => s + C.amenityCost[a], 0);
  const foundation = foundationCost(site, design, m);
  const parts = { structure, foundation, facade, interiors, systems, elevators, damping, isolation, amenities };
  const k = site.costMultiplier;
  const scaled = Object.fromEntries(Object.entries(parts).map(([key, v]) => [key, v * k])) as Omit<CostBreakdown, 'total'>;
  const total = Object.values(scaled).reduce((s, v) => s + v, 0);
  return { ...scaled, total };
}
