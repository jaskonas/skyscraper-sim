import { describe, expect, it } from 'vitest';
import { applyActions } from '../actions';
import { applyStylePreset, defaultDesign } from '../design';
import { SITES, SITE_IDS } from '../sites';
import { PARAMS, visibleParams } from './parameters';
import { STYLE_IDS } from './styles';

describe('parameters', () => {
  it('every parameter maps to a design field and has an explanation', () => {
    const design = defaultDesign(SITES.chicago);
    for (const p of PARAMS) {
      expect(p.id in design).toBe(true);
      expect(p.explain.length).toBeGreaterThan(10);
      if (p.kind === 'enum') {
        expect(p.options.length).toBeGreaterThan(1);
        for (const o of p.options) expect(o.explain.length).toBeGreaterThan(3);
      }
    }
  });

  it('shows depth only for rectangular towers', () => {
    const design = defaultDesign(SITES.chicago);
    const ids = (shape: typeof design.shape) => visibleParams('standard', { ...design, shape }).map((p) => p.id);
    expect(ids('square')).not.toContain('plateDepth');
    expect(ids('rectangle')).toContain('plateDepth');
  });

  it('every style preset produces a design every control accepts', () => {
    for (const siteId of SITE_IDS) {
      const site = SITES[siteId];
      for (const style of STYLE_IDS) {
        const design = applyStylePreset(defaultDesign(site), style);
        const actions = PARAMS.map((p) => ({ type: 'set_parameter' as const, id: p.id, value: design[p.id] }));
        const result = applyActions(design, actions, site, 'design');
        expect(result.rejected, `${siteId}/${style}`).toEqual([]);
      }
    }
  });
});
