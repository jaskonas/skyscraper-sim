# Construction Animation — Design Spec (Plan 4)

Extends `2026-10-10-skyscraper-sim-design.md` (§3 step 3, §9 "Construction animation") and builds on `2026-10-10-architectural-detail-design.md` and `2026-10-11-detail-window-design.md`. Roadmap position: Plan 4 (§13 of the base spec).

## 1. Purpose

Pressing **Build it!** today jumps straight to the finished tower and its assessment. Plan 4 makes the Build phase **teach how a tower goes up**: the dig, the foundation, the core climbing ahead of the frame, the facade following behind, the crown going on, the lights coming on. That sequence is the lesson.

The bare structure is only visible during construction, so construction is also where the player sees **what his structural choices actually are**. A steel framed tube, a concrete buttressed core and a composite diagrid must look clearly different while they rise.

**What the user asked for:**
- The main goal is learning how towers go up.
- **Step by step:** each stage plays, then waits for the player to press **Next**.
- Each stage's card gives **the general idea plus his tower's numbers**.
- Props: a **climbing tower crane**, **trucks and an excavator**, and the **soil cutaway showing the dig**.
- The structure and materials are **tailored to each type**: steel looks different from concrete, a bundled tube different from the other systems, and so on.

**Assumptions (agreed):**
- The six stages come from `analysis.schedule`.
- The day and money counters come from the schedule and `analysis.cost`.
- **Skip to finished** is always available.
- The animation ends on today's finished tower and assessment.
- The design stays locked from Build onward.

**Out of scope:**
- Formwork and safety netting.
- Speed controls (1×/2×/4×) and pause; step-by-step pacing replaces them.
- Workers or people on site.
- Weather events.
- Changes to the analysis.
- The Structure overlay (Plan 5). It will reuse this plan's skeleton builder, but is not built here.

## 2. Flow

1. **Design.** Unchanged. **Build it!** calls `build()`.
2. **Building.**
   - `phase = 'building'`, `buildStage = 0` (the first of six).
   - The sidebar shows the **Construction card** in place of the gauges and design controls.
   - The 3D view shows `<ConstructionView>` in place of the normal `<Building>` and `<FoundationView>`.
   - The Close-up inset is hidden.
3. **A stage:**
   - It plays its animation over a fixed real time (§5).
   - **Next** is disabled while it plays and enabled once it finishes.
   - **Replay** restarts the current stage.
   - **Skip to finished** is enabled at all times.
4. **Next** on stage 6, or **Skip to finished**, sets `phase = 'complete'`. Everything after that is exactly as today: the finished tower, the assessment, and the Close-up inset back.
5. **New project** from the header works during building (no confirmation needed: the design is already locked).

The camera stays free to orbit. At the start of each stage it eases to that stage's framing (§5) over about 1 s. If the player orbits during the ease, the ease stops.

## 3. The skeleton: `structureParts(design)`

A pure builder in `src/scene/structure/` returns the whole bare structure in building coordinates, tagged so the animation can reveal it by height:

```ts
interface StructurePart {
  part: Part;
  role: 'core' | 'column' | 'beam' | 'slab' | 'brace' | 'outrigger' | 'wall' | 'damper';
  /** Height at which this part counts as built (its top), metres. */
  top: number;
}
```

### 3.1 Material sets the look

| Material | Columns and beams | Slabs | During construction |
|---|---|---|---|
| **Steel** | Slender, dark steel grey (`steel`), I-section proportions | Thin deck | Steel runs **4 floors ahead** of the poured slabs, so the top floors are an open cage. |
| **Concrete** | Chunky, pale (`concrete`), about twice the steel section | Thick | Columns and slabs rise together. The top slab shows darker, freshly poured concrete. |
| **Composite** | Concrete-coloured columns (concrete-filled), steel beams | Concrete | Slabs **2 floors** behind the beams. |

### 3.2 The system sets the arrangement

| System | Arrangement |
|---|---|
| **Rigid frame** | An even column grid across the whole floor at about 9 m, with beams on every floor on the grid lines and a small core. |
| **Framed tube** | Edge columns at about 3 m (a "tube" wall) with a deep spandrel beam on every floor, an open interior and a core. |
| **Core + outriggers** | A large concrete core and sparse edge columns at about 9 m. **Outrigger trusses** (deep diagonals from core to edge) and a **belt truss** round the outside, at about ⅓ and ⅔ of the height (one level below 30 floors). |
| **Bundled tube** | Tube walls of columns at about 3 m around the edge **and** along interior cell lines, dividing the floor into cells: 3×3 on square plans, 2×3 on rectangles, and lines cut to the plan on circles and triangles. |
| **Diagrid** | A diamond lattice of diagonals on the outside, each diamond spanning 6 floors, with **no vertical edge columns**, plus a core. |
| **Buttressed core** | A hexagonal central core with **three thick wing walls** reaching to the edge at 120°, the Burj Khalifa's "Y". |

**Core rule:**
- A concrete core climbs ahead of the frame for core + outriggers, buttressed core, diagrid and framed tube, and for any concrete or composite tower.
- A steel rigid frame or steel bundled tube instead gets a **braced steel core**: steel columns with X-bracing, rising with the frame.

### 3.3 Shape and extras

- **Shape:** every part follows the real floor slices (width, taper, setbacks, twist). Edge columns and tube lines sit on the plan's perimeter at each slice. Long runs are split where the floor plate changes (setbacks) or turns (twist).
- **Exposed structure:** the existing `bracingParts` X-braces are tagged `brace` and appear as the frame rises.
- **Damping:**
  - **Tuned mass damper:** a large block hung near the top, revealed in stage 5.
  - **Viscous dampers:** small diagonal struts in an accent colour, on every 5th floor, revealed with the frame.
- **Base isolation:** squat rubber isolator pads in a grid between the foundation and the ground floor.

**Speed:**
- Columns are long boxes spanning a run of floors, not one per floor.
- Slabs and beams use instanced parts.
- The worst case (150 floors, framed tube, round 80 m plate) builds in under 30 ms and stays under 8,000 parts.

## 4. Stages and state

### 4.1 `constructionStages(design, analysis)`

Six stages from `analysis.schedule.phases`, in order. Each carries:
- its start and end day;
- its cost, split from `analysis.cost`:
  - Excavation + Foundation: `foundation + isolation`;
  - Core and frame: `structure + elevators`, plus `damping` when viscous;
  - Facade: `facade`;
  - Crown and amenities: `amenities`, plus `damping` when tuned mass;
  - Interiors and opening: `interiors + systems`.

The excavation/foundation share is split by their day counts, and the stage costs sum exactly to `cost.total`.

### 4.2 `constructionState(design, analysis, stage, t)`

A pure function: given a stage (0–5) and progress `t` (0–1) through it, it says where everything stands:

```ts
interface ConstructionState {
  digDepth: number;            // metres below ground, 0 → full foundation depth
  foundation: number;          // 0..1 of the foundation built (shafts grow down, slab pours up)
  isolators: boolean;
  coreTop: number;             // metres
  frameTop: number;            // columns, beams, braces
  slabTop: number;             // poured floors (behind frameTop for steel and composite)
  facadeTop: number;           // the real tower is shown below this height
  crown: number;               // 0..1: crown, ornaments, amenities, tuned mass damper
  litFloors: number;           // floors whose night lights are on (stage 6)
  crane: { top: number; up: boolean };
  vehicles: VehicleId[];       // 'excavator' | 'dump-truck' | 'pile-rig' | 'mixer' | 'flatbed'
  day: number;
  spent: number;
}
```

**Rules:**
- Every height is non-decreasing across stages and within a stage.
- `coreTop ≥ frameTop ≥ slabTop ≥ facadeTop`.
- The core leads the frame by 3 floors (for systems with a concrete core).
- The facade starts once the frame is 8 floors up (`facadeLagFloors`) and stays 8 floors behind through stage 3.
- At the end of stage 6:
  - every height is the full tower and `crown = 1`;
  - `day = analysis.schedule.totalDays`;
  - `spent = analysis.cost.total`.
- Within a stage, `day` and `spent` advance linearly with `t`.

### 4.3 What each stage shows

| # | Stage | Animation | Props | Camera framing |
|---|---|---|---|---|
| 1 | **Excavation** | The hole deepens in the soil cutaway to the foundation's top depth. | Excavator digging; dump trucks coming and going | Low, close to the lot, cutaway in view |
| 2 | **Foundation** | **Piles:** many thin piles driven down, a few at a time. **Caissons:** fewer, fatter shafts drilled to their bearing layer. **Mat/raft:** the slab pours up in layers (raft thicker). Then isolator pads, if chosen. | Pile rig (piles and caissons); mixers (mat, raft, pads) | As stage 1 |
| 3 | **Core and frame** | The core climbs, the frame follows, slabs follow (steel/composite lag), and the facade starts 8 floors behind. The crane jumps up the core every 10 floors. | Climbing crane; flatbeds (steel/composite) or mixers (concrete) at the base | Follows the frame top, with the whole tower in view |
| 4 | **Facade** | The facade catches up to the top. | Crane; one flatbed | Whole tower |
| 5 | **Crown and amenities** | The crown, ornaments, amenities and tuned mass damper appear bottom to top, then the crane is taken down (it shrinks down the core and disappears). | Crane, then none | Top of the tower |
| 6 | **Interiors and opening** | Night-lit windows come on floor by floor (shown even by day as a warm glow), and the trucks drive away. | None at the end | Whole tower; ends at the normal framing |

**Crane:**
- A mast tied to the side of the core, a horizontal jib, a counter-jib with its counterweight, and a hook line.
- It sits 2 floors above `frameTop`, rounded up to the next 10-floor jump, so it climbs in visible jumps.
- The jib slowly slews back and forth while the crane is up.
- The slew is a scene-only animation, not part of `ConstructionState`.

## 5. Playback

- **Durations at real time:** excavation 6 s, foundation 8 s, core and frame 15 s, facade 8 s, crown 8 s, interiors 8 s. That is under a minute of motion for the whole tower, plus however long he reads.
- **Time runs in the render loop:**
  - Progress `t` lives on a mutable ref advanced in `useFrame`, outside React state (base spec §4).
  - React state changes only when a stage starts or finishes.
  - The counters on the card update about 10 times a second.
- **Hidden tab:** time does not advance while the tab is hidden, and a long frame gap is capped at 0.1 s.

## 6. `<ConstructionView>`

`src/scene/construction/ConstructionView.tsx`, shown during `building` in place of `<Building>` and `<FoundationView>`:

- **The real tower, cut off:**
  - `<Building>` is drawn with a clipping plane at `facadeTop`, so the finished facade appears from the bottom up.
  - Crown, ornament and amenity parts are hidden until stage 5, then shown by their own height against `crown`.
  - **First task of the plan:** prove that clipping works on the facade's custom shader (`FacadeMaterial`).
  - **Fallback if it doesn't:** pass a `maxFloor` to the body and draw whole floors only, which is cheap because the body is already built floor by floor.
- **The skeleton:** `structureParts(design)` drawn through `PartsMesh`. Each part is shown when its `top ≤` the matching height (`coreTop`, `frameTop` or `slabTop` by role). The parts shown are recomputed only when a height crosses a floor boundary, not every frame.
- **The ground:**
  - The foundation from `FoundationView`, grown by `foundation`.
  - A dark hole in the cutaway down to `digDepth`, filled by the foundation as it is poured.
- **Props:** `constructionProps(state, t)` returns the crane and vehicles as `Part[]`, drawn through `PartsMesh`. Vehicles drive in and out along a fixed path from the street edge of the lot.
- **Night:** the day/night toggle keeps working. The skeleton and props use ordinary materials, and the lit floors in stage 6 use the existing night-window colours.

## 7. Captions: `stageCaption(design, site, analysis, stage)`

A pure function in `src/sim/construction/` returns `{ title, idea, yours }`:

- **`idea`:** the general explanation of the stage, the same for every tower. For example: *"The core goes up first. It's the tower's spine and holds the elevators and stairs. The frame follows, and the outside wall starts a few floors below the top."*
- **`yours`:** his tower's numbers and choices, with one sentence for every system, material, foundation, damping and isolation option. For example:
  - *"Your steel frame goes up about 3 days a floor: 45 floors in 135 days."*
  - *"The outrigger trusses at floors 15 and 30 tie the core to the outside columns so it sways less."*
  - *"Your caissons go 35 m down through soft blue clay to bedrock."*
  - *"Base isolation: 24 rubber pads let the ground shake under the tower instead of through it."*
- All wording lives in the catalog (`src/sim/catalog/construction.ts`), so new options need only a catalog entry.
- Numbers come from the analysis, the schedule and the site's soil layers. No new physics.

## 8. State and UI

**Store** (`src/state/store.ts`):
- New state: `buildStage: number` (0–5, shown to the player as stages 1–6), `stageDone: boolean`.
- `build()` sets `phase = 'building'`, `buildStage = 0`, `stageDone = false`. It no longer goes straight to `complete`.
- `finishStage()`: called by the scene when `t` reaches 1; sets `stageDone = true`.
- `nextStage()`: allowed only when `stageDone`. It advances the stage, or on the last stage (index 5) sets `phase = 'complete'`.
- `replayStage()` and `skipBuild()`; `skipBuild()` sets `phase = 'complete'`.
- Design actions, undo and redo stay refused outside `design`, as now.

**Construction card** (`src/ui/sidebar/ConstructionCard.tsx`), in place of the gauges and controls during `building`:
- Header: `Stage 3 of 6 · Core and frame`, with a 6-step progress strip.
- Counters: `Day 214 of 655`, and `$58M of $163M spent` with a thin bar.
- The card's `idea` and `yours` text.
- Buttons: **Next ▶** (disabled until the stage finishes, and labelled **Open the building** on stage 6), **Replay**, and **Skip to finished**.
- The header's phase label reads `Building`.
- `BuildBar` is shown only in `design`, as now.

**Close-up inset:** not rendered during `building`.

## 9. Testing

- **Skeleton:**
  - Every system × material × plan shape × the two extreme towers (5 floors; 150 floors with 0.6 taper, 120° twist, wedding-cake setbacks, 15 m plate) is finite and inside the tower's bounds plus 2 m.
  - Each system's signature is pinned:
    - rigid frame: interior columns present;
    - framed tube: edge column spacing ≤ 3.5 m and no interior columns;
    - bundled tube: interior tube lines present;
    - diagrid: diagonals present and no vertical edge columns;
    - core + outriggers: outrigger parts at about ⅓ and ⅔ of the height;
    - buttressed core: three wing walls.
  - The material changes part materials and sizes (steel columns slimmer than concrete).
  - Steel rigid frame and steel bundled tube get a braced steel core; the others get a concrete core.
  - Tuned mass damper, viscous dampers, isolators and exposed bracing appear only when chosen.
- **State:**
  - Heights never decrease over stages × `t`.
  - `coreTop ≥ frameTop ≥ slabTop ≥ facadeTop`.
  - The facade lags 8 floors during stage 3.
  - The end state is the full tower, with `day = totalDays` and `spent = cost.total`.
  - Stage costs sum to `cost.total`.
  - The crane climbs in 10-floor jumps and is down by the end of stage 5.
- **Captions:** every system, material, foundation, damping and isolation option has wording, and a stage card mentions the design's floors, days and foundation depth.
- **Store:**
  - `build` enters `building` at stage 0.
  - `nextStage` is refused until `stageDone`, then advances; after stage 6 the phase is `complete`.
  - `skipBuild` completes from any stage.
  - Undo and design actions are refused while building.
- **UI:**
  - The card shows the stage, counters and text.
  - Next is disabled until the stage finishes.
  - Skip works.
  - The Close-up inset is hidden while building and back when complete.
- **Scene:** `<ConstructionView>` renders every stage at `t = 0, 0.5, 1` without throwing (test renderer).
- **Speed:** the worst-case `structureParts` runs in under 30 ms.
- **Visual check:** headless screenshots of all 6 systems × 3 materials in the middle of stage 3, every stage of one tower by day and night, and each foundation type in stage 2; then the user's own look.
