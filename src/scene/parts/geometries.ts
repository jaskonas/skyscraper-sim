import * as THREE from 'three';
import type { PartShape } from '../../sim/parts';
import type { PlanShape } from '../../sim/types';
import { unitGeometry } from '../buildingGeometry';

function pyramid(): THREE.BufferGeometry {
  return new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4);
}

function dome(): THREE.BufferGeometry {
  // Hemisphere stretched to fill the unit cube: flat base at y = -0.5, top at y = 0.5.
  return new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 2, 1).translate(0, -0.5, 0);
}

function torus(): THREE.BufferGeometry {
  // A flat ring in the XZ plane, 1 across and 1 thick once scaled.
  return new THREE.TorusGeometry(0.4, 0.1, 8, 24).rotateX(Math.PI / 2).scale(1, 5, 1);
}

function arch(): THREE.BufferGeometry {
  // The upper half of a ring in the x-y plane (y runs 0..0.5 before fitting), fitted to the unit cube.
  return new THREE.TorusGeometry(0.4, 0.1, 8, 24, Math.PI).translate(0, -0.25, 0).scale(1, 2, 5);
}

function wedge(): THREE.BufferGeometry {
  // A ramp: full height at -x, sloping down to nothing at +x.
  const s = new THREE.Shape();
  s.moveTo(-0.5, -0.5);
  s.lineTo(0.5, -0.5);
  s.lineTo(-0.5, 0.5);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5);
}

function ogee(): THREE.BufferGeometry {
  // Swells out from the base, then draws in to a point, like an onion dome; fitted to the unit cube.
  const pts: THREE.Vector2[] = [];
  const n = 14;
  let max = 0;
  const raw: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const r = Math.sin(Math.PI * Math.min(1, t * 1.6 + 0.25)) * Math.pow(1 - t, 0.6);
    raw.push([Math.max(0, r), t]);
    max = Math.max(max, r);
  }
  for (const [r, t] of raw) pts.push(new THREE.Vector2((0.5 * r) / max, t - 0.5));
  pts[pts.length - 1].x = 0;
  return new THREE.LatheGeometry(pts, 16);
}

function lancet(): THREE.BufferGeometry {
  // Straight sides to just over half way, then two arcs meeting in a point at the top.
  const s = new THREE.Shape();
  const spring = 0.05;
  s.moveTo(-0.5, -0.5);
  s.lineTo(0.5, -0.5);
  s.lineTo(0.5, spring);
  s.quadraticCurveTo(0.45, 0.35, 0, 0.5);
  s.quadraticCurveTo(-0.45, 0.35, -0.5, spring);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 6 }).translate(0, 0, -0.5);
}

function planCone(plan: PlanShape): THREE.BufferGeometry {
  if (plan === 'circle') return new THREE.ConeGeometry(0.5, 1, 24);
  if (plan === 'triangle') return new THREE.ConeGeometry(1 / Math.sqrt(3), 1, 3);
  return pyramid();
}

function make(shape: PartShape, plan: PlanShape): THREE.BufferGeometry {
  switch (shape) {
    case 'box':
      return new THREE.BoxGeometry(1, 1, 1);
    case 'cylinder':
      return new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
    case 'cone':
      return new THREE.ConeGeometry(0.5, 1, 12);
    case 'pyramid':
      return pyramid();
    case 'sphere':
      return new THREE.SphereGeometry(0.5, 12, 8);
    case 'dome':
      return dome();
    case 'torus':
      return torus();
    case 'arch':
      return arch();
    case 'wedge':
      return wedge();
    case 'plan':
      return unitGeometry(plan);
    case 'plan-cone':
      return planCone(plan);
    case 'octagon':
      // Flats facing the axes, stretched so the flats (not the points) touch the unit cube.
      return new THREE.CylinderGeometry(0.5 / Math.cos(Math.PI / 8), 0.5 / Math.cos(Math.PI / 8), 1, 8).rotateY(Math.PI / 8);
    case 'frustum':
      return new THREE.CylinderGeometry(0.25, 0.5, 1, 16);
    case 'ogee':
      return ogee();
    case 'lancet':
      return lancet();
  }
}

const cache = new Map<string, THREE.BufferGeometry>();

/**
 * Shared unit geometry for a part shape. There are only a few dozen combinations, so they are
 * cached for the life of the page and never disposed.
 */
export function partGeometry(shape: PartShape, plan: PlanShape): THREE.BufferGeometry {
  const key = shape === 'plan' || shape === 'plan-cone' ? `${shape}:${plan}` : shape;
  let g = cache.get(key);
  if (!g) {
    g = make(shape, plan);
    g.computeBoundingBox();
    cache.set(key, g);
  }
  return g;
}
