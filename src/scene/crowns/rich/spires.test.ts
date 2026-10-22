import { describe, expect, it } from 'vitest';
import type { CrownId } from '../../../sim/catalog/ids';
import { FLOOR_HEIGHT, crownHeight } from '../../../sim/geometry';
import { partBounds, type Part } from '../../../sim/parts';
import { designFor } from '../../../sim/testUtils';
import { crownParts } from '../../crownParts';
import { RICH_CROWNS } from '.';

const rich = (crown: CrownId) => crownParts(designFor('chicago', { shape: 'square', plateWidth: 30, floors: 60, crown, ornament: 'high' }).design, 'rich');
const count = (parts: Part[], pred: (p: Part) => boolean) => parts.filter(pred).length;
const tip = (parts: Part[]) => parts.reduce((best, p) => (partBounds(p).max[1] > partBounds(best).max[1] ? p : best));
const strut = (p: Part) => p.shape === 'box' && !!p.rotation && Math.abs(p.rotation[0]) > 1e-6;

describe('rich spires and needles', () => {
  it('are all registered', () => {
    for (const id of ['spire', 'stepped-needle', 'ringed-pinnacle', 'star-spire', 'mooring-mast', 'deco-arches', 'twin-antennas', 'lattice-mast'] as const)
      expect(RICH_CROWNS[id], id).toBeDefined();
  });

  it('One WTC: base ring, radome, a segmented mast with rings and rungs, a beacon and a blinking needle', () => {
    const p = rich('spire');
    expect(count(p, (q) => q.shape === 'octagon')).toBeGreaterThanOrEqual(2);
    expect(count(p, (q) => q.shape === 'frustum')).toBeGreaterThanOrEqual(6);
    expect(count(p, (q) => q.shape === 'torus')).toBeGreaterThanOrEqual(6);
    expect(count(p, (q) => q.fine === true && q.shape === 'box' && q.material === 'steel')).toBeGreaterThanOrEqual(24);
    expect(count(p, (q) => q.material === 'light' && !!q.glow)).toBeGreaterThanOrEqual(1);
    expect(tip(p).animate).toBe('blink');
  });

  it('Burj Khalifa: five glass setbacks with fins, a ribbed spire, platforms and a blinking tip', () => {
    const p = rich('stepped-needle');
    expect(count(p, (q) => q.shape === 'plan' && q.material === 'glass')).toBeGreaterThanOrEqual(5);
    expect(count(p, (q) => !!q.fine && q.shape === 'box' && q.material === 'steel')).toBeGreaterThanOrEqual(40);
    expect(count(p, (q) => strut(q) && q.material === 'steel')).toBeGreaterThanOrEqual(6);
    expect(count(p, (q) => q.shape === 'torus')).toBeGreaterThanOrEqual(2);
    expect(tip(p).animate).toBe('blink');
  });

  it('Petronas: four stepped drums ringed with ribs, steel rings, a ball and a ringed needle', () => {
    const p = rich('ringed-pinnacle');
    expect(count(p, (q) => q.shape === 'cylinder' && q.material === 'steel' && q.scale[0] > 2)).toBeGreaterThanOrEqual(4);
    expect(count(p, (q) => !!q.fine && q.shape === 'box')).toBeGreaterThanOrEqual(64);
    expect(count(p, (q) => q.shape === 'torus' && !q.fine)).toBeGreaterThanOrEqual(4);
    expect(count(p, (q) => q.shape === 'torus' && !!q.fine)).toBeGreaterThanOrEqual(6);
    expect(count(p, (q) => q.shape === 'sphere')).toBeGreaterThanOrEqual(1);
    expect(tip(p).animate).toBe('blink');
  });

  it('Seven Sisters: tiers with corner pinnacles and lit windows, a ribbed gold spire, a wreath and a ruby star', () => {
    const p = rich('star-spire');
    expect(count(p, (q) => q.shape === 'plan' && q.material === 'body')).toBeGreaterThanOrEqual(3);
    expect(count(p, (q) => q.shape === 'octagon')).toBeGreaterThanOrEqual(12);
    expect(count(p, (q) => !!q.glow && !!q.fine && q.material === 'pane')).toBeGreaterThanOrEqual(12);
    expect(count(p, (q) => strut(q) && q.material === 'gold')).toBeGreaterThanOrEqual(8);
    expect(count(p, (q) => q.shape === 'torus' && q.material === 'gold')).toBeGreaterThanOrEqual(1);
    expect(count(p, (q) => q.material === 'ruby' && !!q.glow)).toBeGreaterThanOrEqual(6);
    expect(tip(p).material).toBe('ruby');
  });

  it('Empire State: shoulders, a finned lantern with lit windows, a dome, a stepped mast and an antenna', () => {
    const p = rich('mooring-mast');
    expect(count(p, (q) => q.shape === 'box' && q.material === 'steel' && !q.fine && q.scale[1] > q.scale[0] * 4)).toBeGreaterThanOrEqual(8);
    expect(count(p, (q) => !!q.glow && !!q.fine)).toBeGreaterThanOrEqual(8);
    expect(count(p, (q) => q.shape === 'dome')).toBeGreaterThanOrEqual(1);
    expect(count(p, (q) => q.shape === 'torus')).toBeGreaterThanOrEqual(3);
    expect(tip(p).animate).toBe('blink');
  });

  it('Chrysler: six tiers of sunburst arches with triangular windows, steel eagles, and the needle', () => {
    const p = rich('deco-arches');
    expect(count(p, (q) => q.shape === 'arch')).toBeGreaterThanOrEqual(24);
    expect(count(p, (q) => q.shape === 'wedge' && !!q.glow)).toBeGreaterThanOrEqual(72);
    expect(count(p, (q) => q.shape === 'wedge' && !q.glow && q.material === 'steel')).toBeGreaterThanOrEqual(4);
    expect(tip(p).shape).toBe('cone');
  });

  it('Willis: two lattice masts of different heights with dishes, guy rings and blinking tips', () => {
    const p = rich('twin-antennas');
    expect(count(p, (q) => q.animate === 'blink')).toBe(2);
    expect(count(p, (q) => strut(q) && !q.fine)).toBeGreaterThanOrEqual(2 * (3 + 6 * 3));
    expect(count(p, (q) => !!q.fine && q.shape === 'cylinder')).toBeGreaterThanOrEqual(4);
    const tips = p.filter((q) => q.animate === 'blink').map((q) => partBounds(q).max[1]);
    expect(Math.abs(tips[0] - tips[1])).toBeGreaterThan(1);
  });

  it("Lloyd's: a braced lattice with platforms, a crane gantry, service pods and a mast", () => {
    const { design } = designFor('chicago', { shape: 'square', plateWidth: 30, floors: 60, crown: 'lattice-mast' });
    const H = crownHeight('lattice-mast', design.floors * FLOOR_HEIGHT);
    const p = rich('lattice-mast');
    expect(count(p, (q) => strut(q) && q.material === 'accent' && !q.fine)).toBeGreaterThanOrEqual(4 + 6 * 4);
    expect(count(p, (q) => q.shape === 'box' && q.material === 'body')).toBeGreaterThanOrEqual(2);
    expect(count(p, (q) => !!q.fine && q.material === 'body')).toBeGreaterThanOrEqual(8);
    expect(count(p, (q) => q.shape === 'box' && q.material === 'girder' && q.scale[0] > 0.3 * 30 * 0.5)).toBeGreaterThanOrEqual(1);
    expect(tip(p).animate).toBe('blink');
    expect(partBounds(tip(p)).max[1]).toBeCloseTo(design.floors * FLOOR_HEIGHT + H, 0);
  });
});
