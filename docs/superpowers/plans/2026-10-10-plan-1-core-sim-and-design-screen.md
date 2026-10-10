# Skyscraper Studio — Plan 1: Core Simulation & Design Screen

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A playable local web game where the player picks one of four real-city sites, designs a skyscraper with sidebar controls (styles, form, structure, foundation, facade, elevators, systems, uses, amenities) while seeing it in 3D on its site with live engineering gauges, then presses Build to get an engineering assessment (challenge stars or sandbox grades).

**Architecture:** Pure-TypeScript simulation (`src/sim/`) — a single catalog of parameters, styles, amenities, sites and rule-of-thumb coefficients drives a pure `analyze(site, design)` function, action validation, and brief scoring. A Zustand store (`src/state/`) holds the project, phase and an immutable design history (undo/redo, slider coalescing). React sidebar (`src/ui/`) and react-three-fiber scene (`src/scene/`) both read the store. In this plan Build jumps straight to the assessment; Plan 3 inserts the construction animation.

**Tech Stack:** Vite 8, React 19, TypeScript 5, three.js + @react-three/fiber 9 + @react-three/drei 10, Zustand 5, Vitest 5 + jsdom + Testing Library, @react-three/test-renderer 9.

**Spec:** `docs/superpowers/specs/2026-10-10-skyscraper-sim-design.md`

**Later plans (not in this one):** Plan 2 — design chat (Vite middleware `/api/design-chat` + Claude tool calls using `applyActions`). Plan 3 — construction animation (`building` phase driven by `analysis.schedule`). Plan 4 — completed-building overlays and people simulation.

**Provenance:** Every code block in this plan was run in a scratch prototype: all 102 tests pass, `tsc` is clean, and `vite build` succeeds. The coefficients were tuned so every challenge brief is solvable by its reference design and failed by the default design. If a number seems arbitrary, it is a deliberate rule of thumb documented in `coefficients.ts`; do not "fix" it without re-running the brief tests.

## Global Constraints

- Runs locally in a desktop browser via `npm run dev`; no hosting, no accounts.
- Target player age 12–15 (`detailLevel: 'standard'`); every player-facing control has a plain-language `explain` string. `advanced` is reserved and must stay a data filter (`minDetailLevel`), never a code fork.
- Results are directionally correct rules of thumb only — no CFD, FEA, or physics engine. All tunable numbers live in `src/sim/catalog/coefficients.ts`.
- Single catalog as source of truth: sidebar controls, validation (and later the LLM tool schema) are generated from `src/sim/catalog/`. Never hard-code a control list in UI code.
- `src/sim/` imports nothing from React, three, or `src/state`/`src/ui`/`src/scene`.
- Every design change goes through `applyActions` (store `dispatch`); no component mutates a design directly.
- Failure is a failed engineering assessment and poor score — no collapse animation.
- Floor-to-floor height is fixed at 4 m (`FLOOR_HEIGHT`).
- Units internally: metres, kN, kPa, USD, seconds, days.
- Use `npm` (not yarn/pnpm). Pin majors when installing: `react@19 react-dom@19 three @react-three/fiber@9 @react-three/drei@10 zustand@5`; dev: `vite@8 @vitejs/plugin-react@6 typescript@5 vitest@5`.
- Commit after every task, ending messages with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Extreme input combinations** (5 or 150 floors, 2 or 120 elevators, every shape × system × zoning, max taper, tiny plates) — `analyze` must return finite numbers, never NaN/Infinity, and the UI must not show "NaN". Pinned by the "robustness" test in Task 4.
2. **Degenerate geometry** (wedding-cake setbacks + 0.6 taper + 15 m plate + triangle + 120° twist) — floor slices must keep positive size and every shape/crown/amenity combination must render. Pinned in Task 3 (geometry) and Task 8 (`<Building />` sweep).
3. **Slider drags flooding undo history** — dragging a slider fires dozens of change events; the player expects one undo step per drag. Pinned by the coalescing tests in Task 7.
4. **Driving every use to 0%** via the use sliders — must be refused, leaving the last valid mix. Pinned in Task 5 (validation) and Task 10 (sidebar).
5. **Editing after Build** — once the design is locked, sliders, undo, redo and (later) chat must not change it. Pinned in Task 5 (phase lock), Task 7 (store) and Task 10 (sidebar).

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/test/setup.ts`, `src/ui/styles.css`, `src/ui/App.tsx` (placeholder, replaced in Task 11), `src/ui/App.test.tsx` (replaced in Task 11), `README.md`
- Modify: `.gitignore` (already exists with `.superpowers/`, `node_modules/`, `dist/`, `.env`; leave as is)

**Interfaces:**
- Produces: `npm run dev`, `npm test` (vitest run), `npm run typecheck`, `npm run build`. Global test setup with jest-dom matchers and auto-cleanup. Global CSS class names used by later UI tasks (see `styles.css`).

All work happens in the repo root `/Users/jaskonas/Documents/GitHub/skyscraper-sim` (already a git repo containing `docs/` and `.gitignore`).

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "skyscraper-studio",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.json && vite build",
    "typecheck": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install react@19 react-dom@19 three @react-three/fiber@9 @react-three/drei@10 zustand@5
npm install -D vite@8 @vitejs/plugin-react@6 typescript@5 vitest@5 jsdom @types/react@19 @types/react-dom@19 @types/three @testing-library/react @testing-library/jest-dom @testing-library/user-event @react-three/test-renderer@9
```
Expected: both complete without peer-dependency errors.

- [ ] **Step 3: Create config files**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals"]
  },
  "include": ["src", "vite.config.ts"]
}
```

`vite.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts'],
  },
});
```

`index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Skyscraper Studio</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './ui/styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/ui/styles.css`:

```css
:root {
  --bg: #11161c;
  --panel: #1b222b;
  --card: #232c37;
  --line: #334150;
  --text: #e6edf3;
  --muted: #93a1b0;
  --accent: #f0b429;
  --pass: #3fb950;
  --marginal: #e3b341;
  --fail: #f85149;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  color: var(--text);
  background: var(--bg);
}
* { box-sizing: border-box; }
body { margin: 0; }
button {
  font: inherit; color: var(--text); background: var(--card); border: 1px solid var(--line);
  border-radius: 6px; padding: 4px 10px; cursor: pointer;
}
button:hover:not(:disabled) { border-color: var(--accent); }
button:disabled { opacity: 0.4; cursor: default; }
select, input[type='range'] { width: 100%; }
select { font: inherit; background: var(--bg); color: var(--text); border: 1px solid var(--line); border-radius: 6px; padding: 3px; }
h1, h2, h3 { margin: 0; }
.muted { color: var(--muted); font-size: 0.85em; }
.label { color: var(--muted); font-size: 0.75em; text-transform: uppercase; letter-spacing: 0.06em; margin: 8px 0 2px; }

/* Site select */
.site-select { max-width: 1100px; margin: 0 auto; padding: 24px 16px 48px; }
.site-select-header h1 { font-size: 2rem; }
.site-select-header p { color: var(--muted); }
.world-map { width: 100%; height: auto; margin: 16px 0; }
.world-ocean { fill: #18324a; }
.world-grid { stroke: #24445f; stroke-width: 1; }
.world-pin { fill: var(--accent); stroke: #fff; stroke-width: 2; }
.world-label { fill: #fff; font-size: 14px; font-weight: 600; }
.site-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
.site-card { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 6px; }
.site-name { color: var(--accent); margin: 0; }
.site-fact { font-size: 0.9em; color: var(--muted); }
.site-actions { display: flex; flex-direction: column; gap: 8px; margin-top: auto; }
.brief-button { text-align: left; display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; }
.brief-button span { color: var(--muted); font-size: 0.85em; }
.sandbox-button { background: transparent; }

/* Game layout */
.game { display: grid; grid-template-columns: 380px 1fr; height: 100vh; }
.viewport { position: relative; min-width: 0; }
.viewport canvas { display: block; }
.sidebar { background: var(--panel); border-right: 1px solid var(--line); display: flex; flex-direction: column; min-height: 0; }
.sidebar-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; padding: 12px 14px; border-bottom: 1px solid var(--line); }
.sidebar-header h1 { font-size: 1.25rem; }
.header-buttons { display: flex; gap: 4px; flex-shrink: 0; }
.sidebar-scroll { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 10px; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; }
.card-title-row { display: flex; justify-content: space-between; align-items: center; }
.stars { color: var(--accent); font-size: 1.2em; letter-spacing: 2px; }
.req-list { list-style: none; padding: 0; margin: 4px 0; font-size: 0.9em; display: flex; flex-direction: column; gap: 3px; }
.req-list .unmet { color: var(--muted); }
.stats { margin: 0 0 8px; font-size: 0.85em; color: var(--muted); }
.gauge { margin: 6px 0; font-size: 0.85em; }
.gauge-top { display: flex; justify-content: space-between; }
.gauge-track { height: 6px; background: var(--bg); border-radius: 3px; overflow: hidden; margin-top: 3px; }
.gauge-fill { height: 100%; border-radius: 3px; }
.gauge-pass .gauge-fill { background: var(--pass); }
.gauge-marginal .gauge-fill { background: var(--marginal); }
.gauge-fail .gauge-fill { background: var(--fail); }
.style-badge { margin: 6px 0; color: var(--accent); font-size: 0.9em; }
.local-example { color: var(--accent); }
details.group > summary { cursor: pointer; font-weight: 600; }
.param { margin: 8px 0; }
.control-row { display: grid; grid-template-columns: 130px 1fr auto; gap: 8px; align-items: center; font-size: 0.9em; }
.value { color: var(--muted); font-variant-numeric: tabular-nums; min-width: 52px; text-align: right; }
.info { background: none; border: none; color: var(--muted); padding: 0 4px; }
.help { font-size: 0.82em; color: var(--muted); margin: 4px 0 0; }
.amenity { display: flex; gap: 8px; font-size: 0.85em; margin: 6px 0; align-items: flex-start; }
.build-bar { border-top: 1px solid var(--line); padding: 10px 14px; text-align: center; }
.build-button { width: 100%; background: var(--accent); color: #111; font-weight: 700; padding: 10px; border: none; }
.warning { color: var(--marginal); font-size: 0.85em; margin: 0 0 6px; }
.assessment h2 { margin-bottom: 6px; }
.verdict { font-weight: 700; }
.verdict.fail { color: var(--fail); }
.verdict.pass { color: var(--pass); }
.check-list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 6px; font-size: 0.88em; }
.check-list span { display: block; color: var(--muted); }
.grades td { padding: 2px 10px 2px 0; }
.grade { font-weight: 700; }
.grade-A, .grade-B { color: var(--pass); }
.grade-C, .grade-D { color: var(--marginal); }
.grade-F { color: var(--fail); }
.assessment-actions { display: flex; gap: 8px; margin-top: 10px; }
.soil-label { color: #fff; font-size: 11px; background: rgba(0, 0, 0, 0.45); padding: 1px 5px; border-radius: 3px; white-space: nowrap; pointer-events: none; }

@media (max-width: 800px) {
  .game { grid-template-columns: 1fr; grid-template-rows: 55vh 45vh; }
  .sidebar { order: 2; }
}
```


- [ ] **Step 4: Write the failing smoke test**

`src/ui/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the game title', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Skyscraper Studio' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `./App`.

- [ ] **Step 6: Add the placeholder App**

`src/ui/App.tsx`:

```tsx
export function App() {
  return <h1>Skyscraper Studio</h1>;
}
```

- [ ] **Step 7: Run tests, typecheck and build**

Run: `npm test && npm run build`
Expected: 1 test passes; typecheck clean; `dist/` produced.

- [ ] **Step 8: Write `README.md`**

```markdown
# Skyscraper Studio

A teaching game about designing and building skyscrapers. Pick a real-city site, design a tower, build it, and see how it performs.

## Run it

    npm install
    npm run dev

Then open the printed `http://localhost:5173` link.

## Develop

    npm test          # unit and component tests
    npm run typecheck
    npm run build

All engineering rules of thumb live in `src/sim/catalog/coefficients.ts`.
```

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src README.md
git commit -m "chore: scaffold Vite + React + three.js project

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Core types and catalog data (sites, styles, amenities, coefficients, design model)

**Files:**
- Create: `src/sim/types.ts`, `src/sim/catalog/coefficients.ts`, `src/sim/sites.ts`, `src/sim/catalog/styles.ts`, `src/sim/catalog/amenities.ts`, `src/sim/design.ts`, `src/sim/testUtils.ts`
- Test: `src/sim/design.test.ts`, `src/sim/catalog/catalog.test.ts`

**Interfaces:**
- Produces (used by every later task):
  - Types in `types.ts`: `Design`, `Site`, `SiteId`, `Analysis`, `Check`, `CheckId`, `CheckStatus`, `SchedulePhase`, `CostBreakdown`, `SeismicOutcome`, `DetailLevel`, all enum string unions, `USE_ORDER`.
  - `COEFFICIENTS` (readonly nested object).
  - `SITES: Record<SiteId, Site>`, `SITE_IDS: SiteId[]`, `getSite(id): Site`.
  - `STYLE_PRESETS: Record<StyleId, StylePreset>`, `STYLE_IDS`, type `StyleSettings`.
  - `AMENITIES: Record<AmenityId, AmenityDef>`, `AMENITY_IDS`.
  - `defaultDesign(site): Design`, `normalizeDesign(design, site): Design` (returns the same object if unchanged), `applyStylePreset(design, style): Design`, `isStyleModified(design): boolean`, `maxPlateWidth(site, {shape}): number`, `maxPlateDepth(site): number`.
  - Test helper `designFor(siteId, patch?) → { site, design }`.

- [ ] **Step 1: Create the types**

`src/sim/types.ts`:

```ts
export type DetailLevel = 'standard' | 'advanced';
export type SiteId = 'new-york' | 'tokyo' | 'chicago' | 'shanghai';
export type PlanShape = 'square' | 'rectangle' | 'circle' | 'triangle';
export type Setbacks = 'none' | 'few' | 'wedding-cake';
export type CrownType = 'flat' | 'spire' | 'stepped' | 'pointed' | 'sloped';
export type StructuralSystem =
  | 'rigid-frame'
  | 'framed-tube'
  | 'core-outrigger'
  | 'bundled-tube'
  | 'diagrid'
  | 'buttressed-core';
export type Material = 'steel' | 'concrete' | 'composite';
export type Damping = 'none' | 'tmd' | 'viscous';
export type FoundationType = 'mat' | 'raft' | 'piles' | 'caissons';
export type FacadeType = 'glass' | 'masonry' | 'precast' | 'metal';
export type ElevatorZoning = 'single' | 'two-zone' | 'sky-lobby';
export type SystemsGrade = 'standard' | 'efficient' | 'green';
/** Stacking order is fixed bottom-to-top in this order. */
export type UseType = 'retail' | 'office' | 'hotel' | 'residential';
export type AmenityId = 'helipad' | 'pool' | 'observation-deck' | 'sky-garden';
export type StyleId =
  | 'chicago-school'
  | 'gothic-revival'
  | 'art-deco'
  | 'international'
  | 'brutalist'
  | 'postmodern'
  | 'high-tech'
  | 'neo-futurist';
export type Ornament = 'none' | 'low' | 'high';

export const USE_ORDER: UseType[] = ['retail', 'office', 'hotel', 'residential'];

export interface Palette {
  body: string;
  accent: string;
  glass: string;
}

export interface Design {
  /** The preset most recently applied. */
  style: StyleId;
  floors: number;
  /** Metres. Plate width (x). */
  plateWidth: number;
  /** Metres. Only used when shape is 'rectangle'; otherwise depth = width. */
  plateDepth: number;
  shape: PlanShape;
  setbacks: Setbacks;
  /** 0..0.6 — fraction the top floor is narrower than the base. */
  taper: number;
  /** Degrees of rotation from bottom to top, 0..120. */
  twist: number;
  crown: CrownType;
  /** Percentages per use; normalized when used. */
  useMix: Record<UseType, number>;
  system: StructuralSystem;
  material: Material;
  exposedStructure: boolean;
  damping: Damping;
  baseIsolation: boolean;
  foundation: FoundationType;
  facade: FacadeType;
  /** 0.2..0.95 */
  windowRatio: number;
  elevators: number;
  zoning: ElevatorZoning;
  systemsGrade: SystemsGrade;
  amenities: AmenityId[];
  palette: Palette;
  ornament: Ornament;
}

export interface SoilLayer {
  name: string;
  /** Metres. */
  thickness: number;
  color: string;
}

export interface FoundationSoilData {
  /** kPa the foundation type can safely carry on this site. */
  capacity: number;
  /** Settlement in cm when loaded to 100% of capacity. */
  settlementCm: number;
  /** Multiplier on the base foundation cost (deeper piles cost more). */
  costFactor: number;
  /** Depth in metres the foundation reaches (for drawing). */
  depth: number;
}

export interface Site {
  id: SiteId;
  name: string;
  city: string;
  challenge: string;
  fact: string;
  lookUp: string[];
  mapPos: { lat: number; lon: number };
  /** Metres. */
  lot: { width: number; depth: number };
  /** Design wind speed, m/s. */
  windSpeed: number;
  /** Design peak ground acceleration, in g. */
  seismicHazard: number;
  /** 0..1 relative heating and cooling demand. */
  climate: { heating: number; cooling: number };
  snow: boolean;
  soil: SoilLayer[];
  /** Metres below ground. */
  bedrockDepth: number;
  foundation: Record<FoundationType, FoundationSoilData>;
  costMultiplier: number;
  visuals: {
    sky: string;
    ground: string;
    neighborColors: string[];
    /** Min/max neighbor height in metres. */
    neighborHeight: [number, number];
    landmark: string;
  };
}

export type CheckStatus = 'pass' | 'marginal' | 'fail';
export type CheckId =
  | 'windStrength'
  | 'windComfort'
  | 'seismic'
  | 'foundation'
  | 'elevators'
  | 'energy';

export interface Check {
  id: CheckId;
  label: string;
  status: CheckStatus;
  value: number;
  limit: number;
  unit: string;
  message: string;
}

export type SchedulePhaseId =
  | 'excavation'
  | 'foundation'
  | 'structure'
  | 'facade'
  | 'crown'
  | 'fitout';

export interface SchedulePhase {
  id: SchedulePhaseId;
  label: string;
  /** Day the phase starts (phases overlap). */
  startDay: number;
  days: number;
}

export interface CostBreakdown {
  structure: number;
  foundation: number;
  facade: number;
  interiors: number;
  systems: number;
  elevators: number;
  damping: number;
  isolation: number;
  amenities: number;
  total: number;
}

export type SeismicOutcome = 'operational' | 'damaged' | 'fails';

export interface Analysis {
  heightM: number;
  gfa: number;
  footprint: number;
  weightKN: number;
  slenderness: number;
  wind: { driftRatio: number; accelMg: number; comfortLimitMg: number };
  seismic: { periodS: number; ratio: number; outcome: SeismicOutcome };
  foundation: {
    pressureKPa: number;
    capacityKPa: number;
    utilization: number;
    settlementCm: number;
  };
  elevators: {
    population: number;
    peakDemand: number;
    avgWaitS: number;
    targetS: number;
    effectiveCars: number;
    maxUsefulCars: number;
  };
  energy: { euiKWhPerM2: number; annualCost: number };
  cost: CostBreakdown;
  schedule: { phases: SchedulePhase[]; totalDays: number };
  checks: Check[];
}
```


- [ ] **Step 2: Write the failing tests**

`src/sim/design.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { defaultDesign, maxPlateWidth, normalizeDesign } from './design';
import { SITES, SITE_IDS } from './sites';

describe('design', () => {
  it('default design fits on every lot', () => {
    for (const id of SITE_IDS) {
      const site = SITES[id];
      const d = defaultDesign(site);
      expect(d.plateWidth).toBeLessThanOrEqual(maxPlateWidth(site, d));
      expect(d.plateDepth).toBeLessThanOrEqual(site.lot.depth);
    }
  });

  it('shrinks the width when a rectangle becomes a square on a narrow lot', () => {
    const site = { ...SITES['new-york'], lot: { width: 50, depth: 30 } };
    const rect = normalizeDesign({ ...defaultDesign(site), shape: 'rectangle', plateWidth: 50, plateDepth: 30 }, site);
    expect(rect.plateWidth).toBe(50);
    const square = normalizeDesign({ ...rect, shape: 'square' }, site);
    expect(square.plateWidth).toBe(30);
  });

  it('returns the same object when nothing needs clamping', () => {
    const d = defaultDesign(SITES.chicago);
    expect(normalizeDesign(d, SITES.chicago)).toBe(d);
  });
});
```

`src/sim/catalog/catalog.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { applyStylePreset, defaultDesign, isStyleModified } from '../design';
import { SITES, SITE_IDS } from '../sites';
import type { FoundationType } from '../types';
import { AMENITIES, AMENITY_IDS } from './amenities';
import { STYLE_IDS, STYLE_PRESETS } from './styles';

describe('sites', () => {
  it('defines every foundation type with positive capacity', () => {
    const types: FoundationType[] = ['mat', 'raft', 'piles', 'caissons'];
    for (const id of SITE_IDS) {
      for (const t of types) expect(SITES[id].foundation[t].capacity).toBeGreaterThan(0);
      expect(SITES[id].soil.length).toBeGreaterThan(0);
    }
  });

  it('makes deep foundations stronger than a shallow mat everywhere', () => {
    for (const id of SITE_IDS) {
      const f = SITES[id].foundation;
      expect(Math.max(f.piles.capacity, f.caissons.capacity)).toBeGreaterThanOrEqual(f.mat.capacity);
    }
  });
});

describe('style presets', () => {
  it('every preset has a history card with examples', () => {
    for (const style of STYLE_IDS) {
      const p = STYLE_PRESETS[style];
      expect(p.summary.length).toBeGreaterThan(10);
      expect(p.why.length).toBeGreaterThan(10);
      expect(p.examples.length).toBeGreaterThan(0);
    }
  });

  it('marks a design modified once a style field changes', () => {
    const d = applyStylePreset(defaultDesign(SITES.chicago), 'art-deco');
    expect(isStyleModified(d)).toBe(false);
    expect(isStyleModified({ ...d, twist: 30 })).toBe(true);
    expect(isStyleModified({ ...d, floors: 99 })).toBe(false);
  });
});

describe('amenities', () => {
  it('every amenity has a label and explanation', () => {
    for (const id of AMENITY_IDS) {
      expect(AMENITIES[id].label.length).toBeGreaterThan(2);
      expect(AMENITIES[id].explain.length).toBeGreaterThan(10);
    }
  });
});
```


- [ ] **Step 3: Run them to verify they fail**

Run: `npx vitest run src/sim`
Expected: FAIL — cannot resolve `./design`, `../sites`, `./styles`, `./amenities`.

- [ ] **Step 4: Create the coefficients**

`src/sim/catalog/coefficients.ts`:

```ts
/**
 * Every rule-of-thumb number the analysis uses, in one place.
 * Each value is chosen to be directionally right and roughly plausible —
 * not engineering-grade. Comments say what real idea each one stands for.
 */
import type {
  AmenityId,
  Damping,
  FacadeType,
  FoundationType,
  Material,
  PlanShape,
  StructuralSystem,
  SystemsGrade,
  UseType,
} from '../types';

export const COEFFICIENTS = {
  weight: {
    /** Dead + live load per m² of floor, kN/m². Concrete floors are much heavier than steel. */
    materialKNPerM2: { steel: 7, composite: 8.5, concrete: 11 } satisfies Record<Material, number>,
    /** Facade weight spread per m² of floor, kN/m². Stone is heavy, glass is light. */
    facadeKNPerM2: { glass: 0.5, metal: 0.6, precast: 1.5, masonry: 2.5 } satisfies Record<FacadeType, number>,
    /** Exposed exterior bracing adds steel. */
    exposedStructureKNPerM2: 0.5,
    /** Amenities are concentrated weight near the top, kN. A rooftop pool is ~2,000 tonnes of water. */
    amenityKN: { helipad: 3000, pool: 20000, 'observation-deck': 2000, 'sky-garden': 6000 } satisfies Record<AmenityId, number>,
  },

  wind: {
    /** Overall scale so a normal 60-storey tower drifts about 1/1400 of its height. */
    driftScale: 0.001,
    /** Wind speed the formula is normalized to, m/s. Pressure grows with speed squared. */
    referenceWindSpeed: 45,
    /** Slenderness (height ÷ base width) a "normal" tower has. Sway grows with slenderness squared. */
    referenceSlenderness: 6,
    /** Drag coefficients: round shapes let wind slip around them. */
    dragByShape: { square: 1.3, rectangle: 1.3, circle: 0.7, triangle: 1.0 } satisfies Record<PlanShape, number>,
    /** Setbacks break up the wind vortices that make towers shake. */
    setbackFactor: { none: 1, few: 0.92, 'wedding-cake': 0.85 },
    /** A full 120° twist cuts wind response by this fraction (Shanghai Tower's trick). */
    twistMaxReduction: 0.25,
    /** Each unit of taper cuts wind response by this fraction (on top of the smaller area). */
    taperReduction: 0.3,
    /** Base stiffness by structural system. */
    systemStiffness: {
      'rigid-frame': 1.0,
      'framed-tube': 1.15,
      'core-outrigger': 1.25,
      'bundled-tube': 1.35,
      diagrid: 1.35,
      'buttressed-core': 1.4,
    } satisfies Record<StructuralSystem, number>,
    /** Storeys each system stays efficient up to. Above this, stiffness falls off fast. */
    systemEfficientUpTo: {
      'rigid-frame': 30,
      'framed-tube': 60,
      'core-outrigger': 100,
      'bundled-tube': 110,
      diagrid: 110,
      'buttressed-core': 170,
    } satisfies Record<StructuralSystem, number>,
    materialStiffness: { steel: 0.9, concrete: 1.1, composite: 1.2 } satisfies Record<Material, number>,
    exposedStructureStiffness: 1.15,
    /** Drift (top movement ÷ height) limits: 1/500 is safe, 1/400 is the edge. */
    driftPass: 1 / 500,
    driftMarginal: 1 / 400,
    /** Converts drift into a top-floor acceleration proxy, milli-g. */
    accelScale: 10000,
    /** Dampers cut the shaking people feel. */
    dampingReduction: { none: 1, viscous: 1.6, tmd: 2.0 } satisfies Record<Damping, number>,
    /** People notice motion more at home than at work, milli-g. */
    comfortLimitMg: { office: 25, retail: 25, hotel: 15, residential: 15 } satisfies Record<UseType, number>,
  },

  seismic: {
    /** Rule of thumb: a building's sway period ≈ storeys ÷ 10 seconds. */
    periodPerFloor: 0.1,
    /** Tall, slow-swaying buildings feel less of the quake's sharp shaking. */
    cornerPeriodS: 2,
    /** Weight per m² treated as "normal". Heavier buildings attract more quake force. */
    referenceKNPerM2: 9,
    /** Base lateral strength a tower is designed with, in g. */
    baseCapacityG: 0.45,
    ductilityByMaterial: { steel: 1.3, composite: 1.2, concrete: 1.0 } satisfies Record<Material, number>,
    ductilityBySystem: {
      'rigid-frame': 1.2,
      'framed-tube': 1.0,
      'core-outrigger': 1.0,
      'bundled-tube': 1.1,
      diagrid: 1.1,
      'buttressed-core': 1.0,
    } satisfies Record<StructuralSystem, number>,
    /** Base isolation bearings let the ground move under the building. */
    isolationReduction: 2.5,
    /** Viscous dampers soak up quake energy; a TMD is tuned for wind and helps less. */
    dampingReduction: { none: 1, viscous: 1.3, tmd: 1.1 } satisfies Record<Damping, number>,
    /** Irregular shapes twist in quakes. */
    shapeIrregularity: { square: 1, circle: 1, rectangle: 1.05, triangle: 1.15 } satisfies Record<PlanShape, number>,
    setbackIrregularity: { none: 1, few: 1.05, 'wedding-cake': 1.1 },
    /** Heavy pool on the roof makes the top whip around. */
    poolIrregularity: 1.05,
    /** Demand ÷ capacity at or below this: fully operational after the quake. */
    operationalRatio: 0.35,
    /** Above operational but at or below this: survives with damage. Above: fails. */
    damagedRatio: 1.0,
  },

  foundation: {
    /** Utilization at or below this passes; up to 1.0 is marginal. */
    passUtilization: 0.8,
    /** Cost per m² of footprint, USD. */
    costPerM2: { mat: 800, raft: 1500, piles: 4000, caissons: 7000 } satisfies Record<FoundationType, number>,
  },

  elevators: {
    /** Gross floor area per person, m². */
    m2PerPerson: { office: 14, residential: 40, hotel: 35, retail: 50 } satisfies Record<UseType, number>,
    /** Share of people arriving in the busiest 5 minutes. Offices have a sharp morning rush. */
    peakFiveMinShare: { office: 0.12, residential: 0.06, hotel: 0.08, retail: 0.02 } satisfies Record<UseType, number>,
    /** People per car trip (16-person car at 80% full). */
    passengersPerTrip: 13,
    /** Seconds per stop: doors, people in and out. */
    secondsPerStop: 6,
    /** Express shuttle speed, m/s. */
    expressSpeed: 10,
    /** A zone can usefully use about this many cars (two banks of eight). */
    maxCarsPerZone: 16,
    /** Share of cars used as sky-lobby shuttles instead of local service. */
    skyLobbyShuttleShare: 0.15,
    /** Average wait ≈ this × the interval between cars. */
    waitPerInterval: 0.6,
    /** Classic office target is ~30 s; homes and hotels tolerate a bit more. */
    targetWaitS: { office: 30, retail: 30, hotel: 45, residential: 45 } satisfies Record<UseType, number>,
    carBaseCost: 250_000,
    carCostPerFloorServed: 12_000,
    skyLobbyCost: 8_000_000,
  },

  energy: {
    /** Lights, computers, appliances, kWh per m² per year. */
    baseEui: 120,
    heatingEui: 150,
    coolingEui: 120,
    /** Heat loss of solid wall per type, relative to glass = 1. Stone and concrete insulate better. */
    opaqueHeatLoss: { glass: 0.6, metal: 0.4, precast: 0.35, masonry: 0.3 } satisfies Record<FacadeType, number>,
    gradeFactor: { standard: 1, efficient: 0.8, green: 0.6 } satisfies Record<SystemsGrade, number>,
    dollarsPerKWh: 0.15,
    /** EUI (kWh/m²/yr) limits. */
    euiPass: 240,
    euiMarginal: 300,
  },

  cost: {
    /** Structure cost per m² of floor, USD. Steel costs more than concrete. */
    structurePerM2: { steel: 1100, composite: 950, concrete: 800 } satisfies Record<Material, number>,
    systemCostFactor: {
      'rigid-frame': 1.0,
      'framed-tube': 1.05,
      'core-outrigger': 1.08,
      'bundled-tube': 1.12,
      diagrid: 1.15,
      'buttressed-core': 1.1,
    } satisfies Record<StructuralSystem, number>,
    /** Taller is harder: cranes, pumping concrete, safety. Cost × (1 + floors / this). */
    heightPremiumFloors: 150,
    exposedStructureFactor: 1.05,
    /** Facade cost per m² of wall. Windows cost windowPerM2; the rest is the solid wall type. */
    windowPerM2: 900,
    opaquePerM2: { glass: 800, metal: 700, precast: 500, masonry: 1100 } satisfies Record<FacadeType, number>,
    ornamentFactor: { none: 1, low: 1.05, high: 1.15 },
    interiorsPerM2: { office: 1200, residential: 1600, hotel: 2000, retail: 1000 } satisfies Record<UseType, number>,
    systemsPerM2: { standard: 600, efficient: 750, green: 950 } satisfies Record<SystemsGrade, number>,
    /** Damper cost for a 60-storey tower, scaled by floors / 60. */
    dampingCost60: { none: 0, tmd: 5_000_000, viscous: 3_000_000 } satisfies Record<Damping, number>,
    isolationPerM2: 3000,
    amenityCost: { helipad: 3_000_000, pool: 12_000_000, 'observation-deck': 15_000_000, 'sky-garden': 20_000_000 } satisfies Record<AmenityId, number>,
    /** Typical all-in cost per m² before the city multiplier, used for sandbox grading. */
    benchmarkPerM2: 4200,
  },

  schedule: {
    excavationDays: 30,
    foundationDays: { mat: 60, raft: 90, piles: 150, caissons: 180 } satisfies Record<FoundationType, number>,
    /** Days per storey of frame. Steel goes up fastest. */
    daysPerFloor: { steel: 3, composite: 3.5, concrete: 4 } satisfies Record<Material, number>,
    diagridFactor: 1.2,
    exposedStructureFactor: 1.1,
    /** Facade starts once the frame is this many floors ahead. */
    facadeLagFloors: 8,
    crownDays: 30,
    amenityDays: 20,
    fitoutDays: 120,
  },
} as const;
```


- [ ] **Step 5: Create the sites**

`src/sim/sites.ts`:

```ts
import type { Site, SiteId } from './types';

export const SITES: Record<SiteId, Site> = {
  'new-york': {
    id: 'new-york',
    name: 'Midtown Infill',
    city: 'New York',
    challenge: 'A tiny lot squeezed between neighbors — build tall and skinny.',
    fact: 'Manhattan sits on hard schist bedrock close to the surface, which is why its skyline rose where it did.',
    lookUp: ['432 Park Avenue', 'Steinway Tower', 'Chrysler Building', 'Empire State Building'],
    mapPos: { lat: 40.76, lon: -73.98 },
    lot: { width: 30, depth: 60 },
    windSpeed: 42,
    seismicHazard: 0.1,
    climate: { heating: 0.6, cooling: 0.4 },
    snow: false,
    soil: [
      { name: 'Fill and sand', thickness: 6, color: '#b08d5b' },
      { name: 'Glacial till', thickness: 6, color: '#8d7350' },
    ],
    bedrockDepth: 12,
    foundation: {
      mat: { capacity: 3000, settlementCm: 2, costFactor: 1, depth: 3 },
      raft: { capacity: 3500, settlementCm: 2, costFactor: 1, depth: 8 },
      piles: { capacity: 3000, settlementCm: 2, costFactor: 1, depth: 14 },
      caissons: { capacity: 4000, settlementCm: 1, costFactor: 1, depth: 14 },
    },
    costMultiplier: 1.35,
    visuals: {
      sky: '#bcd4e6',
      ground: '#9a9a92',
      neighborColors: ['#a39e93', '#8c8070', '#b5aa98', '#6f6a62', '#c2b8a3'],
      neighborHeight: [40, 180],
      landmark: 'empire-state',
    },
  },
  tokyo: {
    id: 'tokyo',
    name: 'Shinjuku Quake Zone',
    city: 'Tokyo',
    challenge: 'One of the most earthquake-prone cities on Earth, with typhoon winds too.',
    fact: 'Many Tokyo towers sit on rubber-and-steel base isolators or carry giant dampers to ride out quakes.',
    lookUp: ['Tokyo Skytree', 'Mori Tower', 'Toranomon Hills'],
    mapPos: { lat: 35.69, lon: 139.69 },
    lot: { width: 60, depth: 60 },
    windSpeed: 48,
    seismicHazard: 0.45,
    climate: { heating: 0.3, cooling: 0.6 },
    snow: false,
    soil: [
      { name: 'Kanto loam', thickness: 10, color: '#7a4e2d' },
      { name: 'Sand and gravel', thickness: 25, color: '#a88a5f' },
      { name: 'Dense sand', thickness: 25, color: '#94794f' },
    ],
    bedrockDepth: 60,
    foundation: {
      mat: { capacity: 500, settlementCm: 30, costFactor: 1, depth: 3 },
      raft: { capacity: 800, settlementCm: 20, costFactor: 1.1, depth: 12 },
      piles: { capacity: 1400, settlementCm: 8, costFactor: 1.2, depth: 40 },
      caissons: { capacity: 2000, settlementCm: 4, costFactor: 1.3, depth: 60 },
    },
    costMultiplier: 1.15,
    visuals: {
      sky: '#cfe3f5',
      ground: '#8e9396',
      neighborColors: ['#d9dde0', '#b7bec4', '#9aa4ad', '#e8e4dc', '#7d8a96'],
      neighborHeight: [30, 160],
      landmark: 'tokyo-tower',
    },
  },
  chicago: {
    id: 'chicago',
    name: 'Lakefront Loop',
    city: 'Chicago',
    challenge: 'Freezing winters, fierce winds off Lake Michigan, and soft clay over deep bedrock.',
    fact: 'Chicago invented the skyscraper in 1885; its towers stand on concrete caissons drilled through clay to bedrock.',
    lookUp: ['Willis Tower', '875 North Michigan (Hancock)', 'Home Insurance Building', 'Aqua Tower'],
    mapPos: { lat: 41.88, lon: -87.63 },
    lot: { width: 70, depth: 70 },
    windSpeed: 46,
    seismicHazard: 0.05,
    climate: { heating: 1.0, cooling: 0.35 },
    snow: true,
    soil: [
      { name: 'Fill', thickness: 5, color: '#9b8466' },
      { name: 'Soft blue clay', thickness: 20, color: '#6f7d86' },
      { name: 'Hardpan', thickness: 10, color: '#7c6a55' },
    ],
    bedrockDepth: 35,
    foundation: {
      mat: { capacity: 350, settlementCm: 40, costFactor: 1, depth: 3 },
      raft: { capacity: 550, settlementCm: 25, costFactor: 1.1, depth: 10 },
      piles: { capacity: 900, settlementCm: 10, costFactor: 1.1, depth: 30 },
      caissons: { capacity: 2500, settlementCm: 3, costFactor: 1.2, depth: 36 },
    },
    costMultiplier: 1.1,
    visuals: {
      sky: '#c9ced3',
      ground: '#eef1f4',
      neighborColors: ['#5b5f66', '#8a7f72', '#3d4249', '#a8a29a', '#6e6257'],
      neighborHeight: [40, 200],
      landmark: 'willis',
    },
  },
  shanghai: {
    id: 'shanghai',
    name: 'Lujiazui Riverbank',
    city: 'Shanghai',
    challenge: 'Hundreds of metres of soft river-delta clay and a high water table — the ground wants to sink.',
    fact: 'Shanghai Tower stands on nearly 1,000 bored piles reaching 86 m into the clay; bedrock is about 300 m down.',
    lookUp: ['Shanghai Tower', 'Jin Mao Tower', 'Shanghai World Financial Center'],
    mapPos: { lat: 31.24, lon: 121.5 },
    lot: { width: 80, depth: 80 },
    windSpeed: 50,
    seismicHazard: 0.12,
    climate: { heating: 0.4, cooling: 0.7 },
    snow: false,
    soil: [
      { name: 'Saturated silt', thickness: 15, color: '#7d7466' },
      { name: 'Soft grey clay', thickness: 40, color: '#6b6e70' },
      { name: 'Silty sand', thickness: 45, color: '#9a8e74' },
    ],
    bedrockDepth: 300,
    foundation: {
      mat: { capacity: 250, settlementCm: 60, costFactor: 1, depth: 3 },
      raft: { capacity: 450, settlementCm: 40, costFactor: 1.1, depth: 12 },
      piles: { capacity: 1700, settlementCm: 15, costFactor: 1.4, depth: 86 },
      caissons: { capacity: 1500, settlementCm: 15, costFactor: 1.6, depth: 90 },
    },
    costMultiplier: 0.7,
    visuals: {
      sky: '#d8dfe3',
      ground: '#8f948f',
      neighborColors: ['#c9d3da', '#9fb0bc', '#e2e2dc', '#7b8d99', '#b6a998'],
      neighborHeight: [40, 220],
      landmark: 'pearl-tower',
    },
  },
};

export const SITE_IDS = Object.keys(SITES) as SiteId[];

export function getSite(id: SiteId): Site {
  return SITES[id];
}
```


- [ ] **Step 6: Create styles and amenities**

`src/sim/catalog/styles.ts`:

```ts
import type { Design, StyleId } from '../types';

export type StyleSettings = Pick<
  Design,
  'shape' | 'setbacks' | 'taper' | 'twist' | 'crown' | 'facade' | 'windowRatio' | 'exposedStructure' | 'palette' | 'ornament'
>;

export interface StylePreset {
  id: StyleId;
  name: string;
  era: string;
  summary: string;
  /** Why it looks the way it does — the engineering or idea behind the form. */
  why: string;
  examples: { name: string; city: string }[];
  settings: StyleSettings;
}

export const STYLE_PRESETS: Record<StyleId, StylePreset> = {
  'chicago-school': {
    id: 'chicago-school',
    name: 'Chicago School',
    era: '1880s–1910s',
    summary: 'The first skyscrapers: steel frames wrapped in brick and terracotta, with wide "Chicago windows".',
    why: 'A steel skeleton carried the weight, so walls no longer had to be thick — windows could be big.',
    examples: [
      { name: 'Home Insurance Building', city: 'Chicago' },
      { name: 'Reliance Building', city: 'Chicago' },
      { name: 'Flatiron Building', city: 'New York' },
    ],
    settings: {
      shape: 'square', setbacks: 'none', taper: 0, twist: 0, crown: 'flat', facade: 'masonry', windowRatio: 0.5,
      exposedStructure: false, ornament: 'low', palette: { body: '#a0522d', accent: '#e8dcc8', glass: '#7fa7c0' },
    },
  },
  'gothic-revival': {
    id: 'gothic-revival',
    name: 'Gothic Revival',
    era: '1900s–1930s',
    summary: '"Cathedrals of commerce": pointed crowns, vertical stone ribs and lots of carved detail.',
    why: 'Builders borrowed the soaring look of medieval cathedrals to make tall buildings feel grand and uplifting.',
    examples: [
      { name: 'Woolworth Building', city: 'New York' },
      { name: 'Tribune Tower', city: 'Chicago' },
    ],
    settings: {
      shape: 'square', setbacks: 'few', taper: 0, twist: 0, crown: 'pointed', facade: 'masonry', windowRatio: 0.35,
      exposedStructure: false, ornament: 'high', palette: { body: '#e6e0d2', accent: '#b9a77d', glass: '#6f8ea3' },
    },
  },
  'art-deco': {
    id: 'art-deco',
    name: 'Art Deco',
    era: '1925–1940',
    summary: 'Stepped "wedding cake" setbacks, gleaming spires, and geometric gold and chrome trim.',
    why: "New York's 1916 zoning law required towers to step back so light could reach the street — architects made the steps beautiful.",
    examples: [
      { name: 'Chrysler Building', city: 'New York' },
      { name: 'Empire State Building', city: 'New York' },
      { name: 'Carbide & Carbon Building', city: 'Chicago' },
      { name: 'Peace Hotel', city: 'Shanghai' },
    ],
    settings: {
      shape: 'square', setbacks: 'wedding-cake', taper: 0, twist: 0, crown: 'spire', facade: 'masonry', windowRatio: 0.4,
      exposedStructure: false, ornament: 'high', palette: { body: '#d8cbb0', accent: '#c9a227', glass: '#5f7f94' },
    },
  },
  international: {
    id: 'international',
    name: 'International Style',
    era: '1950s–1970s',
    summary: 'Clean glass-and-steel boxes with no decoration — "less is more".',
    why: 'Modernists wanted honest buildings that showed their structure and used new curtain-wall glass.',
    examples: [
      { name: 'Seagram Building', city: 'New York' },
      { name: 'Lever House', city: 'New York' },
      { name: '860–880 Lake Shore Drive', city: 'Chicago' },
    ],
    settings: {
      shape: 'rectangle', setbacks: 'none', taper: 0, twist: 0, crown: 'flat', facade: 'glass', windowRatio: 0.9,
      exposedStructure: false, ornament: 'none', palette: { body: '#2f3a40', accent: '#1f2a30', glass: '#4d6f80' },
    },
  },
  brutalist: {
    id: 'brutalist',
    name: 'Brutalist',
    era: '1955–1980',
    summary: 'Bold, chunky raw concrete with small deep-set windows.',
    why: 'Concrete was cheap, strong, and fireproof; architects celebrated its rough texture instead of hiding it.',
    examples: [
      { name: 'Nakagin Capsule Tower', city: 'Tokyo' },
      { name: 'Marina City', city: 'Chicago' },
    ],
    settings: {
      shape: 'square', setbacks: 'few', taper: 0, twist: 0, crown: 'flat', facade: 'precast', windowRatio: 0.3,
      exposedStructure: false, ornament: 'none', palette: { body: '#9c9a94', accent: '#77756f', glass: '#4a5a63' },
    },
  },
  postmodern: {
    id: 'postmodern',
    name: 'Postmodern',
    era: '1978–1995',
    summary: 'Playful references to history: granite, pediments, stepped tops and bold colors.',
    why: 'After decades of plain boxes, architects brought back ornament and wit — sometimes tongue-in-cheek.',
    examples: [
      { name: '550 Madison (AT&T Building)', city: 'New York' },
      { name: '311 South Wacker', city: 'Chicago' },
      { name: 'Tokyo Metropolitan Government Building', city: 'Tokyo' },
    ],
    settings: {
      shape: 'square', setbacks: 'few', taper: 0, twist: 0, crown: 'stepped', facade: 'masonry', windowRatio: 0.45,
      exposedStructure: false, ornament: 'low', palette: { body: '#c7a68a', accent: '#7a4b3a', glass: '#5c7484' },
    },
  },
  'high-tech': {
    id: 'high-tech',
    name: 'High-Tech',
    era: '1970s–2000s',
    summary: 'The structure is on the outside: giant X-braces, exposed steel and machine-like details.',
    why: 'Putting the bracing on the outside makes the tower very stiff against wind and frees up the floors inside.',
    examples: [
      { name: '875 North Michigan (Hancock Center)', city: 'Chicago' },
      { name: 'Hearst Tower', city: 'New York' },
      { name: 'HSBC Building', city: 'Hong Kong' },
    ],
    settings: {
      shape: 'square', setbacks: 'none', taper: 0, twist: 0, crown: 'flat', facade: 'metal', windowRatio: 0.7,
      exposedStructure: true, ornament: 'none', palette: { body: '#c0c6cc', accent: '#d33f2f', glass: '#6b8797' },
    },
  },
  'neo-futurist': {
    id: 'neo-futurist',
    name: 'Neo-futurist',
    era: '2000s–today',
    summary: 'Sculpted supertalls that taper and twist, designed with computers and wind tunnels.',
    why: 'Twisting and tapering confuse the wind so the tower sways less — Shanghai Tower cut its wind load by about a quarter.',
    examples: [
      { name: 'Shanghai Tower', city: 'Shanghai' },
      { name: 'Burj Khalifa', city: 'Dubai' },
      { name: 'Tokyo Skytree', city: 'Tokyo' },
    ],
    settings: {
      shape: 'circle', setbacks: 'none', taper: 0.3, twist: 120, crown: 'pointed', facade: 'glass', windowRatio: 0.85,
      exposedStructure: false, ornament: 'none', palette: { body: '#a9c6d6', accent: '#e0e6ea', glass: '#7fa9c2' },
    },
  },
};

export const STYLE_IDS = Object.keys(STYLE_PRESETS) as StyleId[];
```

`src/sim/catalog/amenities.ts`:

```ts
import type { AmenityId } from '../types';

export interface AmenityDef {
  id: AmenityId;
  label: string;
  explain: string;
}

export const AMENITIES: Record<AmenityId, AmenityDef> = {
  helipad: {
    id: 'helipad',
    label: 'Helipad',
    explain: 'A landing pad on the roof. Needs a flat top and a strong roof structure.',
  },
  pool: {
    id: 'pool',
    label: 'Rooftop pool',
    explain: 'Water is heavy — a rooftop pool adds about 2,000 tonnes high up, which makes earthquakes worse.',
  },
  'observation-deck': {
    id: 'observation-deck',
    label: 'Observation deck',
    explain: 'A public viewing floor near the top. Visitors pay to see the city.',
  },
  'sky-garden': {
    id: 'sky-garden',
    label: 'Sky garden',
    explain: 'Trees and plants partway up the tower. Soil is heavy, but residents love it.',
  },
};

export const AMENITY_IDS = Object.keys(AMENITIES) as AmenityId[];
```


- [ ] **Step 7: Create the design model and test helper**

`src/sim/design.ts`:

```ts
import { STYLE_PRESETS, type StyleSettings } from './catalog/styles';
import type { Design, Site, StyleId } from './types';

export function maxPlateWidth(site: Site, design: Pick<Design, 'shape'>): number {
  return design.shape === 'rectangle' ? site.lot.width : Math.min(site.lot.width, site.lot.depth);
}

export function maxPlateDepth(site: Site): number {
  return site.lot.depth;
}

/** Clamp anything that depends on the site (plate size) or is otherwise out of range. */
export function normalizeDesign(design: Design, site: Site): Design {
  const plateWidth = Math.min(design.plateWidth, maxPlateWidth(site, design));
  const plateDepth = Math.min(design.plateDepth, maxPlateDepth(site));
  if (plateWidth === design.plateWidth && plateDepth === design.plateDepth) return design;
  return { ...design, plateWidth, plateDepth };
}

export function applyStylePreset(design: Design, style: StyleId): Design {
  return { ...design, ...STYLE_PRESETS[style].settings, style };
}

const STYLE_KEYS = Object.keys(STYLE_PRESETS.international.settings) as (keyof StyleSettings)[];

/** True when any style-controlled field differs from the current preset. */
export function isStyleModified(design: Design): boolean {
  const preset = STYLE_PRESETS[design.style].settings;
  return STYLE_KEYS.some((k) => JSON.stringify(design[k]) !== JSON.stringify(preset[k]));
}

export function defaultDesign(site: Site): Design {
  const base: Design = {
    style: 'international',
    floors: 40,
    plateWidth: 40,
    plateDepth: 40,
    shape: 'square',
    setbacks: 'none',
    taper: 0,
    twist: 0,
    crown: 'flat',
    useMix: { retail: 10, office: 90, hotel: 0, residential: 0 },
    system: 'core-outrigger',
    material: 'concrete',
    exposedStructure: false,
    damping: 'none',
    baseIsolation: false,
    foundation: 'mat',
    facade: 'glass',
    windowRatio: 0.9,
    elevators: 12,
    zoning: 'single',
    systemsGrade: 'standard',
    amenities: [],
    palette: STYLE_PRESETS.international.settings.palette,
    ornament: 'none',
  };
  return normalizeDesign(applyStylePreset(base, 'international'), site);
}
```

`src/sim/testUtils.ts`:

```ts
import { defaultDesign, normalizeDesign } from './design';
import { SITES } from './sites';
import type { Design, Site, SiteId } from './types';

/** Default design for a site with a patch applied — the standard way tests build designs. */
export function designFor(siteId: SiteId, patch: Partial<Design> = {}): { site: Site; design: Design } {
  const site = SITES[siteId];
  return { site, design: normalizeDesign({ ...defaultDesign(site), ...patch }, site) };
}
```


- [ ] **Step 8: Run tests and typecheck**

Run: `npx vitest run src/sim && npm run typecheck`
Expected: all tests in `design.test.ts` and `catalog.test.ts` PASS (8 tests); typecheck clean.

- [ ] **Step 9: Commit**

```bash
git add src/sim
git commit -m "feat(sim): add core types, sites, styles, amenities, coefficients and design model

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Floor geometry

**Files:**
- Create: `src/sim/geometry.ts`
- Test: `src/sim/geometry.test.ts`

**Interfaces:**
- Consumes: `Design`, `PlanShape`, `Setbacks`, `CrownType` (Task 2); `designFor` (Task 2).
- Produces: `FLOOR_HEIGHT = 4`; `type FloorSlice = { index, y, width, depth, rotation }`; `floorSlices(design): FloorSlice[]`; `floorScale(design, index)`; `setbackScale(setbacks, t)`; `plateDims(design) → {width, depth}`; `shapeAreaFactor(shape)`; `shapePerimeter(shape, w, d)`; `sliceArea(shape, slice)`; `crownHeight(crown, bodyHeight)`. Shared by analysis (Task 4) and the 3D building (Task 8) so the numbers and the picture always agree.

- [ ] **Step 1: Write the failing test**

`src/sim/geometry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { FLOOR_HEIGHT, crownHeight, floorSlices, setbackScale, shapeAreaFactor } from './geometry';
import { designFor } from './testUtils';
import type { PlanShape, Setbacks } from './types';

describe('geometry', () => {
  it('makes one slice per floor stacked by floor height', () => {
    const { design } = designFor('chicago', { floors: 12 });
    const slices = floorSlices(design);
    expect(slices).toHaveLength(12);
    expect(slices[11].y).toBe(11 * FLOOR_HEIGHT);
  });

  it('tapers the top floor by the taper fraction', () => {
    const { design } = designFor('chicago', { shape: 'square', plateWidth: 40, taper: 0.5, setbacks: 'none' });
    const slices = floorSlices(design);
    expect(slices[0].width).toBeCloseTo(40);
    expect(slices[slices.length - 1].width).toBeCloseTo(20);
  });

  it('rotates the top floor by the full twist', () => {
    const { design } = designFor('chicago', { twist: 90 });
    const slices = floorSlices(design);
    expect(slices[0].rotation).toBe(0);
    expect(slices[slices.length - 1].rotation).toBeCloseTo(Math.PI / 2);
  });

  it('steps setbacks down as the tower rises', () => {
    expect(setbackScale('none', 0.9)).toBe(1);
    expect(setbackScale('few', 0.6)).toBe(0.85);
    expect(setbackScale('wedding-cake', 0.85)).toBe(0.6);
  });

  it('gives round floors less area than square ones of the same width', () => {
    expect(shapeAreaFactor('circle')).toBeLessThan(shapeAreaFactor('square'));
  });

  it('adds the most height for a spire', () => {
    expect(crownHeight('spire', 200)).toBeGreaterThan(crownHeight('pointed', 200));
    expect(crownHeight('flat', 200)).toBeGreaterThan(0);
  });

  it('never produces a zero or negative floor size at extremes', () => {
    const shapes: PlanShape[] = ['square', 'rectangle', 'circle', 'triangle'];
    const setbacks: Setbacks[] = ['none', 'few', 'wedding-cake'];
    for (const shape of shapes)
      for (const sb of setbacks)
        for (const floors of [5, 150]) {
          const { design } = designFor('shanghai', { shape, setbacks: sb, floors, taper: 0.6, twist: 120, plateWidth: 15, plateDepth: 15 });
          for (const s of floorSlices(design)) {
            expect(s.width).toBeGreaterThan(0);
            expect(s.depth).toBeGreaterThan(0);
          }
        }
  });
});
```


- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/sim/geometry.test.ts`
Expected: FAIL — cannot resolve `./geometry`.

- [ ] **Step 3: Implement**

`src/sim/geometry.ts`:

```ts
import type { CrownType, Design, PlanShape, Setbacks } from './types';

/** Metres per storey. Fixed at the standard detail level. */
export const FLOOR_HEIGHT = 4;

export interface FloorSlice {
  index: number;
  /** Height of the bottom of this floor, metres. */
  y: number;
  width: number;
  depth: number;
  /** Radians about the vertical axis. */
  rotation: number;
}

/** Plan area of a shape divided by its bounding width × depth. */
export function shapeAreaFactor(shape: PlanShape): number {
  switch (shape) {
    case 'circle':
      return Math.PI / 4;
    case 'triangle':
      return Math.sqrt(3) / 4;
    default:
      return 1;
  }
}

export function shapePerimeter(shape: PlanShape, width: number, depth: number): number {
  switch (shape) {
    case 'circle':
      return Math.PI * width;
    case 'triangle':
      return 3 * width;
    default:
      return 2 * (width + depth);
  }
}

/** Width multiplier from setbacks at fraction t (0 = ground, 1 = top). */
export function setbackScale(setbacks: Setbacks, t: number): number {
  if (setbacks === 'few') {
    if (t >= 0.75) return 0.7;
    if (t >= 0.5) return 0.85;
    return 1;
  }
  if (setbacks === 'wedding-cake') {
    if (t >= 0.8) return 0.6;
    if (t >= 0.6) return 0.7;
    if (t >= 0.4) return 0.8;
    if (t >= 0.2) return 0.9;
    return 1;
  }
  return 1;
}

export function plateDims(design: Design): { width: number; depth: number } {
  const width = design.plateWidth;
  const depth = design.shape === 'rectangle' ? design.plateDepth : design.plateWidth;
  return { width, depth };
}

function heightFraction(index: number, floors: number): number {
  return floors > 1 ? index / (floors - 1) : 0;
}

/** Width multiplier for floor `index` from taper and setbacks. */
export function floorScale(design: Design, index: number): number {
  const t = heightFraction(index, design.floors);
  return (1 - design.taper * t) * setbackScale(design.setbacks, t);
}

export function floorSlices(design: Design): FloorSlice[] {
  const { width, depth } = plateDims(design);
  const slices: FloorSlice[] = [];
  for (let i = 0; i < design.floors; i++) {
    const s = floorScale(design, i);
    const t = heightFraction(i, design.floors);
    slices.push({
      index: i,
      y: i * FLOOR_HEIGHT,
      width: width * s,
      depth: depth * s,
      rotation: (design.twist * t * Math.PI) / 180,
    });
  }
  return slices;
}

export function sliceArea(shape: PlanShape, slice: FloorSlice): number {
  return slice.width * slice.depth * shapeAreaFactor(shape);
}

/** Extra height above the roof, metres, for a crown on a body of height `bodyHeight`. */
export function crownHeight(crown: CrownType, bodyHeight: number): number {
  switch (crown) {
    case 'spire':
      return 0.15 * bodyHeight;
    case 'pointed':
      return 0.08 * bodyHeight;
    case 'stepped':
      return 3 * FLOOR_HEIGHT;
    case 'sloped':
      return 0.05 * bodyHeight;
    default:
      return 2;
  }
}
```


- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/sim/geometry.test.ts && npm run typecheck`
Expected: 7 tests PASS; typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/sim/geometry.ts src/sim/geometry.test.ts
git commit -m "feat(sim): add per-floor geometry with taper, setbacks and twist

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Analysis engine

**Files:**
- Create: `src/sim/analysis/massing.ts`, `wind.ts`, `seismic.ts`, `foundation.ts`, `elevators.ts`, `energy.ts`, `cost.ts`, `schedule.ts`, `index.ts` (all under `src/sim/analysis/`)
- Test: `src/sim/analysis/analysis.test.ts`

**Interfaces:**
- Consumes: geometry (Task 3), `COEFFICIENTS`, `SITES`, types (Task 2).
- Produces: `analyze(site, design): Analysis` from `src/sim/analysis` (index). `Analysis.checks` always has exactly six entries with ids `windStrength`, `windComfort`, `seismic`, `foundation`, `elevators`, `energy`, each with `status`, `value`, `limit`, `unit`, and a kid-readable `message`. `Analysis.schedule.phases` has ids `excavation, foundation, structure, facade, crown, fitout` with `startDay` and `days` (Plan 3 animates these). Also exported: `useShares(design)`, `floorUses(design)`, `computeMassing(design)`, `systemStiffness`, `windShapeFactor`, `carSpeed`, `probableStops`, `ZONE_COUNT`, `elevatorCost`, `foundationCost`.

How the model works (read before editing): each module turns one engineering idea into a closed-form rule. Wind drift ∝ (wind speed)² × shape factor × (slenderness/6)² × √(height/200) ÷ stiffness; dampers divide the felt acceleration only. Earthquake demand ∝ site hazard × √min(1, 2 s ÷ period) × weight ratio × irregularity ÷ (isolation × damping), against a capacity set by material and system ductility; the period is floors ÷ 10 seconds. Foundation utilization = (weight ÷ footprint) ÷ site capacity for that foundation type. Elevators use the classic round-trip/handling-capacity method with probable stops and a cap of 16 useful cars per zone. Energy = base + heating × heat loss + cooling × solar gain, scaled by systems grade.

- [ ] **Step 1: Write the failing test**

`src/sim/analysis/analysis.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { designFor } from '../testUtils';
import { SITE_IDS } from '../sites';
import type { Design, ElevatorZoning, PlanShape, SiteId, StructuralSystem } from '../types';
import { analyze } from './index';

const run = (siteId: SiteId, patch: Partial<Design> = {}) => {
  const { site, design } = designFor(siteId, patch);
  return analyze(site, design);
};
const status = (a: ReturnType<typeof analyze>, id: string) => a.checks.find((c) => c.id === id)!.status;

describe('wind', () => {
  const tall = { floors: 80, plateWidth: 30, shape: 'square' as const };

  it('dampers reduce felt sway but not structural drift', () => {
    const none = run('new-york', tall);
    const tmd = run('new-york', { ...tall, damping: 'tmd' });
    expect(tmd.wind.accelMg).toBeLessThan(none.wind.accelMg * 0.6);
    expect(tmd.wind.driftRatio).toBeCloseTo(none.wind.driftRatio);
  });

  it('round, twisted, tapered and stepped towers sway less than a square box', () => {
    const box = run('new-york', tall).wind.driftRatio;
    expect(run('new-york', { ...tall, shape: 'circle' }).wind.driftRatio).toBeLessThan(box);
    expect(run('new-york', { ...tall, twist: 120 }).wind.driftRatio).toBeLessThan(box);
    expect(run('new-york', { ...tall, taper: 0.3 }).wind.driftRatio).toBeLessThan(box);
    expect(run('new-york', { ...tall, setbacks: 'wedding-cake' }).wind.driftRatio).toBeLessThan(box);
  });

  it('a rigid frame is far too floppy for a tall tower', () => {
    const frame = run('chicago', { floors: 80, shape: 'square', plateWidth: 50, system: 'rigid-frame' });
    const outrigger = run('chicago', { floors: 80, shape: 'square', plateWidth: 50, system: 'core-outrigger' });
    expect(frame.wind.driftRatio).toBeGreaterThan(outrigger.wind.driftRatio * 2);
  });

  it('a super-slender square tower fails in wind but a round damped one passes', () => {
    expect(status(run('new-york', tall), 'windStrength')).toBe('fail');
    const fixed = run('new-york', { ...tall, shape: 'circle', material: 'composite', damping: 'tmd' });
    expect(status(fixed, 'windStrength')).toBe('pass');
    expect(status(fixed, 'windComfort')).toBe('pass');
  });

  it('homes have a stricter comfort limit than offices', () => {
    const office = run('new-york', { useMix: { retail: 0, office: 100, hotel: 0, residential: 0 } });
    const homes = run('new-york', { useMix: { retail: 0, office: 0, hotel: 0, residential: 100 } });
    expect(homes.wind.comfortLimitMg).toBeLessThan(office.wind.comfortLimitMg);
  });
});

describe('earthquake', () => {
  const tokyo50 = { floors: 50, material: 'steel' as const, foundation: 'piles' as const };

  it('base isolation makes a damaged Tokyo tower fully operational', () => {
    expect(run('tokyo', tokyo50).seismic.outcome).toBe('damaged');
    expect(run('tokyo', { ...tokyo50, baseIsolation: true }).seismic.outcome).toBe('operational');
  });

  it('heavy masonry attracts more earthquake force', () => {
    const glass = run('tokyo', { ...tokyo50, facade: 'glass' });
    const stone = run('tokyo', { ...tokyo50, facade: 'masonry' });
    expect(stone.seismic.ratio).toBeGreaterThan(glass.seismic.ratio);
  });

  it('a short heavy masonry building fails in Tokyo but is fine in Chicago', () => {
    const patch = { floors: 15, facade: 'masonry' as const, system: 'rigid-frame' as const, foundation: 'raft' as const };
    expect(run('tokyo', patch).seismic.outcome).toBe('fails');
    expect(run('chicago', { ...patch, foundation: 'caissons' }).seismic.outcome).toBe('operational');
  });

  it('uses the period ≈ floors ÷ 10 rule of thumb', () => {
    expect(run('tokyo', { floors: 40 }).seismic.periodS).toBeCloseTo(4);
  });
});

describe('foundation', () => {
  it('a shallow mat fails on Shanghai clay at 60 floors; piles pass', () => {
    expect(status(run('shanghai', { floors: 60, foundation: 'mat' }), 'foundation')).toBe('fail');
    expect(status(run('shanghai', { floors: 60, foundation: 'piles' }), 'foundation')).toBe('pass');
  });

  it('caissons carry a 100-floor tower in Chicago; a mat does not', () => {
    const patch = { floors: 100, shape: 'square' as const, plateWidth: 60 };
    expect(status(run('chicago', { ...patch, foundation: 'caissons' }), 'foundation')).toBe('pass');
    expect(status(run('chicago', { ...patch, foundation: 'mat' }), 'foundation')).toBe('fail');
  });

  it('a mat is fine on Manhattan bedrock', () => {
    expect(status(run('new-york', { floors: 60, foundation: 'mat' }), 'foundation')).toBe('pass');
  });
});

describe('elevators', () => {
  it('more cars mean shorter waits', () => {
    expect(run('new-york', { elevators: 12 }).elevators.avgWaitS).toBeLessThan(run('new-york', { elevators: 4 }).elevators.avgWaitS);
  });

  it('zoning helps a tall tower', () => {
    const patch = { floors: 80, plateWidth: 30, elevators: 24 };
    const single = run('new-york', { ...patch, zoning: 'single' }).elevators.avgWaitS;
    const zoned = run('new-york', { ...patch, zoning: 'sky-lobby' }).elevators.avgWaitS;
    expect(zoned).toBeLessThan(single);
  });

  it('caps useful cars per zone', () => {
    const a = run('new-york', { elevators: 60, zoning: 'single' });
    expect(a.elevators.effectiveCars).toBe(a.elevators.maxUsefulCars);
  });
});

describe('energy, cost, schedule', () => {
  it('lots of glass costs energy in Chicago winters; green systems save it', () => {
    const glass = run('chicago', { facade: 'glass', windowRatio: 0.9 }).energy.euiKWhPerM2;
    const stone = run('chicago', { facade: 'masonry', windowRatio: 0.4 }).energy.euiKWhPerM2;
    expect(stone).toBeLessThan(glass);
    const green = run('chicago', { facade: 'masonry', windowRatio: 0.4, systemsGrade: 'green' }).energy.euiKWhPerM2;
    expect(green).toBeLessThan(stone);
  });

  it('steel structure costs more than concrete but builds faster', () => {
    const steel = run('chicago', { material: 'steel' });
    const concrete = run('chicago', { material: 'concrete' });
    expect(steel.cost.structure).toBeGreaterThan(concrete.cost.structure);
    expect(steel.schedule.totalDays).toBeLessThan(concrete.schedule.totalDays);
  });

  it('a rooftop pool adds cost and weight', () => {
    const plain = run('chicago');
    const pool = run('chicago', { amenities: ['pool'] });
    expect(pool.cost.total).toBeGreaterThan(plain.cost.total);
    expect(pool.weightKN).toBeGreaterThan(plain.weightKN);
  });

  it('the same tower is cheaper in Shanghai than New York', () => {
    expect(run('shanghai', { foundation: 'piles' }).cost.total).toBeLessThan(run('new-york', { foundation: 'piles' }).cost.total);
  });

  it('cost parts add up to the total', () => {
    const c = run('tokyo').cost;
    const sum = c.structure + c.foundation + c.facade + c.interiors + c.systems + c.elevators + c.damping + c.isolation + c.amenities;
    expect(sum).toBeCloseTo(c.total);
  });

  it('schedule phases start in order and the total covers them all', () => {
    const s = run('chicago').schedule;
    expect(s.phases.map((p) => p.id)).toEqual(['excavation', 'foundation', 'structure', 'facade', 'crown', 'fitout']);
    for (const p of s.phases) expect(p.startDay + p.days).toBeLessThanOrEqual(s.totalDays);
  });
});

describe('robustness', () => {
  it('returns finite numbers for every extreme combination', () => {
    const shapes: PlanShape[] = ['square', 'rectangle', 'circle', 'triangle'];
    const systems: StructuralSystem[] = ['rigid-frame', 'framed-tube', 'core-outrigger', 'bundled-tube', 'diagrid', 'buttressed-core'];
    const zonings: ElevatorZoning[] = ['single', 'two-zone', 'sky-lobby'];
    for (const siteId of SITE_IDS)
      for (const shape of shapes)
        for (const system of systems)
          for (const zoning of zonings)
            for (const floors of [5, 150])
              for (const elevators of [2, 120]) {
                const a = run(siteId, { shape, system, zoning, floors, elevators, taper: 0.6, setbacks: 'wedding-cake', plateWidth: 15, plateDepth: 15 });
                const nums = [a.heightM, a.gfa, a.weightKN, a.wind.driftRatio, a.wind.accelMg, a.seismic.ratio, a.foundation.utilization, a.elevators.avgWaitS, a.energy.euiKWhPerM2, a.cost.total, a.schedule.totalDays];
                for (const n of nums) expect(Number.isFinite(n), `${siteId}/${shape}/${system}/${zoning}/${floors}/${elevators}`).toBe(true);
                expect(a.checks).toHaveLength(6);
              }
  });
});
```


- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/sim/analysis`
Expected: FAIL — cannot resolve `./index`.

- [ ] **Step 3: Implement massing (areas, weight, uses per floor)**

`src/sim/analysis/massing.ts`:

```ts
import { COEFFICIENTS } from '../catalog/coefficients';
import {
  FLOOR_HEIGHT,
  crownHeight,
  floorSlices,
  plateDims,
  shapeAreaFactor,
  shapePerimeter,
  sliceArea,
} from '../geometry';
import type { Design, UseType } from '../types';
import { USE_ORDER } from '../types';

export interface Massing {
  bodyHeight: number;
  heightM: number;
  gfa: number;
  footprint: number;
  /** Total wall area, m². */
  facadeArea: number;
  /** Sum of floor widths × storey height — what the wind pushes on, m². */
  frontalArea: number;
  baseWidth: number;
  slenderness: number;
  weightKN: number;
  /** kN per m² of floor including facade. */
  unitWeight: number;
  /** m² of floor per use. */
  areaByUse: Record<UseType, number>;
  /** Use of the top floor. */
  topUse: UseType;
}

/** Normalized use shares (sum to 1) in stacking order. */
export function useShares(design: Design): Record<UseType, number> {
  const total = USE_ORDER.reduce((s, u) => s + Math.max(0, design.useMix[u]), 0);
  const out = { retail: 0, office: 0, hotel: 0, residential: 0 } as Record<UseType, number>;
  if (total <= 0) {
    out.office = 1;
    return out;
  }
  for (const u of USE_ORDER) out[u] = Math.max(0, design.useMix[u]) / total;
  return out;
}

/** Use of each floor, bottom to top. */
export function floorUses(design: Design): UseType[] {
  const shares = useShares(design);
  const uses: UseType[] = [];
  let cumulative = 0;
  for (let i = 0; i < design.floors; i++) {
    const t = (i + 0.5) / design.floors;
    let use: UseType = 'office';
    cumulative = 0;
    for (const u of USE_ORDER) {
      cumulative += shares[u];
      if (t <= cumulative + 1e-9) {
        use = u;
        break;
      }
    }
    uses.push(use);
  }
  return uses;
}

export function computeMassing(design: Design): Massing {
  const W = COEFFICIENTS.weight;
  const slices = floorSlices(design);
  const uses = floorUses(design);
  const areaByUse = { retail: 0, office: 0, hotel: 0, residential: 0 } as Record<UseType, number>;
  let gfa = 0;
  let facadeArea = 0;
  let frontalArea = 0;
  slices.forEach((s, i) => {
    const a = sliceArea(design.shape, s);
    gfa += a;
    areaByUse[uses[i]] += a;
    facadeArea += shapePerimeter(design.shape, s.width, s.depth) * FLOOR_HEIGHT;
    frontalArea += Math.max(s.width, s.depth) * FLOOR_HEIGHT;
  });
  const { width, depth } = plateDims(design);
  const footprint = width * depth * shapeAreaFactor(design.shape);
  const bodyHeight = design.floors * FLOOR_HEIGHT;
  const heightM = bodyHeight + crownHeight(design.crown, bodyHeight);
  const baseWidth = Math.min(width, depth);
  const unitWeight =
    W.materialKNPerM2[design.material] +
    W.facadeKNPerM2[design.facade] +
    (design.exposedStructure ? W.exposedStructureKNPerM2 : 0);
  const amenityKN = design.amenities.reduce((s, a) => s + W.amenityKN[a], 0);
  return {
    bodyHeight,
    heightM,
    gfa,
    footprint,
    facadeArea,
    frontalArea,
    baseWidth,
    slenderness: bodyHeight / baseWidth,
    weightKN: gfa * unitWeight + amenityKN,
    unitWeight,
    areaByUse,
    topUse: uses[uses.length - 1] ?? 'office',
  };
}
```


- [ ] **Step 4: Implement wind and earthquake**

`src/sim/analysis/wind.ts`:

```ts
import { COEFFICIENTS } from '../catalog/coefficients';
import type { Analysis, Design, Site } from '../types';
import type { Massing } from './massing';

export function systemStiffness(design: Design): number {
  const C = COEFFICIENTS.wind;
  const base = C.systemStiffness[design.system];
  const upTo = C.systemEfficientUpTo[design.system];
  const heightPenalty = design.floors > upTo ? Math.pow(upTo / design.floors, 1.5) : 1;
  return (
    base *
    heightPenalty *
    C.materialStiffness[design.material] *
    (design.exposedStructure ? C.exposedStructureStiffness : 1)
  );
}

/** Wind response multiplier from shape alone (1 = blunt square box). */
export function windShapeFactor(design: Design): number {
  const C = COEFFICIENTS.wind;
  return (
    (C.dragByShape[design.shape] / C.dragByShape.square) *
    C.setbackFactor[design.setbacks] *
    (1 - C.twistMaxReduction * Math.min(design.twist / 120, 1)) *
    (1 - C.taperReduction * design.taper)
  );
}

export function analyzeWind(site: Site, design: Design, m: Massing): Analysis['wind'] {
  const C = COEFFICIENTS.wind;
  const pressure = (site.windSpeed / C.referenceWindSpeed) ** 2;
  const areaRatio = m.frontalArea / (m.baseWidth * m.bodyHeight);
  const slender = (m.slenderness / C.referenceSlenderness) ** 2;
  const heightFactor = Math.sqrt(m.bodyHeight / 200);
  const driftRatio =
    (C.driftScale * pressure * windShapeFactor(design) * areaRatio * slender * heightFactor) /
    systemStiffness(design);
  const accelMg = (C.accelScale * driftRatio) / C.dampingReduction[design.damping];
  return { driftRatio, accelMg, comfortLimitMg: C.comfortLimitMg[m.topUse] };
}
```

`src/sim/analysis/seismic.ts`:

```ts
import { COEFFICIENTS } from '../catalog/coefficients';
import type { Analysis, Design, Site } from '../types';
import type { Massing } from './massing';

export function analyzeSeismic(site: Site, design: Design, m: Massing): Analysis['seismic'] {
  const C = COEFFICIENTS.seismic;
  const periodS = Math.max(0.2, design.floors * C.periodPerFloor);
  const spectral = site.seismicHazard * Math.sqrt(Math.min(1, C.cornerPeriodS / periodS));
  const irregularity =
    C.shapeIrregularity[design.shape] *
    C.setbackIrregularity[design.setbacks] *
    (design.amenities.includes('pool') ? C.poolIrregularity : 1);
  const demand =
    (spectral * (m.unitWeight / C.referenceKNPerM2) * irregularity) /
    ((design.baseIsolation ? C.isolationReduction : 1) * C.dampingReduction[design.damping]);
  const capacity =
    C.baseCapacityG * C.ductilityByMaterial[design.material] * C.ductilityBySystem[design.system];
  const ratio = demand / capacity;
  const outcome = ratio <= C.operationalRatio ? 'operational' : ratio <= C.damagedRatio ? 'damaged' : 'fails';
  return { periodS, ratio, outcome };
}
```


- [ ] **Step 5: Implement foundation and elevators**

`src/sim/analysis/foundation.ts`:

```ts
import { COEFFICIENTS } from '../catalog/coefficients';
import type { Analysis, Design, Site } from '../types';
import type { Massing } from './massing';

export function analyzeFoundation(site: Site, design: Design, m: Massing): Analysis['foundation'] {
  const soil = site.foundation[design.foundation];
  const pressureKPa = m.weightKN / m.footprint;
  const utilization = pressureKPa / soil.capacity;
  return {
    pressureKPa,
    capacityKPa: soil.capacity,
    utilization,
    settlementCm: utilization * soil.settlementCm,
  };
}

export function foundationCost(site: Site, design: Design, m: Massing): number {
  const rate = COEFFICIENTS.foundation.costPerM2[design.foundation];
  return m.footprint * rate * site.foundation[design.foundation].costFactor * (1 + design.floors / 100);
}
```

`src/sim/analysis/elevators.ts`:

```ts
import { COEFFICIENTS } from '../catalog/coefficients';
import { FLOOR_HEIGHT } from '../geometry';
import type { Analysis, Design, ElevatorZoning, UseType } from '../types';
import { USE_ORDER } from '../types';
import type { Massing } from './massing';

export const ZONE_COUNT: Record<ElevatorZoning, number> = { single: 1, 'two-zone': 2, 'sky-lobby': 3 };

/** Elevator speed grows with building height, m/s. */
export function carSpeed(bodyHeight: number): number {
  return Math.min(10, 2.5 + bodyHeight / 100);
}

/** Expected number of stops for a car carrying `passengers` among `floors` floors. */
export function probableStops(floors: number, passengers: number): number {
  if (floors <= 1) return 1;
  return floors * (1 - Math.pow(1 - 1 / floors, passengers));
}

function dominantUse(m: Massing): UseType {
  let best: UseType = 'office';
  for (const u of USE_ORDER) if (u !== 'retail' && m.areaByUse[u] > m.areaByUse[best]) best = u;
  return best;
}

export function analyzeElevators(design: Design, m: Massing): Analysis['elevators'] {
  const C = COEFFICIENTS.elevators;
  let population = 0;
  let peakDemand = 0;
  for (const u of USE_ORDER) {
    const people = m.areaByUse[u] / C.m2PerPerson[u];
    population += people;
    peakDemand += people * C.peakFiveMinShare[u];
  }
  const zones = ZONE_COUNT[design.zoning];
  const localCars = design.zoning === 'sky-lobby' ? design.elevators * (1 - C.skyLobbyShuttleShare) : design.elevators;
  const maxUsefulCars = zones * C.maxCarsPerZone;
  const carsPerZone = Math.min(localCars / zones, C.maxCarsPerZone);
  const effectiveCars = carsPerZone * zones;

  const zoneFloors = design.floors / zones;
  const zoneHeight = zoneFloors * FLOOR_HEIGHT;
  // Average express run to reach a zone: zero for one zone; otherwise the middle zone's start.
  const expressHeight = zones === 1 ? 0 : ((zones - 1) / 2) * zoneHeight;
  const speed = carSpeed(m.bodyHeight);
  const roundTrip =
    (2 * zoneHeight) / speed +
    (2 * expressHeight) / C.expressSpeed +
    probableStops(zoneFloors, C.passengersPerTrip) * C.secondsPerStop;

  const zoneDemand = peakDemand / zones;
  const zoneCapacity = carsPerZone > 0 ? carsPerZone * (300 / roundTrip) * C.passengersPerTrip : 0;
  const overload = zoneCapacity > 0 ? Math.max(1, zoneDemand / zoneCapacity) : 100;
  const interval = carsPerZone > 0 ? roundTrip / carsPerZone : 999;
  const avgWaitS = Math.min(999, C.waitPerInterval * interval * overload * overload);

  return {
    population: Math.round(population),
    peakDemand: Math.round(peakDemand),
    avgWaitS,
    targetS: C.targetWaitS[dominantUse(m)],
    effectiveCars,
    maxUsefulCars,
  };
}

export function elevatorCost(design: Design): number {
  const C = COEFFICIENTS.elevators;
  const floorsServed = design.floors / ZONE_COUNT[design.zoning];
  const cars = design.elevators * (C.carBaseCost + C.carCostPerFloorServed * floorsServed);
  return cars + (design.zoning === 'sky-lobby' ? C.skyLobbyCost : 0);
}
```


- [ ] **Step 6: Implement energy, cost and schedule**

`src/sim/analysis/energy.ts`:

```ts
import { COEFFICIENTS } from '../catalog/coefficients';
import type { Analysis, Design, Site } from '../types';
import type { Massing } from './massing';

export function analyzeEnergy(site: Site, design: Design, m: Massing): Analysis['energy'] {
  const C = COEFFICIENTS.energy;
  const wr = design.windowRatio;
  const heatLoss = wr * 1 + (1 - wr) * C.opaqueHeatLoss[design.facade];
  const solarGain = 0.5 + wr;
  const euiKWhPerM2 =
    (C.baseEui + C.heatingEui * site.climate.heating * heatLoss + C.coolingEui * site.climate.cooling * solarGain) *
    C.gradeFactor[design.systemsGrade];
  return { euiKWhPerM2, annualCost: euiKWhPerM2 * m.gfa * C.dollarsPerKWh };
}
```

`src/sim/analysis/cost.ts`:

```ts
import { COEFFICIENTS } from '../catalog/coefficients';
import type { CostBreakdown, Design, Site } from '../types';
import { USE_ORDER } from '../types';
import { elevatorCost } from './elevators';
import { foundationCost } from './foundation';
import type { Massing } from './massing';

export function analyzeCost(site: Site, design: Design, m: Massing): CostBreakdown {
  const C = COEFFICIENTS.cost;
  const structure =
    m.gfa *
    C.structurePerM2[design.material] *
    C.systemCostFactor[design.system] *
    (1 + design.floors / C.heightPremiumFloors) *
    (design.exposedStructure ? C.exposedStructureFactor : 1);
  const wallRate = design.windowRatio * C.windowPerM2 + (1 - design.windowRatio) * C.opaquePerM2[design.facade];
  const facade = m.facadeArea * wallRate * C.ornamentFactor[design.ornament];
  const interiors = USE_ORDER.reduce((s, u) => s + m.areaByUse[u] * C.interiorsPerM2[u], 0);
  const systems = m.gfa * C.systemsPerM2[design.systemsGrade];
  const elevators = elevatorCost(design);
  const damping = C.dampingCost60[design.damping] * (design.floors / 60);
  const isolation = design.baseIsolation ? m.footprint * C.isolationPerM2 : 0;
  const amenities = design.amenities.reduce((s, a) => s + C.amenityCost[a], 0);
  const foundation = foundationCost(site, design, m);
  const parts = { structure, foundation, facade, interiors, systems, elevators, damping, isolation, amenities };
  const k = site.costMultiplier;
  const scaled = Object.fromEntries(Object.entries(parts).map(([key, v]) => [key, v * k])) as Omit<CostBreakdown, 'total'>;
  const total = Object.values(scaled).reduce((s, v) => s + v, 0);
  return { ...scaled, total };
}
```

`src/sim/analysis/schedule.ts`:

```ts
import { COEFFICIENTS } from '../catalog/coefficients';
import type { Analysis, Design, SchedulePhase } from '../types';

export function analyzeSchedule(design: Design): Analysis['schedule'] {
  const C = COEFFICIENTS.schedule;
  const perFloor =
    C.daysPerFloor[design.material] *
    (design.system === 'diagrid' ? C.diagridFactor : 1) *
    (design.exposedStructure ? C.exposedStructureFactor : 1);
  const excavation = C.excavationDays;
  const foundation = C.foundationDays[design.foundation];
  const structureStart = excavation + foundation;
  const structureDays = Math.round(design.floors * perFloor);
  const facadeStart = structureStart + Math.round(Math.min(C.facadeLagFloors, design.floors) * perFloor);
  const crownStart = structureStart + structureDays;
  const crownDays = C.crownDays + C.amenityDays * design.amenities.length;
  const fitoutStart = crownStart;
  const phases: SchedulePhase[] = [
    { id: 'excavation', label: 'Excavation', startDay: 0, days: excavation },
    { id: 'foundation', label: 'Foundation', startDay: excavation, days: foundation },
    { id: 'structure', label: 'Core and frame', startDay: structureStart, days: structureDays },
    { id: 'facade', label: 'Facade', startDay: facadeStart, days: crownStart - facadeStart + 20 },
    { id: 'crown', label: 'Crown and amenities', startDay: crownStart, days: crownDays },
    { id: 'fitout', label: 'Interiors and opening', startDay: fitoutStart, days: C.fitoutDays },
  ];
  const totalDays = Math.max(...phases.map((p) => p.startDay + p.days));
  return { phases, totalDays };
}
```


- [ ] **Step 7: Implement `analyze` and the checks**

`src/sim/analysis/index.ts`:

```ts
import { COEFFICIENTS } from '../catalog/coefficients';
import type { Analysis, Check, CheckStatus, Design, Site } from '../types';
import { analyzeCost } from './cost';
import { analyzeElevators } from './elevators';
import { analyzeEnergy } from './energy';
import { analyzeFoundation } from './foundation';
import { computeMassing } from './massing';
import { analyzeSchedule } from './schedule';
import { analyzeSeismic } from './seismic';
import { analyzeWind } from './wind';

function statusFor(value: number, pass: number, marginal: number): CheckStatus {
  if (value <= pass) return 'pass';
  if (value <= marginal) return 'marginal';
  return 'fail';
}

const round = (v: number, d = 0) => Math.round(v * 10 ** d) / 10 ** d;

export function analyze(site: Site, design: Design): Analysis {
  const m = computeMassing(design);
  const wind = analyzeWind(site, design, m);
  const seismic = analyzeSeismic(site, design, m);
  const foundation = analyzeFoundation(site, design, m);
  const elevators = analyzeElevators(design, m);
  const energy = analyzeEnergy(site, design, m);
  const cost = analyzeCost(site, design, m);
  const schedule = analyzeSchedule(design);
  const W = COEFFICIENTS.wind;
  const E = COEFFICIENTS.energy;

  const driftStatus = statusFor(wind.driftRatio, W.driftPass, W.driftMarginal);
  const comfortStatus = statusFor(wind.accelMg, wind.comfortLimitMg, wind.comfortLimitMg * 1.3);
  const seismicStatus: CheckStatus =
    seismic.outcome === 'operational' ? 'pass' : seismic.outcome === 'damaged' ? 'marginal' : 'fail';
  const foundationStatus = statusFor(foundation.utilization, COEFFICIENTS.foundation.passUtilization, 1);
  const elevatorStatus = statusFor(elevators.avgWaitS, elevators.targetS, elevators.targetS * 1.5);
  const energyStatus = statusFor(energy.euiKWhPerM2, E.euiPass, E.euiMarginal);
  const oneIn = Math.round(1 / wind.driftRatio);

  const checks: Check[] = [
    {
      id: 'windStrength',
      label: 'Wind strength',
      status: driftStatus,
      value: wind.driftRatio,
      limit: W.driftPass,
      unit: 'drift',
      message:
        driftStatus === 'fail'
          ? `In a design windstorm the top would move 1/${oneIn} of the height — too much. Make it stiffer, wider, rounder, or tapered.`
          : `In a design windstorm the top moves about 1/${oneIn} of the height (limit 1/500).`,
    },
    {
      id: 'windComfort',
      label: 'Sway comfort',
      status: comfortStatus,
      value: wind.accelMg,
      limit: wind.comfortLimitMg,
      unit: 'milli-g',
      message:
        comfortStatus === 'pass'
          ? `Top-floor shaking about ${round(wind.accelMg, 1)} milli-g — people won't notice (limit ${wind.comfortLimitMg}).`
          : `Top-floor shaking about ${round(wind.accelMg, 1)} milli-g — people would feel queasy (limit ${wind.comfortLimitMg}). Dampers help most.`,
    },
    {
      id: 'seismic',
      label: 'Earthquake',
      status: seismicStatus,
      value: seismic.ratio,
      limit: COEFFICIENTS.seismic.operationalRatio,
      unit: 'demand/capacity',
      message:
        seismic.outcome === 'operational'
          ? 'In the design earthquake the building stays fully operational.'
          : seismic.outcome === 'damaged'
            ? 'In the design earthquake the building survives but needs repairs. Isolation, dampers, or a lighter, more ductile structure would help.'
            : 'Failed structural engineering assessment: the design earthquake would cause dangerous damage.',
    },
    {
      id: 'foundation',
      label: 'Foundation',
      status: foundationStatus,
      value: foundation.utilization,
      limit: 1,
      unit: 'utilization',
      message:
        foundationStatus === 'fail'
          ? `Failed structural engineering assessment: the ground can't carry this weight on a ${design.foundation} foundation — it would settle about ${round(foundation.settlementCm)} cm.`
          : `The ${design.foundation} foundation uses ${Math.round(foundation.utilization * 100)}% of its capacity and settles about ${round(foundation.settlementCm, 1)} cm.`,
    },
    {
      id: 'elevators',
      label: 'Elevator wait',
      status: elevatorStatus,
      value: elevators.avgWaitS,
      limit: elevators.targetS,
      unit: 's',
      message:
        elevators.avgWaitS >= 999
          ? 'No working elevators — nobody can get upstairs!'
          : `Morning rush average wait about ${Math.round(elevators.avgWaitS)} s (target ${elevators.targetS} s).`,
    },
    {
      id: 'energy',
      label: 'Energy use',
      status: energyStatus,
      value: energy.euiKWhPerM2,
      limit: E.euiPass,
      unit: 'kWh/m²/yr',
      message: `Uses about ${Math.round(energy.euiKWhPerM2)} kWh per m² per year (good is under ${E.euiPass}).`,
    },
  ];

  return {
    heightM: m.heightM,
    gfa: m.gfa,
    footprint: m.footprint,
    weightKN: m.weightKN,
    slenderness: m.slenderness,
    wind,
    seismic,
    foundation,
    elevators,
    energy,
    cost,
    schedule,
    checks,
  };
}
```


- [ ] **Step 8: Run to verify it passes**

Run: `npx vitest run src/sim && npm run typecheck`
Expected: all analysis tests PASS (22 tests in `analysis.test.ts`), earlier sim tests still PASS; typecheck clean. If a directional test fails, re-check the coefficient values against Task 2 — do not loosen the test.

- [ ] **Step 9: Commit**

```bash
git add src/sim/analysis
git commit -m "feat(sim): add rule-of-thumb analysis for wind, quake, foundation, elevators, energy, cost, schedule

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Parameter catalog and design actions

**Files:**
- Create: `src/sim/catalog/parameters.ts`, `src/sim/actions.ts`
- Test: `src/sim/catalog/parameters.test.ts`, `src/sim/actions.test.ts`

**Interfaces:**
- Consumes: `design.ts`, `styles.ts`, `amenities.ts`, types (Task 2).
- Produces:
  - `PARAMS: ParamDef[]`, `PARAMS_BY_ID`, `PARAM_GROUPS`, `type ParamId`, `type ParamGroupId`, `type ParamDef = NumberParam | EnumParam | BooleanParam`, `paramMax(def, site, design)`, `visibleParams(level, design)`.
  - `type GamePhase = 'design' | 'building' | 'complete'`.
  - `type DesignAction` = `set_parameter {id, value}` | `apply_style_preset {style}` | `add_amenity {id}` | `remove_amenity {id}` | `set_use_mix {mix}` — these names are also the future LLM tool names (Plan 2).
  - `validateAction(action, design, site, phase): {ok: true} | {ok: false, reason}` — reasons are kid-readable sentences.
  - `applyActions(design, actions, site, phase): { design, applied, rejected: {action, reason}[] }` — invalid actions are skipped, valid ones still apply.

- [ ] **Step 1: Write the failing tests**

`src/sim/catalog/parameters.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { applyActions } from '../actions';
import { applyStylePreset, defaultDesign } from '../design';
import { SITES, SITE_IDS } from '../sites';
import { PARAMS, visibleParams } from './parameters';
import { STYLE_IDS } from './styles';

describe('parameters', () => {
  it('every parameter maps to a design field and has an explanation', () => {
    const design = defaultDesign(SITES.chicago);
    for (const p of PARAMS) {
      expect(p.id in design).toBe(true);
      expect(p.explain.length).toBeGreaterThan(10);
      if (p.kind === 'enum') {
        expect(p.options.length).toBeGreaterThan(1);
        for (const o of p.options) expect(o.explain.length).toBeGreaterThan(3);
      }
    }
  });

  it('shows depth only for rectangular towers', () => {
    const design = defaultDesign(SITES.chicago);
    const ids = (shape: typeof design.shape) => visibleParams('standard', { ...design, shape }).map((p) => p.id);
    expect(ids('square')).not.toContain('plateDepth');
    expect(ids('rectangle')).toContain('plateDepth');
  });

  it('every style preset produces a design every control accepts', () => {
    for (const siteId of SITE_IDS) {
      const site = SITES[siteId];
      for (const style of STYLE_IDS) {
        const design = applyStylePreset(defaultDesign(site), style);
        const actions = PARAMS.map((p) => ({ type: 'set_parameter' as const, id: p.id, value: design[p.id] }));
        const result = applyActions(design, actions, site, 'design');
        expect(result.rejected, `${siteId}/${style}`).toEqual([]);
      }
    }
  });
});
```

`src/sim/actions.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { applyActions, validateAction, type DesignAction } from './actions';
import { designFor } from './testUtils';

describe('actions', () => {
  const { site, design } = designFor('new-york');

  it('applies valid actions and reports invalid ones without blocking the rest', () => {
    const actions = [
      { type: 'set_parameter', id: 'floors', value: 60 },
      { type: 'set_parameter', id: 'floors', value: 500 },
      { type: 'set_parameter', id: 'plateWidth', value: 31 },
      { type: 'set_parameter', id: 'shape', value: 'hexagon' },
      { type: 'add_amenity', id: 'pool' },
      { type: 'set_parameter', id: 'flux_capacitor', value: 1 },
    ] as unknown as DesignAction[];
    const r = applyActions(design, actions, site, 'design');
    expect(r.design.floors).toBe(60);
    expect(r.design.amenities).toEqual(['pool']);
    expect(r.applied).toHaveLength(2);
    expect(r.rejected.map((x) => x.reason)).toEqual([
      'Floors must be between 5 and 150.',
      'Width must be between 15 and 30.',
      'Floor shape can be: Square, Rectangle, Round, Triangle.',
      '"flux_capacitor" is not something this game can change.',
    ]);
  });

  it('rejects every change once construction starts', () => {
    const r = applyActions(design, [{ type: 'set_parameter', id: 'floors', value: 60 }], site, 'building');
    expect(r.applied).toEqual([]);
    expect(r.rejected[0].reason).toMatch(/locked/);
  });

  it('snaps numbers to the control step', () => {
    const r = applyActions(design, [{ type: 'set_parameter', id: 'twist', value: 33 }], site, 'design');
    expect(r.design.twist).toBe(35);
  });

  it('applying a style preset changes looks but not the structure', () => {
    const r = applyActions(design, [{ type: 'apply_style_preset', style: 'art-deco' }], site, 'design');
    expect(r.design.style).toBe('art-deco');
    expect(r.design.setbacks).toBe('wedding-cake');
    expect(r.design.system).toBe(design.system);
  });

  it('does not add the same amenity twice, and removes it', () => {
    let d = applyActions(design, [{ type: 'add_amenity', id: 'helipad' }, { type: 'add_amenity', id: 'helipad' }], site, 'design').design;
    expect(d.amenities).toEqual(['helipad']);
    d = applyActions(d, [{ type: 'remove_amenity', id: 'helipad' }], site, 'design').design;
    expect(d.amenities).toEqual([]);
  });

  it('refuses a use mix with every use at zero', () => {
    const v = validateAction({ type: 'set_use_mix', mix: { retail: 0, office: 0, hotel: 0, residential: 0 } }, design, site, 'design');
    expect(v.ok).toBe(false);
  });

  it('accepts a partial use mix', () => {
    const r = applyActions(design, [{ type: 'set_use_mix', mix: { hotel: 40 } }], site, 'design');
    expect(r.design.useMix.hotel).toBe(40);
    expect(r.design.useMix.office).toBe(design.useMix.office);
  });
});
```


- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/sim/actions.test.ts src/sim/catalog/parameters.test.ts`
Expected: FAIL — cannot resolve `./parameters` / `./actions`.

- [ ] **Step 3: Implement the parameter catalog**

`src/sim/catalog/parameters.ts`:

```ts
import { maxPlateDepth, maxPlateWidth } from '../design';
import type { Design, DetailLevel, Site } from '../types';

export type ParamGroupId = 'form' | 'structure' | 'foundation' | 'facade' | 'elevators' | 'systems';

export const PARAM_GROUPS: { id: ParamGroupId; label: string }[] = [
  { id: 'form', label: 'Shape' },
  { id: 'structure', label: 'Structure' },
  { id: 'foundation', label: 'Foundation' },
  { id: 'facade', label: 'Facade' },
  { id: 'elevators', label: 'Elevators' },
  { id: 'systems', label: 'Building systems' },
];

export type ParamId =
  | 'floors' | 'plateWidth' | 'plateDepth' | 'shape' | 'setbacks' | 'taper' | 'twist' | 'crown'
  | 'system' | 'material' | 'exposedStructure' | 'damping' | 'baseIsolation'
  | 'foundation' | 'facade' | 'windowRatio' | 'elevators' | 'zoning' | 'systemsGrade';

interface ParamBase {
  id: ParamId;
  group: ParamGroupId;
  label: string;
  /** Plain-language explanation for ages 12–15. */
  explain: string;
  /** Extra detail shown at the advanced level. */
  explainAdvanced?: string;
  minDetailLevel: DetailLevel;
  /** Hide this control unless the predicate holds (e.g. depth only for rectangles). */
  visibleWhen?: (design: Design) => boolean;
}

export interface NumberParam extends ParamBase {
  kind: 'number';
  min: number;
  /** Static maximum; `maxFor` overrides it when the site or design limits it. */
  max: number;
  maxFor?: (site: Site, design: Design) => number;
  step: number;
  unit: string;
  /** Show as a percentage (value × 100). */
  percent?: boolean;
}

export interface EnumOption {
  value: string;
  label: string;
  explain: string;
}

export interface EnumParam extends ParamBase {
  kind: 'enum';
  options: EnumOption[];
}

export interface BooleanParam extends ParamBase {
  kind: 'boolean';
}

export type ParamDef = NumberParam | EnumParam | BooleanParam;

export const PARAMS: ParamDef[] = [
  {
    id: 'floors', group: 'form', kind: 'number', label: 'Floors', min: 5, max: 150, step: 1, unit: 'floors',
    minDetailLevel: 'standard',
    explain: 'More floors means more space to rent — but more weight, more wind, and more elevators.',
  },
  {
    id: 'plateWidth', group: 'form', kind: 'number', label: 'Width', min: 15, max: 80, step: 1, unit: 'm',
    maxFor: (site, design) => maxPlateWidth(site, design),
    minDetailLevel: 'standard',
    explain: 'How wide each floor is. Wider towers are stiffer against wind, but the lot limits how wide you can go.',
  },
  {
    id: 'plateDepth', group: 'form', kind: 'number', label: 'Depth', min: 15, max: 80, step: 1, unit: 'm',
    maxFor: (site) => maxPlateDepth(site),
    visibleWhen: (d) => d.shape === 'rectangle',
    minDetailLevel: 'standard',
    explain: 'How deep each floor is (front to back). Only used for rectangular towers.',
  },
  {
    id: 'shape', group: 'form', kind: 'enum', label: 'Floor shape', minDetailLevel: 'standard',
    explain: 'The outline of each floor seen from above. Wind slips around round shapes more easily than square ones.',
    options: [
      { value: 'square', label: 'Square', explain: 'Simple and efficient to build; catches the most wind.' },
      { value: 'rectangle', label: 'Rectangle', explain: 'Lets you set width and depth separately.' },
      { value: 'circle', label: 'Round', explain: 'Wind flows around it — much less sway. Less floor area for the width.' },
      { value: 'triangle', label: 'Triangle', explain: 'Dramatic and good for views, but twists more in earthquakes.' },
    ],
  },
  {
    id: 'setbacks', group: 'form', kind: 'enum', label: 'Setbacks', minDetailLevel: 'standard',
    explain: 'Steps where the tower gets narrower as it rises. They let light reach the street and break up the wind.',
    options: [
      { value: 'none', label: 'None', explain: 'Straight up — the most floor space.' },
      { value: 'few', label: 'A few steps', explain: 'Two steps near the top.' },
      { value: 'wedding-cake', label: 'Wedding cake', explain: 'Four steps, like 1930s New York towers.' },
    ],
  },
  {
    id: 'taper', group: 'form', kind: 'number', label: 'Taper', min: 0, max: 0.6, step: 0.05, unit: '%', percent: true,
    minDetailLevel: 'standard',
    explain: 'How much narrower the top is than the bottom. Tapering cuts wind load and weight up high.',
  },
  {
    id: 'twist', group: 'form', kind: 'number', label: 'Twist', min: 0, max: 120, step: 5, unit: '°',
    minDetailLevel: 'standard',
    explain: 'Rotating each floor a little confuses the wind so it cannot push the tower in rhythm.',
  },
  {
    id: 'crown', group: 'form', kind: 'enum', label: 'Crown', minDetailLevel: 'standard',
    explain: 'The top of the tower. Mostly about looks — but it adds height.',
    options: [
      { value: 'flat', label: 'Flat roof', explain: 'Simple; good for a helipad or pool.' },
      { value: 'spire', label: 'Spire', explain: 'A tall needle on top — adds a lot of height.' },
      { value: 'pointed', label: 'Pointed', explain: 'A pyramid-like cap.' },
      { value: 'stepped', label: 'Stepped', explain: 'Small boxes stacked like a ziggurat.' },
      { value: 'sloped', label: 'Sloped', explain: 'A slanted top, like a ramp to the sky.' },
    ],
  },
  {
    id: 'system', group: 'structure', kind: 'enum', label: 'Structural system', minDetailLevel: 'standard',
    explain: "The skeleton that keeps the tower standing and stiff. Each system works best up to a certain height.",
    options: [
      { value: 'rigid-frame', label: 'Rigid frame', explain: 'Beams and columns locked together. Cheap, but floppy above ~30 floors.' },
      { value: 'framed-tube', label: 'Framed tube', explain: 'Closely spaced outer columns act like one big hollow tube. Good to ~60 floors.' },
      { value: 'core-outrigger', label: 'Core + outriggers', explain: 'A concrete core tied to outer columns by giant arms. Good to ~100 floors.' },
      { value: 'bundled-tube', label: 'Bundled tube', explain: 'Several tubes bundled together, like Willis Tower. Good to ~110 floors.' },
      { value: 'diagrid', label: 'Diagrid', explain: 'A diagonal grid on the outside. Stiff and uses less steel, but slower to build.' },
      { value: 'buttressed-core', label: 'Buttressed core', explain: "A Y-shaped core braced by wings, like Burj Khalifa. Works for the very tallest." },
    ],
  },
  {
    id: 'material', group: 'structure', kind: 'enum', label: 'Main material', minDetailLevel: 'standard',
    explain: 'What the structure is made of.',
    options: [
      { value: 'steel', label: 'Steel', explain: 'Light and fast to build, bends without breaking in quakes, but costs more.' },
      { value: 'concrete', label: 'Concrete', explain: 'Cheap and stiff, but heavy and slower to build.' },
      { value: 'composite', label: 'Composite', explain: 'Steel inside concrete — the stiffest mix, used in most supertalls.' },
    ],
  },
  {
    id: 'exposedStructure', group: 'structure', kind: 'boolean', label: 'Exposed outside bracing', minDetailLevel: 'standard',
    explain: 'Giant X-braces on the outside of the tower, like the Hancock Center. Much stiffer, a bit heavier and pricier.',
  },
  {
    id: 'damping', group: 'structure', kind: 'enum', label: 'Dampers', minDetailLevel: 'standard',
    explain: 'Devices that soak up shaking so people at the top do not feel sick.',
    options: [
      { value: 'none', label: 'None', explain: 'No dampers.' },
      { value: 'tmd', label: 'Tuned mass damper', explain: 'A huge swinging weight near the top that sways against the wind. Best for wind.' },
      { value: 'viscous', label: 'Viscous dampers', explain: 'Shock absorbers built into the frame. Help with both wind and earthquakes.' },
    ],
  },
  {
    id: 'baseIsolation', group: 'structure', kind: 'boolean', label: 'Base isolation', minDetailLevel: 'standard',
    explain: 'Rubber-and-steel bearings under the building let the ground shake while the tower stays calmer. Great in earthquake zones, wasted money elsewhere.',
  },
  {
    id: 'foundation', group: 'foundation', kind: 'enum', label: 'Foundation', minDetailLevel: 'standard',
    explain: 'How the tower stands on the ground. Soft soil needs deeper foundations.',
    options: [
      { value: 'mat', label: 'Shallow mat', explain: 'A thick concrete slab. Cheap — fine on rock, sinks in mud.' },
      { value: 'raft', label: 'Raft', explain: 'A deeper, thicker slab with basements. Spreads weight wider.' },
      { value: 'piles', label: 'Piles', explain: 'Hundreds of long columns driven deep; friction holds them in soft soil.' },
      { value: 'caissons', label: 'Caissons to bedrock', explain: 'Giant drilled concrete shafts that reach solid rock. Best if rock is in reach.' },
    ],
  },
  {
    id: 'facade', group: 'facade', kind: 'enum', label: 'Facade', minDetailLevel: 'standard',
    explain: 'The outer skin. It affects weight, cost, energy, and looks.',
    options: [
      { value: 'glass', label: 'Glass curtain wall', explain: 'Light and bright, but loses heat in winter and gains it in summer.' },
      { value: 'masonry', label: 'Stone / brick', explain: 'Beautiful and well-insulated, but very heavy.' },
      { value: 'precast', label: 'Precast concrete', explain: 'Cheap, sturdy panels made in a factory.' },
      { value: 'metal', label: 'Metal panels', explain: 'Light and modern; middling insulation.' },
    ],
  },
  {
    id: 'windowRatio', group: 'facade', kind: 'number', label: 'Window area', min: 0.2, max: 0.95, step: 0.05, unit: '%', percent: true,
    minDetailLevel: 'standard',
    explain: 'How much of the wall is window. More windows = better views but more heating and cooling.',
  },
  {
    id: 'elevators', group: 'elevators', kind: 'number', label: 'Elevator cars', min: 2, max: 120, step: 1, unit: 'cars',
    minDetailLevel: 'standard',
    explain: 'More cars means shorter waits — but each one costs money and takes up floor space.',
  },
  {
    id: 'zoning', group: 'elevators', kind: 'enum', label: 'Elevator zoning', minDetailLevel: 'standard',
    explain: 'Tall towers split elevators into zones so each car stops at fewer floors.',
    options: [
      { value: 'single', label: 'One zone', explain: 'Every car serves every floor. Fine for shorter towers.' },
      { value: 'two-zone', label: 'Low / high zones', explain: 'Some cars serve the bottom half, others express to the top half.' },
      { value: 'sky-lobby', label: 'Sky lobbies', explain: 'Express shuttles to lobbies high up, then local cars. Used in supertalls.' },
    ],
  },
  {
    id: 'systemsGrade', group: 'systems', kind: 'enum', label: 'Systems quality', minDetailLevel: 'standard',
    explain: 'Heating, cooling, lighting, and water systems. Better systems cost more but save energy every year.',
    options: [
      { value: 'standard', label: 'Standard', explain: 'Normal equipment.' },
      { value: 'efficient', label: 'Efficient', explain: 'Better equipment and controls — about 20% less energy.' },
      { value: 'green', label: 'Green', explain: 'Top-tier: heat recovery, smart controls, solar — about 40% less energy.' },
    ],
  },
];

export const PARAMS_BY_ID = Object.fromEntries(PARAMS.map((p) => [p.id, p])) as Record<ParamId, ParamDef>;

export function paramMax(def: NumberParam, site: Site, design: Design): number {
  return def.maxFor ? Math.min(def.max, def.maxFor(site, design)) : def.max;
}

export function visibleParams(level: DetailLevel, design: Design): ParamDef[] {
  return PARAMS.filter(
    (p) => (level === 'advanced' || p.minDetailLevel === 'standard') && (!p.visibleWhen || p.visibleWhen(design)),
  );
}
```


- [ ] **Step 4: Implement actions**

`src/sim/actions.ts`:

```ts
import { AMENITIES } from './catalog/amenities';
import { PARAMS_BY_ID, paramMax, type ParamId } from './catalog/parameters';
import { STYLE_PRESETS } from './catalog/styles';
import { applyStylePreset, normalizeDesign } from './design';
import type { AmenityId, Design, Site, StyleId, UseType } from './types';
import { USE_ORDER } from './types';

export type GamePhase = 'design' | 'building' | 'complete';

export type DesignAction =
  | { type: 'set_parameter'; id: ParamId; value: number | string | boolean }
  | { type: 'apply_style_preset'; style: StyleId }
  | { type: 'add_amenity'; id: AmenityId }
  | { type: 'remove_amenity'; id: AmenityId }
  | { type: 'set_use_mix'; mix: Partial<Record<UseType, number>> };

export type ValidationResult = { ok: true } | { ok: false; reason: string };

export interface ApplyResult {
  design: Design;
  applied: DesignAction[];
  rejected: { action: DesignAction; reason: string }[];
}

export function validateAction(action: DesignAction, design: Design, site: Site, phase: GamePhase): ValidationResult {
  if (phase !== 'design') return { ok: false, reason: 'The design is locked once construction starts.' };
  switch (action.type) {
    case 'set_parameter': {
      const def = PARAMS_BY_ID[action.id as ParamId];
      if (!def) return { ok: false, reason: `"${action.id}" is not something this game can change.` };
      if (def.kind === 'number') {
        if (typeof action.value !== 'number' || !Number.isFinite(action.value))
          return { ok: false, reason: `${def.label} needs a number.` };
        const max = paramMax(def, site, design);
        if (action.value < def.min || action.value > max)
          return { ok: false, reason: `${def.label} must be between ${def.min} and ${max}.` };
        return { ok: true };
      }
      if (def.kind === 'boolean') {
        return typeof action.value === 'boolean' ? { ok: true } : { ok: false, reason: `${def.label} must be on or off.` };
      }
      if (!def.options.some((o) => o.value === action.value))
        return { ok: false, reason: `${def.label} can be: ${def.options.map((o) => o.label).join(', ')}.` };
      return { ok: true };
    }
    case 'apply_style_preset':
      return STYLE_PRESETS[action.style] ? { ok: true } : { ok: false, reason: `There is no "${action.style}" style.` };
    case 'add_amenity':
    case 'remove_amenity':
      return AMENITIES[action.id] ? { ok: true } : { ok: false, reason: `There is no "${action.id}" amenity.` };
    case 'set_use_mix': {
      const entries = Object.entries(action.mix);
      if (entries.length === 0) return { ok: false, reason: 'The use mix is empty.' };
      for (const [use, v] of entries) {
        if (!USE_ORDER.includes(use as UseType)) return { ok: false, reason: `"${use}" is not a building use.` };
        if (typeof v !== 'number' || v < 0 || v > 100) return { ok: false, reason: 'Use percentages must be 0–100.' };
      }
      const merged = { ...design.useMix, ...action.mix };
      if (USE_ORDER.every((u) => merged[u] <= 0)) return { ok: false, reason: 'At least one use must be above 0%.' };
      return { ok: true };
    }
  }
}

/** Apply one already-validated action. */
export function applyAction(design: Design, action: DesignAction, site: Site): Design {
  switch (action.type) {
    case 'set_parameter': {
      const def = PARAMS_BY_ID[action.id];
      let value = action.value;
      if (def.kind === 'number' && typeof value === 'number') value = Math.round(value / def.step) * def.step;
      if (def.kind === 'number' && typeof value === 'number') value = Number(value.toFixed(4));
      return normalizeDesign({ ...design, [action.id]: value }, site);
    }
    case 'apply_style_preset':
      return normalizeDesign(applyStylePreset(design, action.style), site);
    case 'add_amenity':
      return design.amenities.includes(action.id) ? design : { ...design, amenities: [...design.amenities, action.id] };
    case 'remove_amenity':
      return { ...design, amenities: design.amenities.filter((a) => a !== action.id) };
    case 'set_use_mix':
      return { ...design, useMix: { ...design.useMix, ...action.mix } };
  }
}

/** Validate and apply a batch. Invalid actions are skipped and reported; valid ones still apply. */
export function applyActions(
  design: Design,
  actions: DesignAction[],
  site: Site,
  phase: GamePhase,
): ApplyResult {
  let current = design;
  const applied: DesignAction[] = [];
  const rejected: ApplyResult['rejected'] = [];
  for (const action of actions) {
    const v = validateAction(action, current, site, phase);
    if (v.ok) {
      current = applyAction(current, action, site);
      applied.push(action);
    } else {
      rejected.push({ action, reason: v.reason });
    }
  }
  return { design: current, applied, rejected };
}
```


- [ ] **Step 5: Run to verify they pass**

Run: `npx vitest run src/sim && npm run typecheck`
Expected: all PASS; typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add src/sim/catalog/parameters.ts src/sim/catalog/parameters.test.ts src/sim/actions.ts src/sim/actions.test.ts
git commit -m "feat(sim): add parameter catalog and validated design actions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Challenge briefs and scoring

**Files:**
- Create: `src/sim/format.ts`, `src/sim/briefs.ts`, `src/sim/scoring.ts`
- Test: `src/sim/scoring.test.ts`

**Interfaces:**
- Consumes: `analyze` (Task 4), `useShares` (Task 4), `STYLE_PRESETS`, `AMENITIES`, `COEFFICIENTS` (Task 2).
- Produces:
  - `formatMoney(usd): string` ("$310M", "$1.10B").
  - `type Requirement` (14 kinds incl. `structural`), `type Brief`, `BRIEFS` (8: `ny-slender`, `ny-deco`, `tokyo-quake`, `tokyo-landmark`, `chicago-lakefront`, `chicago-green`, `shanghai-supertall`, `shanghai-fast`), `getBrief(id)`, `briefsForSite(siteId)`.
  - `evaluateRequirement(r, design, analysis): RequirementResult {requirement, label, met, detail}`, `evaluateBrief(brief, design, analysis): BriefResult {required, bonus, passed, stars: 0|1|2|3}`, `isLandmark(design)`, `gradeFromRatio(ratio, thresholds)`, `sandboxGrades(site, analysis): Record<GradeCategory, Grade>`, types `Grade`, `GradeCategory`.
- "Passes structural engineering assessment" = none of `windStrength`, `seismic`, `foundation` is `fail`. Comfort, elevators and energy affect score but never the structural verdict.

- [ ] **Step 1: Write the failing test**

`src/sim/scoring.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { analyze } from './analysis';
import { BRIEFS, briefsForSite } from './briefs';
import { defaultDesign, normalizeDesign } from './design';
import { evaluateBrief, evaluateRequirement, gradeFromRatio, isLandmark, sandboxGrades } from './scoring';
import { SITES, SITE_IDS } from './sites';
import { designFor } from './testUtils';

describe('briefs', () => {
  it('every site has two briefs', () => {
    for (const id of SITE_IDS) expect(briefsForSite(id)).toHaveLength(2);
  });

  it.each(BRIEFS.map((b) => [b.id, b] as const))('%s is solvable by its reference design', (_id, brief) => {
    const site = SITES[brief.siteId];
    const design = normalizeDesign({ ...defaultDesign(site), ...brief.reference }, site);
    const result = evaluateBrief(brief, design, analyze(site, design));
    expect(result.required.filter((r) => !r.met).map((r) => r.label)).toEqual([]);
    expect(result.stars).toBeGreaterThanOrEqual(1);
  });

  it.each(BRIEFS.map((b) => [b.id, b] as const))('%s is not solved by the default design', (_id, brief) => {
    const site = SITES[brief.siteId];
    const design = defaultDesign(site);
    expect(evaluateBrief(brief, design, analyze(site, design)).stars).toBe(0);
  });
});

describe('requirements', () => {
  it('structural requirement fails when the foundation fails', () => {
    const { site, design } = designFor('shanghai', { floors: 60, foundation: 'mat' });
    const r = evaluateRequirement({ kind: 'structural' }, design, analyze(site, design));
    expect(r.met).toBe(false);
    expect(r.detail).toContain('Foundation');
  });

  it('use share uses normalized percentages', () => {
    const { site, design } = designFor('chicago', { useMix: { retail: 0, office: 1, hotel: 0, residential: 3 } });
    const r = evaluateRequirement({ kind: 'minUseShare', use: 'residential', value: 0.75 }, design, analyze(site, design));
    expect(r.met).toBe(true);
  });

  it('a plain box is not a landmark; a twist makes it one', () => {
    const { design } = designFor('tokyo');
    expect(isLandmark(design)).toBe(false);
    expect(isLandmark({ ...design, twist: 45 })).toBe(true);
  });
});

describe('sandbox grades', () => {
  it('grades from ratios', () => {
    expect(gradeFromRatio(0.4, [0.5, 0.75, 1, 1.3])).toBe('A');
    expect(gradeFromRatio(1.2, [0.5, 0.75, 1, 1.3])).toBe('D');
    expect(gradeFromRatio(2, [0.5, 0.75, 1, 1.3])).toBe('F');
  });

  it('a failed foundation gets an F for safety', () => {
    const { site, design } = designFor('shanghai', { floors: 60, foundation: 'mat' });
    expect(sandboxGrades(site, analyze(site, design)).safety).toBe('F');
  });

  it('a sound design gets an A for safety', () => {
    const { site, design } = designFor('new-york', { foundation: 'mat' });
    expect(sandboxGrades(site, analyze(site, design)).safety).toBe('A');
  });
});
```


- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/sim/scoring.test.ts`
Expected: FAIL — cannot resolve `./briefs` / `./scoring`.

- [ ] **Step 3: Implement**

`src/sim/format.ts`:

```ts
export function formatMoney(usd: number): string {
  if (Math.abs(usd) >= 1e9) return `$${(usd / 1e9).toFixed(2)}B`;
  return `$${Math.round(usd / 1e6)}M`;
}
```

`src/sim/briefs.ts`:

```ts
import type { AmenityId, CheckId, CheckStatus, Design, Setbacks, SiteId, StyleId, UseType } from './types';

export type Requirement =
  | { kind: 'structural' }
  | { kind: 'minFloors'; value: number }
  | { kind: 'minHeight'; value: number }
  | { kind: 'maxBudget'; value: number }
  | { kind: 'minUseShare'; use: UseType; value: number }
  | { kind: 'check'; check: CheckId; atLeast: Exclude<CheckStatus, 'fail'> }
  | { kind: 'maxComfortMg'; value: number }
  | { kind: 'maxEui'; value: number }
  | { kind: 'maxDays'; value: number }
  | { kind: 'maxSettlementCm'; value: number }
  | { kind: 'style'; style: StyleId }
  | { kind: 'minSetbacks'; value: Exclude<Setbacks, 'none'> }
  | { kind: 'amenity'; id: AmenityId }
  | { kind: 'landmark' };

export interface Brief {
  id: string;
  siteId: SiteId;
  title: string;
  client: string;
  blurb: string;
  /** The engineering idea this brief is built to teach. */
  lesson: string;
  required: Requirement[];
  bonus: Requirement[];
  /** A design that earns at least one star — used by tests and as a hint source. */
  reference: Partial<Design>;
}

export const BRIEFS: Brief[] = [
  {
    id: 'ny-slender',
    siteId: 'new-york',
    title: 'Pencil Tower',
    client: 'Skyline Residences',
    blurb: 'Seventy floors of luxury apartments on a lot barely 30 m wide. Residents pay for views — not for seasickness.',
    lesson: 'Super-slender towers fight the wind with stiffness, rounded shapes, and dampers.',
    required: [
      { kind: 'structural' },
      { kind: 'minFloors', value: 70 },
      { kind: 'minUseShare', use: 'residential', value: 0.8 },
      { kind: 'check', check: 'windComfort', atLeast: 'pass' },
      { kind: 'maxBudget', value: 450_000_000 },
    ],
    bonus: [
      { kind: 'maxBudget', value: 350_000_000 },
      { kind: 'check', check: 'energy', atLeast: 'marginal' },
    ],
    reference: {
      floors: 72, plateWidth: 30, shape: 'circle', system: 'core-outrigger', material: 'composite', damping: 'tmd',
      useMix: { retail: 5, office: 0, hotel: 0, residential: 95 }, elevators: 10, zoning: 'single', facade: 'glass', windowRatio: 0.7,
    },
  },
  {
    id: 'ny-deco',
    siteId: 'new-york',
    title: 'Midtown Jewel',
    client: 'Gotham Trust Bank',
    blurb: 'An Art Deco office tower that fits in with its 1930s neighbors and steps back from the street.',
    lesson: 'Setbacks let light reach the street — and also calm the wind.',
    required: [
      { kind: 'structural' },
      { kind: 'style', style: 'art-deco' },
      { kind: 'minSetbacks', value: 'few' },
      { kind: 'minFloors', value: 50 },
      { kind: 'minUseShare', use: 'office', value: 0.7 },
      { kind: 'check', check: 'elevators', atLeast: 'pass' },
      { kind: 'maxBudget', value: 300_000_000 },
    ],
    bonus: [
      { kind: 'maxBudget', value: 220_000_000 },
      { kind: 'check', check: 'windComfort', atLeast: 'pass' },
    ],
    reference: {
      style: 'art-deco', shape: 'square', setbacks: 'wedding-cake', crown: 'spire', facade: 'masonry', windowRatio: 0.4, ornament: 'high',
      floors: 55, plateWidth: 30, material: 'concrete', system: 'core-outrigger', elevators: 12, zoning: 'two-zone',
      useMix: { retail: 10, office: 90, hotel: 0, residential: 0 },
    },
  },
  {
    id: 'tokyo-quake',
    siteId: 'tokyo',
    title: 'Open for Business',
    client: 'Kanto Electric Co.',
    blurb: 'Our headquarters must keep working the day after a major earthquake — the city will depend on us.',
    lesson: 'Base isolation and ductile, lightweight structures keep buildings working after quakes.',
    required: [
      { kind: 'structural' },
      { kind: 'minFloors', value: 45 },
      { kind: 'minUseShare', use: 'office', value: 0.7 },
      { kind: 'check', check: 'seismic', atLeast: 'pass' },
      { kind: 'maxBudget', value: 550_000_000 },
    ],
    bonus: [
      { kind: 'check', check: 'elevators', atLeast: 'pass' },
      { kind: 'maxBudget', value: 420_000_000 },
    ],
    reference: {
      floors: 48, plateWidth: 45, shape: 'square', material: 'steel', system: 'core-outrigger', baseIsolation: true,
      foundation: 'piles', elevators: 18, zoning: 'two-zone', useMix: { retail: 10, office: 90, hotel: 0, residential: 0 },
    },
  },
  {
    id: 'tokyo-landmark',
    siteId: 'tokyo',
    title: 'Tokyo Icon',
    client: 'Sakura Hotels',
    blurb: 'A hotel tower so distinctive it ends up on postcards — and it must survive the big one.',
    lesson: 'A striking shape can also be a smart one, if the structure keeps up.',
    required: [
      { kind: 'structural' },
      { kind: 'minFloors', value: 40 },
      { kind: 'minUseShare', use: 'hotel', value: 0.5 },
      { kind: 'landmark' },
      { kind: 'maxBudget', value: 550_000_000 },
    ],
    bonus: [
      { kind: 'amenity', id: 'observation-deck' },
      { kind: 'check', check: 'seismic', atLeast: 'pass' },
    ],
    reference: {
      style: 'neo-futurist', shape: 'circle', taper: 0.3, twist: 120, crown: 'pointed', facade: 'glass', windowRatio: 0.85,
      floors: 45, plateWidth: 50, material: 'steel', system: 'diagrid', foundation: 'piles', elevators: 12, zoning: 'two-zone',
      useMix: { retail: 10, office: 0, hotel: 90, residential: 0 },
    },
  },
  {
    id: 'chicago-lakefront',
    siteId: 'chicago',
    title: 'Windy City Tower',
    client: 'Lakeshore Capital',
    blurb: 'An 80-storey office tower by the lake. Our traders cannot have their coffee sloshing in a storm.',
    lesson: 'Tall towers in windy places need stiff tube structures, deep foundations, and dampers.',
    required: [
      { kind: 'structural' },
      { kind: 'minFloors', value: 80 },
      { kind: 'minUseShare', use: 'office', value: 0.8 },
      { kind: 'maxComfortMg', value: 10 },
      { kind: 'maxBudget', value: 1_300_000_000 },
    ],
    bonus: [
      { kind: 'check', check: 'elevators', atLeast: 'pass' },
      { kind: 'maxBudget', value: 1_000_000_000 },
    ],
    reference: {
      floors: 82, plateWidth: 50, shape: 'square', material: 'steel', system: 'bundled-tube', damping: 'tmd', foundation: 'caissons',
      elevators: 40, zoning: 'sky-lobby', useMix: { retail: 5, office: 95, hotel: 0, residential: 0 },
    },
  },
  {
    id: 'chicago-green',
    siteId: 'chicago',
    title: 'Green Loop',
    client: 'Prairie Living Co-op',
    blurb: 'Homes over offices, built to sip energy through long Chicago winters.',
    lesson: 'In cold climates, solid walls, fewer windows, and efficient systems save huge amounts of energy.',
    required: [
      { kind: 'structural' },
      { kind: 'minFloors', value: 40 },
      { kind: 'minUseShare', use: 'office', value: 0.3 },
      { kind: 'minUseShare', use: 'residential', value: 0.3 },
      { kind: 'maxEui', value: 180 },
      { kind: 'maxBudget', value: 380_000_000 },
    ],
    bonus: [
      { kind: 'amenity', id: 'sky-garden' },
      { kind: 'maxEui', value: 150 },
    ],
    reference: {
      floors: 42, plateWidth: 40, shape: 'square', material: 'concrete', system: 'core-outrigger', foundation: 'caissons',
      facade: 'precast', windowRatio: 0.4, systemsGrade: 'green', elevators: 10, zoning: 'single',
      useMix: { retail: 5, office: 45, hotel: 0, residential: 50 },
    },
  },
  {
    id: 'shanghai-supertall',
    siteId: 'shanghai',
    title: 'Cloud Piercer',
    client: 'Pudong Development Group',
    blurb: 'A supertall over 450 m with offices and a hotel — on ground that is mostly mud.',
    lesson: 'Deep piles hold up giants on soft ground; tapering and twisting tame typhoon winds.',
    required: [
      { kind: 'structural' },
      { kind: 'minHeight', value: 450 },
      { kind: 'minUseShare', use: 'office', value: 0.4 },
      { kind: 'minUseShare', use: 'hotel', value: 0.15 },
      { kind: 'maxSettlementCm', value: 10 },
      { kind: 'maxBudget', value: 1_100_000_000 },
    ],
    bonus: [
      { kind: 'check', check: 'elevators', atLeast: 'pass' },
      { kind: 'check', check: 'windComfort', atLeast: 'pass' },
    ],
    reference: {
      style: 'neo-futurist', shape: 'circle', taper: 0.3, twist: 120, crown: 'pointed', facade: 'glass', windowRatio: 0.85,
      floors: 110, plateWidth: 70, material: 'composite', system: 'buttressed-core', damping: 'tmd', foundation: 'piles',
      elevators: 56, zoning: 'sky-lobby', useMix: { retail: 5, office: 60, hotel: 25, residential: 10 },
    },
  },
  {
    id: 'shanghai-fast',
    siteId: 'shanghai',
    title: 'Fast Track',
    client: 'Huangpu Logistics',
    blurb: 'We need a 50-storey office tower open in about 15 months, on a tight budget.',
    lesson: 'Steel frames go up fastest; foundation choice drives both cost and schedule.',
    required: [
      { kind: 'structural' },
      { kind: 'minFloors', value: 50 },
      { kind: 'minUseShare', use: 'office', value: 0.8 },
      { kind: 'maxDays', value: 460 },
      { kind: 'maxBudget', value: 260_000_000 },
    ],
    bonus: [
      { kind: 'maxDays', value: 440 },
      { kind: 'check', check: 'energy', atLeast: 'marginal' },
    ],
    reference: {
      floors: 50, plateWidth: 40, shape: 'square', material: 'steel', system: 'core-outrigger', foundation: 'piles',
      elevators: 16, zoning: 'two-zone', useMix: { retail: 5, office: 95, hotel: 0, residential: 0 },
    },
  },
];

export function getBrief(id: string): Brief | undefined {
  return BRIEFS.find((b) => b.id === id);
}

export function briefsForSite(siteId: SiteId): Brief[] {
  return BRIEFS.filter((b) => b.siteId === siteId);
}
```

`src/sim/scoring.ts`:

```ts
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
```


- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/sim && npm run typecheck`
Expected: all PASS (scoring: 23 tests including 8 "solvable" and 8 "not solved by default"); typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/sim/format.ts src/sim/briefs.ts src/sim/scoring.ts src/sim/scoring.test.ts
git commit -m "feat(sim): add eight challenge briefs, star scoring and sandbox grades

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Game store with design history

**Files:**
- Create: `src/state/store.ts`, `src/state/hooks.ts`
- Test: `src/state/store.test.ts`

**Interfaces:**
- Consumes: `applyActions`, `DesignAction`, `GamePhase` (Task 5); `defaultDesign` (Task 2); `analyze` (Task 4); `getBrief` (Task 6).
- Produces:
  - `useGame` Zustand hook with state `{ project: Project | null, phase, history: Design[], historyIndex, lastCoalesceKey, detailLevel }` and actions `startProject(siteId, mode, briefId?)`, `dispatch(actions, {coalesceKey?}) → DispatchResult {applied, rejected}`, `undo()`, `redo()`, `build()` (design → complete in this plan), `newProject()`.
  - Types `Project {siteId, mode, briefId}`, `GameMode = 'challenge' | 'sandbox'`, `GameState`, `DispatchResult`.
  - Selectors `selectDesign`, `selectCanUndo`, `selectCanRedo`.
  - Hook `useCurrent(): { project, site, design, analysis, brief }` (memoized analysis; throws if no project — only use inside the game screen).
- Zustand + React 19 rule: selectors passed to `useGame` must return primitives or existing references (never build a new object/array inside a selector), or React will loop.

- [ ] **Step 1: Write the failing test**

`src/state/store.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { selectCanRedo, selectCanUndo, selectDesign, useGame } from './store';

const state = () => useGame.getState();
const design = () => selectDesign(state())!;

describe('game store', () => {
  beforeEach(() => {
    state().newProject();
    state().startProject('chicago', 'sandbox');
  });

  it('starts a project with the default design', () => {
    expect(state().project).toEqual({ siteId: 'chicago', mode: 'sandbox', briefId: null });
    expect(design().floors).toBe(40);
    expect(selectCanUndo(state())).toBe(false);
  });

  it('keeps the brief only in challenge mode', () => {
    state().startProject('tokyo', 'challenge', 'tokyo-quake');
    expect(state().project?.briefId).toBe('tokyo-quake');
    state().startProject('tokyo', 'sandbox', 'tokyo-quake');
    expect(state().project?.briefId).toBeNull();
  });

  it('pushes each change onto history and undoes/redoes it', () => {
    state().dispatch([{ type: 'set_parameter', id: 'floors', value: 50 }]);
    state().dispatch([{ type: 'set_parameter', id: 'floors', value: 60 }]);
    expect(design().floors).toBe(60);
    state().undo();
    expect(design().floors).toBe(50);
    state().undo();
    expect(design().floors).toBe(40);
    expect(selectCanRedo(state())).toBe(true);
    state().redo();
    expect(design().floors).toBe(50);
  });

  it('coalesces a slider drag into one undo step', () => {
    for (const v of [41, 42, 43, 44]) state().dispatch([{ type: 'set_parameter', id: 'floors', value: v }], { coalesceKey: 'floors' });
    expect(state().history).toHaveLength(2);
    state().undo();
    expect(design().floors).toBe(40);
  });

  it('does not coalesce across different controls', () => {
    state().dispatch([{ type: 'set_parameter', id: 'floors', value: 45 }], { coalesceKey: 'floors' });
    state().dispatch([{ type: 'set_parameter', id: 'twist', value: 10 }], { coalesceKey: 'twist' });
    state().dispatch([{ type: 'set_parameter', id: 'floors', value: 46 }], { coalesceKey: 'floors' });
    expect(state().history).toHaveLength(4);
  });

  it('a new change after undo discards the redo branch', () => {
    state().dispatch([{ type: 'set_parameter', id: 'floors', value: 50 }]);
    state().undo();
    state().dispatch([{ type: 'set_parameter', id: 'floors', value: 70 }]);
    expect(selectCanRedo(state())).toBe(false);
    expect(state().history.map((d) => d.floors)).toEqual([40, 70]);
  });

  it('ignores a batch where nothing applies', () => {
    const r = state().dispatch([{ type: 'set_parameter', id: 'floors', value: 9999 }]);
    expect(r.rejected).toHaveLength(1);
    expect(state().history).toHaveLength(1);
  });

  it('locks the design after build: no changes, no undo', () => {
    state().dispatch([{ type: 'set_parameter', id: 'floors', value: 50 }]);
    state().build();
    expect(state().phase).toBe('complete');
    const r = state().dispatch([{ type: 'set_parameter', id: 'floors', value: 60 }]);
    expect(r.applied).toHaveLength(0);
    expect(selectCanUndo(state())).toBe(false);
    state().undo();
    expect(design().floors).toBe(50);
  });

  it('new project returns to site select', () => {
    state().newProject();
    expect(state().project).toBeNull();
    expect(selectDesign(state())).toBeUndefined();
  });
});
```


- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/state`
Expected: FAIL — cannot resolve `./store`.

- [ ] **Step 3: Implement**

`src/state/store.ts`:

```ts
import { create } from 'zustand';
import { applyActions, type ApplyResult, type DesignAction, type GamePhase } from '../sim/actions';
import { defaultDesign } from '../sim/design';
import { getSite } from '../sim/sites';
import type { Design, DetailLevel, SiteId } from '../sim/types';

export type GameMode = 'challenge' | 'sandbox';

export interface Project {
  siteId: SiteId;
  mode: GameMode;
  briefId: string | null;
}

const HISTORY_LIMIT = 200;

export interface GameState {
  project: Project | null;
  phase: GamePhase;
  history: Design[];
  historyIndex: number;
  /** Consecutive dispatches with the same key (e.g. one slider drag) share one undo step. */
  lastCoalesceKey: string | null;
  detailLevel: DetailLevel;
  startProject: (siteId: SiteId, mode: GameMode, briefId?: string | null) => void;
  dispatch: (actions: DesignAction[], opts?: { coalesceKey?: string }) => DispatchResult;
  undo: () => void;
  redo: () => void;
  build: () => void;
  newProject: () => void;
}

export type DispatchResult = Pick<ApplyResult, 'applied' | 'rejected'>;

export const useGame = create<GameState>((set, get) => ({
  project: null,
  phase: 'design',
  history: [],
  historyIndex: -1,
  lastCoalesceKey: null,
  detailLevel: 'standard',

  startProject: (siteId, mode, briefId = null) =>
    set({
      project: { siteId, mode, briefId: mode === 'challenge' ? briefId : null },
      phase: 'design',
      history: [defaultDesign(getSite(siteId))],
      historyIndex: 0,
      lastCoalesceKey: null,
    }),

  dispatch: (actions, opts) => {
    const { project, phase, history, historyIndex, lastCoalesceKey } = get();
    if (!project) return { applied: [], rejected: actions.map((action) => ({ action, reason: 'No project is open.' })) };
    const current = history[historyIndex];
    const result = applyActions(current, actions, getSite(project.siteId), phase);
    const outcome = { applied: result.applied, rejected: result.rejected };
    if (result.applied.length === 0) return outcome;
    const key = opts?.coalesceKey ?? null;
    const atTip = historyIndex === history.length - 1;
    const replaceTop = key !== null && key === lastCoalesceKey && atTip && historyIndex > 0;
    const base = history.slice(0, replaceTop ? historyIndex : historyIndex + 1);
    const next = [...base, result.design].slice(-HISTORY_LIMIT);
    set({ history: next, historyIndex: next.length - 1, lastCoalesceKey: key });
    return outcome;
  },

  undo: () => {
    const { phase, historyIndex } = get();
    if (phase !== 'design' || historyIndex <= 0) return;
    set({ historyIndex: historyIndex - 1, lastCoalesceKey: null });
  },

  redo: () => {
    const { phase, historyIndex, history } = get();
    if (phase !== 'design' || historyIndex >= history.length - 1) return;
    set({ historyIndex: historyIndex + 1, lastCoalesceKey: null });
  },

  build: () => {
    if (get().project && get().phase === 'design') set({ phase: 'complete', lastCoalesceKey: null });
  },

  newProject: () => set({ project: null, phase: 'design', history: [], historyIndex: -1, lastCoalesceKey: null }),
}));

export const selectDesign = (s: GameState): Design | undefined => s.history[s.historyIndex];
export const selectCanUndo = (s: GameState): boolean => s.phase === 'design' && s.historyIndex > 0;
export const selectCanRedo = (s: GameState): boolean => s.phase === 'design' && s.historyIndex < s.history.length - 1;
```

`src/state/hooks.ts`:

```ts
import { useMemo } from 'react';
import { analyze } from '../sim/analysis';
import { getBrief, type Brief } from '../sim/briefs';
import { getSite } from '../sim/sites';
import type { Analysis, Design, Site } from '../sim/types';
import { selectDesign, useGame, type Project } from './store';

export interface CurrentProject {
  project: Project;
  site: Site;
  design: Design;
  analysis: Analysis;
  brief: Brief | undefined;
}

/** Everything about the open project. Only call inside the game screen (a project must be open). */
export function useCurrent(): CurrentProject {
  const project = useGame((s) => s.project);
  const design = useGame(selectDesign);
  if (!project || !design) throw new Error('useCurrent called with no open project');
  const site = getSite(project.siteId);
  const analysis = useMemo(() => analyze(site, design), [site, design]);
  const brief = project.briefId ? getBrief(project.briefId) : undefined;
  return { project, site, design, analysis, brief };
}
```


- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/state && npm run typecheck`
Expected: 9 tests PASS; typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/state
git commit -m "feat(state): add game store with undoable, coalescing design history

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Procedural 3D building

**Files:**
- Create: `src/scene/layout.ts`, `src/scene/buildingGeometry.ts`, `src/scene/Building.tsx`
- Test: `src/scene/buildingGeometry.test.ts`, `src/scene/Building.test.tsx`

**Interfaces:**
- Consumes: `floorSlices`, `FLOOR_HEIGHT`, `crownHeight` (Task 3); `Design`, `Site` (Task 2); `designFor` (Task 2).
- Produces:
  - `layout.ts`: `DIORAMA`, `SIDEWALK`, `MAX_SOIL_SHOWN`, `BEDROCK_COLOR`, `lotCenter(site): [x, z]`, `soilDepthShown(site)`, `soilBands(site): SoilBand[]`, `generateNeighbors(site): NeighborBlock[]`, `mulberry32`, `hashString`. (Neighbors and soil are tested and rendered in Task 9; `lotCenter` is needed here.)
  - `buildingGeometry.ts`: `unitGeometry(shape)`, `bodyInstances(design)`, `slabInstances(design)`, `facadeColor(design)`, `bracingStruts(design)`, `strutMatrix(strut, thickness)`, `instanceMatrix(instance)`, types `BoxInstance`, `Strut`, `Vec3`.
  - `<Building site design />` — a `<group name="building">` placed at the lot centre containing instanced meshes named `body` and `slabs`, a `crown` group, an `amenities` group, and (when exposed) a `bracing` instanced mesh. Plans 3–4 hang construction progress and overlays off these names.

- [ ] **Step 1: Write the failing tests**

`src/scene/buildingGeometry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { FLOOR_HEIGHT } from '../sim/geometry';
import { designFor } from '../sim/testUtils';
import { bodyInstances, bracingStruts, facadeColor, slabInstances } from './buildingGeometry';

describe('building geometry', () => {
  it('has one body and one slab per floor, stacked', () => {
    const { design } = designFor('chicago', { floors: 30 });
    const body = bodyInstances(design);
    expect(body).toHaveLength(30);
    expect(slabInstances(design)).toHaveLength(30);
    expect(body[29].position[1]).toBeGreaterThan(29 * FLOOR_HEIGHT);
    expect(body[29].position[1]).toBeLessThan(30 * FLOOR_HEIGHT);
  });

  it('adds X-bracing only for exposed structure', () => {
    const { design } = designFor('chicago', { floors: 30 });
    expect(bracingStruts(design)).toEqual([]);
    expect(bracingStruts({ ...design, exposedStructure: true })).toHaveLength(3 * 4 * 2);
  });

  it('glass towers use the glass colour', () => {
    const { design } = designFor('chicago', { facade: 'glass' });
    expect(facadeColor(design)).toBe(design.palette.glass);
    expect(facadeColor({ ...design, facade: 'masonry' })).toMatch(/^#[0-9a-f]{6}$/);
  });
});
```

`src/scene/Building.test.tsx`:

```tsx
import ReactThreeTestRenderer from '@react-three/test-renderer';
import type * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { designFor } from '../sim/testUtils';
import type { CrownType, PlanShape } from '../sim/types';
import { Building } from './Building';

describe('<Building />', () => {
  it('renders one body instance per floor', async () => {
    const { site, design } = designFor('chicago', { floors: 25 });
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} />);
    const body = r.scene.findAll((n) => n.props.name === 'body')[0];
    expect((body.instance as THREE.InstancedMesh).count).toBe(25);
  });

  it('renders every shape, crown and amenity without throwing', async () => {
    const shapes: PlanShape[] = ['square', 'rectangle', 'circle', 'triangle'];
    const crowns: CrownType[] = ['flat', 'spire', 'pointed', 'stepped', 'sloped'];
    for (const shape of shapes)
      for (const crown of crowns) {
        const { site, design } = designFor('tokyo', {
          shape, crown, twist: 60, exposedStructure: true, amenities: ['helipad', 'pool', 'observation-deck', 'sky-garden'],
        });
        const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} />);
        expect(r.scene.findAll((n) => n.props.name === 'crown')).toHaveLength(1);
        await r.unmount();
      }
  });
});
```


- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/scene`
Expected: FAIL — cannot resolve `./buildingGeometry` / `./Building`.

- [ ] **Step 3: Implement layout helpers**

`src/scene/layout.ts`:

```ts
import type { Site } from '../sim/types';

/** The site is shown as a diorama block: a slab of city with its soil visible on the sides. */
export const DIORAMA = { width: 420, depth: 320 } as const;
/** Gap between the lot and the front edge of the diorama, metres. */
export const SIDEWALK = 15;
/** Deepest soil shown, metres. */
export const MAX_SOIL_SHOWN = 100;
export const BEDROCK_COLOR = '#56514c';

/** Centre of the lot, [x, z]. The lot sits at the front so its foundation shows through the soil. */
export function lotCenter(site: Site): [number, number] {
  return [0, DIORAMA.depth / 2 - SIDEWALK - site.lot.depth / 2];
}

export function soilDepthShown(site: Site): number {
  return Math.min(site.bedrockDepth + 15, MAX_SOIL_SHOWN);
}

export interface SoilBand {
  name: string;
  color: string;
  /** Metres below ground of the band's top. */
  top: number;
  thickness: number;
}

/** Soil layers clipped to the shown depth, with bedrock filling the rest if it is in view. */
export function soilBands(site: Site): SoilBand[] {
  const shown = soilDepthShown(site);
  const bands: SoilBand[] = [];
  let top = 0;
  for (const layer of site.soil) {
    if (top >= shown) break;
    const thickness = Math.min(layer.thickness, shown - top);
    bands.push({ name: layer.name, color: layer.color, top, thickness });
    top += thickness;
  }
  if (top < shown) {
    const isRock = site.bedrockDepth <= shown;
    bands.push({
      name: isRock ? 'Bedrock' : site.soil[site.soil.length - 1].name,
      color: isRock ? BEDROCK_COLOR : site.soil[site.soil.length - 1].color,
      top,
      thickness: shown - top,
    });
  }
  return bands;
}

export interface NeighborBlock {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
}

/** Small deterministic PRNG so each city always looks the same. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const BLOCK_PITCH = 50;
const LOT_MARGIN = 12;

export function generateNeighbors(site: Site): NeighborBlock[] {
  const rand = mulberry32(hashString(site.id));
  const [lx, lz] = lotCenter(site);
  const halfW = site.lot.width / 2 + LOT_MARGIN;
  const halfD = site.lot.depth / 2 + LOT_MARGIN;
  const [minH, maxH] = site.visuals.neighborHeight;
  const blocks: NeighborBlock[] = [];
  for (let x = -DIORAMA.width / 2 + BLOCK_PITCH / 2; x < DIORAMA.width / 2; x += BLOCK_PITCH) {
    for (let z = -DIORAMA.depth / 2 + BLOCK_PITCH / 2; z < DIORAMA.depth / 2 - SIDEWALK; z += BLOCK_PITCH) {
      const width = 26 + rand() * 16;
      const depth = 26 + rand() * 16;
      const height = minH + rand() * rand() * (maxH - minH);
      const color = site.visuals.neighborColors[Math.floor(rand() * site.visuals.neighborColors.length)];
      const plaza = rand() < 0.2;
      const overlapsLot = Math.abs(x - lx) < halfW + width / 2 && Math.abs(z - lz) < halfD + depth / 2;
      const fits =
        Math.abs(x) + width / 2 <= DIORAMA.width / 2 && Math.abs(z) + depth / 2 <= DIORAMA.depth / 2 - SIDEWALK / 2;
      if (!plaza && !overlapsLot && fits) blocks.push({ x, z, width, depth, height, color });
    }
  }
  return blocks;
}
```


- [ ] **Step 4: Implement building geometry**

`src/scene/buildingGeometry.ts`:

```ts
import * as THREE from 'three';
import { FLOOR_HEIGHT, floorSlices, type FloorSlice } from '../sim/geometry';
import type { Design, PlanShape } from '../sim/types';

export type Vec3 = [number, number, number];

export interface BoxInstance {
  position: Vec3;
  scale: Vec3;
  rotationY: number;
}

const BODY_FRACTION = 0.85;

/** A unit-sized solid of the plan shape: 1 wide, 1 tall, 1 deep (triangle: side 1). */
export function unitGeometry(shape: PlanShape): THREE.BufferGeometry {
  switch (shape) {
    case 'circle':
      return new THREE.CylinderGeometry(0.5, 0.5, 1, 24);
    case 'triangle':
      return new THREE.CylinderGeometry(1 / Math.sqrt(3), 1 / Math.sqrt(3), 1, 3);
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

function sliceInstance(s: FloorSlice, yOffset: number, height: number, grow = 1): BoxInstance {
  return {
    position: [0, s.y + yOffset, 0],
    scale: [s.width * grow, height, s.depth * grow],
    rotationY: s.rotation,
  };
}

/** The glazed or walled part of each floor. */
export function bodyInstances(design: Design): BoxInstance[] {
  const h = FLOOR_HEIGHT * BODY_FRACTION;
  return floorSlices(design).map((s) => sliceInstance(s, h / 2, h));
}

/** The floor-slab edge band between floors — gives the tower its horizontal lines. */
export function slabInstances(design: Design): BoxInstance[] {
  const h = FLOOR_HEIGHT * (1 - BODY_FRACTION);
  return floorSlices(design).map((s) => sliceInstance(s, FLOOR_HEIGHT * BODY_FRACTION + h / 2, h, 1.03));
}

/** Facade colour: glass towers use the glass colour; others blend toward glass by window share. */
export function facadeColor(design: Design): string {
  if (design.facade === 'glass') return design.palette.glass;
  const body = new THREE.Color(design.palette.body);
  return '#' + body.lerp(new THREE.Color(design.palette.glass), design.windowRatio * 0.5).getHexString();
}

export interface Strut {
  from: Vec3;
  to: Vec3;
}

const BRACE_FLOORS = 10;

/** X-braces on the four faces of each 10-floor segment, for exposed structure. */
export function bracingStruts(design: Design): Strut[] {
  if (!design.exposedStructure) return [];
  const slices = floorSlices(design);
  const struts: Strut[] = [];
  for (let start = 0; start < slices.length; start += BRACE_FLOORS) {
    const bottom = slices[start];
    const endIndex = Math.min(start + BRACE_FLOORS, slices.length) - 1;
    const y0 = bottom.y;
    const y1 = slices[endIndex].y + FLOOR_HEIGHT;
    const hw = bottom.width / 2 + 0.6;
    const hd = bottom.depth / 2 + 0.6;
    const rot = slices[Math.floor((start + endIndex) / 2)].rotation;
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    const p = (x: number, y: number, z: number): Vec3 => [x * c + z * s, y, -x * s + z * c];
    const faces: [number, number, number, number][] = [
      [-hw, hd, hw, hd],
      [hw, -hd, -hw, -hd],
      [hw, hd, hw, -hd],
      [-hw, -hd, -hw, hd],
    ];
    for (const [ax, az, bx, bz] of faces) {
      struts.push({ from: p(ax, y0, az), to: p(bx, y1, bz) });
      struts.push({ from: p(bx, y0, bz), to: p(ax, y1, az) });
    }
  }
  return struts;
}

/** Matrix for a thin box running from `from` to `to`. */
export function strutMatrix(strut: Strut, thickness: number): THREE.Matrix4 {
  const a = new THREE.Vector3(...strut.from);
  const b = new THREE.Vector3(...strut.to);
  const dir = b.clone().sub(a);
  const length = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return new THREE.Matrix4().compose(a.add(b).multiplyScalar(0.5), q, new THREE.Vector3(thickness, length, thickness));
}

export function instanceMatrix(i: BoxInstance): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...i.position),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), i.rotationY),
    new THREE.Vector3(...i.scale),
  );
}
```


- [ ] **Step 5: Implement the Building component**

`src/scene/Building.tsx`:

```tsx
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { FLOOR_HEIGHT, crownHeight, floorSlices } from '../sim/geometry';
import type { Design, Site } from '../sim/types';
import {
  bodyInstances,
  bracingStruts,
  facadeColor,
  instanceMatrix,
  slabInstances,
  strutMatrix,
  unitGeometry,
  type BoxInstance,
} from './buildingGeometry';
import { lotCenter } from './layout';

function Instanced({ geometry, items, color, name }: { geometry: THREE.BufferGeometry; items: BoxInstance[]; color: string; name: string }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((it, i) => mesh.setMatrixAt(i, instanceMatrix(it)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  return (
    <instancedMesh key={items.length} name={name} ref={ref} args={[geometry, undefined, items.length]}>
      <meshStandardMaterial color={color} flatShading roughness={0.5} metalness={0.2} />
    </instancedMesh>
  );
}

function Bracing({ design, color }: { design: Design; color: string }) {
  const struts = useMemo(() => bracingStruts(design), [design]);
  const ref = useRef<THREE.InstancedMesh>(null);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    struts.forEach((s, i) => mesh.setMatrixAt(i, strutMatrix(s, 0.8)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [struts]);
  if (struts.length === 0) return null;
  return (
    <instancedMesh key={struts.length} name="bracing" ref={ref} args={[box, undefined, struts.length]}>
      <meshStandardMaterial color={color} flatShading />
    </instancedMesh>
  );
}

function Crown({ design }: { design: Design }) {
  const slices = floorSlices(design);
  const top = slices[slices.length - 1];
  const bodyHeight = design.floors * FLOOR_HEIGHT;
  const h = crownHeight(design.crown, bodyHeight);
  const color = design.palette.accent;
  const w = top.width;
  const d = top.depth;
  const segments = design.shape === 'circle' ? 24 : design.shape === 'triangle' ? 3 : 4;
  const wedge = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo(w / 2, 0);
    shape.lineTo(-w / 2, h);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
    g.translate(0, 0, -d / 2);
    return g;
  }, [w, d, h]);
  return (
    <group name="crown" position={[0, bodyHeight, 0]} rotation={[0, top.rotation, 0]}>
      {design.crown === 'flat' && (
        <mesh position={[0, h / 2, 0]} scale={[w * 0.9, h, d * 0.9]}>
          <boxGeometry />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
      )}
      {design.crown === 'spire' && (
        <>
          <mesh position={[0, 4, 0]} scale={[w * 0.4, 8, d * 0.4]}>
            <boxGeometry />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          <mesh position={[0, h / 2 + 4, 0]}>
            <coneGeometry args={[Math.min(w, d) * 0.08, h, 8]} />
            <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} flatShading />
          </mesh>
        </>
      )}
      {design.crown === 'pointed' && (
        <mesh position={[0, h / 2, 0]} rotation={[0, segments === 4 ? Math.PI / 4 : 0, 0]}>
          <coneGeometry args={[(segments === 4 ? Math.SQRT1_2 : 0.5) * Math.max(w, d), h, segments]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
      )}
      {design.crown === 'stepped' &&
        [0.75, 0.55, 0.35].map((k, i) => (
          <mesh key={k} position={[0, FLOOR_HEIGHT * (i + 0.5), 0]} scale={[w * k, FLOOR_HEIGHT, d * k]}>
            <boxGeometry />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
        ))}
      {design.crown === 'sloped' && (
        <mesh geometry={wedge}>
          <meshStandardMaterial color={color} flatShading />
        </mesh>
      )}
    </group>
  );
}

function Amenities({ design, geometry }: { design: Design; geometry: THREE.BufferGeometry }) {
  const slices = floorSlices(design);
  const top = slices[slices.length - 1];
  const roofY = design.floors * FLOOR_HEIGHT;
  const band = (fraction: number) => slices[Math.min(slices.length - 1, Math.floor(slices.length * fraction))];
  const deck = band(0.9);
  const garden = band(0.5);
  return (
    <group name="amenities">
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
    </group>
  );
}

export function Building({ site, design }: { site: Site; design: Design }) {
  const [lx, lz] = lotCenter(site);
  const geometry = useMemo(() => unitGeometry(design.shape), [design.shape]);
  const body = useMemo(() => bodyInstances(design), [design]);
  const slabs = useMemo(() => slabInstances(design), [design]);
  return (
    <group name="building" position={[lx, 0, lz]}>
      <Instanced name="body" geometry={geometry} items={body} color={facadeColor(design)} />
      <Instanced name="slabs" geometry={geometry} items={slabs} color={design.palette.accent} />
      <Crown design={design} />
      <Amenities design={design} geometry={geometry} />
      <Bracing design={design} color={design.palette.accent} />
    </group>
  );
}
```


- [ ] **Step 6: Run to verify they pass**

Run: `npx vitest run src/scene && npm run typecheck`
Expected: 5 tests PASS (a three.js CommonJS deprecation warning from the test renderer is expected and harmless); typecheck clean.

- [ ] **Step 7: Commit**

```bash
git add src/scene
git commit -m "feat(scene): add procedural low-poly building with crowns, amenities and bracing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Site diorama, neighbors, foundation view and the Scene

**Files:**
- Create: `src/scene/SiteDiorama.tsx`, `src/scene/Neighbors.tsx`, `src/scene/FoundationView.tsx`, `src/scene/Landmark.tsx`, `src/scene/Scene.tsx`
- Test: `src/scene/layout.test.ts`

**Interfaces:**
- Consumes: `layout.ts` (Task 8), `<Building />` (Task 8), `useCurrent` (Task 7), `plateDims` (Task 3).
- Produces: `<Scene />` — a full-viewport `<Canvas>` (keyed by site id so the camera resets per project) with the site diorama (ground slab over translucent soil bands with labels, so the foundation shows through from a low angle), neighbors, a landmark silhouette, the building, and its foundation; `OrbitControls` allow looking slightly below ground. Also `shaftGrid(width, depth, spacing)` from `FoundationView.tsx`.

- [ ] **Step 1: Write the failing test**

`src/scene/layout.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SITES, SITE_IDS } from '../sim/sites';
import { DIORAMA, generateNeighbors, lotCenter, soilBands, soilDepthShown } from './layout';

describe('scene layout', () => {
  it('keeps every lot inside the diorama', () => {
    for (const id of SITE_IDS) {
      const site = SITES[id];
      const [x, z] = lotCenter(site);
      expect(Math.abs(x) + site.lot.width / 2).toBeLessThanOrEqual(DIORAMA.width / 2);
      expect(Math.abs(z) + site.lot.depth / 2).toBeLessThanOrEqual(DIORAMA.depth / 2);
    }
  });

  it('never puts a neighbor on the lot', () => {
    for (const id of SITE_IDS) {
      const site = SITES[id];
      const [lx, lz] = lotCenter(site);
      for (const b of generateNeighbors(site)) {
        const overlapX = Math.abs(b.x - lx) < site.lot.width / 2 + b.width / 2;
        const overlapZ = Math.abs(b.z - lz) < site.lot.depth / 2 + b.depth / 2;
        expect(overlapX && overlapZ).toBe(false);
      }
    }
  });

  it('is the same city every time', () => {
    expect(generateNeighbors(SITES.tokyo)).toEqual(generateNeighbors(SITES.tokyo));
    expect(generateNeighbors(SITES.tokyo).length).toBeGreaterThan(10);
  });

  it('soil bands fill exactly the shown depth', () => {
    for (const id of SITE_IDS) {
      const site = SITES[id];
      const total = soilBands(site).reduce((s, b) => s + b.thickness, 0);
      expect(total).toBeCloseTo(soilDepthShown(site));
    }
  });

  it('shows bedrock where it is shallow and not where it is deep', () => {
    expect(soilBands(SITES['new-york']).some((b) => b.name === 'Bedrock')).toBe(true);
    expect(soilBands(SITES.shanghai).some((b) => b.name === 'Bedrock')).toBe(false);
  });
});
```


- [ ] **Step 2: Run it**

Run: `npx vitest run src/scene/layout.test.ts`
Expected: PASS already for lot/soil helpers written in Task 8 — this test pins them before the components that depend on them. (If any fail, fix `layout.ts`, not the test.)

- [ ] **Step 3: Implement the scene components**

`src/scene/SiteDiorama.tsx`:

```tsx
import { Html } from '@react-three/drei';
import type { Site } from '../sim/types';
import { DIORAMA, lotCenter, soilBands } from './layout';

export function SiteDiorama({ site }: { site: Site }) {
  const [lx, lz] = lotCenter(site);
  const bands = soilBands(site);
  return (
    <group name="diorama">
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[DIORAMA.width, 1, DIORAMA.depth]} />
        <meshStandardMaterial color={site.visuals.ground} />
      </mesh>
      <mesh position={[lx, 0.05, lz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[site.lot.width, site.lot.depth]} />
        <meshStandardMaterial color="#d6cfbf" />
      </mesh>
      {bands.map((b) => (
        <group key={b.name + b.top}>
          <mesh position={[0, -1 - b.top - b.thickness / 2, 0]}>
            <boxGeometry args={[DIORAMA.width, b.thickness, DIORAMA.depth]} />
            <meshStandardMaterial color={b.color} transparent opacity={0.55} depthWrite={false} />
          </mesh>
          <Html position={[-DIORAMA.width / 2 + 4, -1 - b.top - b.thickness / 2, DIORAMA.depth / 2]} className="soil-label">
            {b.name}
          </Html>
        </group>
      ))}
      {site.bedrockDepth > bands.reduce((s, b) => s + b.thickness, 0) && (
        <Html position={[0, -1 - bands.reduce((s, b) => s + b.thickness, 0), DIORAMA.depth / 2]} className="soil-label">
          ↓ bedrock {site.bedrockDepth} m down
        </Html>
      )}
    </group>
  );
}
```

`src/scene/Neighbors.tsx`:

```tsx
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Site } from '../sim/types';
import { generateNeighbors } from './layout';

export function Neighbors({ site }: { site: Site }) {
  const blocks = useMemo(() => generateNeighbors(site), [site]);
  const ref = useRef<THREE.InstancedMesh>(null);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    blocks.forEach((b, i) => {
      m.compose(new THREE.Vector3(b.x, b.height / 2, b.z), new THREE.Quaternion(), new THREE.Vector3(b.width, b.height, b.depth));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, new THREE.Color(b.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [blocks]);
  return (
    <instancedMesh key={site.id} name="neighbors" ref={ref} args={[box, undefined, blocks.length]}>
      <meshStandardMaterial flatShading />
    </instancedMesh>
  );
}
```

`src/scene/FoundationView.tsx`:

```tsx
import { plateDims } from '../sim/geometry';
import type { Design, Site } from '../sim/types';
import { lotCenter, soilDepthShown } from './layout';

const CONCRETE = '#b8b4ac';

/** Positions of piles or caissons on a grid under the footprint. */
export function shaftGrid(width: number, depth: number, spacing: number): [number, number][] {
  const out: [number, number][] = [];
  const nx = Math.max(1, Math.floor(width / spacing));
  const nz = Math.max(1, Math.floor(depth / spacing));
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) out.push([(i + 0.5) * (width / nx) - width / 2, (j + 0.5) * (depth / nz) - depth / 2]);
  return out;
}

export function FoundationView({ site, design }: { site: Site; design: Design }) {
  const [lx, lz] = lotCenter(site);
  const { width, depth } = plateDims(design);
  const soil = site.foundation[design.foundation];
  const reach = Math.min(soil.depth, soilDepthShown(site));
  const slab = design.foundation === 'raft' ? reach : 3;
  const shafts =
    design.foundation === 'piles' ? shaftGrid(width, depth, 6) : design.foundation === 'caissons' ? shaftGrid(width, depth, 12) : [];
  const radius = design.foundation === 'caissons' ? 1.6 : 0.5;
  return (
    <group name="foundation" position={[lx, -1, lz]}>
      <mesh position={[0, -slab / 2, 0]}>
        <boxGeometry args={[width + 4, slab, depth + 4]} />
        <meshStandardMaterial color={CONCRETE} />
      </mesh>
      {shafts.map(([x, z]) => (
        <mesh key={`${x},${z}`} position={[x, -slab - (reach - slab) / 2, z]}>
          <cylinderGeometry args={[radius, radius, Math.max(1, reach - slab), 8]} />
          <meshStandardMaterial color={CONCRETE} />
        </mesh>
      ))}
    </group>
  );
}
```

`src/scene/Landmark.tsx`:

```tsx
import { DIORAMA } from './layout';

/** A simple silhouette of a famous local building at the back of the diorama. */
export function Landmark({ kind }: { kind: string }) {
  const position: [number, number, number] = [-DIORAMA.width / 2 + 40, 0, -DIORAMA.depth / 2 + 40];
  return (
    <group name={`landmark-${kind}`} position={position}>
      {kind === 'empire-state' && (
        <>
          <mesh position={[0, 90, 0]} scale={[40, 180, 40]}><boxGeometry /><meshStandardMaterial color="#b8ae9c" flatShading /></mesh>
          <mesh position={[0, 210, 0]} scale={[24, 60, 24]}><boxGeometry /><meshStandardMaterial color="#c4bba9" flatShading /></mesh>
          <mesh position={[0, 265, 0]}><coneGeometry args={[4, 50, 8]} /><meshStandardMaterial color="#d8d2c4" flatShading /></mesh>
        </>
      )}
      {kind === 'tokyo-tower' && (
        <>
          <mesh position={[0, 165, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[34, 330, 4]} /><meshStandardMaterial color="#e2512f" flatShading /></mesh>
          <mesh position={[0, 150, 0]} scale={[22, 8, 22]}><boxGeometry /><meshStandardMaterial color="#f4f4f4" flatShading /></mesh>
        </>
      )}
      {kind === 'willis' &&
        [440, 400, 360, 270, 440, 330, 270, 400, 360].map((h, i) => (
          <mesh key={i} position={[(i % 3) * 23 - 23, h / 2, Math.floor(i / 3) * 23 - 23]} scale={[22.5, h, 22.5]}>
            <boxGeometry />
            <meshStandardMaterial color="#2d3035" flatShading />
          </mesh>
        ))}
      {kind === 'pearl-tower' && (
        <>
          <mesh position={[0, 230, 0]}><cylinderGeometry args={[5, 7, 460, 12]} /><meshStandardMaterial color="#c9c9cf" flatShading /></mesh>
          <mesh position={[0, 100, 0]}><sphereGeometry args={[25, 16, 12]} /><meshStandardMaterial color="#c2457a" flatShading /></mesh>
          <mesh position={[0, 270, 0]}><sphereGeometry args={[16, 16, 12]} /><meshStandardMaterial color="#c2457a" flatShading /></mesh>
        </>
      )}
    </group>
  );
}
```

`src/scene/Scene.tsx`:

```tsx
import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useCurrent } from '../state/hooks';
import { Building } from './Building';
import { FoundationView } from './FoundationView';
import { Landmark } from './Landmark';
import { Neighbors } from './Neighbors';
import { SiteDiorama } from './SiteDiorama';
import { lotCenter } from './layout';

export function Scene() {
  const { site, design, analysis } = useCurrent();
  const [lx, lz] = lotCenter(site);
  const h = analysis.heightM;
  return (
    <Canvas key={site.id} camera={{ position: [lx + 280, Math.max(180, h * 0.75), lz + 340], fov: 45, near: 1, far: 6000 }}>
      <color attach="background" args={[site.visuals.sky]} />
      <fog attach="fog" args={[site.visuals.sky, 1200, 3200]} />
      <hemisphereLight args={['#ffffff', site.visuals.ground, 0.9]} />
      <directionalLight position={[300, 600, 250]} intensity={1.8} />
      <SiteDiorama site={site} />
      <Neighbors site={site} />
      <Landmark kind={site.visuals.landmark} />
      <Building site={site} design={design} />
      <FoundationView site={site} design={design} />
      <OrbitControls makeDefault target={[lx, Math.min(h * 0.35, 160), lz]} maxPolarAngle={Math.PI * 0.62} minDistance={40} maxDistance={2500} />
    </Canvas>
  );
}
```


- [ ] **Step 4: Typecheck and run all tests**

Run: `npm test && npm run typecheck`
Expected: all PASS; typecheck clean. (The Scene itself needs WebGL and is verified manually in Task 12.)

- [ ] **Step 5: Commit**

```bash
git add src/scene
git commit -m "feat(scene): add site diorama with soil, neighbors, landmark and foundation view

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Sidebar — brief, gauges, style picker, generated controls, build and assessment

**Files:**
- Create: `src/ui/exportDesign.ts`, and under `src/ui/sidebar/`: `SidebarHeader.tsx`, `BriefCard.tsx`, `Gauges.tsx`, `StylePicker.tsx`, `ParamControl.tsx`, `UseMixControl.tsx`, `AmenitiesControl.tsx`, `ControlGroups.tsx`, `BuildBar.tsx`, `AssessmentPanel.tsx`, `Sidebar.tsx`
- Test: `src/ui/sidebar/Sidebar.test.tsx`, `src/ui/exportDesign.test.ts`

**Interfaces:**
- Consumes: `useGame`, selectors, `useCurrent` (Task 7); `PARAM_GROUPS`, `visibleParams`, `paramMax` (Task 5); `STYLE_PRESETS`, `isStyleModified`, `AMENITIES`, `COEFFICIENTS` (Task 2); `evaluateBrief`, `sandboxGrades`, `formatMoney` (Task 6); `useShares` (Task 4).
- Produces: `<Sidebar />` (header with undo/redo/new project; in design phase: brief card, gauges, style picker, control groups, build bar; in complete phase: assessment panel). `designExportPayload(project, design): string`, `downloadDesign(project, design)`, `EXPORT_VERSION`. `<Stars count />`, `<Gauge />`, `formatParamValue(def, value)`. Plan 2 adds the chat panel at the bottom of `Sidebar`.
- Accessibility contract the tests rely on: every control has an `aria-label` equal to its catalog label; sliders use `coalesceKey` = param id so one drag is one undo step.

- [ ] **Step 1: Write the failing tests**

`src/ui/sidebar/Sidebar.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { selectDesign, useGame } from '../../state/store';
import { Sidebar } from './Sidebar';

const design = () => selectDesign(useGame.getState())!;

describe('Sidebar', () => {
  beforeEach(() => {
    useGame.getState().newProject();
    useGame.getState().startProject('tokyo', 'challenge', 'tokyo-quake');
  });

  it('shows the brief with live requirements', () => {
    render(<Sidebar />);
    const brief = screen.getByRole('region', { name: 'Client brief' });
    expect(within(brief).getByText('Open for Business')).toBeInTheDocument();
    expect(within(brief).getByText(/At least 45 floors/)).toHaveClass('unmet');
  });

  it('moving the floors slider changes the design and updates the brief', () => {
    render(<Sidebar />);
    fireEvent.change(screen.getByRole('slider', { name: 'Floors' }), { target: { value: '50' } });
    expect(design().floors).toBe(50);
    expect(screen.getByText(/At least 45 floors/)).toHaveClass('met');
  });

  it('picking a style applies the preset and shows its badge', () => {
    render(<Sidebar />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Style' }), { target: { value: 'art-deco' } });
    expect(design().setbacks).toBe('wedding-cake');
    expect(screen.getByText(/Art Deco · 1925–1940/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('slider', { name: 'Twist' }), { target: { value: '30' } });
    expect(screen.getByText(/Art Deco \(modified\)/)).toBeInTheDocument();
  });

  it('the info button explains a control', () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole('button', { name: 'About Floors' }));
    expect(screen.getByText(/More floors means more space/)).toBeInTheDocument();
  });

  it('undo reverts the last change', () => {
    render(<Sidebar />);
    fireEvent.change(screen.getByRole('slider', { name: 'Floors' }), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(design().floors).toBe(40);
  });

  it('dragging the last use slider to zero is refused', () => {
    render(<Sidebar />);
    fireEvent.change(screen.getByRole('slider', { name: 'Shops share' }), { target: { value: '0' } });
    fireEvent.change(screen.getByRole('slider', { name: 'Offices share' }), { target: { value: '0' } });
    expect(design().useMix.office).toBe(90);
  });

  it('building shows the assessment and hides the controls', () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole('button', { name: 'Build it!' }));
    expect(screen.getByRole('region', { name: 'Engineering assessment' })).toBeInTheDocument();
    expect(screen.queryByRole('slider', { name: 'Floors' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });

  it('a sandbox assessment shows letter grades', () => {
    useGame.getState().startProject('new-york', 'sandbox');
    render(<Sidebar />);
    fireEvent.click(screen.getByRole('button', { name: 'Build it!' }));
    expect(screen.getByText('Safety')).toBeInTheDocument();
    expect(screen.getByText('Sustainability')).toBeInTheDocument();
  });
});
```

`src/ui/exportDesign.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { defaultDesign } from '../sim/design';
import { SITES } from '../sim/sites';
import { EXPORT_VERSION, designExportPayload } from './exportDesign';

describe('designExportPayload', () => {
  it('round-trips the project and design as JSON', () => {
    const design = defaultDesign(SITES.tokyo);
    const project = { siteId: 'tokyo' as const, mode: 'sandbox' as const, briefId: null };
    const parsed = JSON.parse(designExportPayload(project, design));
    expect(parsed).toEqual({ version: EXPORT_VERSION, project, design });
  });
});
```


- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/ui`
Expected: FAIL — cannot resolve `./Sidebar` / `./exportDesign`.

- [ ] **Step 3: Implement export helpers**

`src/ui/exportDesign.ts`:

```ts
import type { Design } from '../sim/types';
import type { Project } from '../state/store';

export const EXPORT_VERSION = 1;

export function designExportPayload(project: Project, design: Design): string {
  return JSON.stringify({ version: EXPORT_VERSION, project, design }, null, 2);
}

export function downloadDesign(project: Project, design: Design): void {
  const blob = new Blob([designExportPayload(project, design)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `skyscraper-${project.siteId}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
```


- [ ] **Step 4: Implement header, brief card and gauges**

`src/ui/sidebar/SidebarHeader.tsx`:

```tsx
import { useCurrent } from '../../state/hooks';
import { selectCanRedo, selectCanUndo, useGame } from '../../state/store';

const PHASE_LABEL = { design: 'Designing', building: 'Building', complete: 'Complete' } as const;

export function SidebarHeader() {
  const { site, project } = useCurrent();
  const phase = useGame((s) => s.phase);
  const canUndo = useGame(selectCanUndo);
  const canRedo = useGame(selectCanRedo);
  const { undo, redo, newProject } = useGame.getState();
  return (
    <header className="sidebar-header">
      <div>
        <h1>{site.city}</h1>
        <p className="muted">
          {site.name} · {project.mode === 'challenge' ? 'Challenge' : 'Sandbox'} · {PHASE_LABEL[phase]}
        </p>
      </div>
      <div className="header-buttons">
        <button onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo">↩</button>
        <button onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo">↪</button>
        <button onClick={newProject} title="Back to site select">New project</button>
      </div>
    </header>
  );
}
```

`src/ui/sidebar/BriefCard.tsx`:

```tsx
import { evaluateBrief } from '../../sim/scoring';
import { useCurrent } from '../../state/hooks';

export function Stars({ count }: { count: number }) {
  return (
    <span className="stars" aria-label={`${count} of 3 stars`}>
      {[0, 1, 2].map((i) => (i < count ? '★' : '☆')).join('')}
    </span>
  );
}

export function BriefCard() {
  const { brief, design, analysis } = useCurrent();
  if (!brief) return null;
  const result = evaluateBrief(brief, design, analysis);
  return (
    <section className="card brief-card" aria-label="Client brief">
      <div className="card-title-row">
        <h2>{brief.title}</h2>
        <Stars count={result.stars} />
      </div>
      <p className="muted">{brief.client}</p>
      <p>{brief.blurb}</p>
      <ul className="req-list">
        {result.required.map((r, i) => (
          <li key={i} className={r.met ? 'met' : 'unmet'} title={r.detail}>
            {r.met ? '✅' : '❌'} {r.label}
          </li>
        ))}
      </ul>
      <p className="label">Bonus stars</p>
      <ul className="req-list">
        {result.bonus.map((r, i) => (
          <li key={i} className={r.met ? 'met' : 'unmet'} title={r.detail}>
            {r.met ? '★' : '☆'} {r.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

`src/ui/sidebar/Gauges.tsx`:

```tsx
import { COEFFICIENTS } from '../../sim/catalog/coefficients';
import { formatMoney } from '../../sim/format';
import type { CheckId, CheckStatus } from '../../sim/types';
import { useCurrent } from '../../state/hooks';

interface GaugeProps {
  label: string;
  valueText: string;
  status: CheckStatus;
  /** 0..1 how full the bar is. */
  fraction: number;
}

export function Gauge({ label, valueText, status, fraction }: GaugeProps) {
  return (
    <div className={`gauge gauge-${status}`} aria-label={`${label}: ${valueText} (${status})`}>
      <div className="gauge-top">
        <span>{label}</span>
        <span>{valueText}</span>
      </div>
      <div className="gauge-track">
        <div className="gauge-fill" style={{ width: `${Math.max(4, Math.min(1, fraction) * 100)}%` }} />
      </div>
    </div>
  );
}

const statusOf = (value: number, limit: number): CheckStatus => (value <= limit ? 'pass' : value <= limit * 1.1 ? 'marginal' : 'fail');

export function Gauges() {
  const { brief, analysis, site } = useCurrent();
  const check = (id: CheckId) => analysis.checks.find((c) => c.id === id)!;
  const briefBudget = brief?.required.find((r) => r.kind === 'maxBudget');
  const budget =
    briefBudget && briefBudget.kind === 'maxBudget'
      ? briefBudget.value
      : COEFFICIENTS.cost.benchmarkPerM2 * site.costMultiplier * analysis.gfa;
  const w = analysis.wind;
  const e = analysis.elevators;
  return (
    <section className="card" aria-label="Live estimates">
      <p className="stats">
        {Math.round(analysis.heightM)} m tall · {Math.round(analysis.gfa).toLocaleString()} m² · {analysis.schedule.totalDays} days to build
      </p>
      <Gauge
        label={briefBudget ? 'Budget' : 'Cost vs typical'}
        valueText={`${formatMoney(analysis.cost.total)} / ${formatMoney(budget)}`}
        status={statusOf(analysis.cost.total, budget)}
        fraction={analysis.cost.total / (budget * 1.2)}
      />
      <Gauge label="Wind strength" valueText={`1/${Math.round(1 / w.driftRatio)}`} status={check('windStrength').status} fraction={w.driftRatio / (COEFFICIENTS.wind.driftMarginal * 1.2)} />
      <Gauge label="Sway comfort" valueText={`${w.accelMg.toFixed(1)} / ${w.comfortLimitMg} mg`} status={check('windComfort').status} fraction={w.accelMg / (w.comfortLimitMg * 1.5)} />
      <Gauge label="Earthquake" valueText={analysis.seismic.outcome} status={check('seismic').status} fraction={analysis.seismic.ratio / 1.2} />
      <Gauge label="Foundation" valueText={`${Math.round(analysis.foundation.utilization * 100)}% load`} status={check('foundation').status} fraction={analysis.foundation.utilization / 1.2} />
      <Gauge label="Elevator wait" valueText={e.avgWaitS >= 999 ? 'no service' : `${Math.round(e.avgWaitS)} / ${e.targetS} s`} status={check('elevators').status} fraction={e.avgWaitS / (e.targetS * 2)} />
      <Gauge label="Energy" valueText={`${Math.round(analysis.energy.euiKWhPerM2)} kWh/m²`} status={check('energy').status} fraction={analysis.energy.euiKWhPerM2 / 360} />
    </section>
  );
}
```


- [ ] **Step 5: Implement the style picker and generated controls**

`src/ui/sidebar/StylePicker.tsx`:

```tsx
import { STYLE_IDS, STYLE_PRESETS } from '../../sim/catalog/styles';
import { isStyleModified } from '../../sim/design';
import type { StyleId } from '../../sim/types';
import { useCurrent } from '../../state/hooks';
import { useGame } from '../../state/store';

export function StylePicker() {
  const { design, site } = useCurrent();
  const dispatch = useGame((s) => s.dispatch);
  const preset = STYLE_PRESETS[design.style];
  const modified = isStyleModified(design);
  return (
    <section className="card" aria-label="Architectural style">
      <label className="control-row">
        <span>Style</span>
        <select
          aria-label="Style"
          value={design.style}
          onChange={(e) => dispatch([{ type: 'apply_style_preset', style: e.target.value as StyleId }])}
        >
          {STYLE_IDS.map((id) => (
            <option key={id} value={id}>
              {STYLE_PRESETS[id].name}
            </option>
          ))}
        </select>
      </label>
      <p className="style-badge">
        {preset.name}
        {modified ? ' (modified)' : ''} · {preset.era}
      </p>
      <details>
        <summary>About this style</summary>
        <p>{preset.summary}</p>
        <p>
          <em>Why it looks this way:</em> {preset.why}
        </p>
        <ul>
          {preset.examples.map((ex) => (
            <li key={ex.name} className={ex.city === site.city ? 'local-example' : undefined}>
              {ex.name}, {ex.city}
              {ex.city === site.city ? ' — look it up, it is in this city!' : ''}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
```

`src/ui/sidebar/ParamControl.tsx`:

```tsx
import { useState } from 'react';
import { paramMax, type ParamDef } from '../../sim/catalog/parameters';
import { useCurrent } from '../../state/hooks';
import { useGame } from '../../state/store';

export function formatParamValue(def: ParamDef, value: unknown): string {
  if (def.kind === 'number' && typeof value === 'number') {
    return def.percent ? `${Math.round(value * 100)}%` : `${value} ${def.unit}`;
  }
  if (def.kind === 'boolean') return value ? 'On' : 'Off';
  if (def.kind === 'enum') return def.options.find((o) => o.value === value)?.label ?? String(value);
  return String(value);
}

export function ParamControl({ def }: { def: ParamDef }) {
  const { site, design } = useCurrent();
  const dispatch = useGame((s) => s.dispatch);
  const [showHelp, setShowHelp] = useState(false);
  const value = design[def.id];
  const set = (v: number | string | boolean, coalesce = false) =>
    dispatch([{ type: 'set_parameter', id: def.id, value: v }], coalesce ? { coalesceKey: def.id } : undefined);

  let input: React.ReactNode;
  if (def.kind === 'number') {
    input = (
      <input
        type="range"
        aria-label={def.label}
        min={def.min}
        max={paramMax(def, site, design)}
        step={def.step}
        value={value as number}
        onChange={(e) => set(Number(e.target.value), true)}
      />
    );
  } else if (def.kind === 'enum') {
    input = (
      <select aria-label={def.label} value={value as string} onChange={(e) => set(e.target.value)}>
        {def.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  } else {
    input = <input type="checkbox" aria-label={def.label} checked={value as boolean} onChange={(e) => set(e.target.checked)} />;
  }

  const selectedOption = def.kind === 'enum' ? def.options.find((o) => o.value === value) : undefined;
  return (
    <div className="param">
      <div className="control-row">
        <span>
          {def.label}
          <button className="info" aria-label={`About ${def.label}`} aria-expanded={showHelp} onClick={() => setShowHelp(!showHelp)}>
            ⓘ
          </button>
        </span>
        {input}
        {def.kind === 'number' && <span className="value">{formatParamValue(def, value)}</span>}
      </div>
      {showHelp && (
        <p className="help">
          {def.explain}
          {selectedOption ? ` ${selectedOption.label}: ${selectedOption.explain}` : ''}
        </p>
      )}
    </div>
  );
}
```

`src/ui/sidebar/UseMixControl.tsx`:

```tsx
import { useShares } from '../../sim/analysis/massing';
import { USE_ORDER, type UseType } from '../../sim/types';
import { useCurrent } from '../../state/hooks';
import { useGame } from '../../state/store';

const USE_LABEL: Record<UseType, string> = { retail: 'Shops', office: 'Offices', hotel: 'Hotel', residential: 'Homes' };

export function UseMixControl() {
  const { design } = useCurrent();
  const dispatch = useGame((s) => s.dispatch);
  const shares = useShares(design);
  return (
    <div>
      <p className="help">Uses stack bottom to top: shops, offices, hotel, homes.</p>
      {USE_ORDER.map((u) => (
        <div key={u} className="control-row">
          <span>{USE_LABEL[u]}</span>
          <input
            type="range"
            aria-label={`${USE_LABEL[u]} share`}
            min={0}
            max={100}
            step={5}
            value={design.useMix[u]}
            onChange={(e) => dispatch([{ type: 'set_use_mix', mix: { [u]: Number(e.target.value) } }], { coalesceKey: `use-${u}` })}
          />
          <span className="value">{Math.round(shares[u] * 100)}%</span>
        </div>
      ))}
    </div>
  );
}
```

`src/ui/sidebar/AmenitiesControl.tsx`:

```tsx
import { AMENITIES, AMENITY_IDS } from '../../sim/catalog/amenities';
import { useCurrent } from '../../state/hooks';
import { useGame } from '../../state/store';

export function AmenitiesControl() {
  const { design } = useCurrent();
  const dispatch = useGame((s) => s.dispatch);
  return (
    <div>
      {AMENITY_IDS.map((id) => {
        const on = design.amenities.includes(id);
        return (
          <label key={id} className="amenity" title={AMENITIES[id].explain}>
            <input
              type="checkbox"
              checked={on}
              onChange={() => dispatch([{ type: on ? 'remove_amenity' : 'add_amenity', id }])}
            />
            <span>
              <strong>{AMENITIES[id].label}</strong> — {AMENITIES[id].explain}
            </span>
          </label>
        );
      })}
    </div>
  );
}
```

`src/ui/sidebar/ControlGroups.tsx`:

```tsx
import { PARAM_GROUPS, visibleParams } from '../../sim/catalog/parameters';
import { useCurrent } from '../../state/hooks';
import { useGame } from '../../state/store';
import { AmenitiesControl } from './AmenitiesControl';
import { ParamControl } from './ParamControl';
import { UseMixControl } from './UseMixControl';

export function ControlGroups() {
  const { design } = useCurrent();
  const level = useGame((s) => s.detailLevel);
  const params = visibleParams(level, design);
  return (
    <section aria-label="Design controls">
      {PARAM_GROUPS.map((g) => (
        <details key={g.id} className="card group" open={g.id === 'form'}>
          <summary>{g.label}</summary>
          {params
            .filter((p) => p.group === g.id)
            .map((p) => (
              <ParamControl key={p.id} def={p} />
            ))}
        </details>
      ))}
      <details className="card group">
        <summary>Uses</summary>
        <UseMixControl />
      </details>
      <details className="card group">
        <summary>Amenities</summary>
        <AmenitiesControl />
      </details>
    </section>
  );
}
```


- [ ] **Step 6: Implement build bar, assessment and the sidebar shell**

`src/ui/sidebar/BuildBar.tsx`:

```tsx
import { useCurrent } from '../../state/hooks';
import { useGame } from '../../state/store';

export function BuildBar() {
  const { analysis } = useCurrent();
  const build = useGame((s) => s.build);
  const structuralFail = analysis.checks.some(
    (c) => (c.id === 'windStrength' || c.id === 'seismic' || c.id === 'foundation') && c.status === 'fail',
  );
  return (
    <footer className="build-bar">
      {structuralFail && <p className="warning">⚠ This design would fail its structural engineering assessment.</p>}
      <button className="build-button" onClick={build}>
        Build it!
      </button>
      <p className="muted">Building locks the design.</p>
    </footer>
  );
}
```

`src/ui/sidebar/AssessmentPanel.tsx`:

```tsx
import { evaluateBrief, sandboxGrades, type GradeCategory } from '../../sim/scoring';
import { useCurrent } from '../../state/hooks';
import { useGame } from '../../state/store';
import { downloadDesign } from '../exportDesign';
import { Stars } from './BriefCard';

const ICON = { pass: '✅', marginal: '⚠️', fail: '❌' } as const;
const GRADE_LABEL: Record<GradeCategory, string> = {
  safety: 'Safety',
  cost: 'Cost',
  comfort: 'Comfort',
  efficiency: 'Efficiency',
  sustainability: 'Sustainability',
};

export function AssessmentPanel() {
  const { project, site, design, analysis, brief } = useCurrent();
  const newProject = useGame((s) => s.newProject);
  const structuralFail = analysis.checks.some(
    (c) => (c.id === 'windStrength' || c.id === 'seismic' || c.id === 'foundation') && c.status === 'fail',
  );
  return (
    <section className="card assessment" aria-label="Engineering assessment">
      <h2>Engineering assessment</h2>
      <p className={structuralFail ? 'verdict fail' : 'verdict pass'}>
        {structuralFail ? '❌ Failed structural engineering assessment' : '✅ Passed structural engineering assessment'}
      </p>
      <ul className="check-list">
        {analysis.checks.map((c) => (
          <li key={c.id}>
            <strong>
              {ICON[c.status]} {c.label}
            </strong>
            <span>{c.message}</span>
          </li>
        ))}
      </ul>
      {brief ? (
        (() => {
          const result = evaluateBrief(brief, design, analysis);
          return (
            <div>
              <h3>
                {brief.title} <Stars count={result.stars} />
              </h3>
              <ul className="req-list">
                {[...result.required, ...result.bonus].map((r, i) => (
                  <li key={i} className={r.met ? 'met' : 'unmet'}>
                    {r.met ? '✅' : '❌'} {r.label} <span className="muted">{r.detail}</span>
                  </li>
                ))}
              </ul>
              <p className="muted">Lesson: {brief.lesson}</p>
            </div>
          );
        })()
      ) : (
        <table className="grades">
          <tbody>
            {Object.entries(sandboxGrades(site, analysis)).map(([k, g]) => (
              <tr key={k}>
                <td>{GRADE_LABEL[k as GradeCategory]}</td>
                <td className={`grade grade-${g}`}>{g}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="assessment-actions">
        <button onClick={() => downloadDesign(project, design)}>Export design (JSON)</button>
        <button onClick={newProject}>New project</button>
      </div>
    </section>
  );
}
```

`src/ui/sidebar/Sidebar.tsx`:

```tsx
import { useGame } from '../../state/store';
import { AssessmentPanel } from './AssessmentPanel';
import { BriefCard } from './BriefCard';
import { BuildBar } from './BuildBar';
import { ControlGroups } from './ControlGroups';
import { Gauges } from './Gauges';
import { SidebarHeader } from './SidebarHeader';
import { StylePicker } from './StylePicker';

export function Sidebar() {
  const phase = useGame((s) => s.phase);
  return (
    <aside className="sidebar">
      <SidebarHeader />
      <div className="sidebar-scroll">
        {phase === 'complete' ? (
          <AssessmentPanel />
        ) : (
          <>
            <BriefCard />
            <Gauges />
            <StylePicker />
            <ControlGroups />
          </>
        )}
      </div>
      {phase === 'design' && <BuildBar />}
    </aside>
  );
}
```


- [ ] **Step 7: Run to verify they pass**

Run: `npx vitest run src/ui && npm run typecheck`
Expected: Sidebar (8) and export (1) tests PASS; the placeholder App test from Task 1 still PASSES; typecheck clean.

- [ ] **Step 8: Commit**

```bash
git add src/ui
git commit -m "feat(ui): add design sidebar with live brief, gauges, catalog-driven controls and assessment

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Site select, game screen and app routing

**Files:**
- Create: `src/ui/SiteSelect.tsx`, `src/ui/GameScreen.tsx`
- Modify: `src/ui/App.tsx` (replace placeholder), `src/ui/App.test.tsx` (replace)
- Test: `src/ui/SiteSelect.test.tsx`, `src/ui/App.test.tsx`

**Interfaces:**
- Consumes: `useGame` (Task 7), `SITES`, `SITE_IDS` (Task 2), `briefsForSite` (Task 6), `<Sidebar />` (Task 10), `<Scene />` (Task 9).
- Produces: `<SiteSelect />` (map with four pins; one card per city with two challenge buttons and a sandbox button), `<GameScreen />` (sidebar + 3D viewport), `<App />` (site select when no project, otherwise game screen).

- [ ] **Step 1: Write the failing tests**

`src/ui/SiteSelect.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGame } from '../state/store';
import { SiteSelect } from './SiteSelect';

describe('SiteSelect', () => {
  beforeEach(() => useGame.getState().newProject());

  it('shows all four cities', () => {
    render(<SiteSelect />);
    for (const city of ['New York', 'Tokyo', 'Chicago', 'Shanghai']) expect(screen.getByRole('region', { name: city })).toBeInTheDocument();
  });

  it('starts a sandbox project', () => {
    render(<SiteSelect />);
    fireEvent.click(screen.getByRole('button', { name: 'Sandbox in Chicago' }));
    expect(useGame.getState().project).toEqual({ siteId: 'chicago', mode: 'sandbox', briefId: null });
  });

  it('starts a challenge project with its brief', () => {
    render(<SiteSelect />);
    fireEvent.click(screen.getByRole('button', { name: /Open for Business/ }));
    expect(useGame.getState().project).toEqual({ siteId: 'tokyo', mode: 'challenge', briefId: 'tokyo-quake' });
  });
});
```


Replace `src/ui/App.test.tsx` with:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGame } from '../state/store';
import { App } from './App';

// WebGL is not available in jsdom; the 3D scene has its own tests.
vi.mock('../scene/Scene', () => ({ Scene: () => <div data-testid="scene" /> }));

describe('App', () => {
  beforeEach(() => useGame.getState().newProject());

  it('goes from site select to the game and back', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Sandbox in Shanghai' }));
    expect(screen.getByTestId('scene')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Shanghai' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'New project' }));
    expect(screen.getByRole('heading', { name: 'Skyscraper Studio' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/ui/SiteSelect.test.tsx src/ui/App.test.tsx`
Expected: FAIL — cannot resolve `./SiteSelect`; App test fails because the placeholder has no site buttons.

- [ ] **Step 3: Implement**

`src/ui/SiteSelect.tsx`:

```tsx
import { briefsForSite } from '../sim/briefs';
import { SITES, SITE_IDS } from '../sim/sites';
import { useGame } from '../state/store';

const MAP_W = 720;
const MAP_H = 300;
/** Equirectangular projection, cropped to latitudes 70°N–50°S. */
function project(lat: number, lon: number): { x: number; y: number } {
  return { x: ((lon + 180) / 360) * MAP_W, y: ((70 - lat) / 120) * MAP_H };
}

export function SiteSelect() {
  const startProject = useGame((s) => s.startProject);
  return (
    <div className="site-select">
      <header className="site-select-header">
        <h1>Skyscraper Studio</h1>
        <p>Pick a city. Every site has its own ground, weather, and history — and its own way to fail.</p>
      </header>

      <svg className="world-map" viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label="World map of building sites">
        <rect width={MAP_W} height={MAP_H} rx="12" className="world-ocean" />
        {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lon) => (
          <line key={`lon${lon}`} x1={project(0, lon).x} x2={project(0, lon).x} y1={0} y2={MAP_H} className="world-grid" />
        ))}
        {[60, 30, 0, -30].map((lat) => (
          <line key={`lat${lat}`} y1={project(lat, 0).y} y2={project(lat, 0).y} x1={0} x2={MAP_W} className="world-grid" />
        ))}
        {SITE_IDS.map((id) => {
          const { x, y } = project(SITES[id].mapPos.lat, SITES[id].mapPos.lon);
          return (
            <g key={id}>
              <circle cx={x} cy={y} r="7" className="world-pin" />
              <text x={x + 11} y={y + 4} className="world-label">
                {SITES[id].city}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="site-cards">
        {SITE_IDS.map((id) => {
          const site = SITES[id];
          return (
            <section key={id} className="site-card" aria-label={site.city}>
              <h2>{site.city}</h2>
              <p className="site-name">{site.name}</p>
              <p>{site.challenge}</p>
              <p className="site-fact">💡 {site.fact}</p>
              <div className="site-actions">
                {briefsForSite(id).map((b) => (
                  <button key={b.id} className="brief-button" onClick={() => startProject(id, 'challenge', b.id)}>
                    <strong>Challenge: {b.title}</strong>
                    <span>{b.lesson}</span>
                  </button>
                ))}
                <button className="sandbox-button" onClick={() => startProject(id, 'sandbox')}>
                  Sandbox in {site.city}
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
```

`src/ui/GameScreen.tsx`:

```tsx
import { Scene } from '../scene/Scene';
import { Sidebar } from './sidebar/Sidebar';

export function GameScreen() {
  return (
    <div className="game">
      <Sidebar />
      <main className="viewport">
        <Scene />
      </main>
    </div>
  );
}
```


Replace `src/ui/App.tsx` with:

```tsx
import { useGame } from '../state/store';
import { GameScreen } from './GameScreen';
import { SiteSelect } from './SiteSelect';

export function App() {
  const hasProject = useGame((s) => s.project !== null);
  return hasProject ? <GameScreen /> : <SiteSelect />;
}
```

- [ ] **Step 4: Run all tests, typecheck and build**

Run: `npm test && npm run build`
Expected: all 15 test files / 102 tests PASS; typecheck clean; build succeeds (a >500 kB chunk-size warning is expected and fine for a local game).

- [ ] **Step 5: Commit**

```bash
git add src/ui
git commit -m "feat(ui): add site select screen and game screen routing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Manual playtest and fixes

**Files:**
- Modify: only files where a playtest problem is found (expected: none or small CSS/camera tweaks).

**Interfaces:**
- Consumes: the whole app.
- Produces: a verified playable build; any fixes committed.

WebGL output cannot be unit-tested, so this task checks it in a real browser.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: Vite prints `http://localhost:5173/`.

- [ ] **Step 2: Playtest checklist (in Chrome)**

Open the URL and check each item; note any failure:
1. Site select shows the map with four labelled pins and four city cards.
2. "Sandbox in Chicago": the 3D view shows a wintry pale diorama, neighbor blocks, the Willis-style landmark, and a glass tower on the lot at the front edge. No console errors.
3. Orbit the camera (drag), zoom (wheel). Tilt below ground level: soil bands and their labels are visible on the front face, and the shallow mat foundation shows through the translucent soil.
4. Set Foundation → Caissons: concrete shafts appear reaching down to the bedrock band. Foundation gauge turns green.
5. Drag Floors to 100: the tower grows live; the gauges update; one Undo returns to 40 floors.
6. Style → Art Deco: setbacks, a spire crown and a stone colour appear; the badge reads "Art Deco · 1925–1940". Change Twist: the badge reads "(modified)".
7. Style → High-Tech: X-bracing appears on the faces. Style → Neo-futurist: a round, tapered, twisting tower.
8. Shape → Triangle and Rectangle (Depth slider appears only for Rectangle). Crown → Sloped and Stepped render sensibly.
9. Amenities: tick all four; helipad, pool, observation-deck band and green sky-garden band are visible.
10. "New project" → "Challenge: Open for Business" (Tokyo): the brief card lists requirements with ❌; follow the reference design (48 floors, 45 m width, steel, base isolation, piles, 18 cars, two zones) and watch them turn ✅ and the stars fill.
11. Build it!: the sidebar switches to the Engineering assessment with a pass/fail verdict, six checks, and stars; Undo is disabled; "Export design (JSON)" downloads a file.
12. Sandbox build on Shanghai with a shallow mat at 60 floors: verdict reads "❌ Failed structural engineering assessment" and Safety grade is F.
13. Narrow the window to ~700 px wide: the layout stacks without horizontal scrolling.

- [ ] **Step 3: Fix anything that failed**

For each failed item, make the smallest fix (typically camera position in `Scene.tsx`, a size in `Building.tsx`, or CSS). Re-run `npm test && npm run build` after fixes.

- [ ] **Step 4: Commit fixes (if any)**

```bash
git add -A src
git commit -m "fix: playtest adjustments

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Self-Review Notes

- **Spec coverage (Plan 1 scope):** game flow steps 1, 2, 4 (assessment), 5 (new project + JSON export) — Tasks 7, 10, 11. Sites (§5) — Task 2. Design model incl. styles (§6) — Tasks 2, 5. Analysis (§7) — Task 4. Scoring + 8 briefs (§8) — Task 6. 3D site/building/foundation (§9 first three bullets) — Tasks 8, 9. Sidebar (§10, minus chat) — Task 10. Testing (§12) — every task. **Deferred by design:** construction animation (step 3, §9 bullet 3) → Plan 3; overlays and people (§9 bullet 4) → Plan 4; design chat (§11) → Plan 2.
- **Deviation from spec:** the "spire" amenity was dropped because it duplicated the "spire" crown; amenities are helipad, rooftop pool, observation deck, sky garden.
- **Type consistency:** `DesignAction`, `GamePhase`, `ParamId`, `Project`, `Analysis.checks` ids and scene object names are defined once and referenced verbatim in later tasks.
