import ReactThreeTestRenderer from '@react-three/test-renderer';
import type * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { designFor } from '../../sim/testUtils';
import { DetailScene } from './DetailCanvas';
import { detailModel } from './detailModel';

const drag = { yaw: 0, pitch: 0 };

describe('<DetailScene />', () => {
  it('draws every view without throwing', async () => {
    const { site, design } = designFor('chicago', { ornaments: ['stone-ribs', 'gargoyles', 'arched-entry'], ornament: 'high', setbacks: 'few' });
    for (const view of ['facade', 'corner', 'base'] as const) {
      const r = await ReactThreeTestRenderer.create(<DetailScene site={site} design={design} view={view} night={false} drag={drag} />);
      expect(r.scene.findAll((n) => n.props.name === 'detail')).toHaveLength(1);
      await r.unmount();
    }
  });

  it('at night, lit windows glow in their own group', async () => {
    const { site, design } = designFor('chicago');
    const lit = detailModel(design, 'facade').windows.filter((w) => w.lit).length;
    const r = await ReactThreeTestRenderer.create(<DetailScene site={site} design={design} view="facade" night drag={drag} />);
    const glowing = r.scene
      .findAll((n) => (n.instance as THREE.InstancedMesh).isInstancedMesh === true)
      .map((n) => n.instance as THREE.InstancedMesh)
      .filter((m) => (m.material as THREE.MeshStandardMaterial).emissiveIntensity > 1);
    expect(glowing.reduce((s, m) => s + m.count, 0)).toBe(lit);
  });
});
