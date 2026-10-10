import { COEFFICIENTS } from '../catalog/coefficients';
import type { Analysis, Design, Site } from '../types';
import type { Massing } from './massing';

export function systemStiffness(design: Design): number {
  const C = COEFFICIENTS.wind;
  const base = C.systemStiffness[design.system];
  const upTo = C.systemEfficientUpTo[design.system];
  const heightPenalty = design.floors > upTo ? Math.pow(upTo / design.floors, 1.5) : 1;
  return (
    base *
    heightPenalty *
    C.materialStiffness[design.material] *
    (design.exposedStructure ? C.exposedStructureStiffness : 1)
  );
}

/** Wind response multiplier from shape alone (1 = blunt square box). */
export function windShapeFactor(design: Design): number {
  const C = COEFFICIENTS.wind;
  return (
    (C.dragByShape[design.shape] / C.dragByShape.square) *
    C.setbackFactor[design.setbacks] *
    (1 - C.twistMaxReduction * Math.min(design.twist / 120, 1)) *
    (1 - C.taperReduction * design.taper)
  );
}

export function analyzeWind(site: Site, design: Design, m: Massing): Analysis['wind'] {
  const C = COEFFICIENTS.wind;
  const pressure = (site.windSpeed / C.referenceWindSpeed) ** 2;
  const areaRatio = m.frontalArea / (m.baseWidth * m.bodyHeight);
  const slender = (m.slenderness / C.referenceSlenderness) ** 2;
  const heightFactor = Math.sqrt(m.bodyHeight / 200);
  const driftRatio =
    (C.driftScale * pressure * windShapeFactor(design) * areaRatio * slender * heightFactor) /
    systemStiffness(design);
  const accelMg = (C.accelScale * driftRatio) / C.dampingReduction[design.damping];
  return { driftRatio, accelMg, comfortLimitMg: C.comfortLimitMg[m.topUse] };
}
