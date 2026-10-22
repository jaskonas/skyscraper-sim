import { useThree } from '@react-three/fiber';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { useLayoutEffect } from 'react';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { designFor } from '../../sim/testUtils';
import type { Design } from '../../sim/types';
import { Building } from '../Building';
import { createSway, swayAt } from '../forces/sway';
import { lotCenter } from '../layout';

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

/** Frames whose state updates (the walls chosen) are flushed, as React does in the browser. */
const frames = (r: Renderer, n: number) => ReactThreeTestRenderer.act(async () => r.advanceFrames(n, 0.016));

function CameraAt({ position }: { position: [number, number, number] }) {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    camera.position.set(...position);
  }, [camera, position]);
  return null;
}

const tower = () => designFor('chicago', { style: 'chicago-school', facade: 'masonry', windowPattern: 'chicago', shape: 'square', floors: 40, plateWidth: 30 });
const closeWallMeshes = (r: Renderer) => {
  const out: THREE.InstancedMesh[] = [];
  r.scene.instance.traverse((o) => {
    if ((o as THREE.InstancedMesh).isInstancedMesh && o.parent?.name === 'close-walls') out.push(o as THREE.InstancedMesh);
  });
  return out;
};
const instances = (r: Renderer) => closeWallMeshes(r).reduce((s, m) => s + m.count, 0);
const inFront = (site: ReturnType<typeof tower>['site'], dz: number): [number, number, number] => {
  const [lx, lz] = lotCenter(site);
  return [lx, 82, lz + 15 + dz];
};
const render = (design: Design, site: ReturnType<typeof tower>['site'], camera: [number, number, number], extra: Partial<Parameters<typeof Building>[0]> = {}) =>
  ReactThreeTestRenderer.create(
    <>
      <CameraAt position={camera} />
      <Building site={site} design={design} {...extra} />
    </>,
  );

describe('<Building /> close walls', () => {
  it('builds the walls in front of a close camera in true 3D', async () => {
    const { site, design } = tower();
    const r = await render(design, site, inFront(site, 20));
    await frames(r, 12);
    expect(instances(r)).toBeGreaterThan(100);
  });

  it('builds nothing from far away', async () => {
    const { site, design } = tower();
    const r = await render(design, site, inFront(site, 600));
    await frames(r, 12);
    expect(instances(r)).toBe(0);
  });

  it('builds none on Detail: Simple or while the tower goes up', async () => {
    const { site, design } = tower();
    const simple = await render(design, site, inFront(site, 20), { facadeDetail: false });
    await frames(simple, 12);
    expect(closeWallMeshes(simple)).toHaveLength(0);
    const building = await render(design, site, inFront(site, 20), { reveal: { floors: 40, crown: 1, litFloors: 0, lights: false } });
    await frames(building, 12);
    expect(closeWallMeshes(building)).toHaveLength(0);
  });

  it('sways with the tower', async () => {
    const { site, design } = tower();
    const sway = { ...createSway(), active: false, topX: 10, height: 160 };
    const r = await render(design, site, inFront(site, 20), { sway });
    await frames(r, 12);
    const mesh = closeWallMeshes(r).find((m) => m.count > 0)!;
    const rest = new THREE.Matrix4();
    mesh.getMatrixAt(0, rest);
    sway.active = true;
    await frames(r, 1);
    const moved = new THREE.Matrix4();
    mesh.getMatrixAt(0, moved);
    expect(moved.elements[12]).toBeCloseTo(rest.elements[12] + swayAt(sway, rest.elements[13]), 6);
    expect(swayAt(sway, rest.elements[13])).toBeGreaterThan(0.5);
  });
});
