# Wind and Earthquake — Design Spec (Plan 5)

Extends `2026-10-10-skyscraper-sim-design.md` (§9 "Overlays": Wind and Earthquake). Roadmap position: Plan 5. The rest of §9's overlays (structure, elevators, electrical, plumbing, HVAC) become Plan 6, and the people simulation becomes Plan 7.

## 1. Purpose

The analysis already works out how a tower stands up to wind and earthquakes, but the player only sees numbers and ticks. Plan 5 lets him **watch the forces act on his tower**: the wind pushing it, the tower swaying, eddies behind it, and the ground shaking under it. He can see dampers and base isolation doing their jobs, and see how his choices change it all, live.

**What the user asked for:**
- **The goal:** how the tower works, and watching the forces act on it.
- **Two overlays:** **Wind** and **Earthquake**. The other overlays come in later plans.
- **Available while designing too**, so changes show live, and on the finished tower.
- **When the design is not good enough:** visible damage, but **no collapse**.
- **Approach:** the tower **bends floor by floor**, with the base fixed and the top moving most. It does not tilt as one rigid block.

**Assumptions (agreed):**
- Everything is driven by the analysis's existing numbers. There is no new physics and no change to the analysis.
- One force at a time.
- Motion is exaggerated so it can be seen, and labelled as exaggerated.

**Out of scope:**
- Structure, elevators, electrical, plumbing and HVAC overlays (Plan 6).
- People (Plan 7).
- Changes to any check or score.
- Wind direction choices.
- Collapse.
- Sound.

## 2. Controls and state

**Buttons:** two new buttons in the scene overlay, beside **Fit tower in view** and the day/night button: **💨 Wind** and **〰️ Earthquake**.
- They use `aria-pressed`.
- Pressing one turns the other off; pressing the active one turns it off.

**Store:** a view-only `force: 'none' | 'wind' | 'quake'`, like `timeOfDay`.
- It is not part of the design, its history or the export.
- New project resets it to `'none'`.

**When it is available:**
- During `design` and `complete`.
- During `building` the buttons are hidden and no force runs. The chosen force is remembered and resumes when the tower is finished.

**Live updates:** changing the design while a force is on updates the motion and the readout immediately.

## 3. Wind

**Direction:** a steady wind blows across the view from left to right (+x in scene coordinates), so the sway is side-on to the default camera.

**Streaks:**
- About 40 thin white streaks drift across the scene at heights from near the ground to above the roof.
- Near the tower they bend around it.

**Eddies:**
- Swirling streaks in the tower's wake.
- Their size and speed scale with `windShapeFactor(design)`: big and strong behind a blunt square box, small behind a round, tapered, set-back or twisted tower.

**The sway:** the tower bends with the cantilever shape (§5). The top's displacement is the sum of two parts:
- a steady **lean** = `driftRatio × bodyHeight`;
- a back-and-forth **sway** at the tower's natural period `T` (from `analysis.seismic.periodS`), with amplitude `a / (2π / T)²`, where `a = accelMg × 9.81 / 1000` m/s². Because `accelMg` already includes the damping reduction, dampers visibly shrink this part.

**Scale:** both parts are shown **5× bigger** (was 50×; reduced 2026-10-24 at the user's request), and a label says so.

**Tuned mass damper:** with `damping = 'tmd'`:
- The top 3 floors are drawn see-through.
- The damper block inside swings the opposite way to the sway.

**Readout card** (bottom-left of the scene, in place of the soil key while a force is on):
- *Wind: 46 m/s — Chicago's design storm*
- *Top of tower leans 0.48 m and sways ±0.12 m (shown 50× bigger)*
- *People at the top feel 9 mg; the limit for homes is 15 mg ✅*. The limit is `comfortLimitMg`, named by the top floor's use.
- With dampers: *The tuned mass damper cuts the sway people feel by about 50%.* The figure is from `dampingReduction` for wind, `1 − 1/reduction`. Viscous dampers get their own sentence.

**Too much:**
- **Sway comfort** check marginal or failing:
  - the comfort line turns amber or red: *people at the top would feel seasick*;
  - the top 3 floors pulse red (fail only).
- **Wind strength** check failing:
  - a **Would fail in this wind** banner;
  - the lower third of the floors glow red;
  - the sway amplitude shown is doubled.
- Nothing collapses.

## 4. Earthquake

**Cycle:** one quake every **14 s** while the force is on:
- 2 s calm;
- 2 s building up;
- 5 s strong shaking;
- 3 s fading;
- 2 s pause.

The envelope `quakeEnvelope(t)` runs 0 → 1 → 0 over the cycle.

**Ground:**
- The whole diorama shakes sideways: the city block, neighbours, soil and foundation.
- The motion is a sum of three sine waves at about 1.1, 1.9 and 2.7 Hz, times the envelope.
- Display amplitude = `10 m × site.seismicHazard`: Tokyo (0.45 g) shakes ±4.5 m; Chicago (0.05 g) barely moves.
- Neighbouring buildings move with the ground as rigid blocks.

**His tower:**
- **Base:** the base follows the ground, scaled by the **base share**: 1 normally, **0.2 with base isolation**. A label says *the ground moves, the tower barely does*.
- **Bending:**
  - The tower bends with the cantilever shape at its own period `T` (`periodS`).
  - Amplitude = `ground amplitude × min(1.5, seismic.ratio) × 0.8`, times the envelope, lagging the ground by a quarter period.
  - Short, stiff towers rattle quickly; tall towers swing slowly. The readout says which.
- **Outcome**, from `seismic.outcome`:

| Outcome | Motion | Marks | Readout |
|---|---|---|---|
| operational | as above | none | *Would stay open for business* ✅ |
| damaged | amplitude × 1.5 | red crack lines flash on random floors while the envelope is above 0.6 | *Damaged — needs repairs before reopening* ⚠️ |
| fails | amplitude × 2 | lower third glows red; the tower leans 3° by the end of the strong shaking, and the lean resets during the pause | **Would fail in this earthquake** banner ❌ |

**Readout card:**
- *Tokyo's design earthquake: 0.45 g of ground shaking*
- *Your tower swings back and forth once every 4.5 s*, plus *— much slower than the quick jolts, so it rides them out* when `T` is at least 2 s, or *— close to the jolts' rhythm, so it gets shaken hard* when `T` is under 1 s.
- *The quake pushes it to 70% of what it can take*, from `seismic.ratio`.
- Lines for base isolation and dampers, only when chosen.
- *Motion shown much bigger.*

## 5. Bending and motion functions (pure, `src/sim/forces/`)

- `bendShape(y, height)`: the cantilever deflection shape `1.5·s² − 0.5·s³` with `s = clamp(y / height, 0, 1)`. It is 0 at the base and 1 at the top, and never decreases.
- `windMotion(site, design, analysis)` returns:

  ```ts
  { leanM, swayM, periodS, exaggeration: 50, eddyStrength, comfort: CheckStatus, strength: CheckStatus }
  ```

  The real metres are given before exaggeration.
- `quakeMotion(site, design, analysis)` returns:

  ```ts
  { groundM, periodS, responseM, baseShare, outcome, failLeanDeg }
  ```

- `quakeEnvelope(t)` and `groundOffset(t, groundM)`: the quake cycle and the ground's jolts.
- `windTop(motion, t)` and `quakeTop(motion, t)`: the top's display offset in metres at time `t`, exaggeration included.
- Readout wording lives in `src/sim/catalog/forces.ts`. `windReadout(...)` and `quakeReadout(...)` fill in the numbers.

## 6. Scene

- **A sway signal:** `ForcesView` advances a clock in `useFrame` and writes a small mutable **sway signal** each frame: `{ groundX, baseX, topX, topZ, height, lean }`. Nothing passes through React state.
- **Building:**
  - Takes an optional sway signal.
  - When present, it re-sets each floor's body and slab instance matrix every frame: `x = baseX + topX · bendShape(y)`, plus `lean` as a small rotation for a failing quake.
  - Crown and ornament parts follow through a new optional `bend` input on `PartsMesh`. Each part is offset by the bend at its own height.
  - With no signal, nothing changes.
- **Diorama:** the city block, neighbours and foundation sit in a group whose `x` is set to `groundX` each frame.
- **New pieces:**
  - `WindStreaks`: instanced thin boxes drifting and bending; eddies are instanced circles of streaks behind the tower.
  - `DamperGhost`: the see-through top 3 floors with the swinging block.
  - `DamageMarks`: instanced red floor bands and crack lines whose opacity pulses with the clock.
- **Cost:**
  - Per frame, at most one matrix per floor (body and slab) and one per crown or ornament part.
  - No geometry is rebuilt per frame.
  - With no force on, nothing runs.

## 7. Testing

- **Physics direction:**
  - dampers shrink `swayM` but not `leanM`;
  - twist, round plans and taper lower `eddyStrength`;
  - more floors lengthen `periodS`;
  - base isolation gives `baseShare` 0.2;
  - Tokyo's `groundM` is bigger than Chicago's;
  - `outcome` matches `analysis.seismic.outcome`;
  - the comfort and strength statuses match the analysis checks.
- **Shapes and timing:**
  - `bendShape` is 0 at the base, 1 at the top, never decreases, and is finite for every height;
  - `quakeEnvelope` is 0 when calm, 1 when strong, back to 0 in the pause, and periodic over 14 s;
  - the ground offset stays within `±groundM`.
- **Readouts:**
  - they quote the site's wind speed and hazard, the tower's lean, sway, felt sway, limit and period;
  - damper and isolation lines appear only when chosen;
  - failing designs get their banner text.
- **Store:**
  - only one force at a time;
  - a new project resets it;
  - it is not in the design history.
- **Scene** (test renderer):
  - with a fixed sway signal, the top floor's instance is offset more than the first floor's, and an ornament near the top moves more than one near the base;
  - wind and quake each render for every outcome without throwing;
  - with no force, the body matrices are unchanged.
- **UI:**
  - the buttons toggle with `aria-pressed` and are exclusive;
  - the readout appears and updates when the design changes;
  - the buttons are hidden while building.
- **Visual check** (headless screenshots, then the user's own look):
  - wind on a square tower vs a twisted round one;
  - a tuned mass damper swinging;
  - a quake in Tokyo with and without base isolation;
  - a damaged and a failing design;
  - Chicago's tiny quake.
