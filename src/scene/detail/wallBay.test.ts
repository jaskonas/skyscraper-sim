import { describe, expect, it } from 'vitest';
import { WINDOW_PATTERN_IDS } from '../../sim/catalog/ids';
import { facadeRecipe } from '../../sim/facade';
import { FLOOR_HEIGHT } from '../../sim/geometry';
import { partBounds, partIsFinite } from '../../sim/parts';
import { designFor } from '../../sim/testUtils';
import { GLASS_RECESS, wallBay } from './wallBay';

const recipeFor = (patch: Parameters<typeof designFor>[1]) => facadeRecipe(designFor('chicago', patch).design);

describe('wallBay', () => {
  it('builds one recessed pane per catalog pane, inside the bay, for every window pattern', () => {
    for (const windowPattern of WINDOW_PATTERN_IDS) {
      const recipe = recipeFor({ windowPattern });
      const bay = wallBay(recipe, recipe.pattern.bayWidth, 'body');
      expect(bay.panes, windowPattern).toHaveLength(recipe.pattern.panes.length);
      for (const { pane } of bay.panes) expect(pane.position[2], windowPattern).toBeCloseTo(-GLASS_RECESS);
      for (const p of [...bay.parts, ...bay.panes.flatMap((u) => [u.pane, u.room])]) {
        expect(partIsFinite(p), windowPattern).toBe(true);
        const b = partBounds(p);
        expect(b.min[0], windowPattern).toBeGreaterThanOrEqual(-recipe.pattern.bayWidth / 2 - 1e-6);
        expect(b.max[0], windowPattern).toBeLessThanOrEqual(recipe.pattern.bayWidth / 2 + 1e-6);
        expect(b.max[1], windowPattern).toBeLessThanOrEqual(FLOOR_HEIGHT + 1e-6);
      }
    }
  });

  it('gives arched windows a pointed head and diamond glass its diagonal bars', () => {
    const arched = wallBay(recipeFor({ windowPattern: 'arched' }), 3, 'stone');
    expect(arched.parts.filter((p) => p.shape === 'wedge' && p.material === 'glass')).toHaveLength(2);
    const plain = wallBay(recipeFor({ windowPattern: 'flush-grid' }), 4, 'glass').parts.length;
    expect(wallBay(recipeFor({ windowPattern: 'diamond' }), 4, 'glass').parts.length).toBe(plain + 2);
  });

  it('turns spandrel motifs into relief: eight chevron strips, or two raised stripes', () => {
    const count = (spandrel: 'plain' | 'chevron' | 'stripes') =>
      wallBay(recipeFor({ windowPattern: 'punched', spandrel }), 3.5, 'body').parts.filter((p) => p.position[2] > 0).length;
    expect(count('plain')).toBe(0);
    expect(count('chevron')).toBe(8);
    expect(count('stripes')).toBe(2);
  });

  it('makes bigger windows when the window area goes up', () => {
    const recipe = recipeFor({ windowPattern: 'punched' });
    const area = (ratio: number) => wallBay(recipe, 3.5, 'body', ratio).panes.reduce((s, { pane }) => s + pane.scale[0] * pane.scale[1], 0);
    expect(area(0.3)).toBeLessThan(area(0.8));
  });
});
