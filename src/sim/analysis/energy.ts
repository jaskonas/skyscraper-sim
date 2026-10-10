import { COEFFICIENTS } from '../catalog/coefficients';
import type { Analysis, Design, Site } from '../types';
import type { Massing } from './massing';

export function analyzeEnergy(site: Site, design: Design, m: Massing): Analysis['energy'] {
  const C = COEFFICIENTS.energy;
  const wr = design.windowRatio;
  const heatLoss = wr * 1 + (1 - wr) * C.opaqueHeatLoss[design.facade];
  const solarGain = 0.5 + wr;
  const euiKWhPerM2 =
    (C.baseEui + C.heatingEui * site.climate.heating * heatLoss + C.coolingEui * site.climate.cooling * solarGain) *
    C.gradeFactor[design.systemsGrade];
  return { euiKWhPerM2, annualCost: euiKWhPerM2 * m.gfa * C.dollarsPerKWh };
}
