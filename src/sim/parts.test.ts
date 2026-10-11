import { describe, expect, it } from 'vitest';
import { partBounds, placePart, rotateYXZ, strutPart, type Part } from './parts';

const close = (a: number[], b: number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 6));

describe('parts', () => {
  it('rotates about Y so that +x turns toward -z', () => {
    close(rotateYXZ([1, 0, 0], [0, Math.PI / 2, 0]), [0, 0, -1]);
  });

  it('gives an upright box bounds of position ± scale / 2', () => {
    const p: Part = { shape: 'box', position: [1, 10, -2], scale: [2, 4, 6], material: 'body' };
    const b = partBounds(p);
    close(b.min, [0, 8, -5]);
    close(b.max, [2, 12, 1]);
  });

  it('makes a strut whose ends land on the requested points', () => {
    const from: [number, number, number] = [3, 0, 4];
    const to: [number, number, number] = [-1, 10, 2];
    const s = strutPart(from, to, 0.5, 'steel');
    const half = rotateYXZ([0, s.scale[1] / 2, 0], s.rotation);
    close([s.position[0] + half[0], s.position[1] + half[1], s.position[2] + half[2]], to);
    close([s.position[0] - half[0], s.position[1] - half[1], s.position[2] - half[2]], from);
  });

  it('placePart turns a group about the vertical axis and lifts it', () => {
    const s = strutPart([1, 0, 0], [1, 5, 0], 0.2, 'steel');
    const moved = placePart(s, Math.PI / 2, 100);
    close(moved.position, [0, 102.5, -1]);
    const top = rotateYXZ([0, moved.scale[1] / 2, 0], moved.rotation);
    close(top, [0, 2.5, 0]);
  });
});
