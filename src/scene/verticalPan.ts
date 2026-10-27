import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import type * as THREE from 'three';

interface Controls {
  target: THREE.Vector3;
  update: () => void;
}

/** Metres to move for a scroll of `delta`, scaled by how far away the camera is. Scrolling up moves up. */
export function panStep(delta: number, distance: number): number {
  return -delta * Math.max(0.05, distance / 1500);
}

/**
 * Shift + scroll moves the view straight up or down (camera and what it looks at together) instead of
 * zooming. Listens in the capture phase so the orbit controls never see these scrolls. Returns a detach.
 */
export function attachVerticalPan(el: HTMLElement, camera: () => THREE.Camera, controls: () => Controls | null): () => void {
  const onWheel = (e: WheelEvent) => {
    if (!e.shiftKey) return;
    const c = controls();
    if (!c) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    // macOS turns shift + vertical scrolling into sideways scrolling, so take whichever is bigger.
    const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    const cam = camera();
    let dy = panStep(delta, cam.position.distanceTo(c.target));
    // Not below the street.
    if (c.target.y + dy < 0) dy = -c.target.y;
    cam.position.y += dy;
    c.target.y += dy;
    c.update();
  };
  el.addEventListener('wheel', onWheel, { capture: true, passive: false });
  return () => el.removeEventListener('wheel', onWheel, { capture: true });
}

/** Shift + scroll in the 3D view moves up and down the tower. */
export function VerticalPan() {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as Controls | null;
  useEffect(() => {
    // The canvas's own box: capture there runs before the orbit controls' listener on the canvas.
    const el = gl.domElement.parentElement ?? gl.domElement;
    return attachVerticalPan(el, () => camera, () => controls);
  }, [gl, camera, controls]);
  return null;
}
