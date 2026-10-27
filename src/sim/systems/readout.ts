import { floorUses } from '../analysis/massing';
import { CROWNS } from '../catalog/crowns';
import { SYSTEM_LABEL, SYSTEM_TEXT } from '../catalog/systems';
import type { Readout, ReadoutLine } from '../forces/readout';
import type { Analysis, Design, Site } from '../types';
import { systemFacts, type SystemId } from './facts';

/** The card for a system on screen: how it flows through this tower, in its own numbers. */
export function systemReadout(_site: Site, design: Design, analysis: Analysis, system: SystemId, opts: { powerCut?: boolean } = {}): Readout {
  const f = systemFacts(design, analysis);
  const green = design.systemsGrade === 'green';
  const lines: string[] = [];
  switch (system) {
    case 'power': {
      const T = SYSTEM_TEXT.power;
      lines.push(T.feed, f.substations ? T.substations(f.substations, f.plantFloors) : T.noSubstations);
      if (CROWNS[design.crown].generatesPower) lines.push(T.turbines);
      if (green) lines.push(T.solar);
      lines.push(opts.powerCut ? T.cut : T.backup, T.why);
      break;
    }
    case 'water': {
      const T = SYSTEM_TEXT.water;
      lines.push(T.zones(f.waterZones, f.plantFloors), T.city);
      if (design.amenities.includes('pool')) lines.push(T.pool);
      if (design.amenities.includes('sky-garden')) lines.push(T.garden);
      if (green) lines.push(T.rain);
      lines.push(T.why);
      break;
    }
    case 'waste': {
      const T = SYSTEM_TEXT.waste;
      lines.push(T.stacks(f.stacks));
      if (design.floors >= 30) lines.push(T.jogs);
      lines.push(T.vents);
      if (green) lines.push(T.grey);
      if (floorUses(design).includes('retail')) lines.push(T.grease);
      lines.push(T.why);
      break;
    }
    case 'elevators': {
      const T = SYSTEM_TEXT.elevators;
      lines.push(T.cars(f.cars, f.zones));
      if (design.zoning === 'single') lines.push(T.single);
      else if (design.zoning === 'two-zone') lines.push(T.twoZone(Math.round(design.floors / 2)));
      else {
        lines.push(T.sky(f.shuttles, f.skyLobbies));
        // Locals go to the zones bottom first; any zone past the last one served goes without.
        const served = Math.min(f.zones, f.cars - f.shuttles);
        if (served < f.zones) lines.push(T.short(f.skyLobbies[served - 1] ?? 0));
      }
      lines.push(T.wait(Math.round(analysis.elevators.avgWaitS), Math.round(analysis.elevators.targetS)), T.why);
      break;
    }
    case 'air': {
      const T = SYSTEM_TEXT.air;
      lines.push(T.handlers(f.plantFloors.length, f.plantFloors), T.supply, T.cooling);
      if (design.systemsGrade === 'efficient') lines.push(T.efficient);
      if (green) lines.push(T.green);
      lines.push(T.why);
      break;
    }
  }
  const out: ReadoutLine[] = lines.map((text) => ({ text }));
  return { title: `${SYSTEM_LABEL[system].icon} ${SYSTEM_LABEL[system].title}`, lines: out, note: SYSTEM_TEXT.note };
}
