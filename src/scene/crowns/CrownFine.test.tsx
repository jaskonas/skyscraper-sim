import { useThree } from '@react-three/fiber';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { useLayoutEffect } from 'react';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CROWN_IDS } from '../../sim/catalog/ids';
import { FLOOR_HEIGHT, crownHeight } from '../../sim/geometry';
import { partBounds } from '../../sim/parts';
import { designFor } from '../../sim/testUtils';
import { Building } from '../Building';
import { crownParts } from '../crownParts';
import { lotCenter } from '../layout';
import { CROWN_FINE_M } from './CrownFine';

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

function CameraAt({ position }: { position: [number, number, number] }) {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    camera.position.set(...position);
  }, [camera, position]);
  return null;
}

const fineCount = (r: Renderer) => {
  let n = 0;
  r.scene.instance.traverse((o) => {
    if ((o as THREE.InstancedMesh).isInstancedMesh && o.parent?.name === 'crown-fine') n += (o as THREE.InstancedMesh).count;
  });
  return n;
};
const frames = (r: Renderer, n: number) => ReactThreeTestRenderer.act(async () => r.advanceFrames(n, 0.016));

describe('fine crown detail', () => {
  it('shows only while the camera is near the crown', async () => {
    expect(CROWN_FINE_M).toBe(300);
    const { site, design } = designFor('chicago', { floors: 40, crown: 'gothic-pinnacles' });
    const [lx, lz] = lotCenter(site);
    const top = 40 * FLOOR_HEIGHT;
    const near = await ReactThreeTestRenderer.create(
      <>
        <CameraAt position={[lx, top + 20, lz + 60]} />
        <Building site={site} design={design} />
      </>,
    );
    await frames(near, 12);
    expect(fineCount(near)).toBe(crownParts(design, 'rich').filter((p) => p.fine).length);
    const far = await ReactThreeTestRenderer.create(
      <>
        <CameraAt position={[lx, top, lz + 900]} />
        <Building site={site} design={design} />
      </>,
    );
    await frames(far, 12);
    expect(fineCount(far)).toBe(0);
  });

  it('with the fine pieces hidden, every crown still reaches its tip', () => {
    for (const crown of CROWN_IDS) {
      const { design } = designFor('chicago', { floors: 60, crown });
      const body = design.floors * FLOOR_HEIGHT;
      const H = crownHeight(crown, body);
      const coarse = crownParts(design, 'rich').filter((p) => !p.fine);
      const tip = Math.max(...coarse.map((p) => partBounds(p).max[1]));
      expect(Math.abs(tip - (body + H)), crown).toBeLessThanOrEqual(Math.max(0.05 * H, 0.5));
    }
  });
});

describe('fine crown detail during construction', () => {
  it('the crown stage reveals the whole rich crown, coarse and fine', async () => {
    const { site, design } = designFor('chicago', { floors: 30, crown: 'spire' });
    const [lx, lz] = lotCenter(site);
    const r = await ReactThreeTestRenderer.create(
      <>
        <CameraAt position={[lx, 140, lz + 40]} />
        <Building site={site} design={design} reveal={{ floors: 30, crown: 1, litFloors: 0, lights: false }} />
      </>,
    );
    await frames(r, 12);
    let coarse = 0;
    r.scene.instance.traverse((o) => {
      if ((o as THREE.InstancedMesh).isInstancedMesh && o.parent?.name === 'crown') coarse += (o as THREE.InstancedMesh).count;
    });
    expect(coarse + fineCount(r)).toBe(crownParts(design, 'rich').length);
  });
});

describe('near parts', () => {
  it("doesn't flicker at the edge: on inside 280 m, off beyond 320 m", async () => {
    const { site, design } = designFor('chicago', { floors: 40, crown: 'gothic-pinnacles' });
    const [lx, lz] = lotCenter(site);
    const top = 40 * FLOOR_HEIGHT + 10;
    const at = (d: number) => (
      <>
        <CameraAt position={[lx, top, lz + d]} />
        <Building site={site} design={design} />
      </>
    );
    const r = await ReactThreeTestRenderer.create(at(250));
    await frames(r, 12);
    expect(fineCount(r)).toBeGreaterThan(0);
    await ReactThreeTestRenderer.act(async () => r.update(at(305)));
    await frames(r, 12);
    expect(fineCount(r)).toBeGreaterThan(0);
    await ReactThreeTestRenderer.act(async () => r.update(at(330)));
    await frames(r, 12);
    expect(fineCount(r)).toBe(0);
    await ReactThreeTestRenderer.act(async () => r.update(at(295)));
    await frames(r, 12);
    expect(fineCount(r)).toBe(0);
  });
});
