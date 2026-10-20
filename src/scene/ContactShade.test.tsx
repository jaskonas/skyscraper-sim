import ReactThreeTestRenderer from '@react-three/test-renderer';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { SITES } from '../sim/sites';
import { designFor } from '../sim/testUtils';
import { ContactShade } from './ContactShade';
import { generateNeighbors } from './layout';

describe('<ContactShade />', () => {
  it('draws one soft patch per building, and never casts a shadow itself', async () => {
    const site = SITES['new-york'];
    const { design } = designFor('new-york', { floors: 30 });
    const r = await ReactThreeTestRenderer.create(<ContactShade site={site} design={design} />);
    const mesh = r.scene.findAll((n) => n.props.name === 'contact-shade')[0].instance as THREE.InstancedMesh;
    expect(mesh.count).toBe(generateNeighbors(site).length + 1);
    expect(mesh.castShadow).toBe(false);
    const material = mesh.material as THREE.MeshBasicMaterial;
    expect(material.blending).toBe(THREE.MultiplyBlending);
    expect(material.depthWrite).toBe(false);
  });

  it('multiplies the ground by its own shade only: no tone mapping or fog tint, so its edge is invisible', async () => {
    const site = SITES['new-york'];
    const { design } = designFor('new-york', { floors: 30 });
    const r = await ReactThreeTestRenderer.create(<ContactShade site={site} design={design} />);
    const mesh = r.scene.findAll((n) => n.props.name === 'contact-shade')[0].instance as THREE.InstancedMesh;
    const material = mesh.material as THREE.MeshBasicMaterial;
    expect(material.toneMapped).toBe(false);
    expect(material.fog).toBe(false);
  });
});
