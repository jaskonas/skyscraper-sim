import { memo } from 'react';
import { defaultDesign } from '../../sim/design';
import { facadeRecipe } from '../../sim/facade';
import { FLOOR_HEIGHT } from '../../sim/geometry';
import type { Part } from '../../sim/parts';
import { SITES } from '../../sim/sites';
import type { CrownId, Design, OrnamentId, Palette } from '../../sim/types';
import { crownParts } from '../../scene/crownParts';
import { tileLayout } from '../../scene/facadeTile';
import { ornamentParts } from '../../scene/ornaments';
import { floorRuns } from '../../scene/parts/placement';
import { materialLook } from '../../scene/parts/materials';
import { silhouette } from '../../scene/silhouette';

/** A small, fixed tower used to draw icons, so every icon is drawn at the same scale. */
function iconDesign(patch: Partial<Design>): Design {
  return { ...defaultDesign(SITES.chicago), shape: 'square', plateWidth: 30, floors: 20, setbacks: 'none', ...patch };
}

/** Tower floors drawn as grey blocks (one per run between setbacks) so the detail stands out. */
function bodyParts(d: Design, fromFloor = 0): Part[] {
  return floorRuns(d, 1000)
    .map((run) => run.filter((s) => s.index >= fromFloor))
    .filter((run) => run.length > 0)
    .map((run) => ({
      shape: 'box' as const,
      position: [0, run[0].y + (run.length * FLOOR_HEIGHT) / 2, 0] as [number, number, number],
      scale: [run[0].width, run.length * FLOOR_HEIGHT, run[0].depth] as [number, number, number],
      material: 'concrete' as const,
    }));
}

function PartsIcon({ parts, palette }: { parts: Part[]; palette: Palette }) {
  const s = silhouette(parts);
  return (
    <svg className="icon" viewBox={s.viewBox} aria-hidden="true">
      {s.paths.map((p) => (
        <path key={p.material} d={p.d} fill={materialLook(p.material, palette).color} stroke="#0006" strokeWidth={s.size * 0.008} />
      ))}
    </svg>
  );
}

export const CrownIcon = memo(function CrownIcon({ crown, palette }: { crown: CrownId; palette: Palette }) {
  const d = iconDesign({ crown });
  return <PartsIcon parts={[...bodyParts(d, d.floors - 4), ...crownParts(d)]} palette={palette} />;
});

export const OrnamentIcon = memo(function OrnamentIcon({ id, palette }: { id: OrnamentId; palette: Palette }) {
  const d = iconDesign({ floors: 14, plateWidth: 24, setbacks: 'few', ornaments: [id], ornament: 'high', crown: 'flat' });
  return <PartsIcon parts={[...bodyParts(d), ...ornamentParts(d)]} palette={palette} />;
});

/** One bay of painted facade, drawn as SVG. */
export const TileIcon = memo(function TileIcon({ design }: { design: Design }) {
  const recipe = facadeRecipe(design);
  const layout = tileLayout(recipe);
  const W = 100;
  const H = (100 * layout.heightM) / layout.widthM;
  const X = (x: number) => x * W;
  const Y = (y: number) => (1 - y) * H;
  const pts = (p: [number, number][]) => p.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ');
  return (
    <svg className="icon" viewBox={`0 0 ${W} ${H.toFixed(1)}`} aria-hidden="true">
      {layout.shapes.map((s, i) =>
        s.kind === 'rect' ? (
          <rect key={i} x={X(s.x)} y={Y(s.y + s.h)} width={s.w * W} height={s.h * H} fill={recipe.colors[s.fill]} />
        ) : s.kind === 'poly' ? (
          <polygon key={i} points={pts(s.points)} fill={recipe.colors[s.fill]} />
        ) : (
          <polyline key={i} points={pts(s.points)} fill="none" stroke={recipe.colors[s.stroke]} strokeWidth={Math.max(1.5, s.width * W)} />
        ),
      )}
    </svg>
  );
});
