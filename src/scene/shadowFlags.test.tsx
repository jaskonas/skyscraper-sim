import ReactThreeTestRenderer from '@react-three/test-renderer';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { SITES } from '../sim/sites';
import { designFor } from '../sim/testUtils';
import { Building } from './Building';
import { createSway } from './forces/sway';
import { Landmark } from './Landmark';
import { Neighbors } from './Neighbors';
import { SiteDiorama } from './SiteDiorama';
import { useGame } from '../state/store';
import { shadowFlags, sunDirection } from './sunShadow';

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

const meshes = (r: Renderer) => {
  const out: THREE.Mesh[] = [];
  r.scene.instance.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) out.push(o as THREE.Mesh);
  });
  return out;
};
const seeThrough = (m: THREE.Mesh) => {
  const mat = m.material as THREE.Material;
  return mat.transparent && mat.opacity < 1;
};

describe('shadow flags', () => {
  it('lets opaque things cast and receive, and see-through things only receive', () => {
    expect(shadowFlags({})).toEqual({ castShadow: true, receiveShadow: true });
    expect(shadowFlags({ transparent: true, opacity: 1 })).toEqual({ castShadow: true, receiveShadow: true });
    expect(shadowFlags({ transparent: true, opacity: 0.65 })).toEqual({ castShadow: false, receiveShadow: true });
  });

  it('every opaque mesh of a tower casts and receives; see-through ones only receive', async () => {
    const { site, design } = designFor('chicago', {
      floors: 40,
      useMix: { retail: 0, office: 50, hotel: 0, residential: 50 },
      amenities: ['helipad', 'pool', 'observation-deck', 'sky-garden'],
      ornaments: ['stone-ribs'],
      ornament: 'high',
    });
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} />);
    const all = meshes(r);
    expect(all.length).toBeGreaterThan(5);
    for (const m of all) {
      expect([m.name, m.castShadow]).toEqual([m.name, !seeThrough(m)]);
      expect([m.name, m.receiveShadow]).toEqual([m.name, true]);
    }
  });

  it('neighbours and the landmark cast and receive; the ground receives; the soil bands do neither', async () => {
    const site = SITES['new-york'];
    const n = await ReactThreeTestRenderer.create(<Neighbors site={site} />);
    for (const m of meshes(n)) expect([m.castShadow, m.receiveShadow]).toEqual([true, true]);
    const l = await ReactThreeTestRenderer.create(<Landmark kind={site.visuals.landmark} />);
    expect(meshes(l).length).toBeGreaterThan(0);
    for (const m of meshes(l)) expect([m.castShadow, m.receiveShadow]).toEqual([true, true]);
    const d = await ReactThreeTestRenderer.create(<SiteDiorama site={site} />);
    for (const m of meshes(d)) {
      if (seeThrough(m)) expect([m.castShadow, m.receiveShadow]).toEqual([false, false]);
      else expect([m.castShadow, m.receiveShadow]).toEqual([false, true]);
    }
  });

  it('a swaying tower keeps casting from every part', async () => {
    const { site, design } = designFor('chicago', { floors: 30, ornaments: ['stone-ribs'], ornament: 'high' });
    const sway = { ...createSway(), active: true, topX: 10, height: 120 };
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} sway={sway} />);
    await r.advanceFrames(1, 0.016);
    const parts = meshes(r).filter((m) => m.name.startsWith('parts:'));
    expect(parts.length).toBeGreaterThan(0);
    for (const m of parts) expect([m.frustumCulled, m.castShadow]).toEqual([false, true]);
  });

  it("the glass glints in the sun the light actually comes from", async () => {
    const { site, design } = designFor('chicago', { floors: 10 });
    const sunDir = async () => {
      const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} />);
      const body = r.scene.findAll((n) => n.props.name === 'body')[0].instance as THREE.InstancedMesh;
      const v = ((body.material as THREE.Material).userData.facadeUniforms.uSunDir.value as THREE.Vector3).clone();
      await r.unmount();
      return v;
    };
    useGame.getState().setShadows(true);
    expect((await sunDir()).toArray()).toEqual(new THREE.Vector3(...sunDirection(true)).normalize().toArray());
    useGame.getState().setShadows(false);
    expect((await sunDir()).toArray()).toEqual(new THREE.Vector3(...sunDirection(false)).normalize().toArray());
    useGame.getState().setShadows(true);
  });
});
