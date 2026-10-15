# Skyscraper Sim — Design Spec

**Date:** 2026-10-10
**Status:** Draft for review

## 1. Purpose and audience

A teaching game for the user's son (target age 12–15) about how skyscrapers are designed and built. The player designs one tower at a time on a real-city-inspired site, watches it get built, then inspects how it performs.

**Success criteria**
- Results are *directionally correct* (e.g., dampers reduce sway, base isolation helps in earthquakes, shallow foundations fail on soft clay) with plausible ballpark numbers. Precise simulation is a non-goal.
- No computationally intensive simulation (no CFD, FEA, or physics engine). All engineering is closed-form rules of thumb.
- The design should be extensible to an age 16+ "advanced" detail level by editing data, not rewriting code.

**Non-goals**
- Cumulative progression, unlocks, or campaign. Every project stands alone.
- Collapse or destruction animations. Failure is expressed as a failed engineering assessment and poor score.
- Random weather events during construction.
- Hosting, accounts, multiplayer, mobile support.

## 2. Platform and stack

- Runs locally in a desktop browser. Started with a single `npm run dev`.
- **Vite + React + TypeScript**, **react-three-fiber** (Three.js) for 3D, **Zustand** for state, **Vitest** for tests.
- *(Future iteration — see §11)* Anthropic API key lives in a local `.env` file (`ANTHROPIC_API_KEY`), read only by a Vite dev-server middleware. The key never reaches the browser.
- *(Future iteration)* LLM: **Claude Sonnet 5.5** (`claude-sonnet-5-5`), configurable in one place.

## 3. Game flow

1. **Site select.** World map with four pins. Each shows the site's key challenge and a real-world fact. Player chooses a site, then **Challenge** (pick one of the site's briefs) or **Sandbox**.
2. **Design.** 3D view of the lot. Live procedural preview of the tower. Sidebar holds brief, gauges, and design controls. (The design chat is a future iteration — §11.)
3. **Build.** Player presses Build; design locks. Animated construction sequence of 3–4 minutes at 1× speed, with pause, 1×/2×/4×, free orbit camera, and a phase timeline showing day and money spent.
4. **Complete.** Engineering assessment is shown. Overlay toggles become available (structure, elevators, electrical, plumbing, HVAC, wind, earthquake, people).
5. **New project** returns to site select. Optional: export the design as a JSON file. Nothing carries over.

## 4. Architecture

```
src/sim/      catalog, sites, briefs, styles, design model, analysis, construction schedule, people agents  (pure TS, no UI deps, unit-tested)
src/state/    Zustand store: current site/mode/brief, design history (undo/redo), phase, overlay toggles, chat log
src/ui/       React sidebar: header, brief card, gauges, generated controls, overlay toggles, build controls, design chat; site-select screen; assessment panel
src/scene/    react-three-fiber: site & neighbors, soil cutaway, procedural building, construction animation, overlays
server/       (future iteration) Vite middleware: POST /api/design-chat → Claude with catalog-generated tools
```

**Key principles**

- **Single catalog as source of truth.** Every design parameter, component, amenity and style preset is defined once in `src/sim/catalog/` with: id, group, type/range/options, units, default, cost and physics coefficients (with explanatory comments), kid-level explanation, advanced explanation, and `minDetailLevel` (`"standard"` | `"advanced"`). Sidebar controls, tooltips, LLM tool schemas and action validation are all generated from the catalog.
- **Instant analysis vs. time-based sims.** `analyze(site, design) → Analysis` is a pure function re-run on every design change. Construction playback and people agents are time-stepped inside the render loop on plain mutable data held outside React state, to avoid re-render overhead.
- **Immutable design history.** Every change (slider or LLM) produces a new design snapshot. Undo/redo is a pointer into the history. An LLM batch of actions is a single history step.
- **Detail level** is a store setting (`standard` for v1; `advanced` reserved). UI and outputs filter by `minDetailLevel`; advanced additionally shows real units on all outputs.

## 5. Sites

Each site defines: name, real-city inspiration, lot dimensions, height limit (if any), neighbor-building style, landmark silhouette, sky/lighting, soil profile (layers with depth and bearing capacity, depth to bedrock, water table), design wind speed, seismic hazard, climate (heating and cooling demand), and city cost multiplier.

| Site | Inspired by | Key challenges | Look-up towers |
|---|---|---|---|
| Downtown infill | New York (Midtown / Billionaires' Row) | Tiny lot, slenderness, setback rules, shallow bedrock | 432 Park Ave, Steinway Tower, Chrysler, Empire State |
| Earthquake city | Tokyo | High seismic hazard, typhoon winds | Tokyo Skytree, Mori Tower |
| Frozen north | Chicago | Cold winters, snow load, strong lake winds, soft clay over deep bedrock (caissons) | Willis Tower, 875 N. Michigan (Hancock) |
| Riverbank clay | Shanghai | Very deep soft clay, high water table, settlement | Shanghai Tower, Jin Mao |

Weather is **climate only**: it enters as each site's design conditions (wind speed, seismic hazard, snow, heating/cooling demand). No random events.

## 6. Design model

A `Design` is a plain serializable object. Standard-level controls:

**Style** — choose a preset; all fields below remain editable. Badge shows "<Style>" or "<Style> (modified)". v1 presets: Chicago School, Gothic Revival, Art Deco, International Style, Brutalist, Postmodern, High-Tech, Neo-futurist. Each preset has a history card (era, ideas, real examples, preferring examples in the current site's city) and sets: plan shape, setbacks, taper, twist, crown, facade type, window-to-wall ratio, exposed structure, color palette, ornament level.

**Form** — floors; floor plate size (bounded by lot); plan shape (square, rectangle, circle, triangle); setbacks (none, few, wedding-cake); taper (0–max); twist (0–max degrees over height); crown (flat, spire, stepped, pointed, sloped).

**Use** — floor bands, each assigned office, residential, hotel or retail.

**Structure** — system (rigid frame, core + outriggers, framed tube, bundled tube, diagrid, buttressed core); material (steel, concrete, composite); exposed exterior structure (on/off); damping (none, tuned mass damper, viscous dampers); base isolation (on/off).

**Foundation** — shallow mat, raft, piles, caissons to bedrock.

**Facade** — glass curtain wall, stone/masonry, precast concrete, metal panels; window-to-wall ratio.

**Elevators** — number of cars; zoning (single zone, low/high zones, sky lobby + express).

**Building systems** — systems grade (standard, efficient, green). (Advanced: split into HVAC, electrical, water.)

**Amenities** — helipad, rooftop pool, observation deck, sky garden, spire. Each has cost, weight at height, and possible brief bonuses.

**Advanced-level additions (reserved, not built in v1):** floor-to-floor height, column spacing, double-deck elevators, glazing U-value, separate MEP systems, real units everywhere.

## 7. Analysis (rules of thumb)

`analyze(site, design)` returns:

- **Weight** — floor area × floors × (material + facade unit weights) + amenities.
- **Wind** — load ∝ site wind speed² × frontal area × height factor × shape factor (round/taper/setbacks/twist reduce it; exposed bracing does not). **Sway** = load ÷ stiffness (system × material × outriggers × exposed bracing), reduced by damping. Two checks: *strength* and *occupant comfort* (top-floor acceleration proxy).
- **Earthquake** — demand ∝ weight × site hazard; reduced by base isolation, damping and ductile systems; increased by heavy masonry, irregular/asymmetric massing. Outcome: survives / survives with damage / fails.
- **Foundation** — load ÷ capacity of chosen foundation in this soil → pass/fail plus settlement estimate.
- **Elevators** — peak morning demand from use bands vs. car capacity and zoning → average wait; office target ≈ 30 s.
- **Energy** — facade × window ratio × climate × systems grade → annual operating cost and sustainability score.
- **Cost** — structure + foundation + facade + elevators + systems + amenities, × city multiplier.
- **Schedule** — from floors, material (steel faster; concrete cheaper) and foundation complexity. Produces per-phase durations used by the construction animation.

Each check yields Pass / Marginal / Fail plus a one-sentence plain-language explanation, e.g. "❌ Failed structural engineering assessment: at 70 floors on soft clay, a shallow mat foundation would settle about 40 cm."

All coefficients live in the catalog with comments explaining the real-world idea they approximate.

**Style effects are emergent**, not special-cased: they come through the form and facade fields the preset sets (setbacks reduce wind, glass raises cooling and heating load, masonry adds weight, exposed bracing adds stiffness, twist reduces vortex shedding).

## 8. Scoring

- **Live gauges** during design: budget, sway, quake, foundation, elevator wait, energy.
- **Assessment** after construction: every check listed with ✅ / ⚠️ / ❌ and explanation.
- **Challenge mode:** brief requirements evaluated against the analysis; 1–3 stars (1 = all hard requirements met; 2–3 for bonus targets such as under budget or a sustainability target).
- **Sandbox mode:** letter grades (A–F) for Safety, Cost, Comfort, Efficiency, Sustainability.

**Briefs (8 in v1):**
- New York: super-slender residential on a tiny lot · Art Deco office respecting Midtown setbacks
- Tokyo: office tower fully operational after a major quake · distinctive landmark hotel
- Chicago: lakefront office with tight sway comfort limits · mixed-use tower with a green-energy target
- Shanghai: supertall mixed-use on deep clay · fast-schedule office on a tight budget

A brief defines: client blurb, required use mix, floor/height minimums, budget, hard requirements (map to analysis checks), bonus targets, optional style requirement.

## 9. 3D scene

- **Site:** low-poly lot, procedural neighbors in a city-appropriate style, ground plane, landmark silhouette on the horizon, site-specific sky and lighting (Chicago wintry with snow on the ground), soil cutaway in front of the lot showing layers and the foundation reaching into them.
- **Procedural building:** each floor extruded from plan shape with per-floor taper, setbacks and twist; crown and amenities on top; facade materials/patterns per style (mullion grid, punched windows, ribbed concrete, Art Deco trim); exposed bracing lattice for High-Tech. Flat-shaded low-poly.
- **Construction animation:** phases from the schedule — excavation → foundation → core climbing → frame rising (core leads the frame) → facade following → crown & amenities → landscaping/opening. Climbing tower crane, trucks, timeline bar (phase, day, money spent). Total ≈ 3–4 min at 1×.
- **Overlays (completed building; facade ghosts when an internal overlay is active):**
  - Structure — core, columns, outriggers, bracing, damper; colored by utilization.
  - Elevators — shafts colored by zone; moving cars.
  - Electrical — utility feed → transformers → risers → floors; backup generators.
  - Plumbing — mains → pumps → tanks every ~30 floors (pressure zones) → risers.
  - HVAC — mechanical floors and supply risers.
  - Wind — arrows from prevailing direction, exaggerated sway (×50, labeled), top-floor sway readout, eddies (stronger behind blunt shapes).
  - Earthquake — shake-table ground motion and building response; base isolation visibly decouples.
  - People — capsule agents across an accelerated day: morning arrival, lobby queues, elevator rides, lunch, evening exit. Lobbies glow red when waits are bad.

## 10. Sidebar UI

Top to bottom: header (site, mode, phase) → brief card with live requirement status → gauges → collapsible design-control groups generated from the catalog (ⓘ tooltips) → overlay toggles and build/speed controls (contextual by phase) → *(future iteration)* design chat (log + text box) pinned at the bottom.

## 11. Design chat (LLM) — future iteration

> **Deferred.** Not part of the current roadmap (§13). Kept here as the agreed design for when it is picked up. Everything it needs already exists: catalog-driven parameters, `applyActions` validation, phase locks, and undoable history.

- Client sends: message, recent chat history, current design, current analysis, phase, site, brief, detail level.
- Server (`/api/design-chat`) calls Claude with:
  - System prompt: friendly engineering mentor for a 12–15-year-old; explains each change and its tradeoffs using the building's actual numbers; answers questions; kindly refuses anything not in the catalog and explains why; never invents physics.
  - Tools generated from the catalog: `set_parameter`, `apply_style_preset`, `add_amenity`, `remove_amenity`, `set_use_bands`.
- Client validates every returned action (known id, value in range/options, allowed in current phase). Valid actions apply as one undoable history step. Chat shows reply, list of changes, and ↩ Undo.
- During Build and Complete phases, design-changing actions are refused with a friendly message; questions still work.

**Errors:**
- Missing API key → clear setup message in the chat panel; the rest of the game is fully playable.
- Network/API failure → "The design assistant is unavailable — you can still use the controls."
- Invalid actions → dropped and reported ("I couldn't apply X"); valid ones in the same batch still apply.

## 12. Testing

- **Analysis unit tests** for each rule's direction, e.g.: adding a damper reduces sway; base isolation reduces quake damage in Tokyo; a shallow mat fails on Shanghai clay at 60+ floors; caissons pass in Chicago; setbacks/taper/twist reduce wind load; more elevator cars reduce wait.
- **Brief solvability tests:** each brief has a reference design that earns ≥1 star and a naive design that fails.
- **Catalog/validation tests:** generated tool schemas match the catalog; out-of-range and unknown actions are rejected; phase locks enforced.
- **Style preset tests:** every preset produces a valid design and a non-degenerate building mesh.
- **Scene smoke test** (renders without throwing) plus manual playtesting.
- *(Future iteration)* Server middleware tested with a mocked Anthropic client.

## 13. Roadmap

1. **Plan 1 — Core sim and design screen.** Done (merged 2026-10-10).
2. **Plan 2 — Architectural detail.** Done (merged 2026-10-10). Style-driven facades, 28-crown catalog, ornament controls, day/night toggle. Separate spec. Deployed to GitHub Pages (www.jaskonas.com/skyscraper-sim/).
3. **Plan 3 — Detail window.** Done (merged and deployed 2026-10-13). A close-up inset (Facade / Corner / Base) built at real scale in true 3D. Spec: `2026-10-11-detail-window-design.md`.
4. **Plan 4 — Construction animation.** Done (merged and deployed 2026-10-13). The Build phase as six step-by-step stages driven by `analysis.schedule`, with a skeleton tailored to each structural system and material, a climbing crane, site vehicles and the dig in the soil cutaway. Spec: `2026-10-13-construction-animation-design.md`.
5. **Plan 5 — Overlays and people simulation.**
6. **Future iteration — Design chat (LLM).** §11. Text box at the bottom of the sidebar; Claude turns requests into catalog actions and explains tradeoffs.
