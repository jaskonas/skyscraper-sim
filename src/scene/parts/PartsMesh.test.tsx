import ReactThreeTestRenderer from '@react-three/test-renderer';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { Part } from '../../sim/parts';
import { PartsMesh } from './PartsMesh';

const palette = { body: '#888888', accent: '#444444', glass: '#335577' };
const pane = (x: number, glowColor: string): Part => ({ shape: 'box', position: [x, 0, 0], scale: [1, 1, 0.05], material: 'glass', glow: true, glowColor });

describe('<PartsMesh />', () => {
  it('lets a glowing part glow in its own colour at night', async () => {
    const r = await ReactThreeTestRenderer.create(
      <PartsMesh name="t" parts={[pane(0, '#dfe8ff'), pane(2, '#ffcf7a'), pane(4, '#ffcf7a')]} palette={palette} plan="square" night />,
    );
    const meshes: THREE.InstancedMesh[] = [];
    r.scene.instance.traverse((o) => {
      if ((o as THREE.InstancedMesh).isInstancedMesh) meshes.push(o as THREE.InstancedMesh);
    });
    const glows = meshes.map((m) => '#' + (m.material as THREE.MeshStandardMaterial).emissive.getHexString()).sort();
    expect(glows).toEqual(['#dfe8ff', '#ffcf7a']);
    expect(meshes.reduce((s, m) => s + m.count, 0)).toBe(3);
  });

  it('has a blind material', async () => {
    const r = await ReactThreeTestRenderer.create(
      <PartsMesh name="t" parts={[{ shape: 'box', position: [0, 0, 0], scale: [1, 1, 1], material: 'blind' }]} palette={palette} plan="square" />,
    );
    const mesh = r.scene.findAll((n) => (n.instance as THREE.InstancedMesh).isInstancedMesh === true)[0].instance as THREE.InstancedMesh;
    expect('#' + (mesh.material as THREE.MeshStandardMaterial).color.getHexString()).toBe('#b9b7af');
  });
});
