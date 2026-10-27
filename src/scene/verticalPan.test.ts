import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { attachVerticalPan, panStep } from './verticalPan';

const setup = () => {
  const el = document.createElement('div');
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 100, 300);
  const controls = { target: new THREE.Vector3(0, 100, 0), update: vi.fn() };
  const orbit = vi.fn();
  el.addEventListener('wheel', orbit);
  const off = attachVerticalPan(el, () => camera, () => controls);
  const wheel = (init: WheelEventInit) => {
    const e = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init });
    el.dispatchEvent(e);
    return e;
  };
  return { el, camera, controls, orbit, off, wheel };
};

describe('shift + scroll moves the view up and down', () => {
  it('scrolling up with shift lifts the camera and what it looks at together, and the zoom never sees it', () => {
    const { camera, controls, orbit, wheel } = setup();
    const e = wheel({ deltaY: -100, shiftKey: true });
    expect(camera.position.y).toBeGreaterThan(100);
    expect(controls.target.y - 100).toBeCloseTo(camera.position.y - 100, 9);
    expect(controls.update).toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(true);
    expect(orbit).not.toHaveBeenCalled();
  });

  it('macOS turns shift + vertical scroll into sideways scroll: that works too', () => {
    const { camera, wheel } = setup();
    wheel({ deltaX: 100, deltaY: 0, shiftKey: true });
    expect(camera.position.y).toBeLessThan(100);
  });

  it('never drops below street level', () => {
    const { controls, wheel } = setup();
    for (let i = 0; i < 50; i++) wheel({ deltaY: 400, shiftKey: true });
    expect(controls.target.y).toBeGreaterThanOrEqual(0);
  });

  it('plain scrolling still zooms; detaching removes the shortcut', () => {
    const { camera, orbit, wheel, off } = setup();
    wheel({ deltaY: -100 });
    expect(camera.position.y).toBe(100);
    expect(orbit).toHaveBeenCalledTimes(1);
    off();
    wheel({ deltaY: -100, shiftKey: true });
    expect(camera.position.y).toBe(100);
  });

  it('moves further when the camera is further away', () => {
    expect(panStep(-100, 1000)).toBeGreaterThan(panStep(-100, 100));
    expect(panStep(-100, 100)).toBeGreaterThan(0);
  });
});
