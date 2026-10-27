# Plan 13 — Inside the Tower: Systems Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** five buttons (⚡ Power, 💧 Water, 🚽 Waste, 🛗 Elevators, 🌬️ Air). Each ghosts the tower and shows that system's network inside it, with glowing pulses flowing along it, elevator cars riding their shafts, and a card in the tower's own numbers. Everything follows the design.

**Architecture:**
- **Pure network builders** in `src/sim/systems/`:
  - each returns a `SystemNetwork`: polylines with a colour and a flow direction, equipment parts, and elevator shafts;
  - they use building coordinates, with y in metres and the basement at negative y;
  - they cover plant floors, water zones, substations, stacks and elevator banks.
- **Cards:** wording in `src/sim/catalog/systems.ts`, filled by `systemReadout(...)`.
- **Store:** a `system` view setting, exclusive with `force`.
- **Scene:** `SystemsView` draws:
  - the lines as instanced, per-instance-coloured struts;
  - the equipment through `PartsMesh`;
  - the pulses as one instanced sphere mesh moved along the polylines in `useFrame`, with a cap of 400;
  - the elevator cars as one instanced box mesh.
- **Ghosting:** `Building` takes `ghost` and makes every material in its group faint and see-through while it is set, restoring them afterwards.

**Tech Stack:** React 19, three 0.186, @react-three/fiber 9, Zustand 5, Vitest 5.

**Spec:** `docs/superpowers/specs/2026-10-26-building-systems-flow-design.md`.

## Global Constraints

- No new dependencies.
- **Never push or merge to `master` without the user's explicit word.**
- **Plant floors** are `mechanicalFloors(floors)` (Plan 6). With none, use a basement plant room (y −4…0) and the roof.
- **Water zones:**
  - floors 0–5 are fed from the city main;
  - above that, zones = plant floors + 1, with a pump and tank on each plant floor and a roof tank;
  - pumps are in the basement and on each plant floor.
- **Elevator zones** use `ZONE_COUNT[zoning]`:
  - boundaries at `round(k · floors / zones)`;
  - for sky lobbies, the shuttle share is `COEFFICIENTS…skyLobbyShuttleShare` (0.15), with at least one shuttle per sky lobby.
- **Waste stacks** = `clamp(round(topPlateArea / 1000), 2, 6)`, taken from the top floor plate.
- **Systems grade:**
  - Efficient adds heat-recovery wheels and multiplies pulses on Water and Air by 0.8;
  - Green adds solar, a rainwater tank and grey water, and multiplies pulses by 0.6.
- **Budgets:** at most 400 pulses and at most 30 extra draw calls. Nothing runs when no system is on.
- **Exclusivity:** one system at a time, exclusive with Wind and Earthquake. The setting is hidden while building, reset by a new project, and kept out of the design history.

## Review Focus

1. **Short towers** (under 40 floors: no plant floors) and the tallest ones (150 floors): every system still makes sense. Test in Task 2 (both extremes, for every system).
2. **Twisted, tapered and set-back towers:** branches reach each floor's own edge, not a fixed width. Test in Task 2 (every branch end lies inside that floor's outline).
3. **Changing the design while a system is on:** it rebuilds immediately with no stale lines. Test in Task 4.
4. **Turning a system off:** the walls come back exactly as they were, with no lingering transparency. Test in Task 4.
5. **Wind turned on while Water is showing:** Water turns off, and the reverse. Test in Task 1.

---

### Task 1: The setting, the buttons and the cards

**Files:**
- Create: `src/sim/catalog/systems.ts`, `src/sim/systems/readout.ts`, `src/ui/SystemControls.tsx`
- Modify: `src/state/store.ts`, `src/scene/Scene.tsx` (mount the buttons, and show the system card in place of the soil legend when on), `src/ui/styles.css`
- Test: `src/state/system.test.ts`, `src/sim/systems/readout.test.ts`, `src/ui/SystemControls.test.tsx`

**Interfaces:**
- Produces:
  - `type SystemView = 'none' | 'power' | 'water' | 'waste' | 'elevators' | 'air'`
  - `SYSTEM_IDS`
  - in the store: `system: SystemView` and `toggleSystem(s)`. Toggling a system sets `force: 'none'`, and `toggleForce` sets `system: 'none'`.
  - `systemReadout(site, design, analysis, system): Readout`, the same shape as the force readout: `{ title, lines: { text }[], note }`.
- Produces from Task 2, used here: `systemFacts(design, analysis)`:
  - `{ plantFloors: number[]; waterZones: number; pumpFloors: number[]; substations: number; stacks: number; zones: number; skyLobbies: number[]; shuttles: number; cars: number }`.
  - Put it in `src/sim/systems/facts.ts` in this task. Task 2 builds the geometry on top of it.

- [ ] **Step 1: Write the failing tests**
  - **store:** only one system at a time; a system and a force are exclusive both ways; `newProject` resets the system; history is untouched.
  - **facts:**
    - 92 floors: plant floors [29, 59, 89], 4 water zones, pumps [0, 29, 59, 89], 3 substations;
    - 30 floors: no plant floors, 1 zone, pumps [0], 0 substations;
    - stacks: 30 m square top plate is 2, 60 m square is 4 (3,600/1,000 rounds to 4), 90 m is 6 (the cap);
    - elevators, 120 floors with 24 cars:
      - sky-lobby: zones 3, sky lobbies [40, 80], 4 shuttles (round(24 × 0.15) = 4 ≥ 2);
      - two-zone: zones 2, no sky lobbies;
      - single: zones 1.
  - **readouts:**
    - the water card says "4 water zones" and lists floors 29, 59 and 89 for a 92-floor tower;
    - the power card names the turbines only with the wind-turbines crown, and solar only on green;
    - the elevator card quotes the cars, the zones, the sky-lobby floors, and `avgWaitS` against `targetS` (rounded seconds);
    - the waste card mentions grey water only on green;
    - the air card mentions heat recovery on efficient and green.
  - **UI:**
    - five buttons with `aria-pressed`, exclusive;
    - hidden while building;
    - the card appears and updates when the floors change.
- [ ] **Step 2: Run the tests to check they fail.**
  - Run: `npx vitest run --maxWorkers=2 src/state/system.test.ts src/sim/systems src/ui/SystemControls.test.tsx`
  - Expected: FAIL.
- [ ] **Step 3: Implement.** Card wording follows spec §4–5: short, for a child, with a "Why?" line per system.
- [ ] **Step 4: Run the tests to check they pass.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: systems view setting, buttons and cards in the tower's own numbers`

### Task 2: The networks

**Files:**
- Create: `src/sim/systems/network.ts` (types and the shared helpers), plus `power.ts`, `water.ts`, `waste.ts`, `elevators.ts` and `air.ts`
- Test: `src/sim/systems/network.test.ts`

**Interfaces:**
- Produces:
  - `interface FlowLine { points: Vec3[]; color: string; width: number; pulses: number }`. Pulses travel from `points[0]` towards the last point; `pulses: 0` means a static line (vents).
  - `interface Shaft { x: number; z: number; y0: number; y1: number; stops: number[]; color: string; express: boolean }`. The stops are y values.
  - `interface SystemNetwork { lines: FlowLine[]; equipment: Part[]; shafts: Shaft[] }`
  - `systemNetwork(site, design, analysis, system): SystemNetwork`
  - `SYSTEM_COLOR`: power `#ffc83d`, water `#3da5ff`, waste `#8b5a2b`, supply `#45e0e6`, return `#ff8a3d`, grey `#9fb8c8`. Zone colours are `['#7bd88f', '#ffb347', '#c792ea']`.
- **Layout:**
  - **Risers** run in the core: a square of side `0.3 × min(top width, depth)`, centred, so it fits every floor.
  - **Branches** run from the riser at each floor out to 0.8 of that floor's half-width, turned with the floor.
  - **Basement:** y −4…0. **Street:** z = lot front, y −2.

- [ ] **Step 1: Write the failing tests**
  - **"every system on every extreme"**:
    - for each of the 5 systems, on 5 floors, 30 floors and 150 floors, and on square, circle, triangle and twisted-90 setback towers:
      - all points are finite;
      - y is within [−6, body + crown + 2];
      - branch ends are inside the floor outline (`insidePlan` with margin −0.5) at their y;
      - the total pulses are ≤ 400.
  - **"power rises from the street with a substation on each plant floor; turbines and solar feed in only when chosen"**:
    - equipment counts match `systemFacts`;
    - with the turbines crown, a line runs from the roof downward;
    - green adds a solar line.
  - **"water: pumps lift to tanks, gravity feeds down; floors 0–5 from the city main"**:
    - a line whose y rises from basement pump to tank for each zone;
    - down-feed lines whose y falls;
    - branches on floors 0–5 fed from the main riser;
    - a pool loop only with the pool;
    - a rainwater line only on green.
  - **"waste falls the whole height, vents rise; grey water only on green"**:
    - the stack count matches;
    - every stack's y decreases from top to end;
    - there are jogs every 30 floors;
    - vents have `pulses: 0`;
    - green adds a grey-water loop whose first point is in the basement.
  - **"elevators: one shaft per car, banked by zoning"**:
    - shafts = cars;
    - single: all shafts span 0…top;
    - two-zone: the high bank's shafts have no stops below the boundary (express);
    - sky-lobby: the shuttles stop only at 0 and the sky lobbies; locals start at their sky lobby;
    - the colours follow the zone.
  - **"air: handlers on plant floors push supply out and pull return back; heat wheels on efficient and green; fewer pulses"**:
    - handlers equal the plant floors, or 2 with none (basement and roof);
    - supply and return lines both exist;
    - torus wheels appear only on efficient and green;
    - green pulses ≤ 0.65 × standard.
- [ ] **Step 2: Run the tests to check they fail.**
  - Run: `npx vitest run --maxWorkers=2 src/sim/systems`
  - Expected: FAIL.
- [ ] **Step 3: Implement**, one file per system, with the shared helpers (riser spots in the core, branch end per floor, street point) in `network.ts`.
- [ ] **Step 4: Run the tests to check they pass.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: the five networks — power, water, waste, elevators and air — built from the design`

### Task 3: SystemsView — lines, pulses, cars, equipment

**Files:**
- Create: `src/scene/systems/SystemsView.tsx`, `src/scene/systems/flow.ts` (pure: `pointAlong(points, t)`, `pulseLayout(lines, cap)`)
- Test: `src/scene/systems/flow.test.ts`, `src/scene/systems/SystemsView.test.tsx`

**Interfaces:**
- Produces:
  - `pointAlong(points: Vec3[], t: number): Vec3`, where t runs 0..1 by arc length;
  - `pulseLayout(lines: FlowLine[], cap: number): { line: number; offset: number }[]`, which keeps the total at or under the cap, scaling each line's pulses down in proportion;
  - `<SystemsView site design analysis system />`. It is placed at the lot like `Building`. Its contents:
    - lines as an instanced box mesh with `setColorAt`, emissive at 0.35;
    - pulses as one instanced sphere mesh, emissive, moving at 8 m/s;
    - equipment through `PartsMesh`;
    - cars as an instanced box mesh, each moving between its shaft's stops with a 1 s pause, phase-offset by its index.

- [ ] **Step 1: Write the failing tests**
  - **flow:**
    - `pointAlong` gives the first point at 0 and the last at 1, and is linear by length;
    - `pulseLayout` keeps the total at or under the cap, keeps every line with pulses > 0 at least 1 when the cap allows, and drops static lines.
  - **view:**
    - it renders each system on a 40-floor tower without throwing;
    - the line instances equal the total segments;
    - the pulse count is ≤ 400;
    - the elevator view has `design.elevators` cars;
    - after 30 frames, a car's y has changed.
- [ ] **Step 2: Run the tests to check they fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests to check they pass.**
  - Run: `npx vitest run --maxWorkers=2 src/scene/systems`
  - Expected: PASS.
- [ ] **Step 5: Commit** `feat: SystemsView draws the networks with flowing pulses and running elevator cars`

### Task 4: Ghosting the tower, and wiring it up

**Files:**
- Modify: `src/scene/Building.tsx` (`ghost?: boolean`), `src/scene/Scene.tsx`
- Test: `src/scene/Building.test.tsx`, `src/scene/Scene.test.ts` (or a new `src/scene/systems/ghost.test.tsx`)

**Interfaces:**
- Produces:
  - `useGhost(group: RefObject<THREE.Group>, on: boolean)`:
    - while on, every frame it makes each mesh material in the group `transparent`, with opacity `min(saved, 0.12)` and `depthWrite` false, saving the originals in `userData.ghost`;
    - when turned off, it restores them all and sets `needsUpdate`.
  - `Scene` mounts `<SystemsView>` and passes `ghost` when a system is on and the tower isn't building.
  - `CloseWalls` is not mounted while ghosted.

- [ ] **Step 1: Write the failing tests**
  - **"ghosting makes the tower see-through and puts it back exactly"**: render `Building` with `ghost`, advance a frame, and check every material has opacity ≤ 0.12 and `transparent`. Then re-render without it, advance, and check every material's opacity, transparent and depthWrite equal their values before.
  - **"changing the design while ghosted keeps the new parts ghosted"**: update the design (crown change) and advance; every material is still faint.
  - **"Scene shows the systems view and the card only when a system is on"**.
- [ ] **Step 2: Run the tests to check they fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests to check they pass.**
  - Run: `npx vitest run --maxWorkers=2 src/scene`
  - Expected: PASS.
- [ ] **Step 5: Commit** `feat: the tower goes see-through while a system is showing`

### Task 5: Power cut, docs and the visual check

- [ ] **Step 1: Power cut.**
  - **Test:** a "Power cut" button on the power card toggles a view flag `powerCut`, and while it is set the generators' equipment glows (`glow`) and the street line has no pulses.
  - **Implement.**
  - **Commit:** `feat: a power cut starts the backup generators`
- [ ] **Step 2: README.** One paragraph on the systems view. **Roadmap:** Plan 13 done, then 14 people and 15 design chat.
- [ ] **Step 3: Full suite.**
  - Run: `npx vitest run --maxWorkers=2 && npx tsc -b && npx vite build`
  - Expected: PASS.
- [ ] **Step 4: Visual check (CDP).**
  - Shots: each system on a 40-floor and a 120-floor tower, single vs sky-lobby elevators, standard vs green water, and power at night.
  - Expected: the flows are readable, nothing escapes the tower, and zero console errors.
- [ ] **Step 5: Commit** `docs: inside the tower`
