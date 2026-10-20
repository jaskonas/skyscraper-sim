# Plan 8 — Light and Shadow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The sun casts real shadows, with contact darkening in corners, and an on/off toggle. Plan 6's fake rooms behind the glass are removed.

**Architecture:**
- **One directional sun light casts a single shadow map.** Each frame, its shadow camera is re-fitted around the orbit target, sized by the camera's distance, so near shadows are crisp and far ones are still present. Every opaque mesh casts and receives; see-through ones don't cast.
- **Contact darkening is faked cheaply:**
  - soft dark patches on the ground under the tower and each neighbour (one instanced, multiply-blended plane);
  - darkening on the glass next to the window reveals in the facade shader.
- **A view setting `shadows`** sits in the store like `facadeDetail`. Detail: Simple forces shadows off.

**Tech Stack:** React 19, three 0.186, @react-three/fiber 9, Zustand 5, Vitest 5 + Testing Library + @react-three/test-renderer.

**Spec:** `docs/superpowers/specs/2026-10-20-surface-detail-design.md` (§3, §8).

## Global Constraints

- No new dependencies.
- **Never push or merge to `master` without the user's explicit word.** `master` deploys the live site.
- View settings are never part of the design, its history or the export.
- **Night:** sun shadows are off.
- Detail: Simple turns shadows off and greys out the button; going back to High restores the previous shadow choice.
- **Speed is gated by budgets, not headless fps** (§8):
  - the shadow map is at most 2048²;
  - with shadows off, no shadow pass runs (`castShadow` is false on the light).
- **Low-end target:** an Intel UHD 600-class or ARM Mali GPU, WebGL2. Use `THREE.PCFShadowMap`, not the soft variant.

## Review Focus

1. **Toggling shadows while the tower sways or is under construction:** no errors, and the swaying parts' shadows move with them. Instanced meshes keep `frustumCulled = false` while swaying, so they still cast. Test in Task 4.
2. **A 150-floor tower seen from far out:** the whole tower and its ground shadow sit inside the shadow camera. Test in Task 3 (`shadowFrame` at max orbit distance covers the diorama).
3. **Night:** no shadow pass, and the light is not casting. Test in Task 3.
4. **Simple then High:** the shadow choice comes back unchanged. Test in Task 2.
5. **Shadow acne (stripes) on the big flat facade faces:** bias values in Task 3, checked visually in Task 7.

---

### Task 1: Glass without rooms

**Files:**
- Modify: `src/scene/facadeDetail.ts`, `src/scene/nightWindows.ts`, `src/scene/FacadeMaterial.ts`
- Test: `src/scene/facadeDetail.test.ts`, `src/scene/nightWindows.test.ts`, `src/scene/FacadeMaterial.test.ts`

**Interfaces:**
- Produces:
  - `nightWindowAttributes(design)` returns `{ floor, lit, color, mech }`; `room` is removed.
  - `ROOM_TINT` is removed.
  - `roomBlinds`, `roomDark`, `paneTint` and `detailHash` stay, along with their GLSL twins.
  - The shader cache key becomes `'facade-v4'`.

- [ ] **Step 1: Update the tests**
  - In `facadeDetail.test.ts`:
    - delete the "gives each use its own room colour" test and the "gives every floor its room colour" test;
    - keep the rest.
  - In `FacadeMaterial.test.ts`:
    - replace the rooms test with "recessed glass, sky reflections and louvred plant floors, without rooms";
    - it asserts that `shader.vertexShader` does not contain `aRoomTint`;
    - that `shader.fragmentShader` does not contain `facadeRoom(` or `ROOM_DEPTH`;
    - that it still contains `roomBlinds(`, `paneTint(`, `GLASS_RECESS` and `facadeReveal`;
    - and that `material.customProgramCacheKey()` is `'facade-v4'`.
  - Add a test in `nightWindows.test.ts` asserting that `'room' in nightWindowAttributes(design)` is false.

- [ ] **Step 2: Run the tests to check they fail**
  - Run: `npx vitest run src/scene/facadeDetail.test.ts src/scene/FacadeMaterial.test.ts src/scene/nightWindows.test.ts`
  - Expected: the FacadeMaterial and nightWindows tests fail.

- [ ] **Step 3: Implement**
  - Remove `ROOM_TINT`, the `room` array, the `aRoomTint`/`vRoomTint` attribute and varying, `ROOM_DEPTH`, `ROOM_DAYLIGHT` and `facadeRoom`. In `Building.tsx`, stop setting the `aRoomTint` attribute.
  - **Glass, when the recess lookup lands on glass:**
    - `diffuseColor.rgb = mix(GLASS_INTERIOR, diffuseColor.rgb, 0.45) * (1.0 + paneTint(bay, floorIndex))`, with `const vec3 GLASS_INTERIOR = vec3(0.10, 0.12, 0.15);`
    - **Blinds:** when `fract(vFacadeUv.y) > 1.0 - roomBlinds(...)`, use `vec3(0.86, 0.85, 0.8) * (0.85 + 0.15 * stripes(...))`. Set `facadeGlowShade = 0.8` for blinds and `1.0` otherwise. `facadeGlowShade` replaces `facadeRoomShade` in the night glow.
    - **Dark panes:** multiply by `0.4` where `roomDark(...)`.
    - **Fresnel, mirror, sky and glint:** unchanged.
  - **`facadeReveal`:** a new GLSL function `float facadeReveal(vec2 uv, vec2 shift)`.
    - It returns 0..1, the share of 4 extra glass-mask lookups that land on wall.
    - The lookups are at `uv + shift * 1.8` and at `uv` ± `0.25 m / uTileSize` in x and in y.
    - Glass is multiplied by `1.0 - 0.45 * facadeReveal(...)`. This is the contact darkening next to the frame.
  - The night glow multiplies by `mix(1.0, facadeGlowShade, uDetail)`.

- [ ] **Step 4: Run the tests to check they pass**
  - Run: `npx vitest run src/scene`
  - Expected: PASS.

- [ ] **Step 5: Commit** `refactor: glass shows reflections, tint and blinds instead of rooms; frames darken the glass beside them`

### Task 2: The shadow setting and its button

**Files:**
- Modify: `src/state/store.ts`, `src/scene/Scene.tsx`, `src/ui/FacadeDetailToggle.tsx` (its title text no longer mentions rooms)
- Create: `src/ui/ShadowToggle.tsx`
- Test: `src/ui/ShadowToggle.test.tsx`

**Interfaces:**
- Produces:
  - In the store, `shadows: boolean` (default `true`) and `setShadows(on: boolean)`.
  - `selectShadowsOn(s: GameState): boolean`, which is `s.shadows && s.facadeDetail === 'high' && s.timeOfDay === 'day'`.
  - `<ShadowToggle />`.

- [ ] **Step 1: Write the failing tests** in `ShadowToggle.test.tsx`:
  - **"starts on, and turns off and back on"**: the button's name matches `/Shadows: On/` with `aria-pressed="true"`. After a click, `state.shadows` is false and the name matches `/Shadows: Off/`.
  - **"is a view setting: kept for a new project, never in the design history"**: same shape as the `FacadeDetailToggle` test.
  - **"Detail: Simple turns shadows off and greys the button; High brings the choice back"**: `setFacadeDetail('simple')` makes the button disabled and `selectShadowsOn` false, while `state.shadows` stays `true`. `setFacadeDetail('high')` makes `selectShadowsOn` true again.
  - **"no sun shadows at night"**: `setTimeOfDay('night')` makes `selectShadowsOn` false.

- [ ] **Step 2: Run the tests to check they fail**
  - Run: `npx vitest run src/ui/ShadowToggle.test.tsx`
  - Expected: FAIL (the module is not found).

- [ ] **Step 3: Implement**
  - Add the store field and setter. `newProject` does not reset it.
  - **`ShadowToggle`:**
    - label `☀️ Shadows: On` / `☀️ Shadows: Off`;
    - `aria-pressed={shadows}`;
    - `disabled` when `facadeDetail === 'simple'`;
    - title "Sun shadows. Off is faster on slow computers." When disabled, the title is "Shadows need Detail: High."
  - Mount it after `<FacadeDetailToggle />` in `Scene.tsx`.

- [ ] **Step 4: Run the tests to check they pass**
  - Run: `npx vitest run src/ui src/state`
  - Expected: PASS.

- [ ] **Step 5: Commit** `feat: shadows view setting and toggle (off with Detail: Simple and at night)`

### Task 3: The sun light and its fitted shadow camera

**Files:**
- Create: `src/scene/sunShadow.ts`, `src/scene/SunLight.tsx`
- Modify: `src/scene/lighting.ts`, `src/scene/Scene.tsx` (replace the plain `directionalLight` and set `<Canvas shadows={{ type: THREE.PCFShadowMap }}>`)
- Test: `src/scene/sunShadow.test.ts`, `src/scene/SunLight.test.tsx`

**Interfaces:**
- Produces:
  - `SUN_DIRECTION: [number, number, number]` moves here from `Building.tsx` (`[300, 600, 250]`). Re-export it from `Building.tsx` if it is imported elsewhere.
  - `SHADOW_MAP_SIZE = 2048`.
  - `shadowFrame(target: [number, number, number], cameraDistance: number): { position: [number, number, number]; target: [number, number, number]; halfSize: number; near: number; far: number }`
  - `<SunLight on: boolean; intensity: number; color: string />`
  - `lighting(site, night, shadows = false)`. With shadows on by day, `hemi` is 1.15 rather than 0.9, so shadowed faces stay readable. Every other value is unchanged.

- [ ] **Step 1: Write the failing tests** in `sunShadow.test.ts`:
  - **"sits on the sun's side of the target, far enough to see the whole tower"**:
    - `position − target` is parallel to `SUN_DIRECTION` (normalised dot > 0.999);
    - its length is `SUN_DISTANCE` (1500);
    - `far − near ≥ 2 × 1500 − 1`.
  - **"is tight up close and wide far out"**:
    - `halfSize` is 30 at distance 20, 30 at distance 40, 300 at distance 400, and 600 at distance 2500;
    - that is, `clamp(0.75 × d, 30, 600)`.
  - **"covers the diorama from the furthest orbit"**: `shadowFrame([0,0,0], 2500).halfSize ≥ hypot(DIORAMA.width, DIORAMA.depth) / 2`.

- [ ] **Step 2: Write the failing tests** in `SunLight.test.tsx` (test renderer):
  - With `on`:
    - the `directionalLight` has `castShadow` true;
    - `shadow.mapSize.x` is 2048;
    - `shadow.camera` is orthographic with `right === halfSize` after one frame.
  - With `on={false}`, `castShadow` is false.

- [ ] **Step 3: Run the tests to check they fail**
  - Run: `npx vitest run src/scene/sunShadow.test.ts src/scene/SunLight.test.tsx`
  - Expected: FAIL.

- [ ] **Step 4: Implement**
  - **`SunLight`** keeps a `directionalLight` with a `target` object added to the scene. In `useFrame`, it reads the default controls' `target` (or `[0,0,0]`) and the camera's distance to it, applies `shadowFrame`, and sets the shadow camera's left/right/top/bottom/near/far, then `updateProjectionMatrix()`.
  - **Snap to texels:** snap the target to a multiple of `2 × halfSize / SHADOW_MAP_SIZE` along the light's right and up axes, so shadows don't shimmer while orbiting.
  - **Bias:** `shadow.bias = -0.0005` and `shadow.normalBias = 0.6 × (2 × halfSize / SHADOW_MAP_SIZE)`, updated with the frame.
  - **`Scene.tsx`:** `const shadowsOn = useGame(selectShadowsOn)`, then `lighting(site, night, shadowsOn)` and `<SunLight on={shadowsOn} …>`.

- [ ] **Step 5: Run the tests to check they pass**
  - Run: `npx vitest run src/scene`
  - Expected: PASS.

- [ ] **Step 6: Commit** `feat: the sun casts a shadow map fitted around what the camera is looking at`

### Task 4: Everything solid casts and receives

**Files:**
- Modify:
  - `src/scene/Building.tsx`: body, slabs, amenity meshes and box instances;
  - `src/scene/parts/PartsMesh.tsx`;
  - `src/scene/Neighbors.tsx`;
  - `src/scene/SiteDiorama.tsx`: ground and lot receive only; the soil bands neither cast nor receive;
  - `src/scene/Landmark.tsx`;
  - `src/scene/construction/*.tsx`: any direct meshes.
- Test: `src/scene/Building.test.tsx`, `src/scene/Scene.test.ts` (or a new `src/scene/shadowFlags.test.tsx`)

**Interfaces:**
- Produces: `shadowFlags(material: { transparent?: boolean; opacity?: number }): { castShadow: boolean; receiveShadow: boolean }` in `src/scene/sunShadow.ts`. Opaque gives both true; see-through (`transparent` with `opacity < 1`) gives cast false and receive true.

- [ ] **Step 1: Write the failing tests**
  - **"every opaque mesh of a tower casts and receives; see-through ones only receive"**:
    - render `<Building>` for a Chicago design with balconies, a helipad and dressing;
    - traverse the scene;
    - for every Mesh or InstancedMesh, assert `castShadow === !(material.transparent && material.opacity < 1)` and `receiveShadow === true`.
  - **"neighbours cast and receive; the ground receives"**: the same check on `<Neighbors>` and `<SiteDiorama>`. On SiteDiorama the soil bands have both flags false.
  - **"a swaying tower keeps casting"**:
    - render with an active sway signal and advance one frame;
    - every parts mesh has `frustumCulled === false` and `castShadow === true`.

- [ ] **Step 2: Run the tests to check they fail**
  - Run: `npx vitest run src/scene/Building.test.tsx`
  - Expected: FAIL.

- [ ] **Step 3: Implement:** spread `{...shadowFlags(material)}` (or set the flags directly) on each mesh listed above. For the transparent parts groups in `PartsMesh`, base the flags on the material look.

- [ ] **Step 4: Run the tests to check they pass**
  - Run: `npx vitest run src/scene`
  - Expected: PASS.

- [ ] **Step 5: Commit** `feat: tower, parts, neighbours and landmark cast and receive shadows`

### Task 5: Contact darkening on the ground

**Files:**
- Create: `src/scene/ContactShade.tsx`
- Modify: `src/scene/sunShadow.ts` (adds `contactPatches`), `src/scene/Scene.tsx`
- Test: `src/scene/sunShadow.test.ts`, `src/scene/ContactShade.test.tsx`

**Interfaces:**
- Produces:
  - `contactPatches(footprints: { x: number; z: number; width: number; depth: number; rotation?: number }[]): { x: number; z: number; width: number; depth: number; rotation: number }[]`. Each patch is its footprint grown by `CONTACT_MARGIN = 6` m on every side.
  - `<ContactShade site design />`: one instanced plane at y = 0.06, carrying a canvas radial-gradient texture (black at the centre with 0.45 alpha, fading to 0 at the edge), `transparent`, `depthWrite={false}`, `blending={THREE.MultiplyBlending}`, and no shadow flags.
  - Footprints: the tower's base slice (`floorSlices(design)[0]`) at `lotCenter(site)`, and each `generateNeighbors(site)` block.

- [ ] **Step 1: Write the failing tests**
  - **"grows each footprint by the margin and keeps its turn"**: `contactPatches([{x:1,z:2,width:30,depth:20,rotation:0.3}])` gives `[{x:1,z:2,width:42,depth:32,rotation:0.3}]`.
  - **"draws one patch per building, never casting"**:
    - render `<ContactShade>` for New York;
    - the instanced mesh `count` is `generateNeighbors(site).length + 1`;
    - `castShadow` is false.

- [ ] **Step 2: Run the tests to check they fail**
  - Run: `npx vitest run src/scene/sunShadow.test.ts src/scene/ContactShade.test.tsx`
  - Expected: FAIL.

- [ ] **Step 3: Implement**
  - Mount `<ContactShade>` inside `GroundShake`, only when `facadeDetail === 'high'`.
  - Hide it while building (the excavation is open).

- [ ] **Step 4: Run the tests to check they pass**
  - Run: `npx vitest run src/scene`
  - Expected: PASS.

- [ ] **Step 5: Commit** `feat: soft contact shade where buildings meet the ground`

### Task 6: The Close-up window gets shadows too

**Files:**
- Modify: `src/scene/detail/DetailCanvas.tsx`
- Test: `src/scene/detail/DetailScene.test.tsx`

**Interfaces:**
- Consumes: `selectShadowsOn`, `shadowFlags`, `lighting(site, night, shadows)`.
- Produces: `DetailCanvas` reads `selectShadowsOn`. Its directional light gets `castShadow` from that, with a fixed orthographic shadow camera of half-size 12 m and a 1024² map. Its parts and wall meshes use `shadowFlags`.

- [ ] **Step 1: Write the failing test.** **"the close-up's light casts only when shadows are on"**: render the detail scene with the store's shadows on, then off, and check the directional light's `castShadow`.
- [ ] **Step 2: Run the test to check it fails**
  - Run: `npx vitest run src/scene/detail`
  - Expected: FAIL.
- [ ] **Step 3: Implement.** Set `<Canvas shadows={{ type: THREE.PCFShadowMap }}>` on the close-up as well. Its `frameloop="demand"` stays.
- [ ] **Step 4: Run the tests to check they pass**
  - Run: `npx vitest run src/scene/detail`
  - Expected: PASS.
- [ ] **Step 5: Commit** `feat: close-up window shadows follow the toggle`

### Task 7: Frame-rate meter, docs and the visual check

**Files:**
- Create: `src/ui/FpsMeter.tsx`
- Modify: `src/ui/GameScreen.tsx` (mount it), `README.md`, `docs/superpowers/specs/2026-10-10-skyscraper-sim-design.md` (roadmap)
- Test: `src/ui/FpsMeter.test.tsx`

**Interfaces:**
- Produces: `fpsEnabled(search: string): boolean`, true when the query has an `fps` key. `<FpsMeter />` renders nothing unless that is true.
  - When on, it shows `NN fps` (the average over the last second) in a small fixed box in the top right, measured with `requestAnimationFrame`.
  - It is shipped in production builds, so the user can check the live site on the Chromebook.

- [ ] **Step 1: Write the failing tests**
  - `fpsEnabled('?fps')` is true; `fpsEnabled('?x=1&fps=1')` is true; `fpsEnabled('')` is false.
  - `<FpsMeter />` renders nothing when `window.location.search` is `''`.
- [ ] **Step 2: Run the tests to check they fail**
  - Run: `npx vitest run src/ui/FpsMeter.test.tsx`
  - Expected: FAIL.
- [ ] **Step 3: Implement it and mount it.**
  - **README:** one paragraph on shadows and the toggle, plus a line on `?fps`.
  - **Roadmap:** Plans 8–12 per spec §9, then 13 inside the tower, 14 people, 15 design chat.
- [ ] **Step 4: Run the full suite**
  - Run: `npx vitest run && npx tsc -b && npx vite build`
  - Expected: all PASS, with no type errors.
- [ ] **Step 5: Visual check (headless Chrome over CDP)**
  - Shots: all 8 styles by day (whole tower, facade close-up, crown), Chicago at night, Detail: Simple, and Shadows: Off.
  - Expected:
    - zero console errors;
    - shadows visible under ledges, cornices, balconies and bracing;
    - no acne stripes on the walls;
    - shadowed faces readable, not near-black;
    - at night and with Off or Simple, no shadows.
- [ ] **Step 6: Commit** `feat: ?fps frame-rate meter; docs for shadows and the renumbered roadmap`
