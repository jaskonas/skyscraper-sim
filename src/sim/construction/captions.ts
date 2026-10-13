import { AMENITIES } from '../catalog/amenities';
import {
  DAMPING_BUILD,
  EXPOSED_BUILD,
  FOUNDATION_BUILD,
  ISOLATION_BUILD,
  MATERIAL_BUILD,
  STAGE_TEXT,
  SYSTEM_BUILD,
  listWords,
  type BuildFacts,
} from '../catalog/construction';
import { CROWNS } from '../catalog/crowns';
import { PARAMS_BY_ID, type ParamId } from '../catalog/parameters';
import { COEFFICIENTS } from '../catalog/coefficients';
import { formatMoney } from '../format';
import type { Analysis, Design, Site } from '../types';
import { foundationPlan } from './foundation';
import { constructionStages, outriggerFloors } from './stages';

export interface StageCaption {
  title: string;
  /** What this stage is and why — the same for every tower. */
  idea: string;
  /** How this stage goes for this tower, with its numbers. */
  yours: string;
}

function optionLabel(id: ParamId, value: string): string {
  const def = PARAMS_BY_ID[id];
  return (def.kind === 'enum' && def.options.find((o) => o.value === value)?.label) || value;
}

function facts(design: Design, site: Site, analysis: Analysis): BuildFacts {
  const plan = foundationPlan(site, design);
  const structureDays = analysis.schedule.phases.find((p) => p.id === 'structure')!.days;
  return {
    floors: design.floors,
    daysPerFloor: Math.round((structureDays / design.floors) * 10) / 10,
    structureDays,
    foundationDepth: plan.depth,
    shafts: plan.shafts,
    layers: listWords(plan.layers.map((l) => l.toLowerCase())),
    reachesBedrock: plan.reachesBedrock,
    isolators: plan.isolators,
    outriggers: outriggerFloors(design.floors),
  };
}

/** The card for construction stage `stage` (0..5): the general idea, then how it goes for this tower. */
export function stageCaption(design: Design, site: Site, analysis: Analysis, stage: number): StageCaption {
  const stages = constructionStages(design, analysis);
  const s = stages[stage];
  const f = facts(design, site, analysis);
  const days = s.endDay - s.startDay;
  const { title, idea } = STAGE_TEXT[s.id];
  const sentences: string[] = [];
  switch (s.id) {
    case 'excavation':
      sentences.push(
        `Diggers spend ${days} days on your lot, digging ${foundationPlan(site, design).digDepth} m down for your ${optionLabel('foundation', design.foundation).toLowerCase()}.`,
      );
      break;
    case 'foundation':
      sentences.push(FOUNDATION_BUILD[design.foundation](f));
      if (design.baseIsolation) sentences.push(ISOLATION_BUILD(f));
      sentences.push(`The foundation takes ${days} days.`);
      break;
    case 'structure':
      sentences.push(MATERIAL_BUILD[design.material](f), SYSTEM_BUILD[design.system](f));
      if (design.damping === 'viscous') sentences.push(DAMPING_BUILD.viscous);
      if (design.exposedStructure) sentences.push(EXPOSED_BUILD);
      break;
    case 'facade':
      sentences.push(
        `Your ${optionLabel('facade', design.facade).toLowerCase()} starts ${Math.min(COEFFICIENTS.schedule.facadeLagFloors, design.floors)} floors below the frame and closes in the top ${days} days after the frame is finished.`,
      );
      break;
    case 'crown': {
      const amenities = design.amenities.map((a) => AMENITIES[a].label.toLowerCase());
      sentences.push(
        `Your ${CROWNS[design.crown].label.toLowerCase()} goes on top${amenities.length ? `, with the ${listWords(amenities)}` : ''}.`,
      );
      if (design.damping === 'tmd') sentences.push(DAMPING_BUILD.tmd);
      sentences.push('Then the crane comes down.');
      break;
    }
    case 'fitout':
      sentences.push(
        `Interiors and systems take ${days} days. Your tower opens on day ${analysis.schedule.totalDays}, about ${Math.round(analysis.schedule.totalDays / 30)} months after digging began, for ${formatMoney(analysis.cost.total)}.`,
      );
      break;
  }
  return { title, idea, yours: sentences.join(' ') };
}
