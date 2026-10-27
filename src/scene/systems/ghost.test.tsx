import ReactThreeTestRenderer from '@react-three/test-renderer';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { designFor } from '../../sim/testUtils';
import { Building } from '../Building';

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;
const materials = (r: Renderer) => {
  const out: THREE.Material[] = [];
  r.scene.instance.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) for (const mat of ([] as THREE.Material[]).concat(mesh.material)) out.push(mat);
  });
  return out;
};
// Values, not identities: some meshes rebuild their materials on re-render, with the same settings.
const casters = (r: Renderer) => {
  let n = 0;
  r.scene.instance.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && o.castShadow) n++;
  });
  return n;
};
const snapshot = (r: Renderer) => materials(r).map((m) => [m.type, m.opacity, m.transparent, m.depthWrite].join('|')).sort();
const frames = (r: Renderer, n: number) => ReactThreeTestRenderer.act(async () => r.advanceFrames(n, 0.016));

describe('ghosting the tower', () => {
  it('makes every material see-through, and puts each back exactly', async () => {
    const { site, design } = designFor('chicago', { floors: 30, crown: 'gothic-pinnacles', ornaments: ['stone-ribs'], ornament: 'high' });
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} />);
    await frames(r, 2);
    const before = snapshot(r);
    const castBefore = casters(r);
    await ReactThreeTestRenderer.act(async () => r.update(<Building site={site} design={design} ghost />));
    await frames(r, 2);
    r.scene.instance.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) expect(o.castShadow).toBe(false);
    });
    for (const m of materials(r)) {
      expect(m.transparent).toBe(true);
      expect(m.opacity).toBeLessThanOrEqual(0.06);
      expect(m.depthWrite).toBe(false);
    }
    await ReactThreeTestRenderer.act(async () => r.update(<Building site={site} design={design} />));
    await frames(r, 2);
    expect(snapshot(r)).toEqual(before);
    expect(casters(r)).toBe(castBefore);
  });

  it('keeps new parts ghosted when the design changes while ghosted', async () => {
    const { site, design } = designFor('chicago', { floors: 30, crown: 'flat' });
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} ghost />);
    await frames(r, 2);
    await ReactThreeTestRenderer.act(async () => r.update(<Building site={site} design={{ ...design, crown: 'spire' }} ghost />));
    await frames(r, 2);
    for (const m of materials(r)) expect(m.opacity).toBeLessThanOrEqual(0.06);
  });
});
