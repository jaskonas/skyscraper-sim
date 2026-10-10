import { COEFFICIENTS } from '../catalog/coefficients';
import type { Analysis, Design, SchedulePhase } from '../types';

export function analyzeSchedule(design: Design): Analysis['schedule'] {
  const C = COEFFICIENTS.schedule;
  const perFloor =
    C.daysPerFloor[design.material] *
    (design.system === 'diagrid' ? C.diagridFactor : 1) *
    (design.exposedStructure ? C.exposedStructureFactor : 1);
  const excavation = C.excavationDays;
  const foundation = C.foundationDays[design.foundation];
  const structureStart = excavation + foundation;
  const structureDays = Math.round(design.floors * perFloor);
  const facadeStart = structureStart + Math.round(Math.min(C.facadeLagFloors, design.floors) * perFloor);
  const crownStart = structureStart + structureDays;
  const crownDays = C.crownDays + C.amenityDays * design.amenities.length;
  const fitoutStart = crownStart;
  const phases: SchedulePhase[] = [
    { id: 'excavation', label: 'Excavation', startDay: 0, days: excavation },
    { id: 'foundation', label: 'Foundation', startDay: excavation, days: foundation },
    { id: 'structure', label: 'Core and frame', startDay: structureStart, days: structureDays },
    { id: 'facade', label: 'Facade', startDay: facadeStart, days: crownStart - facadeStart + 20 },
    { id: 'crown', label: 'Crown and amenities', startDay: crownStart, days: crownDays },
    { id: 'fitout', label: 'Interiors and opening', startDay: fitoutStart, days: C.fitoutDays },
  ];
  const totalDays = Math.max(...phases.map((p) => p.startDay + p.days));
  return { phases, totalDays };
}
