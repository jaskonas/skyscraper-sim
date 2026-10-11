# Detail Window — Design Spec (Plan 3)

Extends `2026-10-10-skyscraper-sim-design.md` and `2026-10-10-architectural-detail-design.md`. Roadmap position: Plan 3 (§13 of the base spec).

## 1. Purpose

At whole-tower scale a window bay is a few pixels wide, so changes to window pattern, spandrels and ornaments are hard to see. That loses the style lesson. A small **detail window** shows parts of the facade up close, in true 3D, at real scale, and updates live as the player edits.

**What the user asked for:**
- An inset in the 3D view with buttons for **Facade**, **Corner** and **Base** views. The crown is not needed; the main view shows it well enough.
- A dedicated high-detail model, not a second camera on the low-poly tower.
- A framed camera with a gentle drag to look around.

**Assumptions (agreed):**
- Live updates.
- Follows day/night.
- Does not replace the main view.
- Cheap enough for a Chromebook.

**Out of scope:** crown close-up, zoom, free orbit, interiors beyond a hint of a room behind the glass, and any analysis changes.

## 2. Views

Each view builds only its own piece of the tower, at the real size and position the design gives it.

| View | Piece | Contents |
|---|---|---|
| **Facade** | 4 floors × 5 bays, centred on the front face, from the middle of the tallest run between setbacks (`floorRuns`). | Wall panels with openings, recessed glass (0.3 m), frames and mullions, sills, spandrel panels with relief motif, projecting slab edges, and active `bay-lines` and `floor-rings` ornaments at true size. |
| **Corner** | The corner at the highest setback level: 2 floors below the step and 1 floor above, with the ledge. With no setbacks, the roof corner: 2 floors below the roof plus the parapet. | The same wall build on both faces meeting at the corner, plus active `setback-corners`, `setback-faces` and `roof-edge` ornaments for that level, and the cornice/ledge. |
| **Base** | The bottom 3 floors (or fewer on a shorter tower), front face centre, about 5 bays wide. | The same wall build, plus active `base-floors` and `entry` ornaments, lobby glass on the ground floor, a 4 m sidewalk strip, and 3 person figures (1.7 m) for scale. |

**Matching the tower:**
- **Shape:** the section uses the real floor slices. Width, taper and setbacks come from the design. On a round plan the wall section follows the curve. Each floor uses its own twist rotation relative to the view's middle floor, so twist shows as a slight skew between floors.
- **Caption** (one line under the view):
  - Facade: `Floor 18 · Offices · Chicago windows · Deco chevrons`
  - Corner: `Setback at floor 32 · Pinnacles, Gargoyles`, or `Roof corner · …`
  - Base: `Ground floor · Arched entry, Rusticated stone base`, or `· no base ornaments`.

## 3. Building the model

A pure function `detailModel(design, view): DetailModel` in `src/scene/detail/`:

```ts
interface DetailModel {
  parts: Part[];               // rendered with the existing <PartsMesh>
  windows: DetailWindow[];     // one per pane, for night lighting
  focus: { target: Vec3; distance: number; yaw: number; pitch: number }; // framed camera
  caption: string;
}
interface DetailWindow { part: Part; floor: number; bay: number; lit: boolean; color: string }
```

**Coordinates:** parts are in a local frame with the section centred at the origin. The facade or front face points along +z.

**Wall build:** one function per bay per floor, driven by the catalog's `WindowPatternDef`:
- **Opening:** `openingFor(windowRatio)`, shared with the painted tile, so both views agree.
- **Panes:** each `PaneDef` becomes a glass `box`, recessed 0.3 m. Arched patterns add a `wedge` pair for the pointed head.
- **Frame and mullions:** thin boxes around each pane and between panes, at `frame × bayWidth` thickness, projecting 0.08 m. Diagonal patterns add struts across the opening.
- **Wall:** the panels around the opening are built from 4 boxes (above, below, left, right), not by cutting holes.
- **Spandrel:**
  - `chevron` makes 6–8 thin tilted strips in accent colour.
  - `stripes` makes 2 raised bands.
  - `plain` makes a flat panel.
- **Slab edge:** a 0.6 m band projecting 0.1 m in accent colour, matching the main tower's slab bands.

**Ornaments:**
- `ornamentParts` already places every ornament for the whole tower in building coordinates. The detail builder keeps only the parts whose bounds intersect the section's box, then moves them into the local frame. Placement, amounts, Ornament amount "None" and new catalog entries therefore all match the main tower automatically.
- Corner-placed ornaments only appear in the Corner view, because only that view's box contains a setback corner.

**Night:**
- Each pane gets `lit = windowLit(bay index on that face, floor index, NIGHT_LIGHTS[use].lit)` and that use's colour, matching the main tower's shader for the same floor and bay.
- `DetailWindow` carries `lit` and `color`. The renderer gives lit panes an emissive material.
- A dark "room" box 2 m deep sits behind every pane. It is dimly lit when the pane is lit.

**Scale figures (Base):** each person is a capsule-like stack of a cylinder and a sphere, in a neutral colour.

## 4. Inset UI

`src/ui/DetailInset.tsx`, positioned in the 3D view's overlay, bottom-right:

- **Layout:** about 320×240 px (smaller on narrow screens).
  - A title row with three buttons, **Facade · Corner · Base**, using `aria-pressed`, and a **minimize** button.
  - The canvas.
  - The caption.
- **State:** the view and minimized flag live in local component state, remembered for the session via `sessionStorage` wrapped in try/catch. It starts minimized when the window is narrower than 900 px.
- **Canvas:**
  - An R3F `<Canvas frameloop="demand">`, so it renders only on change: design, view, night, drag or resize.
  - Its own lights, mirroring the main scene's day/night `lighting()`.
  - The background follows the site sky, or the night sky.
- **Camera:** framed from `model.focus`. Pointer drag adds yaw ±30° and pitch ±15°, with no zoom. On release it eases back to the framed angle over about 0.4 s, invalidating frames only while moving.
- **Failure:** if WebGL is unavailable, show "Close-up needs 3D graphics." The main view is unaffected.

## 5. Performance

- **Size:** a Facade section is about 20 bays × (panes + frames + wall + spandrel) ≈ 600–1,500 parts. Corner and Base views are similar.
- **Speed:** `detailModel` must run in under 20 ms for the worst case: 150 floors, every ornament, round plan, with ornament filtering included. A test pins this.
- **Draw calls:** parts render through `PartsMesh` instancing, under 30 draw calls.
- **Idle cost:** zero GPU work while idle (`frameloop="demand"`).

## 6. Testing

- **Catalog loops:** every window pattern × spandrel × plan shape × the two extreme towers × 3 views. Parts are finite, inside the section box (plus 3 m of ornament reach), and the facade pane count = panes per bay × bays × floors.
- **Responds to choices:** changing window pattern, spandrel, window ratio or any ornament changes the model for the view that shows it. Ornament amount None removes decorative ornaments.
- **Placement:**
  - Corner uses the highest setback, or the roof with no setbacks.
  - Base includes entry and rusticated parts only when chosen.
  - Base has 3 people, each 1.7 m tall.
- **Night parity:** a pane's `lit` equals `windowLit(bay, floor, share)` for the same use.
- **Captions:** they name the floor, use, pattern and spandrel, or the corner/base ornaments.
- **UI:**
  - The inset renders, the buttons switch views, the caption updates, and minimize works.
  - Narrow screens start minimized.
  - It still shows in the complete phase.
- **Speed test:** as in §5.
- **Visual check:** headless screenshots of all 3 views for all 8 styles, by day and night; then the user's own look.
