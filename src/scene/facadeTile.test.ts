import { describe, expect, it } from 'vitest';
import { SPANDREL_IDS, WINDOW_PATTERN_IDS } from '../sim/catalog/ids';
import { facadeRecipe } from '../sim/facade';
import { designFor } from '../sim/testUtils';
import { glassShare, paintTile, tileLayout, type TileCanvas } from './facadeTile';

function recorder() {
  const calls: string[] = [];
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    fillRect: (...a: number[]) => calls.push(`fillRect ${ctx.fillStyle} ${a.map((v) => v.toFixed(1)).join(',')}`),
    beginPath: () => calls.push('beginPath'),
    moveTo: () => calls.push('moveTo'),
    lineTo: () => calls.push('lineTo'),
    closePath: () => calls.push('closePath'),
    fill: () => calls.push(`fill ${ctx.fillStyle}`),
    stroke: () => calls.push(`stroke ${ctx.strokeStyle}`),
  };
  return { ctx: ctx as unknown as TileCanvas, calls };
}

describe('facade tile', () => {
  it('lays out every window pattern with every spandrel, inside the tile', () => {
    for (const windowPattern of WINDOW_PATTERN_IDS)
      for (const spandrel of SPANDREL_IDS) {
        const { design } = designFor('chicago', { windowPattern, spandrel });
        const layout = tileLayout(facadeRecipe(design));
        expect(layout.widthM).toBeGreaterThanOrEqual(3);
        for (const s of layout.shapes) {
          const pts = s.kind === 'rect' ? [[s.x, s.y], [s.x + s.w, s.y + s.h]] : s.points;
          for (const [x, y] of pts) {
            expect(x, windowPattern).toBeGreaterThanOrEqual(-1e-9);
            expect(x, windowPattern).toBeLessThanOrEqual(1 + 1e-9);
            expect(y, windowPattern).toBeGreaterThanOrEqual(-1e-9);
            expect(y, windowPattern).toBeLessThanOrEqual(1 + 1e-9);
          }
        }
      }
  });

  it('more window area means more glass in the tile', () => {
    const { design } = designFor('chicago', { windowPattern: 'punched' });
    const share = (windowRatio: number) => glassShare(tileLayout(facadeRecipe({ ...design, windowRatio })));
    expect(share(0.3)).toBeLessThan(share(0.6));
    expect(share(0.6)).toBeLessThan(share(0.9));
    expect(share(0.6)).toBeGreaterThan(0.4);
  });

  it('Chicago windows have three panes; arched windows get a pointed head', () => {
    const { design } = designFor('chicago');
    const panes = (d: typeof design) => tileLayout(facadeRecipe(d)).shapes.filter((s) => s.kind === 'rect' && s.fill === 'glass');
    expect(panes({ ...design, windowPattern: 'chicago' })).toHaveLength(3);
    const arched = tileLayout(facadeRecipe({ ...design, windowPattern: 'arched' }));
    expect(arched.shapes.some((s) => s.kind === 'poly' && s.fill === 'glass')).toBe(true);
  });

  it('paints the facade in recipe colours and the glow map in black and white', () => {
    const { design } = designFor('chicago', { windowPattern: 'chicago', spandrel: 'stripes' });
    const recipe = facadeRecipe(design);
    const layout = tileLayout(recipe);
    const color = recorder();
    paintTile(color.ctx, layout, recipe.colors, 64, 48, 'color');
    expect(color.calls[0]).toContain(`fillRect ${recipe.colors.wall} 0.0,0.0,64.0,48.0`);
    expect(color.calls.some((c) => c.includes(recipe.colors.glass))).toBe(true);
    const glow = recorder();
    paintTile(glow.ctx, layout, recipe.colors, 64, 48, 'glow');
    const fills = new Set(glow.calls.filter((c) => c.startsWith('fill')).map((c) => c.split(' ')[1]));
    expect([...fills].sort()).toEqual(['#000000', '#ffffff']);
  });
});
