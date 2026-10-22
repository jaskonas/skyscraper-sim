# Plan 10 — Close-Range 3D Walls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** As the camera comes close, the stretches of wall nearest it become true 3D wall bays: frames that stand proud, glass set back, sills and mullion caps. They are built from the Close-up's `wallBay`, on every plan shape including round, tapered and twisted towers. Far walls keep the shader facade.

**Architecture:**
- **Chunks:** the tower's walls are split into *chunks* of 4 floors × 6 bays on the facade shader's own grid. The grid is the bay cell index along each wall, measured from its middle, or, on a round drum, the arc-bay index from the seam.
- **Choosing chunks:** every few frames a pure selector picks the chunks near the camera. It enters at 110 m and leaves at 130 m (hysteresis), within a 3,000-part budget.
- **Drawing:** a pure builder turns each chunk into parts, which one `PartsMesh` draws, moving with the sway.
- **Cutting the shader facade:** the facade shader discards its pixels inside the active chunks (uniform arrays, at most 8), so the 3D bays replace the painted wall rather than fight it.
- **Matching:** windows, blinds, dark panes, night lights and mechanical floors use the same hashes as the shader.

**Tech Stack:** React 19, three 0.186, @react-three/fiber 9, Vitest 5.

**Spec:** `docs/superpowers/specs/2026-10-20-surface-detail-design.md` §5 (and §2, §8).

## Global Constraints

- No new dependencies.
- **Never push or merge to `master` without the user's explicit word.**
- **Budgets:**
  - at most **3,000** chunk parts at once;
  - at most **8** chunks;
  - building one chunk takes **< 8 ms** (fastest of 5 runs);
  - selection runs at most every 10 frames.
- **Only on Detail: High,** and not while the tower is under construction.
- **Every plan shape:** square, rectangle, triangle and round (bent to the drum), plus taper, twist and setbacks.
- **A chunk only covers bay cells that are whole on every floor it spans.** The shader discards exactly those cells, so no hole ever shows.
- Mechanical (louvre) floors stay on the shader facade.

## Review Focus

1. **Orbiting fast or zooming through the 110–130 m band:** chunks don't thrash on and off, and the selection cost stays small. Test in Task 2 (hysteresis).
2. **A tapered or set-back tower:** no wall-coloured holes where a chunk's cells don't fit an upper floor. Test in Task 2 (cells fit every floor of the chunk).
3. **Night:** a lit window is lit in 3D exactly when it is lit in the shader. Test in Task 3 (lit flags equal `windowLit` on the shader bay).
4. **Sway (wind or quake):** chunks move with their floors. Test in Task 5 (chunk instances offset by `swayAt`).
5. **Detail: Simple, or construction:** no chunks and no discard. Test in Task 5.

---

### Task 1: Part details the chunks need

**Files:**
- Modify: `src/sim/parts.ts` (`glowColor?: string` on `Part`; a new material `'blind'`), `src/scene/parts/materials.ts` (`blind` is `#dcd9cf`, roughness 0.8), `src/scene/parts/PartsMesh.tsx` (the group key includes `glowColor`; emissive uses `sample.glowColor ?? glowColor(...)`)
- Test: `src/scene/parts/PartsMesh.test.tsx` (or the nearest existing parts test)

**Interfaces:**
- Produces:
  - `Part.glowColor?: string`, the colour a glowing part gives off at night, overriding the material's;
  - `PartMaterial` adds `'blind'`.

- [ ] **Step 1: Write the failing test.** "a glowing part can glow in its own colour": render a `PartsMesh` at night with two glowing glass boxes, one with `glowColor: '#dfe8ff'` and one with `'#ffcf7a'`. That gives two instanced meshes whose `emissive` hex values are those colours.
- [ ] **Step 2: Run the test to check it fails.**
  - Run: `npx vitest run src/scene/parts`
  - Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests to check they pass.**
  - Run: `npx vitest run src/scene src/sim`
  - Expected: PASS.
- [ ] **Step 5: Commit** `feat: parts can glow in their own colour; a blind material`

### Task 2: Chunks and choosing them

**Files:**
- Create: `src/scene/closeWalls/chunks.ts`
- Test: `src/scene/closeWalls/chunks.test.ts`

**Interfaces:**
- Produces:
  - **Constants:** `CHUNK_FLOORS = 4`, `CHUNK_BAYS = 6`, `ENTER_M = 110`, `LEAVE_M = 130`, `MAX_CHUNKS = 8`, `MAX_CHUNK_PARTS = 3000`.
  - `interface Chunk { key: string; floor0: number; floor1: number; face: number; cell0: number; cell1: number; centre: Vec3; normal: [number, number] | null; radius: number }`
    - floors are half-open `[floor0, floor1)`; cells are `[cell0, cell1)`;
    - `face` indexes `planFaces`, and is 0 on a round plan;
    - `normal` is the world xz normal at the middle floor, or `null` on a round plan;
    - `centre` and `radius` are in building coordinates, for distance.
  - `towerChunks(design: Design): Chunk[]`: every chunk, cached per design object.
  - `chunkCells(design, slice, face): [number, number]`: the whole cells on one floor's wall. Flat walls give `[-k, k)` with `k = floor(length / 2 / bay)`. Round gives `[0, floor(2πr / bay))`.
  - `nearChunks(design: Design, camera: Vec3, previous: ReadonlySet<string>, partsPerChunk: (c: Chunk) => number): Chunk[]`
    - `camera` is in building coordinates;
    - nearest first;
    - only chunks facing the camera (`dot(camera − centre, normal) > 0`; on a round plan, the arc's outward direction);
    - distance is `max(0, |camera − centre| − radius)`;
    - a chunk enters at < 110 m, and one already in `previous` stays while < 130 m;
    - stops at 8 chunks or 3,000 parts.

- [ ] **Step 1: Write the failing tests**
  - **"covers each wall with whole cells only, on every floor of the chunk"**: for a tapered square tower (taper 0.4, 60 floors) and a wedding-cake Art Deco tower, every chunk's cell range sits within `chunkCells` of every floor in `[floor0, floor1)`.
  - **"picks the walls in front of a close camera and none behind"**:
    - square 40-floor tower, camera at `[0, 82, depth/2 + 20]`;
    - result is non-empty;
    - every chunk has `normal[1] > 0.9` (+z face);
    - floors near 20 are included;
    - none has `normal[1] < 0`.
  - **"nothing from far away"**: the camera at `[0, 80, 400]` gives `[]`.
  - **"keeps a chunk it already shows until 130 m, but only takes new ones inside 110 m"**:
    - find a chunk at about 120 m;
    - with `previous` empty it is excluded;
    - with `previous` containing its key it is included.
  - **"stays within 8 chunks and 3,000 parts"**: with `partsPerChunk = () => 700`, at most 4 chunks; with `() => 1`, at most 8.
  - **"round towers chunk along the drum"**:
    - round 40-floor tower, camera in front of +z;
    - chunks have `normal === null`;
    - their cells are within `[0, floor(πD / bay))`;
    - their centres are on the camera's side.
  - **"is quick"**: `nearChunks` on a 150-floor rectangle takes under 3 ms (`fastestMs(5)`).
- [ ] **Step 2: Run the tests to check they fail.**
  - Run: `npx vitest run src/scene/closeWalls/chunks.test.ts`
  - Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Chunks are grouped by `floor(index / 4)`, skipping groups that are all mechanical floors.
  - Cells per group are the intersection over its floors, then split at multiples of 6 (`floor(cell / 6)`).
  - The centre is the middle cell's anchor on the middle floor (`worldAnchor`), plus half a floor of height.
  - The radius is half the diagonal of `(cells × bay, floors × FLOOR_HEIGHT)`.
- [ ] **Step 4: Run the tests to check they pass.**
  - Run: `npx vitest run src/scene/closeWalls`
  - Expected: PASS.
- [ ] **Step 5: Commit** `feat: wall chunks on the facade grid, and choosing the ones near the camera`

### Task 3: Building a chunk

**Files:**
- Create: `src/scene/closeWalls/chunkParts.ts`
- Test: `src/scene/closeWalls/chunkParts.test.ts`

**Interfaces:**
- Consumes: `Chunk`, `towerChunks`, `wallBay`, `worldAnchor`, `placeAtAnchor`, `alongFace`, `planFaces`, `roomBlinds`, `roomDark`, `windowLit`, `NIGHT_LIGHTS`, `floorUses`, `isMechanicalFloor`.
- Produces:
  - `chunkParts(design: Design, chunk: Chunk): Part[]`, in building coordinates;
  - `chunkLook(design): { palette: Palette; surfaces: Surfaces }`:
    - `palette.body = facadeRecipe(design).colors.wall`, `palette.accent = colors.frame`;
    - `surfaces = { wall: facadeWall(design), trim: surfacesFor(design).trim }`.

- [ ] **Step 1: Write the failing tests**
  - **"builds every non-plant floor's cells as 3D bays, without the slab band"**: for a square Chicago tower chunk, the parts include `glass` panes, and their count equals floors × cells × panes per bay. No part has `material === 'accent'` with height `FLOOR_HEIGHT − TILE_HEIGHT_M` (the slab band is the tower's own).
  - **"lights the same windows as the shader"**: for each pane, its `glow` matches `windowLit(cell, floor, NIGHT_LIGHTS[use].lit)`, and lit panes carry `glowColor === NIGHT_LIGHTS[use].color`. On a round tower, `cell` is the arc-bay index.
  - **"blinds and dark panes match too"**:
    - a pane on a `roomDark` window is `'interior'`;
    - a window with `roomBlinds > 0` has a `'blind'` box whose height is `blinds × pane height`, at the top of the pane.
  - **"sits on the wall it replaces"**: on the +z face of a 30 m square, every part's centre has z within [14.4, 15.3]. On a twisted tower, every part lies within 1 m of its floor's rotated wall plane.
  - **"bends to the drum"**: on a round tower of radius 15, every part's centre is within [14.3, 15.4] m of the axis, and no part is wider than `bay / 2 + 0.01`.
  - **"adds sills under punched windows and caps on glass grids"**:
    - Chicago: one `accent` box per window opening just below it, protruding (centre z beyond the wall face);
    - flush-grid: vertical `accent` caps at the bay edges.
  - **"is quick"**: one chunk takes < 8 ms (`fastestMs(5)`).
- [ ] **Step 2: Run the tests to check they fail.**
  - Run: `npx vitest run src/scene/closeWalls/chunkParts.test.ts`
  - Expected: FAIL.
- [ ] **Step 3: Implement**
  - **For each floor** in `[floor0, floor1)` that is not a mechanical floor, and each cell:
    - flat walls: `s = (cell + 0.5) × bay` along face `chunk.face`;
    - round: `alongFace` with face 0 and `s = (cell + 0.5) × bay`.
  - **Build** `wallBay(recipe, bay, 'body')` and drop its first part (the slab band).
  - **Panes:**
    - an unlit pane is `'glass'`;
    - a lit pane is `{ ...pane, glow: true, glowColor }`;
    - a dark pane is `'interior'`;
    - blinds are a `'blind'` box at `z = −GLASS_RECESS + 0.04`.
  - **Extras:**
    - when `!pattern.glassWall`, a sill `[w + 0.12, 0.07, 0.16]` at the opening's foot, `z = 0.05`;
    - when `pattern.glassWall`, caps `[0.07, TILE_HEIGHT_M, 0.12]` at the bay edges, `z = 0.06`.
  - **Round:** split boxes wider than `bay / 2` into two halves, then place each part by its own centre along the arc: anchor at `s + x`, local `x = 0`.
- [ ] **Step 4: Run the tests to check they pass.**
  - Run: `npx vitest run src/scene/closeWalls`
  - Expected: PASS.
- [ ] **Step 5: Commit** `feat: build wall chunks as true 3D bays matching the shader facade`

### Task 4: The facade gives way to the chunks

**Files:**
- Modify: `src/scene/FacadeMaterial.ts`
- Test: `src/scene/FacadeMaterial.test.ts`

**Interfaces:**
- Produces:
  - **Uniforms:**
    - `uChunkCells: { value: THREE.Vector4[] }`, 8 entries of (floor0, floor1, cell0, cell1);
    - `uChunkFace: { value: THREE.Vector4[] }`, 8 entries of (nx, nz, round 1/0, active 1/0).
  - `setFacadeChunks(material, chunks: Chunk[]): void`, which fills the uniforms and marks the rest inactive.
  - Cache key `'facade-v6'`.

- [ ] **Step 1: Write the failing test.** "cuts holes exactly where the 3D chunks are":
  - the fragment contains `uChunkCells` and `discard`;
  - `setFacadeChunks(m, [chunk])` sets entry 0 to the chunk's values with active 1, and entry 1 to active 0;
  - setting 9 chunks keeps 8.
- [ ] **Step 2: Run the test to check it fails.**
  - Run: `npx vitest run src/scene/FacadeMaterial.test.ts`
  - Expected: FAIL.
- [ ] **Step 3: Implement**
  - The test applies only when `uDetail > 0.5`, on walls (`abs(N.y) < 0.5`), and when `vMech < 0.5`.
  - **For each active chunk:** discard when `floorIndex ∈ [f0, f1)`, `floor(vFacadeUv.x) ∈ [c0, c1)`, and either round or `dot(normalize(vFacadeNormal.xz), n) > 0.95`.
  - **Where `floorIndex` comes from:** move its computation above the existing detail block, or recompute it.
- [ ] **Step 4: Run the tests to check they pass.**
  - Run: `npx vitest run src/scene`
  - Expected: PASS.
- [ ] **Step 5: Commit** `feat: the facade shader steps aside where 3D wall chunks stand`

### Task 5: Close walls in the scene

**Files:**
- Create: `src/scene/closeWalls/CloseWalls.tsx`
- Modify: `src/scene/Building.tsx` (creates a `ChunkSignal`; `Body` copies it into the facade uniforms; mounts `CloseWalls` when `facadeDetail && !reveal`)
- Test: `src/scene/closeWalls/CloseWalls.test.tsx`

**Interfaces:**
- Produces:
  - `interface ChunkSignal { chunks: Chunk[]; version: number }`
  - `createChunkSignal(): ChunkSignal`
  - `<CloseWalls design site signal sway night />`:
    - every 10 frames it converts the camera to building coordinates (minus the lot centre), calls `nearChunks`, and caches `chunkParts` per chunk key (cleared when `design` changes);
    - when the set changes, it updates `signal` and state;
    - it renders `<PartsMesh name="close-walls" parts={…} {...chunkLook(design)} plan night sway />`.

- [ ] **Step 1: Write the failing tests** (test renderer, with the camera set via `r.scene` default camera `position.set`):
  - **"builds the walls in front of a close camera"**:
    - Chicago, 40 floors;
    - camera 20 m in front of the +z face at floor 20 (world coordinates include `lotCenter`);
    - after 12 frames, a `close-walls` group with instanced meshes summing to > 100 instances, and `signal.chunks.length > 0`.
  - **"nothing from far away"**: the camera 600 m out gives zero instances.
  - **"Detail: Simple or construction: none"**: `<Building facadeDetail={false}>` and `<Building reveal={…}>` have no `close-walls` group.
  - **"chunks sway with the tower"**: with an active sway signal, a chunk instance's x is offset by `swayAt(sway, y)`.
- [ ] **Step 2: Run the tests to check they fail.**
  - Run: `npx vitest run src/scene/closeWalls/CloseWalls.test.tsx`
  - Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests to check they pass.**
  - Run: `npx vitest run src/scene`
  - Expected: PASS.
- [ ] **Step 5: Commit** `feat: walls near the camera become true 3D bays`

### Task 6: Docs and the visual check

- [ ] **Step 1: README.** One paragraph on close-range 3D walls.
- [ ] **Step 2: Full suite.**
  - Run: `npx vitest run && npx tsc -b && npx vite build`
  - Expected: PASS.
- [ ] **Step 3: Visual check (CDP).**
  - Shots: each of the 8 styles at 15 m and 60 m from a wall, round Neo-futurist close up, a twisted square tower, a wedding-cake setback, night, and wind sway.
  - Expected:
    - recesses, frames and sills in 3D;
    - no holes or doubled walls at chunk edges;
    - windows, blinds and lights continue across chunk edges;
    - zero console errors.
- [ ] **Step 4: Commit** `docs: close-range 3D walls`
