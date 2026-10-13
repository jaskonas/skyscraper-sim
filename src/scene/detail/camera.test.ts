import { describe, expect, it } from 'vitest';
import { MAX_DRAG_PITCH, MAX_DRAG_YAW, cameraPose, dragBy, easeBack } from './camera';

const focus = { target: [0, 8, 0] as [number, number, number], distance: 30, yaw: 0, pitch: 0 };

describe('close-up camera', () => {
  it('sits in front of the wall at the framed distance when not dragged', () => {
    const { position, target } = cameraPose(focus, { yaw: 0, pitch: 0 });
    expect(position).toEqual([0, 8, 30]);
    expect(target).toEqual([0, 8, 0]);
  });

  it('never lets the player drag past ±30° sideways or ±15° up and down', () => {
    const far = dragBy({ yaw: 0, pitch: 0 }, -5000, 5000);
    expect(far.yaw).toBeCloseTo(MAX_DRAG_YAW);
    expect(far.pitch).toBeCloseTo(MAX_DRAG_PITCH);
    const back = dragBy(far, 10000, -10000);
    expect(back.yaw).toBeCloseTo(-MAX_DRAG_YAW);
    expect(back.pitch).toBeCloseTo(-MAX_DRAG_PITCH);
  });

  it('eases back to the framed view in about 0.4 seconds', () => {
    let d = { yaw: MAX_DRAG_YAW, pitch: -MAX_DRAG_PITCH };
    for (let i = 0; i < 25; i++) d = easeBack(d, 1 / 60);
    expect(d).toEqual({ yaw: 0, pitch: 0 });
  });
});
