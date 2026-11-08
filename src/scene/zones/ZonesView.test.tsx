import ReactThreeTestRenderer from '@react-three/test-renderer';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { USE_LABEL } from '../../sim/catalog/zones';
import { designFor } from '../../sim/testUtils';
import { ZonesView } from './ZonesView';

const blocksOf = async (selected: number | null) => {
  const { site, design } = designFor('chicago', { floors: 40, stack: [{ use: 'retail', share: 10 }, { use: 'office', share: 90 }] });
  const r = await ReactThreeTestRenderer.create(<ZonesView site={site} design={design} selected={selected} />);
  return { r, mesh: r.scene.findAll((n) => n.props.name === 'zone-blocks')[0].instance as THREE.InstancedMesh };
};

describe('<ZonesView />', () => {
  it('tints every floor in its zone colour in one see-through mesh that casts no shadow', async () => {
    const { mesh } = await blocksOf(null);
    expect(mesh.count).toBe(40);
    expect(mesh.castShadow).toBe(false);
    const c = new THREE.Color();
    mesh.getColorAt(0, c);
    expect(c.getHexString()).toBe(new THREE.Color(USE_LABEL.retail.color).getHexString());
    mesh.getColorAt(39, c);
    expect(c.getHexString()).toBe(new THREE.Color(USE_LABEL.office.color).getHexString());
    expect((mesh.material as THREE.Material).depthWrite).toBe(false);
  });

  it('the selected zone is brighter than the others', async () => {
    const { mesh } = await blocksOf(0);
    const shops = new THREE.Color();
    const offices = new THREE.Color();
    mesh.getColorAt(0, shops);
    mesh.getColorAt(39, offices);
    const hsl = (col: THREE.Color) => col.getHSL({ h: 0, s: 0, l: 0 }).l;
    expect(hsl(shops)).toBeGreaterThan(hsl(new THREE.Color(USE_LABEL.retail.color)));
    expect(hsl(offices)).toBeLessThan(hsl(new THREE.Color(USE_LABEL.office.color)));
  });

  it('frees its geometry and material when turned off', async () => {
    const { r, mesh } = await blocksOf(null);
    let disposed = 0;
    mesh.geometry.addEventListener('dispose', () => disposed++);
    (mesh.material as THREE.Material).addEventListener('dispose', () => disposed++);
    await r.unmount();
    expect(disposed).toBe(2);
  });

  it('a selection that is not drawn dims nothing', async () => {
    const { mesh } = await blocksOf(7);
    const c = new THREE.Color();
    mesh.getColorAt(39, c);
    expect(c.getHexString()).toBe(new THREE.Color(USE_LABEL.office.color).getHexString());
  });
});
