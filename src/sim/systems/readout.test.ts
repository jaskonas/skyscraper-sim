import { describe, expect, it } from 'vitest';
import { analyze } from '../analysis';
import { designFor } from '../testUtils';
import type { Design } from '../types';
import { systemFacts } from './facts';
import { systemReadout } from './readout';

const setup = (patch: Partial<Design>) => {
  const { site, design } = designFor('chicago', patch);
  return { site, design, analysis: analyze(site, design) };
};
const text = (patch: Partial<Design>, s: Parameters<typeof systemReadout>[3]) => {
  const { site, design, analysis } = setup(patch);
  return systemReadout(site, design, analysis, s).lines.map((l) => l.text).join(' | ');
};

describe('system facts', () => {
  it('counts plant floors, water zones, pumps and substations from the height', () => {
    const tall = setup({ floors: 92 });
    expect(systemFacts(tall.design, tall.analysis)).toMatchObject({ plantFloors: [29, 59, 89], waterZones: 4, pumpFloors: [0, 29, 59, 89], substations: 3 });
    const short = setup({ floors: 30 });
    expect(systemFacts(short.design, short.analysis)).toMatchObject({ plantFloors: [], waterZones: 1, pumpFloors: [0], substations: 0 });
  });

  it('sizes waste stacks to the top floor plate, 2 to 6', () => {
    const stacks = (plateWidth: number) => {
      // Set straight onto the design: a small lot would clip a 90 m plate.
      const s = setup({ shape: 'square', floors: 20, taper: 0, setbacks: 'none' });
      return systemFacts({ ...s.design, plateWidth, plateDepth: plateWidth }, s.analysis).stacks;
    };
    expect(stacks(30)).toBe(2);
    expect(stacks(60)).toBe(4);
    expect(stacks(90)).toBe(6);
  });

  it('banks elevators by zoning, matching the analysis', () => {
    const f = (zoning: Design['zoning']) => {
      const s = setup({ floors: 120, elevators: 24, zoning });
      return systemFacts(s.design, s.analysis);
    };
    expect(f('sky-lobby')).toMatchObject({ zones: 3, skyLobbies: [40, 80], shuttles: 4, cars: 24 });
    expect(f('two-zone')).toMatchObject({ zones: 2, skyLobbies: [], shuttles: 0 });
    expect(f('single')).toMatchObject({ zones: 1, skyLobbies: [], shuttles: 0 });
  });
});

describe('system cards', () => {
  it('water: zones and tank floors', () => {
    const t = text({ floors: 92 }, 'water');
    expect(t).toContain('4 water zones');
    // Floors are numbered the way people count them: index 29 is the 30th floor.
    expect(t).toContain('floors 30, 60 and 90');
  });

  it('power: turbines and solar only when chosen', () => {
    expect(text({ floors: 60, crown: 'wind-turbines' }, 'power')).toMatch(/turbine/i);
    expect(text({ floors: 60, crown: 'flat' }, 'power')).not.toMatch(/turbine/i);
    expect(text({ floors: 60, systemsGrade: 'green' }, 'power')).toMatch(/solar/i);
    expect(text({ floors: 60, systemsGrade: 'standard' }, 'power')).not.toMatch(/solar/i);
  });

  it('elevators: cars, zones, sky lobbies and the wait against the target', () => {
    const s = setup({ floors: 120, elevators: 24, zoning: 'sky-lobby' });
    const t = systemReadout(s.site, s.design, s.analysis, 'elevators').lines.map((l) => l.text).join(' ');
    expect(t).toContain('24 cars');
    expect(t).toContain('3 zones');
    expect(t).toContain('floors 41 and 81');
    expect(t).toContain(`${Math.round(s.analysis.elevators.avgWaitS)} s`);
    expect(t).toContain(`${Math.round(s.analysis.elevators.targetS)} s`);
  });

  it('waste: grey water only on green; air: heat recovery on efficient and green', () => {
    expect(text({ systemsGrade: 'green' }, 'waste')).toMatch(/grey water|shower/i);
    expect(text({ systemsGrade: 'standard' }, 'waste')).not.toMatch(/grey water|shower/i);
    expect(text({ systemsGrade: 'efficient' }, 'air')).toMatch(/heat/i);
    expect(text({ systemsGrade: 'standard' }, 'air')).not.toMatch(/recover/i);
  });

  it('every card has a title, a why line and a note', () => {
    const s = setup({ floors: 60 });
    for (const sys of ['power', 'water', 'waste', 'elevators', 'air'] as const) {
      const r = systemReadout(s.site, s.design, s.analysis, sys);
      expect(r.title.length).toBeGreaterThan(3);
      expect(r.lines.some((l) => l.text.startsWith('Why'))).toBe(true);
      expect(r.note.length).toBeGreaterThan(3);
    }
  });

  it('sky lobbies with very few cars: every car is placed, and the card says which zones go without', () => {
    const s = setup({ floors: 150, elevators: 2, zoning: 'sky-lobby' });
    const f = systemFacts(s.design, s.analysis);
    expect(f.shuttles).toBe(1);
    const t = systemReadout(s.site, s.design, s.analysis, 'elevators').lines.map((l) => l.text).join(' ');
    expect(t).toMatch(/not enough cars/i);
    const many = setup({ floors: 150, elevators: 24, zoning: 'sky-lobby' });
    expect(systemReadout(many.site, many.design, many.analysis, 'elevators').lines.map((l) => l.text).join(' ')).not.toMatch(/not enough cars/i);
  });

  it('only mentions waste-pipe bends when the tower has them, and no pump on towers city pressure can serve', () => {
    expect(text({ floors: 30 }, 'waste')).not.toMatch(/bends/i);
    expect(text({ floors: 31 }, 'waste')).toMatch(/bends/i);
    expect(text({ floors: 6 }, 'water')).toMatch(/city main/i);
    expect(text({ floors: 6 }, 'water')).not.toMatch(/pump/i);
  });
});
