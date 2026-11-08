import { floorUses } from './analysis/massing';
import { describe, expect, it } from 'vitest';
import { applyActions, validateAction, type DesignAction } from './actions';
import { designFor } from './testUtils';

describe('actions', () => {
  const { site, design } = designFor('new-york');

  it('applies valid actions and reports invalid ones without blocking the rest', () => {
    const actions = [
      { type: 'set_parameter', id: 'floors', value: 60 },
      { type: 'set_parameter', id: 'floors', value: 500 },
      { type: 'set_parameter', id: 'plateWidth', value: 31 },
      { type: 'set_parameter', id: 'shape', value: 'hexagon' },
      { type: 'add_amenity', id: 'pool' },
      { type: 'set_parameter', id: 'flux_capacitor', value: 1 },
    ] as unknown as DesignAction[];
    const r = applyActions(design, actions, site, 'design');
    expect(r.design.floors).toBe(60);
    expect(r.design.amenities).toEqual(['pool']);
    expect(r.applied).toHaveLength(2);
    expect(r.rejected.map((x) => x.reason)).toEqual([
      'Floors must be between 5 and 150.',
      'Width must be between 15 and 30.',
      'Floor shape can be: Square, Rectangle, Round, Triangle.',
      '"flux_capacitor" is not something this game can change.',
    ]);
  });

  it('rejects every change once construction starts', () => {
    const r = applyActions(design, [{ type: 'set_parameter', id: 'floors', value: 60 }], site, 'building');
    expect(r.applied).toEqual([]);
    expect(r.rejected[0].reason).toMatch(/locked/);
  });

  it('snaps numbers to the control step', () => {
    const r = applyActions(design, [{ type: 'set_parameter', id: 'twist', value: 33 }], site, 'design');
    expect(r.design.twist).toBe(35);
  });

  it('applying a style preset changes looks but not the structure', () => {
    const r = applyActions(design, [{ type: 'apply_style_preset', style: 'art-deco' }], site, 'design');
    expect(r.design.style).toBe('art-deco');
    expect(r.design.setbacks).toBe('wedding-cake');
    expect(r.design.system).toBe(design.system);
  });

  it('does not add the same amenity twice, and removes it', () => {
    let d = applyActions(design, [{ type: 'add_amenity', id: 'helipad' }, { type: 'add_amenity', id: 'helipad' }], site, 'design').design;
    expect(d.amenities).toEqual(['helipad']);
    d = applyActions(d, [{ type: 'remove_amenity', id: 'helipad' }], site, 'design').design;
    expect(d.amenities).toEqual([]);
  });

  it('set_stack validates', () => {
    const reason = (stack: unknown) => {
      const v = validateAction({ type: 'set_stack', stack } as DesignAction, design, site, 'design');
      return v.ok ? 'ok' : v.reason;
    };
    expect(reason([])).toBe('At least one zone is needed.');
    expect(reason(Array.from({ length: 7 }, (_, k) => ({ use: k % 2 ? 'office' : 'hotel', share: 10 })))).toBe('Up to 6 zones.');
    expect(reason([{ use: 'garage', share: 50 }])).toBe('"garage" is not a building use.');
    expect(reason([{ use: 'office', share: -5 }, { use: 'hotel', share: 50 }])).toBe('Zone shares must be 0–100.');
    expect(reason([{ use: 'hotel', share: 40 }, { use: 'office', share: 60 }])).toBe('ok');
  });

  it('set_stack reorders the floors', () => {
    const r = applyActions(design, [{ type: 'set_stack', stack: [{ use: 'hotel', share: 40 }, { use: 'office', share: 60 }] }], site, 'design');
    expect(floorUses(r.design)[0]).toBe('hotel');
    expect(floorUses(r.design).at(-1)).toBe('office');
  });
});
