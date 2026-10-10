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
});
