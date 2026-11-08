import { COEFFICIENTS } from '../catalog/coefficients';
import { FIT_TEXT, fillText, type Fit } from '../catalog/zones';
import { floorSlices } from '../geometry';
import { bandFloors, type BandSpan } from '../stack';
import type { Design } from '../types';

export interface BandFit {
  fit: Fit;
  reason: string;
  /** Average metres from the core to the windows over the band's floors. */
  depthM: number;
}

const RANK: Record<Fit, number> = { good: 0, ok: 1, bad: 2 };

interface Factor {
  fit: Fit;
  reason: string;
}

function depthFactor(span: BandSpan, depthM: number): Factor {
  const range = COEFFICIENTS.zones.depth[span.use];
  const values = { depth: Math.round(depthM) };
  const inside = ([lo, hi]: [number, number]) => depthM >= lo && depthM <= hi;
  if (inside(range.good)) return { fit: 'good', reason: fillText(FIT_TEXT.goodDepth[span.use], values) };
  const fit: Fit = inside(range.ok) ? 'ok' : 'bad';
  const text = depthM < range.good[0] ? FIT_TEXT.tooNarrow[span.use] : FIT_TEXT.tooDeep[span.use];
  return { fit, reason: fillText(text, values) };
}

function heightFactor(design: Design, span: BandSpan): Factor | null {
  if (span.use === 'retail') {
    if (span.from === 0) return { fit: 'good', reason: FIT_TEXT.street };
    if (design.amenities.includes('observation-deck')) return { fit: 'good', reason: FIT_TEXT.shopsByDeck };
    return { fit: 'ok', reason: fillText(FIT_TEXT.shopsUpHigh, { floor: span.from + 1 }) };
  }
  if ((span.use === 'hotel' || span.use === 'residential') && span.from < COEFFICIENTS.zones.quietFromFloor)
    return { fit: 'ok', reason: FIT_TEXT.streetNoise };
  return null;
}

function sizeFactor(span: BandSpan): Factor | null {
  if (span.use === 'hotel' && span.to - span.from + 1 < COEFFICIENTS.zones.hotelMinFloors) return { fit: 'ok', reason: FIT_TEXT.smallHotel };
  return null;
}

/** How well a zone suits its floors: the worst of depth, height and size (ties go in that order). */
export function bandFit(design: Design, span: BandSpan): BandFit {
  const slices = floorSlices(design).slice(span.from, span.to + 1);
  const depthM = slices.reduce((s, f) => s + COEFFICIENTS.zones.depthShare * Math.min(f.width, f.depth), 0) / Math.max(1, slices.length);
  const depth = depthFactor(span, depthM);
  const height = heightFactor(design, span);
  const factors = [depth, height, sizeFactor(span)].filter((f): f is Factor => f !== null);
  const worst = factors.reduce((w, f) => (RANK[f.fit] > RANK[w.fit] ? f : w));
  // All good: shops say why their spot works; everyone else hears about their floors.
  const shown = worst.fit === 'good' && height ? height : worst;
  return { fit: shown.fit, reason: shown.reason, depthM };
}

/** Every zone of the design with its floors and fit, bottom to top. */
export function stackFits(design: Design): (BandSpan & BandFit)[] {
  return bandFloors(design.stack, design.floors).map((span) => ({ ...span, ...bandFit(design, span) }));
}
