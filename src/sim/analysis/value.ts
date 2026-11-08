import { COEFFICIENTS } from '../catalog/coefficients';
import { floorSlices, sliceArea } from '../geometry';
import type { BandSpan } from '../stack';
import type { Analysis, Design, Site, UseType } from '../types';
import { stackFits } from '../zones/fit';

/** Extra rent for floor `i` of a zone. Shops above the street only gain it when an observation deck brings visitors up. */
function heightPremium(use: UseType, i: number, span: BandSpan, hasDeck: boolean): number {
  const rule = use === 'retail' && span.from > 0 && hasDeck ? COEFFICIENTS.zones.heightPremium.residential : COEFFICIENTS.zones.heightPremium[use];
  return Math.min(rule.max, rule.perFloor * i);
}

/** What each zone earns a year, and how many years of that it takes to pay for the tower. */
export function analyzeValue(site: Site, design: Design, costTotal: number): Analysis['value'] {
  const Z = COEFFICIENTS.zones;
  const slices = floorSlices(design);
  const hasDeck = design.amenities.includes('observation-deck');
  const bands = stackFits(design).map((b) => {
    let incomePerYear = 0;
    for (let i = b.from; i <= b.to; i++) {
      incomePerYear += sliceArea(design.shape, slices[i]) * Z.rent[b.use] * (1 + heightPremium(b.use, i, b, hasDeck));
    }
    incomePerYear *= Z.fitMultiplier[b.fit] * Z.market[site.id][b.use];
    return { ...b, incomePerYear };
  });
  const incomePerYear = bands.reduce((s, b) => s + b.incomePerYear, 0);
  const paybackYears = incomePerYear > 0 ? Math.round((costTotal / incomePerYear) * 10) / 10 : Infinity;
  return { bands, incomePerYear, paybackYears };
}
