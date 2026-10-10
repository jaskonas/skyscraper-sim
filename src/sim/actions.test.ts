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

  it('refuses a use mix with every use at zero', () => {
    const v = validateAction({ type: 'set_use_mix', mix: { retail: 0, office: 0, hotel: 0, residential: 0 } }, design, site, 'design');
    expect(v.ok).toBe(false);
  });

  it('accepts a partial use mix', () => {
    const r = applyActions(design, [{ type: 'set_use_mix', mix: { hotel: 40 } }], site, 'design');
    expect(r.design.useMix.hotel).toBe(40);
    expect(r.design.useMix.office).toBe(design.useMix.office);
  });
});
