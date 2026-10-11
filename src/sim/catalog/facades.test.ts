import { describe, expect, it } from 'vitest';
import { applyActions } from '../actions';
import { analyze } from '../analysis';
import { applyStylePreset, defaultDesign, isStyleModified, normalizeDesign } from '../design';
import { activeOrnaments } from '../facade';
import { partIsFinite } from '../parts';
import { SITES } from '../sites';
import { designFor } from '../testUtils';
import type { Design } from '../types';
import { ORNAMENT_GROUPS, ORNAMENTS, SPANDRELS, WINDOW_PATTERNS } from './facades';
import { ORNAMENT_IDS, SPANDREL_IDS, WINDOW_PATTERN_IDS } from './ids';
import { PARAMS_BY_ID, type EnumParam } from './parameters';
import { STYLE_PRESETS } from './styles';

describe('facade catalog', () => {
  it('every window pattern, spandrel and ornament has a label, a real example and a blurb', () => {
    const entries = [
      ...WINDOW_PATTERN_IDS.map((id) => WINDOW_PATTERNS[id]),
      ...SPANDREL_IDS.map((id) => SPANDRELS[id]),
      ...ORNAMENT_IDS.map((id) => ORNAMENTS[id]),
    ];
    for (const e of entries) {
      expect(e.label.length, e.id).toBeGreaterThan(2);
      expect(e.seenOn.length, e.id).toBeGreaterThan(3);
      expect(e.blurb.length, e.id).toBeGreaterThan(10);
    }
  });

  it('window panes sit inside the opening, in order', () => {
    for (const id of WINDOW_PATTERN_IDS) {
      const p = WINDOW_PATTERNS[id];
      expect(p.bayWidth, id).toBeGreaterThanOrEqual(3);
      expect(p.bayWidth, id).toBeLessThanOrEqual(4.5);
      let last = 0;
      for (const pane of p.panes) {
        expect(pane.x0, id).toBeGreaterThanOrEqual(last);
        expect(pane.x1, id).toBeGreaterThan(pane.x0);
        expect(pane.x1, id).toBeLessThanOrEqual(1);
        last = pane.x1;
      }
    }
  });

  it('every ornament has a valid group, finite template parts and grows from Low to High', () => {
    const groups = ORNAMENT_GROUPS.map((g) => g.id);
    for (const id of ORNAMENT_IDS) {
      const o = ORNAMENTS[id];
      expect(groups, id).toContain(o.group);
      expect(o.template.length, id).toBeGreaterThan(0);
      expect(o.template.every(partIsFinite), id).toBe(true);
      expect(o.amount.high.size, id).toBeGreaterThanOrEqual(o.amount.low.size * 0.8);
    }
  });

  it('offers windows and spandrels as galleries and the amount in the Details group', () => {
    expect((PARAMS_BY_ID.windowPattern as EnumParam).options.map((o) => o.value)).toEqual([...WINDOW_PATTERN_IDS]);
    expect((PARAMS_BY_ID.spandrel as EnumParam).options.map((o) => o.value)).toEqual([...SPANDREL_IDS]);
    expect((PARAMS_BY_ID.windowPattern as EnumParam).widget).toBe('gallery');
    expect(PARAMS_BY_ID.ornament.group).toBe('details');
  });
});

describe('style look defaults', () => {
  const expected: Record<string, Pick<Design, 'crown' | 'windowPattern' | 'spandrel' | 'ornaments' | 'ornament'>> = {
    'chicago-school': { crown: 'cornice', windowPattern: 'chicago', spandrel: 'plain', ornaments: ['belt-courses', 'setback-cornices', 'rusticated-base'], ornament: 'low' },
    'gothic-revival': { crown: 'gothic-pinnacles', windowPattern: 'arched', spandrel: 'plain', ornaments: ['stone-ribs', 'pinnacles', 'gargoyles', 'arched-entry'], ornament: 'high' },
    'art-deco': { crown: 'deco-arches', windowPattern: 'flush-grid', spandrel: 'chevron', ornaments: ['stone-ribs', 'sunburst-bands', 'deco-steps', 'gargoyles'], ornament: 'high' },
    international: { crown: 'flat', windowPattern: 'flush-grid', spandrel: 'plain', ornaments: ['ibeam-mullions'], ornament: 'none' },
    brutalist: { crown: 'concrete-cap', windowPattern: 'punched', spandrel: 'plain', ornaments: ['concrete-fins'], ornament: 'none' },
    postmodern: { crown: 'split-pediment', windowPattern: 'punched', spandrel: 'stripes', ornaments: ['belt-courses', 'arched-entry', 'urns'], ornament: 'low' },
    'high-tech': { crown: 'lattice-mast', windowPattern: 'exposed-frame', spandrel: 'plain', ornaments: ['accent-ties'], ornament: 'none' },
    'neo-futurist': { crown: 'open-frame', windowPattern: 'diamond', spandrel: 'plain', ornaments: ['ribbon-bands'], ornament: 'none' },
  };

  it.each(Object.entries(expected))('%s sets its crown, windows, spandrels and ornaments', (style, look) => {
    const s = STYLE_PRESETS[style as keyof typeof STYLE_PRESETS].settings;
    expect({ crown: s.crown, windowPattern: s.windowPattern, spandrel: s.spandrel, ornaments: s.ornaments, ornament: s.ornament }).toEqual(look);
  });

  it('counts a changed ornament list as modifying the style', () => {
    const d = applyStylePreset(defaultDesign(SITES.chicago), 'art-deco');
    expect(isStyleModified({ ...d, ornaments: [...d.ornaments, 'urns'] })).toBe(true);
    expect(isStyleModified({ ...d, windowPattern: 'punched' })).toBe(true);
  });
});

describe('normalizing look ids', () => {
  const site = SITES.chicago;
  const deco = applyStylePreset(defaultDesign(site), 'art-deco');

  it('falls back to the style\'s choice for ids that do not exist', () => {
    const broken = { ...deco, crown: 'toString', windowPattern: 'nope', spandrel: 'gone', ornaments: ['urns', 'urns', 'laser-eyes'] } as unknown as Design;
    const fixed = normalizeDesign(broken, site);
    expect(fixed.crown).toBe('deco-arches');
    expect(fixed.windowPattern).toBe('flush-grid');
    expect(fixed.spandrel).toBe('chevron');
    expect(fixed.ornaments).toEqual(['urns']);
  });

  it('returns the same object when every id is known', () => {
    expect(normalizeDesign(deco, site)).toBe(deco);
  });
});

describe('ornament amount and effects', () => {
  it('amount None keeps working parts and drops decoration', () => {
    const { design } = designFor('chicago', { ornaments: ['stone-ribs', 'gargoyles', 'concrete-fins', 'urns'], ornament: 'none' });
    expect(activeOrnaments(design).map((o) => o.id)).toEqual(['stone-ribs', 'concrete-fins']);
    expect(activeOrnaments({ ...design, ornament: 'low' })).toHaveLength(4);
  });

  it('stone ornaments make the tower heavier and earthquakes harder', () => {
    const plain = designFor('tokyo', { floors: 40, ornaments: [], ornament: 'high' });
    const carved = designFor('tokyo', { floors: 40, ornaments: ['stone-ribs', 'gargoyles', 'pinnacles', 'urns'], ornament: 'high' });
    const a = analyze(plain.site, plain.design);
    const b = analyze(carved.site, carved.design);
    expect(b.weightKN).toBeGreaterThan(a.weightKN);
    expect(b.weightKN / a.weightKN).toBeLessThan(1.06);
    expect(b.seismic.ratio).toBeGreaterThan(a.seismic.ratio);
  });

  it('each ornament type adds a little facade cost', () => {
    const none = designFor('chicago', { ornaments: [], ornament: 'low' });
    const two = designFor('chicago', { ornaments: ['sunburst-bands', 'ribbon-bands'], ornament: 'low' });
    const ratio = analyze(two.site, two.design).cost.facade / analyze(none.site, none.design).cost.facade;
    expect(ratio).toBeCloseTo(1.04, 5);
  });

  it('adds and removes ornaments as undoable actions, and refuses unknown ones', () => {
    const { site, design } = designFor('chicago', { ornaments: [] });
    const added = applyActions(design, [{ type: 'add_ornament', id: 'urns' }], site, 'design');
    expect(added.design.ornaments).toEqual(['urns']);
    const removed = applyActions(added.design, [{ type: 'remove_ornament', id: 'urns' }], site, 'design');
    expect(removed.design.ornaments).toEqual([]);
    const bad = applyActions(design, [{ type: 'add_ornament', id: 'laser-eyes' as never }], site, 'design');
    expect(bad.rejected).toHaveLength(1);
    for (const action of [
      { type: 'add_ornament', id: 'toString' },
      { type: 'add_amenity', id: 'toString' },
      { type: 'apply_style_preset', style: 'toString' },
    ] as never[]) {
      expect(applyActions(design, [action], site, 'design').rejected, JSON.stringify(action)).toHaveLength(1);
    }
    const locked = applyActions(design, [{ type: 'add_ornament', id: 'urns' }], site, 'complete');
    expect(locked.applied).toHaveLength(0);
  });
});
