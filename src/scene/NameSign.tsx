import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { Design } from '../sim/types';
import { placeAtAnchor } from './detail/frame';
import { entranceAnchor } from './dressing/dressing';

const SIGN_HEIGHT = 1.4;
const SIGN_Y = 4.6;
/** Just past the canopy's front edge, so the sign stands on it and faces the street. */
const SIGN_OUT = 3.05;
const MAX_PX = 96;
const MIN_PX = 40;
const STONE = '#2b2a28';
const GOLD = '#d9b25a';
const FONT = (px: number) => `600 ${px}px Georgia, 'Times New Roman', serif`;

/**
 * The biggest font (96 px down to 40 px, in steps of 4) at which the name fits `maxWidth`. If it doesn't fit even at
 * 40 px, it is cut, a whole character at a time, and ends with "…".
 */
export function fitSignText(measure: (text: string, px: number) => number, name: string, maxWidth: number): { text: string; px: number } {
  for (let px = MAX_PX; px >= MIN_PX; px -= 4) if (measure(name, px) <= maxWidth) return { text: name, px };
  const chars = Array.from(name);
  for (let n = chars.length - 1; n > 0; n--) {
    const text = `${chars.slice(0, n).join('').trimEnd()}…`;
    if (measure(text, MIN_PX) <= maxWidth) return { text, px: MIN_PX };
  }
  return { text: '…', px: MIN_PX };
}

/** The sign's two canvas textures: stone with gold letters, and the letters alone for the night glow. Null without a 2D canvas (tests). */
function signTextures(name: string, aspect: number): { map: THREE.CanvasTexture; glow: THREE.CanvasTexture } | null {
  const h = 256;
  const w = Math.min(2048, Math.max(512, Math.round(h * aspect)));
  const make = () => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    return { canvas, ctx: canvas.getContext('2d') };
  };
  const face = make();
  const glow = make();
  if (!face.ctx || !glow.ctx) return null;
  const text = name.toLocaleUpperCase();
  const pad = 40;
  const measure = (t: string, px: number) => {
    face.ctx!.font = FONT(px);
    return face.ctx!.measureText(t).width;
  };
  const fit = fitSignText(measure, text, w - pad * 2);

  face.ctx.fillStyle = STONE;
  face.ctx.fillRect(0, 0, w, h);
  face.ctx.strokeStyle = GOLD;
  face.ctx.lineWidth = 8;
  face.ctx.strokeRect(14, 14, w - 28, h - 28);
  glow.ctx.fillStyle = '#000';
  glow.ctx.fillRect(0, 0, w, h);
  for (const [ctx, colour] of [
    [face.ctx, GOLD],
    [glow.ctx, '#fff'],
  ] as const) {
    ctx.font = FONT(fit.px);
    ctx.fillStyle = colour;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fit.text, w / 2, h / 2 + fit.px * 0.04);
  }
  const tex = (c: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  return { map: tex(face.canvas), glow: tex(glow.canvas) };
}

/** The tower's name on a stone-and-gold sign standing on the entrance canopy. The letters glow at night. */
export function NameSign({ design, name, night }: { design: Design; name: string; night: boolean }) {
  const { anchor, width } = useMemo(() => entranceAnchor(design), [design]);
  const placed = useMemo(
    () => placeAtAnchor({ shape: 'box', position: [0, SIGN_Y, SIGN_OUT], scale: [width, SIGN_HEIGHT, 1], material: 'stone' }, anchor),
    [anchor, width],
  );
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const textures = useMemo(() => signTextures(name, width / SIGN_HEIGHT), [name, width]);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: textures ? '#ffffff' : STONE,
        map: textures?.map ?? null,
        emissive: '#ffd27a',
        emissiveMap: textures?.glow ?? null,
        emissiveIntensity: 0,
        roughness: 0.6,
        metalness: 0.15,
      }),
    [textures],
  );
  material.emissiveIntensity = night && textures ? 1.3 : 0;

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(
    () => () => {
      textures?.map.dispose();
      textures?.glow.dispose();
    },
    [textures],
  );

  return (
    <mesh
      name="name-sign"
      geometry={geometry}
      material={material}
      position={placed.position}
      rotation={[0, placed.rotation![1], 0]}
      scale={[width, SIGN_HEIGHT, 1]}
      castShadow={false}
      receiveShadow
    />
  );
}
