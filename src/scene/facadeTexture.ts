import * as THREE from 'three';
import type { FacadeRecipe } from '../sim/facade';
import { paintTile, tileLayout, type TileLayout } from './facadeTile';

export interface FacadeTextures {
  layout: TileLayout;
  map: THREE.CanvasTexture;
  glowMap: THREE.CanvasTexture;
}

const PX = 128;
const cache = new Map<string, FacadeTextures | null>();

function canvasTexture(layout: TileLayout, recipe: FacadeRecipe, mode: 'color' | 'glow'): THREE.CanvasTexture | null {
  const canvas = document.createElement('canvas');
  canvas.width = PX;
  canvas.height = Math.round((PX * layout.heightM) / layout.widthM);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  paintTile(ctx, layout, recipe.colors, canvas.width, canvas.height, mode);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  if (mode === 'color') tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * The painted facade tile and its night-glow mask, made once per look and kept for the session
 * (there are only a few dozen looks). Returns null where canvas isn't available.
 */
export function facadeTextures(recipe: FacadeRecipe): FacadeTextures | null {
  const key = JSON.stringify([recipe.pattern.id, recipe.spandrel.id, recipe.windowRatio, recipe.colors]);
  if (cache.has(key)) return cache.get(key)!;
  const layout = tileLayout(recipe);
  const map = canvasTexture(layout, recipe, 'color');
  const glowMap = map && canvasTexture(layout, recipe, 'glow');
  const result = map && glowMap ? { layout, map, glowMap } : null;
  cache.set(key, result);
  return result;
}
