import type { FacadeColors, FacadeRecipe } from '../sim/facade';

/** Which recipe colour a shape is painted with. */
export type TilePaint = keyof FacadeColors;

/** Tile coordinates are fractions: x 0..1 across one bay, y 0..1 from the bottom of the floor up. */
export type TileShape =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; fill: TilePaint; glow?: boolean }
  | { kind: 'poly'; points: [number, number][]; fill: TilePaint; glow?: boolean }
  | { kind: 'line'; points: [number, number][]; stroke: TilePaint; width: number };

export interface TileLayout {
  /** Size of one tile in metres. */
  widthM: number;
  heightM: number;
  shapes: TileShape[];
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Height of the glazed part of a floor (the slab band takes the rest). */
export const TILE_HEIGHT_M = 3.4;

/** The window opening for a window-area share: wide and tall enough that glass ≈ that share of the tile. */
export function openingFor(windowRatio: number): { x: number; y: number; w: number; h: number } {
  const h = clamp(Math.sqrt(windowRatio) * 1.05, 0.3, 0.92);
  const w = clamp(windowRatio / h, 0.2, 0.98);
  return { x: (1 - w) / 2, y: (1 - h) * 0.6, w, h };
}

/** Lays out one bay of facade: wall, spandrel decoration, panes, frames. Pure — no canvas. */
export function tileLayout(recipe: FacadeRecipe): TileLayout {
  const { pattern, spandrel, windowRatio } = recipe;
  const shapes: TileShape[] = [{ kind: 'rect', x: 0, y: 0, w: 1, h: 1, fill: 'wall' }];
  const o = openingFor(windowRatio);

  if (spandrel.motif === 'stripes') {
    shapes.push({ kind: 'rect', x: 0, y: o.y * 0.2, w: 1, h: o.y * 0.25, fill: 'accent' });
    shapes.push({ kind: 'rect', x: 0, y: o.y * 0.6, w: 1, h: o.y * 0.25, fill: 'spandrel' });
  } else if (spandrel.motif === 'chevron') {
    const top = o.y * 0.85;
    const points: [number, number][] = [];
    for (let i = 0; i <= 8; i++) points.push([i / 8, i % 2 === 0 ? top * 0.25 : top]);
    shapes.push({ kind: 'line', points, stroke: 'accent', width: 0.05 });
  }

  const archH = pattern.arch ? o.h * 0.22 : 0;
  for (const pane of pattern.panes) {
    const x = o.x + pane.x0 * o.w;
    const w = (pane.x1 - pane.x0) * o.w;
    shapes.push({ kind: 'rect', x, y: o.y, w, h: o.h - archH, fill: 'glass', glow: true });
    if (archH > 0) {
      const base = o.y + o.h - archH;
      shapes.push({ kind: 'poly', points: [[x, base], [x + w / 2, o.y + o.h], [x + w, base]], fill: 'glass', glow: true });
    }
    const f = pattern.frame;
    const frame: [number, number][] = [[x, o.y], [x + w, o.y], [x + w, o.y + o.h - archH], [x, o.y + o.h - archH], [x, o.y]];
    shapes.push({ kind: 'line', points: frame, stroke: 'frame', width: f });
  }
  if (pattern.diagonals) {
    shapes.push({ kind: 'line', points: [[o.x, o.y], [o.x + o.w, o.y + o.h]], stroke: 'frame', width: pattern.frame });
    shapes.push({ kind: 'line', points: [[o.x, o.y + o.h], [o.x + o.w, o.y]], stroke: 'frame', width: pattern.frame });
  }
  return { widthM: pattern.bayWidth, heightM: TILE_HEIGHT_M, shapes };
}

/** Fraction of the tile that is glass. */
export function glassShare(layout: TileLayout): number {
  return layout.shapes.reduce((s, sh) => {
    if (sh.kind === 'rect' && sh.fill === 'glass') return s + sh.w * sh.h;
    if (sh.kind === 'poly' && sh.fill === 'glass') {
      const [a, b, c] = sh.points;
      return s + Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
    }
    return s;
  }, 0);
}

/** The bits of CanvasRenderingContext2D the painter uses (so tests can record calls). */
export type TileCanvas = Pick<
  CanvasRenderingContext2D,
  'fillStyle' | 'strokeStyle' | 'lineWidth' | 'fillRect' | 'beginPath' | 'moveTo' | 'lineTo' | 'closePath' | 'fill' | 'stroke'
>;

/** Green level in the glow map for each kind of surface, so the shader knows which material to show. */
export const REGION_GREEN = { wall: 0, trim: 128, spandrel: 255 } as const;

const REGION_OF: Record<TilePaint, keyof typeof REGION_GREEN> = {
  wall: 'wall',
  glass: 'wall',
  frame: 'trim',
  accent: 'trim',
  spandrel: 'spandrel',
};

/**
 * Paints a layout onto a canvas `px` wide and `py` tall.
 * 'color' paints the facade; 'glow' paints window glass in red (for night lights and reflections) and
 * marks wall, trim and spandrel in green (for their materials).
 */
export function paintTile(ctx: TileCanvas, layout: TileLayout, colors: FacadeColors, px: number, py: number, mode: 'color' | 'glow'): void {
  const X = (x: number) => x * px;
  const Y = (y: number) => (1 - y) * py; // canvas y runs downward
  const paint = (fill: TilePaint, glow?: boolean) =>
    mode === 'color' ? colors[fill] : `rgb(${glow ? 255 : 0},${REGION_GREEN[REGION_OF[fill]]},0)`;
  for (const s of layout.shapes) {
    if (s.kind === 'rect') {
      ctx.fillStyle = paint(s.fill, s.glow);
      ctx.fillRect(X(s.x), Y(s.y + s.h), s.w * px, s.h * py);
    } else if (s.kind === 'poly') {
      ctx.fillStyle = paint(s.fill, s.glow);
      ctx.beginPath();
      s.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(X(x), Y(y)) : ctx.lineTo(X(x), Y(y))));
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = mode === 'color' ? colors[s.stroke] : `rgb(0,${REGION_GREEN[REGION_OF[s.stroke]]},0)`;
      ctx.lineWidth = Math.max(1, s.width * px);
      ctx.beginPath();
      s.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(X(x), Y(y)) : ctx.lineTo(X(x), Y(y))));
      ctx.stroke();
    }
  }
}
