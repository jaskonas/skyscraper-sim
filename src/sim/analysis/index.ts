import { COEFFICIENTS } from '../catalog/coefficients';
import type { Analysis, Check, CheckStatus, Design, Site } from '../types';
import { analyzeCost } from './cost';
import { analyzeElevators } from './elevators';
import { analyzeEnergy } from './energy';
import { analyzeFoundation } from './foundation';
import { computeMassing } from './massing';
import { analyzeSchedule } from './schedule';
import { analyzeSeismic } from './seismic';
import { analyzeWind } from './wind';

function statusFor(value: number, pass: number, marginal: number): CheckStatus {
  if (value <= pass) return 'pass';
  if (value <= marginal) return 'marginal';
  return 'fail';
}

const round = (v: number, d = 0) => Math.round(v * 10 ** d) / 10 ** d;

export function analyze(site: Site, design: Design): Analysis {
  const m = computeMassing(design);
  const wind = analyzeWind(site, design, m);
  const seismic = analyzeSeismic(site, design, m);
  const foundation = analyzeFoundation(site, design, m);
  const elevators = analyzeElevators(design, m);
  const energy = analyzeEnergy(site, design, m);
  const cost = analyzeCost(site, design, m);
  const schedule = analyzeSchedule(design);
  const W = COEFFICIENTS.wind;
  const E = COEFFICIENTS.energy;

  const driftStatus = statusFor(wind.driftRatio, W.driftPass, W.driftMarginal);
  const comfortStatus = statusFor(wind.accelMg, wind.comfortLimitMg, wind.comfortLimitMg * 1.3);
  const seismicStatus: CheckStatus =
    seismic.outcome === 'operational' ? 'pass' : seismic.outcome === 'damaged' ? 'marginal' : 'fail';
  const foundationStatus = statusFor(foundation.utilization, COEFFICIENTS.foundation.passUtilization, 1);
  const elevatorStatus = statusFor(elevators.avgWaitS, elevators.targetS, elevators.targetS * 1.5);
  const energyStatus = statusFor(energy.euiKWhPerM2, E.euiPass, E.euiMarginal);
  const oneIn = Math.round(1 / wind.driftRatio);

  const checks: Check[] = [
    {
      id: 'windStrength',
      label: 'Wind strength',
      status: driftStatus,
      value: wind.driftRatio,
      limit: W.driftPass,
      unit: 'drift',
      message:
        driftStatus === 'fail'
          ? `In a design windstorm the top would move 1/${oneIn} of the height — too much. Make it stiffer, wider, rounder, or tapered.`
          : `In a design windstorm the top moves about 1/${oneIn} of the height (limit 1/500).`,
    },
    {
      id: 'windComfort',
      label: 'Sway comfort',
      status: comfortStatus,
      value: wind.accelMg,
      limit: wind.comfortLimitMg,
      unit: 'milli-g',
      message:
        comfortStatus === 'pass'
          ? `Top-floor shaking about ${round(wind.accelMg, 1)} milli-g — people won't notice (limit ${wind.comfortLimitMg}).`
          : `Top-floor shaking about ${round(wind.accelMg, 1)} milli-g — people would feel queasy (limit ${wind.comfortLimitMg}). Dampers help most.`,
    },
    {
      id: 'seismic',
      label: 'Earthquake',
      status: seismicStatus,
      value: seismic.ratio,
      limit: COEFFICIENTS.seismic.operationalRatio,
      unit: 'demand/capacity',
      message:
        seismic.outcome === 'operational'
          ? 'In the design earthquake the building stays fully operational.'
          : seismic.outcome === 'damaged'
            ? 'In the design earthquake the building survives but needs repairs. Isolation, dampers, or a lighter, more ductile structure would help.'
            : 'Failed structural engineering assessment: the design earthquake would cause dangerous damage.',
    },
    {
      id: 'foundation',
      label: 'Foundation',
      status: foundationStatus,
      value: foundation.utilization,
      limit: 1,
      unit: 'utilization',
      message:
        foundationStatus === 'fail'
          ? `Failed structural engineering assessment: the ground can't carry this weight on a ${design.foundation} foundation — it would settle about ${round(foundation.settlementCm)} cm.`
          : `The ${design.foundation} foundation uses ${Math.round(foundation.utilization * 100)}% of its capacity and settles about ${round(foundation.settlementCm, 1)} cm.`,
    },
    {
      id: 'elevators',
      label: 'Elevator wait',
      status: elevatorStatus,
      value: elevators.avgWaitS,
      limit: elevators.targetS,
      unit: 's',
      message:
        elevators.avgWaitS >= 999
          ? 'No working elevators — nobody can get upstairs!'
          : `Morning rush average wait about ${Math.round(elevators.avgWaitS)} s (target ${elevators.targetS} s).`,
    },
    {
      id: 'energy',
      label: 'Energy use',
      status: energyStatus,
      value: energy.euiKWhPerM2,
      limit: E.euiPass,
      unit: 'kWh/m²/yr',
      message: `Uses about ${Math.round(energy.euiKWhPerM2)} kWh per m² per year (good is under ${E.euiPass}).`,
    },
  ];

  return {
    heightM: m.heightM,
    gfa: m.gfa,
    footprint: m.footprint,
    weightKN: m.weightKN,
    slenderness: m.slenderness,
    wind,
    seismic,
    foundation,
    elevators,
    energy,
    cost,
    schedule,
    checks,
  };
}
