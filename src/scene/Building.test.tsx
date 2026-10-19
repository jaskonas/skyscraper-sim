import ReactThreeTestRenderer from '@react-three/test-renderer';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CROWN_IDS, ORNAMENT_IDS } from '../sim/catalog/ids';
import { designFor } from '../sim/testUtils';
import type { PlanShape } from '../sim/types';
import { balconyParts } from './balconies';
import { Building } from './Building';
import { crownParts } from './crownParts';
import { createSway, swayAt } from './forces/sway';
import { ornamentParts } from './ornaments';

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

const instancedIn = (r: Renderer, groupName: string) =>
  r.scene
    .findAll((n) => n.props.name === groupName)[0]
    .findAll((n) => (n.instance as THREE.InstancedMesh).isInstancedMesh === true)
    .map((n) => n.instance as THREE.InstancedMesh);

const instanceTotal = (r: Renderer, groupName: string) => instancedIn(r, groupName).reduce((s, m) => s + m.count, 0);

describe('<Building />', () => {
  it('renders one body instance per floor', async () => {
    const { site, design } = designFor('chicago', { floors: 25 });
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} />);
    const body = r.scene.findAll((n) => n.props.name === 'body')[0];
    expect((body.instance as THREE.InstancedMesh).count).toBe(25);
  });

  it('gives every floor its room colour and plant-floor flag, with the facade detail on unless turned off', async () => {
    const { site, design } = designFor('chicago', { floors: 70 });
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} />);
    const body = r.scene.findAll((n) => n.props.name === 'body')[0].instance as THREE.InstancedMesh;
    expect(body.geometry.getAttribute('aRoomTint').count).toBe(70);
    expect((body.geometry.getAttribute('aMech').array as Float32Array)[29]).toBe(1);
    const material = body.material as THREE.MeshStandardMaterial;
    expect(material.userData.facadeUniforms.uDetail.value).toBe(1);
    await r.unmount();
    const simple = await ReactThreeTestRenderer.create(<Building site={site} design={design} facadeDetail={false} />);
    const plain = simple.scene.findAll((n) => n.props.name === 'body')[0].instance as THREE.InstancedMesh;
    expect((plain.material as THREE.MeshStandardMaterial).userData.facadeUniforms.uDetail.value).toBe(0);
  });

  it('draws balconies on home floors, and only up to the floors built so far during construction', async () => {
    const { site, design } = designFor('chicago', { floors: 30, useMix: { retail: 0, office: 0, hotel: 0, residential: 100 } });
    const all = balconyParts(design);
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} />);
    expect(instanceTotal(r, 'balconies')).toBe(all.length);
    await r.unmount();
    const half = await ReactThreeTestRenderer.create(<Building site={site} design={design} reveal={{ floors: 10, crown: 0, litFloors: 0, lights: false }} />);
    expect(instanceTotal(half, 'balconies')).toBe(all.filter((p) => p.position[1] < 10 * 4).length);
    expect(instanceTotal(half, 'balconies')).toBeLessThan(all.length);
  });

  it('renders every crown, with every ornament and amenity, without throwing', async () => {
    for (const crown of CROWN_IDS) {
      const { site, design } = designFor('tokyo', {
        crown, twist: 60, exposedStructure: true, ornaments: [...ORNAMENT_IDS], ornament: 'high',
        amenities: ['helipad', 'pool', 'observation-deck', 'sky-garden'],
      });
      const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} />);
      expect(instanceTotal(r, 'crown'), crown).toBe(crownParts(design).length);
      expect(instanceTotal(r, 'ornaments'), crown).toBe(ornamentParts(design).length);
      await r.unmount();
    }
  });

  it('renders every plan shape', async () => {
    const shapes: PlanShape[] = ['square', 'rectangle', 'circle', 'triangle'];
    for (const shape of shapes) {
      const { site, design } = designFor('chicago', { shape, crown: 'pagoda', exposedStructure: true });
      const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} />);
      expect(instanceTotal(r, 'bracing'), shape).toBeGreaterThan(0);
      await r.unmount();
    }
  });

  it("tiers of a crown follow a round tower's shape", async () => {
    const { site, design } = designFor('chicago', { shape: 'circle', crown: 'stepped' });
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} />);
    const meshes = instancedIn(r, 'crown');
    expect(meshes).toHaveLength(1);
    expect(meshes[0].geometry.type).toBe('CylinderGeometry');
  });

  it('lights aircraft-warning beacons on masts only at night', async () => {
    const { site, design } = designFor('chicago', { crown: 'spire' });
    const day = await ReactThreeTestRenderer.create(<Building site={site} design={design} />);
    expect(day.scene.findAll((n) => n.props.name === 'aircraft-lights')).toHaveLength(0);
    const night = await ReactThreeTestRenderer.create(<Building site={site} design={design} night />);
    expect(night.scene.findAll((n) => n.props.name === 'aircraft-lights')).toHaveLength(1);
  });

  it('keeps one facade material while a slider changes the design', async () => {
    const { site, design } = designFor('chicago', { floors: 30, shape: 'circle' });
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} />);
    const body = () => r.scene.findAll((n) => n.props.name === 'body')[0].instance as THREE.InstancedMesh;
    const material = body().material as THREE.Material;
    expect(material.userData.facadeUniforms.uRound.value).toBe(1);
    await r.update(<Building site={site} design={{ ...design, floors: 31 }} night />);
    expect(body().material).toBe(material);
    await r.update(<Building site={site} design={{ ...design, floors: 32, shape: 'square' }} />);
    expect(body().material).toBe(material);
    expect(material.userData.facadeUniforms.uRound.value).toBe(0);
  });

  it('disposes the old shape geometry when the shape changes', async () => {
    const { site, design } = designFor('chicago', { shape: 'square', crown: 'sloped' });
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} />);
    const body = r.scene.findAll((n) => n.props.name === 'body')[0].instance as THREE.InstancedMesh;
    const old = body.geometry;
    let disposed = false;
    old.addEventListener('dispose', () => (disposed = true));
    await r.update(<Building site={site} design={{ ...design, shape: 'circle' }} />);
    expect(disposed).toBe(true);
  });
});

describe('<Building reveal />', () => {
  it('during construction shows only the finished floors, no bracing, and no crown or ornaments yet', async () => {
    const { site, design } = designFor('chicago', { floors: 30, exposedStructure: true, ornaments: ['stone-ribs'], crown: 'spire' });
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} reveal={{ floors: 12, crown: 0, litFloors: 0, lights: false }} />);
    expect((r.scene.findAll((n) => n.props.name === 'body')[0].instance as THREE.InstancedMesh).count).toBe(12);
    expect((r.scene.findAll((n) => n.props.name === 'slabs')[0].instance as THREE.InstancedMesh).count).toBe(12);
    expect(instanceTotal(r, 'bracing')).toBe(0);
    expect(instanceTotal(r, 'crown')).toBe(0);
    expect(instanceTotal(r, 'ornaments')).toBe(0);
  });

  it('adds ornaments and the crown from the bottom up as the crown stage plays', async () => {
    const { site, design } = designFor('chicago', { floors: 30, ornaments: ['stone-ribs', 'rusticated-base'], ornament: 'high', crown: 'spire' });
    const at = async (crown: number) => {
      const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} reveal={{ floors: 30, crown, litFloors: 0, lights: false }} />);
      const n = { crown: instanceTotal(r, 'crown'), ornaments: instanceTotal(r, 'ornaments') };
      await r.unmount();
      return n;
    };
    const half = await at(0.5);
    const full = await at(1);
    expect(half.ornaments).toBeGreaterThan(0);
    expect(half.ornaments + half.crown).toBeLessThan(full.ornaments + full.crown);
    expect(full).toEqual({ crown: crownParts(design).length, ornaments: ornamentParts(design).length });
  });

  it('switches the lights on only up to the lit floors', async () => {
    const { site, design } = designFor('chicago', { floors: 20, useMix: { retail: 0, office: 100, hotel: 0, residential: 0 } });
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} reveal={{ floors: 20, crown: 1, litFloors: 8, lights: true }} />);
    const body = r.scene.findAll((n) => n.props.name === 'body')[0].instance as THREE.InstancedMesh;
    const lit = body.geometry.getAttribute('aLit').array as Float32Array;
    expect(Array.from(lit.slice(0, 8)).every((v) => v > 0)).toBe(true);
    expect(Array.from(lit.slice(8)).every((v) => v === 0)).toBe(true);
  });
});

describe('<Building sway />', () => {
  const xOf = (mesh: THREE.InstancedMesh, i: number) => {
    const m = new THREE.Matrix4();
    mesh.getMatrixAt(i, m);
    return m.elements[12];
  };

  it('bends the tower with the sway signal: the top floor and top ornaments move most', async () => {
    const { site, design } = designFor('chicago', { floors: 30, ornaments: ['stone-ribs', 'rusticated-base'], ornament: 'high' });
    const sway = { ...createSway(), active: true, topX: 10, baseX: 1, height: 120 };
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} sway={sway} />);
    await r.advanceFrames(1, 0.016);
    const body = r.scene.findAll((n) => n.props.name === 'body')[0].instance as THREE.InstancedMesh;
    expect(xOf(body, 29)).toBeGreaterThan(xOf(body, 0) + 5);
    expect(xOf(body, 0)).toBeGreaterThanOrEqual(1);
    const ornaments = ornamentParts(design);
    const meshes = instancedIn(r, 'ornaments');
    // Every instance sits at its own x plus the sway at its height.
    let checked = 0;
    for (const mesh of meshes)
      for (let i = 0; i < mesh.count; i++) {
        const x = xOf(mesh, i);
        const moved = ornaments.some((p) => Math.abs(p.position[0] + swayAt(sway, p.position[1]) - x) < 1e-6);
        expect(moved).toBe(true);
        checked++;
      }
    expect(checked).toBeGreaterThan(0);
  });

  it('puts every floor back when the sway stops', async () => {
    const { site, design } = designFor('chicago', { floors: 20 });
    const sway = { ...createSway(), active: true, topX: 10, height: 80 };
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} sway={sway} />);
    await r.advanceFrames(1, 0.016);
    sway.active = false;
    await r.advanceFrames(1, 0.016);
    const body = r.scene.findAll((n) => n.props.name === 'body')[0].instance as THREE.InstancedMesh;
    for (let i = 0; i < 20; i++) expect(xOf(body, i)).toBeCloseTo(0, 9);
  });

  it('keeps a swaying crown on screen: no culling by its resting position while it moves', async () => {
    const { site, design } = designFor('chicago', { floors: 30, crown: 'spire' });
    const sway = { ...createSway(), active: true, topX: 18, height: 120 };
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} sway={sway} />);
    await r.advanceFrames(1, 0.016);
    const crown = instancedIn(r, 'crown');
    expect(crown.length).toBeGreaterThan(0);
    for (const m of crown) expect(m.frustumCulled).toBe(false);
    sway.active = false;
    await r.advanceFrames(1, 0.016);
    for (const m of crown) expect(m.frustumCulled).toBe(true);
  });

  it('can hide its top floors (for the see-through damper)', async () => {
    const { site, design } = designFor('chicago', { floors: 20 });
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} hideTopFloors={3} />);
    expect((r.scene.findAll((n) => n.props.name === 'body')[0].instance as THREE.InstancedMesh).count).toBe(17);
  });
});
