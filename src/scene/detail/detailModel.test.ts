import { describe, expect, it } from 'vitest';
import { floorUses } from '../../sim/analysis/massing';
import { ORNAMENTS, WINDOW_PATTERNS } from '../../sim/catalog/facades';
import { ORNAMENT_IDS, SPANDREL_IDS, WINDOW_PATTERN_IDS } from '../../sim/catalog/ids';
import { FLOOR_HEIGHT } from '../../sim/geometry';
import { partBounds, partIsFinite, type Part } from '../../sim/parts';
import { designFor } from '../../sim/testUtils';
import type { Design, PlanShape } from '../../sim/types';
import { NIGHT_LIGHTS, windowLit } from '../nightWindows';
import { DETAIL_VIEWS, detailModel, type DetailModel } from './detailModel';

const SHAPES: PlanShape[] = ['square', 'rectangle', 'circle', 'triangle'];
const EXTREMES: Partial<Design>[] = [
  { floors: 5, twist: 0, taper: 0, setbacks: 'none' },
  { floors: 150, twist: 120, taper: 0.6, setbacks: 'wedding-cake', plateWidth: 15 },
];
const allParts = (m: DetailModel): Part[] => [...m.parts, ...m.windows.flatMap((w) => [w.pane, w.room])];

describe('detailModel', () => {
  it.each([...WINDOW_PATTERN_IDS])('%s: every spandrel, shape, extreme and view is finite and stays in its frame', (windowPattern) => {
    for (const spandrel of SPANDREL_IDS)
      for (const shape of SHAPES)
        for (const extreme of EXTREMES)
          for (const { id: view } of DETAIL_VIEWS) {
            const { design } = designFor('shanghai', { ...extreme, shape, windowPattern, spandrel, ornaments: [...ORNAMENT_IDS], ornament: 'high' });
            const m = detailModel(design, view);
            const label = `${windowPattern} ${spandrel} ${shape} ${extreme.floors} ${view}`;
            const parts = allParts(m);
            expect(m.windows.length, label).toBeGreaterThan(0);
            expect(parts.every(partIsFinite), label).toBe(true);
            for (const p of parts) {
              const b = partBounds(p);
              expect(Math.max(Math.abs(b.min[0]), Math.abs(b.max[0])), label).toBeLessThan(30);
              expect(b.min[1], label).toBeGreaterThan(-1);
              expect(b.max[1], label).toBeLessThan(4 * FLOOR_HEIGHT + 12);
              expect(Math.max(Math.abs(b.min[2]), Math.abs(b.max[2])), label).toBeLessThan(25);
            }
            expect(m.windows.length % WINDOW_PATTERNS[windowPattern].panes.length, label).toBe(0);
            expect(Number.isFinite(m.focus.distance) && m.focus.distance > 0, label).toBe(true);
          }
  });

  it('shows 5 bays on 4 floors of a wide facade, one window per pane', () => {
    const { design } = designFor('chicago', { shape: 'square', plateWidth: 40, floors: 40, setbacks: 'none', windowPattern: 'chicago' });
    expect(detailModel(design, 'facade').windows).toHaveLength(3 * 5 * 4);
  });

  it('changes when the windows, spandrels, window area or ornaments change', () => {
    const { design } = designFor('chicago', { floors: 50, setbacks: 'wedding-cake', ornaments: [], ornament: 'high' });
    const facade = (d: Design) => JSON.stringify(detailModel(d, 'facade'));
    expect(facade({ ...design, windowPattern: 'arched' })).not.toBe(facade({ ...design, windowPattern: 'punched' }));
    expect(facade({ ...design, spandrel: 'chevron' })).not.toBe(facade({ ...design, spandrel: 'plain' }));
    expect(facade({ ...design, windowRatio: 0.3 })).not.toBe(facade({ ...design, windowRatio: 0.8 }));
    expect(facade({ ...design, ornaments: ['stone-ribs'] })).not.toBe(facade(design));
    const corner = (d: Design) => detailModel(d, 'corner').parts.length;
    expect(corner({ ...design, ornaments: ['gargoyles'] })).toBeGreaterThan(corner(design));
  });

  it('amount None removes decorative ornaments from the close-up too', () => {
    const { design } = designFor('chicago', { floors: 50, setbacks: 'wedding-cake', ornaments: ['gargoyles', 'pinnacles'], ornament: 'none' });
    expect(detailModel(design, 'corner').parts.length).toBe(detailModel({ ...design, ornaments: [] }, 'corner').parts.length);
  });

  it('puts ribs between windows on every floor of the section', () => {
    const { design } = designFor('chicago', { shape: 'square', plateWidth: 40, floors: 40, setbacks: 'none', ornaments: [], ornament: 'high' });
    const plain = detailModel(design, 'facade').parts.length;
    const ribbed = detailModel({ ...design, ornaments: ['stone-ribs'] }, 'facade').parts.length;
    expect(ribbed - plain).toBe(6 * 4); // 6 bay edges × 4 floors, every edge at High
  });

  it('frames the corner view on the highest setback, or the roof when there is none', () => {
    const { design } = designFor('chicago', { floors: 50, setbacks: 'wedding-cake' });
    expect(detailModel(design, 'corner').caption).toMatch(/^Setback at floor \d+/);
    expect(detailModel({ ...design, setbacks: 'none' }, 'corner').caption).toMatch(/^Roof corner/);
  });

  it('shows the arched entry and rusticated base only when chosen, and three 1.7 m people', () => {
    const { design } = designFor('chicago', { ornaments: [], ornament: 'high' });
    const base = (d: Design) => detailModel(d, 'base');
    const plain = base(design).parts.length;
    expect(base({ ...design, ornaments: ['arched-entry'] }).parts.length).toBeGreaterThan(plain);
    expect(base({ ...design, ornaments: ['rusticated-base'] }).parts.length).toBeGreaterThan(plain);
    const heads = base(design).parts.filter((p) => p.shape === 'sphere');
    expect(heads).toHaveLength(3);
    for (const h of heads) expect(partBounds(h).max[1]).toBeCloseTo(1.7, 5);
    expect(base({ ...design, ornaments: ['arched-entry'] }).caption).toMatch(/Arched entry/);
  });

  it('lights the same windows at night as the main tower', () => {
    const { design } = designFor('chicago', { floors: 40, useMix: { retail: 10, office: 40, hotel: 0, residential: 50 } });
    const uses = floorUses(design);
    for (const { id } of DETAIL_VIEWS)
      for (const w of detailModel(design, id).windows)
        expect(w.lit).toBe(windowLit(w.bay, w.floor, NIGHT_LIGHTS[uses[w.floor]].lit));
  });

  it('captions name the floor, its use, the window pattern and the spandrel', () => {
    const { design } = designFor('chicago', { floors: 40, setbacks: 'none', windowPattern: 'chicago', spandrel: 'chevron', useMix: { retail: 0, office: 100, hotel: 0, residential: 0 } });
    expect(detailModel(design, 'facade').caption).toMatch(/^Floor \d+ · Offices · Chicago windows · Deco chevrons$/);
  });

  it('builds even the worst case fast enough to redraw on every slider tick', () => {
    const { design } = designFor('shanghai', { floors: 150, plateWidth: 80, shape: 'circle', twist: 120, taper: 0.3, setbacks: 'wedding-cake', ornaments: [...ORNAMENT_IDS], ornament: 'high' });
    for (const { id } of DETAIL_VIEWS) detailModel(design, id);
    const t0 = performance.now();
    for (let i = 0; i < 5; i++) for (const { id } of DETAIL_VIEWS) detailModel({ ...design, floors: 150 - i }, id);
    expect((performance.now() - t0) / 15).toBeLessThan(20);
  });

  it('every ornament can appear in at least one view when the tower has setbacks', () => {
    for (const id of ORNAMENT_IDS) {
      const { design } = designFor('chicago', { floors: 50, setbacks: 'wedding-cake', ornaments: [], ornament: 'high' });
      const count = (d: Design) => DETAIL_VIEWS.reduce((s, v) => s + detailModel(d, v.id).parts.length, 0);
      expect(count({ ...design, ornaments: [id] }), `${id} (${ORNAMENTS[id].placement})`).toBeGreaterThan(count(design));
    }
  });
});
