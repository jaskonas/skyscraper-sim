import { describe, expect, it } from 'vitest';
import type { CrownId } from '../../../sim/catalog/ids';
import { type Part } from '../../../sim/parts';
import { designFor } from '../../../sim/testUtils';
import { crownParts } from '../../crownParts';
import { RICH_CROWNS } from '.';

const rich = (crown: CrownId) => crownParts(designFor('chicago', { shape: 'square', plateWidth: 30, floors: 60, crown, ornament: 'high' }).design, 'rich');
const count = (parts: Part[], pred: (p: Part) => boolean) => parts.filter(pred).length;
const strut = (p: Part) => p.shape === 'box' && !!p.rotation && Math.abs(p.rotation[0]) > 1e-6;

describe('rich world and eco crowns', () => {
  it('are all registered', () => {
    for (const id of ['pagoda', 'sky-bridge-arch', 'open-frame', 'glass-dome', 'glass-shards', 'wind-turbines', 'roof-forest'] as const) expect(RICH_CROWNS[id], id).toBeDefined();
  });

  it('Jin Mao: tiers with flared eaves and brackets, glass between, and a ringed finial spire', () => {
    const p = rich('pagoda');
    expect(count(p, (q) => q.shape === 'plan' && q.material === 'body')).toBeGreaterThanOrEqual(4);
    expect(count(p, (q) => q.shape === 'wedge' && q.material === 'accent')).toBeGreaterThanOrEqual(40);
    expect(count(p, (q) => !!q.fine && q.shape === 'box' && q.material === 'accent')).toBeGreaterThanOrEqual(40);
    expect(count(p, (q) => q.shape === 'plan' && q.material === 'glass' && !!q.glow)).toBeGreaterThanOrEqual(3);
    expect(count(p, (q) => q.shape === 'torus')).toBeGreaterThanOrEqual(3);
  });

  it('Kingdom Centre: finned prongs, a parabolic arch, and a glass sky bridge with a railing', () => {
    const p = rich('sky-bridge-arch');
    expect(count(p, (q) => !!q.fine && q.shape === 'box' && q.material === 'steel')).toBeGreaterThanOrEqual(20);
    expect(count(p, (q) => strut(q) && !q.fine && q.material === 'steel')).toBeGreaterThanOrEqual(10);
    expect(count(p, (q) => q.material === 'glass' && !!q.glow)).toBe(1);
  });

  it('Shanghai WFC: legs and bridge round a trapezoid hole, mullions, and a lit observation floor', () => {
    const p = rich('open-frame');
    expect(count(p, (q) => q.shape === 'wedge')).toBe(2);
    expect(count(p, (q) => !!q.fine && q.material === 'steel')).toBeGreaterThanOrEqual(30);
    expect(count(p, (q) => q.material === 'light' && !!q.glow)).toBeGreaterThanOrEqual(1);
  });

  it('The Gherkin: a glass dome with a diagrid both ways, a lens cap and a lit restaurant ring', () => {
    const p = rich('glass-dome');
    expect(count(p, (q) => q.shape === 'dome' && q.material === 'glass')).toBe(1);
    expect(count(p, (q) => strut(q) && !!q.fine && q.material === 'steel')).toBeGreaterThanOrEqual(2 * 16 * 3);
    expect(count(p, (q) => q.shape === 'torus' && !!q.glow)).toBe(1);
  });

  it('The Shard: leaning shards with framed edges and mullions, and an open spire frame', () => {
    const p = rich('glass-shards');
    expect(count(p, (q) => q.material === 'glass' && q.shape === 'box' && !q.fine)).toBeGreaterThanOrEqual(4);
    expect(count(p, (q) => !!q.fine && q.material === 'steel' && q.shape === 'box')).toBeGreaterThanOrEqual(4 * 6);
    expect(count(p, (q) => strut(q) && q.material === 'steel')).toBeGreaterThanOrEqual(3);
  });

  it('Strata: turbines with nacelles, hubs and five spinning blades in venturi rings; the deck stays', () => {
    const p = rich('wind-turbines');
    expect(count(p, (q) => q.animate === 'spin')).toBeGreaterThanOrEqual(15);
    expect(count(p, (q) => q.shape === 'torus')).toBeGreaterThanOrEqual(3);
    expect(count(p, (q) => q.shape === 'cylinder' && q.material === 'steel' && !q.animate)).toBeGreaterThanOrEqual(6);
  });

  it('Bosco Verticale: planters round the edge, twenty trees of mixed sizes, shrubs and a pergola', () => {
    const p = rich('roof-forest');
    const trunks = p.filter((q) => q.shape === 'cylinder' && q.material === 'wood');
    expect(trunks.length).toBeGreaterThanOrEqual(20);
    expect(new Set(trunks.map((q) => q.scale[1].toFixed(1))).size).toBeGreaterThanOrEqual(3);
    expect(count(p, (q) => q.shape === 'sphere' && q.material === 'foliage')).toBeGreaterThanOrEqual(50);
    expect(count(p, (q) => !!q.fine && q.material === 'concrete')).toBeGreaterThanOrEqual(12);
    expect(count(p, (q) => q.material === 'wood' && q.shape === 'box')).toBeGreaterThanOrEqual(6);
  });
});
