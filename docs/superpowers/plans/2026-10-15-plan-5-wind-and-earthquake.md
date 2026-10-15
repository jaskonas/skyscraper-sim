# Skyscraper Studio — Plan 5: Wind and Earthquake

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** **💨 Wind** and **〰️ Earthquake** buttons show those forces acting on the tower, while designing and on the finished tower:
- **Wind:** streaks and eddies, and a tower that bends with a steady lean plus a sway at its own period, drawn 50× bigger. A tuned mass damper is seen swinging inside see-through top floors.
- **Earthquake:** a 14-second quake cycle shakes the whole city block, and the tower swings at its own period. Base isolation lets the ground slide under it. Damage shows as cracks or red floors, and nothing collapses.
- **Readout card:** explains each force with the tower's own numbers.

**Architecture:**
- **Pure motion** (`src/sim/forces/motion.ts`) turns the existing analysis numbers into motion: bend shape, wind lean and sway, quake ground motion, response, base share and lean, and the quake cycle.
- **Readout cards** (`src/sim/forces/readout.ts`) are built from wording in `src/sim/catalog/forces.ts`.
- **The store** gains a view-only `force`.
- **The sway signal** (`src/scene/forces/sway.ts`) is one mutable object written each frame by `ForcesView` and read each frame by `Building` (floors, slabs, crown, ornaments, amenities, aircraft lights) and by `GroundShake` (the city block). The motion never goes through React state.
- **`ForcesView`** also draws the wind streaks, the see-through damper and the damage marks.
- **`ForceControls`** holds the buttons, the readout card and the failure banner.

**Tech Stack:** Vite 8, React 19, TypeScript 5.9, three 0.186, @react-three/fiber 9, Zustand 5, Vitest 5 + jsdom + Testing Library + @react-three/test-renderer 9. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-15-forces-design.md`, which extends `2026-10-10-skyscraper-sim-design.md`.

**Branch:** work on `plan-5-forces`, cut from `master`. **Do not push**: pushing to `master` publishes the live site (www.jaskonas.com/skyscraper-sim), and the user decides when.

**Provenance:**
- This plan's code was written and run task by task on a throwaway branch.
- The plan was then replayed mechanically on a fresh checkout of `master`. After every task, `tsc` was clean and the suite passed with the counts given.
- Headless screenshots were reviewed for wind on a square vs a round twisted tower, a tuned mass damper, a design failing in wind, a Tokyo quake with and without isolation, damaged and failing quakes, and Chicago's small quake. Four fixes came out of that review; they are listed under Rulings.

## Rulings (where this plan differs from the spec's wording)

- **The drawn sway is capped at 15% of the tower's height** (`MAX_DRAWN_SWAY`). Far outside the model's range, a failing design's drift and acceleration are meaningless: a 140-floor, 18 m steel rigid frame in Shanghai leaned 774 m, which at 50× drew the tower lying on the ground.
- **Impossible numbers are put into words on the card:**
  - When the wind would fail the tower, the lean and sway line says *The wind would push the top further than the structure can take*.
  - When the felt sway is over 10× the limit, the card says so in words instead of quoting thousands of milli-g.
- **The quake card explains its threshold:** *pushes it to N% of its breaking point; it stays fully working below 35%*. "N% of what it can take" next to "Damaged" read as a contradiction at 38%.
- **The wind streaks are 14 × 0.8 m** (not hairlines), so they show from the normal camera distance.
- **The see-through damper** finds the "swing" by averaging out the lean: the block moves against `topX` minus its running average. This needs no extra state in the sway signal.
- **The sway signal carries the force's clock** (`time`), so the damage marks and the cracks keep step with the quake cycle.
- **The banner is its own component** (`ForceBanner`), placed at the top of the 3D view, rather than part of the card.
- **`windMotion` takes `_site`**, unused, so its signature matches `quakeMotion`.

## Global Constraints

- `src/sim/` imports nothing from React, three, `src/state`, `src/ui` or `src/scene`.
- No analysis changes. The forces are view-only: `force` is not part of the design, its history or the export.
- Every word on the cards lives in `src/sim/catalog/forces.ts`.
- **Per frame:** at most one matrix per floor (body and slab) and one per crown or ornament part. No geometry is rebuilt per frame. With no force on, nothing runs.
- A long gap between frames counts as at most 0.1 s.
- Use `npm`. No new dependencies. Commit after every task with the trailer lines shown. **Never push.**

## Review Focus

1. **Switching a force off, or to the other force.** The tower and the ground must return exactly to rest, and the clock must restart. Pinned in Task 4 ("puts every floor back when the sway stops") and Task 5 ("stops the sway when the force is switched off").
2. **Designs far outside the model's range.** The drawing must stay on screen and the card readable. Pinned in Task 5 (the 15% cap) and Task 2 ("puts impossible numbers into words").
3. **Editing the design while a force is on.** The motion and the card follow at once. The card is pinned in Task 6. The motion is memoised on the design; reviewers should drag Floors with Wind on during Task 7.
4. **Building, then finishing.** The force hides during construction, comes back afterwards, and the construction view never sways. Pinned in Tasks 3 and 6. Reviewers should try Build with Earthquake on.
5. **A crown with aircraft lights, at night, in the wind.** The blinking lights must stay on their masts as the tower bends. This is not pinned by a test; check it by eye in Task 7.

## File Structure

```
src/sim/forces/motion.ts         bend shape, wind and quake motion, quake cycle, ground jolts, lean
src/sim/forces/readout.ts        the Wind and Earthquake cards
src/sim/catalog/forces.ts        all card wording
src/scene/forces/sway.ts         the per-frame sway signal and swayAt(signal, height)
src/scene/forces/ForcesView.tsx  force clock, GroundShake, wind streaks, damper ghost, damage marks
src/ui/ForceControls.tsx         buttons, readout card, failure banner
```

---

### Task 1: Motion from the analysis

Pure functions that turn the analysis's existing numbers into motion. `bendShape` is the cantilever deflection curve. `windMotion` gives the steady lean (drift × height) and the sway at the natural period, sized from the felt acceleration (so dampers shrink it), plus the eddy strength and the two wind check results. `quakeMotion` gives the drawn ground motion (10 m per g), the response (from the quake ratio and outcome), the base share (0.2 with isolation) and a failing tower's lean. Time functions give the 14-second quake cycle, the ground's jolts, and the top's offset at any moment.

**Files:**
- Create: `src/sim/forces/motion.test.ts`
- Create: `src/sim/forces/motion.ts`

**Interfaces:**
- Consumes: `analyze`, `windShapeFactor` (`src/sim/analysis/wind.ts`), `Analysis` (`wind`, `seismic`, `checks`), `FLOOR_HEIGHT`, `designFor`.
- Produces (`src/sim/forces/motion.ts`):
  - `WIND_EXAGGERATION` (50), `QUAKE_METRES_PER_G` (10), `ISOLATED_BASE_SHARE` (0.2), `QUAKE_CYCLE_S` (14).
  - `bendShape(y, height)`.
  - `WindMotion { leanM; swayM; periodS; exaggeration; eddyStrength; comfort; strength }`, `windMotion(site, design, analysis)`, `windTop(m, t)`.
  - `QuakeMotion { groundM; periodS; responseM; baseShare; outcome; failLeanDeg }`, `quakeMotion(site, design, analysis)`.
  - `quakeEnvelope(t)`, `groundOffset(t, groundM)`, `quakeTop(m, t)`, `quakeLean(m, t)`.

- [ ] **Step 1: Write the failing tests**

`src/sim/forces/motion.test.ts` (new):

```ts
import { describe, expect, it } from 'vitest';
import { analyze } from '../analysis';
import { designFor } from '../testUtils';
import type { Design, SiteId } from '../types';
import { QUAKE_CYCLE_S, bendShape, groundOffset, quakeEnvelope, quakeLean, quakeMotion, quakeTop, windMotion, windTop } from './motion';

const setup = (siteId: SiteId, patch: Partial<Design> = {}) => {
  const { site, design } = designFor(siteId, patch);
  return { site, design, analysis: analyze(site, design) };
};
const wind = (siteId: SiteId, patch: Partial<Design> = {}) => {
  const s = setup(siteId, patch);
  return windMotion(s.site, s.design, s.analysis);
};
const quake = (siteId: SiteId, patch: Partial<Design> = {}) => {
  const s = setup(siteId, patch);
  return quakeMotion(s.site, s.design, s.analysis);
};

describe('bendShape', () => {
  it('is 0 at the base, 1 at the top and never goes down', () => {
    expect(bendShape(0, 200)).toBe(0);
    expect(bendShape(200, 200)).toBe(1);
    let last = -1;
    for (let y = -10; y <= 220; y += 5) {
      const s = bendShape(y, 200);
      expect(Number.isFinite(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(last);
      last = s;
    }
    expect(bendShape(100, 0)).toBe(0);
  });

  it('curves: the top half bends much more than the bottom half', () => {
    expect(bendShape(50, 100)).toBeLessThan(0.4);
  });
});

describe('windMotion', () => {
  it('leans by the drift and sways by the felt acceleration at the natural period', () => {
    const s = setup('chicago', { floors: 50 });
    const m = windMotion(s.site, s.design, s.analysis);
    expect(m.leanM).toBeCloseTo(s.analysis.wind.driftRatio * 50 * 4, 6);
    expect(m.periodS).toBe(s.analysis.seismic.periodS);
    const a = (s.analysis.wind.accelMg * 9.81) / 1000;
    expect(m.swayM).toBeCloseTo(a / (2 * Math.PI / m.periodS) ** 2, 9);
    expect(m.exaggeration).toBe(50);
  });

  it('dampers shrink the sway but not the lean', () => {
    const none = wind('chicago', { damping: 'none' });
    const tmd = wind('chicago', { damping: 'tmd' });
    expect(tmd.swayM).toBeLessThan(none.swayM);
    expect(tmd.leanM).toBeCloseTo(none.leanM, 9);
  });

  it('round, tapered and twisted towers shed smaller eddies than a square box', () => {
    const box = wind('chicago', { shape: 'square', twist: 0, taper: 0, setbacks: 'none' }).eddyStrength;
    expect(wind('chicago', { shape: 'circle', twist: 0, taper: 0, setbacks: 'none' }).eddyStrength).toBeLessThan(box);
    expect(wind('chicago', { shape: 'square', twist: 90, taper: 0, setbacks: 'none' }).eddyStrength).toBeLessThan(box);
    expect(wind('chicago', { shape: 'square', twist: 0, taper: 0.4, setbacks: 'none' }).eddyStrength).toBeLessThan(box);
  });

  it('reports the same comfort and strength results as the assessment', () => {
    for (const patch of [{}, { floors: 120, plateWidth: 20, system: 'rigid-frame' as const }]) {
      const s = setup('shanghai', patch);
      const m = windMotion(s.site, s.design, s.analysis);
      expect(m.comfort).toBe(s.analysis.checks.find((c) => c.id === 'windComfort')!.status);
      expect(m.strength).toBe(s.analysis.checks.find((c) => c.id === 'windStrength')!.status);
    }
  });

  it('the top eases into its lean, then sways about it, all 50 times bigger', () => {
    const m = wind('chicago');
    expect(windTop(m, 0)).toBe(0);
    const later = [5, 5.5, 6, 6.5, 7].map((t) => windTop(m, t));
    for (const v of later) {
      expect(v).toBeGreaterThanOrEqual(50 * (m.leanM - m.swayM) - 1e-9);
      expect(v).toBeLessThanOrEqual(50 * (m.leanM + m.swayM) + 1e-9);
    }
  });

  it('sways twice as wildly when the tower would fail in this wind', () => {
    const m = wind('chicago');
    const failing = { ...m, strength: 'fail' as const };
    const swing = (x: typeof m) => Math.max(...[0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => windTop(x, 10 + (k * x.periodS) / 8))) - 50 * x.leanM;
    expect(swing(failing)).toBeCloseTo(2 * swing(m), 6);
  });
});

describe('quakeMotion', () => {
  it('shakes Tokyo far harder than Chicago, at 10 m of display motion per g', () => {
    const tokyo = setup('tokyo');
    expect(quakeMotion(tokyo.site, tokyo.design, tokyo.analysis).groundM).toBeCloseTo(10 * tokyo.site.seismicHazard, 9);
    expect(quake('tokyo').groundM).toBeGreaterThan(5 * quake('chicago').groundM);
  });

  it('base isolation lets only a fifth of the ground motion reach the tower', () => {
    expect(quake('tokyo', { baseIsolation: false }).baseShare).toBe(1);
    expect(quake('tokyo', { baseIsolation: true }).baseShare).toBe(0.2);
  });

  it('taller towers swing more slowly', () => {
    expect(quake('tokyo', { floors: 80 }).periodS).toBeGreaterThan(quake('tokyo', { floors: 20 }).periodS);
  });

  it('follows the assessment: damaged swings harder, failing harder still and leans', () => {
    for (const patch of [{}, { floors: 100, material: 'concrete' as const, system: 'rigid-frame' as const, baseIsolation: false, damping: 'none' as const }]) {
      const s = setup('tokyo', patch);
      const m = quakeMotion(s.site, s.design, s.analysis);
      expect(m.outcome).toBe(s.analysis.seismic.outcome);
      const factor = m.outcome === 'operational' ? 1 : m.outcome === 'damaged' ? 1.5 : 2;
      expect(m.responseM).toBeCloseTo(m.groundM * Math.min(1.5, s.analysis.seismic.ratio) * 0.8 * factor, 9);
      expect(m.failLeanDeg).toBe(m.outcome === 'fails' ? 3 : 0);
    }
  });
});

describe('the quake cycle', () => {
  it('is calm, builds, holds, fades and pauses, every 14 seconds', () => {
    expect(QUAKE_CYCLE_S).toBe(14);
    expect(quakeEnvelope(1)).toBe(0);
    expect(quakeEnvelope(3)).toBeCloseTo(0.5);
    expect(quakeEnvelope(6)).toBe(1);
    expect(quakeEnvelope(10.5)).toBeCloseTo(0.5);
    expect(quakeEnvelope(13)).toBe(0);
    expect(quakeEnvelope(6 + 14)).toBe(1);
  });

  it('keeps the ground within its shaking size, and still when calm', () => {
    for (let t = 0; t < 28; t += 0.07) expect(Math.abs(groundOffset(t, 4.5))).toBeLessThanOrEqual(4.5 + 1e-9);
    expect(groundOffset(1, 4.5)).toBe(0);
    expect(Math.max(...Array.from({ length: 200 }, (_, i) => Math.abs(groundOffset(4 + i * 0.025, 4.5))))).toBeGreaterThan(2);
  });

  it('the top swings by the response size, a quarter period behind the ground', () => {
    const m = quake('tokyo');
    expect(quakeTop(m, 1)).toBe(0);
    const peak = Math.max(...Array.from({ length: 400 }, (_, i) => Math.abs(quakeTop(m, 4 + i * 0.02))));
    expect(peak).toBeLessThanOrEqual(m.responseM + 1e-9);
    expect(peak).toBeGreaterThan(m.responseM * 0.5);
  });

  it('a failing tower leans over during the strong shaking and straightens in the pause', () => {
    const m = { ...quake('tokyo'), outcome: 'fails' as const, failLeanDeg: 3 };
    expect(quakeLean(m, 1)).toBe(0);
    expect(quakeLean(m, 9)).toBeCloseTo((3 * Math.PI) / 180, 9);
    expect(quakeLean(m, 13)).toBe(0);
    expect(quakeLean(quake('chicago'), 9)).toBe(0);
  });
});
```


- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/sim/forces/motion.test.ts`

Expected: FAIL — `Failed to resolve import "./motion"`.

- [ ] **Step 3: Create `src/sim/forces/motion.ts`**

```ts
import { windShapeFactor } from '../analysis/wind';
import { FLOOR_HEIGHT } from '../geometry';
import type { Analysis, CheckId, CheckStatus, Design, SeismicOutcome, Site } from '../types';

/** How much bigger than real the wind sway is drawn. */
export const WIND_EXAGGERATION = 50;
/** Metres of drawn ground motion per g of design shaking. */
export const QUAKE_METRES_PER_G = 10;
/** With base isolation, this share of the ground's motion reaches the tower's base. */
export const ISOLATED_BASE_SHARE = 0.2;
/** One quake: calm, build-up, strong shaking, fade, pause — seconds. */
export const QUAKE_CYCLE_S = 14;

/**
 * How a cantilever bends under a sideways push: 0 at the base, 1 at the top, curving so the upper
 * floors move most. `y` is height above the base and `height` the tower's height, both metres.
 */
export function bendShape(y: number, height: number): number {
  if (height <= 0) return 0;
  const s = Math.min(1, Math.max(0, y / height));
  return 1.5 * s * s - 0.5 * s * s * s;
}

const statusOf = (analysis: Analysis, id: CheckId): CheckStatus => analysis.checks.find((c) => c.id === id)!.status;

export interface WindMotion {
  /** Steady lean of the top in the design storm, real metres. */
  leanM: number;
  /** Back-and-forth sway of the top about that lean, real metres. */
  swayM: number;
  periodS: number;
  exaggeration: number;
  /** 1 = a blunt square box; smaller for round, tapered, set-back or twisted towers. */
  eddyStrength: number;
  comfort: CheckStatus;
  strength: CheckStatus;
}

export function windMotion(_site: Site, design: Design, analysis: Analysis): WindMotion {
  const periodS = analysis.seismic.periodS;
  const accel = (analysis.wind.accelMg * 9.81) / 1000;
  const omega = (2 * Math.PI) / periodS;
  return {
    leanM: analysis.wind.driftRatio * design.floors * FLOOR_HEIGHT,
    swayM: accel / (omega * omega),
    periodS,
    exaggeration: WIND_EXAGGERATION,
    eddyStrength: windShapeFactor(design),
    comfort: statusOf(analysis, 'windComfort'),
    strength: statusOf(analysis, 'windStrength'),
  };
}

/** Drawn sideways offset of the top, metres, `t` seconds after the wind was switched on. */
export function windTop(m: WindMotion, t: number): number {
  const ramp = Math.min(1, Math.max(0, t / 2));
  const sway = m.swayM * (m.strength === 'fail' ? 2 : 1) * Math.sin((2 * Math.PI * t) / m.periodS);
  return m.exaggeration * ramp * (m.leanM + sway);
}

export interface QuakeMotion {
  /** Drawn ground motion at full strength, metres. */
  groundM: number;
  periodS: number;
  /** Drawn bending of the top relative to its base at full strength, metres. */
  responseM: number;
  /** Share of the ground's motion that reaches the tower's base. */
  baseShare: number;
  outcome: SeismicOutcome;
  /** How far a failing tower leans over by the end of the strong shaking, degrees. */
  failLeanDeg: number;
}

const OUTCOME_FACTOR: Record<SeismicOutcome, number> = { operational: 1, damaged: 1.5, fails: 2 };

export function quakeMotion(site: Site, design: Design, analysis: Analysis): QuakeMotion {
  const { outcome, ratio, periodS } = analysis.seismic;
  const groundM = QUAKE_METRES_PER_G * site.seismicHazard;
  return {
    groundM,
    periodS,
    responseM: groundM * Math.min(1.5, ratio) * 0.8 * OUTCOME_FACTOR[outcome],
    baseShare: design.baseIsolation ? ISOLATED_BASE_SHARE : 1,
    outcome,
    failLeanDeg: outcome === 'fails' ? 3 : 0,
  };
}

const cycle = (t: number) => ((t % QUAKE_CYCLE_S) + QUAKE_CYCLE_S) % QUAKE_CYCLE_S;

/** Strength of the shaking, 0..1: 2 s calm, 2 s building, 5 s strong, 3 s fading, 2 s pause. */
export function quakeEnvelope(t: number): number {
  const c = cycle(t);
  if (c < 2) return 0;
  if (c < 4) return (c - 2) / 2;
  if (c < 9) return 1;
  if (c < 12) return 1 - (c - 9) / 3;
  return 0;
}

/** The ground's sideways offset, metres: quick jolts at about 1–3 per second, within ±groundM. */
export function groundOffset(t: number, groundM: number): number {
  const w = 2 * Math.PI;
  const jolts = 0.5 * Math.sin(w * 1.1 * t) + 0.3 * Math.sin(w * 1.9 * t + 1) + 0.2 * Math.sin(w * 2.7 * t + 2);
  return groundM * quakeEnvelope(t) * jolts;
}

/** The top's drawn offset relative to its base, metres: the tower's own swing, a quarter period behind. */
export function quakeTop(m: QuakeMotion, t: number): number {
  const lag = t - m.periodS / 4;
  return m.responseM * quakeEnvelope(lag) * Math.sin((2 * Math.PI * lag) / m.periodS);
}

/** A failing tower's lean, radians: grows through the strong shaking, holds, and resets in the pause. */
export function quakeLean(m: QuakeMotion, t: number): number {
  if (m.failLeanDeg === 0) return 0;
  const c = cycle(t);
  const progress = c < 4 ? 0 : c < 9 ? (c - 4) / 5 : c < 12 ? 1 : 0;
  return (m.failLeanDeg * Math.PI * progress) / 180;
}
```

- [ ] **Step 4: Run the tests and type-check**

Run: `npx vitest run src/sim/forces/motion.test.ts`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  46 passed (46)`, `Tests  344 passed (344)`.

- [ ] **Step 5: Commit**

```bash
git add src/sim/forces/motion.test.ts src/sim/forces/motion.ts
git commit -m "feat: wind and earthquake motion from the analysis

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```

---

### Task 2: The Wind and Earthquake cards

The readout cards, with wording in a new catalog file. **Wind:** the site's design storm, the lean and sway in metres, the felt sway against the limit for the top floor's use, and what dampers do. Impossible numbers become words, and there is a banner if the tower would fail. **Earthquake:** the site's shaking (noting where strong quakes are rare), the tower's own period and whether it rides out or meets the jolts, how close the quake pushes it to its breaking point, the outcome, and lines for isolation and dampers, plus a banner if it would fail.

**Files:**
- Create: `src/sim/forces/readout.test.ts`
- Create: `src/sim/catalog/forces.ts`
- Create: `src/sim/forces/readout.ts`

**Interfaces:**
- Consumes: Task 1: `windMotion`, `WIND_EXAGGERATION`. Existing: `floorUses`, `COEFFICIENTS.wind.dampingReduction`, `COEFFICIENTS.seismic.operationalRatio`.
- Produces:
  - `src/sim/catalog/forces.ts`: `USE_PLURAL`, `WIND_TEXT`, `QUAKE_TEXT`.
  - `src/sim/forces/readout.ts`: `ReadoutLine { text; status? }`, `Readout { title; lines; banner?; note }`, `windReadout(site, design, analysis)`, `quakeReadout(site, design, analysis)`.

- [ ] **Step 1: Write the failing tests**

`src/sim/forces/readout.test.ts` (new):

```ts
import { describe, expect, it } from 'vitest';
import { analyze } from '../analysis';
import { designFor } from '../testUtils';
import type { Design, SiteId } from '../types';
import { quakeReadout, windReadout } from './readout';

const read = (kind: 'wind' | 'quake', siteId: SiteId, patch: Partial<Design> = {}) => {
  const { site, design } = designFor(siteId, patch);
  const analysis = analyze(site, design);
  const r = kind === 'wind' ? windReadout(site, design, analysis) : quakeReadout(site, design, analysis);
  return { site, design, analysis, r, text: r.lines.map((l) => l.text).join('\n') };
};

describe('windReadout', () => {
  it("quotes the site's storm, the lean and sway, and the felt sway against the limit for the top floor's use", () => {
    const { site, analysis, r, text } = read('wind', 'chicago', { useMix: { retail: 0, office: 0, hotel: 0, residential: 100 } });
    expect(r.title).toBe('Wind');
    expect(text).toContain(`${site.windSpeed} m/s`);
    expect(text).toMatch(/Top of tower leans \d+\.\d\d m and sways ±\d+\.\d\d m/);
    expect(text).toContain(`the limit for homes is ${analysis.wind.comfortLimitMg} mg`);
    expect(r.note).toBe('Sway shown 50× bigger');
  });

  it('mentions dampers only when chosen, with how much they cut the felt sway', () => {
    expect(read('wind', 'chicago', { damping: 'none' }).text).not.toMatch(/damper/i);
    expect(read('wind', 'chicago', { damping: 'tmd' }).text).toContain('The tuned mass damper cuts the sway people feel by about 50%.');
    expect(read('wind', 'chicago', { damping: 'viscous' }).text).toContain('The viscous dampers cut the sway people feel by about 38%.');
  });

  it('marks the comfort line by the assessment, and bans a tower that would fail', () => {
    const ok = read('wind', 'chicago');
    expect(ok.r.lines.find((l) => /feel/.test(l.text))!.status).toBe(ok.analysis.checks.find((c) => c.id === 'windComfort')!.status);
    expect(ok.r.banner).toBeUndefined();
    const weak = read('wind', 'shanghai', { floors: 140, plateWidth: 18, system: 'rigid-frame', material: 'steel', taper: 0, twist: 0, setbacks: 'none', exposedStructure: false, damping: 'none' });
    expect(weak.analysis.checks.find((c) => c.id === 'windStrength')!.status).toBe('fail');
    expect(weak.r.banner).toBe('Would fail in this wind');
    expect(weak.text).toMatch(/seasick/);
  });

  it('puts impossible numbers into words instead of quoting them', () => {
    const weak = read('wind', 'shanghai', { floors: 140, plateWidth: 18, system: 'rigid-frame', material: 'steel', taper: 0, twist: 0, setbacks: 'none', exposedStructure: false, damping: 'none' });
    expect(weak.text).toContain('The wind would push the top further than the structure can take');
    expect(weak.text).not.toMatch(/leans \d/);
    expect(weak.text).toContain(`more than 10 times the limit for offices (${weak.analysis.wind.comfortLimitMg} mg)`);
    expect(weak.text).not.toMatch(/feel \d{3,}/);
  });
});

describe('quakeReadout', () => {
  it("quotes the site's shaking, the tower's swing and how hard the quake works it", () => {
    const { site, analysis, r, text } = read('quake', 'tokyo');
    expect(r.title).toBe('Earthquake');
    expect(text).toContain(`${site.seismicHazard} g of ground shaking`);
    expect(text).toContain(`once every ${analysis.seismic.periodS.toFixed(1)} s`);
    expect(text).toContain(`The quake pushes it to ${Math.round(analysis.seismic.ratio * 100)}% of its breaking point; it stays fully working below 35%`);
    expect(r.note).toBe('Motion shown much bigger');
  });

  it('explains whether the tower rides out the jolts or gets shaken hard', () => {
    expect(read('quake', 'tokyo', { floors: 40 }).text).toMatch(/rides them out/);
    expect(read('quake', 'tokyo', { floors: 8 }).text).toMatch(/shaken hard/);
  });

  it('says what happens to the tower, with a banner only when it would fail', () => {
    const fine = read('quake', 'chicago');
    expect(fine.analysis.seismic.outcome).toBe('operational');
    expect(fine.text).toContain('Would stay open for business');
    expect(fine.r.banner).toBeUndefined();
    const damaged = read('quake', 'tokyo', { floors: 100, material: 'concrete', system: 'rigid-frame', baseIsolation: false, damping: 'none' });
    expect(damaged.analysis.seismic.outcome).toBe('damaged');
    expect(damaged.text).toContain('Damaged');
    expect(damaged.r.banner).toBeUndefined();
    // A squat, heavy, stiff concrete box with a rooftop pool, in Tokyo.
    const failing = read('quake', 'tokyo', { floors: 10, shape: 'square', setbacks: 'none', material: 'concrete', system: 'rigid-frame', baseIsolation: false, damping: 'none', amenities: ['pool'], facade: 'masonry' });
    expect(failing.analysis.seismic.outcome).toBe('fails');
    expect(failing.r.banner).toBe('Would fail in this earthquake');
  });

  it('mentions base isolation and dampers only when chosen', () => {
    expect(read('quake', 'tokyo', { baseIsolation: false, damping: 'none' }).text).not.toMatch(/isolation|damper/i);
    expect(read('quake', 'tokyo', { baseIsolation: true }).text).toContain('the ground moves, the tower barely does');
    expect(read('quake', 'tokyo', { damping: 'viscous' }).text).toMatch(/Viscous dampers/);
    expect(read('quake', 'tokyo', { damping: 'tmd' }).text).toMatch(/tuned mass damper/);
  });

  it('notes that strong earthquakes are rare where they are', () => {
    expect(read('quake', 'chicago').text).toMatch(/rare/);
    expect(read('quake', 'tokyo').text).not.toMatch(/rare/);
  });
});
```


- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/sim/forces/readout.test.ts`

Expected: FAIL — `Failed to resolve import "./readout"`.

- [ ] **Step 3: Create `src/sim/catalog/forces.ts`**

```ts
import type { SeismicOutcome, UseType } from '../types';

/** Every word on the Wind and Earthquake readout cards. */
export const USE_PLURAL: Record<UseType, string> = { retail: 'shops', office: 'offices', hotel: 'hotels', residential: 'homes' };

export const WIND_TEXT = {
  title: 'Wind',
  storm: (speed: number, city: string) => `Wind: ${speed} m/s — ${city}'s design storm`,
  sway: (leanM: string, swayM: string) => `Top of tower leans ${leanM} m and sways ±${swayM} m`,
  overpowered: 'The wind would push the top further than the structure can take',
  felt: (mg: string, use: string, limit: number) => `People at the top feel ${mg} mg; the limit for ${use} is ${limit} mg`,
  feltOver: (use: string, limit: number) => `People at the top would feel more than 10 times the limit for ${use} (${limit} mg) — everyone up there would feel seasick`,
  queasy: ' — some people at the top would feel queasy',
  seasick: ' — people at the top would feel seasick',
  tmd: (pct: number) => `The tuned mass damper cuts the sway people feel by about ${pct}%.`,
  viscous: (pct: number) => `The viscous dampers cut the sway people feel by about ${pct}%.`,
  banner: 'Would fail in this wind',
  note: (x: number) => `Sway shown ${x}× bigger`,
};

export const QUAKE_TEXT = {
  title: 'Earthquake',
  shaking: (city: string, g: number) => `${city}'s design earthquake: ${g} g of ground shaking`,
  rare: ' — strong earthquakes are rare here',
  period: (s: string) => `Your tower swings back and forth once every ${s} s`,
  slow: ' — much slower than the quick jolts, so it rides them out',
  fast: " — close to the jolts' rhythm, so it gets shaken hard",
  ratio: (pct: number, workingPct: number) => `The quake pushes it to ${pct}% of its breaking point; it stays fully working below ${workingPct}%`,
  outcome: {
    operational: 'Would stay open for business',
    damaged: 'Damaged — needs repairs before reopening',
    fails: 'Would fail: the structure cannot take this quake',
  } satisfies Record<SeismicOutcome, string>,
  isolation: 'Base isolation: the ground moves, the tower barely does.',
  tmd: 'The tuned mass damper calms the shaking a little (it is tuned for wind).',
  viscous: 'Viscous dampers in the frame soak up some of the shaking.',
  banner: 'Would fail in this earthquake',
  note: 'Motion shown much bigger',
};
```

- [ ] **Step 4: Create `src/sim/forces/readout.ts`**

```ts
import { floorUses } from '../analysis/massing';
import { COEFFICIENTS } from '../catalog/coefficients';
import { QUAKE_TEXT, USE_PLURAL, WIND_TEXT } from '../catalog/forces';
import type { Analysis, CheckStatus, Design, SeismicOutcome, Site } from '../types';
import { WIND_EXAGGERATION, windMotion } from './motion';

export interface ReadoutLine {
  text: string;
  /** Shown as a tick, warning or cross when set. */
  status?: CheckStatus;
}

export interface Readout {
  title: string;
  lines: ReadoutLine[];
  /** A warning shown across the scene when the design would fail. */
  banner?: string;
  /** How exaggerated the motion is. */
  note: string;
}

const OUTCOME_STATUS: Record<SeismicOutcome, CheckStatus> = { operational: 'pass', damaged: 'marginal', fails: 'fail' };
const cutPct = (reduction: number) => Math.round((1 - 1 / reduction) * 100);

/** The Wind card: the storm, the lean and sway, how it feels at the top, and what dampers do. */
export function windReadout(site: Site, design: Design, analysis: Analysis): Readout {
  const m = windMotion(site, design, analysis);
  const comfort = analysis.checks.find((c) => c.id === 'windComfort')!;
  const top = floorUses(design).at(-1) ?? 'office';
  const limit = analysis.wind.comfortLimitMg;
  // Far outside the model's range the numbers stop meaning anything, so say it in words.
  const felt =
    analysis.wind.accelMg > 10 * limit
      ? WIND_TEXT.feltOver(USE_PLURAL[top], limit)
      : WIND_TEXT.felt(analysis.wind.accelMg.toFixed(1), USE_PLURAL[top], limit) +
        (comfort.status === 'fail' ? WIND_TEXT.seasick : comfort.status === 'marginal' ? WIND_TEXT.queasy : '');
  const lines: ReadoutLine[] = [
    { text: WIND_TEXT.storm(site.windSpeed, site.city) },
    { text: m.strength === 'fail' ? WIND_TEXT.overpowered : WIND_TEXT.sway(m.leanM.toFixed(2), m.swayM.toFixed(2)) },
    { text: felt, status: comfort.status },
  ];
  const reduction = COEFFICIENTS.wind.dampingReduction;
  if (design.damping === 'tmd') lines.push({ text: WIND_TEXT.tmd(cutPct(reduction.tmd)) });
  if (design.damping === 'viscous') lines.push({ text: WIND_TEXT.viscous(cutPct(reduction.viscous)) });
  return {
    title: WIND_TEXT.title,
    lines,
    banner: m.strength === 'fail' ? WIND_TEXT.banner : undefined,
    note: WIND_TEXT.note(WIND_EXAGGERATION),
  };
}

/** The Earthquake card: the site's shaking, the tower's own swing, how hard it is worked and the result. */
export function quakeReadout(site: Site, design: Design, analysis: Analysis): Readout {
  const { periodS, ratio, outcome } = analysis.seismic;
  const rhythm = periodS >= 2 ? QUAKE_TEXT.slow : periodS < 1 ? QUAKE_TEXT.fast : '';
  const lines: ReadoutLine[] = [
    { text: QUAKE_TEXT.shaking(site.city, site.seismicHazard) + (site.seismicHazard < 0.1 ? QUAKE_TEXT.rare : '') },
    { text: QUAKE_TEXT.period(periodS.toFixed(1)) + rhythm },
    { text: QUAKE_TEXT.ratio(Math.round(ratio * 100), Math.round(COEFFICIENTS.seismic.operationalRatio * 100)) },
    { text: QUAKE_TEXT.outcome[outcome], status: OUTCOME_STATUS[outcome] },
  ];
  if (design.baseIsolation) lines.push({ text: QUAKE_TEXT.isolation });
  if (design.damping === 'tmd') lines.push({ text: QUAKE_TEXT.tmd });
  if (design.damping === 'viscous') lines.push({ text: QUAKE_TEXT.viscous });
  return {
    title: QUAKE_TEXT.title,
    lines,
    banner: outcome === 'fails' ? QUAKE_TEXT.banner : undefined,
    note: QUAKE_TEXT.note,
  };
}
```

- [ ] **Step 5: Run the tests and type-check**

Run: `npx vitest run src/sim/forces/readout.test.ts`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  47 passed (47)`, `Tests  353 passed (353)`.

- [ ] **Step 6: Commit**

```bash
git add src/sim/forces/readout.test.ts src/sim/catalog/forces.ts src/sim/forces/readout.ts
git commit -m "feat: wind and earthquake readout cards

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```

---

### Task 3: The force setting

A view-only `force` in the store, like day/night: one force at a time, toggled off by pressing it again. It is never part of the design history, it is remembered through construction, and a new project resets it.

**Files:**
- Create: `src/state/force.test.ts`
- Modify: `src/state/store.ts`

**Interfaces:**
- Consumes: the existing store.
- Produces: `ForceView = 'none' | 'wind' | 'quake'`, store state `force`, and the action `toggleForce(f: 'wind' | 'quake')`.

- [ ] **Step 1: Write the failing tests**

`src/state/force.test.ts` (new):

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { useGame } from './store';

const state = () => useGame.getState();

describe('force overlay', () => {
  beforeEach(() => {
    state().newProject();
    state().startProject('tokyo', 'sandbox');
  });

  it('starts off, and shows one force at a time', () => {
    expect(state().force).toBe('none');
    state().toggleForce('wind');
    expect(state().force).toBe('wind');
    state().toggleForce('quake');
    expect(state().force).toBe('quake');
    state().toggleForce('quake');
    expect(state().force).toBe('none');
  });

  it('is a view setting: it never touches the design history', () => {
    const history = state().history;
    state().toggleForce('wind');
    expect(state().history).toBe(history);
  });

  it('is remembered through construction, and forgotten by a new project', () => {
    state().toggleForce('quake');
    state().build();
    expect(state().force).toBe('quake');
    state().skipBuild();
    expect(state().force).toBe('quake');
    state().newProject();
    expect(state().force).toBe('none');
  });
});
```


- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/state/force.test.ts`

Expected: FAIL — `toggleForce` is not a function, and `force` is undefined.

- [ ] **Step 3: Edit `src/state/store.ts`**

Replace:

```ts
export type TimeOfDay = 'day' | 'night';
```

with:

```ts
export type TimeOfDay = 'day' | 'night';
/** Which force the 3D view is showing acting on the tower. */
export type ForceView = 'none' | 'wind' | 'quake';
```

Replace:

```ts
  timeOfDay: TimeOfDay;
  /** Construction stage being shown (0..5) while building. */
```

with:

```ts
  timeOfDay: TimeOfDay;
  /** View only, like `timeOfDay`. Hidden while building, but remembered through it. */
  force: ForceView;
  /** Construction stage being shown (0..5) while building. */
```

Replace:

```ts
  setTimeOfDay: (t: TimeOfDay) => void;
}
```

with:

```ts
  setTimeOfDay: (t: TimeOfDay) => void;
  /** Show this force, or turn it off if it is already showing. */
  toggleForce: (f: Exclude<ForceView, 'none'>) => void;
}
```

Replace:

```ts
  timeOfDay: 'day',
  buildStage: 0,
```

with:

```ts
  timeOfDay: 'day',
  force: 'none',
  buildStage: 0,
```

Replace:

```ts
      timeOfDay: 'day',
      buildStage: 0,
```

with:

```ts
      timeOfDay: 'day',
      force: 'none',
      buildStage: 0,
```

Replace:

```ts
  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
}));
```

with:

```ts
  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),

  toggleForce: (f) => set({ force: get().force === f ? 'none' : f }),
}));
```

- [ ] **Step 4: Run the tests and type-check**

Run: `npx vitest run src/state/force.test.ts`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  48 passed (48)`, `Tests  356 passed (356)`.

- [ ] **Step 5: Commit**

```bash
git add src/state/force.test.ts src/state/store.ts
git commit -m "feat: force view setting

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```

---

### Task 4: A tower that bends

The sway signal: one mutable object with the ground's offset, the base's offset, the top's offset relative to the base, a lean and a height. `swayAt(signal, y)` is the sideways offset at height `y`. While the signal is active, `Building` re-sets each floor's body and slab matrix every frame, then once more when it stops, to put the floors back. `PartsMesh` moves each crown, ornament and bracing part by the bend at its own height, and the aircraft lights follow. Amenities ride along at their own heights. `Building` can also leave out its top floors, for the see-through damper.

**Files:**
- Create: `src/scene/forces/sway.test.ts`
- Modify: `src/scene/Building.test.tsx`
- Create: `src/scene/forces/sway.ts`
- Modify: `src/scene/Building.tsx`
- Modify: `src/scene/parts/PartsMesh.tsx`

**Interfaces:**
- Consumes: Task 1: `bendShape`.
- Produces:
  - `src/scene/forces/sway.ts`: `SwaySignal { active; groundX; baseX; topX; lean; height }`, `createSway()`, `swayAt(signal, y)`.
  - `<Building ... sway? hideTopFloors? />` and `<PartsMesh ... sway? />`.

- [ ] **Step 1: Write the failing tests**

`src/scene/forces/sway.test.ts` (new):

```ts
import { describe, expect, it } from 'vitest';
import { createSway, swayAt } from './sway';

describe('swayAt', () => {
  it('is nothing at rest', () => {
    expect(swayAt(createSway(), 50)).toBe(0);
  });

  it('moves the base with the ground share and bends the rest, most at the top', () => {
    const s = { ...createSway(), active: true, baseX: 2, topX: 10, height: 100 };
    expect(swayAt(s, 0)).toBe(2);
    expect(swayAt(s, 100)).toBe(12);
    expect(swayAt(s, 50)).toBeGreaterThan(2);
    expect(swayAt(s, 50)).toBeLessThan(7);
  });

  it('adds a lean that grows with height', () => {
    const s = { ...createSway(), active: true, lean: Math.atan(0.05), height: 100 };
    expect(swayAt(s, 100)).toBeCloseTo(5, 9);
    expect(swayAt(s, 0)).toBe(0);
  });
});
```


In `src/scene/Building.test.tsx`:

Replace:

```tsx
import ReactThreeTestRenderer from '@react-three/test-renderer';
import type * as THREE from 'three';
import { describe, expect, it } from 'vitest';
```

with:

```tsx
import ReactThreeTestRenderer from '@react-three/test-renderer';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
```

Replace:

```tsx
import { crownParts } from './crownParts';
import { ornamentParts } from './ornaments';
```

with:

```tsx
import { crownParts } from './crownParts';
import { createSway, swayAt } from './forces/sway';
import { ornamentParts } from './ornaments';
```

Replace:

```tsx
    expect(Array.from(lit.slice(8)).every((v) => v === 0)).toBe(true);
  });
});
```

with:

```tsx
    expect(Array.from(lit.slice(8)).every((v) => v === 0)).toBe(true);
  });
});

describe('<Building sway />', () => {
  const xOf = (mesh: THREE.InstancedMesh, i: number) => {
    const m = new THREE.Matrix4();
    mesh.getMatrixAt(i, m);
    return m.elements[12];
  };

  it('bends the tower with the sway signal: the top floor and top ornaments move most', async () => {
    const { site, design } = designFor('chicago', { floors: 30, ornaments: ['stone-ribs', 'rusticated-base'], ornament: 'high' });
    const sway = { ...createSway(), active: true, topX: 10, baseX: 1, height: 120 };
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} sway={sway} />);
    await r.advanceFrames(1, 0.016);
    const body = r.scene.findAll((n) => n.props.name === 'body')[0].instance as THREE.InstancedMesh;
    expect(xOf(body, 29)).toBeGreaterThan(xOf(body, 0) + 5);
    expect(xOf(body, 0)).toBeGreaterThanOrEqual(1);
    const ornaments = ornamentParts(design);
    const meshes = instancedIn(r, 'ornaments');
    // Every instance sits at its own x plus the sway at its height.
    let checked = 0;
    for (const mesh of meshes)
      for (let i = 0; i < mesh.count; i++) {
        const x = xOf(mesh, i);
        const moved = ornaments.some((p) => Math.abs(p.position[0] + swayAt(sway, p.position[1]) - x) < 1e-6);
        expect(moved).toBe(true);
        checked++;
      }
    expect(checked).toBeGreaterThan(0);
  });

  it('puts every floor back when the sway stops', async () => {
    const { site, design } = designFor('chicago', { floors: 20 });
    const sway = { ...createSway(), active: true, topX: 10, height: 80 };
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} sway={sway} />);
    await r.advanceFrames(1, 0.016);
    sway.active = false;
    await r.advanceFrames(1, 0.016);
    const body = r.scene.findAll((n) => n.props.name === 'body')[0].instance as THREE.InstancedMesh;
    for (let i = 0; i < 20; i++) expect(xOf(body, i)).toBeCloseTo(0, 9);
  });

  it('can hide its top floors (for the see-through damper)', async () => {
    const { site, design } = designFor('chicago', { floors: 20 });
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} hideTopFloors={3} />);
    expect((r.scene.findAll((n) => n.props.name === 'body')[0].instance as THREE.InstancedMesh).count).toBe(17);
  });
});
```


- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/scene/forces/sway.test.ts src/scene/Building.test.tsx`

Expected: FAIL — `Failed to resolve import "./forces/sway"` (and `"./sway"`).

- [ ] **Step 3: Create `src/scene/forces/sway.ts`**

```ts
import { bendShape } from '../../sim/forces/motion';

/**
 * Where the tower is this frame while a force acts on it. One mutable object, written each frame by the
 * forces view and read each frame by the tower, so the motion never goes through React state.
 */
export interface SwaySignal {
  active: boolean;
  /** Sideways offset of the ground (the whole city block), metres. */
  groundX: number;
  /** Sideways offset of the tower's base, metres. */
  baseX: number;
  /** Sideways offset of the top relative to the base, metres. */
  topX: number;
  /** A failing tower's lean, radians. */
  lean: number;
  /** Height the bend is measured over, metres. */
  height: number;
}

export const createSway = (): SwaySignal => ({ active: false, groundX: 0, baseX: 0, topX: 0, lean: 0, height: 1 });

/** Sideways offset, metres, of the part of the tower at height `y`. */
export function swayAt(s: SwaySignal, y: number): number {
  return s.baseX + s.topX * bendShape(y, s.height) + Math.tan(s.lean) * Math.max(0, y);
}
```

- [ ] **Step 4: Edit `src/scene/Building.tsx`**

Replace:

```tsx
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
```

with:

```tsx
import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import * as THREE from 'three';
```

Replace:

```tsx
import { crownParts } from './crownParts';
import { lotCenter } from './layout';
```

with:

```tsx
import { crownParts } from './crownParts';
import { swayAt, type SwaySignal } from './forces/sway';
import { lotCenter } from './layout';
```

Replace:

```tsx

function Instanced({ geometry, items, color, name, count }: { geometry: THREE.BufferGeometry; items: BoxInstance[]; color: string; name: string; count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
```

with:

```tsx

const swayMatrix = new THREE.Matrix4();

/** While the tower sways, re-sets each floor's matrix every frame; once more when it stops, to put it back. */
function useSwayedInstances(ref: RefObject<THREE.InstancedMesh | null>, items: BoxInstance[], sway?: SwaySignal) {
  const swaying = useRef(false);
  useFrame(() => {
    const mesh = ref.current;
    if (!mesh || !sway || (!sway.active && !swaying.current)) return;
    swaying.current = sway.active;
    items.forEach((it, i) => {
      swayMatrix.copy(instanceMatrix(it));
      if (sway.active) swayMatrix.elements[12] += swayAt(sway, it.position[1]);
      mesh.setMatrixAt(i, swayMatrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
}

/** Moves its children sideways with the sway at height `y` (for one-off meshes such as amenities). */
function SwayFollow({ y, sway, children }: { y: number; sway?: SwaySignal; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current && sway) ref.current.position.x = sway.active ? swayAt(sway, y) : 0;
  });
  return <group ref={ref}>{children}</group>;
}

function Instanced({ geometry, items, color, name, count, sway }: { geometry: THREE.BufferGeometry; items: BoxInstance[]; color: string; name: string; count?: number; sway?: SwaySignal }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useSwayedInstances(ref, items, sway);
  useLayoutEffect(() => {
```

Replace:

```tsx
 */
function Body({ design, night, floors, litFloors }: { design: Design; night: boolean; floors?: number; litFloors?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const items = useMemo(() => bodyInstances(design), [design]);
  const recipe = useMemo(() => facadeRecipe(design), [design]);
```

with:

```tsx
 */
function Body({ design, night, floors, litFloors, sway }: { design: Design; night: boolean; floors?: number; litFloors?: number; sway?: SwaySignal }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const items = useMemo(() => bodyInstances(design), [design]);
  useSwayedInstances(ref, items, sway);
  const recipe = useMemo(() => facadeRecipe(design), [design]);
```

Replace:

```tsx

function Amenities({ design, geometry }: { design: Design; geometry: THREE.BufferGeometry }) {
  const slices = floorSlices(design);
```

with:

```tsx

function Amenities({ design, geometry, sway }: { design: Design; geometry: THREE.BufferGeometry; sway?: SwaySignal }) {
  const slices = floorSlices(design);
```

Replace:

```tsx
      {design.amenities.includes('helipad') && (
        <mesh position={[0, roofY + 0.4, 0]}>
          <cylinderGeometry args={[Math.min(top.width, top.depth) * 0.35, Math.min(top.width, top.depth) * 0.35, 0.6, 24]} />
          <meshStandardMaterial color="#3b3f45" />
        </mesh>
      )}
      {design.amenities.includes('pool') && (
        <mesh position={[0, roofY + 0.5, 0]} rotation={[0, top.rotation, 0]} scale={[top.width * 0.5, 0.6, top.depth * 0.3]}>
          <boxGeometry />
          <meshStandardMaterial color="#3fa9f5" />
        </mesh>
      )}
      {design.amenities.includes('observation-deck') && (
        <mesh geometry={geometry} position={[0, deck.y + FLOOR_HEIGHT * 0.75, 0]} rotation={[0, deck.rotation, 0]} scale={[deck.width * 1.12, FLOOR_HEIGHT * 1.5, deck.depth * 1.12]}>
          <meshStandardMaterial color="#bfe9ff" transparent opacity={0.65} />
        </mesh>
      )}
      {design.amenities.includes('sky-garden') && (
        <mesh geometry={geometry} position={[0, garden.y + FLOOR_HEIGHT / 2, 0]} rotation={[0, garden.rotation, 0]} scale={[garden.width * 1.06, FLOOR_HEIGHT, garden.depth * 1.06]}>
          <meshStandardMaterial color="#4caf50" flatShading />
        </mesh>
      )}
```

with:

```tsx
      {design.amenities.includes('helipad') && (
        <SwayFollow y={roofY} sway={sway}>
          <mesh position={[0, roofY + 0.4, 0]}>
            <cylinderGeometry args={[Math.min(top.width, top.depth) * 0.35, Math.min(top.width, top.depth) * 0.35, 0.6, 24]} />
            <meshStandardMaterial color="#3b3f45" />
          </mesh>
        </SwayFollow>
      )}
      {design.amenities.includes('pool') && (
        <SwayFollow y={roofY} sway={sway}>
          <mesh position={[0, roofY + 0.5, 0]} rotation={[0, top.rotation, 0]} scale={[top.width * 0.5, 0.6, top.depth * 0.3]}>
            <boxGeometry />
            <meshStandardMaterial color="#3fa9f5" />
          </mesh>
        </SwayFollow>
      )}
      {design.amenities.includes('observation-deck') && (
        <SwayFollow y={deck.y + FLOOR_HEIGHT * 0.75} sway={sway}>
          <mesh geometry={geometry} position={[0, deck.y + FLOOR_HEIGHT * 0.75, 0]} rotation={[0, deck.rotation, 0]} scale={[deck.width * 1.12, FLOOR_HEIGHT * 1.5, deck.depth * 1.12]}>
            <meshStandardMaterial color="#bfe9ff" transparent opacity={0.65} />
          </mesh>
        </SwayFollow>
      )}
      {design.amenities.includes('sky-garden') && (
        <SwayFollow y={garden.y + FLOOR_HEIGHT / 2} sway={sway}>
          <mesh geometry={geometry} position={[0, garden.y + FLOOR_HEIGHT / 2, 0]} rotation={[0, garden.rotation, 0]} scale={[garden.width * 1.06, FLOOR_HEIGHT, garden.depth * 1.06]}>
            <meshStandardMaterial color="#4caf50" flatShading />
          </mesh>
        </SwayFollow>
      )}
```

Replace:

```tsx

export function Building({ site, design, night = false, reveal }: { site: Site; design: Design; night?: boolean; reveal?: BuildingReveal }) {
  const [lx, lz] = lotCenter(site);
```

with:

```tsx

export function Building({
  site,
  design,
  night = false,
  reveal,
  sway,
  hideTopFloors = 0,
}: {
  site: Site;
  design: Design;
  night?: boolean;
  reveal?: BuildingReveal;
  /** While a force acts on the tower, it bends with this signal every frame. */
  sway?: SwaySignal;
  /** Leave out this many top floors (the see-through damper view draws them instead). */
  hideTopFloors?: number;
}) {
  const [lx, lz] = lotCenter(site);
```

Replace:

```tsx
  }, [ornaments, crown, share]);
  const look = { palette: design.palette, plan: design.shape, night };
  return (
    <group name="building" position={[lx, 0, lz]}>
      <Body design={design} night={night || !!reveal?.lights} floors={reveal?.floors} litFloors={reveal?.litFloors} />
      <Instanced name="slabs" geometry={geometry} items={slabs} color={design.palette.accent} count={reveal?.floors} />
      <PartsMesh name="crown" parts={top.crown} {...look} />
```

with:

```tsx
  }, [ornaments, crown, share]);
  const look = { palette: design.palette, plan: design.shape, night, sway };
  const floors = Math.min(reveal?.floors ?? design.floors, design.floors - hideTopFloors);
  return (
    <group name="building" position={[lx, 0, lz]}>
      <Body design={design} night={night || !!reveal?.lights} floors={floors} litFloors={reveal?.litFloors} sway={sway} />
      <Instanced name="slabs" geometry={geometry} items={slabs} color={design.palette.accent} count={floors} sway={sway} />
      <PartsMesh name="crown" parts={top.crown} {...look} />
```

Replace:

```tsx
      <PartsMesh name="bracing" parts={reveal ? [] : bracing} {...look} />
      {share > 0.5 && <Amenities design={design} geometry={geometry} />}
    </group>
```

with:

```tsx
      <PartsMesh name="bracing" parts={reveal ? [] : bracing} {...look} />
      {share > 0.5 && <Amenities design={design} geometry={geometry} sway={sway} />}
    </group>
```

- [ ] **Step 5: Edit `src/scene/parts/PartsMesh.tsx`**

Replace:

```tsx
import type { Palette, PlanShape } from '../../sim/types';
import { partGeometry } from './geometries';
```

with:

```tsx
import type { Palette, PlanShape } from '../../sim/types';
import { swayAt, type SwaySignal } from '../forces/sway';
import { partGeometry } from './geometries';
```

Replace:

```tsx

function Group({ group, palette, plan, night }: { group: PartGroup; palette: Palette; plan: PlanShape; night: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const { sample, parts } = group;
```

with:

```tsx

function Group({ group, palette, plan, night, sway }: { group: PartGroup; palette: Palette; plan: PlanShape; night: boolean; sway?: SwaySignal }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const swaying = useRef(false);
  const { sample, parts } = group;
```

Replace:

```tsx
    const mesh = ref.current;
    if (!mesh || sample.animate !== 'spin') return;
    const t = clock.getElapsedTime() * 1.5;
    parts.forEach((p, i) => mesh.setMatrixAt(i, partMatrix(p, t, mat)));
    mesh.instanceMatrix.needsUpdate = true;
```

with:

```tsx
    const mesh = ref.current;
    const spin = sample.animate === 'spin';
    const swayOn = !!sway?.active;
    // Runs while spinning or swaying, and once more after the sway stops to put every part back.
    if (!mesh || (!spin && !swayOn && !swaying.current)) return;
    swaying.current = swayOn;
    const t = spin ? clock.getElapsedTime() * 1.5 : 0;
    parts.forEach((p, i) => {
      partMatrix(p, t, mat);
      if (swayOn) mat.elements[12] += swayAt(sway!, p.position[1]);
      mesh.setMatrixAt(i, mat);
    });
    mesh.instanceMatrix.needsUpdate = true;
```

Replace:

```tsx
/** Red aircraft-warning lights on top of masts and spires, blinking about once a second at night. */
function AircraftLights({ parts }: { parts: Part[] }) {
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ff2020', emissive: '#ff2020' }), []);
```

with:

```tsx
/** Red aircraft-warning lights on top of masts and spires, blinking about once a second at night. */
function AircraftLights({ parts, sway }: { parts: Part[]; sway?: SwaySignal }) {
  const group = useRef<THREE.Group>(null);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ff2020', emissive: '#ff2020' }), []);
```

Replace:

```tsx
    material.emissiveIntensity = Math.sin(clock.getElapsedTime() * Math.PI * 2) > 0 ? 3 : 0.2;
  });
  return (
    <group name="aircraft-lights">
      {tops.map((t, i) => (
```

with:

```tsx
    material.emissiveIntensity = Math.sin(clock.getElapsedTime() * Math.PI * 2) > 0 ? 3 : 0.2;
    group.current?.children.forEach((c, i) => (c.position.x = tops[i][0] + (sway?.active ? swayAt(sway, tops[i][1]) : 0)));
  });
  return (
    <group name="aircraft-lights" ref={group}>
      {tops.map((t, i) => (
```

Replace:

```tsx
  name,
}: {
```

with:

```tsx
  name,
  sway,
}: {
```

Replace:

```tsx
  name: string;
}) {
```

with:

```tsx
  name: string;
  /** Parts follow the tower's bend at their own height while a force acts on it. */
  sway?: SwaySignal;
}) {
```

Replace:

```tsx
      {groups.map((g) => (
        <Group key={g.key} group={g} palette={palette} plan={plan} night={night} />
      ))}
      {night && blinkers.length > 0 && <AircraftLights parts={blinkers} />}
    </group>
```

with:

```tsx
      {groups.map((g) => (
        <Group key={g.key} group={g} palette={palette} plan={plan} night={night} sway={sway} />
      ))}
      {night && blinkers.length > 0 && <AircraftLights parts={blinkers} sway={sway} />}
    </group>
```

- [ ] **Step 6: Run the tests and type-check**

Run: `npx vitest run src/scene/forces/sway.test.ts src/scene/Building.test.tsx`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  49 passed (49)`, `Tests  362 passed (362)`.

- [ ] **Step 7: Commit**

```bash
git add src/scene/forces/sway.test.ts src/scene/Building.test.tsx src/scene/forces/sway.ts src/scene/Building.tsx src/scene/parts/PartsMesh.tsx
git commit -m "feat: the tower bends with a sway signal

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```

---

### Task 5: The forces in the 3D view

`ForcesView` keeps the force's clock (restarting when the force changes) and writes the sway signal each frame:

- **Wind:** the top's lean and sway.
- **Quake:** the ground's jolts, the base's share of them, the top's swing and a failing tower's lean.

The drawn sway is capped at 15% of the height. It also draws the wind streaks and eddies, the see-through top floors with the swinging damper, and the damage marks: red bands that pulse round marked floors, and cracks that flash during strong shaking. `forceMarks` decides which floors are marked, from the assessment. `GroundShake` moves the city block, neighbours and foundation with the ground. The sway signal gains the force's clock. `Scene` wires it all together: the ground group, the tower's sway, hiding the top floors for the damper, and `ForcesView` while a force is on (never while building).

**Files:**
- Create: `src/scene/forces/ForcesView.test.tsx`
- Modify: `src/scene/forces/sway.ts`
- Create: `src/scene/forces/ForcesView.tsx`
- Modify: `src/scene/Scene.tsx`

**Interfaces:**
- Consumes: Tasks 1–4: `windMotion`, `quakeMotion`, `windTop`, `quakeTop`, `groundOffset`, `quakeEnvelope`, `quakeLean`, `SwaySignal`, `createSway`, `swayAt`, `<Building sway hideTopFloors />`. Store: `force`.
- Produces:
  - `SwaySignal` gains `time` (seconds since the force came on).
  - `src/scene/forces/ForcesView.tsx`: `MAX_DRAWN_SWAY` (0.15), `ForceMarks { bands; cracks }`, `forceMarks(force, site, design, analysis)`, `<GroundShake sway>` (group named `ground`), and `<ForcesView site design analysis force sway />`, with meshes named `wind-streaks`, `damper-ghost`, `damage-bands` and `cracks`.

- [ ] **Step 1: Write the failing tests**

`src/scene/forces/ForcesView.test.tsx` (new):

```tsx
import ReactThreeTestRenderer from '@react-three/test-renderer';
import type * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { analyze } from '../../sim/analysis';
import { quakeMotion } from '../../sim/forces/motion';
import { designFor } from '../../sim/testUtils';
import type { Design, SiteId } from '../../sim/types';
import { ForcesView, GroundShake, forceMarks } from './ForcesView';
import { createSway } from './sway';

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;
const count = (r: Renderer, name: string) =>
  r.scene.findAll((n) => n.props.name === name).reduce((s, n) => s + ((n.instance as THREE.InstancedMesh).count ?? 0), 0);

const view = async (force: 'wind' | 'quake', siteId: SiteId, patch: Partial<Design> = {}) => {
  const { site, design } = designFor(siteId, patch);
  const analysis = analyze(site, design);
  const sway = createSway();
  const r = await ReactThreeTestRenderer.create(<ForcesView site={site} design={design} analysis={analysis} force={force} sway={sway} />);
  return { r, sway, site, design, analysis };
};

describe('<ForcesView />', () => {
  it('wind bends the tower over without moving the ground', async () => {
    const { r, sway, design } = await view('wind', 'chicago');
    await r.advanceFrames(60, 0.05);
    expect(sway.active).toBe(true);
    expect(sway.topX).toBeGreaterThan(0);
    expect(sway.groundX).toBe(0);
    expect(sway.height).toBe(design.floors * 4);
    expect(sway.time).toBeCloseTo(3, 5);
  });

  it('a quake shakes the ground, and base isolation lets only a fifth of it reach the tower', async () => {
    for (const baseIsolation of [false, true]) {
      const { r, sway } = await view('quake', 'tokyo', { baseIsolation });
      let moved = false;
      for (let i = 0; i < 80; i++) {
        await r.advanceFrames(1, 0.05);
        if (Math.abs(sway.groundX) > 0.5) {
          moved = true;
          expect(sway.baseX).toBeCloseTo(sway.groundX * (baseIsolation ? 0.2 : 1), 9);
        }
      }
      expect(moved).toBe(true);
    }
  });

  it('never draws the sway bigger than 15% of the height, even for a tower that would fail badly', async () => {
    const { r, sway, design } = await view('wind', 'shanghai', { floors: 140, plateWidth: 18, system: 'rigid-frame', material: 'steel', taper: 0, twist: 0, setbacks: 'none', exposedStructure: false, damping: 'none' });
    for (let i = 0; i < 40; i++) {
      await r.advanceFrames(1, 0.1);
      expect(Math.abs(sway.topX)).toBeLessThanOrEqual(0.15 * design.floors * 4 + 1e-9);
    }
    expect(Math.abs(sway.topX)).toBeGreaterThan(0.1 * design.floors * 4);
  });

  it('stops the sway when the force is switched off', async () => {
    const { r, sway } = await view('wind', 'chicago');
    await r.advanceFrames(10, 0.05);
    await r.unmount();
    expect(sway.active).toBe(false);
  });

  it('draws more eddies behind a blunt square box than behind a round, twisted tower', async () => {
    const square = await view('wind', 'chicago', { shape: 'square', twist: 0, taper: 0, setbacks: 'none' });
    const round = await view('wind', 'chicago', { shape: 'circle', twist: 90, taper: 0.3, setbacks: 'none' });
    expect(count(square.r, 'wind-streaks')).toBeGreaterThan(count(round.r, 'wind-streaks'));
    expect(count(round.r, 'wind-streaks')).toBeGreaterThanOrEqual(40);
  });

  it('shows the tuned mass damper inside see-through top floors, only with a damper in the wind', async () => {
    expect((await view('wind', 'chicago', { damping: 'tmd' })).r.scene.findAll((n) => n.props.name === 'damper-ghost')).toHaveLength(1);
    expect((await view('wind', 'chicago', { damping: 'none' })).r.scene.findAll((n) => n.props.name === 'damper-ghost')).toHaveLength(0);
    expect((await view('quake', 'chicago', { damping: 'tmd' })).r.scene.findAll((n) => n.props.name === 'damper-ghost')).toHaveLength(0);
  });
});

describe('forceMarks', () => {
  it('marks the lower third when the tower would fail, the top when people would be seasick, and cracks when damaged', () => {
    const weak = designFor('shanghai', { floors: 140, plateWidth: 18, system: 'rigid-frame', material: 'steel', taper: 0, twist: 0, setbacks: 'none', exposedStructure: false, damping: 'none' });
    const a = analyze(weak.site, weak.design);
    const marks = forceMarks('wind', weak.site, weak.design, a);
    expect(marks.bands).toEqual(expect.arrayContaining([0, Math.floor(140 / 3) - 1]));
    expect(marks.bands).toEqual(expect.arrayContaining([137, 138, 139]));
    const fine = designFor('chicago');
    expect(forceMarks('wind', fine.site, fine.design, analyze(fine.site, fine.design))).toEqual({ bands: [], cracks: [] });
    const quake = designFor('tokyo', { floors: 60 });
    const qa = analyze(quake.site, quake.design);
    const qm = forceMarks('quake', quake.site, quake.design, { ...qa, seismic: { ...qa.seismic, outcome: 'damaged' } });
    expect(qm.cracks.length).toBe(6);
    expect(qm.bands).toEqual([]);
    expect(quakeMotion(quake.site, quake.design, qa).groundM).toBeGreaterThan(0);
  });
});

describe('<GroundShake />', () => {
  it('moves the whole city block with the ground', async () => {
    const sway = { ...createSway(), active: true, groundX: 2.5 };
    const r = await ReactThreeTestRenderer.create(
      <GroundShake sway={sway}>
        <mesh />
      </GroundShake>,
    );
    await r.advanceFrames(1, 0.016);
    const group = r.scene.findAll((n) => n.props.name === 'ground')[0].instance as THREE.Group;
    expect(group.position.x).toBe(2.5);
    sway.active = false;
    await r.advanceFrames(1, 0.016);
    expect(group.position.x).toBe(0);
  });
});
```


- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/scene/forces/ForcesView.test.tsx`

Expected: FAIL — `Failed to resolve import "./ForcesView"`.

- [ ] **Step 3: Edit `src/scene/forces/sway.ts`**

Replace:

```ts
  height: number;
}

export const createSway = (): SwaySignal => ({ active: false, groundX: 0, baseX: 0, topX: 0, lean: 0, height: 1 });
```

with:

```ts
  height: number;
  /** Seconds since the force was switched on (the quake cycle and damage marks keep time by it). */
  time: number;
}

export const createSway = (): SwaySignal => ({ active: false, groundX: 0, baseX: 0, topX: 0, lean: 0, height: 1, time: 0 });
```

- [ ] **Step 4: Create `src/scene/forces/ForcesView.tsx`**

```tsx
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { groundOffset, quakeEnvelope, quakeLean, quakeMotion, quakeTop, windMotion, windTop, type WindMotion } from '../../sim/forces/motion';
import { FLOOR_HEIGHT, floorSlices, plateDims, type FloorSlice } from '../../sim/geometry';
import type { Analysis, Design, Site } from '../../sim/types';
import { unitGeometry } from '../buildingGeometry';
import { lotCenter } from '../layout';
import { swayAt, type SwaySignal } from './sway';

/** Moves its children (the city block, neighbours and foundation) with the ground while a quake shakes it. */
export function GroundShake({ sway, children }: { sway: SwaySignal; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.position.x = sway.active ? sway.groundX : 0;
  });
  return (
    <group name="ground" ref={ref}>
      {children}
    </group>
  );
}

/** Floors marked red while a force acts: `bands` glow and pulse, `cracks` flash during strong shaking. */
export interface ForceMarks {
  bands: number[];
  cracks: number[];
}

const range = (from: number, to: number) => Array.from({ length: Math.max(0, to - from) }, (_, i) => from + i);

/** Which floors to mark, from the assessment: lower third if it would fail, top floors if seasick, cracks if damaged. */
export function forceMarks(force: 'wind' | 'quake', site: Site, design: Design, analysis: Analysis): ForceMarks {
  const n = design.floors;
  const lower = range(0, Math.max(1, Math.floor(n / 3)));
  if (force === 'wind') {
    const m = windMotion(site, design, analysis);
    const bands = [...(m.strength === 'fail' ? lower : []), ...(m.comfort === 'fail' ? range(Math.max(0, n - 3), n) : [])];
    return { bands: [...new Set(bands)], cracks: [] };
  }
  const { outcome } = analysis.seismic;
  if (outcome === 'fails') return { bands: lower, cracks: [] };
  if (outcome === 'damaged') return { bands: [], cracks: range(0, 6).map((k) => Math.floor(((k + 0.5) / 6) * n)) };
  return { bands: [], cracks: [] };
}

/** The drawn sway of the top never exceeds this share of the tower's height. */
export const MAX_DRAWN_SWAY = 0.15;
const STREAKS = 40;
const unit = new THREE.Matrix4();
const q = new THREE.Quaternion();
const up = new THREE.Vector3(0, 1, 0);
const v = new THREE.Vector3();
const s = new THREE.Vector3();

/** White streaks drifting past on the wind, bending round the tower, with eddies swirling in its wake. */
function WindStreaks({ design, motion, sway }: { design: Design; motion: WindMotion; sway: SwaySignal }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const { width, depth } = plateDims(design);
  const height = design.floors * FLOOR_HEIGHT;
  const r = Math.max(width, depth) / 2 + 6;
  const eddies = Math.round(24 * Math.min(1.5, motion.eddyStrength));
  const total = STREAKS + eddies;
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = sway.time;
    for (let i = 0; i < STREAKS; i++) {
      const y = height * 1.3 * ((i + 0.5) / STREAKS);
      const z0 = (((i * 37) % STREAKS) / STREAKS - 0.5) * 4 * r;
      const x = ((t * 40 + i * 53) % 320) - 160;
      // Pushed aside near the tower (below the roof), as the air flows round it.
      const push = y < height && Math.abs(z0) < r ? (r - Math.abs(z0)) * Math.exp(-((x / r) ** 2)) : 0;
      const z = z0 + Math.sign(z0 || 1) * push;
      mesh.setMatrixAt(i, unit.compose(v.set(x, y, z), q.identity(), s.set(14, 0.8, 0.8)));
    }
    const size = 3 + 6 * motion.eddyStrength;
    for (let k = 0; k < eddies; k++) {
      const cx = r + 8 + (k % 3) * 14;
      const cz = (k % 2 === 0 ? 1 : -1) * r * 0.5;
      const cy = height * ((k + 0.5) / eddies);
      const a = t * 2 * motion.eddyStrength + k;
      q.setFromAxisAngle(up, -a);
      mesh.setMatrixAt(STREAKS + k, unit.compose(v.set(cx + size * Math.cos(a), cy, cz + size * Math.sin(a)), q, s.set(0.8, 0.8, 5)));
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh key={total} name="wind-streaks" ref={ref} args={[geometry, undefined, total]} frustumCulled={false}>
      <meshBasicMaterial color="#ffffff" transparent opacity={0.7} depthWrite={false} />
    </instancedMesh>
  );
}

/** The top three floors drawn as glass, with the tuned mass damper inside swinging against the sway. */
function DamperGhost({ design, sway }: { design: Design; sway: SwaySignal }) {
  const slices = floorSlices(design);
  const top = slices.slice(Math.max(0, slices.length - 3));
  const geometry = useMemo(() => unitGeometry(design.shape), [design.shape]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const floors = useRef<(THREE.Mesh | null)[]>([]);
  const block = useRef<THREE.Mesh>(null);
  const mean = useRef(0);
  const last = slices[slices.length - 1];
  const size = 0.25 * Math.min(last.width, last.depth);
  const blockY = top[Math.floor(top.length / 2)].y + FLOOR_HEIGHT / 2;
  useFrame((_, delta) => {
    top.forEach((sl, i) => {
      const m = floors.current[i];
      if (m) m.position.x = swayAt(sway, sl.y + FLOOR_HEIGHT / 2);
    });
    // The block swings against the back-and-forth part of the sway (the steady lean averaged out).
    mean.current += (sway.topX - mean.current) * Math.min(1, delta / 2);
    if (block.current) block.current.position.x = swayAt(sway, blockY) - 0.6 * (sway.topX - mean.current);
  });
  return (
    <group name="damper-ghost">
      {top.map((sl: FloorSlice, i) => (
        <mesh
          key={sl.index}
          ref={(m) => {
            floors.current[i] = m;
          }}
          geometry={geometry}
          position={[0, sl.y + FLOOR_HEIGHT * 0.425, 0]}
          rotation={[0, sl.rotation, 0]}
          scale={[sl.width, FLOOR_HEIGHT * 0.85, sl.depth]}
        >
          <meshStandardMaterial color={design.palette.glass} transparent opacity={0.22} depthWrite={false} />
        </mesh>
      ))}
      <mesh ref={block} position={[0, blockY, 0]}>
        <boxGeometry args={[size, size, size]} />
        <meshStandardMaterial color="#9aa3ab" metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  );
}

/** Red bands that pulse round marked floors, and red cracks that flash on them during strong shaking. */
function DamageMarks({ design, marks, sway, quake }: { design: Design; marks: ForceMarks; sway: SwaySignal; quake: boolean }) {
  const slices = floorSlices(design);
  const bands = useRef<THREE.InstancedMesh>(null);
  const cracks = useRef<THREE.InstancedMesh>(null);
  const plan = useMemo(() => unitGeometry(design.shape), [design.shape]);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  useEffect(() => () => plan.dispose(), [plan]);
  useEffect(() => () => box.dispose(), [box]);
  const bandMat = useRef<THREE.MeshBasicMaterial>(null);
  const crackMat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    const t = sway.time;
    const strong = quake ? quakeEnvelope(t) : 1;
    if (bandMat.current) bandMat.current.opacity = (0.25 + 0.2 * Math.sin(t * 6)) * (quake ? Math.min(1, strong * 2) : 1);
    if (crackMat.current) crackMat.current.opacity = strong > 0.6 && Math.sin(t * 20) > 0 ? 0.95 : 0;
    marks.bands.forEach((f, i) => {
      const sl = slices[f];
      q.setFromAxisAngle(up, sl.rotation);
      bands.current?.setMatrixAt(i, unit.compose(v.set(swayAt(sway, sl.y + 2), sl.y + 2, 0), q, s.set(sl.width * 1.04, FLOOR_HEIGHT * 0.9, sl.depth * 1.04)));
    });
    marks.cracks.forEach((f, i) => {
      const sl = slices[f];
      q.setFromAxisAngle(up, sl.rotation);
      const offset = new THREE.Vector3(0, 0, sl.depth / 2 + 0.3).applyQuaternion(q);
      cracks.current?.setMatrixAt(i, unit.compose(v.set(swayAt(sway, sl.y + 2) + offset.x, sl.y + 2, offset.z), q, s.set(sl.width * 0.6, 0.35, 0.2)));
    });
    if (bands.current) bands.current.instanceMatrix.needsUpdate = true;
    if (cracks.current) cracks.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group name="damage-marks">
      {marks.bands.length > 0 && (
        <instancedMesh key={`b${marks.bands.length}`} name="damage-bands" ref={bands} args={[plan, undefined, marks.bands.length]} frustumCulled={false}>
          <meshBasicMaterial ref={bandMat} color="#ff2d2d" transparent opacity={0.3} depthWrite={false} />
        </instancedMesh>
      )}
      {marks.cracks.length > 0 && (
        <instancedMesh key={`c${marks.cracks.length}`} name="cracks" ref={cracks} args={[box, undefined, marks.cracks.length]} frustumCulled={false}>
          <meshBasicMaterial ref={crackMat} color="#ff2d2d" transparent opacity={0} />
        </instancedMesh>
      )}
    </group>
  );
}

/**
 * Wind or an earthquake acting on the tower. Keeps the force's clock and writes the sway signal each frame
 * (the tower and the ground read it), and draws the streaks, see-through damper and damage marks.
 */
export function ForcesView({
  site,
  design,
  analysis,
  force,
  sway,
}: {
  site: Site;
  design: Design;
  analysis: Analysis;
  force: 'wind' | 'quake';
  sway: SwaySignal;
}) {
  const [lx, lz] = lotCenter(site);
  const wind = useMemo(() => windMotion(site, design, analysis), [site, design, analysis]);
  const quake = useMemo(() => quakeMotion(site, design, analysis), [site, design, analysis]);
  const marks = useMemo(() => forceMarks(force, site, design, analysis), [force, site, design, analysis]);
  // The clock restarts whenever a different force is switched on.
  useEffect(() => {
    sway.time = 0;
    return () => {
      sway.active = false;
      sway.groundX = sway.baseX = sway.topX = sway.lean = 0;
    };
  }, [force, sway]);
  useFrame((_, delta) => {
    const t = (sway.time += Math.min(delta, 0.1));
    sway.active = true;
    sway.height = design.floors * FLOOR_HEIGHT;
    // However far off the scale a failing design is, the drawing stays readable.
    const cap = MAX_DRAWN_SWAY * sway.height;
    const capped = (x: number) => Math.max(-cap, Math.min(cap, x));
    if (force === 'wind') {
      sway.groundX = 0;
      sway.baseX = 0;
      sway.topX = capped(windTop(wind, t));
      sway.lean = 0;
    } else {
      sway.groundX = groundOffset(t, quake.groundM);
      sway.baseX = sway.groundX * quake.baseShare;
      sway.topX = capped(quakeTop(quake, t));
      sway.lean = quakeLean(quake, t);
    }
  });
  return (
    <group name="forces" position={[lx, 0, lz]}>
      {force === 'wind' && <WindStreaks design={design} motion={wind} sway={sway} />}
      {force === 'wind' && design.damping === 'tmd' && <DamperGhost design={design} sway={sway} />}
      <DamageMarks design={design} marks={marks} sway={sway} quake={force === 'quake'} />
    </group>
  );
}
```

- [ ] **Step 5: Edit `src/scene/Scene.tsx`**

Replace:

```tsx
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
```

with:

```tsx
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
```

Replace:

```tsx
import { FoundationView } from './FoundationView';
import { useFrameNonce } from './frameNonce';
```

with:

```tsx
import { FoundationView } from './FoundationView';
import { ForcesView, GroundShake } from './forces/ForcesView';
import { createSway } from './forces/sway';
import { useFrameNonce } from './frameNonce';
```

Replace:

```tsx
  const [nonce, reframe] = useFrameNonce(phase);
  const light = lighting(site, night);
```

with:

```tsx
  const [nonce, reframe] = useFrameNonce(phase);
  const force = useGame((s) => s.force);
  // Forces wait while the tower is being built.
  const forceOn = force !== 'none' && !building ? force : null;
  const [sway] = useState(createSway);
  const light = lighting(site, night);
```

Replace:

```tsx
        <directionalLight position={[300, 600, 250]} intensity={light.sun} color={light.sunColor} />
        <SiteDiorama site={site} />
        <Neighbors site={site} night={night} />
        <Landmark kind={site.visuals.landmark} />
```

with:

```tsx
        <directionalLight position={[300, 600, 250]} intensity={light.sun} color={light.sunColor} />
        <GroundShake sway={sway}>
          <SiteDiorama site={site} />
          <Neighbors site={site} night={night} />
          {!building && <FoundationView site={site} design={design} />}
        </GroundShake>
        <Landmark kind={site.visuals.landmark} />
```

Replace:

```tsx
        ) : (
          <>
            <Building site={site} design={design} night={night} />
            <FoundationView site={site} design={design} />
          </>
        )}
        <OrbitControls makeDefault maxPolarAngle={Math.PI * 0.62} minDistance={40} maxDistance={2500} />
```

with:

```tsx
        ) : (
          <Building
            site={site}
            design={design}
            night={night}
            sway={sway}
            hideTopFloors={forceOn === 'wind' && design.damping === 'tmd' ? 3 : 0}
          />
        )}
        {forceOn && <ForcesView site={site} design={design} analysis={analysis} force={forceOn} sway={sway} />}
        <OrbitControls makeDefault maxPolarAngle={Math.PI * 0.62} minDistance={40} maxDistance={2500} />
```

- [ ] **Step 6: Run the tests and type-check**

Run: `npx vitest run src/scene/forces/ForcesView.test.tsx`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  50 passed (50)`, `Tests  370 passed (370)`.

- [ ] **Step 7: Commit**

```bash
git add src/scene/forces/ForcesView.test.tsx src/scene/forces/sway.ts src/scene/forces/ForcesView.tsx src/scene/Scene.tsx
git commit -m "feat: wind and earthquake in the 3D view

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```

---

### Task 6: Buttons, card and banner

The **💨 Wind** and **〰️ Earthquake** buttons sit in the 3D view's overlay, use `aria-pressed`, and are hidden while building. While a force is on, the readout card takes the soil key's place, and a red banner appears at the top of the 3D view when the tower would fail. Everything updates as the design changes.

**Files:**
- Create: `src/ui/ForceControls.test.tsx`
- Create: `src/ui/ForceControls.tsx`
- Modify: `src/scene/Scene.tsx`
- Modify: `src/ui/styles.css`

**Interfaces:**
- Consumes: Task 2: `windReadout`, `quakeReadout`, `Readout`. Task 3: `force`, `toggleForce`. Existing: `useCurrent`.
- Produces: `src/ui/ForceControls.tsx`: `<ForceButtons />`, `<ForceReadout />` (a region named `Wind` or `Earthquake`) and `<ForceBanner />` (`role="alert"`).

- [ ] **Step 1: Write the failing tests**

`src/ui/ForceControls.test.tsx` (new):

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { analyze } from '../sim/analysis';
import { getSite } from '../sim/sites';
import { selectDesign, useGame } from '../state/store';
import { ForceBanner, ForceButtons, ForceReadout } from './ForceControls';

describe('force controls', () => {
  beforeEach(() => {
    useGame.getState().newProject();
    useGame.getState().startProject('tokyo', 'sandbox');
  });

  it('switches between Wind, Earthquake and nothing, one at a time', () => {
    render(<ForceButtons />);
    const wind = screen.getByRole('button', { name: /Wind/ });
    const quake = screen.getByRole('button', { name: /Earthquake/ });
    expect(wind).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(wind);
    expect(wind).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(quake);
    expect(wind).toHaveAttribute('aria-pressed', 'false');
    expect(quake).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(quake);
    expect(useGame.getState().force).toBe('none');
  });

  it('hides the buttons while the tower is being built', () => {
    useGame.getState().build();
    render(<ForceButtons />);
    expect(screen.queryByRole('button', { name: /Wind/ })).not.toBeInTheDocument();
  });

  it("shows the wind card with this tower's numbers, and updates it when the design changes", () => {
    useGame.getState().toggleForce('wind');
    render(<ForceReadout />);
    const card = screen.getByRole('region', { name: 'Wind' });
    expect(within(card).getByText(/48 m\/s/)).toBeInTheDocument();
    expect(within(card).getByText('Sway shown 50× bigger')).toBeInTheDocument();
    expect(within(card).queryByText(/tuned mass damper/)).not.toBeInTheDocument();
    act(() => {
      useGame.getState().dispatch([{ type: 'set_parameter', id: 'damping', value: 'tmd' }]);
    });
    expect(within(card).getByText(/The tuned mass damper cuts the sway/)).toBeInTheDocument();
  });

  it('shows the earthquake card, and a banner when the tower would fail', () => {
    useGame.getState().toggleForce('quake');
    act(() => {
      // A squat, heavy, stiff concrete box with a rooftop pool: it fails Tokyo's design earthquake.
      useGame.getState().dispatch([
        { type: 'set_parameter', id: 'floors', value: 10 },
        { type: 'set_parameter', id: 'shape', value: 'square' },
        { type: 'set_parameter', id: 'setbacks', value: 'none' },
        { type: 'set_parameter', id: 'material', value: 'concrete' },
        { type: 'set_parameter', id: 'system', value: 'rigid-frame' },
        { type: 'set_parameter', id: 'facade', value: 'masonry' },
        { type: 'set_parameter', id: 'baseIsolation', value: false },
        { type: 'set_parameter', id: 'damping', value: 'none' },
        { type: 'add_amenity', id: 'pool' },
      ]);
    });
    render(
      <>
        <ForceReadout />
        <ForceBanner />
      </>,
    );
    const card = screen.getByRole('region', { name: 'Earthquake' });
    expect(within(card).getByText(/0.45 g of ground shaking/)).toBeInTheDocument();
    expect(analyze(getSite('tokyo'), selectDesign(useGame.getState())!).seismic.outcome).toBe('fails');
    expect(screen.getByRole('alert')).toHaveTextContent('Would fail in this earthquake');
  });

  it('shows nothing when no force is on, or while building', () => {
    const { container } = render(
      <>
        <ForceReadout />
        <ForceBanner />
      </>,
    );
    expect(container).toBeEmptyDOMElement();
    useGame.getState().toggleForce('wind');
    act(() => useGame.getState().build());
    expect(container).toBeEmptyDOMElement();
  });
});
```


- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/ui/ForceControls.test.tsx`

Expected: FAIL — `Failed to resolve import "./ForceControls"`.

- [ ] **Step 3: Create `src/ui/ForceControls.tsx`**

```tsx
import { useMemo } from 'react';
import { quakeReadout, windReadout, type Readout } from '../sim/forces/readout';
import type { CheckStatus } from '../sim/types';
import { useCurrent } from '../state/hooks';
import { useGame } from '../state/store';

const ICON: Record<CheckStatus, string> = { pass: '✅', marginal: '⚠️', fail: '❌' };

/** The force showing right now, or none while the tower is being built. */
function useShownForce() {
  const force = useGame((s) => s.force);
  const building = useGame((s) => s.phase === 'building');
  return building ? 'none' : force;
}

function useReadout(): Readout | null {
  const force = useShownForce();
  const { site, design, analysis } = useCurrent();
  return useMemo(() => {
    if (force === 'wind') return windReadout(site, design, analysis);
    if (force === 'quake') return quakeReadout(site, design, analysis);
    return null;
  }, [force, site, design, analysis]);
}

/** 💨 Wind and 〰️ Earthquake: show one force acting on the tower, or neither. Hidden while building. */
export function ForceButtons() {
  const force = useGame((s) => s.force);
  const building = useGame((s) => s.phase === 'building');
  const toggleForce = useGame((s) => s.toggleForce);
  if (building) return null;
  return (
    <div className="force-buttons">
      <button aria-pressed={force === 'wind'} onClick={() => toggleForce('wind')}>
        💨 Wind
      </button>
      <button aria-pressed={force === 'quake'} onClick={() => toggleForce('quake')}>
        〰️ Earthquake
      </button>
    </div>
  );
}

/** The card explaining the force on screen, with this tower's numbers. */
export function ForceReadout() {
  const r = useReadout();
  if (!r) return null;
  return (
    <section className="force-readout" aria-label={r.title}>
      <p className="label">{r.title}</p>
      <ul>
        {r.lines.map((l) => (
          <li key={l.text} className={l.status}>
            {l.text}
            {l.status && ` ${ICON[l.status]}`}
          </li>
        ))}
      </ul>
      <p className="muted">{r.note}</p>
    </section>
  );
}

/** A warning across the top of the 3D view when the tower would fail under this force. */
export function ForceBanner() {
  const r = useReadout();
  if (!r?.banner) return null;
  return (
    <div className="force-banner" role="alert">
      {r.banner}
    </div>
  );
}
```

- [ ] **Step 4: Edit `src/scene/Scene.tsx`**

Replace:

```tsx
import { DetailInset } from '../ui/DetailInset';
import { SoilLegend } from '../ui/SoilLegend';
```

with:

```tsx
import { DetailInset } from '../ui/DetailInset';
import { ForceBanner, ForceButtons, ForceReadout } from '../ui/ForceControls';
import { SoilLegend } from '../ui/SoilLegend';
```

Replace:

```tsx
      <DetailInset />
      <div className="scene-overlay">
        <SoilLegend site={site} design={design} />
        <button onClick={reframe}>Fit tower in view</button>
```

with:

```tsx
      <DetailInset />
      <ForceBanner />
      <div className="scene-overlay">
        {forceOn ? <ForceReadout /> : <SoilLegend site={site} design={design} />}
        <button onClick={reframe}>Fit tower in view</button>
```

Replace:

```tsx
        </button>
      </div>
```

with:

```tsx
        </button>
        <ForceButtons />
      </div>
```

- [ ] **Step 5: Edit `src/ui/styles.css`**

Replace:

```css
.construction-buttons .build-button { flex: 1 1 100%; }
```

with:

```css
.construction-buttons .build-button { flex: 1 1 100%; }
.force-buttons { display: flex; gap: 6px; }
.force-buttons button[aria-pressed='true'] { border-color: var(--accent); color: var(--accent); }
.force-readout { background: rgba(17, 22, 28, 0.86); border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; font-size: 0.8em; max-width: 300px; }
.force-readout ul { list-style: none; padding: 0; margin: 4px 0; display: flex; flex-direction: column; gap: 4px; }
.force-readout li.marginal { color: var(--marginal); }
.force-readout li.fail { color: var(--fail); }
.force-readout p { margin: 2px 0; }
.force-banner { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); background: var(--fail); color: #fff; font-weight: 700; padding: 8px 16px; border-radius: 8px; pointer-events: none; }
```

- [ ] **Step 6: Run the tests and type-check**

Run: `npx vitest run src/ui/ForceControls.test.tsx`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  51 passed (51)`, `Tests  375 passed (375)`.

- [ ] **Step 7: Commit**

```bash
git add src/ui/ForceControls.test.tsx src/ui/ForceControls.tsx src/scene/Scene.tsx src/ui/styles.css
git commit -m "feat: wind and earthquake buttons, card and banner

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```

---

### Task 7: README and visual check

Tell players about the forces, then watch them by eye.

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: a README paragraph about Wind and Earthquake.

- [ ] **Step 1: Edit `README.md`**

Replace:

```markdown
Pressing **Build it!** builds the tower one stage at a time: digging, the foundation, the core and frame, the facade, the crown, then the interiors. Each stage explains what is happening and how it goes for your tower; press **Next** to move on, or **Skip to finished**. The bare structure you see while it rises depends on the structural system and material you chose.
```

with:

```markdown
Pressing **Build it!** builds the tower one stage at a time: digging, the foundation, the core and frame, the facade, the crown, then the interiors. Each stage explains what is happening and how it goes for your tower; press **Next** to move on, or **Skip to finished**. The bare structure you see while it rises depends on the structural system and material you chose.

**💨 Wind** and **〰️ Earthquake** (bottom-left of the 3D view) show those forces acting on your tower, while you design or after it is built: the tower sways (drawn much bigger than real), the ground shakes, and dampers and base isolation visibly do their jobs. The card beside them explains what you are seeing with your tower's own numbers.
```

- [ ] **Step 2: Check it by eye**

Run `npm run dev` and check:

- **Wind, Chicago, 50 floors:**
  - Square box: white streaks blow across, bending round the tower, and eddies swirl behind it. The tower leans and sways, top most.
  - Round, 90° twist, 30% taper: smaller, calmer eddies and less sway.
  - Tuned mass damper: the top 3 floors turn see-through and the block inside swings against the sway. The card says the damper cuts the felt sway by about 50%.
  - Drag **Floors** with Wind on: the motion and the card follow at once.
- **Wind, Shanghai, 140 floors, 18 m wide, Rigid frame, Steel, no taper or twist:** the **Would fail in this wind** banner shows, the lower floors glow red, the tower leans hard but stays on screen, and the card puts its numbers into words.
- **Earthquake, Tokyo, 40 floors:**
  - The whole block shakes in 14-second cycles and the tower swings slowly behind the jolts.
  - With base isolation, the ground slides under a much calmer tower.
  - With 100 floors, Concrete, Rigid frame: red cracks flash during strong shaking (Damaged).
  - With 10 floors, Square, Concrete, Rigid frame, Stone facade, Rooftop pool: the banner, red lower floors, and a lean that resets each cycle.
- **Earthquake, Chicago:** the ground barely moves, and the card says strong quakes are rare there.
- **Switching:** Wind → Earthquake → off: everything returns exactly to rest.
- **Build with Earthquake on:** no buttons and no shaking during construction; it comes back after **Open the building**.
- **Night, wind, a crown with a mast** (e.g. Spire): the blinking red lights stay on top of the mast as it sways.
- **Console:** no errors.

- [ ] **Step 3: Run the tests and type-check**

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  51 passed (51)`, `Tests  375 passed (375)`.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: describe wind and earthquake in the README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```
