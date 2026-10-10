import { COEFFICIENTS } from '../catalog/coefficients';
import { FLOOR_HEIGHT } from '../geometry';
import type { Analysis, Design, ElevatorZoning, UseType } from '../types';
import { USE_ORDER } from '../types';
import type { Massing } from './massing';

export const ZONE_COUNT: Record<ElevatorZoning, number> = { single: 1, 'two-zone': 2, 'sky-lobby': 3 };

/** Elevator speed grows with building height, m/s. */
export function carSpeed(bodyHeight: number): number {
  return Math.min(10, 2.5 + bodyHeight / 100);
}

/** Expected number of stops for a car carrying `passengers` among `floors` floors. */
export function probableStops(floors: number, passengers: number): number {
  if (floors <= 1) return 1;
  return floors * (1 - Math.pow(1 - 1 / floors, passengers));
}

function dominantUse(m: Massing): UseType {
  let best: UseType = 'office';
  for (const u of USE_ORDER) if (u !== 'retail' && m.areaByUse[u] > m.areaByUse[best]) best = u;
  return best;
}

export function analyzeElevators(design: Design, m: Massing): Analysis['elevators'] {
  const C = COEFFICIENTS.elevators;
  let population = 0;
  let peakDemand = 0;
  for (const u of USE_ORDER) {
    const people = m.areaByUse[u] / C.m2PerPerson[u];
    population += people;
    peakDemand += people * C.peakFiveMinShare[u];
  }
  const zones = ZONE_COUNT[design.zoning];
  const localCars = design.zoning === 'sky-lobby' ? design.elevators * (1 - C.skyLobbyShuttleShare) : design.elevators;
  const maxUsefulCars = zones * C.maxCarsPerZone;
  const carsPerZone = Math.min(localCars / zones, C.maxCarsPerZone);
  const effectiveCars = carsPerZone * zones;

  const zoneFloors = design.floors / zones;
  const zoneHeight = zoneFloors * FLOOR_HEIGHT;
  // Average express run to reach a zone: zero for one zone; otherwise the middle zone's start.
  const expressHeight = zones === 1 ? 0 : ((zones - 1) / 2) * zoneHeight;
  const speed = carSpeed(m.bodyHeight);
  const roundTrip =
    (2 * zoneHeight) / speed +
    (2 * expressHeight) / C.expressSpeed +
    probableStops(zoneFloors, C.passengersPerTrip) * C.secondsPerStop;

  const zoneDemand = peakDemand / zones;
  const zoneCapacity = carsPerZone > 0 ? carsPerZone * (300 / roundTrip) * C.passengersPerTrip : 0;
  const overload = zoneCapacity > 0 ? Math.max(1, zoneDemand / zoneCapacity) : 100;
  const interval = carsPerZone > 0 ? roundTrip / carsPerZone : 999;
  const avgWaitS = Math.min(999, C.waitPerInterval * interval * overload * overload);

  return {
    population: Math.round(population),
    peakDemand: Math.round(peakDemand),
    avgWaitS,
    targetS: C.targetWaitS[dominantUse(m)],
    effectiveCars,
    maxUsefulCars,
  };
}

export function elevatorCost(design: Design): number {
  const C = COEFFICIENTS.elevators;
  const floorsServed = design.floors / ZONE_COUNT[design.zoning];
  const cars = design.elevators * (C.carBaseCost + C.carCostPerFloorServed * floorsServed);
  return cars + (design.zoning === 'sky-lobby' ? C.skyLobbyCost : 0);
}
