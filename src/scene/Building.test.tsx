import ReactThreeTestRenderer from '@react-three/test-renderer';
import type * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { designFor } from '../sim/testUtils';
import type { CrownType, PlanShape } from '../sim/types';
import { Building } from './Building';

describe('<Building />', () => {
  it('renders one body instance per floor', async () => {
    const { site, design } = designFor('chicago', { floors: 25 });
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} />);
    const body = r.scene.findAll((n) => n.props.name === 'body')[0];
    expect((body.instance as THREE.InstancedMesh).count).toBe(25);
  });

  it('renders every shape, crown and amenity without throwing', async () => {
    const shapes: PlanShape[] = ['square', 'rectangle', 'circle', 'triangle'];
    const crowns: CrownType[] = ['flat', 'spire', 'pointed', 'stepped', 'sloped'];
    for (const shape of shapes)
      for (const crown of crowns) {
        const { site, design } = designFor('tokyo', {
          shape, crown, twist: 60, exposedStructure: true, amenities: ['helipad', 'pool', 'observation-deck', 'sky-garden'],
        });
        const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} />);
        expect(r.scene.findAll((n) => n.props.name === 'crown')).toHaveLength(1);
        await r.unmount();
      }
  });

  it('flat and stepped crowns follow a round tower\'s shape', async () => {
    for (const crown of ['flat', 'stepped'] as const) {
      const { site, design } = designFor('chicago', { shape: 'circle', crown });
      const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} />);
      const crownGroup = r.scene.findAll((n) => n.props.name === 'crown')[0];
      const meshes = crownGroup.findAll((n) => n.type === 'Mesh');
      for (const m of meshes) expect((m.instance as THREE.Mesh).geometry.type).toBe('CylinderGeometry');
      await r.unmount();
    }
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
