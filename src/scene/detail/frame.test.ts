import { describe, expect, it } from 'vitest';
import type { FloorSlice } from '../../sim/geometry';
import type { Part } from '../../sim/parts';
import { placeAtAnchor, toLocalPart, toLocalPoint, worldAnchor } from './frame';

const close = (a: number[], b: number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 6));

describe('close-up frame', () => {
  it('turns a floor-plan anchor with the floor and lifts it to the floor', () => {
    const slice: FloorSlice = { index: 3, y: 12, width: 20, depth: 20, rotation: Math.PI / 2 };
    const a = worldAnchor(slice, { x: 0, z: 10, yaw: 0 });
    close(a.position, [10, 12, 0]);
    expect(a.yaw).toBeCloseTo(Math.PI / 2);
  });

  it('puts a point straight out from the wall on the local +z axis', () => {
    const frame = { origin: [10, 12, 0] as [number, number, number], yaw: Math.PI / 2 };
    close(toLocalPoint([15, 14, 0], frame), [0, 2, 5]);
  });

  it('a bay part placed on the wall and brought back into the frame keeps its bay coordinates', () => {
    const anchor = { position: [10, 12, 0] as [number, number, number], yaw: Math.PI / 2 };
    const frame = { origin: anchor.position, yaw: anchor.yaw };
    const p: Part = { shape: 'box', position: [1, 2, 0.3], scale: [1, 1, 1], material: 'body' };
    const back = toLocalPart(placeAtAnchor(p, anchor), frame);
    close(back.position, [1, 2, 0.3]);
    close(back.rotation!, [0, 0, 0]);
  });
});
