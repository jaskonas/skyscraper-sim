import { describe, expect, it } from 'vitest';
import { analyze } from './analysis';
import { BRIEFS, briefsForSite } from './briefs';
import { defaultDesign, normalizeDesign } from './design';
import { evaluateBrief, evaluateRequirement, gradeFromRatio, isLandmark, sandboxGrades } from './scoring';
import { SITES, SITE_IDS } from './sites';
import { designFor } from './testUtils';

describe('briefs', () => {
  it('every site has two briefs', () => {
    for (const id of SITE_IDS) expect(briefsForSite(id)).toHaveLength(2);
  });

  it.each(BRIEFS.map((b) => [b.id, b] as const))('%s is solvable by its reference design', (_id, brief) => {
    const site = SITES[brief.siteId];
    const design = normalizeDesign({ ...defaultDesign(site), ...brief.reference }, site);
    const result = evaluateBrief(brief, design, analyze(site, design));
    expect(result.required.filter((r) => !r.met).map((r) => r.label)).toEqual([]);
    expect(result.stars).toBeGreaterThanOrEqual(1);
  });

  it.each(BRIEFS.map((b) => [b.id, b] as const))('%s is not solved by the default design', (_id, brief) => {
    const site = SITES[brief.siteId];
    const design = defaultDesign(site);
    expect(evaluateBrief(brief, design, analyze(site, design)).stars).toBe(0);
  });
});

describe('requirements', () => {
  it('structural requirement fails when the foundation fails', () => {
    const { site, design } = designFor('shanghai', { floors: 60, foundation: 'mat' });
    const r = evaluateRequirement({ kind: 'structural' }, design, analyze(site, design));
    expect(r.met).toBe(false);
    expect(r.detail).toContain('Foundation');
  });

  it('use share uses normalized percentages', () => {
    const { site, design } = designFor('chicago', { useMix: { retail: 0, office: 1, hotel: 0, residential: 3 } });
    const r = evaluateRequirement({ kind: 'minUseShare', use: 'residential', value: 0.75 }, design, analyze(site, design));
    expect(r.met).toBe(true);
  });

  it('a plain box is not a landmark; a twist makes it one', () => {
    const { design } = designFor('tokyo');
    expect(isLandmark(design)).toBe(false);
    expect(isLandmark({ ...design, twist: 45 })).toBe(true);
  });
});

describe('sandbox grades', () => {
  it('grades from ratios', () => {
    expect(gradeFromRatio(0.4, [0.5, 0.75, 1, 1.3])).toBe('A');
    expect(gradeFromRatio(1.2, [0.5, 0.75, 1, 1.3])).toBe('D');
    expect(gradeFromRatio(2, [0.5, 0.75, 1, 1.3])).toBe('F');
  });

  it('a failed foundation gets an F for safety', () => {
    const { site, design } = designFor('shanghai', { floors: 60, foundation: 'mat' });
    expect(sandboxGrades(site, analyze(site, design)).safety).toBe('F');
  });

  it('a sound design gets an A for safety', () => {
    const { site, design } = designFor('new-york', { foundation: 'mat' });
    expect(sandboxGrades(site, analyze(site, design)).safety).toBe('A');
  });
});
