# Skyscraper Studio — Plan 4: Construction Animation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** pressing **Build it!** builds the tower one stage at a time: dig, foundation, core and frame, facade, crown, interiors. Each stage plays a short animation and waits for **Next**. A card explains the stage in general and for this tower, with a day counter and a money counter. While the frame rises, the bare structure shows the chosen structural system and material.

**Architecture:**
- **Pure logic** (`src/sim/construction/`):
  - `constructionStages` and `constructionState(design, analysis, stage, t)` say where everything stands at any moment.
  - `foundationPlan` counts piles, caissons and pads.
  - `stageCaption` writes the card, from wording in `src/sim/catalog/construction.ts`.
- **Skeleton:** `structureParts(design)` (`src/scene/structure/`) builds the bare structure as tagged parts:
  - core, columns, beams and slabs;
  - outriggers, wing walls, diagrid, dampers and isolators.
- **Props:** `constructionProps` (`src/scene/construction/props.ts`) builds the crane and vehicles.
- **Partial tower:** `Building` and `FoundationView` learn to show a partly built tower. The body is one instance per floor, so `mesh.count` reveals floors with no clipping.
- **Playback:** `ConstructionView` keeps progress in a ref advanced in `useFrame`. It redraws the site and the card's counters 20 times a second.
- **Store:** `build()` enters the `building` phase. New actions: `finishStage`, `nextStage`, `replayStage` and `skipBuild`.

**Tech Stack:** Vite 8, React 19, TypeScript 5.9, three 0.186, @react-three/fiber 9, Zustand 5, Vitest 5 + jsdom + Testing Library + @react-three/test-renderer 9. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-13-construction-animation-design.md`, which extends `2026-10-10-skyscraper-sim-design.md`.

**Branch:** work on `plan-4-construction`, cut from `master`. **Do not push**: pushing to `master` publishes the live site (www.jaskonas.com/skyscraper-sim), and the user decides when.

**Provenance:**
- This plan's code was written and run task by task on a throwaway branch.
- The plan was then replayed mechanically on a fresh checkout of `master`. After every task, `tsc` was clean and the suite passed with the counts given.
- Headless screenshots were reviewed, and the camera framing was tuned against them:
  - every stage of one tower;
  - all 6 systems × 3 materials in the middle of the frame stage;
  - all 4 foundations in the middle of the foundation stage.

## Rulings (where this plan differs from the spec's wording)

- **No clipping planes.** The tower body and its slab bands are already drawn one instance per floor. Setting `mesh.count` shows the lowest N floors. That is the spec's own fallback, taken first because it is cheaper and leaves the facade shader alone.
- **`dig` is a 0..1 fraction** in `ConstructionState`, not metres. The foundation view turns it into metres from its own hole depth. The cards quote real depths from `foundationPlan`.
- **Two extra structure roles:**
  - `mass-damper`, shown from 30% into the crown stage;
  - `isolator`, shown once the pads are set.
  `damper` means viscous dampers only.
- **A new part material, `girder`** (dark structural steel, `#4f5860`). The existing `steel` is the light, finished trim colour, which read as concrete next to it.
- **Long columns** span `ceil(floors / 25)` floors. At 30 runs, a 150-floor, 80 m bundled tube came to 8,050 parts, over the 8,000 budget.
- **Edge beams** are straight segments from corner to corner (12 round a circle), not a solid band. A band would look like a slab and hide the open steel cage.
- **No darker "fresh pour" on the top concrete slab.** Slabs are one material.
- **Exposed X-braces are reused unchanged** from `bracingParts`. Their corners stand up to 0.5 m proud of the floor they reach, so the skeleton bounds test skips them, and the reveal lets them through with 1 m to spare.
- **Redraws at 20 Hz** (every 0.05 s), not 10, so the crane's slew and the trucks move smoothly. The card's counters update at the same pace.
- **Camera for stages 1–2** looks from the front at about ground level, into the soil cutaway. From above, the hole and the shafts were invisible.
- **Stage day ranges are sequential.** Each stage ends at the latest schedule date so far, because in the schedule the facade overlaps the frame and the interiors overlap the crown.
- **The steel core** of a steel rigid frame or steel bundled tube has no lead: it rises with the frame.
- **The Close-up inset returns `null` while building,** after its hooks have run.

## Global Constraints

- `src/sim/` imports nothing from React, three, `src/state`, `src/ui` or `src/scene`.
- No analysis changes. Construction is view-only, and the design stays locked while building (the existing `validateAction` phase lock).
- Stage costs add up exactly to `analysis.cost.total`, and the last stage ends on `analysis.schedule.totalDays`.
- Every word on the construction cards lives in `src/sim/catalog/construction.ts`.
- **Speed:** `structureParts` takes under 30 ms and makes under 8,000 parts for the worst case (150 floors, 80 m plate, framed or bundled tube).
- A long gap between frames (a hidden tab, a slow frame) counts as at most 0.1 s.
- Use `npm`. No new dependencies. Commit after every task with the trailer lines shown. **Never push.**

## Review Focus

1. **Next or Replay pressed while the stage is still playing, or just after it ends.** The new stage must start from 0, not inherit `t = 1` and finish at once. Pinned in Task 7 ("plays the stage…").
2. **A long pause** (hidden tab, slow Chromebook) must not skip a stage. Pinned in Task 7 ("caps a long pause…").
3. **Extreme towers:**
   - 5 floors;
   - 150 floors with 0.6 taper, 120° twist, wedding-cake setbacks and a 15 m plate.
   With every system, material and shape, the skeleton must be finite and inside the tower; the facade lag is capped at the floor count; the crane stays above the frame. Pinned in Tasks 1 and 3.
4. **Leaving mid-build:** New project or Skip from any stage leaves no construction state behind. Pinned in Task 4.
5. **Heavy towers playing smoothly.** A 150-floor, 80 m tower redraws at 20 Hz; the visible skeleton is recomputed only when a height crosses a floor. Reviewers should play one in the browser during Task 8.

## File Structure

```
src/sim/construction/stages.ts      stages, costs, ConstructionState over time, core kind, outrigger floors
src/sim/construction/foundation.ts  piles / caissons / isolator counts, dig depth, soil passed through
src/sim/construction/captions.ts    stageCaption: the card for each stage
src/sim/catalog/construction.ts     all card wording
src/scene/structure/planMath.ts     points round a plan, inside tests, chords across it
src/scene/structure/structureParts.ts  the bare structure for each system and material
src/scene/construction/props.ts     crane and site vehicles
src/scene/construction/reveal.ts    which skeleton parts show, stage timings, stage camera framing
src/scene/construction/ConstructionView.tsx  ConstructionScene (one moment) and ConstructionView (playback)
src/state/buildProgress.ts          stage progress for the card's counters
src/ui/sidebar/ConstructionCard.tsx the sidebar while building
```

---

### Task 1: Stages and the building site over time

The pure heart of construction. `constructionStages` turns the schedule into six stages, each with its days and its share of the cost. `constructionState(design, analysis, stage, t)` says where everything stands `t` of the way through a stage: dig, foundation, isolators, core, frame, slabs and facade heights, crown progress, lit floors, the crane and the vehicles on site, the day and the money spent. It also holds two structural rules shared by the skeleton and the cards: which towers get a concrete core, and where outrigger trusses go.

**Files:**
- Create: `src/sim/construction/stages.test.ts`
- Create: `src/sim/construction/stages.ts`

**Interfaces:**
- Consumes: `analyze` (`src/sim/analysis`), `Analysis` (`schedule.phases`, `schedule.totalDays`, `cost`), `COEFFICIENTS.schedule.facadeLagFloors`, `FLOOR_HEIGHT`, `designFor`.
- Produces (`src/sim/construction/stages.ts`):
  - `STAGE_COUNT` (6), `CORE_LEAD_FLOORS` (3), `SLAB_LAG_FLOORS` (`{ steel: 4, composite: 2, concrete: 0 }`), `CRANE_JUMP_FLOORS` (10).
  - `VehicleId = 'excavator' | 'dump-truck' | 'pile-rig' | 'mixer' | 'flatbed'`.
  - `ConstructionStage { id: SchedulePhaseId; label; startDay; endDay; cost }`.
  - `ConstructionState { dig; foundation; isolators; coreTop; frameTop; slabTop; facadeTop; crown; litFloors; crane: { top; up }; vehicles: VehicleId[]; day; spent }`. Heights are metres; `dig`, `foundation` and `crown` run 0..1.
  - `coreKind(design): 'concrete' | 'steel'`, `outriggerFloors(floors): number[]`.
  - `constructionStages(design, analysis): ConstructionStage[]`, `constructionState(design, analysis, stage, t): ConstructionState`.

- [ ] **Step 1: Write the failing tests**

`src/sim/construction/stages.test.ts` (new):

```ts
import { describe, expect, it } from 'vitest';
import { analyze } from '../analysis';
import { FLOOR_HEIGHT } from '../geometry';
import { designFor } from '../testUtils';
import type { Design, Material, StructuralSystem } from '../types';
import {
  CRANE_JUMP_FLOORS,
  STAGE_COUNT,
  constructionStages,
  constructionState,
  coreKind,
  outriggerFloors,
  type ConstructionState,
} from './stages';

const SYSTEMS: StructuralSystem[] = ['rigid-frame', 'framed-tube', 'core-outrigger', 'bundled-tube', 'diagrid', 'buttressed-core'];
const MATERIALS: Material[] = ['steel', 'concrete', 'composite'];
const T = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1];

const setup = (patch: Partial<Design>) => {
  const { site, design } = designFor('chicago', patch);
  return { design, analysis: analyze(site, design) };
};
const HEIGHTS = ['coreTop', 'frameTop', 'slabTop', 'facadeTop', 'dig', 'foundation', 'crown', 'litFloors', 'day', 'spent'] as const;

describe('constructionStages', () => {
  it('has six stages in schedule order whose days run on to the total and whose costs add up to the total', () => {
    for (const patch of [{}, { damping: 'tmd' as const, baseIsolation: true }, { damping: 'viscous' as const, amenities: ['pool' as const] }]) {
      const { design, analysis } = setup(patch);
      const stages = constructionStages(design, analysis);
      expect(stages.map((s) => s.id)).toEqual(['excavation', 'foundation', 'structure', 'facade', 'crown', 'fitout']);
      expect(stages[0].startDay).toBe(0);
      for (let i = 1; i < STAGE_COUNT; i++) expect(stages[i].startDay).toBe(stages[i - 1].endDay);
      for (const s of stages) {
        expect(s.endDay).toBeGreaterThanOrEqual(s.startDay);
        expect(s.cost).toBeGreaterThanOrEqual(0);
      }
      expect(stages[STAGE_COUNT - 1].endDay).toBe(analysis.schedule.totalDays);
      expect(stages.reduce((sum, s) => sum + s.cost, 0)).toBeCloseTo(analysis.cost.total, 0);
    }
  });

  it('pays for the tuned mass damper with the crown and viscous dampers with the frame', () => {
    const tmd = setup({ damping: 'tmd' });
    const viscous = setup({ damping: 'viscous' });
    const crown = (x: typeof tmd) => constructionStages(x.design, x.analysis)[4].cost;
    const frame = (x: typeof tmd) => constructionStages(x.design, x.analysis)[2].cost;
    expect(crown(tmd)).toBeCloseTo(tmd.analysis.cost.amenities + tmd.analysis.cost.damping, 0);
    expect(frame(viscous)).toBeCloseTo(viscous.analysis.cost.structure + viscous.analysis.cost.elevators + viscous.analysis.cost.damping, 0);
  });
});

describe('constructionState', () => {
  const walk = (design: Design, analysis: ReturnType<typeof analyze>) => {
    const out: ConstructionState[] = [];
    for (let stage = 0; stage < STAGE_COUNT; stage++) for (const t of T) out.push(constructionState(design, analysis, stage, t));
    return out;
  };

  it('never goes backwards, and the core leads the frame, the frame the slabs and the slabs the facade', () => {
    for (const system of SYSTEMS)
      for (const material of MATERIALS)
        for (const floors of [5, 150]) {
          const { design, analysis } = setup({ system, material, floors });
          const states = walk(design, analysis);
          const label = `${system} ${material} ${floors}`;
          for (let i = 1; i < states.length; i++)
            for (const k of HEIGHTS) expect(states[i][k], `${label} ${k} @${i}`).toBeGreaterThanOrEqual(states[i - 1][k] - 1e-9);
          for (const s of states) {
            expect(s.coreTop, label).toBeGreaterThanOrEqual(s.frameTop - 1e-9);
            expect(s.frameTop, label).toBeGreaterThanOrEqual(s.slabTop - 1e-9);
            expect(s.slabTop, label).toBeGreaterThanOrEqual(s.facadeTop - 1e-9);
          }
        }
  });

  it('ends with the whole tower built, on the last day, with every dollar spent', () => {
    const { design, analysis } = setup({ floors: 60 });
    const end = constructionState(design, analysis, STAGE_COUNT - 1, 1);
    const roof = 60 * FLOOR_HEIGHT;
    expect([end.coreTop, end.frameTop, end.slabTop, end.facadeTop]).toEqual([roof, roof, roof, roof]);
    expect(end.crown).toBe(1);
    expect(end.litFloors).toBe(60);
    expect(end.day).toBe(analysis.schedule.totalDays);
    expect(end.spent).toBeCloseTo(analysis.cost.total, 0);
    expect(end.crane.up).toBe(false);
    expect(end.vehicles).toEqual([]);
  });

  it('starts the facade 8 floors behind the frame, and steel 4 floors ahead of its slabs', () => {
    const { design, analysis } = setup({ floors: 60, material: 'steel', system: 'core-outrigger' });
    const mid = constructionState(design, analysis, 2, 0.5);
    expect(mid.frameTop - mid.facadeTop).toBeCloseTo(8 * FLOOR_HEIGHT);
    expect(mid.frameTop - mid.slabTop).toBeCloseTo(4 * FLOOR_HEIGHT);
    expect(mid.coreTop - mid.frameTop).toBeCloseTo(3 * FLOOR_HEIGHT);
    const concrete = setup({ floors: 60, material: 'concrete' });
    const c = constructionState(concrete.design, concrete.analysis, 2, 0.5);
    expect(c.frameTop).toBe(c.slabTop);
  });

  it('gives a steel rigid frame or bundled tube a steel core that rises with the frame', () => {
    expect(coreKind(setup({ material: 'steel', system: 'rigid-frame' }).design)).toBe('steel');
    expect(coreKind(setup({ material: 'steel', system: 'bundled-tube' }).design)).toBe('steel');
    expect(coreKind(setup({ material: 'steel', system: 'diagrid' }).design)).toBe('concrete');
    expect(coreKind(setup({ material: 'concrete', system: 'rigid-frame' }).design)).toBe('concrete');
    const { design, analysis } = setup({ material: 'steel', system: 'rigid-frame', floors: 40 });
    const mid = constructionState(design, analysis, 2, 0.5);
    expect(mid.coreTop).toBe(mid.frameTop);
  });

  it('climbs the crane in 10-floor jumps, always above the frame, and takes it down in the crown stage', () => {
    const { design, analysis } = setup({ floors: 73 });
    expect(constructionState(design, analysis, 1, 1).crane.up).toBe(false);
    for (const t of T) {
      const s = constructionState(design, analysis, 2, t);
      expect(s.crane.up).toBe(true);
      expect(s.crane.top).toBeGreaterThanOrEqual(s.frameTop + 2 * FLOOR_HEIGHT);
      const floors = s.crane.top / FLOOR_HEIGHT;
      expect(floors % CRANE_JUMP_FLOORS === 0 || floors === 73 + 2).toBe(true);
    }
    expect(constructionState(design, analysis, 4, 0.5).crane.up).toBe(true);
    expect(constructionState(design, analysis, 4, 1).crane.up).toBe(false);
  });

  it('digs, then builds the foundation, then sets isolators only when chosen', () => {
    const { design, analysis } = setup({ baseIsolation: true });
    expect(constructionState(design, analysis, 0, 0.5).dig).toBeCloseTo(0.5);
    expect(constructionState(design, analysis, 0, 1).foundation).toBe(0);
    expect(constructionState(design, analysis, 1, 0.5).isolators).toBe(false);
    expect(constructionState(design, analysis, 1, 1).isolators).toBe(true);
    const plain = setup({ baseIsolation: false });
    expect(constructionState(plain.design, plain.analysis, 5, 1).isolators).toBe(false);
  });

  it('brings the right vehicles for the foundation and the frame', () => {
    const piles = setup({ foundation: 'piles' });
    expect(constructionState(piles.design, piles.analysis, 1, 0.5).vehicles).toContain('pile-rig');
    const mat = setup({ foundation: 'mat' });
    expect(constructionState(mat.design, mat.analysis, 1, 0.5).vehicles).not.toContain('pile-rig');
    const steel = setup({ material: 'steel' });
    expect(constructionState(steel.design, steel.analysis, 2, 0.5).vehicles).toContain('flatbed');
    const concrete = setup({ material: 'concrete' });
    expect(constructionState(concrete.design, concrete.analysis, 2, 0.5).vehicles).toEqual(['mixer']);
    expect(constructionState(steel.design, steel.analysis, 0, 0.5).vehicles).toEqual(['excavator', 'dump-truck']);
  });

  it('puts outriggers at about a third and two thirds of the height, or halfway on short towers', () => {
    expect(outriggerFloors(90)).toEqual([30, 60]);
    expect(outriggerFloors(20)).toEqual([10]);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/sim/construction/stages.test.ts`

Expected: FAIL — `Failed to resolve import "./stages"`.

- [ ] **Step 3: Create `src/sim/construction/stages.ts`**

```ts
import { COEFFICIENTS } from '../catalog/coefficients';
import { FLOOR_HEIGHT } from '../geometry';
import type { Analysis, Design, Material, SchedulePhaseId } from '../types';

export const STAGE_COUNT = 6;
/** A concrete core climbs this many floors ahead of the frame. */
export const CORE_LEAD_FLOORS = 3;
/** How far the frame runs ahead of the poured floor slabs, by material. */
export const SLAB_LAG_FLOORS: Record<Material, number> = { steel: 4, composite: 2, concrete: 0 };
/** The crane is lifted up the core in jumps of this many floors. */
export const CRANE_JUMP_FLOORS = 10;

export type VehicleId = 'excavator' | 'dump-truck' | 'pile-rig' | 'mixer' | 'flatbed';

export interface ConstructionStage {
  id: SchedulePhaseId;
  label: string;
  startDay: number;
  endDay: number;
  /** Dollars spent during this stage. */
  cost: number;
}

/** Where the building site stands at one moment. Heights are metres above ground. */
export interface ConstructionState {
  /** 0..1 of the hole dug. */
  dig: number;
  /** 0..1 of the foundation built. */
  foundation: number;
  isolators: boolean;
  coreTop: number;
  frameTop: number;
  slabTop: number;
  /** The finished tower is shown below this height. */
  facadeTop: number;
  /** 0..1: crown, ornaments, amenities and the tuned mass damper. */
  crown: number;
  /** Floors whose lights have come on. */
  litFloors: number;
  crane: { top: number; up: boolean };
  vehicles: VehicleId[];
  day: number;
  spent: number;
}

/**
 * A concrete core for the core-based systems and any concrete or composite tower; a braced steel core
 * for a steel rigid frame or steel bundled tube.
 */
export function coreKind(design: Design): 'concrete' | 'steel' {
  return design.material === 'steel' && (design.system === 'rigid-frame' || design.system === 'bundled-tube') ? 'steel' : 'concrete';
}

/** Floors carrying outrigger trusses: about ⅓ and ⅔ of the height, or one halfway up below 30 floors. */
export function outriggerFloors(floors: number): number[] {
  return floors < 30 ? [Math.round(floors / 2)] : [Math.round(floors / 3), Math.round((2 * floors) / 3)];
}

/** The six construction stages, in order, with their days and their share of the cost. */
export function constructionStages(design: Design, analysis: Analysis): ConstructionStage[] {
  const { phases } = analysis.schedule;
  const c = analysis.cost;
  const days = (id: SchedulePhaseId) => phases.find((p) => p.id === id)!.days;
  const ground = c.foundation + c.isolation;
  const digShare = days('excavation') / Math.max(1, days('excavation') + days('foundation'));
  const costs: Record<SchedulePhaseId, number> = {
    excavation: ground * digShare,
    foundation: ground * (1 - digShare),
    structure: c.structure + c.elevators + (design.damping === 'viscous' ? c.damping : 0),
    facade: c.facade,
    crown: c.amenities + (design.damping === 'tmd' ? c.damping : 0),
    fitout: 0,
  };
  // Interiors and systems; computed as the remainder so the stages always add up to the total exactly.
  costs.fitout = c.total - (costs.excavation + costs.foundation + costs.structure + costs.facade + costs.crown);
  let day = 0;
  return phases.map((p) => {
    const startDay = day;
    day = Math.max(day, p.startDay + p.days);
    return { id: p.id, label: p.label, startDay, endDay: day, cost: costs[p.id] };
  });
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Where everything stands `t` (0..1) of the way through `stage` (0..5). */
export function constructionState(design: Design, analysis: Analysis, stage: number, t: number): ConstructionState {
  const n = design.floors;
  const at = (s: number) => (stage > s ? 1 : stage < s ? 0 : clamp01(t));
  const lead = coreKind(design) === 'concrete' ? CORE_LEAD_FLOORS : 0;
  const slabLag = SLAB_LAG_FLOORS[design.material];
  const facadeLag = COEFFICIENTS.schedule.facadeLagFloors;

  // Stage 3 (index 2): the core climbs, the frame follows `lead` floors behind, slabs and facade further behind.
  const rise = at(2) * (n + lead);
  const core = Math.min(n, rise);
  const frame = Math.min(n, Math.max(0, rise - lead));
  // Stage 4 (index 3): slabs catch up in the first half, the facade over the whole stage.
  const close = at(3);
  const slab = close > 0 ? n - slabLag * (1 - Math.min(1, 2 * close)) : Math.max(0, frame - slabLag);
  const facade = close > 0 ? n - Math.min(facadeLag, n) * (1 - close) : Math.max(0, frame - facadeLag);

  // Stage 2 (index 1): the foundation, then isolator pads near the end when chosen.
  const found = at(1);
  const foundation = design.baseIsolation ? Math.min(1, found / 0.8) : found;
  const isolators = design.baseIsolation && found >= 0.85;

  // The crane goes up with the frame in 10-floor jumps, and comes down late in the crown stage.
  const crownT = at(4);
  const craneFloors = Math.min(Math.ceil((frame + 2) / CRANE_JUMP_FLOORS) * CRANE_JUMP_FLOORS, n + 2);
  const craneUp = stage >= 2 && (stage < 4 || (stage === 4 && crownT < 0.9));
  const lowering = stage === 4 ? clamp01((crownT - 0.6) / 0.3) : 0;
  const crane = { top: craneUp ? craneFloors * FLOOR_HEIGHT * (1 - lowering) : 0, up: craneUp };

  const stages = constructionStages(design, analysis);
  const current = stages[Math.min(stage, STAGE_COUNT - 1)];
  const tt = clamp01(t);
  const day = Math.round(current.startDay + (current.endDay - current.startDay) * tt);
  const spent = stages.slice(0, stage).reduce((s, x) => s + x.cost, 0) + current.cost * tt;

  return {
    dig: at(0),
    foundation,
    isolators,
    coreTop: core * FLOOR_HEIGHT,
    frameTop: frame * FLOOR_HEIGHT,
    slabTop: Math.min(frame, slab) * FLOOR_HEIGHT,
    facadeTop: Math.min(frame, slab, facade) * FLOOR_HEIGHT,
    crown: crownT,
    litFloors: Math.round(at(5) * n),
    crane,
    vehicles: vehiclesFor(design, stage, tt),
    day,
    spent,
  };
}

function vehiclesFor(design: Design, stage: number, t: number): VehicleId[] {
  switch (stage) {
    case 0:
      return ['excavator', 'dump-truck'];
    case 1:
      return design.foundation === 'piles' || design.foundation === 'caissons' ? ['pile-rig', 'mixer'] : ['mixer'];
    case 2:
      return design.material === 'concrete' ? ['mixer'] : ['flatbed', 'mixer'];
    case 3:
      return ['flatbed'];
    case 4:
      return [];
    default:
      return t < 0.5 ? ['flatbed'] : [];
  }
}
```

- [ ] **Step 4: Run the tests and type-check**

Run: `npx vitest run src/sim/construction/stages.test.ts`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  37 passed (37)`, `Tests  273 passed (273)`.

- [ ] **Step 5: Commit**

```bash
git add src/sim/construction/stages.test.ts src/sim/construction/stages.ts
git commit -m "feat: construction stages and the building site over time

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```

---

### Task 2: Stage cards with your tower's numbers

Each stage's card: a title, the general idea (the same for every tower) and a sentence or two about this tower, quoting its days, floors, depths and soil. `foundationPlan` counts piles, caissons and isolator pads on the same grid the 3D foundation uses and lists the soil layers they pass through. All wording lives in a new catalog file, so a new system, material or foundation needs only a catalog entry, and the compiler insists on one.

**Files:**
- Create: `src/sim/construction/captions.test.ts`
- Create: `src/sim/construction/foundation.ts`
- Create: `src/sim/catalog/construction.ts`
- Create: `src/sim/construction/captions.ts`

**Interfaces:**
- Consumes: Task 1: `constructionStages`, `outriggerFloors`, `STAGE_COUNT`. Existing: `plateDims`, `PARAMS_BY_ID`, `CROWNS`, `AMENITIES`, `formatMoney`, `COEFFICIENTS`.
- Produces:
  - `src/sim/construction/foundation.ts`: `FOUNDATION_SPACING` (`{ piles: 6, caissons: 12, isolators: 8 }`), `gridCount(width, depth, spacing)`, `FoundationPlan { depth; digDepth; shafts; isolators; layers: string[]; reachesBedrock }`, `foundationPlan(site, design)`.
  - `src/sim/catalog/construction.ts`: `BuildFacts`, `listWords`, `STAGE_TEXT`, `SYSTEM_BUILD`, `MATERIAL_BUILD`, `FOUNDATION_BUILD`, `ISOLATION_BUILD`, `DAMPING_BUILD`, `EXPOSED_BUILD`.
  - `src/sim/construction/captions.ts`: `StageCaption { title; idea; yours }`, `stageCaption(design, site, analysis, stage)`.

- [ ] **Step 1: Write the failing tests**

`src/sim/construction/captions.test.ts` (new):

```ts
import { describe, expect, it } from 'vitest';
import { analyze } from '../analysis';
import { formatMoney } from '../format';
import { designFor } from '../testUtils';
import type { Damping, Design, FoundationType, Material, SiteId, StructuralSystem } from '../types';
import { stageCaption } from './captions';
import { foundationPlan } from './foundation';
import { STAGE_COUNT } from './stages';

const SITES: SiteId[] = ['new-york', 'tokyo', 'chicago', 'shanghai'];
const SYSTEMS: StructuralSystem[] = ['rigid-frame', 'framed-tube', 'core-outrigger', 'bundled-tube', 'diagrid', 'buttressed-core'];
const MATERIALS: Material[] = ['steel', 'concrete', 'composite'];
const FOUNDATIONS: FoundationType[] = ['mat', 'raft', 'piles', 'caissons'];
const DAMPING: Damping[] = ['none', 'tmd', 'viscous'];

const cards = (siteId: SiteId, patch: Partial<Design>) => {
  const { site, design } = designFor(siteId, patch);
  const analysis = analyze(site, design);
  return { site, design, analysis, cards: Array.from({ length: STAGE_COUNT }, (_, i) => stageCaption(design, site, analysis, i)) };
};

describe('foundationPlan', () => {
  it('counts piles, caissons and isolator pads on a grid under the footprint, and names the soil they pass through', () => {
    const { site, design } = designFor('chicago', { foundation: 'caissons', baseIsolation: true, shape: 'square', plateWidth: 36 });
    const plan = foundationPlan(site, design);
    expect(plan.shafts).toBe(9);
    expect(plan.isolators).toBe(16);
    expect(plan.depth).toBe(36);
    expect(plan.layers).toEqual(['Fill', 'Soft blue clay', 'Hardpan']);
    expect(plan.reachesBedrock).toBe(true);
    expect(foundationPlan(site, { ...design, foundation: 'mat', baseIsolation: false })).toMatchObject({ shafts: 0, isolators: 0, digDepth: 3 });
    expect(foundationPlan(site, { ...design, foundation: 'raft' }).digDepth).toBe(site.foundation.raft.depth);
  });
});

describe('stageCaption', () => {
  it('has a title, the general idea and a sentence about your tower for every stage and every choice, on every site', () => {
    for (const siteId of SITES)
      for (const system of SYSTEMS)
        for (const material of MATERIALS)
          for (const foundation of FOUNDATIONS)
            for (const damping of DAMPING) {
              const label = `${siteId} ${system} ${material} ${foundation} ${damping}`;
              for (const c of cards(siteId, { system, material, foundation, damping, baseIsolation: true, exposedStructure: true }).cards) {
                expect(c.title.length, label).toBeGreaterThan(0);
                expect(c.idea.length, label).toBeGreaterThan(40);
                expect(c.yours.length, label).toBeGreaterThan(20);
                expect(`${c.title} ${c.idea} ${c.yours}`, label).not.toMatch(/undefined|NaN|\[object/);
              }
            }
  });

  it('the frame card gives your floors, days per floor and frame days, and names your system', () => {
    const { design, analysis, cards: c } = cards('chicago', { floors: 45, material: 'steel', system: 'core-outrigger' });
    const frame = analysis.schedule.phases.find((p) => p.id === 'structure')!;
    expect(c[2].yours).toContain(`${design.floors} floors in ${frame.days} days`);
    expect(c[2].yours).toContain('about 3 days a floor');
    expect(c[2].yours).toMatch(/outrigger trusses at floors 15 and 30/);
  });

  it('every system and material says something different', () => {
    const frameText = (patch: Partial<Design>) => cards('chicago', patch).cards[2].yours;
    expect(new Set(SYSTEMS.map((system) => frameText({ system, material: 'concrete' }))).size).toBe(SYSTEMS.length);
    expect(new Set(MATERIALS.map((material) => frameText({ material, system: 'framed-tube' }))).size).toBe(MATERIALS.length);
  });

  it('the foundation card gives the depth and the soil, and mentions isolators and dampers only when chosen', () => {
    const { site, cards: c } = cards('chicago', { foundation: 'caissons', baseIsolation: true });
    expect(c[1].yours).toMatch(/caissons are drilled 36 m down through fill, soft blue clay and hardpan to bedrock/);
    expect(c[1].yours).toMatch(/rubber pads/);
    expect(site.bedrockDepth).toBe(35);
    expect(cards('chicago', { baseIsolation: false }).cards[1].yours).not.toMatch(/rubber pads/);
    expect(cards('chicago', { damping: 'tmd' }).cards[4].yours).toMatch(/tuned mass damper/);
    expect(cards('chicago', { damping: 'none' }).cards[4].yours).not.toMatch(/damper/);
    expect(cards('chicago', { damping: 'viscous' }).cards[2].yours).toMatch(/Viscous dampers/);
  });

  it('the last card gives the opening day and the total cost', () => {
    const { analysis, cards: c } = cards('tokyo', {});
    expect(c[5].yours).toContain(`day ${analysis.schedule.totalDays}`);
    expect(c[5].yours).toContain(formatMoney(analysis.cost.total));
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/sim/construction/captions.test.ts`

Expected: FAIL — `Failed to resolve import "./captions"`.

- [ ] **Step 3: Create `src/sim/construction/foundation.ts`**

```ts
import { plateDims } from '../geometry';
import type { Design, Site } from '../types';

/** Grid spacing under the footprint, metres. The scene's foundation view uses the same spacings. */
export const FOUNDATION_SPACING = { piles: 6, caissons: 12, isolators: 8 } as const;

/** How many grid cells of `spacing` fit under a width × depth footprint (at least one). */
export function gridCount(width: number, depth: number, spacing: number): number {
  return Math.max(1, Math.floor(width / spacing)) * Math.max(1, Math.floor(depth / spacing));
}

export interface FoundationPlan {
  /** Metres below ground the foundation reaches. */
  depth: number;
  /** Metres dug out before the foundation goes in: the raft's basement, or a shallow pit for the rest. */
  digDepth: number;
  /** Piles or caissons (0 for a mat or raft). */
  shafts: number;
  /** Base-isolation pads (0 when not chosen). */
  isolators: number;
  /** Soil layers the foundation passes into, top first. */
  layers: string[];
  reachesBedrock: boolean;
}

export function foundationPlan(site: Site, design: Design): FoundationPlan {
  const { width, depth } = plateDims(design);
  const soil = site.foundation[design.foundation];
  const layers: string[] = [];
  let top = 0;
  for (const layer of site.soil) {
    if (top < soil.depth) layers.push(layer.name);
    top += layer.thickness;
  }
  const shafts =
    design.foundation === 'piles'
      ? gridCount(width, depth, FOUNDATION_SPACING.piles)
      : design.foundation === 'caissons'
        ? gridCount(width, depth, FOUNDATION_SPACING.caissons)
        : 0;
  return {
    depth: soil.depth,
    digDepth: design.foundation === 'raft' ? soil.depth : 3,
    shafts,
    isolators: design.baseIsolation ? gridCount(width, depth, FOUNDATION_SPACING.isolators) : 0,
    layers,
    reachesBedrock: soil.depth >= site.bedrockDepth,
  };
}
```

- [ ] **Step 4: Create `src/sim/catalog/construction.ts`**

```ts
import type { FoundationType, Material, SchedulePhaseId, StructuralSystem } from '../types';

/** Facts about one tower that the construction cards quote. */
export interface BuildFacts {
  floors: number;
  /** Days per floor of frame, one decimal. */
  daysPerFloor: number;
  structureDays: number;
  foundationDepth: number;
  shafts: number;
  /** Soil layers passed through, as words: "fill, soft blue clay and hardpan". */
  layers: string;
  reachesBedrock: boolean;
  isolators: number;
  outriggers: number[];
}

/** Words for a list: "a", "a and b", "a, b and c". */
export function listWords(items: (string | number)[]): string {
  const s = items.map(String);
  return s.length <= 1 ? (s[0] ?? '') : `${s.slice(0, -1).join(', ')} and ${s[s.length - 1]}`;
}

/** The general idea of each stage — the same for every tower. */
export const STAGE_TEXT: Record<SchedulePhaseId, { title: string; idea: string }> = {
  excavation: {
    title: 'Digging the hole',
    idea: 'Before anything goes up, diggers clear the lot and dig out the ground where the foundation and basements will go. Trucks carry the soil away load by load.',
  },
  foundation: {
    title: 'Laying the foundation',
    idea: "The foundation spreads the tower's enormous weight into the ground. Soft soil needs a foundation that reaches deeper, down to firmer layers or solid rock.",
  },
  structure: {
    title: 'Core and frame',
    idea: "The core goes up first. It's the tower's spine and holds the elevators and stairs. The frame follows, and the outside wall starts a few floors below the top.",
  },
  facade: {
    title: 'Closing in the facade',
    idea: 'Facade panels are hung on the frame from the bottom up, sealing the tower against wind and rain so work inside can begin.',
  },
  crown: {
    title: 'Crown and amenities',
    idea: 'The top of the tower goes on last: the crown, rooftop features and decoration. Then the crane that built everything is taken apart and lowered down.',
  },
  fitout: {
    title: 'Interiors and opening',
    idea: 'Inside, workers finish the floors, walls, elevators, wiring, pipes and air systems. When every system is tested, the lights come on and the tower opens.',
  },
};

/** How each structural system goes up. */
export const SYSTEM_BUILD: Record<StructuralSystem, (f: BuildFacts) => string> = {
  'rigid-frame': () => 'Your rigid frame is a grid of columns and beams across every floor, locked together at each joint.',
  'framed-tube': () => 'Your framed tube packs columns about 3 m apart around the outside, so the walls work together like one hollow tube.',
  'core-outrigger': (f) =>
    `The outrigger trusses at floor${f.outriggers.length > 1 ? 's' : ''} ${listWords(f.outriggers)} tie the core to the outside columns so the tower sways less.`,
  'bundled-tube': () => 'Your bundled tube is several tubes side by side, with rows of columns inside the floor as well as around it, like Willis Tower.',
  diagrid: () => 'Your diagrid wraps the outside in a lattice of diagonals with no upright edge columns; each diamond spans 6 floors.',
  'buttressed-core': () => 'Your buttressed core has three concrete wings reaching out from the middle, like Burj Khalifa, bracing it in every direction.',
};

/** How each material goes up, with the tower's own pace. */
export const MATERIAL_BUILD: Record<Material, (f: BuildFacts) => string> = {
  steel: (f) =>
    `Your steel frame goes up about ${f.daysPerFloor} days a floor: ${f.floors} floors in ${f.structureDays} days. The steel runs a few floors ahead of the concrete floors poured onto it.`,
  concrete: (f) =>
    `Your concrete is poured into moulds floor by floor, about ${f.daysPerFloor} days a floor: ${f.floors} floors in ${f.structureDays} days.`,
  composite: (f) =>
    `Your composite frame puts up steel first, then pours concrete around it, about ${f.daysPerFloor} days a floor: ${f.floors} floors in ${f.structureDays} days.`,
};

/** How each foundation is built, in the tower's own soil. */
export const FOUNDATION_BUILD: Record<FoundationType, (f: BuildFacts) => string> = {
  mat: (f) => `Your shallow mat is one thick concrete slab poured in the bottom of the hole, ${f.foundationDepth} m down.`,
  raft: (f) => `Your raft is a deep, thick slab with basements, ${f.foundationDepth} m down, spreading the weight over the whole lot.`,
  piles: (f) =>
    `${f.shafts} piles are driven ${f.foundationDepth} m down through ${f.layers}${f.reachesBedrock ? ' to bedrock' : ''}; friction holds them in the soil.`,
  caissons: (f) =>
    `${f.shafts} caissons are drilled ${f.foundationDepth} m down through ${f.layers}${f.reachesBedrock ? ' to bedrock' : ''} and filled with concrete.`,
};

export const ISOLATION_BUILD = (f: BuildFacts) =>
  `Then ${f.isolators} rubber pads go on top: base isolation lets the ground shake under the tower instead of through it.`;

export const DAMPING_BUILD = {
  tmd: 'A tuned mass damper, a huge weight hung on cables near the top, is installed to sway against the wind.',
  viscous: 'Viscous dampers, giant shock absorbers, are built into the frame every 5 floors.',
} as const;

export const EXPOSED_BUILD = 'The giant X-braces on the outside go up with the frame.';
```

- [ ] **Step 5: Create `src/sim/construction/captions.ts`**

```ts
import { AMENITIES } from '../catalog/amenities';
import {
  DAMPING_BUILD,
  EXPOSED_BUILD,
  FOUNDATION_BUILD,
  ISOLATION_BUILD,
  MATERIAL_BUILD,
  STAGE_TEXT,
  SYSTEM_BUILD,
  listWords,
  type BuildFacts,
} from '../catalog/construction';
import { CROWNS } from '../catalog/crowns';
import { PARAMS_BY_ID, type ParamId } from '../catalog/parameters';
import { COEFFICIENTS } from '../catalog/coefficients';
import { formatMoney } from '../format';
import type { Analysis, Design, Site } from '../types';
import { foundationPlan } from './foundation';
import { constructionStages, outriggerFloors } from './stages';

export interface StageCaption {
  title: string;
  /** What this stage is and why — the same for every tower. */
  idea: string;
  /** How this stage goes for this tower, with its numbers. */
  yours: string;
}

function optionLabel(id: ParamId, value: string): string {
  const def = PARAMS_BY_ID[id];
  return (def.kind === 'enum' && def.options.find((o) => o.value === value)?.label) || value;
}

function facts(design: Design, site: Site, analysis: Analysis): BuildFacts {
  const plan = foundationPlan(site, design);
  const structureDays = analysis.schedule.phases.find((p) => p.id === 'structure')!.days;
  return {
    floors: design.floors,
    daysPerFloor: Math.round((structureDays / design.floors) * 10) / 10,
    structureDays,
    foundationDepth: plan.depth,
    shafts: plan.shafts,
    layers: listWords(plan.layers.map((l) => l.toLowerCase())),
    reachesBedrock: plan.reachesBedrock,
    isolators: plan.isolators,
    outriggers: outriggerFloors(design.floors),
  };
}

/** The card for construction stage `stage` (0..5): the general idea, then how it goes for this tower. */
export function stageCaption(design: Design, site: Site, analysis: Analysis, stage: number): StageCaption {
  const stages = constructionStages(design, analysis);
  const s = stages[stage];
  const f = facts(design, site, analysis);
  const days = s.endDay - s.startDay;
  const { title, idea } = STAGE_TEXT[s.id];
  const sentences: string[] = [];
  switch (s.id) {
    case 'excavation':
      sentences.push(
        `Diggers spend ${days} days on your lot, digging ${foundationPlan(site, design).digDepth} m down for your ${optionLabel('foundation', design.foundation).toLowerCase()}.`,
      );
      break;
    case 'foundation':
      sentences.push(FOUNDATION_BUILD[design.foundation](f));
      if (design.baseIsolation) sentences.push(ISOLATION_BUILD(f));
      sentences.push(`The foundation takes ${days} days.`);
      break;
    case 'structure':
      sentences.push(MATERIAL_BUILD[design.material](f), SYSTEM_BUILD[design.system](f));
      if (design.damping === 'viscous') sentences.push(DAMPING_BUILD.viscous);
      if (design.exposedStructure) sentences.push(EXPOSED_BUILD);
      break;
    case 'facade':
      sentences.push(
        `Your ${optionLabel('facade', design.facade).toLowerCase()} starts ${Math.min(COEFFICIENTS.schedule.facadeLagFloors, design.floors)} floors below the frame and closes in the top ${days} days after the frame is finished.`,
      );
      break;
    case 'crown': {
      const amenities = design.amenities.map((a) => AMENITIES[a].label.toLowerCase());
      sentences.push(
        `Your ${CROWNS[design.crown].label.toLowerCase()} goes on top${amenities.length ? `, with the ${listWords(amenities)}` : ''}.`,
      );
      if (design.damping === 'tmd') sentences.push(DAMPING_BUILD.tmd);
      sentences.push('Then the crane comes down.');
      break;
    }
    case 'fitout':
      sentences.push(
        `Interiors and systems take ${days} days. Your tower opens on day ${analysis.schedule.totalDays}, about ${Math.round(analysis.schedule.totalDays / 30)} months after digging began, for ${formatMoney(analysis.cost.total)}.`,
      );
      break;
  }
  return { title, idea, yours: sentences.join(' ') };
}
```

- [ ] **Step 6: Run the tests and type-check**

Run: `npx vitest run src/sim/construction/captions.test.ts`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  38 passed (38)`, `Tests  279 passed (279)`.

- [ ] **Step 7: Commit**

```bash
git add src/sim/construction/captions.test.ts src/sim/construction/foundation.ts src/sim/catalog/construction.ts src/sim/construction/captions.ts
git commit -m "feat: construction stage cards with each tower's numbers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```

---

### Task 3: The bare structure for each system and material

`structureParts(design)` builds the whole bare structure in building coordinates, each piece tagged with its role and the height of its top so the animation can reveal it. The material sets sizes and colours (slim dark steel, chunky pale concrete, or steel beams with concrete columns). The system sets the arrangement: a 9 m column grid, a tight 3 m tube, outrigger and belt trusses, a bundled tube's interior tube walls, a diagrid's diamonds, or a buttressed core's three wing walls. Dampers, isolators and exposed bracing appear only when chosen. Columns run several floors at a time to keep tall towers under 8,000 parts. A new `girder` material gives bare steel its own dark colour.

**Files:**
- Create: `src/scene/structure/structureParts.test.ts`
- Modify: `src/sim/parts.ts`
- Modify: `src/scene/parts/materials.ts`
- Create: `src/scene/structure/planMath.ts`
- Create: `src/scene/structure/structureParts.ts`

**Interfaces:**
- Consumes: Task 1: `coreKind`, `outriggerFloors`. Task 2: `FOUNDATION_SPACING`. Existing: `floorSlices`, `plateDims`, `shapePerimeter`, `FloorSlice`, `rotateYXZ`, `strutPart`, `partBounds`, `floorRuns`, `planFaces`, `planCorners`, `shaftGrid` (`src/scene/FoundationView.tsx`), `bracingParts` (`src/scene/ornaments.ts`).
- Produces:
  - `PART_MATERIALS` gains `'girder'`.
  - `src/scene/structure/planMath.ts`: `perimeterAt(shape, w, d, u, inset?)`, `insidePlan(shape, w, d, x, z, margin?)`, `chord(shape, w, d, axis, c, margin?)`, `ringPoints(shape, w, d, inset)`.
  - `src/scene/structure/structureParts.ts`: `StructureRole = 'core' | 'column' | 'beam' | 'slab' | 'brace' | 'outrigger' | 'wall' | 'damper' | 'mass-damper' | 'isolator'`, `StructurePart { part; role; top }`, `structureParts(design): StructurePart[]`.

- [ ] **Step 1: Write the failing tests**

`src/scene/structure/structureParts.test.ts` (new):

```ts
import { describe, expect, it } from 'vitest';
import { outriggerFloors } from '../../sim/construction/stages';
import { FLOOR_HEIGHT, plateDims } from '../../sim/geometry';
import { partBounds, partIsFinite } from '../../sim/parts';
import { designFor } from '../../sim/testUtils';
import type { Design, Material, PlanShape, StructuralSystem } from '../../sim/types';
import { structureParts, type StructurePart } from './structureParts';

const SYSTEMS: StructuralSystem[] = ['rigid-frame', 'framed-tube', 'core-outrigger', 'bundled-tube', 'diagrid', 'buttressed-core'];
const MATERIALS: Material[] = ['steel', 'concrete', 'composite'];
const SHAPES: PlanShape[] = ['square', 'rectangle', 'circle', 'triangle'];
const EXTREMES: Partial<Design>[] = [
  { floors: 5, twist: 0, taper: 0, setbacks: 'none' },
  { floors: 150, twist: 120, taper: 0.6, setbacks: 'wedding-cake', plateWidth: 15 },
];

const build = (patch: Partial<Design>) => {
  const { design } = designFor('shanghai', { shape: 'square', plateWidth: 40, floors: 40, setbacks: 'none', taper: 0, twist: 0, ...patch });
  return { design, parts: structureParts(design) };
};
const ofRole = (parts: StructurePart[], role: StructurePart['role']) => parts.filter((p) => p.role === role);
/** Columns standing at the outside edge of the ground floor. */
const edgeColumns = (design: Design, parts: StructurePart[]) => {
  const { width } = plateDims(design);
  return ofRole(parts, 'column').filter((p) => p.part.rotation?.[0] === 0 && p.part.position[1] < 3 * FLOOR_HEIGHT && Math.max(Math.abs(p.part.position[0]), Math.abs(p.part.position[2])) > width / 2 - 2);
};
const interiorColumns = (design: Design, parts: StructurePart[]) => {
  const { width } = plateDims(design);
  return ofRole(parts, 'column').filter((p) => p.part.rotation?.[0] === 0 && p.part.position[1] < 3 * FLOOR_HEIGHT && Math.max(Math.abs(p.part.position[0]), Math.abs(p.part.position[2])) < width / 2 - 4);
};

describe('structureParts', () => {
  it.each(SYSTEMS)('%s: every material, shape and extreme is finite and stays inside the tower', (system) => {
    for (const material of MATERIALS)
      for (const shape of SHAPES)
        for (const extreme of EXTREMES) {
          const { design, parts } = build({ system, material, shape, ...extreme, damping: 'viscous', baseIsolation: true, exposedStructure: true });
          const label = `${system} ${material} ${shape} ${extreme.floors}`;
          const { width, depth } = plateDims(design);
          const reach = Math.hypot(width, depth) / 2 + 2;
          expect(parts.length, label).toBeGreaterThan(0);
          for (const { part, top, role } of parts) {
            expect(partIsFinite(part), label).toBe(true);
            expect(top, label).toBeCloseTo(partBounds(part).max[1], 6);
            // Exposed X-braces are the main tower's own parts (bracingParts), tested with the ornaments.
            if (role === 'brace') continue;
            const b = partBounds(part);
            expect(Math.hypot(b.max[0], b.max[2]), label).toBeLessThan(reach);
            expect(Math.hypot(b.min[0], b.min[2]), label).toBeLessThan(reach);
            expect(b.max[1], label).toBeLessThanOrEqual(design.floors * FLOOR_HEIGHT + 1e-6);
            expect(b.min[1], label).toBeGreaterThanOrEqual(-1 - 1e-6);
          }
        }
  });

  it('gives a rigid frame columns across the whole floor', () => {
    const { design, parts } = build({ system: 'rigid-frame' });
    expect(interiorColumns(design, parts).length).toBeGreaterThan(4);
  });

  it('packs a framed tube with columns about 3 m apart round the edge and none inside', () => {
    const { design, parts } = build({ system: 'framed-tube' });
    const edge = edgeColumns(design, parts);
    expect(edge.length).toBeGreaterThanOrEqual(Math.floor((4 * 40) / 3.5));
    expect(interiorColumns(design, parts)).toHaveLength(0);
  });

  it('gives a bundled tube rows of columns inside the floor as well', () => {
    const { design, parts } = build({ system: 'bundled-tube' });
    expect(interiorColumns(design, parts).length).toBeGreaterThan(10);
  });

  it('wraps a diagrid in diagonals with no upright edge columns', () => {
    const { design, parts } = build({ system: 'diagrid' });
    expect(edgeColumns(design, parts)).toHaveLength(0);
    expect(ofRole(parts, 'column').filter((p) => Math.abs(p.part.rotation?.[0] ?? 0) > 0.3).length).toBeGreaterThan(8);
  });

  it('puts outrigger trusses at about a third and two thirds of the height', () => {
    const { design, parts } = build({ system: 'core-outrigger', floors: 60 });
    const levels = new Set(ofRole(parts, 'outrigger').map((p) => Math.round(p.top / FLOOR_HEIGHT)));
    for (const f of outriggerFloors(design.floors)) expect([...levels].some((l) => Math.abs(l - f) <= 1)).toBe(true);
    expect(ofRole(build({ system: 'framed-tube' }).parts, 'outrigger')).toHaveLength(0);
  });

  it('braces a buttressed core with three wing walls on every run', () => {
    const { parts } = build({ system: 'buttressed-core', floors: 40 });
    const ground = ofRole(parts, 'wall').filter((p) => partBounds(p.part).min[1] < 1);
    expect(ground).toHaveLength(3);
  });

  it('makes steel slimmer than concrete, and gives a steel rigid frame a braced steel core', () => {
    const size = (material: Material) => Math.min(...ofRole(build({ system: 'rigid-frame', material }).parts, 'column').map((p) => p.part.scale[0]));
    expect(size('steel')).toBeLessThan(size('concrete'));
    const steelCore = ofRole(build({ system: 'rigid-frame', material: 'steel' }).parts, 'core');
    expect(steelCore.some((p) => p.part.material === 'girder' && Math.abs(p.part.rotation?.[0] ?? 0) > 0.3)).toBe(true);
    const concreteCore = ofRole(build({ system: 'core-outrigger', material: 'steel' }).parts, 'core');
    expect(concreteCore.every((p) => p.part.material === 'concrete')).toBe(true);
  });

  it('adds dampers, isolators and exposed bracing only when chosen', () => {
    const plain = build({ damping: 'none', baseIsolation: false, exposedStructure: false }).parts;
    for (const role of ['damper', 'mass-damper', 'isolator', 'brace'] as const) expect(ofRole(plain, role), role).toHaveLength(0);
    expect(ofRole(build({ damping: 'viscous' }).parts, 'damper').length).toBeGreaterThan(0);
    expect(ofRole(build({ damping: 'tmd' }).parts, 'mass-damper').length).toBeGreaterThan(0);
    expect(ofRole(build({ baseIsolation: true }).parts, 'isolator')).toHaveLength(25);
    expect(ofRole(build({ exposedStructure: true }).parts, 'brace').length).toBeGreaterThan(0);
  });

  it('builds the worst case quickly and with a bounded number of parts', () => {
    for (const system of ['framed-tube', 'bundled-tube'] as const) {
      const { design } = designFor('shanghai', { floors: 150, plateWidth: 80, shape: system === 'framed-tube' ? 'circle' : 'square', system, material: 'concrete', setbacks: 'none', twist: 0, taper: 0, damping: 'viscous', baseIsolation: true, exposedStructure: true });
      structureParts(design);
      const t0 = performance.now();
      let parts: StructurePart[] = [];
      for (let i = 0; i < 5; i++) parts = structureParts({ ...design, floors: 150 - i });
      expect((performance.now() - t0) / 5, system).toBeLessThan(30);
      expect(parts.length, system).toBeLessThan(8000);
    }
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/scene/structure/structureParts.test.ts`

Expected: FAIL — `Failed to resolve import "./structureParts"`.

- [ ] **Step 3: Edit `src/sim/parts.ts`**

Replace:

```ts
export const PART_MATERIALS = [
  'body', 'accent', 'glass', 'stone', 'concrete', 'copper', 'gold', 'steel', 'foliage', 'ruby', 'light', 'interior',
] as const;
```

with:

```ts
export const PART_MATERIALS = [
  'body', 'accent', 'glass', 'stone', 'concrete', 'copper', 'gold', 'steel', 'foliage', 'ruby', 'light', 'interior', 'girder',
] as const;
```

- [ ] **Step 4: Edit `src/scene/parts/materials.ts`**

Replace:

```ts
      return { color: '#fff3c4', roughness: 0.5, metalness: 0 };
    case 'interior':
```

with:

```ts
      return { color: '#fff3c4', roughness: 0.5, metalness: 0 };
    case 'girder':
      // Bare structural steel seen during construction: darker and duller than finished steel trim.
      return { color: '#4f5860', roughness: 0.55, metalness: 0.6 };
    case 'interior':
```

- [ ] **Step 5: Create `src/scene/structure/planMath.ts`**

```ts
import type { PlanShape } from '../../sim/types';
import { planCorners } from '../parts/placement';

/** A point a fraction `u` (0..1) of the way round the outside of the plan, pulled `inset` metres inwards. */
export function perimeterAt(shape: PlanShape, width: number, depth: number, u: number, inset = 0): [number, number] {
  if (shape === 'circle') {
    const a = u * Math.PI * 2;
    return [(width / 2 - inset) * Math.sin(a), (depth / 2 - inset) * Math.cos(a)];
  }
  const c = planCorners(shape, width, depth);
  const lengths = c.map((p, i) => Math.hypot(c[(i + 1) % c.length].x - p.x, c[(i + 1) % c.length].z - p.z));
  let s = (((u % 1) + 1) % 1) * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < c.length; i++) {
    if (s <= lengths[i] || i === c.length - 1) {
      const p = c[i];
      const q = c[(i + 1) % c.length];
      const k = Math.min(1, s / lengths[i]);
      const x = p.x + (q.x - p.x) * k;
      const z = p.z + (q.z - p.z) * k;
      const r = Math.hypot(x, z);
      return r > 1e-9 ? [x - (x / r) * inset, z - (z / r) * inset] : [x, z];
    }
    s -= lengths[i];
  }
  return [c[0].x, c[0].z];
}

/** True when (x, z) is inside the plan and at least `margin` metres from its edge. */
export function insidePlan(shape: PlanShape, width: number, depth: number, x: number, z: number, margin = 0): boolean {
  if (shape === 'circle') return Math.hypot(x / (width / 2 - margin), z / (depth / 2 - margin)) <= 1;
  if (shape !== 'triangle') return Math.abs(x) <= width / 2 - margin && Math.abs(z) <= depth / 2 - margin;
  const c = planCorners(shape, width, depth);
  return c.every((p, i) => {
    const q = c[(i + 1) % c.length];
    const len = Math.hypot(q.x - p.x, q.z - p.z);
    const side = ((q.x - p.x) * (z - p.z) - (q.z - p.z) * (x - p.x)) / len;
    const centre = ((q.x - p.x) * -p.z - (q.z - p.z) * -p.x) / len;
    return Math.sign(side) === Math.sign(centre) && Math.abs(side) >= margin;
  });
}

/**
 * The stretch of a straight line inside the plan: the line x = c (axis 'x') or z = c (axis 'z'),
 * kept `margin` metres from the edge. Returns [from, to] along the other axis, or null if it misses.
 */
export function chord(shape: PlanShape, width: number, depth: number, axis: 'x' | 'z', c: number, margin = 0): [number, number] | null {
  const span = axis === 'x' ? depth : width;
  let lo = Infinity;
  let hi = -Infinity;
  const steps = 64;
  for (let i = 0; i <= steps; i++) {
    const s = -span / 2 + (span * i) / steps;
    const inside = axis === 'x' ? insidePlan(shape, width, depth, c, s, margin) : insidePlan(shape, width, depth, s, c, margin);
    if (inside) {
      lo = Math.min(lo, s);
      hi = Math.max(hi, s);
    }
  }
  return hi > lo ? [lo, hi] : null;
}

/** Points round the outside, as straight segments: the plan's corners, or 12 points round a circle. */
export function ringPoints(shape: PlanShape, width: number, depth: number, inset: number): [number, number][] {
  const n = shape === 'circle' ? 12 : shape === 'triangle' ? 3 : 4;
  if (shape === 'circle') return Array.from({ length: n }, (_, i) => perimeterAt(shape, width, depth, i / n, inset));
  return planCorners(shape, width, depth).map((p) => {
    const r = Math.hypot(p.x, p.z);
    return [p.x - (p.x / r) * inset * Math.SQRT2, p.z - (p.z / r) * inset * Math.SQRT2] as [number, number];
  });
}
```

- [ ] **Step 6: Create `src/scene/structure/structureParts.ts`**

```ts
import { FOUNDATION_SPACING } from '../../sim/construction/foundation';
import { coreKind, outriggerFloors } from '../../sim/construction/stages';
import { FLOOR_HEIGHT, floorSlices, plateDims, shapePerimeter, type FloorSlice } from '../../sim/geometry';
import { partBounds, rotateYXZ, strutPart, type Part, type PartMaterial, type Vec3 } from '../../sim/parts';
import type { Design, Material, StructuralSystem } from '../../sim/types';
import { shaftGrid } from '../FoundationView';
import { bracingParts } from '../ornaments';
import { floorRuns, planFaces } from '../parts/placement';
import { chord, insidePlan, perimeterAt, ringPoints } from './planMath';

export type StructureRole =
  | 'core'
  | 'column'
  | 'beam'
  | 'slab'
  | 'brace'
  | 'outrigger'
  | 'wall'
  | 'damper'
  | 'mass-damper'
  | 'isolator';

/** One piece of the bare structure, in building coordinates. */
export interface StructurePart {
  part: Part;
  role: StructureRole;
  /** Height of its top, metres: it counts as built once construction passes this height. */
  top: number;
}

/** How each material looks: column size, slab thickness and the colour of columns and beams. */
const LOOK: Record<Material, { column: number; slab: number; column_material: PartMaterial; beam_material: PartMaterial }> = {
  steel: { column: 0.6, slab: 0.25, column_material: 'girder', beam_material: 'girder' },
  concrete: { column: 1.2, slab: 0.5, column_material: 'concrete', beam_material: 'concrete' },
  composite: { column: 0.9, slab: 0.4, column_material: 'concrete', beam_material: 'girder' },
};

/** Spacing of the outside columns, metres (0: none — the diagrid's diagonals replace them). */
const EDGE_SPACING: Record<StructuralSystem, number> = {
  'rigid-frame': 9,
  'framed-tube': 3,
  'core-outrigger': 9,
  'bundled-tube': 3,
  diagrid: 0,
  'buttressed-core': 9,
};
/** Systems whose deep perimeter beams make a "tube". */
const TUBES: StructuralSystem[] = ['framed-tube', 'bundled-tube'];
const GRID = 9;
const DIAGRID_FLOORS = 6;

const at = (x: number, z: number, rot: number): [number, number] => {
  const [wx, , wz] = rotateYXZ([x, 0, z], [0, rot, 0]);
  return [wx, wz];
};

const tag = (part: Part, role: StructureRole): StructurePart => ({ part, role, top: partBounds(part).max[1] });

function column(x: number, z: number, y0: number, y1: number, size: number, rot: number, material: PartMaterial): Part {
  const [wx, wz] = at(x, z, rot);
  return { shape: 'box', position: [wx, (y0 + y1) / 2, wz], scale: [size, y1 - y0, size], rotation: [0, rot, 0], material };
}

/** A sloping member, pulled in at both ends so its corners stay between `from` and `to` heights. */
function diagonal(from: Vec3, to: Vec3, thickness: number, material: PartMaterial): Part {
  const pull = thickness * 0.6 * Math.sign(to[1] - from[1]);
  return strutPart([from[0], from[1] + pull, from[2]], [to[0], to[1] - pull, to[2]], thickness, material);
}

/** A horizontal member between two points at height y. */
function beam(a: [number, number], b: [number, number], y: number, depth: number, width: number, material: PartMaterial): Part {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return {
    shape: 'box',
    position: [(a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2],
    scale: [len, depth, width],
    rotation: [0, -Math.atan2(b[1] - a[1], b[0] - a[0]), 0],
    material,
  };
}

const coreSize = (s: { width: number; depth: number }) => 0.3 * Math.min(s.width, s.depth);
const inCore = (x: number, z: number, c: number) => Math.abs(x) < c / 2 + 1 && Math.abs(z) < c / 2 + 1;

/** Interior column lines: a 9 m grid (rigid frame) or the tube walls between a bundled tube's cells. */
function interiorPoints(design: Design, w: number, d: number, c: number): [number, number][] {
  const pts: [number, number][] = [];
  const keep = (x: number, z: number) => insidePlan(design.shape, w, d, x, z, 2) && !inCore(x, z, c);
  if (design.system === 'rigid-frame') {
    const kx = Math.floor(w / 2 / GRID);
    const kz = Math.floor(d / 2 / GRID);
    for (let i = -kx; i <= kx; i++) for (let j = -kz; j <= kz; j++) if (keep(i * GRID, j * GRID)) pts.push([i * GRID, j * GRID]);
  } else if (design.system === 'bundled-tube') {
    for (const [axis, c0] of bundleLines(design, w, d)) {
      const span = chord(design.shape, w, d, axis, c0, 2);
      if (!span) continue;
      for (let s = span[0]; s <= span[1] + 1e-9; s += 3) {
        const [x, z] = axis === 'x' ? [c0, s] : [s, c0];
        if (!inCore(x, z, c)) pts.push([x, z]);
      }
    }
  }
  return pts;
}

/** Lines dividing a bundled tube into cells: 3×3 on most plans, 2×3 on a rectangle. */
function bundleLines(design: Design, w: number, d: number): ['x' | 'z', number][] {
  if (design.shape === 'rectangle') return w >= d ? [['x', -w / 6], ['x', w / 6], ['z', 0]] : [['z', -d / 6], ['z', d / 6], ['x', 0]];
  return [['x', -w / 6], ['x', w / 6], ['z', -d / 6], ['z', d / 6]];
}

/** Interior beam lines per floor, matching the interior columns. */
function interiorBeamLines(design: Design, w: number, d: number): ['x' | 'z', number][] {
  if (design.system === 'bundled-tube') return bundleLines(design, w, d);
  if (design.system !== 'rigid-frame') return [];
  const lines: ['x' | 'z', number][] = [];
  for (let i = -Math.floor(w / 2 / GRID); i <= Math.floor(w / 2 / GRID); i++) lines.push(['x', i * GRID]);
  for (let j = -Math.floor(d / 2 / GRID); j <= Math.floor(d / 2 / GRID); j++) lines.push(['z', j * GRID]);
  return lines;
}

function coreParts(design: Design, run: FloorSlice[], y0: number, y1: number, rot: number): StructurePart[] {
  const top = run[run.length - 1];
  const c = coreSize(top);
  if (coreKind(design) === 'concrete') {
    return [tag({ shape: 'box', position: [0, (y0 + y1) / 2, 0], scale: [c, y1 - y0, c], rotation: [0, rot, 0], material: 'concrete' }, 'core')];
  }
  // A braced steel core: four corner columns with an X on each face.
  const corners: [number, number][] = [[c / 2, c / 2], [c / 2, -c / 2], [-c / 2, -c / 2], [-c / 2, c / 2]];
  const out = corners.map(([x, z]) => tag(column(x, z, y0, y1, 0.5, rot, 'girder'), 'core'));
  corners.forEach(([x, z], i) => {
    const [nx, nz] = corners[(i + 1) % 4];
    const [ax, az] = at(x, z, rot);
    const [bx, bz] = at(nx, nz, rot);
    out.push(tag(diagonal([ax, y0, az], [bx, y1, bz], 0.3, 'girder'), 'core'));
    out.push(tag(diagonal([bx, y0, bz], [ax, y1, az], 0.3, 'girder'), 'core'));
  });
  return out;
}

/** Three thick concrete wing walls from the core to the edge, 120° apart (the Burj Khalifa "Y"). */
function wingWalls(design: Design, run: FloorSlice[], y0: number, y1: number, rot: number): StructurePart[] {
  const top = run[run.length - 1];
  const c = coreSize(top);
  const thick = Math.max(0.6, 0.06 * Math.min(top.width, top.depth));
  return [0, 120, 240].map((deg) => {
    const a = (deg * Math.PI) / 180;
    // Reach out until just inside the plan.
    let r = c / 2;
    while (insidePlan(design.shape, top.width, top.depth, Math.sin(a) * (r + 0.5), Math.cos(a) * (r + 0.5), 0.6)) r += 0.5;
    const mid = (c / 2 + r) / 2;
    const [x, z] = at(Math.sin(a) * mid, Math.cos(a) * mid, rot);
    return tag({ shape: 'box', position: [x, (y0 + y1) / 2, z], scale: [thick, y1 - y0, Math.max(0.5, r - c / 2)], rotation: [0, a + rot, 0], material: 'concrete' }, 'wall');
  });
}

function diagridParts(design: Design, slices: FloorSlice[], material: PartMaterial, thickness: number): StructurePart[] {
  const out: StructurePart[] = [];
  for (let f0 = 0; f0 < slices.length; f0 += DIAGRID_FLOORS) {
    const b = slices[f0];
    const t = slices[Math.min(f0 + DIAGRID_FLOORS, slices.length) - 1];
    const yTop = t.y + FLOOR_HEIGHT;
    const n = Math.max(4, Math.round(shapePerimeter(design.shape, b.width, b.depth) / (DIAGRID_FLOORS * FLOOR_HEIGHT)));
    const lower = (u: number): Vec3 => {
      const [x, z] = perimeterAt(design.shape, b.width, b.depth, u, thickness);
      const [wx, wz] = at(x, z, b.rotation);
      return [wx, b.y, wz];
    };
    const upper = (u: number): Vec3 => {
      const [x, z] = perimeterAt(design.shape, t.width, t.depth, u, thickness);
      const [wx, wz] = at(x, z, t.rotation);
      return [wx, yTop, wz];
    };
    for (let k = 0; k < n; k++) {
      out.push(tag(diagonal(lower(k / n), upper((k + 1) / n), thickness, material), 'column'));
      out.push(tag(diagonal(lower((k + 1) / n), upper(k / n), thickness, material), 'column'));
    }
  }
  return out;
}

function outriggerParts(design: Design, slices: FloorSlice[]): StructurePart[] {
  const out: StructurePart[] = [];
  for (const f of outriggerFloors(design.floors)) {
    const s = slices[Math.min(slices.length - 1, Math.max(1, f))];
    const below = slices[s.index - 1];
    const y0 = below.y;
    const y1 = s.y + FLOOR_HEIGHT;
    const c = coreSize(s);
    // Arms from the core to the middle of each wall.
    for (const face of planFaces(design.shape, s.width, s.depth)) {
      const r = Math.hypot(face.x, face.z);
      const ux = face.x / r;
      const uz = face.z / r;
      const [ix, iz] = at(ux * (c / 2), uz * (c / 2), s.rotation);
      const [ox, oz] = at(ux * (r - 1), uz * (r - 1), s.rotation);
      out.push(tag(diagonal([ix, y1, iz], [ox, y0, oz], 0.8, 'girder'), 'outrigger'));
      out.push(tag(diagonal([ix, y0, iz], [ox, y1, oz], 0.8, 'girder'), 'outrigger'));
    }
    // A belt truss round the outside: an X on each side.
    const ring = ringPoints(design.shape, s.width, s.depth, 0.6);
    ring.forEach((p, i) => {
      const q = ring[(i + 1) % ring.length];
      const [ax, az] = at(p[0], p[1], s.rotation);
      const [bx, bz] = at(q[0], q[1], s.rotation);
      out.push(tag(diagonal([ax, y0, az], [bx, y1, bz], 0.6, 'girder'), 'outrigger'));
      out.push(tag(diagonal([bx, y0, bz], [ax, y1, az], 0.6, 'girder'), 'outrigger'));
    });
  }
  return out;
}

function perFloorParts(design: Design, s: FloorSlice): StructurePart[] {
  const look = LOOK[design.material];
  const out: StructurePart[] = [];
  const yTop = s.y + FLOOR_HEIGHT;
  const depth = TUBES.includes(design.system) ? 1.2 : 0.6;
  // The floor slab, poured onto the beams.
  out.push(
    tag({ shape: 'plan', position: [0, yTop - look.slab / 2, 0], scale: [s.width - 0.6, look.slab, s.depth - 0.6], rotation: [0, s.rotation, 0], material: 'concrete' }, 'slab'),
  );
  // Edge beams round the outside, straight from corner to corner (12 segments round a circle).
  const ring = ringPoints(design.shape, s.width, s.depth, 0.4);
  ring.forEach((p, i) => {
    const q = ring[(i + 1) % ring.length];
    out.push(tag(beam(at(p[0], p[1], s.rotation), at(q[0], q[1], s.rotation), yTop - depth / 2, depth, 0.4, look.beam_material), 'beam'));
  });
  // Interior beams along the column lines.
  for (const [axis, c] of interiorBeamLines(design, s.width, s.depth)) {
    const span = chord(design.shape, s.width, s.depth, axis, c, 0.6);
    if (!span) continue;
    const a: [number, number] = axis === 'x' ? [c, span[0]] : [span[0], c];
    const b: [number, number] = axis === 'x' ? [c, span[1]] : [span[1], c];
    out.push(tag(beam(at(a[0], a[1], s.rotation), at(b[0], b[1], s.rotation), yTop - 0.3, 0.6, 0.35, look.beam_material), 'beam'));
  }
  // Viscous dampers: a red shock-absorber brace on each side, every 5th floor.
  if (design.damping === 'viscous' && s.index % 5 === 4) {
    for (const face of planFaces(design.shape, s.width, s.depth)) {
      const r = Math.hypot(face.x, face.z);
      const k = (r - 1.2) / r;
      const along: [number, number] = [Math.cos(face.yaw), -Math.sin(face.yaw)];
      const [ax, az] = at(face.x * k - along[0] * 1.5, face.z * k - along[1] * 1.5, s.rotation);
      const [bx, bz] = at(face.x * k + along[0] * 1.5, face.z * k + along[1] * 1.5, s.rotation);
      out.push(tag(diagonal([ax, s.y, az], [bx, yTop, bz], 0.35, 'ruby'), 'damper'));
    }
  }
  return out;
}

function massDamper(slices: FloorSlice[]): StructurePart[] {
  const roof = slices[slices.length - 1];
  const hang = slices[Math.max(0, slices.length - 3)];
  const size = Math.min(0.25 * Math.min(roof.width, roof.depth), FLOOR_HEIGHT * 0.8);
  const y = hang.y + FLOOR_HEIGHT / 2;
  const roofY = roof.y + FLOOR_HEIGHT;
  const out: StructurePart[] = [
    tag({ shape: 'box', position: [0, y, 0], scale: [size, size, size], rotation: [0, roof.rotation, 0], material: 'steel' }, 'mass-damper'),
  ];
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) {
    const [x, z] = at((sx * size) / 2.5, (sz * size) / 2.5, roof.rotation);
    out.push(tag(strutPart([x, y + size / 2, z], [x, roofY - 0.1, z], 0.1, 'girder'), 'mass-damper'));
  }
  return out;
}

/**
 * The bare structure of the whole tower, in building coordinates: core, columns, beams, slabs and any
 * outriggers, wing walls, diagrid, dampers, isolators and exposed bracing. Shown during construction,
 * where the main material and structural system each have their own look.
 */
export function structureParts(design: Design): StructurePart[] {
  const slices = floorSlices(design);
  const look = LOOK[design.material];
  const out: StructurePart[] = [];
  // Long columns over a few floors at a time keep the part count down on tall towers.
  const runFloors = Math.max(1, Math.ceil(design.floors / 25));
  for (const run of floorRuns(design, runFloors)) {
    const top = run[run.length - 1];
    const y0 = run[0].y;
    const y1 = top.y + FLOOR_HEIGHT;
    const rot = run[Math.floor(run.length / 2)].rotation;
    const c = coreSize(top);
    out.push(...coreParts(design, run, y0, y1, rot));
    if (design.system === 'buttressed-core') out.push(...wingWalls(design, run, y0, y1, rot));
    const spacing = EDGE_SPACING[design.system];
    if (spacing > 0) {
      const n = Math.max(3, Math.round(shapePerimeter(design.shape, top.width, top.depth) / spacing));
      for (let k = 0; k < n; k++) {
        const [x, z] = perimeterAt(design.shape, top.width, top.depth, (k + 0.5) / n, look.column / 2 + 0.2);
        out.push(tag(column(x, z, y0, y1, look.column, rot, look.column_material), 'column'));
      }
    }
    for (const [x, z] of interiorPoints(design, top.width, top.depth, c)) out.push(tag(column(x, z, y0, y1, look.column, rot, look.column_material), 'column'));
  }
  if (design.system === 'diagrid') out.push(...diagridParts(design, slices, look.column_material === 'concrete' ? 'concrete' : 'girder', design.material === 'steel' ? 0.7 : 1));
  if (design.system === 'core-outrigger') out.push(...outriggerParts(design, slices));
  for (const s of slices) out.push(...perFloorParts(design, s));
  if (design.damping === 'tmd') out.push(...massDamper(slices));
  if (design.baseIsolation) {
    const { width, depth } = plateDims(design);
    for (const [x, z] of shaftGrid(width, depth, FOUNDATION_SPACING.isolators)) {
      out.push(tag({ shape: 'cylinder', position: [x, -0.5, z], scale: [1.4, 1, 1.4], material: 'interior' }, 'isolator'));
    }
  }
  for (const p of bracingParts(design)) out.push(tag(p, 'brace'));
  return out;
}
```

- [ ] **Step 7: Run the tests and type-check**

Run: `npx vitest run src/scene/structure/structureParts.test.ts`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  39 passed (39)`, `Tests  294 passed (294)`.

- [ ] **Step 8: Commit**

```bash
git add src/scene/structure/structureParts.test.ts src/sim/parts.ts src/scene/parts/materials.ts src/scene/structure/planMath.ts src/scene/structure/structureParts.ts
git commit -m "feat: bare structure for each structural system and material

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```

---

### Task 4: Building one stage at a time, from the sidebar

`build()` now enters the `building` phase at stage 1 instead of jumping to the finished tower. The store gains `finishStage` (called by the 3D view when a stage has played), `nextStage`, `replayStage` and `skipBuild`, plus `stageRun`, which goes up whenever a stage starts so the 3D view knows to restart. Stage progress for the counters lives in its own tiny store, so twenty updates a second re-render only the card. The sidebar shows the new Construction card while building, and the Close-up inset steps aside. Three existing tests assumed Build jumped straight to the finished tower; they are updated.

**Files:**
- Modify: `src/state/store.test.ts`
- Create: `src/ui/sidebar/ConstructionCard.test.tsx`
- Modify: `src/ui/sidebar/Sidebar.test.tsx`
- Modify: `src/ui/DetailInset.test.tsx`
- Create: `src/state/buildProgress.ts`
- Modify: `src/state/store.ts`
- Create: `src/ui/sidebar/ConstructionCard.tsx`
- Modify: `src/ui/sidebar/Sidebar.tsx`
- Modify: `src/ui/DetailInset.tsx`
- Modify: `src/ui/styles.css`

**Interfaces:**
- Consumes: Task 1: `STAGE_COUNT`, `constructionStages`, `constructionState`. Task 2: `stageCaption`. Existing: `useCurrent`, `formatMoney`.
- Produces:
  - `src/state/buildProgress.ts`: `useBuildProgress` (`{ t }`), `setBuildProgress(t)`.
  - Store state: `buildStage` (0..5), `stageDone`, `stageRun`. Actions: `finishStage()`, `nextStage()`, `replayStage()`, `skipBuild()`.
  - `src/ui/sidebar/ConstructionCard.tsx`: `<ConstructionCard />`, a region named `Construction` with buttons `Next ▶` (or `Open the building` on the last stage), `Replay` and `Skip to finished`.

- [ ] **Step 1: Write the failing tests**

In `src/state/store.test.ts`:

Replace:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { selectCanRedo, selectCanUndo, selectDesign, useGame } from './store';
```

with:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { useBuildProgress } from './buildProgress';
import { selectCanRedo, selectCanUndo, selectDesign, useGame } from './store';
```

Replace:

```ts
    state().build();
    expect(state().phase).toBe('complete');
    const r = state().dispatch([{ type: 'set_parameter', id: 'floors', value: 60 }]);
```

with:

```ts
    state().build();
    expect(state().phase).toBe('building');
    const r = state().dispatch([{ type: 'set_parameter', id: 'floors', value: 60 }]);
```

Replace:

```ts
  });
});
```

with:

```ts
  });
});

describe('construction', () => {
  beforeEach(() => {
    state().newProject();
    state().startProject('chicago', 'sandbox');
  });

  it('Build starts the first of six stages instead of jumping to the finished tower', () => {
    state().build();
    expect(state()).toMatchObject({ phase: 'building', buildStage: 0, stageDone: false });
    expect(useBuildProgress.getState().t).toBe(0);
  });

  it('Next waits until the stage has finished playing, then moves on', () => {
    state().build();
    state().nextStage();
    expect(state().buildStage).toBe(0);
    state().finishStage();
    expect(state().stageDone).toBe(true);
    expect(useBuildProgress.getState().t).toBe(1);
    state().nextStage();
    expect(state()).toMatchObject({ buildStage: 1, stageDone: false });
    expect(useBuildProgress.getState().t).toBe(0);
  });

  it('Next on the last stage opens the finished building', () => {
    state().build();
    for (let i = 0; i < 6; i++) {
      state().finishStage();
      state().nextStage();
    }
    expect(state().phase).toBe('complete');
  });

  it('Replay plays the stage again, and Skip goes straight to the finished building', () => {
    state().build();
    state().finishStage();
    const run = state().stageRun;
    state().replayStage();
    expect(state().stageDone).toBe(false);
    expect(state().stageRun).toBe(run + 1);
    state().skipBuild();
    expect(state().phase).toBe('complete');
  });

  it('stage controls do nothing outside construction', () => {
    state().finishStage();
    state().nextStage();
    state().skipBuild();
    expect(state()).toMatchObject({ phase: 'design', buildStage: 0, stageDone: false });
  });

  it('a new project forgets the construction', () => {
    state().build();
    state().finishStage();
    state().nextStage();
    state().newProject();
    state().startProject('tokyo', 'sandbox');
    expect(state()).toMatchObject({ phase: 'design', buildStage: 0, stageDone: false });
  });
});
```


`src/ui/sidebar/ConstructionCard.test.tsx` (new):

```tsx
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { analyze } from '../../sim/analysis';
import { formatMoney } from '../../sim/format';
import { getSite } from '../../sim/sites';
import { useBuildProgress } from '../../state/buildProgress';
import { selectDesign, useGame } from '../../state/store';
import { ConstructionCard } from './ConstructionCard';

const analysis = () => analyze(getSite('chicago'), selectDesign(useGame.getState())!);

describe('<ConstructionCard />', () => {
  beforeEach(() => {
    useGame.getState().newProject();
    useGame.getState().startProject('chicago', 'sandbox');
    useGame.getState().build();
  });

  it('shows the stage, its explanation, your numbers and the counters', () => {
    render(<ConstructionCard />);
    const card = screen.getByRole('region', { name: 'Construction' });
    expect(within(card).getByRole('heading')).toHaveTextContent('Stage 1 of 6 · Digging the hole');
    expect(within(card).getByText(/Before anything goes up/)).toBeInTheDocument();
    expect(within(card).getByText(/Diggers spend \d+ days on your lot/)).toBeInTheDocument();
    expect(within(card).getByText(`Day 0 of ${analysis().schedule.totalDays}`)).toBeInTheDocument();
    expect(within(card).getByText(`${formatMoney(0)} of ${formatMoney(analysis().cost.total)} spent`)).toBeInTheDocument();
  });

  it('counts the days as the stage plays', () => {
    render(<ConstructionCard />);
    act(() => useBuildProgress.setState({ t: 1 }));
    expect(screen.getByText(/^Day 30 of /)).toBeInTheDocument();
  });

  it('Next is disabled until the stage finishes, then moves to the next stage', () => {
    render(<ConstructionCard />);
    expect(screen.getByRole('button', { name: 'Next ▶' })).toBeDisabled();
    act(() => useGame.getState().finishStage());
    fireEvent.click(screen.getByRole('button', { name: 'Next ▶' }));
    expect(screen.getByRole('heading')).toHaveTextContent('Stage 2 of 6 · Laying the foundation');
  });

  it('the last stage opens the building', () => {
    render(<ConstructionCard />);
    for (let i = 0; i < 5; i++)
      act(() => {
        useGame.getState().finishStage();
        useGame.getState().nextStage();
      });
    act(() => useGame.getState().finishStage());
    fireEvent.click(screen.getByRole('button', { name: 'Open the building' }));
    expect(useGame.getState().phase).toBe('complete');
  });

  it('Replay and Skip to finished', () => {
    render(<ConstructionCard />);
    act(() => useGame.getState().finishStage());
    fireEvent.click(screen.getByRole('button', { name: 'Replay' }));
    expect(screen.getByRole('button', { name: 'Next ▶' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Skip to finished' }));
    expect(useGame.getState().phase).toBe('complete');
  });
});
```

In `src/ui/sidebar/Sidebar.test.tsx`:

Replace:

```tsx

  it('building shows the assessment and hides the controls', () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole('button', { name: 'Build it!' }));
    expect(screen.getByRole('region', { name: 'Engineering assessment' })).toBeInTheDocument();
```

with:

```tsx

  it('building shows the construction card, then the assessment, and hides the controls', () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole('button', { name: 'Build it!' }));
    expect(screen.getByRole('region', { name: 'Construction' })).toBeInTheDocument();
    expect(screen.queryByRole('slider', { name: 'Floors' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Skip to finished' }));
    expect(screen.getByRole('region', { name: 'Engineering assessment' })).toBeInTheDocument();
```

Replace:

```tsx
    fireEvent.click(screen.getByRole('button', { name: 'Build it!' }));
    expect(screen.getByText('Safety')).toBeInTheDocument();
```

with:

```tsx
    fireEvent.click(screen.getByRole('button', { name: 'Build it!' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip to finished' }));
    expect(screen.getByText('Safety')).toBeInTheDocument();
```


In `src/ui/DetailInset.test.tsx`:

Replace:

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
```

with:

```tsx
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
```

Replace:

```tsx

  it('keeps working after the design is built', () => {
    useGame.getState().build();
    render(<DetailInset />);
    expect(screen.getByRole('region', { name: 'Close-up' })).toBeInTheDocument();
```

with:

```tsx

  it('hides during construction and comes back once the building is finished', () => {
    useGame.getState().build();
    const { rerender } = render(<DetailInset />);
    expect(screen.queryByRole('region', { name: 'Close-up' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Close-up/ })).not.toBeInTheDocument();
    act(() => useGame.getState().skipBuild());
    rerender(<DetailInset />);
    expect(screen.getByRole('region', { name: 'Close-up' })).toBeInTheDocument();
```


- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/state/store.test.ts src/ui/sidebar/ConstructionCard.test.tsx src/ui/sidebar/Sidebar.test.tsx src/ui/DetailInset.test.tsx`

Expected: FAIL — `Failed to resolve import "./buildProgress"` and `"./ConstructionCard"`; the updated Sidebar and DetailInset tests fail.

- [ ] **Step 3: Create `src/state/buildProgress.ts`**

```ts
import { create } from 'zustand';

/**
 * How far (0..1) the current construction stage has played. The 3D view advances it about ten times a
 * second while a stage plays; kept apart from the game store so those updates re-render only the counters.
 */
export const useBuildProgress = create<{ t: number }>(() => ({ t: 0 }));

export const setBuildProgress = (t: number) => useBuildProgress.setState({ t });
```

- [ ] **Step 4: Edit `src/state/store.ts`**

Replace:

```ts
import { create } from 'zustand';
import { applyActions, type ApplyResult, type DesignAction, type GamePhase } from '../sim/actions';
```

with:

```ts
import { create } from 'zustand';
import { STAGE_COUNT } from '../sim/construction/stages';
import { applyActions, type ApplyResult, type DesignAction, type GamePhase } from '../sim/actions';
```

Replace:

```ts
import type { Design, DetailLevel, SiteId } from '../sim/types';
```

with:

```ts
import type { Design, DetailLevel, SiteId } from '../sim/types';
import { setBuildProgress } from './buildProgress';
```

Replace:

```ts
  timeOfDay: TimeOfDay;
  startProject: (siteId: SiteId, mode: GameMode, briefId?: string | null) => void;
```

with:

```ts
  timeOfDay: TimeOfDay;
  /** Construction stage being shown (0..5) while building. */
  buildStage: number;
  /** The current stage has finished playing, so Next is allowed. */
  stageDone: boolean;
  /** Goes up each time a stage starts playing (including replays), so the 3D view restarts it. */
  stageRun: number;
  startProject: (siteId: SiteId, mode: GameMode, briefId?: string | null) => void;
```

Replace:

```ts
  build: () => void;
  newProject: () => void;
```

with:

```ts
  build: () => void;
  /** The 3D view calls this when the current stage has finished playing. */
  finishStage: () => void;
  nextStage: () => void;
  replayStage: () => void;
  skipBuild: () => void;
  newProject: () => void;
```

Replace:

```ts
  timeOfDay: 'day',
```

with:

```ts
  timeOfDay: 'day',
  buildStage: 0,
  stageDone: false,
  stageRun: 0,
```

Replace:

```ts
      lastCoalesceKey: null,
    }),
```

with:

```ts
      lastCoalesceKey: null,
      buildStage: 0,
      stageDone: false,
    }),
```

Replace:

```ts
  build: () => {
    if (get().project && get().phase === 'design') set({ phase: 'complete', lastCoalesceKey: null });
  },

  newProject: () =>
    set({ project: null, phase: 'design', history: [], historyIndex: -1, lastCoalesceKey: null, timeOfDay: 'day' }),
```

with:

```ts
  build: () => {
    if (!get().project || get().phase !== 'design') return;
    setBuildProgress(0);
    set({ phase: 'building', buildStage: 0, stageDone: false, stageRun: get().stageRun + 1, lastCoalesceKey: null });
  },

  finishStage: () => {
    if (get().phase !== 'building') return;
    setBuildProgress(1);
    set({ stageDone: true });
  },

  nextStage: () => {
    const { phase, buildStage, stageDone, stageRun } = get();
    if (phase !== 'building' || !stageDone) return;
    if (buildStage >= STAGE_COUNT - 1) {
      set({ phase: 'complete' });
      return;
    }
    setBuildProgress(0);
    set({ buildStage: buildStage + 1, stageDone: false, stageRun: stageRun + 1 });
  },

  replayStage: () => {
    if (get().phase !== 'building') return;
    setBuildProgress(0);
    set({ stageDone: false, stageRun: get().stageRun + 1 });
  },

  skipBuild: () => {
    if (get().phase === 'building') set({ phase: 'complete' });
  },

  newProject: () =>
    set({
      project: null,
      phase: 'design',
      history: [],
      historyIndex: -1,
      lastCoalesceKey: null,
      timeOfDay: 'day',
      buildStage: 0,
      stageDone: false,
    }),
```

- [ ] **Step 5: Create `src/ui/sidebar/ConstructionCard.tsx`**

```tsx
import { useMemo } from 'react';
import { stageCaption } from '../../sim/construction/captions';
import { STAGE_COUNT, constructionStages, constructionState } from '../../sim/construction/stages';
import { formatMoney } from '../../sim/format';
import { useBuildProgress } from '../../state/buildProgress';
import { useCurrent } from '../../state/hooks';
import { useGame } from '../../state/store';

/** The sidebar while the tower is being built: one stage at a time, explained, with Next, Replay and Skip. */
export function ConstructionCard() {
  const { site, design, analysis } = useCurrent();
  const stage = useGame((s) => s.buildStage);
  const done = useGame((s) => s.stageDone);
  const { nextStage, replayStage, skipBuild } = useGame.getState();
  const t = useBuildProgress((s) => s.t);
  const stages = useMemo(() => constructionStages(design, analysis), [design, analysis]);
  const caption = useMemo(() => stageCaption(design, site, analysis, stage), [design, site, analysis, stage]);
  const now = constructionState(design, analysis, stage, t);
  const total = analysis.cost.total;
  const last = stage === STAGE_COUNT - 1;
  return (
    <section className="card construction" aria-label="Construction">
      <h2>
        Stage {stage + 1} of {STAGE_COUNT} · {caption.title}
      </h2>
      <ol className="stage-strip" aria-hidden="true">
        {stages.map((s, i) => (
          <li key={s.id} className={i < stage ? 'done' : i === stage ? 'current' : ''} title={s.label} />
        ))}
      </ol>
      <div className="counters">
        <p>
          Day {now.day} of {analysis.schedule.totalDays}
        </p>
        <p>
          {formatMoney(now.spent)} of {formatMoney(total)} spent
        </p>
        <div className="spent-bar">
          <span style={{ width: `${Math.min(100, (now.spent / total) * 100)}%` }} />
        </div>
      </div>
      <p className="idea">{caption.idea}</p>
      <p className="yours">{caption.yours}</p>
      <div className="construction-buttons">
        <button className="build-button" onClick={nextStage} disabled={!done}>
          {last ? 'Open the building' : 'Next ▶'}
        </button>
        <button onClick={replayStage}>Replay</button>
        <button onClick={skipBuild}>Skip to finished</button>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Edit `src/ui/sidebar/Sidebar.tsx`**

Replace:

```tsx
import { BuildBar } from './BuildBar';
import { ControlGroups } from './ControlGroups';
```

with:

```tsx
import { BuildBar } from './BuildBar';
import { ConstructionCard } from './ConstructionCard';
import { ControlGroups } from './ControlGroups';
```

Replace:

```tsx
          <AssessmentPanel />
        ) : (
```

with:

```tsx
          <AssessmentPanel />
        ) : phase === 'building' ? (
          <ConstructionCard />
        ) : (
```

- [ ] **Step 7: Edit `src/ui/DetailInset.tsx`**

Replace:

```tsx
  const night = useGame((s) => s.timeOfDay === 'night');
  const [prefs, setPrefs] = useState(() => loadPrefs() ?? { view: 'facade' as DetailView, minimized: startsMinimized() });
```

with:

```tsx
  const night = useGame((s) => s.timeOfDay === 'night');
  const building = useGame((s) => s.phase === 'building');
  const [prefs, setPrefs] = useState(() => loadPrefs() ?? { view: 'facade' as DetailView, minimized: startsMinimized() });
```

Replace:

```tsx

  if (prefs.minimized) {
```

with:

```tsx

  // The bare structure is the point of construction; the close-up shows the finished facade, so it waits.
  if (building) return null;
  if (prefs.minimized) {
```

- [ ] **Step 8: Edit `src/ui/styles.css`**

Replace:

```css
@media (max-width: 900px) { .detail-inset { width: 240px; } .detail-canvas { height: 160px; } }
```

with:

```css
@media (max-width: 900px) { .detail-inset { width: 240px; } .detail-canvas { height: 160px; } }
.construction h2 { margin: 0 0 8px; font-size: 1.05em; }
.stage-strip { display: flex; gap: 4px; list-style: none; margin: 0 0 10px; padding: 0; }
.stage-strip li { flex: 1; height: 6px; border-radius: 3px; background: var(--line); }
.stage-strip li.done { background: var(--pass); }
.stage-strip li.current { background: var(--accent); }
.counters p { margin: 2px 0; font-variant-numeric: tabular-nums; }
.spent-bar { height: 4px; background: var(--line); border-radius: 2px; overflow: hidden; margin: 4px 0 10px; }
.spent-bar span { display: block; height: 100%; background: var(--accent); }
.construction .idea { margin: 0 0 8px; }
.construction .yours { margin: 0 0 12px; color: var(--accent); }
.construction-buttons { display: flex; flex-wrap: wrap; gap: 6px; }
.construction-buttons .build-button { flex: 1 1 100%; }
```

- [ ] **Step 9: Run the tests and type-check**

Run: `npx vitest run src/state/store.test.ts src/ui/sidebar/ConstructionCard.test.tsx src/ui/sidebar/Sidebar.test.tsx src/ui/DetailInset.test.tsx`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  40 passed (40)`, `Tests  305 passed (305)`.

- [ ] **Step 10: Commit**

```bash
git add src/state/store.test.ts src/ui/sidebar/ConstructionCard.test.tsx src/ui/sidebar/Sidebar.test.tsx src/ui/DetailInset.test.tsx src/state/buildProgress.ts src/state/store.ts src/ui/sidebar/ConstructionCard.tsx src/ui/sidebar/Sidebar.tsx src/ui/DetailInset.tsx src/ui/styles.css
git commit -m "feat: build one stage at a time from a construction card

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```

---

### Task 5: The crane and the site vehicles

Pure part builders for the props. Each vehicle (excavator, dump truck, pile rig, concrete mixer, flatbed carrying girders) is a handful of parts at real size, facing +x and standing on the ground, with a little motion from a clock: the excavator's arm dips, the mixer's drum turns, the pile rig's hammer rises and drops. The tower crane stands beside the core with its jib at the state's crane height and slews slowly. `constructionProps` places what the state says is on site: trucks parked in front of the tower, the excavator at the front of the pit, the pile rig moving across the footprint.

**Files:**
- Create: `src/scene/construction/props.test.ts`
- Create: `src/scene/construction/props.ts`

**Interfaces:**
- Consumes: Task 1: `ConstructionState`, `VehicleId`, `constructionState`. Existing: `floorSlices`, `plateDims`, `placePart`, `rotateYXZ`, `strutPart`.
- Produces (`src/scene/construction/props.ts`): `vehicleParts(id, clock): Part[]`, `craneParts(design, top, slew): Part[]`, `constructionProps(design, state, clock): Part[]` (building coordinates).

- [ ] **Step 1: Write the failing tests**

`src/scene/construction/props.test.ts` (new):

```ts
import { describe, expect, it } from 'vitest';
import { analyze } from '../../sim/analysis';
import { constructionState, type VehicleId } from '../../sim/construction/stages';
import { plateDims } from '../../sim/geometry';
import { partBounds, partIsFinite, type Part } from '../../sim/parts';
import { designFor } from '../../sim/testUtils';
import { constructionProps, craneParts, vehicleParts } from './props';

const VEHICLES: VehicleId[] = ['excavator', 'dump-truck', 'pile-rig', 'mixer', 'flatbed'];
const bounds = (parts: Part[]) => {
  const b = parts.map(partBounds);
  return {
    min: [0, 1, 2].map((i) => Math.min(...b.map((x) => x.min[i]))),
    max: [0, 1, 2].map((i) => Math.max(...b.map((x) => x.max[i]))),
  };
};

describe('construction props', () => {
  it('builds every vehicle at real size, standing on the ground', () => {
    for (const id of VEHICLES)
      for (const clock of [0, 1.3, 7.9]) {
        const parts = vehicleParts(id, clock);
        expect(parts.length, id).toBeGreaterThan(2);
        expect(parts.every(partIsFinite), id).toBe(true);
        const b = bounds(parts);
        expect(b.min[1], id).toBeGreaterThanOrEqual(-0.01);
        expect(b.max[0] - b.min[0], id).toBeGreaterThan(4);
        expect(b.max[0] - b.min[0], id).toBeLessThan(16);
        expect(b.max[1], id).toBeLessThan(id === 'pile-rig' ? 30 : 8);
      }
  });

  it('stands the crane next to the core with its jib at the given height, turning without moving the mast', () => {
    const { design } = designFor('chicago', { floors: 40 });
    const a = craneParts(design, 100, 0);
    const b = craneParts(design, 100, 1);
    const mastA = a.find((p) => p.scale[1] > 50)!;
    const mastB = b.find((p) => p.scale[1] > 50)!;
    expect(partBounds(mastA).max[1]).toBeCloseTo(100, 5);
    expect(mastA.position).toEqual(mastB.position);
    expect(bounds(a).max[1]).toBeGreaterThan(100);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
    expect(a.every(partIsFinite)).toBe(true);
  });

  it('shows the crane only while it is up, and one cluster of parts per vehicle on site', () => {
    const { site, design } = designFor('chicago', { floors: 40, material: 'steel', foundation: 'piles' });
    const analysis = analyze(site, design);
    const dig = constructionState(design, analysis, 0, 0.5);
    expect(constructionProps(design, dig, 0)).toHaveLength(vehicleParts('excavator', 0).length + vehicleParts('dump-truck', 0).length);
    const frame = constructionState(design, analysis, 2, 0.5);
    const crane = craneParts(design, frame.crane.top, 0).length;
    const trucks = frame.vehicles.reduce((s, v) => s + vehicleParts(v, 0).length, 0);
    expect(constructionProps(design, frame, 0)).toHaveLength(crane + trucks);
    expect(constructionProps(design, constructionState(design, analysis, 5, 1), 0)).toHaveLength(0);
  });

  it('parks the trucks in front of the tower, clear of its footprint', () => {
    const { site, design } = designFor('chicago', { floors: 40, material: 'composite' });
    const { depth } = plateDims(design);
    const frame = constructionState(design, analyze(site, design), 2, 0.5);
    for (const clock of [0, 3, 11]) {
      const parts = constructionProps(design, { ...frame, crane: { top: 0, up: false } }, clock);
      expect(bounds(parts).min[2]).toBeGreaterThan(depth / 2);
    }
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/scene/construction/props.test.ts`

Expected: FAIL — `Failed to resolve import "./props"`.

- [ ] **Step 3: Create `src/scene/construction/props.ts`**

```ts
import type { ConstructionState, VehicleId } from '../../sim/construction/stages';
import { FLOOR_HEIGHT, floorSlices, plateDims } from '../../sim/geometry';
import { placePart, rotateYXZ, strutPart, type Part, type PartMaterial, type Vec3 } from '../../sim/parts';
import type { Design } from '../../sim/types';

const box = (position: Vec3, scale: Vec3, material: PartMaterial, rotation?: Vec3): Part => ({ shape: 'box', position, scale, material, rotation });
/** A wheel or drum: a cylinder lying across the vehicle (along z). */
const wheel = (x: number, r: number, width: number): Part => ({ shape: 'cylinder', position: [x, r, 0], scale: [2 * r, width, 2 * r], rotation: [Math.PI / 2, 0, 0], material: 'interior' });

const move = (parts: Part[], dx: number, dz: number, yaw = 0): Part[] =>
  parts.map((p) => {
    const q = placePart(p, yaw);
    return { ...q, position: [q.position[0] + dx, q.position[1], q.position[2] + dz] };
  });

/**
 * One site vehicle in its own frame: facing +x, centred on x = 0 and z = 0, wheels on the ground.
 * `clock` (seconds) animates moving parts: the excavator's arm, the mixer's drum, the pile rig's hammer.
 */
export function vehicleParts(id: VehicleId, clock: number): Part[] {
  const cab = (x: number): Part => box([x, 1.9, 0], [2.2, 2.6, 2.5], 'ruby');
  const axles = (xs: number[]) => xs.map((x) => wheel(x, 0.55, 2.5));
  switch (id) {
    case 'dump-truck':
      return [cab(3.2), box([-0.8, 2.1, 0], [5.6, 1.8, 2.5], 'gold'), box([0.4, 0.9, 0], [8, 0.4, 2.2], 'interior'), ...axles([3.2, -0.6, -2.6])];
    case 'mixer': {
      const spin = clock * 2;
      return [
        cab(3.2),
        box([0.4, 0.9, 0], [8, 0.4, 2.2], 'interior'),
        { shape: 'cylinder', position: [-0.8, 2.6, 0], scale: [2.4, 5.2, 2.4], rotation: [spin, 0, Math.PI / 2 - 0.25], material: 'steel' },
        ...axles([3.2, -0.6, -2.6]),
      ];
    }
    case 'flatbed':
      return [
        cab(4.2),
        box([-0.4, 1.2, 0], [8.4, 0.4, 2.5], 'interior'),
        box([-0.4, 1.7, -0.6], [7.6, 0.6, 0.5], 'girder'),
        box([-0.4, 1.7, 0.6], [7.6, 0.6, 0.5], 'girder'),
        box([-0.4, 2.3, 0], [7.6, 0.6, 0.5], 'girder'),
        ...axles([4.2, -2.4, -3.6]),
      ];
    case 'excavator': {
      // The arm dips and lifts about every three seconds.
      const dip = 0.35 * Math.sin(clock * 2);
      const shoulder: Vec3 = [1.2, 2.6, 0];
      const elbow: Vec3 = [1.2 + 4.2 * Math.cos(0.7 + dip), 2.6 + 4.2 * Math.sin(0.7 + dip), 0];
      const bucket: Vec3 = [elbow[0] + 2.2, Math.max(0.6, elbow[1] - 3.2 - 1.5 * dip), 0];
      return [
        box([0, 0.5, 0], [4.6, 1, 3], 'interior'),
        box([-0.4, 1.8, 0], [3.6, 1.6, 2.6], 'gold'),
        box([0.9, 2.9, 0.7], [1.2, 1.2, 1], 'interior'),
        strutPart(shoulder, elbow, 0.6, 'gold'),
        strutPart(elbow, bucket, 0.45, 'gold'),
        box([bucket[0], bucket[1], 0], [1.2, 1, 1.2], 'interior'),
      ];
    }
    case 'pile-rig': {
      // The hammer rises slowly and drops.
      const lift = (clock * 0.5) % 1;
      return [
        box([0, 0.5, 0], [5, 1, 3.2], 'interior'),
        box([-0.6, 1.9, 0], [3.4, 1.8, 2.6], 'gold'),
        box([2, 13, 0], [0.8, 24, 0.8], 'gold'),
        box([2.6, 4 + lift * 16, 0], [1.2, 2.5, 1.2], 'interior'),
        strutPart([-1.5, 2.8, 0], [2, 18, 0], 0.3, 'gold'),
      ];
    }
  }
}

/** The tower crane, standing beside the core with its jib at height `top`; `slew` turns the jib (radians). */
export function craneParts(design: Design, top: number, slew: number): Part[] {
  const slices = floorSlices(design);
  const slice = slices[Math.min(slices.length - 1, Math.max(0, Math.floor(top / FLOOR_HEIGHT) - 1))];
  const core = 0.3 * Math.min(slice.width, slice.depth);
  const [mx, , mz] = rotateYXZ([core / 2 + 1.6, 0, 0], [0, slice.rotation, 0]);
  const { width, depth } = plateDims(design);
  const reach = Math.min(60, Math.max(25, 0.9 * Math.max(width, depth)));
  const jib: Part[] = [
    box([reach / 2, 1, 0], [reach, 1.2, 1.2], 'gold'),
    box([-0.15 * reach, 1, 0], [0.3 * reach, 1.2, 1.2], 'gold'),
    box([-0.3 * reach + 1.5, 0.2, 0], [3, 2.5, 2.5], 'concrete'),
    box([0, -1.2, 1.4], [2.4, 2.4, 2.4], 'steel'),
    { shape: 'pyramid', position: [0, 4, 0], scale: [2, 5, 2], material: 'gold' },
    strutPart([0.7 * reach, 0.4, 0], [0.7 * reach, -12, 0], 0.12, 'girder'),
    box([0.7 * reach, -12.6, 0], [1, 1.2, 1], 'interior'),
  ];
  return [
    box([mx, top / 2, mz], [1.8, top, 1.8], 'gold'),
    ...move(jib, mx, mz, slew).map((p) => ({ ...p, position: [p.position[0], p.position[1] + top, p.position[2]] as Vec3 })),
  ];
}

/**
 * The crane and the vehicles on site at this moment, in building coordinates. Trucks park and edge
 * back and forth in front of the tower; the excavator digs at the front of the pit; the pile rig works
 * across the footprint.
 */
export function constructionProps(design: Design, state: ConstructionState, clock: number): Part[] {
  const { width, depth } = plateDims(design);
  const parts: Part[] = [];
  if (state.crane.up && state.crane.top > 0) parts.push(...craneParts(design, state.crane.top, 0.6 * Math.sin(clock * 0.25)));
  state.vehicles.forEach((id, i) => {
    const local = vehicleParts(id, clock + i);
    if (id === 'excavator') parts.push(...move(local, -width / 4, depth / 2 + 5, Math.PI / 2));
    else if (id === 'pile-rig') parts.push(...move(local, (Math.sin(clock * 0.4) * width) / 3, depth / 2 - 4, Math.PI / 2));
    else parts.push(...move(local, -12 + i * 13 + 2.5 * Math.sin(clock * 0.5 + i), depth / 2 + 8));
  });
  return parts;
}
```

- [ ] **Step 4: Run the tests and type-check**

Run: `npx vitest run src/scene/construction/props.test.ts`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  41 passed (41)`, `Tests  309 passed (309)`.

- [ ] **Step 5: Commit**

```bash
git add src/scene/construction/props.test.ts src/scene/construction/props.ts
git commit -m "feat: tower crane and site vehicles

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```

---

### Task 6: The tower and its foundation, partly built

`Building` takes an optional `reveal`: it draws only the lowest floors (by setting the instanced meshes' `count`), hides the exposed bracing (the skeleton shows it while building), adds ornaments and the crown from the bottom up as `reveal.crown` goes from 0 to 1, shows amenities from halfway, and switches on window lights only below `litFloors`, even by day when `lights` is set. `FoundationView` takes `dig` and `built`: a dark hole opens, piles or caissons are driven a few at a time, then the slab or pile cap is poured and the hole fills. With neither prop, both components behave exactly as before.

**Files:**
- Create: `src/scene/FoundationView.test.tsx`
- Modify: `src/scene/Building.test.tsx`
- Modify: `src/scene/FoundationView.tsx`
- Modify: `src/scene/Building.tsx`

**Interfaces:**
- Consumes: Task 2: `FOUNDATION_SPACING`. Existing: `nightWindowAttributes`, `partBounds`.
- Produces:
  - `BuildingReveal { floors; crown; litFloors; lights }` and `<Building site design night? reveal? />`.
  - `<FoundationView site design dig? built? />` (both default to 1). Named meshes: `pit`, `foundation-slab`, `shaft`.

- [ ] **Step 1: Write the failing tests**

`src/scene/FoundationView.test.tsx` (new):

```tsx
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { describe, expect, it } from 'vitest';
import { designFor } from '../sim/testUtils';
import type { FoundationType } from '../sim/types';
import { FoundationView } from './FoundationView';

const named = async (el: React.ReactElement, name: string) => {
  const r = await ReactThreeTestRenderer.create(el);
  const n = r.scene.findAll((x) => x.props.name === name).length;
  await r.unmount();
  return n;
};

describe('<FoundationView />', () => {
  it('shows the whole foundation and no hole once built', async () => {
    for (const foundation of ['mat', 'raft', 'piles', 'caissons'] as FoundationType[]) {
      const { site, design } = designFor('chicago', { foundation });
      expect(await named(<FoundationView site={site} design={design} />, 'foundation-slab'), foundation).toBe(1);
      expect(await named(<FoundationView site={site} design={design} />, 'pit'), foundation).toBe(0);
    }
  });

  it('shows the hole while digging, before any foundation', async () => {
    const { site, design } = designFor('chicago', { foundation: 'mat' });
    expect(await named(<FoundationView site={site} design={design} dig={0.5} built={0} />, 'pit')).toBe(1);
    expect(await named(<FoundationView site={site} design={design} dig={0.5} built={0} />, 'foundation-slab')).toBe(0);
  });

  it('drives piles a few at a time, then pours the cap on top', async () => {
    const { site, design } = designFor('chicago', { foundation: 'piles', shape: 'square', plateWidth: 36 });
    const all = await named(<FoundationView site={site} design={design} />, 'shaft');
    expect(all).toBe(36);
    const half = await named(<FoundationView site={site} design={design} built={0.35} />, 'shaft');
    expect(half).toBeGreaterThan(10);
    expect(half).toBeLessThan(all);
    expect(await named(<FoundationView site={site} design={design} built={0.35} />, 'foundation-slab')).toBe(0);
    expect(await named(<FoundationView site={site} design={design} built={0.9} />, 'foundation-slab')).toBe(1);
  });
});
```

In `src/scene/Building.test.tsx`:

Replace:

```tsx
  });
});
```

with:

```tsx
  });
});

describe('<Building reveal />', () => {
  it('during construction shows only the finished floors, no bracing, and no crown or ornaments yet', async () => {
    const { site, design } = designFor('chicago', { floors: 30, exposedStructure: true, ornaments: ['stone-ribs'], crown: 'spire' });
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} reveal={{ floors: 12, crown: 0, litFloors: 0, lights: false }} />);
    expect((r.scene.findAll((n) => n.props.name === 'body')[0].instance as THREE.InstancedMesh).count).toBe(12);
    expect((r.scene.findAll((n) => n.props.name === 'slabs')[0].instance as THREE.InstancedMesh).count).toBe(12);
    expect(instanceTotal(r, 'bracing')).toBe(0);
    expect(instanceTotal(r, 'crown')).toBe(0);
    expect(instanceTotal(r, 'ornaments')).toBe(0);
  });

  it('adds ornaments and the crown from the bottom up as the crown stage plays', async () => {
    const { site, design } = designFor('chicago', { floors: 30, ornaments: ['stone-ribs', 'rusticated-base'], ornament: 'high', crown: 'spire' });
    const at = async (crown: number) => {
      const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} reveal={{ floors: 30, crown, litFloors: 0, lights: false }} />);
      const n = { crown: instanceTotal(r, 'crown'), ornaments: instanceTotal(r, 'ornaments') };
      await r.unmount();
      return n;
    };
    const half = await at(0.5);
    const full = await at(1);
    expect(half.ornaments).toBeGreaterThan(0);
    expect(half.ornaments + half.crown).toBeLessThan(full.ornaments + full.crown);
    expect(full).toEqual({ crown: crownParts(design).length, ornaments: ornamentParts(design).length });
  });

  it('switches the lights on only up to the lit floors', async () => {
    const { site, design } = designFor('chicago', { floors: 20, useMix: { retail: 0, office: 100, hotel: 0, residential: 0 } });
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} reveal={{ floors: 20, crown: 1, litFloors: 8, lights: true }} />);
    const body = r.scene.findAll((n) => n.props.name === 'body')[0].instance as THREE.InstancedMesh;
    const lit = body.geometry.getAttribute('aLit').array as Float32Array;
    expect(Array.from(lit.slice(0, 8)).every((v) => v > 0)).toBe(true);
    expect(Array.from(lit.slice(8)).every((v) => v === 0)).toBe(true);
  });
});
```


- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/scene/FoundationView.test.tsx src/scene/Building.test.tsx`

Expected: FAIL — the new FoundationView tests and the three `<Building reveal />` tests fail (no `pit` or `foundation-slab` names; `reveal` is ignored).

- [ ] **Step 3: Rewrite `src/scene/FoundationView.tsx`**

Replace the whole file with:

```tsx
import { FOUNDATION_SPACING } from '../sim/construction/foundation';
import { plateDims } from '../sim/geometry';
import type { Design, Site } from '../sim/types';
import { lotCenter, soilDepthShown } from './layout';

const CONCRETE = '#b8b4ac';
const PIT = '#3b3127';
/** While building piles or caissons, this share of the foundation stage drives the shafts; the cap is poured after. */
const SHAFT_SHARE = 0.7;

/** Positions of piles or caissons on a grid under the footprint. */
export function shaftGrid(width: number, depth: number, spacing: number): [number, number][] {
  const out: [number, number][] = [];
  const nx = Math.max(1, Math.floor(width / spacing));
  const nz = Math.max(1, Math.floor(depth / spacing));
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) out.push([(i + 0.5) * (width / nx) - width / 2, (j + 0.5) * (depth / nz) - depth / 2]);
  return out;
}

/**
 * The foundation under the lot, seen through the soil cutaway. During construction `dig` (0..1) opens the
 * hole and `built` (0..1) builds the foundation into it: shafts driven a few at a time, then the slab poured.
 */
export function FoundationView({ site, design, dig = 1, built = 1 }: { site: Site; design: Design; dig?: number; built?: number }) {
  const [lx, lz] = lotCenter(site);
  const { width, depth } = plateDims(design);
  const soil = site.foundation[design.foundation];
  const reach = Math.min(soil.depth, soilDepthShown(site));
  const slab = design.foundation === 'raft' ? reach : 3;
  const shafts =
    design.foundation === 'piles'
      ? shaftGrid(width, depth, FOUNDATION_SPACING.piles)
      : design.foundation === 'caissons'
        ? shaftGrid(width, depth, FOUNDATION_SPACING.caissons)
        : [];
  const radius = design.foundation === 'caissons' ? 1.6 : 0.5;
  const shaftLength = Math.max(1, reach - slab);
  // How far along the shafts and the slab are.
  const shaftProgress = shafts.length ? Math.min(1, built / SHAFT_SHARE) : 1;
  const slabProgress = shafts.length ? Math.max(0, (built - SHAFT_SHARE) / (1 - SHAFT_SHARE)) : built;
  const driven = shaftProgress * shafts.length;
  const slabHeight = slab * Math.min(1, slabProgress);
  const hole = built < 1 ? slab * dig - slabHeight : 0;
  return (
    <group name="foundation" position={[lx, -1, lz]}>
      {hole > 0.01 && (
        <mesh name="pit" position={[0, -slab * dig + slabHeight + hole / 2, 0]}>
          <boxGeometry args={[width + 6, hole, depth + 6]} />
          <meshStandardMaterial color={PIT} />
        </mesh>
      )}
      {slabHeight > 0.01 && (
        <mesh name="foundation-slab" position={[0, -slab + slabHeight / 2, 0]}>
          <boxGeometry args={[width + 4, slabHeight, depth + 4]} />
          <meshStandardMaterial color={CONCRETE} />
        </mesh>
      )}
      {shafts.slice(0, Math.ceil(driven)).map(([x, z], i) => {
        // The last shaft is part-way down; the rest are driven to full depth.
        const length = shaftLength * Math.min(1, driven - i);
        return (
          <mesh key={`${x},${z}`} name="shaft" position={[x, -slab - length / 2, z]}>
            <cylinderGeometry args={[radius, radius, length, 8]} />
            <meshStandardMaterial color={CONCRETE} />
          </mesh>
        );
      })}
    </group>
  );
}
```

- [ ] **Step 4: Edit `src/scene/Building.tsx`**

Replace:

```tsx
import { PartsMesh } from './parts/PartsMesh';

function Instanced({ geometry, items, color, name }: { geometry: THREE.BufferGeometry; items: BoxInstance[]; color: string; name: string }) {
  const ref = useRef<THREE.InstancedMesh>(null);
```

with:

```tsx
import { PartsMesh } from './parts/PartsMesh';
import { partBounds, type Part } from '../sim/parts';

function Instanced({ geometry, items, color, name, count }: { geometry: THREE.BufferGeometry; items: BoxInstance[]; color: string; name: string; count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
```

Replace:

```tsx
    mesh.computeBoundingSphere();
  }, [items]);
  return (
```

with:

```tsx
    mesh.computeBoundingSphere();
    mesh.count = Math.min(items.length, count ?? items.length);
  }, [items, count]);
  return (
```

Replace:

```tsx

/** The glazed part of every floor, wearing the painted facade tile; windows light up at night. */
function Body({ design, night }: { design: Design; night: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
```

with:

```tsx

/**
 * The glazed part of every floor, wearing the painted facade tile; windows light up at night.
 * During construction only the lowest `floors` are drawn, and only floors below `litFloors` light up.
 */
function Body({ design, night, floors, litFloors }: { design: Design; night: boolean; floors?: number; litFloors?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
```

Replace:

```tsx
    mesh.computeBoundingSphere();
  }, [items, geometry]);
  return <instancedMesh key={items.length} name="body" ref={ref} args={[geometry, material, items.length]} />;
```

with:

```tsx
    mesh.computeBoundingSphere();
    mesh.count = Math.min(items.length, floors ?? items.length);
  }, [items, geometry, floors]);
  useLayoutEffect(() => {
    const attr = geometry.getAttribute('aLit') as THREE.InstancedBufferAttribute;
    const base = nightWindowAttributes(design).lit;
    for (let i = 0; i < base.length; i++) attr.array[i] = litFloors === undefined || i < litFloors ? base[i] : 0;
    attr.needsUpdate = true;
  }, [geometry, design, litFloors]);
  return <instancedMesh key={items.length} name="body" ref={ref} args={[geometry, material, items.length]} />;
```

Replace:

```tsx

export function Building({ site, design, night = false }: { site: Site; design: Design; night?: boolean }) {
  const [lx, lz] = lotCenter(site);
```

with:

```tsx

/** How much of the finished tower to show while it is being built. */
export interface BuildingReveal {
  /** Finished floors shown, from the ground up. */
  floors: number;
  /** 0..1: ornaments and crown appear from the bottom up; amenities from halfway. */
  crown: number;
  /** Floors whose windows can light up. */
  litFloors: number;
  /** Light the windows even by day (the opening stage). */
  lights: boolean;
}

/** Parts whose bottom is below `share` of the way up the whole set. */
function upTo(parts: Part[], share: number): Part[] {
  if (share >= 1) return parts;
  if (share <= 0 || parts.length === 0) return [];
  const bottoms = parts.map((p) => partBounds(p).min[1]);
  const top = Math.max(...parts.map((p) => partBounds(p).max[1]));
  return parts.filter((_, i) => bottoms[i] <= share * top);
}

export function Building({ site, design, night = false, reveal }: { site: Site; design: Design; night?: boolean; reveal?: BuildingReveal }) {
  const [lx, lz] = lotCenter(site);
```

Replace:

```tsx
  const bracing = useMemo(() => bracingParts(design), [design]);
  const look = { palette: design.palette, plan: design.shape, night };
  return (
    <group name="building" position={[lx, 0, lz]}>
      <Body design={design} night={night} />
      <Instanced name="slabs" geometry={geometry} items={slabs} color={design.palette.accent} />
      <PartsMesh name="crown" parts={crown} {...look} />
      <PartsMesh name="ornaments" parts={ornaments} {...look} />
      <PartsMesh name="bracing" parts={bracing} {...look} />
      <Amenities design={design} geometry={geometry} />
    </group>
```

with:

```tsx
  const bracing = useMemo(() => bracingParts(design), [design]);
  const share = reveal ? reveal.crown : 1;
  const top = useMemo(() => {
    if (share >= 1) return { crown, ornaments };
    const shown = new Set(upTo([...ornaments, ...crown], share));
    return { crown: crown.filter((p) => shown.has(p)), ornaments: ornaments.filter((p) => shown.has(p)) };
  }, [ornaments, crown, share]);
  const look = { palette: design.palette, plan: design.shape, night };
  return (
    <group name="building" position={[lx, 0, lz]}>
      <Body design={design} night={night || !!reveal?.lights} floors={reveal?.floors} litFloors={reveal?.litFloors} />
      <Instanced name="slabs" geometry={geometry} items={slabs} color={design.palette.accent} count={reveal?.floors} />
      <PartsMesh name="crown" parts={top.crown} {...look} />
      <PartsMesh name="ornaments" parts={top.ornaments} {...look} />
      {/* While building, exposed bracing is part of the bare structure instead. */}
      <PartsMesh name="bracing" parts={reveal ? [] : bracing} {...look} />
      {share > 0.5 && <Amenities design={design} geometry={geometry} />}
    </group>
```

- [ ] **Step 5: Run the tests and type-check**

Run: `npx vitest run src/scene/FoundationView.test.tsx src/scene/Building.test.tsx`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  42 passed (42)`, `Tests  315 passed (315)`.

- [ ] **Step 6: Commit**

```bash
git add src/scene/FoundationView.test.tsx src/scene/Building.test.tsx src/scene/FoundationView.tsx src/scene/Building.tsx
git commit -m "feat: show the tower and its foundation partly built

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```

---

### Task 7: The construction view: playback, camera and the main scene

`ConstructionScene` draws one moment: the tower revealed to the facade height, the foundation, the visible skeleton and the props. `visibleStructure` decides which skeleton parts show: each role up to its own height (core, frame or slabs), minus whatever is already inside the finished facade. `ConstructionView` plays the current stage: progress lives in a ref advanced in `useFrame` (capped at 0.1 s a frame), restarts whenever `stageRun` changes, calls `finishStage` at the end, and redraws the site and the counters every 0.05 s. `StageCamera` eases to each stage's framing over a second and gives way as soon as the player orbits. `Scene` shows `ConstructionView` in place of the normal tower and foundation while building.

**Files:**
- Create: `src/scene/construction/reveal.test.ts`
- Create: `src/scene/construction/ConstructionView.test.tsx`
- Create: `src/scene/construction/reveal.ts`
- Create: `src/scene/construction/ConstructionView.tsx`
- Modify: `src/scene/Scene.tsx`

**Interfaces:**
- Consumes: Tasks 1–6: `constructionState`, `structureParts`, `StructurePart`, `constructionProps`, `Building` with `reveal`, `FoundationView` with `dig`/`built`, store `buildStage`/`stageRun`/`stageDone`/`finishStage`, `setBuildProgress`. Existing: `cameraFrame`, `lotCenter`, `PartsMesh`.
- Produces:
  - `src/scene/construction/reveal.ts`: `STAGE_SECONDS` (`[6, 8, 15, 8, 8, 8]`), `visibleStructure(parts, state): Part[]`, `stageFrame(site, design, analysis, stage): CameraFrame`.
  - `src/scene/construction/ConstructionView.tsx`: `<ConstructionScene site design parts state clock night />` (groups named `building`, `skeleton`, `site-props`) and `<ConstructionView site design analysis night />`.

- [ ] **Step 1: Write the failing tests**

`src/scene/construction/reveal.test.ts` (new):

```ts
import { describe, expect, it } from 'vitest';
import { analyze } from '../../sim/analysis';
import { constructionState } from '../../sim/construction/stages';
import { designFor } from '../../sim/testUtils';
import { cameraFrame, lotCenter } from '../layout';
import { structureParts } from '../structure/structureParts';
import { STAGE_SECONDS, stageFrame, visibleStructure } from './reveal';

const setup = (patch = {}) => {
  const { site, design } = designFor('chicago', { floors: 40, ...patch });
  const analysis = analyze(site, design);
  return { site, design, analysis, parts: structureParts(design) };
};

describe('visibleStructure', () => {
  it('shows each kind of piece up to its own height, and nothing hidden inside the finished facade', () => {
    const { design, analysis, parts } = setup({ material: 'steel', system: 'core-outrigger' });
    const s = constructionState(design, analysis, 2, 0.6);
    const shown = visibleStructure(parts, s);
    const roleOf = new Map(parts.map((p) => [p.part, p]));
    expect(shown.length).toBeGreaterThan(0);
    for (const part of shown) {
      const p = roleOf.get(part)!;
      const limit = p.role === 'core' || p.role === 'wall' ? s.coreTop : p.role === 'slab' ? s.slabTop : s.frameTop;
      expect(p.top).toBeLessThanOrEqual(limit + 0.01);
      expect(p.top).toBeGreaterThan(s.facadeTop - 0.01);
    }
  });

  it('grows as the frame rises', () => {
    const { design, analysis, parts } = setup();
    const at = (t: number) => visibleStructure(parts, constructionState(design, analysis, 2, t)).length;
    expect(at(0)).toBe(0);
    expect(at(0.2)).toBeGreaterThan(0);
    expect(at(0.15)).toBeLessThanOrEqual(at(0.2));
  });

  it('keeps the exposed bracing, sets the isolators in the foundation stage and hangs the damper with the crown', () => {
    const { design, analysis, parts } = setup({ exposedStructure: true, baseIsolation: true, damping: 'tmd' });
    const isolators = parts.filter((p) => p.role === 'isolator').map((p) => p.part);
    const damper = parts.filter((p) => p.role === 'mass-damper').map((p) => p.part);
    const braces = parts.filter((p) => p.role === 'brace').map((p) => p.part);
    const has = (stage: number, t: number, list: typeof isolators) => {
      const shown = new Set(visibleStructure(parts, constructionState(design, analysis, stage, t)));
      return list.every((p) => shown.has(p));
    };
    expect(has(1, 0.5, isolators)).toBe(false);
    expect(has(1, 1, isolators)).toBe(true);
    expect(has(3, 1, damper)).toBe(false);
    expect(has(4, 1, damper)).toBe(true);
    expect(has(5, 1, braces)).toBe(true);
  });
});

describe('stageFrame', () => {
  it('looks low and close at the dig, up at the crown, and ends on the usual view', () => {
    const { site, design, analysis } = setup();
    const normal = cameraFrame(site, analysis.tipHeightM);
    const dig = stageFrame(site, design, analysis, 0);
    expect(dig.target[1]).toBeLessThan(0);
    expect(Math.hypot(dig.position[0] - dig.target[0], dig.position[2] - dig.target[2])).toBeLessThan(
      Math.hypot(normal.position[0] - normal.target[0], normal.position[2] - normal.target[2]),
    );
    expect(stageFrame(site, design, analysis, 4).target[1]).toBeCloseTo(analysis.heightM * 0.85, 0);
    expect(stageFrame(site, design, analysis, 5)).toEqual(normal);
    expect(dig.target[2]).toBeCloseTo(lotCenter(site)[1], 0);
  });

  it('gives every stage a time to play', () => {
    expect(STAGE_SECONDS).toEqual([6, 8, 15, 8, 8, 8]);
  });
});
```

`src/scene/construction/ConstructionView.test.tsx` (new):

```tsx
import ReactThreeTestRenderer from '@react-three/test-renderer';
import type * as THREE from 'three';
import { beforeEach, describe, expect, it } from 'vitest';
import { analyze } from '../../sim/analysis';
import { constructionState } from '../../sim/construction/stages';
import { designFor } from '../../sim/testUtils';
import { useBuildProgress } from '../../state/buildProgress';
import { selectDesign, useGame } from '../../state/store';
import { getSite } from '../../sim/sites';
import { structureParts } from '../structure/structureParts';
import { ConstructionScene, ConstructionView } from './ConstructionView';
import { constructionProps } from './props';
import { visibleStructure } from './reveal';

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;
const instanceTotal = (r: Renderer, name: string) =>
  r.scene
    .findAll((n) => n.props.name === name)[0]
    .findAll((n) => (n.instance as THREE.InstancedMesh).isInstancedMesh === true)
    .reduce((s, n) => s + (n.instance as THREE.InstancedMesh).count, 0);

describe('<ConstructionScene />', () => {
  it('draws every stage, start to finish, with the bare structure and the props on site', async () => {
    const { site, design } = designFor('chicago', { floors: 40, material: 'steel', system: 'core-outrigger', foundation: 'caissons', damping: 'tmd', baseIsolation: true, exposedStructure: true, amenities: ['helipad'] });
    const analysis = analyze(site, design);
    const parts = structureParts(design);
    for (let stage = 0; stage < 6; stage++)
      for (const t of [0, 0.5, 1]) {
        const state = constructionState(design, analysis, stage, t);
        const r = await ReactThreeTestRenderer.create(<ConstructionScene site={site} design={design} parts={parts} state={state} clock={1} night={false} />);
        expect(instanceTotal(r, 'skeleton'), `${stage} ${t}`).toBe(visibleStructure(parts, state).length);
        expect(instanceTotal(r, 'site-props'), `${stage} ${t}`).toBe(constructionProps(design, state, 1).length);
        expect(r.scene.findAll((n) => n.props.name === 'building')).toHaveLength(1);
        await r.unmount();
      }
  });
});

describe('<ConstructionView /> playback', () => {
  beforeEach(() => {
    useGame.getState().newProject();
    useGame.getState().startProject('chicago', 'sandbox');
    useGame.getState().build();
  });

  it('plays the stage, reports its progress, and finishes it so Next can be pressed', async () => {
    const site = getSite('chicago');
    const design = selectDesign(useGame.getState())!;
    const r = await ReactThreeTestRenderer.create(<ConstructionView site={site} design={design} analysis={analyze(site, design)} night={false} />);
    await r.advanceFrames(30, 0.1);
    expect(useGame.getState().stageDone).toBe(false);
    expect(useBuildProgress.getState().t).toBeGreaterThan(0.3);
    await r.advanceFrames(40, 0.1);
    expect(useGame.getState().stageDone).toBe(true);
    expect(useBuildProgress.getState().t).toBe(1);
    // The next stage starts again from the beginning instead of finishing straight away.
    useGame.getState().nextStage();
    await r.advanceFrames(2, 0.1);
    expect(useGame.getState().stageDone).toBe(false);
    expect(useBuildProgress.getState().t).toBeLessThan(0.1);
  });

  it('caps a long pause between frames, so a hidden tab does not skip the stage', async () => {
    const site = getSite('chicago');
    const design = selectDesign(useGame.getState())!;
    const r = await ReactThreeTestRenderer.create(<ConstructionView site={site} design={design} analysis={analyze(site, design)} night={false} />);
    await r.advanceFrames(1, 30);
    expect(useGame.getState().stageDone).toBe(false);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/scene/construction/reveal.test.ts src/scene/construction/ConstructionView.test.tsx`

Expected: FAIL — `Failed to resolve import "./reveal"` and `"./ConstructionView"`.

- [ ] **Step 3: Create `src/scene/construction/reveal.ts`**

```ts
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
```

- [ ] **Step 4: Create `src/scene/construction/ConstructionView.tsx`**

```tsx
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { constructionState, type ConstructionState } from '../../sim/construction/stages';
import { FLOOR_HEIGHT } from '../../sim/geometry';
import type { Analysis, Design, Site } from '../../sim/types';
import { setBuildProgress } from '../../state/buildProgress';
import { useGame } from '../../state/store';
import { Building } from '../Building';
import { FoundationView } from '../FoundationView';
import { lotCenter } from '../layout';
import { PartsMesh } from '../parts/PartsMesh';
import { structureParts, type StructurePart } from '../structure/structureParts';
import { constructionProps } from './props';
import { STAGE_SECONDS, stageFrame, visibleStructure } from './reveal';

/** Redraw the site this often while a stage plays (seconds); the counters update at the same pace. */
const STEP = 0.05;

interface SceneProps {
  site: Site;
  design: Design;
  parts: StructurePart[];
  state: ConstructionState;
  /** Seconds since the view opened; animates the crane and vehicles. */
  clock: number;
  night: boolean;
}

/** The building site at one moment: the finished tower so far, the bare structure above it, the ground and the props. */
export function ConstructionScene({ site, design, parts, state, clock, night }: SceneProps) {
  const [lx, lz] = lotCenter(site);
  const floors = Math.floor(state.facadeTop / FLOOR_HEIGHT + 1e-6);
  // Recomputed only when a height crosses a floor, not on every redraw.
  const key = [state.coreTop, state.frameTop, state.slabTop, state.facadeTop].map((h) => Math.floor(h / FLOOR_HEIGHT + 1e-6)).join('|');
  const damperUp = state.crown >= 0.3;
  // `key`, `isolators` and `damperUp` are everything in `state` that changes the result.
  const skeleton = useMemo(() => visibleStructure(parts, state), [parts, key, state.isolators, damperUp]);
  const props = constructionProps(design, state, clock);
  const look = { palette: design.palette, plan: design.shape, night };
  return (
    <>
      <Building
        site={site}
        design={design}
        night={night}
        reveal={{ floors, crown: Math.round(state.crown * 20) / 20, litFloors: state.litFloors, lights: state.litFloors > 0 }}
      />
      <FoundationView site={site} design={design} dig={Math.round(state.dig * 40) / 40} built={Math.round(state.foundation * 40) / 40} />
      <group position={[lx, 0, lz]}>
        <PartsMesh name="skeleton" parts={skeleton} {...look} />
        <PartsMesh name="site-props" parts={props} {...look} />
      </group>
    </>
  );
}

/** Eases the camera to each stage's framing over about a second; stops if the player starts orbiting. */
function StageCamera({ site, design, analysis, stage }: { site: Site; design: Design; analysis: Analysis; stage: number }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const ease = useRef<{ from: THREE.Vector3; fromTarget: THREE.Vector3; to: THREE.Vector3; toTarget: THREE.Vector3; t: number } | null>(null);
  useEffect(() => {
    const f = stageFrame(site, design, analysis, stage);
    ease.current = {
      from: camera.position.clone(),
      fromTarget: controls ? controls.target.clone() : new THREE.Vector3(...f.target),
      to: new THREE.Vector3(...f.position),
      toTarget: new THREE.Vector3(...f.target),
      t: 0,
    };
    // Only on a new stage: the design (and so its analysis) is locked while building.
  }, [stage, camera, controls]);
  useEffect(() => {
    if (!controls) return;
    const stop = () => (ease.current = null);
    controls.addEventListener('start', stop);
    return () => controls.removeEventListener('start', stop);
  }, [controls]);
  useFrame((_, delta) => {
    const e = ease.current;
    if (!e) return;
    e.t = Math.min(1, e.t + Math.min(delta, 0.1));
    const k = e.t * e.t * (3 - 2 * e.t);
    camera.position.lerpVectors(e.from, e.to, k);
    if (controls) {
      controls.target.lerpVectors(e.fromTarget, e.toTarget, k);
      controls.update();
    } else camera.lookAt(e.toTarget);
    if (e.t >= 1) ease.current = null;
  });
  return null;
}

/**
 * Construction, played one stage at a time. Progress lives in a ref advanced every frame (outside React);
 * the site redraws and the sidebar's counters update about twenty times a second.
 */
export function ConstructionView({ site, design, analysis, night }: { site: Site; design: Design; analysis: Analysis; night: boolean }) {
  const stage = useGame((s) => s.buildStage);
  const parts = useMemo(() => structureParts(design), [design]);
  const t = useRef(useGame.getState().stageDone ? 1 : 0);
  const run = useRef(useGame.getState().stageRun);
  const clock = useRef(0);
  const lastDraw = useRef(-Infinity);
  const [snap, setSnap] = useState(() => ({ state: constructionState(design, analysis, stage, t.current), clock: 0 }));

  useFrame((_, delta) => {
    const g = useGame.getState();
    if (g.phase !== 'building') return;
    // A long gap (a hidden tab, a slow frame) counts as at most a tenth of a second.
    const dt = Math.min(delta, 0.1);
    clock.current += dt;
    if (g.stageRun !== run.current) {
      // A new stage, or a replay: start from the beginning.
      run.current = g.stageRun;
      t.current = g.stageDone ? 1 : 0;
    }
    if (!g.stageDone) {
      t.current = Math.min(1, t.current + dt / STAGE_SECONDS[g.buildStage]);
      if (t.current >= 1) g.finishStage();
      else if (clock.current - lastDraw.current >= STEP) setBuildProgress(t.current);
    }
    if (clock.current - lastDraw.current >= STEP) {
      lastDraw.current = clock.current;
      setSnap({ state: constructionState(design, analysis, g.buildStage, t.current), clock: clock.current });
    }
  });

  return (
    <>
      <ConstructionScene site={site} design={design} parts={parts} state={snap.state} clock={snap.clock} night={night} />
      <StageCamera site={site} design={design} analysis={analysis} stage={stage} />
    </>
  );
}
```

- [ ] **Step 5: Edit `src/scene/Scene.tsx`**

Replace:

```tsx
import { Building } from './Building';
import { FoundationView } from './FoundationView';
```

with:

```tsx
import { Building } from './Building';
import { ConstructionView } from './construction/ConstructionView';
import { FoundationView } from './FoundationView';
```

Replace:

```tsx
  const night = timeOfDay === 'night';
  const light = lighting(site, night);
```

with:

```tsx
  const night = timeOfDay === 'night';
  const building = useGame((s) => s.phase === 'building');
  const light = lighting(site, night);
```

Replace:

```tsx
        <Landmark kind={site.visuals.landmark} />
        <Building site={site} design={design} night={night} />
        <FoundationView site={site} design={design} />
        <OrbitControls makeDefault maxPolarAngle={Math.PI * 0.62} minDistance={40} maxDistance={2500} />
```

with:

```tsx
        <Landmark kind={site.visuals.landmark} />
        {building ? (
          <ConstructionView site={site} design={design} analysis={analysis} night={night} />
        ) : (
          <>
            <Building site={site} design={design} night={night} />
            <FoundationView site={site} design={design} />
          </>
        )}
        <OrbitControls makeDefault maxPolarAngle={Math.PI * 0.62} minDistance={40} maxDistance={2500} />
```

- [ ] **Step 6: Run the tests and type-check**

Run: `npx vitest run src/scene/construction/reveal.test.ts src/scene/construction/ConstructionView.test.tsx`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  44 passed (44)`, `Tests  323 passed (323)`.

- [ ] **Step 7: Commit**

```bash
git add src/scene/construction/reveal.test.ts src/scene/construction/ConstructionView.test.tsx src/scene/construction/reveal.ts src/scene/construction/ConstructionView.tsx src/scene/Scene.tsx
git commit -m "feat: construction view with stage playback and camera

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```

---

### Task 8: README and visual check

Tell players about building in stages, then watch it by eye.

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: a README paragraph about construction.

- [ ] **Step 1: Edit `README.md`**

Replace:

```markdown
In the game, the **🔍 Close-up** window (bottom-right of the 3D view) shows a piece of the tower in full detail. Use **Facade**, **Corner** and **Base** to switch, and drag to look around.
```

with:

```markdown
In the game, the **🔍 Close-up** window (bottom-right of the 3D view) shows a piece of the tower in full detail. Use **Facade**, **Corner** and **Base** to switch, and drag to look around.

Pressing **Build it!** builds the tower one stage at a time: digging, the foundation, the core and frame, the facade, the crown, then the interiors. Each stage explains what is happening and how it goes for your tower; press **Next** to move on, or **Skip to finished**. The bare structure you see while it rises depends on the structural system and material you chose.
```

- [ ] **Step 2: Check it by eye**

Run `npm run dev`, choose **Sandbox in Chicago**, and check:

- **Every stage, for one tower** (45 floors, Core + outriggers, Steel, Caissons, Tuned mass damper): press **Build it!** and watch each stage to the end before pressing **Next ▶**.
  - Stage 1: the camera looks into the soil cutaway from the front; the excavator digs and dump trucks edge back and forth.
  - Stage 2: caissons go down through the soil layers a few at a time, then the cap is poured; the pile rig works across the lot.
  - Stage 3: the concrete core climbs ahead, the steel cage follows with slabs 4 floors behind, the glass facade 8 floors behind that; the crane jumps up every 10 floors.
  - Stage 4: the facade closes in the top.
  - Stage 5: the camera rises to the top; the damper and crown appear; the crane drops down the core and disappears.
  - Stage 6: windows light up floor by floor; the trucks leave; **Open the building** shows the assessment and the Close-up returns.
  - The card's day and money counters run during each stage and end on the schedule's total days and the total cost.
- **Every system × material** (6 × 3), in the middle of stage 3: steel is a dark open cage, concrete pale and chunky, composite in between; the framed tube's tight columns, the bundled tube's interior rows, the diagrid's diamonds and the buttressed core's wing walls are all visible.
- **Every foundation** (mat, raft, piles, caissons), in stage 2.
- **Controls:** Replay restarts a stage; Skip to finished works from any stage; orbiting during a stage's camera move stops the move; New project during building returns to the map without asking.
- **Night:** toggle 🌙 during stage 3 and stage 6.
- **A heavy tower** (Shanghai, 150 floors, 80 m, Bundled tube, Concrete) plays stage 3 smoothly.
- **Console:** no errors.

- [ ] **Step 3: Run the tests and type-check**

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  44 passed (44)`, `Tests  323 passed (323)`.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: describe construction in the README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```
