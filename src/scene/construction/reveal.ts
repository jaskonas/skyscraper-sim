import type { ConstructionState } from '../../sim/construction/stages';
import type { Part } from '../../sim/parts';
import type { Analysis, Design, Site } from '../../sim/types';
import { cameraFrame, lotCenter, type CameraFrame } from '../layout';
import type { StructurePart } from '../structure/structureParts';

/** How long each stage plays, seconds: dig, foundation, core and frame, facade, crown, interiors. */
export const STAGE_SECONDS = [6, 8, 15, 8, 8, 8];

const EPS = 0.01;

/**
 * The bare-structure parts to draw at this moment: each kind up to its own height (core, frame or slabs),
 * minus whatever is already hidden inside the finished facade. Exposed bracing stays (it is outside the
 * walls); isolators appear when set; the tuned mass damper is hung during the crown stage.
 */
export function visibleStructure(parts: StructurePart[], s: ConstructionState): Part[] {
  const out: Part[] = [];
  for (const p of parts) {
    let shown: boolean;
    switch (p.role) {
      case 'isolator':
        shown = s.isolators;
        break;
      case 'mass-damper':
        shown = s.crown >= 0.3;
        break;
      case 'core':
      case 'wall':
        shown = p.top <= s.coreTop + EPS && p.top > s.facadeTop - EPS;
        break;
      case 'slab':
        shown = p.top <= s.slabTop + EPS && p.top > s.facadeTop - EPS;
        break;
      case 'brace':
        // The exposed X-braces' thick corners stand a little proud of the floor they reach.
        shown = p.top <= s.frameTop + 1;
        break;
      default:
        shown = p.top <= s.frameTop + EPS && p.top > s.facadeTop - EPS;
    }
    if (shown) out.push(p.part);
  }
  return out;
}

/** From the front-right and a little above (the usual three-quarter view). */
const ABOVE: [number, number, number] = [0.55, 0.35, 0.78];
/** From the front at about ground level, looking into the soil cutaway. */
const LEVEL: [number, number, number] = [0.3, 0.1, 1];

function frameAround(target: [number, number, number], distance: number, dir: [number, number, number]): CameraFrame {
  const len = Math.hypot(...dir);
  return { target, position: [target[0] + (dir[0] / len) * distance, target[1] + (dir[1] / len) * distance, target[2] + (dir[2] / len) * distance] };
}

/** Where the camera eases to at the start of each stage. */
export function stageFrame(site: Site, design: Design, analysis: Analysis, stage: number): CameraFrame {
  const [lx, lz] = lotCenter(site);
  if (stage <= 1) return frameAround([lx, -12, lz], 120 + Math.max(design.plateWidth, design.plateDepth) * 1.5, LEVEL);
  if (stage <= 3) return cameraFrame(site, analysis.heightM);
  if (stage === 4) return frameAround([lx, analysis.heightM * 0.85, lz], Math.max(160, analysis.heightM * 1.1), ABOVE);
  return cameraFrame(site, analysis.tipHeightM);
}
