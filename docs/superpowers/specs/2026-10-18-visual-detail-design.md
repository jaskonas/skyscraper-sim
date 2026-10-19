# Visual Detail — Design Spec (Plans 6–8)

Extends `2026-10-10-skyscraper-sim-design.md` (§9 "Procedural building") and builds on `2026-10-10-architectural-detail-design.md` and `2026-10-11-detail-window-design.md`. Roadmap position: Plans 6–8. The overlays and people plans move to 9 and 10.

> **How this was decided.** The user picked items 2, 3 and 4 from the "100× the visual detail" options, plus "more granular details on the towers themselves", and then switched to autonomous mode. The choices below are Claude's recommendations, made without a design conversation. Each one is marked **(assumed)** and is easy to change. The work stays on branches until the user reviews it.

## 1. Purpose

At city scale the tower is a box with a painted window texture: the panes have no depth, no rooms behind them and no reflections, and there is nothing on the roof or at the base. The goal is a tower that **reads as a real building at every zoom level**, while staying smooth on a Chromebook:

- **Mid and far:** depth behind the glass, recessed windows, sky reflections, and variety from window to window and floor to floor.
- **Close:** real 3D wall bays, reusing the Close-up window's builder.
- **Everywhere:** things on the tower — rooftop machinery, planted setback terraces, an entrance canopy and lobby, balconies, mechanical floors and smoother shapes.

**Out of scope:**
- Shadows, ambient occlusion, bloom and other post-processing (option 1, not chosen).
- Neighbouring buildings and street life (option 5, not chosen).
- Any change to the analysis.

## 2. The three plans

| Plan | What | Why in this order |
|---|---|---|
| **6 — Facade surface and granular detail** | Fake rooms behind the glass, recessed windows, sky reflections, window-to-window variety (blinds, lights, tints), mechanical floors, residential balconies | Everything else sits on the facade, so it comes first |
| **7 — Tower dressing** | Rooftop machinery, setback terraces with planters and trees, entrance canopy and lobby, parapets, smoother round towers, bevelled slab edges | New parts on the existing parts system; independent of 6 |
| **8 — Close-range 3D** | Floors near the camera are swapped for true 3D wall bays (the Close-up's `wallBay`) as you zoom in | Has to match 6's look, so it goes last |

The detailed design below is for **Plan 6**. Plans 7 and 8 each get a short design section here, and will get their own spec and plan when they are reached.

## 3. Plan 6 — Facade surface and granular detail

### 3.1 Rooms behind the glass (interior mapping)

**The technique:**
- Each window pane shows a **fake 3D room**, computed per pixel in the facade shader, with no extra geometry.
- The view ray is traced into an imaginary box behind the glass: one bay wide, one floor high, and **3 m deep (assumed)**.
- Whichever surface the ray hits first is shaded: the back wall, the side walls, the floor or the ceiling.

**What each room shows:**
- **Wall tint** by the floor's use (assumed):
  - offices: cool grey;
  - homes: warm beige;
  - hotel: cream;
  - shops: bright white.
- **A furniture band:** a darker band about 1 m tall along the back wall, drawn as the silhouette of desks or sofas.
- **Blinds:** about 30% of windows have them (assumed), covering 20–90% of the pane from the top in a light horizontal-slat pattern.
- **By day:** a few rooms are darker than others (lights off), which breaks up the uniformity.
- **At night:** the existing night-light pattern decides which rooms are lit. Lit rooms glow from inside in the floor's colour, so you see rooms with depth rather than flat panels.

**Determinism:** every choice comes from a hash of (floor, bay), using the same `windowHash` the night lights use. The same window looks the same every frame and matches the Close-up.

**Where it applies:**
- Only on the glass, as marked by the existing glow (glass) mask, and only on walls.
- Floor caps (top and bottom faces) are left alone.

### 3.2 Recessed windows

- The glass sits **0.3 m behind the wall face**, as in the Close-up's `GLASS_RECESS`.
- The shader shows this with one extra lookup of the glass mask, offset along the view direction by the recess depth (parallax):
  - where the offset lookup lands on wall, a **reveal** is drawn: the inside face of the opening;
  - the reveal is in the wall colour, darkened on the side away from the sun.
- From the side, windows visibly sink into the wall, and the frames and spandrels stand proud of them.

### 3.3 Sky reflections on glass

- Glass blends the room behind it with a **reflection of the sky** (the scene's sky colour, brightening toward the horizon).
- It uses a Fresnel term: you look into the rooms when facing the glass head-on, and see the sky at grazing angles, as real curtain walls do.
- **A sun glint:** a narrow highlight where the view direction mirrors the sun's.
- **At night** the reflection is the night-sky colour and much weaker, so lit rooms dominate.
- **Glass-heavy styles** (International, High-Tech, Neo-futurist) reflect more than punched-window styles, because the existing facade recipe's `metalness` and `roughness` are already per style.

### 3.4 Window-to-window variety

- **Glass tint:** each pane's tint varies slightly (±6% lightness, assumed), the "patchwork" look of real curtain walls.
- **Open or dark windows by day:** about 3% of panes (assumed) read as open or dark.
- **Blinds and room tints:** from 3.1.

### 3.5 Mechanical floors

- Towers of **40 floors or more** get a **mechanical floor** every 30 floors (assumed): floor indexes 29, 59, 89…
- A mechanical floor is drawn with **louvres**, horizontal slats in the frame colour, in place of windows. It has no rooms and no night lights.
- This matches real towers, where plant floors break up the facade, and Plan 9's "inside the tower" overlays will reuse these floors.
- **View only:** the analysis is unchanged, and their area still counts.

### 3.6 Residential balconies

- On floors whose use is **homes**, every other bay gets a **balcony**:
  - a 1.5 m-deep slab projecting from the wall;
  - a glass railing 1.1 m tall, with a metal top rail.
- Balconies are new parts, placed along each wall with the existing placement helpers, so they follow taper, twist and round plans.
- Balconies and the night lights stay consistent: a balcony bay's window is the same window the night lights use.
- **Speed:** a 150-floor all-homes tower with an 80 m round plate stays under **6,000 balcony parts** by placing them in runs of floors (as ornaments already do).

### 3.7 Performance and fallback

- **Shader cost:** a handful of extra arithmetic operations per facade pixel, two extra texture samples, and no extra draw calls.
- **Frame rate:** it must hold **≥ 30 fps** at 1366×768 on the headless software-render benchmark used in Plans 4–5. A test-side benchmark measures frame time against Plan 5's baseline, with a budget of **+25%** (assumed).
- **New setting:** a view-only **Facade detail: High / Simple** setting in the store, like day/night.
  - *Simple* turns off the rooms, parallax and reflections and is today's look.
  - The default is High (assumed).
  - It lives as a small toggle in the scene overlay.

### 3.8 Testing

**Pure helpers:**
- Room-tint choice by use.
- Blinds and dark-window hashing: deterministic, with the right shares over many windows.
- Mechanical-floor indexes.
- Balcony placement: count, use, staying inside the wall's bounds, and following round plans.

**Shader:**
- The patched shader compiles under three.js (test renderer).
- The uniforms and attributes are present.
- *Simple* mode produces the original shader program key.

**Night parity:**
- A room is lit exactly when the existing `windowLit` says so.
- Mechanical floors never light.

**Speed and screenshots:**
- The balcony part budget.
- Headless screenshots of all 8 styles, day and night, at mid and close range.
- Before/after comparisons; the frame-time benchmark.

## 4. Plan 7 — Tower dressing (outline)

- **Rooftop machinery:**
  - cooling towers, an HVAC penthouse box, and water tanks (wooden tanks on Chicago School or Art Deco towers in New York, assumed);
  - a window-cleaning crane on a rail around the roof edge;
  - antennas and aircraft lights, on roofs without a tall crown.
- **Setback terraces:** planters, small trees, railings and paving on every setback ledge.
- **The base:**
  - an entrance canopy;
  - revolving doors;
  - a double-height lobby with a visible reception desk and lights;
  - planters and bollards on the sidewalk strip.
- **Shape quality:**
  - round towers at 48 segments instead of 24;
  - bevelled slab-edge bands;
  - parapets with a coping.
- **All of it as parts,** respecting the Ornament amount setting (None removes the decorative items, but not the machinery).

## 5. Plan 8 — Close-range 3D (outline)

- As the camera comes within about 120 m of the facade (assumed), the floors nearest the camera are rebuilt as true 3D wall bays, using `wallBay` from the Close-up. The swap happens in chunks of 4 floors × 6 bays.
- Chunks fade in to avoid popping. Far floors keep the shader facade from Plan 6.
- **Budget:** at most about 3,000 extra parts at once, built in under 8 ms per chunk, with chunks created and destroyed as the camera moves.
- **Matching:** the windows, rooms and night lights must match Plan 6's shader exactly. The same hashes are shared through one module.
