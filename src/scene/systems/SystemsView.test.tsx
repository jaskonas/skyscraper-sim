import ReactThreeTestRenderer from '@react-three/test-renderer';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { analyze } from '../../sim/analysis';
import { designFor } from '../../sim/testUtils';
import { SYSTEM_IDS } from '../../sim/systems/facts';
import { systemNetwork } from '../../sim/systems/network';
import { SystemsView } from './SystemsView';
import { segmentsOf } from './flow';

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;
const mesh = (r: Renderer, name: string) => r.scene.findAll((n) => n.props.name === name)[0]?.instance as THREE.InstancedMesh | undefined;
const setup = () => {
  const { site, design } = designFor('chicago', { floors: 40, elevators: 12 });
  return { site, design, analysis: analyze(site, design) };
};

describe('<SystemsView />', () => {
  it('draws every system: one segment per line piece, pulses within the cap', async () => {
    const { site, design, analysis } = setup();
    for (const system of SYSTEM_IDS) {
      const r = await ReactThreeTestRenderer.create(<SystemsView site={site} design={design} analysis={analysis} system={system} />);
      await r.advanceFrames(2, 0.016);
      const net = systemNetwork(site, design, analysis, system);
      expect(mesh(r, 'system-lines')?.count ?? 0, system).toBe(segmentsOf(net.lines).length);
      expect(mesh(r, 'system-pulses')?.count ?? 0, system).toBeLessThanOrEqual(400);
      await r.unmount();
    }
  });

  it('runs one car per elevator, and the cars move', async () => {
    const { site, design, analysis } = setup();
    const r = await ReactThreeTestRenderer.create(<SystemsView site={site} design={design} analysis={analysis} system="elevators" />);
    await r.advanceFrames(1, 0.016);
    const cars = mesh(r, 'system-cars')!;
    expect(cars.count).toBe(12);
    const before = new THREE.Matrix4();
    cars.getMatrixAt(3, before);
    await r.advanceFrames(60, 0.05);
    const after = new THREE.Matrix4();
    cars.getMatrixAt(3, after);
    expect(after.elements[13]).not.toBeCloseTo(before.elements[13], 3);
  });

  it('pulses move along their lines', async () => {
    const { site, design, analysis } = setup();
    const r = await ReactThreeTestRenderer.create(<SystemsView site={site} design={design} analysis={analysis} system="water" />);
    await r.advanceFrames(1, 0.016);
    const p = mesh(r, 'system-pulses')!;
    const a = new THREE.Matrix4();
    p.getMatrixAt(0, a);
    await r.advanceFrames(10, 0.05);
    const b = new THREE.Matrix4();
    p.getMatrixAt(0, b);
    expect(new THREE.Vector3().setFromMatrixPosition(a).distanceTo(new THREE.Vector3().setFromMatrixPosition(b))).toBeGreaterThan(0.5);
  });
});
