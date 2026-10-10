import { COEFFICIENTS } from './catalog/coefficients';
import { AMENITIES } from './catalog/amenities';
import { STYLE_PRESETS } from './catalog/styles';
import { formatMoney as money } from './format';
import type { Brief, Requirement } from './briefs';
import { useShares } from './analysis/massing';
import type { Analysis, CheckStatus, Design, Site } from './types';

export interface RequirementResult {
  requirement: Requirement;
  label: string;
  met: boolean;
  detail: string;
}

export interface BriefResult {
  required: RequirementResult[];
  bonus: RequirementResult[];
  passed: boolean;
  /** 0 when any requirement fails; otherwise 1 + bonuses met. */
  stars: 0 | 1 | 2 | 3;
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';
export type GradeCategory = 'safety' | 'cost' | 'comfort' | 'efficiency' | 'sustainability';

const STATUS_RANK: Record<CheckStatus, number> = { pass: 2, marginal: 1, fail: 0 };
const SETBACK_RANK = { none: 0, few: 1, 'wedding-cake': 2 } as const;
const USE_LABEL = { retail: 'retail', office: 'office', hotel: 'hotel', residential: 'residential' } as const;
const STRUCTURAL_CHECKS = ['windStrength', 'seismic', 'foundation'] as const;

/** Landmark if it has at least one eye-catching feature. */
export function isLandmark(design: Design): boolean {
  return (
    design.twist >= 30 ||
    design.crown === 'spire' ||
    design.crown === 'pointed' ||
    design.exposedStructure ||
    design.setbacks === 'wedding-cake' ||
    design.taper >= 0.25
  );
}

export function evaluateRequirement(r: Requirement, design: Design, a: Analysis): RequirementResult {
  const check = (id: string) => a.checks.find((c) => c.id === id)!;
  switch (r.kind) {
    case 'structural': {
      const failed = STRUCTURAL_CHECKS.map(check).filter((c) => c.status === 'fail');
      return {
        requirement: r,
        label: 'Passes structural engineering assessment',
        met: failed.length === 0,
        detail: failed.length === 0 ? 'Wind, earthquake and foundation all hold.' : `Failing: ${failed.map((c) => c.label).join(', ')}`,
      };
    }
    case 'minFloors':
      return { requirement: r, label: `At least ${r.value} floors`, met: design.floors >= r.value, detail: `${design.floors} floors` };
    case 'minHeight':
      return { requirement: r, label: `At least ${r.value} m tall`, met: a.heightM >= r.value, detail: `${Math.round(a.heightM)} m` };
    case 'maxBudget':
      return { requirement: r, label: `Budget ${money(r.value)}`, met: a.cost.total <= r.value, detail: money(a.cost.total) };
    case 'minUseShare': {
      const share = useShares(design)[r.use];
      return {
        requirement: r,
        label: `At least ${Math.round(r.value * 100)}% ${USE_LABEL[r.use]}`,
        met: share >= r.value - 1e-9,
        detail: `${Math.round(share * 100)}%`,
      };
    }
    case 'check': {
      const c = check(r.check);
      return {
        requirement: r,
        label: `${c.label}: ${r.atLeast === 'pass' ? 'pass' : 'at least marginal'}`,
        met: STATUS_RANK[c.status] >= STATUS_RANK[r.atLeast],
        detail: c.message,
      };
    }
    case 'maxComfortMg':
      return {
        requirement: r,
        label: `Top-floor sway under ${r.value} milli-g`,
        met: a.wind.accelMg <= r.value,
        detail: `${a.wind.accelMg.toFixed(1)} milli-g`,
      };
    case 'maxEui':
      return {
        requirement: r,
        label: `Energy under ${r.value} kWh/m²/yr`,
        met: a.energy.euiKWhPerM2 <= r.value,
        detail: `${Math.round(a.energy.euiKWhPerM2)} kWh/m²/yr`,
      };
    case 'maxDays':
      return {
        requirement: r,
        label: `Built in ${r.value} days or less`,
        met: a.schedule.totalDays <= r.value,
        detail: `${a.schedule.totalDays} days`,
      };
    case 'maxSettlementCm':
      return {
        requirement: r,
        label: `Settles less than ${r.value} cm`,
        met: a.foundation.settlementCm <= r.value,
        detail: `${a.foundation.settlementCm.toFixed(1)} cm`,
      };
    case 'style':
      return {
        requirement: r,
        label: `${STYLE_PRESETS[r.style].name} style`,
        met: design.style === r.style,
        detail: STYLE_PRESETS[design.style].name,
      };
    case 'minSetbacks':
      return {
        requirement: r,
        label: r.value === 'few' ? 'Steps back from the street (setbacks)' : 'Wedding-cake setbacks',
        met: SETBACK_RANK[design.setbacks] >= SETBACK_RANK[r.value],
        detail: design.setbacks,
      };
    case 'amenity':
      return { requirement: r, label: `Includes: ${AMENITIES[r.id].label}`, met: design.amenities.includes(r.id), detail: '' };
    case 'landmark':
      return {
        requirement: r,
        label: 'Distinctive landmark shape',
        met: isLandmark(design),
        detail: 'Try a twist, taper, spire, pointed crown, wedding-cake setbacks, or exposed structure.',
      };
  }
}

export function evaluateBrief(brief: Brief, design: Design, a: Analysis): BriefResult {
  const required = brief.required.map((r) => evaluateRequirement(r, design, a));
  const bonus = brief.bonus.map((r) => evaluateRequirement(r, design, a));
  const passed = required.every((r) => r.met);
  const stars = (passed ? 1 + bonus.filter((b) => b.met).length : 0) as BriefResult['stars'];
  return { required, bonus, passed, stars };
}

/** Grade where lower ratio is better: ≤t[0] A, ≤t[1] B, ≤t[2] C, ≤t[3] D, else F. */
export function gradeFromRatio(ratio: number, t: [number, number, number, number]): Grade {
  if (ratio <= t[0]) return 'A';
  if (ratio <= t[1]) return 'B';
  if (ratio <= t[2]) return 'C';
  if (ratio <= t[3]) return 'D';
  return 'F';
}

export function sandboxGrades(site: Site, a: Analysis): Record<GradeCategory, Grade> {
  const statuses = STRUCTURAL_CHECKS.map((id) => a.checks.find((c) => c.id === id)!.status);
  const marginals = statuses.filter((s) => s === 'marginal').length;
  const safety: Grade = statuses.includes('fail') ? 'F' : (['A', 'B', 'C', 'D'] as const)[Math.min(marginals, 3)];
  const benchmark = COEFFICIENTS.cost.benchmarkPerM2 * site.costMultiplier;
  return {
    safety,
    cost: gradeFromRatio(a.cost.total / a.gfa / benchmark, [0.9, 1.0, 1.15, 1.3]),
    comfort: gradeFromRatio(a.wind.accelMg / a.wind.comfortLimitMg, [0.5, 0.75, 1, 1.3]),
    efficiency: gradeFromRatio(a.elevators.avgWaitS / a.elevators.targetS, [0.5, 0.75, 1, 1.5]),
    sustainability: gradeFromRatio(a.energy.euiKWhPerM2, [150, 190, 240, 300]),
  };
}
