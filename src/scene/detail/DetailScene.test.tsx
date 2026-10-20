import ReactThreeTestRenderer from '@react-three/test-renderer';
import type * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { designFor } from '../../sim/testUtils';
import { DetailScene } from './DetailCanvas';
import { useGame } from '../../state/store';
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

describe('<DetailScene /> shadows', () => {
  it("the close-up's sun casts only when shadows are on", async () => {
    const { site, design } = designFor('chicago');
    const sunOf = (r: Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>) =>
      r.scene.findAll((n) => n.type === 'DirectionalLight')[0].instance as THREE.DirectionalLight;
    useGame.getState().setFacadeDetail('high');
    useGame.getState().setShadows(true);
    const on = await ReactThreeTestRenderer.create(<DetailScene site={site} design={design} view="facade" night={false} drag={drag} />);
    expect(sunOf(on).castShadow).toBe(true);
    expect(sunOf(on).shadow.mapSize.x).toBe(1024);
    await on.unmount();
    useGame.getState().setShadows(false);
    const off = await ReactThreeTestRenderer.create(<DetailScene site={site} design={design} view="facade" night={false} drag={drag} />);
    expect(sunOf(off).castShadow).toBe(false);
    await off.unmount();
    useGame.getState().setShadows(true);
    const dark = await ReactThreeTestRenderer.create(<DetailScene site={site} design={design} view="facade" night drag={drag} />);
    expect(sunOf(dark).castShadow).toBe(false);
  });
});
