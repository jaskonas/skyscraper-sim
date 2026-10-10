# Architectural Detail — Design Spec (Plan 2)

Extends `2026-10-10-skyscraper-sim-design.md` (the base spec). Roadmap position: Plan 2 (§13 of the base spec).

## 1. Purpose

Make towers read as real architecture rather than stacked boxes, so that the choice of style — the teaching point the user cares most about — is visible. A Gothic tower should look Gothic; an International tower should look like Seagram.

**What the user asked for:**
- Style-specific facades, and richer roofs and crowns.
- A wide crown menu (28), with each style choosing its default crown.
- Ornament types the player can choose, with style choosing the defaults.
- A day/night toggle.
- Everything expandable later.
- The design chat (LLM) is deferred to a future iteration and is **not** part of this plan.

**Assumptions (agreed):**
- Stays low-poly and smooth on a normal laptop.
- Detail is driven by **style + settings**: style picks the motifs, settings scale them.
- Analysis effects stay small and directionally honest.

**Out of scope:** street level / plaza / people (Plan 4), visible structural systems beyond existing bracing, construction animation (Plan 3), design chat.

## 2. Rendering approach (hybrid)

- **Painted layer** for fine grain: window pattern, mullion lines, spandrel decoration, night glow. One small canvas tile per (pattern, spandrel, palette, facade, windowRatio) combination, cached, repeated across faces in **real metres** so bays keep their size on tapered floors. A shader patch on `MeshStandardMaterial` derives facade UVs from instance scale.
- **Relief layer** for silhouette: 3D ornaments and crowns, emitted as **parts lists** and drawn by one instanced renderer.

## 3. Data model changes

### 3.1 Design fields

| Field | Type | Notes |
|---|---|---|
| `crown` | `CrownId` (28 ids, §4) | Replaces the 5-value `CrownType`. The old 5 ids are kept. |
| `windowPattern` | `WindowPatternId` | New. Pick one (§5.1). |
| `spandrel` | `SpandrelId` | New. Pick one (§5.1). |
| `ornaments` | `OrnamentId[]` | New. Pick any (§5.2). |
| `ornament` | `'none' \| 'low' \| 'high'` | Unchanged id; now labelled **Ornament amount** and scales density. |

All id types are derived from catalog keys, so the catalog is the single source of truth.

### 3.2 Style presets

Each preset additionally sets `crown`, `windowPattern`, `spandrel`, `ornaments`:

| Style | Crown | Window | Spandrel | Ornaments | Amount |
|---|---|---|---|---|---|
| Chicago School | cornice | chicago | plain | belt-courses, setback-cornices, rusticated-base | low |
| Gothic Revival | gothic-pinnacles | arched | plain | stone-ribs, pinnacles, gargoyles, arched-entry | high |
| Art Deco | deco-arches | flush-grid | chevron | stone-ribs, sunburst-bands, deco-steps, gargoyles | high |
| International | flat | flush-grid | plain | ibeam-mullions | none |
| Brutalist | concrete-cap | punched | plain | concrete-fins | none |
| Postmodern | split-pediment | punched | stripes | belt-courses, arched-entry, urns | low |
| High-Tech | lattice-mast | exposed-frame | plain | accent-ties | none |
| Neo-Futurist | open-frame | diamond | plain | ribbon-bands | none |

`isStyleModified` compares these fields too.

### 3.3 Normalization

`normalizeDesign` maps any unknown `crown`, `windowPattern`, `spandrel` id to the style preset's value and drops unknown `ornaments` ids. Old exported designs and future renames never crash.

## 4. Crown catalog

`src/sim/catalog/crowns.ts`. Entry shape:

```ts
{ id, label, family, seenOn, blurb,
  height: { kind: 'metres' | 'floors' | 'fraction', value },
  officialHeight: boolean,        // false: antennas don't count toward official height
  stages?: CrownStage[],          // declarative build (default)
  custom?: true,                  // needs a builder in scene/crowns (type-enforced)
  minDetailLevel }
```

| Family | id | Seen on | Height |
|---|---|---|---|
| Classic & Beaux-Arts | cornice | Reliance Building, Chicago | 2 m |
| | mansard | The Plaza Hotel, NYC | 2 floors |
| | dome-lantern | Singer Building, NYC | 8% |
| | clock-tower | Metropolitan Life Tower, NYC | 10% |
| Gothic & Deco | gothic-pinnacles | Woolworth Building, NYC | 10% |
| | flying-buttresses | Tribune Tower, Chicago | 6% |
| | deco-arches | Chrysler Building, NYC | 15% |
| | mooring-mast | Empire State Building, NYC | 15% |
| | spire | (existing) | 15% |
| | stepped | (existing) | 3 floors |
| Modern | flat | Seagram Building, NYC (rooftop equipment) | 2 m |
| | concrete-cap | Barbican towers, London | 1 floor |
| | pointed | Transamerica Pyramid, San Francisco | 8% |
| | sloped | Citigroup Center, NYC | 5% |
| | split-pediment | 550 Madison (AT&T), NYC | 2 floors |
| | lattice-mast | Hearst Tower, NYC / Lloyd's, London | 10% |
| | twin-antennas | Willis Tower, Chicago | 15% (not official) |
| | gold-obelisk | Bank of America Plaza, Atlanta | 8% |
| Around the World | star-spire | Moscow State University | 18% |
| | pagoda | Jin Mao Tower / Taipei 101 | 10% |
| | ringed-pinnacle | Petronas Towers, Kuala Lumpur | 15% |
| | stepped-needle | Burj Khalifa, Dubai | 20% |
| | sky-bridge-arch | Kingdom Centre, Riyadh | 4 floors |
| Eco & Experimental | open-frame | Shanghai World Financial Center | 3 floors |
| | glass-dome | 30 St Mary Axe, London | 4% |
| | glass-shards | The Shard, London | 6% |
| | wind-turbines | Strata SE1, London | 2 floors |
| | roof-forest | Bosco Verticale, Milan | 1 floor |

**Crown stages** (declarative): `box`, `pyramid`, `cone`, `dome`, `lantern`, `mast`, `ring`, `arch`, `wedge`, each with size relative to the top floor and its share of crown height. Custom builders: `wind-turbines` (spinning rotors), `open-frame`, `sky-bridge-arch`, `glass-shards`, `flying-buttresses`, `twin-antennas`.

**Analysis effects:**
- `crownHeight(crownId, bodyHeight)` reads the catalog.
- `Analysis.heightM` is the official height. A new `Analysis.tipHeightM` includes non-official crowns and is used for camera framing. The gauge shows e.g. "442 m tall (+85 m antennas)". Teaching point: antennas don't count toward official height.
- `wind-turbines` multiplies EUI by 0.95 (`COEFFICIENTS.energy.windTurbineFactor`).

## 5. Facade catalog

`src/sim/catalog/ornaments.ts` holds window patterns, spandrels and ornaments.

### 5.1 Painted options (pick one each)

**Window patterns:** `flush-grid`, `chicago`, `arched`, `punched`, `exposed-frame`, `diamond`. Each is a declarative tile description: bay width (3–4.5 m), panes (rects, optional arch head), frame thickness, mullion lines, diagonals. `windowRatio` scales the pane area within the bay.

**Spandrels:** `plain`, `chevron`, `stripes`.

These don't affect analysis. `windowRatio` still drives energy.

### 5.2 Ornaments (pick any)

Entry shape:

```ts
{ id, label, group, seenOn, blurb,
  placement: PlacementRule,
  template: Part[],                          // geometry in local units
  amount: { low: AmountRule, high: AmountRule },
  decorative: boolean,                       // dropped when amount = none
  stone: boolean,                            // adds weight
  minDetailLevel }
```

**Placement rules (shared):** `bay-lines`, `floor-rings`, `setback-corners`, `setback-faces`, `roof-edge`, `base-floors`, `entry`.

| Group | id | Placement | Low → High | Decorative | Stone |
|---|---|---|---|---|---|
| Vertical | stone-ribs | bay-lines, full height, stop at setbacks | every 2nd bay → every bay, deeper | no | yes |
| | ibeam-mullions | bay-lines | same, slimmer | no | no |
| | concrete-fins | bay-lines per floor (waffle) | shallow → 1.5 m | no | no |
| Horizontal | belt-courses | floor-rings every 10 floors | every 10 → every 5 | yes | yes |
| | setback-cornices | setbacks + roof edge | plain → doubled with dentils | yes | yes |
| | sunburst-bands | setback-faces | 1 → 3 per face | yes | no |
| | ribbon-bands | floor-rings every floor | same, wider | no | no |
| Corners & setbacks | pinnacles | setback-corners + roof corners | corners → corners + mid-faces | yes | yes |
| | deco-steps | setback-corners | 1 tier → 3 tiers | yes | yes |
| | gargoyles | setback-corners, pointing out | top setback → every setback | yes | yes |
| | urns | roof-edge + setbacks | sparse → dense | yes | yes |
| Base | rusticated-base | base-floors | 2 → 3 floors | yes | yes |
| | arched-entry | entry (front face centre) | single → triple arch | yes | yes |
| Structure | accent-ties | floor-rings every 10 floors, outermost | same, thicker | no | no |

**`activeOrnaments(design)`** returns the chosen ornaments minus the decorative ones when the amount is `none`. Both analysis and renderer use it. The Details panel explains in one line: "None keeps working parts like mullions and fins."

**Shapes:**
- Circle: bay-lines are radial and corners spread evenly.
- Triangle: 3 corners.
- Twist: each floor's parts rotate with the floor, so ribs spiral.

**Analysis effects:**
- Cost: facade cost × `ornamentFactor[amount]` × (1 + 0.02 × active ornament count).
- Weight: + `stoneOrnamentKNPerM2` (0.1) × amount multiplier (low 0.6, high 1, none 1 for non-decorative) per active stone ornament, added to `unitWeight`.

## 6. Scene architecture

```
src/sim/facade.ts               facadeRecipe(design) → { tile description, palette, material }; activeOrnaments(design)
src/scene/parts/types.ts        Part, PartShape, PartMaterial
src/scene/parts/placement.ts    perimeterPoints, setbackLevels, baseFloors, cornerPoints, faceCentres
src/scene/parts/PartsMesh.tsx   groups parts by (shape, material) → instanced meshes
src/scene/parts/materials.ts    shared materials: body, accent, glass, stone, copper (patina), gold, steel, foliage, light
src/scene/crowns/*.ts           stage builder + custom builders, by family
src/scene/ornaments.ts          ornamentParts(design)
src/scene/crownParts.ts         crownParts(design)
src/scene/facadeTexture.ts      tile description → canvas (colour, roughness, glow); cache
src/scene/FacadeMaterial.ts     MeshStandardMaterial + metre-UV and night-window shader patch
src/scene/silhouette.ts         parts → small SVG silhouette (for gallery icons)
```

- **Parts:** `Part = { shape: box | cylinder | cone | sphere | torus | wedge | lathe, position, rotation, scale, material }`.
- **Replacement:** `Building.tsx` keeps the body and slabs (now with `FacadeMaterial`). The `Crown` and `Bracing` components are replaced by `<PartsMesh parts={crownParts}>` and `<PartsMesh parts={ornamentParts}>`. Bracing uses the shape-aware placement helpers, which fixes the bounding-box braces on round and triangular towers.
- **Animation:** limited to wind-turbine rotors and blinking aircraft lights, via `useFrame`.
- **Budget:** a 170-floor tower with every ornament at amount high stays ≤ 40 draw calls and ≤ 20,000 relief instances.

## 7. Day / night

- **State:** `timeOfDay: 'day' | 'night'` in the store. It's view state: not in design history, not exported, and available in every phase.
- **Toggle:** a sun/moon button in the scene overlay.
- **Sky and light:** the night sky is deep blue, and directional light dims to cool moonlight.
- **Lit windows:** the window glow layer acts as an emissive map, gated per window by a deterministic hash of (floor, bay) against a lit fraction by use:

  | Use | Lit | Colour |
  |---|---|---|
  | Office | 40% | cool white |
  | Residential | 60% | warm |
  | Hotel | 60% | warm |
  | Retail | 90% | bright |

- **Crowns:** crown parts tagged `light` glow in the accent colour. Spires, masts and antennas get blinking red aircraft-warning lights.
- **Neighbors:** a simple lit-window glow, same hash approach.
- No effect on scores.

## 8. Sidebar UI

- **Form group:** the crown dropdown becomes **CrownGallery**: 5 family sections with auto-generated silhouette icons. Hover or focus shows label, "seen on" and the blurb, and the style's default carries a ★.
- **New Details group** (`ui/sidebar/DetailsControl.tsx`):
  - window pattern (icon choice)
  - spandrel (icon choice)
  - ornament icon grid (multi-select, grouped)
  - ornament amount (none / low / high) with the "None keeps working parts" note
- **Undo:** each change is one undo step, matching existing controls.
- **Style picker:** shows "modified" when crown or detail choices differ from the preset.
- **Generation:** controls are generated from the catalogs. New entries appear without UI changes.

## 9. Extensibility

- **New ornament:** a catalog entry choosing a placement rule and template, with no new code.
- **New crown:** a stage list, with no new code. If `custom: true`, the type system requires a builder.
- **New window pattern or spandrel:** a tile description.
- **Automatic pickup:** gallery, icons, normalization and the catalog-wide tests pick up new entries automatically. The future design chat's tool schema will be generated from the same catalogs.
- **Detail levels:** `minDetailLevel` on every entry, for a future 16+ level.

## 10. Testing

**Catalog-wide loops** (every crown and every ornament × shapes square/rectangle/circle/triangle × twist 0/120 × taper 0/0.6 × floors 5/170):
- no NaN in parts
- parts attached (within plate + relief depth)
- crown top within 5% of `crownHeight`
- instance budget holds

**`activeOrnaments`:** amount `none` removes every decorative ornament and keeps functional ones.

**Recipes:**
- `facadeRecipe` / style defaults: each preset produces its §3.2 values.
- Tile painter reads every description without error (jsdom canvas stub), and pane area grows with `windowRatio`.
- Night window pattern is deterministic (same inputs → same lit set) and lit fraction is within ±5% of target.

**Analysis:**
- stone ornaments increase weight and seismic demand slightly
- ornament count increases cost
- wind turbines reduce EUI ~5%
- `tipHeightM` > `heightM` only for non-official crowns

**Briefs:** all 8 still solvable by their reference designs and still failed by the default design, after the style default changes.

**Normalization:** unknown ids fall back to style defaults.

**UI:** CrownGallery and DetailsControl render, dispatch one undoable action per change, and show the ★ default.

**Visual check (manual, not in the suite):** a headless screenshot of each style by day and by night, reviewed before merge.
