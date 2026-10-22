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

describe('rich Gothic and classic crowns', () => {
  it('are all registered', () => {
    for (const id of ['gothic-pinnacles', 'flying-buttresses', 'dome-lantern', 'clock-tower', 'mansard', 'cornice'] as const) expect(RICH_CROWNS[id], id).toBeDefined();
  });

  it('Woolworth: a steep copper roof with dormers, crocketed corner pinnacles, lancet tracery and a lantern', () => {
    const p = rich('gothic-pinnacles');
    expect(count(p, (q) => q.shape === 'plan-cone' && q.material === 'copper')).toBe(1);
    expect(count(p, (q) => !!q.fine && q.shape === 'pyramid' && q.material === 'copper')).toBeGreaterThanOrEqual(16);
    expect(count(p, (q) => q.shape === 'octagon' && q.material === 'stone')).toBeGreaterThanOrEqual(8);
    expect(count(p, (q) => !!q.fine && q.shape === 'cone' && q.material === 'stone')).toBeGreaterThanOrEqual(24);
    expect(count(p, (q) => q.shape === 'lancet' && !!q.fine)).toBeGreaterThanOrEqual(12);
    expect(count(p, (q) => q.shape === 'octagon' && !!q.glow)).toBe(1);
  });

  it('Tribune Tower: a lancet-windowed lantern held by buttress arms from corner pinnacles, a pierced parapet and a cap', () => {
    const p = rich('flying-buttresses');
    expect(count(p, (q) => q.shape === 'octagon' && q.material === 'stone' && q.scale[0] > 5)).toBeGreaterThanOrEqual(1);
    expect(count(p, (q) => q.shape === 'lancet' && !!q.glow)).toBeGreaterThanOrEqual(8);
    expect(count(p, (q) => strut(q) && q.material === 'stone')).toBeGreaterThanOrEqual(8);
    expect(count(p, (q) => !!q.fine && q.shape === 'box' && q.material === 'stone')).toBeGreaterThanOrEqual(16);
    expect(count(p, (q) => q.material === 'copper' && q.shape === 'cone')).toBeGreaterThanOrEqual(1);
  });

  it('Singer: a columned drum, a ribbed copper dome with oculi, and a columned lantern', () => {
    const p = rich('dome-lantern');
    expect(count(p, (q) => !!q.fine && q.shape === 'cylinder' && q.material === 'stone')).toBeGreaterThanOrEqual(12);
    expect(count(p, (q) => q.shape === 'dome' && q.material === 'copper')).toBe(1);
    expect(count(p, (q) => strut(q) && q.material === 'copper')).toBeGreaterThanOrEqual(12);
    expect(count(p, (q) => !!q.fine && q.shape === 'torus')).toBeGreaterThanOrEqual(8);
    expect(count(p, (q) => !!q.glow && q.material === 'light')).toBeGreaterThanOrEqual(1);
  });

  it('MetLife: clocks on four sides with hands, an arcaded loggia, a gold pyramid and a lantern', () => {
    const p = rich('clock-tower');
    expect(count(p, (q) => q.shape === 'cylinder' && q.material === 'light' && !!q.glow)).toBeGreaterThanOrEqual(4);
    expect(count(p, (q) => !!q.fine && q.shape === 'box' && q.material === 'steel')).toBeGreaterThanOrEqual(8);
    expect(count(p, (q) => q.shape === 'arch')).toBeGreaterThanOrEqual(16);
    expect(count(p, (q) => q.shape === 'pyramid' && q.material === 'gold')).toBe(1);
    expect(tip(p).material).toBe('gold');
  });

  it('The Plaza: a dentilled cornice, a copper mansard with dormers, cresting, and corner turrets with ogee caps', () => {
    const p = rich('mansard');
    expect(count(p, (q) => !!q.fine && q.shape === 'box' && q.material === 'stone')).toBeGreaterThanOrEqual(40);
    expect(count(p, (q) => !!q.fine && q.shape === 'pyramid')).toBeGreaterThanOrEqual(12);
    expect(count(p, (q) => q.shape === 'ogee')).toBeGreaterThanOrEqual(4);
    expect(count(p, (q) => !!q.fine && q.material === 'copper' && q.shape === 'cylinder')).toBeGreaterThanOrEqual(16);
  });

  it('Reliance: a deep cornice on brackets with dentils and a frieze', () => {
    const p = rich('cornice');
    expect(count(p, (q) => !!q.fine && q.material === 'accent' && q.shape === 'box')).toBeGreaterThanOrEqual(80);
    expect(count(p, (q) => q.shape === 'plan')).toBeGreaterThanOrEqual(3);
  });
});
