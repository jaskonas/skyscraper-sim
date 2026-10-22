import { describe, expect, it } from 'vitest';
import type { CrownId } from '../../../sim/catalog/ids';
import { partBounds, type Part } from '../../../sim/parts';
import { designFor } from '../../../sim/testUtils';
import { crownParts } from '../../crownParts';
import { RICH_CROWNS } from '.';

const rich = (crown: CrownId) => crownParts(designFor('chicago', { shape: 'square', plateWidth: 30, floors: 60, crown, ornament: 'high' }).design, 'rich');
const count = (parts: Part[], pred: (p: Part) => boolean) => parts.filter(pred).length;
const tip = (parts: Part[]) => parts.reduce((best, p) => (partBounds(p).max[1] > partBounds(best).max[1] ? p : best));
const strut = (p: Part) => p.shape === 'box' && !!p.rotation && Math.abs(p.rotation[0]) > 1e-6;

describe('rich modern crowns', () => {
  it('are all registered', () => {
    for (const id of ['stepped', 'pointed', 'sloped', 'split-pediment', 'gold-obelisk', 'flat', 'concrete-cap'] as const) expect(RICH_CROWNS[id], id).toBeDefined();
  });

  it('40 Wall Street: setback tiers with corner piers and lit windows, a copper pyramid with dormers, and a spire', () => {
    const p = rich('stepped');
    expect(count(p, (q) => q.shape === 'plan' && q.material === 'accent' && !q.fine)).toBeGreaterThanOrEqual(3);
    expect(count(p, (q) => q.shape === 'box' && q.material === 'accent' && !q.fine && q.scale[1] > q.scale[0])).toBeGreaterThanOrEqual(12);
    expect(count(p, (q) => !!q.glow && !!q.fine && q.material === 'pane')).toBeGreaterThanOrEqual(12);
    expect(count(p, (q) => q.shape === 'plan-cone' && q.material === 'copper')).toBe(1);
    expect(count(p, (q) => !!q.fine && q.shape === 'pyramid' && q.material === 'copper')).toBeGreaterThanOrEqual(4);
    expect(tip(p).shape).toBe('cone');
  });

  it('Transamerica: a pyramid with bands of lit windows, two wings, and a lit spire', () => {
    const p = rich('pointed');
    expect(count(p, (q) => q.shape === 'plan-cone')).toBe(1);
    expect(count(p, (q) => !!q.glow && !!q.fine && q.material === 'pane')).toBeGreaterThanOrEqual(24);
    expect(count(p, (q) => q.shape === 'wedge' && q.material === 'accent')).toBe(2);
    expect(count(p, (q) => q.material === 'light' && !!q.glow && !q.fine)).toBeGreaterThanOrEqual(1);
  });

  it('Citigroup: a 45° roof with a grid of mullions, side walls and a lit edge', () => {
    const p = rich('sloped');
    expect(count(p, (q) => q.shape === 'wedge' && q.material === 'accent')).toBe(1);
    expect(count(p, (q) => strut(q) && !!q.fine)).toBeGreaterThanOrEqual(20);
    expect(count(p, (q) => !!q.glow && q.material === 'light')).toBeGreaterThanOrEqual(1);
  });

  it('AT&T: a split pediment with an oculus, a dentilled cornice and acroteria', () => {
    const p = rich('split-pediment');
    expect(count(p, (q) => q.shape === 'wedge')).toBe(2);
    expect(count(p, (q) => q.shape === 'torus')).toBe(1);
    expect(count(p, (q) => !!q.fine && q.shape === 'box')).toBeGreaterThanOrEqual(30);
    expect(count(p, (q) => q.shape === 'sphere')).toBeGreaterThanOrEqual(2);
  });

  it('Bank of America Plaza: an open gold lattice pyramid round an obelisk, glowing at night', () => {
    const p = rich('gold-obelisk');
    expect(count(p, (q) => strut(q) && q.material === 'gold' && !!q.glow)).toBeGreaterThanOrEqual(4 + 6 * 4);
    expect(count(p, (q) => q.shape === 'box' && !strut(q) && q.material === 'gold' && q.scale[1] > 5 * q.scale[0])).toBe(1);
    expect(tip(p).material).toBe('gold');
  });

  it('Seagram: a bronze fascia with mullions running past the roof; the deck stays where it was', () => {
    const p = rich('flat');
    expect(count(p, (q) => !!q.fine && q.shape === 'box' && q.material === 'accent')).toBeGreaterThanOrEqual(40);
    expect(count(p, (q) => q.material === 'steel' && q.shape === 'box' && !q.fine)).toBe(0);
  });

  it('Barbican: an overhanging cap with coffered soffit ribs and hammered fins', () => {
    const p = rich('concrete-cap');
    expect(count(p, (q) => q.shape === 'plan' && q.material === 'concrete')).toBeGreaterThanOrEqual(2);
    expect(count(p, (q) => !!q.fine && q.material === 'concrete')).toBeGreaterThanOrEqual(60);
  });
});
