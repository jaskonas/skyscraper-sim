import { describe, expect, it } from 'vitest';
import { analyze } from '../analysis';
import { formatMoney } from '../format';
import { designFor } from '../testUtils';
import type { Damping, Design, FoundationType, Material, SiteId, StructuralSystem } from '../types';
import { stageCaption } from './captions';
import { foundationPlan } from './foundation';
import { STAGE_COUNT } from './stages';

const SITES: SiteId[] = ['new-york', 'tokyo', 'chicago', 'shanghai'];
const SYSTEMS: StructuralSystem[] = ['rigid-frame', 'framed-tube', 'core-outrigger', 'bundled-tube', 'diagrid', 'buttressed-core'];
const MATERIALS: Material[] = ['steel', 'concrete', 'composite'];
const FOUNDATIONS: FoundationType[] = ['mat', 'raft', 'piles', 'caissons'];
const DAMPING: Damping[] = ['none', 'tmd', 'viscous'];

const cards = (siteId: SiteId, patch: Partial<Design>) => {
  const { site, design } = designFor(siteId, patch);
  const analysis = analyze(site, design);
  return { site, design, analysis, cards: Array.from({ length: STAGE_COUNT }, (_, i) => stageCaption(design, site, analysis, i)) };
};

describe('foundationPlan', () => {
  it('counts piles, caissons and isolator pads on a grid under the footprint, and names the soil they pass through', () => {
    const { site, design } = designFor('chicago', { foundation: 'caissons', baseIsolation: true, shape: 'square', plateWidth: 36 });
    const plan = foundationPlan(site, design);
    expect(plan.shafts).toBe(9);
    expect(plan.isolators).toBe(16);
    expect(plan.depth).toBe(36);
    expect(plan.layers).toEqual(['Fill', 'Soft blue clay', 'Hardpan']);
    expect(plan.reachesBedrock).toBe(true);
    expect(foundationPlan(site, { ...design, foundation: 'mat', baseIsolation: false })).toMatchObject({ shafts: 0, isolators: 0, digDepth: 3 });
    expect(foundationPlan(site, { ...design, foundation: 'raft' }).digDepth).toBe(site.foundation.raft.depth);
  });
});

describe('stageCaption', () => {
  it('has a title, the general idea and a sentence about your tower for every stage and every choice, on every site', () => {
    for (const siteId of SITES)
      for (const system of SYSTEMS)
        for (const material of MATERIALS)
          for (const foundation of FOUNDATIONS)
            for (const damping of DAMPING) {
              const label = `${siteId} ${system} ${material} ${foundation} ${damping}`;
              for (const c of cards(siteId, { system, material, foundation, damping, baseIsolation: true, exposedStructure: true }).cards) {
                expect(c.title.length, label).toBeGreaterThan(0);
                expect(c.idea.length, label).toBeGreaterThan(40);
                expect(c.yours.length, label).toBeGreaterThan(20);
                expect(`${c.title} ${c.idea} ${c.yours}`, label).not.toMatch(/undefined|NaN|\[object/);
              }
            }
  });

  it('the frame card gives your floors, days per floor and frame days, and names your system', () => {
    const { design, analysis, cards: c } = cards('chicago', { floors: 45, material: 'steel', system: 'core-outrigger' });
    const frame = analysis.schedule.phases.find((p) => p.id === 'structure')!;
    expect(c[2].yours).toContain(`${design.floors} floors in ${frame.days} days`);
    expect(c[2].yours).toContain('about 3 days a floor');
    expect(c[2].yours).toMatch(/outrigger trusses at floors 15 and 30/);
  });

  it('every system and material says something different', () => {
    const frameText = (patch: Partial<Design>) => cards('chicago', patch).cards[2].yours;
    expect(new Set(SYSTEMS.map((system) => frameText({ system, material: 'concrete' }))).size).toBe(SYSTEMS.length);
    expect(new Set(MATERIALS.map((material) => frameText({ material, system: 'framed-tube' }))).size).toBe(MATERIALS.length);
  });

  it('the foundation card gives the depth and the soil, and mentions isolators and dampers only when chosen', () => {
    const { site, cards: c } = cards('chicago', { foundation: 'caissons', baseIsolation: true });
    expect(c[1].yours).toMatch(/caissons are drilled 36 m down through fill, soft blue clay and hardpan to bedrock/);
    expect(c[1].yours).toMatch(/rubber pads/);
    expect(site.bedrockDepth).toBe(35);
    expect(cards('chicago', { baseIsolation: false }).cards[1].yours).not.toMatch(/rubber pads/);
    expect(cards('chicago', { damping: 'tmd' }).cards[4].yours).toMatch(/tuned mass damper/);
    expect(cards('chicago', { damping: 'none' }).cards[4].yours).not.toMatch(/damper/);
    expect(cards('chicago', { damping: 'viscous' }).cards[2].yours).toMatch(/Viscous dampers/);
  });

  it('the last card quotes the real time interiors take, however long the crown stage is', () => {
    for (const amenities of [[], ['helipad', 'pool', 'observation-deck', 'sky-garden']] as Design['amenities'][]) {
      const { analysis, cards: c } = cards('chicago', { amenities });
      const fitout = analysis.schedule.phases.find((p) => p.id === 'fitout')!;
      expect(c[5].yours).toContain(`Interiors and systems take ${fitout.days} days`);
    }
  });

  it('the last card gives the opening day and the total cost', () => {
    const { analysis, cards: c } = cards('tokyo', {});
    expect(c[5].yours).toContain(`day ${analysis.schedule.totalDays}`);
    expect(c[5].yours).toContain(formatMoney(analysis.cost.total));
  });
});
