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

function wedge(): THREE.BufferGeometry {
  // A ramp: full height at -x, sloping down to nothing at +x.
  const s = new THREE.Shape();
  s.moveTo(-0.5, -0.5);
  s.lineTo(0.5, -0.5);
  s.lineTo(-0.5, 0.5);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5);
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
    case 'wedge':
      return wedge();
    case 'plan':
      return unitGeometry(plan);
    case 'plan-cone':
      return planCone(plan);
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
