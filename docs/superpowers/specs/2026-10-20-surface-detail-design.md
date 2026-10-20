# Surface Detail — Design Spec (Plans 8–12)

Replaces §5 ("Plan 8 — Close-range 3D") of `2026-10-18-visual-detail-design.md` and changes one part of Plan 6 (§3.1, the rooms behind the glass). It builds on Plans 6 and 7 as they stand on their branches (`plan-6-facade-detail`, `plan-7-tower-dressing`), which are merged before Plan 8 starts.

## 1. Why

**What the user wants, in their words:**
- "I want to zoom in and see rich architectural detail, clearly defined materials, building systems where appropriate."
- "Just everything massively increase the detail."
- "The spire should look like actual spires."
- **Building systems:** "x brace where appropriate, but also AC units, etc."
- **Room interiors are not wanted:** "We don't need to do room interiors. Let's focus on greatly upgrading surfaces."

**Who it is for:** the user's son, on a Chromebook. Zooming in on his tower should be a reward: it should look like a real building, not a toy.

**What the current build looks like:** close-up screenshots of all 8 styles and 10 crowns, taken 2026-10-19 on the Plan 7 branch. Worst first:

1. **Every material is a single flat colour.**
   - Brick, stone and concrete are one shade each: no joints, coursing, grain, staining or seams.
   - The facade tile is a 128-pixel canvas painting, so it blurs up close.
   - Glass is flat grey-blue. The Plan 6 fake rooms read as grey boxes.
2. **Crowns are toy primitives.**
   - Spire: a black cone on a gold box.
   - Stepped needle: three boxes and a pole.
   - Gothic pinnacles: a green pyramid and plain cones.
   - Pagoda: flat plates on boxes.
   - Deco arches: stacked hemispheres.
3. **No shadows.** The depth that already exists (piers, fins, cornices, bracing) barely reads in flat light.
4. **Equipment is placeholder.** Rooftop plant is plain boxes and cylinders, the entrance is a slab, a cylinder and posts, and nothing is on the walls.
5. **The structure is clean bars.** The X-bracing has no nodes, plates or bolts; the lattice mast is four posts and a pole.

## 2. Goals, non-goals, anti-goals

**Goals:**
- At every zoom level, and above all up close, each part of the tower reads as real architecture, made of materials you can name at a glance.
- Order of impact: light and shadow, then materials, then 3D wall depth up close, then crowns, then building systems.

**Non-goals:**
- Room interiors (removed; see §3.2).
- Neighbouring buildings and street life (**user's call**, left as they are).
- Any change to the analysis, the scores or the design data.
- New design controls, except the shadow toggle.

**Anti-goals** (failures even if it technically works):
- **Choppy on the Chromebook** with the defaults. Detail must scale with distance, and the toggles must restore today's speed.
- **Visible tiling:** the same brick patch repeating in a grid across a 200 m tower.
- **Muddy and dark.** Shadows and textures must not make the scene gloomy; today's bright, readable look is the baseline.
- **Mismatch:** the main view, the Close-up window and the construction animation must agree on materials.
- **Breaking existing behaviour:** sway, construction reveal, night lights, the Detail: Simple look and the export.

## 3. Plan 8 — Light and shadow

### 3.1 Shadows

- The sun casts real shadows: the tower onto itself (ledges, fins, crowns, balconies, bracing), onto the ground and the neighbours, and the neighbours onto the tower.
- **Up close, shadows are crisp.** A balcony slab's shadow is visibly sharp from 30 m away. The builder chooses the technique (a shadow camera fitted to the view, cascades, or something else) as long as near shadows are crisp and far ones are present.
- **Corners and recesses get soft darkening (ambient occlusion):** where a ledge meets a wall, inside window reveals, under cornices, and where the tower meets the ground.
  - The cheapest technique that looks right is the builder's choice: baked into textures and geometry, or computed in the shader.
  - Full-screen post-processing is allowed only if it stays inside the speed budget (§8).
- **At night**, the sun's shadows are off. Lit windows, the moon and the existing night lights carry the scene.
- **Brightness:** shadowed sides stay readable. The sky fill light is raised as needed so a shadowed facade is never near-black.

### 3.2 Removing the rooms

- Plan 6's interior mapping (`facadeRoom`, room tints, furniture band, the `ROOM_*` constants and the `aRoomTint` attribute) is removed.
- **Glass instead shows:**
  - **by day:** sky reflection with Fresnel, the sun glint, a dark interior tone behind the reflection with slight per-pane variation, and blinds as a flat band;
  - **at night:** the existing lit/unlit pattern, glowing evenly per pane.
- **Kept from Plan 6:** the recessed-glass parallax, tint variety, dark panes, mechanical floors, balconies and Detail: High/Simple.

### 3.3 Controls

- **A new view setting `shadows: boolean`** in the store, like `facadeDetail`.
  - It is kept across new projects and is not part of the design or its history.
  - Default **on** (my call).
- **Button:** "☀️ Shadows: On/Off" in the scene overlay, next to "✨ Detail", with `aria-pressed`.
- **Detail: Simple turns shadows off and greys out the button** (user's call: "with the ability to turn it off"; tying it to Simple is my call). Going back to High restores the previous shadow choice.

## 4. Plan 9 — Materials

### 4.1 The material library

- **Photo-based, public-domain (CC0) material textures** from Poly Haven or ambientCG. The choice of photo textures over generated ones is my call; the user answered "Ok".
- **Each material has three maps:** colour, normal and roughness. Resolution is 1K, or 512 px where that is enough.
- They are committed under `public/textures/`, with a `LICENSES.md` naming each source.
- **Budget: about 5 MB in total.** Textures load after the first frame; until they arrive, the tower shows today's flat look, so first load is not delayed.
- **The set (about 12):**

| Material | Used by |
|---|---|
| red brick, buff brick | masonry styles (§4.2) |
| limestone blocks, granite | masonry styles, bases, crowns |
| terracotta | Chicago and Gothic trim |
| board-formed concrete, smooth precast | Brutalist, precast, concrete cap |
| brushed metal panel, painted steel | metal facades, High-Tech, structure |
| copper patina, gold leaf | crowns |
| roofing (gravel or membrane), paving | roofs, terraces, plaza |

### 4.2 Which surface gets which material

- **Facade type** decides the wall material:
  - glass: curtain wall, with its spandrel panels in metal;
  - metal: metal panel;
  - precast: smooth precast;
  - masonry: brick or stone.
- **Masonry by style** (my call):
  - Chicago School: red brick with terracotta trim;
  - Gothic Revival: limestone;
  - Art Deco: buff brick with limestone trim;
  - Postmodern: granite.
  - A custom (non-preset) design uses the style's masonry.
  - **Colour pickers repaint the material (user's call, option a).** The palette's body colour replaces the texture's own hue, and the texture keeps its light and dark pattern (joints, coursing, grain, seams). Blue on a brick tower gives blue-painted brick with visible mortar.
    - This applies to `body` and `accent` surfaces of every material.
    - `copper`, `gold`, `stone`, `concrete`, `steel`, `wood` and the other fixed part materials keep their own colour.
    - **Technique:** take the texture's luminance, centred on its average, and apply it as a light/dark modulation of the palette colour, rather than multiplying the two.
- **Brutalist:** board-formed concrete. This overrides "precast → smooth precast" only while a Brutalist design's facade is still precast.
- **Parts** (crowns, ornaments, dressing): each `PartMaterial` maps to one library material. For example, `stone` → limestone, `concrete` → board-formed, `copper` → patina, `steel` → painted steel, `wood` → wood planks (add one texture).
  - `body` and `accent` follow the wall material and the trim material above.

### 4.3 Making it look real, not tiled

- **True scale:** textures are mapped in metres, so bricks are brick-sized on every tower.
  - The wall's existing per-floor UVs can be used, or world-space or triplanar mapping, whichever is cheapest.
  - Round and twisted towers must not show stretched or swimming texture.
- **Breaking up the repeats:**
  - large-scale variation (a low-frequency noise on tint and roughness);
  - per-panel or per-floor offsets;
  - two scales of the same texture blended.
- **Weathering:**
  - streaks running down from sills and ledges;
  - darker grime toward the base and under ledges;
  - slight sun fading on the top floors.
  - All of it is subtle and procedural (in the shader), never in a downloaded texture.
- **The facade window grid stays.** The painted tile (`facadeTile`) still decides where windows, frames and spandrels go. It is redrawn at a resolution high enough to stay sharp at 10 m, and the wall, frame and spandrel areas each take their own library material.
- **Night:** materials are dimmer at night. The lit windows and night glow are unchanged.

### 4.4 Everywhere the tower appears

The main view, the construction animation (each stage shows its real material: bare concrete, steel, then the finished skin), the Close-up window and the force views (Plan 5) all use the same library.

## 5. Plan 10 — Close-range 3D walls

This is the old Plan 8 (§5 of the visual-detail spec), now with materials and without rooms.

- **The swap:** as the camera comes within about **120 m** of the facade, the floors nearest it are rebuilt as true 3D wall bays, using `wallBay` from the Close-up:
  - mullions and frames that stand proud;
  - glass set 0.3 m back;
  - sills, lintels and spandrel panels;
  - reveals you can see into.
- **Chunks:** the swap happens in chunks of about 4 floors × 6 bays. Chunks fade in with no popping, and far floors keep the shader facade.
- **Budget:** about 3,000 extra parts at once, built in under 8 ms per chunk.
- **Matching:**
  - Windows, tints, blinds, dark panes, night lights and mechanical floors match the shader facade exactly. They share one hash module.
  - Materials come from §4.
  - Sway (Plan 5) moves the chunks with their floors.
- **Shapes:** chunks cover every plan shape (square, rectangle, round, triangle and the rest), plus taper and twist, so the round and twisted Neo-futurist towers get the same close-up depth (my call, following "everything"). Curved walls get bays bent to the drum, and twist turns each floor's chunk with its floor. This is the largest part of Plan 10.
- **Fine surface details** (window-frame profiles, sill drips, panel joints, anchor bolts on metal panels) appear only in these near chunks.

## 6. Plan 11 — Crowns rebuilt

**Coverage:** all 27 crowns are rebuilt as real architecture, each modelled on the building named in its `seenOn`. **The bar:** at close range, each crown has the features a person would name if they were describing the real building.

**Feature notes for the crowns the screenshots showed are worst.** The builder writes notes like these for every crown before building it:

- **Spire (One World Trade Center):**
  - a stepped or chamfered base ring;
  - a tapering lattice or ribbed mast in segments, with maintenance rings;
  - a slender needle with the aircraft light.
- **Deco arches and needle (Chrysler):**
  - seven tiers of stacked sunburst arches with triangular windows (lit at night);
  - stainless-steel ribs;
  - eagle-head gargoyles at the corners of the tier below;
  - the needle rising from the top arch.
- **Gothic pinnacles (Woolworth):**
  - a steep copper roof with dormers;
  - corner pinnacles with crockets and finials;
  - tracery on the top floors;
  - a lantern.
- **Stepped needle (Burj Khalifa):**
  - stepped setbacks of glass and metal fins;
  - the spire growing out of the core, with a tapering steel sheath.
- **Pagoda tiers (Jin Mao, Taipei 101):**
  - upturned eaves on each tier;
  - bracket rows under the eaves;
  - glass between the tiers;
  - a finial.
- **Star spire (Moscow State University):**
  - a tiered tower with corner urns;
  - a ribbed spire;
  - a wreath and star at the top.
- **Lattice mast (Lloyd's):**
  - a real braced lattice: chords, diagonals and platforms;
  - a crane gantry;
  - exposed service pods.

**How they're built:**
- **New part shapes as needed:** for example a lathe profile (an ogee dome or a ribbed bulb), an extruded profile (a moulding or an eave curve), a lattice segment and a sunburst arch.
- The existing instanced parts system stays. Each new shape is one more instanced geometry.
- Crowns keep their heights, `officialHeight` and analysis effects.

**Cost:**
- At most about **2,500 parts per crown**.
- Fine pieces (crockets, bolts, small ribs) are drawn only when the camera is near the crown (§8).

**Ornament amount** still thins decorative parts as today.

## 7. Plan 12 — Building systems

**Structure, where the style has it:**
- **X-bracing and diagonal bracing:**
  - node plates where members meet, with bolt patterns;
  - flanged sections (I-beam look rather than a box bar);
  - gusset plates at floor lines.
- **Diagrids:** cast nodes at intersections.
- **Exposed columns:** flanges and fireproofing joints.
- **Bundled tubes and outriggers:** the belt truss is visible on mechanical floors.
- The look follows the design's `system` field and the existing 'structure' ornament group (the bracing ornaments). It upgrades what those already draw, so the bracing doesn't appear on styles that don't have it.

**Equipment on the walls:**
- **Through-wall and window AC units** under some windows:
  - on residential and hotel floors;
  - on pre-1960 styles (Chicago School, Gothic Revival, Art Deco);
  - placed by the same seeded hash as the windows, about 15% of windows (my call).
- **Louvre bands and grilles:** at mechanical floors (already louvred in Plan 6) and above the entrance.
- **Vent grilles** at the base, and **exhaust stacks** on the roof.

**Roof:**
- Plan 7's kit is upgraded:
  - cooling towers with fans and grilles;
  - chillers;
  - ductwork runs;
  - exhaust fans;
  - satellite dishes;
  - lightning rods along the parapet;
  - a building maintenance unit (a gantry with a cradle) in place of the plain crane.
- The water tank gets staves and hoops.

**Entrance and base:**
- an entrance canopy with edge lighting and a fascia;
- a revolving door with glass leaves and a drum;
- a lit double-height lobby behind the glass, drawn flat with no 3D room (§3.2);
- planters, bollards, paving joints and a raised plinth.

**Rules:**
- Machinery ignores the Ornament amount, as in Plan 7.
- Decorative items follow it.

## 8. Speed

- **Target:** **≥ 30 fps on the user's Chromebook** at the defaults (Detail: High, Shadows: On), with a 150-floor tower in view at mid range.
  - **The real gate is the user's Chromebook** (my call). Headless rendering runs on the software rasteriser at about 9 fps either way, so it can't measure this. Instead, the automated guards are budgets:
    - draw calls;
    - part counts;
    - texture memory (≤ about 64 MB on the GPU);
    - shadow-pass draw calls;
    - and the toggles off must give the same draw calls as today.
  - **The Chromebook's model is unknown (user's answer),** so design for a low-end one: an Intel UHD 600-class or ARM Mali GPU, WebGL2, and about 4 GB of RAM shared with the GPU.
  - The user checks the Chromebook after Plans 8 and 9. A dev-only on-screen fps counter (`?fps` in the URL) makes the check easy.
  - **If Plan 8 misses 30 fps** (my call), cut in this order until it passes, before Plan 9 starts:
    1. a smaller shadow map and soft-shadow sample count;
    2. only the tower casts shadows (the neighbours receive but don't cast);
    3. shadows default to off.
- **Distance detail tiers** (the fade distances are the builder's call):
  - **far:** today's shader facade with materials;
  - **mid:** plus shadows and parts;
  - **near:** plus 3D wall chunks (§5) and fine parts (§6, §7).
- **The escape hatches:**
  - Shadows: Off;
  - Detail: Simple, which gives today's look and speed, without textures, fine parts or shadows.
- **Load:** textures are fetched lazily after the first frame (§4.1). Without them the game still works and looks as it does today.

## 9. Order and checkpoints

| Plan | What | User checkpoint |
|---|---|---|
| 8 | Light and shadow; rooms removed; the shadow toggle | Screenshots of 8 styles by day and night; the Chromebook check |
| 9 | Material library, mapping, weathering | Screenshots of 8 styles close up; the Chromebook check |
| 10 | Close-range 3D walls | Close-up screenshots |
| 11 | All 27 crowns rebuilt | A screenshot sheet of every crown |
| 12 | Building systems | Screenshots of structure, AC, roof and entrance |

**Process:**
- Each plan goes through the usual flow: plan, build, review, fix, then screenshots to the user.
- Nothing is pushed to master (the live site) without the user saying so.
- The roadmap in `2026-10-10-skyscraper-sim-design.md` is renumbered: Plans 8–12 as above, then 13 inside the tower, 14 people and 15 design chat.

## 10. Testing

**Pure helpers:**
- material assignment by facade type, style and part material;
- AC placement (deterministic, the right share, only on the right floors and styles);
- crown part budgets and bounds (every crown stays inside its height and plate);
- the bracing node count matches the member intersections;
- distance tiers.

**Other views:** the Close-up window gets the same shadows and corner darkening and follows the same toggle (my call: its scene is small, so the extra pass is cheap). The construction animation and force views are in the main canvas and come for free.

**Shader and scene:**
- Patched shaders compile; the browser check catches GLSL errors.
- The rooms' uniforms and attributes are gone.
- The shadow toggle sets `castShadow` and `receiveShadow` and the renderer's shadow map; Simple forces it off.
- Textures missing gives today's look without errors.

**Parity:** the 3D chunks match the shader facade's windows and lights, using the shared hashes.

**Speed:**
- part budgets;
- chunk build time;
- the headless frame-time benchmark.

**Visual:** headless screenshots per plan (§9), checked for console errors.

## 11. Left to the builder

- **Techniques:** the shadow technique, the ambient-occlusion approach, the texture mapping method, how tiling is broken up, and the fade distances, all within §2's anti-goals and §8's budget.
- **Choosing the texture assets** within the list in §4.1 and the size budget.
- **The exact geometry of each crown** and every equipment piece, from the reference buildings.
- **Whether a plan splits further** if it grows. Any split is reported to the user.
