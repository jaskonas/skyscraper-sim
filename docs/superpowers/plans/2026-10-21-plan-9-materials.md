# Plan 9 — Materials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every surface reads as a named material (brick, limestone, granite, terracotta, board-formed or precast concrete, metal panel, copper, wood, roofing, paving). Textures are true to scale, repainted by the colour pickers, never visibly tiled, and lightly weathered.

**Architecture:**
- **Texture files:** 12 CC0 Poly Haven texture sets, pre-processed by a committed script into two small JPEGs each, under `public/textures/<id>/`:
  - a **detail** map: greyscale, its mean luminance normalised to 0.5;
  - a **normal** map: OpenGL convention.
- **Colour:** the colour still comes from the palette (the painted tile, or the part's colour). The detail map only modulates light and dark around 1.0, which is the user's option (a).
- **Facade:** the shader reads a new *region* channel in the glow map (wall / trim / spandrel). It samples the wall or trim material in metres (along the wall × world height), perturbs the normal, modulates roughness and adds procedural weathering.
- **Parts:** each part material gets the same treatment, with box projection on the dominant axis in the instance's scaled object space.
- **Loading:** textures load lazily after mount. Until they arrive, neutral 1×1 placeholders give exactly today's look.
- **Detail: Simple:** skips all of it.

**Tech Stack:** React 19, three 0.186, @react-three/fiber 9, Vitest 5. Asset prep uses Python 3 with Pillow and numpy in a throwaway venv; they are not project dependencies.

**Spec:** `docs/superpowers/specs/2026-10-20-surface-detail-design.md` §4 (and §2, §8).

## Global Constraints

- No new npm dependencies.
- **Never push or merge to `master` without the user's explicit word.**
- **Texture budget:** everything under `public/textures/` is ≤ 5 MB on disk. Every texture is ≤ 1024 px; the plan uses 512.
- **Colour pickers repaint the material (spec §4.2):**
  - `body` and `accent` surfaces take the palette colour, modulated by the texture's luminance about its mean;
  - fixed part materials keep their own colour.
- **Detail: Simple and missing textures both give today's look,** with no errors.
- Neighbouring buildings are unchanged (they render with `uDetail` 0).
- **Masonry by style:**
  - Chicago School: red brick with terracotta trim;
  - Gothic Revival: limestone;
  - Art Deco: buff brick with limestone trim;
  - Postmodern: granite;
  - Brutalist: board-formed concrete, overriding precast only while its facade is precast.

## Review Focus

1. **Textures not loaded yet, or a 404 on the deploy base path:** the tower looks exactly like Plan 8, and nothing throws. Test in Task 3 (the placeholders are neutral), and the visual check in Task 7 runs with `/textures` blocked.
2. **Round and twisted towers:** the texture neither stretches nor swims along the drum. The across-coordinate is arc length (`uRound`). Visual check in Task 7 on Neo-futurist.
3. **The colour picker set to blue on Chicago:** blue brick with visible mortar. Test in Task 4 (the modulation keeps the hue), plus the visual check.
4. **Floor seams:** brick courses must not jump at each floor line. The wall uses world height, not per-floor tile height. Test in Task 4 (the shader uses `vFacadeWorld.y`).
5. **The close-up window** (`frameloop="demand"`) shows the textures once they load. Test in Task 3 (a version bump re-renders subscribers).

---

### Task 1: The texture library assets

**Files:**
- Create: `scripts/textures/build_textures.py`, `public/textures/LICENSES.md`, and `public/textures/<id>/detail.jpg` plus `normal.jpg` for 12 ids
- Test: `src/scene/materials/assets.test.ts`

**Interfaces:**
- Produces: the files below. The ids, Poly Haven sources and real tile sizes (metres) are:

| id | Poly Haven asset | size m |
|---|---|---|
| brick-red | red_brick_03 | 1.0 |
| brick-buff | yellow_brick | 2.0 |
| limestone | white_sandstone_blocks_02 | 2.0 |
| granite | granite_tile | 2.3 |
| terracotta | rectangular_facade_tiles_02 | 2.1 |
| concrete-board | wood_textured_concrete | 1.8 |
| concrete-precast | precast_concrete_wall | 1.59 |
| metal-panel | metal_plate_02 | 2.0 |
| copper | green_metal_rust | 1.0 |
| wood | weathered_planks | 2.0 |
| roofing | tarred_gravel | 2.2 |
| paving | concrete_pavers | 1.92 |

- [ ] **Step 1: Write the failing test** `assets.test.ts`:
  - **"every library material has a detail and a normal map"**: for each id, `public/textures/<id>/detail.jpg` and `normal.jpg` exist.
  - **"stays within the 5 MB budget"**: the sum of file sizes under `public/textures` is ≤ 5 × 1024 × 1024.
  - **"credits every source"**: `LICENSES.md` contains each Poly Haven asset name and "CC0".
- [ ] **Step 2: Run the test to check it fails**
  - Run: `npx vitest run src/scene/materials/assets.test.ts`
  - Expected: FAIL.
- [ ] **Step 3: Write and run `build_textures.py`**
  - **Downloading:** for each row, fetch `https://api.polyhaven.com/files/<asset>`, then download `Diffuse/1k/jpg` and `nor_gl/1k/jpg`.
  - **Detail map:**
    - luminance `0.2126R + 0.7152G + 0.0722B`;
    - scaled so its mean is 0.5 and clipped to 0..1;
    - resized to 512² (Lanczos);
    - saved as greyscale JPEG at quality 85.
  - **Normal map:** resized to 512² and saved as an RGB JPEG at quality 88.
  - It writes `LICENSES.md`.
  - Run it in a throwaway venv with pillow and numpy.
- [ ] **Step 4: Run the test to check it passes**
  - Run: `npx vitest run src/scene/materials/assets.test.ts`
  - Expected: PASS.
- [ ] **Step 5: Commit** `feat: CC0 material texture library (12 materials, detail + normal maps)`

### Task 2: Which material goes where

**Files:**
- Create: `src/scene/materials/library.ts`
- Test: `src/scene/materials/library.test.ts`

**Interfaces:**
- Produces:
  - `type LibraryId`: the 12 ids from Task 1.
  - `LIBRARY: Record<LibraryId, { source: string; sizeM: number; contrast: number; normalStrength: number }>`.
    - `contrast` scales how far the detail map swings away from 1.
    - `normalStrength` scales the normal's xy.
    - Suggested values: brick 1.0/1.0; stones 0.6/0.6; concretes 0.5/0.5; metal-panel 0.35/0.4; copper 0.6/0.5; wood 0.8/0.8; roofing 0.6/0.6; paving 0.6/0.8.
  - `interface Surfaces { wall: LibraryId; trim: LibraryId }`
  - `surfacesFor(design: Design): Surfaces`
  - `partLibrary(material: PartMaterial, surfaces: Surfaces | undefined): LibraryId | null`

- [ ] **Step 1: Write the failing tests**
  - **"masonry follows the style"**:
    - Chicago School gives `{wall:'brick-red', trim:'terracotta'}`;
    - Gothic Revival gives `{wall:'limestone', trim:'limestone'}`;
    - Art Deco gives `{wall:'brick-buff', trim:'limestone'}`;
    - Postmodern gives `{wall:'granite', trim:'granite'}`.
    - Use `designFor(site, presetValues)` with each style preset applied.
  - **"facade type decides the rest"**:
    - glass gives `{wall:'metal-panel', trim:'metal-panel'}`;
    - metal gives `{wall:'metal-panel', trim:'metal-panel'}`;
    - precast gives `{wall:'concrete-precast', trim:'concrete-precast'}`.
  - **"Brutalist is board-formed while its facade is precast"**:
    - Brutalist preset gives `{wall:'concrete-board', trim:'concrete-board'}`;
    - the same design with `facade:'glass'` gives metal-panel.
  - **"a masonry facade on a non-masonry style is limestone"**: International with `facade:'masonry'` gives `{wall:'limestone', trim:'limestone'}`.
  - **"parts"**:
    - `partLibrary('body', s)` is `s.wall`; `'accent'` is `s.trim`;
    - stone → limestone, concrete → concrete-board, copper → copper, gold → metal-panel, steel → metal-panel, girder → metal-panel, wood → wood;
    - glass, foliage, ruby, light and interior → `null`;
    - `body` with `surfaces` undefined → `null`.
  - **"every size is real"**: each `sizeM` is between 0.5 and 3.
- [ ] **Step 2: Run the tests to check they fail**
  - Run: `npx vitest run src/scene/materials/library.test.ts`
  - Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests to check they pass**
  - Run: `npx vitest run src/scene/materials/library.test.ts`
  - Expected: PASS.
- [ ] **Step 5: Commit** `feat: material assignment by facade, style and part material`

### Task 3: Loading textures lazily, with neutral stand-ins

**Files:**
- Create: `src/scene/materials/libraryTextures.ts`
- Modify: `src/scene/Scene.tsx` (calls `startLibraryLoad()` in an effect)
- Test: `src/scene/materials/libraryTextures.test.ts`

**Interfaces:**
- Produces:
  - `libraryTextures(id: LibraryId): { detail: THREE.Texture; normal: THREE.Texture }`. Before loading, these are the shared placeholders. Real textures are `RepeatWrapping`, `NoColorSpace`, with anisotropy 4.
  - `NEUTRAL_DETAIL`: a 1×1 `DataTexture` with value 128.
  - `NEUTRAL_NORMAL`: a 1×1 `DataTexture` with (128, 128, 255).
  - `startLibraryLoad(load?: (url: string) => Promise<THREE.Texture>): void`
    - idempotent;
    - urls are `${import.meta.env.BASE_URL}textures/<id>/detail.jpg` and `normal.jpg`;
    - a failed load keeps the placeholder.
  - `useLibraryVersion(): number`: a counter (via `useSyncExternalStore`) that increases when any texture arrives.
  - `resetLibraryForTests(): void`

- [ ] **Step 1: Write the failing tests**
  - **"starts with neutral stand-ins that change nothing"**: before any load, `libraryTextures('brick-red').detail` is `NEUTRAL_DETAIL`, whose data is `[128,128,128,255]`. `normal` is `NEUTRAL_NORMAL`, with data `[128,128,255,255]`.
  - **"swaps in the real textures when they arrive, and bumps the version"**:
    - call `startLibraryLoad(fakeLoad)`, where `fakeLoad` resolves a `new THREE.Texture()` per url and records the urls;
    - await;
    - 24 urls, each matching `/textures\/[a-z-]+\/(detail|normal)\.jpg$/`;
    - `libraryTextures('brick-red').detail` is not `NEUTRAL_DETAIL`, and its `wrapS` is `RepeatWrapping`;
    - a component using `useLibraryVersion` re-rendered.
  - **"a failed load keeps the stand-in and throws nothing"**: `fakeLoad` rejects for `granite`, and the `granite` detail is still `NEUTRAL_DETAIL`.
  - **"loads only once"**: a second `startLibraryLoad` call adds no urls.
- [ ] **Step 2: Run the tests to check they fail**
  - Run: `npx vitest run src/scene/materials/libraryTextures.test.ts`
  - Expected: FAIL.
- [ ] **Step 3: Implement.** The default `load` uses `THREE.TextureLoader().loadAsync`. Call `startLibraryLoad()` in `Scene` inside a `useEffect` with `[]`.
- [ ] **Step 4: Run the tests to check they pass**
  - Run: `npx vitest run src/scene/materials`
  - Expected: PASS.
- [ ] **Step 5: Commit** `feat: material textures load lazily behind neutral stand-ins`

### Task 4: Facade surfaces

**Files:**
- Modify: `src/scene/facadeTile.ts` (the glow mode paints the region into G), `src/scene/facadeTexture.ts` (`PX` 128 → 256), `src/scene/FacadeMaterial.ts`, `src/scene/Building.tsx`
- Test: `src/scene/facadeTile.test.ts`, `src/scene/FacadeMaterial.test.ts`, `src/scene/Building.test.tsx`

**Interfaces:**
- Consumes: `surfacesFor`, `LIBRARY`, `libraryTextures`, `useLibraryVersion`.
- Produces:
  - `REGION_GREEN: Record<'wall' | 'trim' | 'spandrel', number>`, equal to `{ wall: 0, trim: 128, spandrel: 255 }`.
  - The glow painter fills rects and polys with `rgb(glass ? 255 : 0, REGION_GREEN[region], 0)`, where region is `frame`/`accent` → trim, `spandrel` → spandrel, and `wall`/`glass` → wall. Strokes are `rgb(0, 128, 0)` (trim).
  - **New uniforms** in `FacadeUniforms`: `uWallDetail`, `uWallNormal`, `uTrimDetail`, `uTrimNormal` (Texture); `uWallSurface`, `uTrimSurface` (Vector3: `1/sizeM`, contrast, normalStrength).
  - `setFacadeSurfaces(material, wall: LibraryId, trim: LibraryId): void`
  - Cache key `'facade-v5'`.

- [ ] **Step 1: Write the failing tests**
  - **facadeTile:** "the glow map marks wall, trim and spandrel in green".
    - Paint a stripes-spandrel recipe in `'glow'` mode with a recording canvas.
    - The first `fillStyle` (the wall) is `rgb(0, 0, 0)`.
    - The accent stripe is `rgb(0, 128, 0)`.
    - The spandrel stripe is `rgb(0, 255, 0)`.
    - Glass is `rgb(255, 0, 0)`.
    - The frame `strokeStyle` is `rgb(0, 128, 0)`.
  - **FacadeMaterial:** "samples the wall and trim materials in metres and keeps the palette's colour".
    - The fragment contains `uWallDetail`, `uTrimNormal`, `vFacadeWorld.y` (in the material uv), `facadeSurfaceNormal` (set in the map stage and used after `#include <normal_fragment_maps>`) and `roughnessFactor *=`.
    - The cache key is `'facade-v5'`.
    - `setFacadeSurfaces(m, 'brick-red', 'terracotta')` sets `uWallSurface` to `(1/1.0, 1.0, 1.0)` and `uWallDetail.value === libraryTextures('brick-red').detail`.
  - **JS twin of the colour modulation** in `src/scene/materials/library.ts`:
    - `modulate(rgb: [number, number, number], detail: number, contrast: number): [number, number, number]`, equal to `rgb × (1 + (detail − 0.5) × 2 × contrast)`, clamped at ≥ 0;
    - test "keeps the palette's hue": `modulate([0.1,0.2,0.8], 0.3, 1)` has the same channel ratios as the input.
  - **Building:** "the body's facade wears the design's wall and trim": for a Chicago design, the body material's `uWallDetail.value === libraryTextures('brick-red').detail` and its `uTrimDetail.value === libraryTextures('terracotta').detail`.
- [ ] **Step 2: Run the tests to check they fail**
  - Run: `npx vitest run src/scene/facadeTile.test.ts src/scene/FacadeMaterial.test.ts src/scene/Building.test.tsx src/scene/materials`
  - Expected: FAIL.
- [ ] **Step 3: Implement the shader.** On walls (`abs(N.y) < 0.5`), when `uDetail > 0.5` and the pixel is not glass:
  - **Material coordinates:** `vec2 m = vec2(vFacadeUv.x * uTileSize.x, vFacadeWorld.y)`.
  - **Pick the material:** `float g = texture2D(uGlowMap, vFacadeUv).g`, and trim when `0.25 < g < 0.75`.
  - **Sample** detail and normal at `m * surface.x`.
  - **Colour:** `diffuseColor.rgb *= max(1.0 + (d - 0.5) * 2.0 * surface.y, 0.0)`.
  - **`facadeSurfaceNormal`:** the tangent-space normal with `xy *= surface.z`.
  - **Normal stage:** after `#include <normal_fragment_maps>`, when it is set, `normal = normalize((viewMatrix * vec4(T*n.x + B*n.y + N*n.z, 0.0)).xyz)`, where T = `normalize(cross(up, N))`, B = up and N = `vFacadeNormal`.
  - **Roughness:** after `#include <roughnessmap_fragment>`, `roughnessFactor *= mix(1.0, 1.25 - 0.5 * d, facadeSurfaceMix)`.
  - **Building's `Body`:** calls `setFacadeSurfaces(material, surfaces.wall, surfaces.trim)` in its per-render layout effect, and reads `useLibraryVersion()` so it re-renders when textures arrive.
- [ ] **Step 4: Run the tests to check they pass**
  - Run: `npx vitest run src/scene`
  - Expected: PASS.
- [ ] **Step 5: Commit** `feat: facade walls and trim wear real materials, repainted by the palette`

### Task 5: Weathering

**Files:**
- Modify: `src/scene/FacadeMaterial.ts`, `src/scene/Building.tsx`
- Test: `src/scene/FacadeMaterial.test.ts`, `src/scene/materials/weathering.test.ts`
- Create: `src/scene/materials/weathering.ts` (the JS twin and its constants)

**Interfaces:**
- Produces:
  - `WEATHER = { tintRange: 0.06, tintScaleM: 23, streakDrop: 0.18, streakReachM: 1.2, grimeDrop: 0.12, grimeHeightM: 12, topFade: 0.05 }`
  - `weatherShade({ worldY, floorShare, streak, noise }: { worldY: number; floorShare: number; streak: number; noise: number }): number`. It is the brightness multiplier:
    - `(1 + tintRange·(2·noise − 1))`
    - `× (1 − streakDrop·streak)`
    - `× (1 − grimeDrop·exp(−worldY / grimeHeightM))`
    - `× (1 + topFade·smoothstep(0.7, 1, floorShare))`
  - `WEATHER_GLSL`: the GLSL twin, plus value noise `weatherNoise(vec2)`.
  - The uniform `uFloors` (a float) and `setFacadeFloors(material, floors: number)`.

- [ ] **Step 1: Write the failing tests**
  - **`weatherShade`:**
    - **"is subtle"**: over a grid of inputs it stays within [0.70, 1.12].
    - **"darkens under windows, near the street, and fades at the top"**:
      - streak 1 < streak 0;
      - worldY 0 < worldY 100;
      - floorShare 1 > floorShare 0.5 (all else equal).
  - **FacadeMaterial:** "weathers walls but not glass": the fragment contains `weatherNoise(`, `uFloors` and `streak`, and `setFacadeFloors(m, 70)` sets `uFloors` to 70.
- [ ] **Step 2: Run the tests to check they fail**
  - Run: `npx vitest run src/scene/materials/weathering.test.ts src/scene/FacadeMaterial.test.ts`
  - Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **In the shader**, on non-glass pixels when `uDetail > 0.5`:
    - `noise = weatherNoise(m / tintScaleM)`;
    - `streak` = the glass mask sampled `streakReachM` above (`vFacadeUv + vec2(0, reach / uTileSize.y)`), times `step(0.5, fract(m.x * 6.0 + hash))`-style vertical banding, times `(1 − glass here)`;
    - `floorShare = (vFloor + 1) / uFloors`;
    - `diffuseColor.rgb *=` the shade.
  - **Building** sets `setFacadeFloors(material, design.floors)`.
- [ ] **Step 4: Run the tests to check they pass**
  - Run: `npx vitest run src/scene`
  - Expected: PASS.
- [ ] **Step 5: Commit** `feat: subtle weathering — patchy tone, streaks under windows, street grime, sun-faded top`

### Task 6: Parts wear materials

**Files:**
- Modify: `src/scene/parts/PartsMesh.tsx`; the callers `src/scene/Building.tsx`, `src/scene/detail/DetailCanvas.tsx` and `src/scene/construction/ConstructionView.tsx` pass `surfaces`
- Create: `src/scene/parts/partSurface.ts` (`patchPartShader`, the GLSL)
- Test: `src/scene/parts/partSurface.test.ts`, `src/scene/Building.test.tsx`

**Interfaces:**
- Consumes: `partLibrary`, `LIBRARY`, `libraryTextures`, `useLibraryVersion`, `surfacesFor`.
- Produces:
  - `PartsMesh` takes an optional `surfaces?: Surfaces` and `detail?: boolean`, default true. With `detail` false, no part is textured.
  - `patchPartShader(shader, uniforms: PartSurfaceUniforms): void`
  - `partSurfaceUniforms(id: LibraryId): PartSurfaceUniforms`, with `uPartDetail`, `uPartNormal` and `uPartSurface` (a Vector3, as in Task 4).
  - Cache key `'part-surface-v1'`.

- [ ] **Step 1: Write the failing tests**
  - **partSurface:** "projects on the dominant axis in scaled object space".
    - The patched vertex shader contains `vPartPos` (`position * instance scale`) and `vPartAxis`.
    - The fragment contains `uPartDetail` and the after-normal-maps normal replacement.
  - **Building:** "a Chicago tower's stone ornaments are limestone and its body-coloured parts are brick".
    - Find a `parts:` mesh whose key starts with `box|stone`; its material's `userData.partSurface.uPartDetail.value` is `libraryTextures('limestone').detail`.
    - A `parts:*|glass|*` mesh has no `userData.partSurface`.
  - **"Detail: Simple leaves parts plain"**: `<Building facadeDetail={false}>` gives no parts mesh with `userData.partSurface`.
- [ ] **Step 2: Run the tests to check they fail**
  - Run: `npx vitest run src/scene/parts src/scene/Building.test.tsx`
  - Expected: FAIL.
- [ ] **Step 3: Implement**
  - **In the vertex shader:**
    - `vPartPos = position * scale` (column lengths of `instanceMatrix`), plus a per-instance offset from the instance translation `* 0.37`, so neighbouring parts don't line up;
    - the axis is chosen from the object normal;
    - the tangent and bitangent go to view space via `normalMatrix * mat3(instanceMatrix) * axisVector`, normalised.
  - **In the fragment shader:** the same modulation, normal and roughness as Task 4.
  - **`Group`** builds its material with `onBeforeCompile` only when the library id is non-null and `detail` is true.
  - **Callers pass `surfaces`:**
    - Building: `surfacesFor(design)`, with `detail={facadeDetail}`;
    - DetailScene: `surfacesFor(design)`;
    - ConstructionView: `surfacesFor(design)`, where it renders `PartsMesh` directly.
- [ ] **Step 4: Run the tests to check they pass**
  - Run: `npx vitest run src/scene`
  - Expected: PASS.
- [ ] **Step 5: Commit** `feat: crowns, ornaments, dressing and the close-up wear the material library`

### Task 7: Docs and the visual check

**Files:**
- Modify: `README.md`
- Test: the full suite

- [ ] **Step 1: README.** One paragraph on materials and weathering, credits for Poly Haven (CC0), and how to rebuild the textures with the script.
- [ ] **Step 2: Full suite**
  - Run: `npx vitest run && npx tsc -b && npx vite build`
  - Expected: all PASS; the `dist/textures` size is ≤ 5 MB.
- [ ] **Step 3: Visual check (headless CDP)**
  - Shots:
    - all 8 styles: facade close-up at 15 m and 40 m, crown, whole tower;
    - Chicago with a blue body colour;
    - Neo-futurist (round and twisted) close up;
    - night;
    - Detail: Simple;
    - one run with `/textures/` requests blocked (`Network.setBlockedURLs`).
  - Expected:
    - materials are recognisable;
    - no visible floor seams;
    - no obvious tiling at 40 m;
    - the blue brick keeps its mortar;
    - Simple and the blocked run look like Plan 8;
    - zero console errors.
- [ ] **Step 4: Commit** `docs: materials and texture credits`
