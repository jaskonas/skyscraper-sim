import { COEFFICIENTS } from '../catalog/coefficients';
import { ZONE_COUNT } from '../analysis/elevators';
import { floorSlices, shapeAreaFactor } from '../geometry';
import type { Analysis, Design } from '../types';

export type SystemId = 'power' | 'water' | 'waste' | 'elevators' | 'air';
export const SYSTEM_IDS: readonly SystemId[] = ['power', 'water', 'waste', 'elevators', 'air'];

/** Plant floors every 30 floors on towers of 40 floors or more, never the roof (same rule as the facade's louvres). */
export function plantFloors(floors: number): number[] {
  if (floors < 40) return [];
  const out: number[] = [];
  for (let i = 29; i < floors - 1; i += 30) out.push(i);
  return out;
}

/** Floors fed straight from the city main, before any pump is needed. */
export const CITY_PRESSURE_FLOORS = 5;

export interface SystemFacts {
  plantFloors: number[];
  /** Pumped water zones: one per plant floor's tank, plus the roof tank. */
  waterZones: number;
  /** Floors with water pumps (0 = the basement). */
  pumpFloors: number[];
  /** Substations re-boosting power partway up. */
  substations: number;
  /** Drain stacks, sized to the top floor plate. */
  stacks: number;
  /** Elevator zones, as the analysis counts them. */
  zones: number;
  /** Floors of the sky lobbies (sky-lobby zoning only). */
  skyLobbies: number[];
  /** Express shuttles to the sky lobbies. */
  shuttles: number;
  cars: number;
}

/** The counts every systems view and card is built from, so pictures, tests and words agree. */
export function systemFacts(design: Design, _analysis: Analysis): SystemFacts {
  const plant = plantFloors(design.floors);
  const top = floorSlices(design).at(-1)!;
  const topArea = top.width * top.depth * shapeAreaFactor(design.shape);
  const zones = ZONE_COUNT[design.zoning];
  const boundaries = Array.from({ length: zones - 1 }, (_, k) => Math.round(((k + 1) * design.floors) / zones));
  const skyLobbies = design.zoning === 'sky-lobby' ? boundaries : [];
  const shuttles = skyLobbies.length ? Math.max(skyLobbies.length, Math.round(design.elevators * COEFFICIENTS.elevators.skyLobbyShuttleShare)) : 0;
  return {
    plantFloors: plant,
    waterZones: plant.length + 1,
    pumpFloors: [0, ...plant],
    substations: plant.length,
    stacks: Math.min(6, Math.max(2, Math.round(topArea / 1000))),
    zones,
    skyLobbies,
    shuttles,
    cars: design.elevators,
  };
}

/** Where elevator zones change (floor numbers): sky lobbies, or the two-zone split. */
export function zoneBoundaries(design: Design): number[] {
  const zones = ZONE_COUNT[design.zoning];
  return Array.from({ length: zones - 1 }, (_, k) => Math.round(((k + 1) * design.floors) / zones));
}
