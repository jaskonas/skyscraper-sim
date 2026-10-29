# Zones: Paint the Stack — Design Spec (Plan 14)

Extends `2026-10-10-skyscraper-sim-design.md` §6 ("Design model") and §8 ("Scoring"). Roadmap position: Plan 14. People moves to Plan 15 and design chat to Plan 16.

## 1. Why

**What the user wants, in their words:** their son is "very interested to expand the usage feature, and to be able to specify which zones of the building are e.g. retail, residential, hotel, etc." They asked for mechanics that make this "interesting and appealing", and said "sounds good" to my recommendation: build **paint the stack**, **fit ratings** and **rent and profit** together as one plan, and leave neighbours, systems effects, the living tower and special floors for Plan 15 (people) or later.

**Who it is for:** the son, on a Chromebook (touchpad and touch).

**What he can't do today:** four sliders (shops, offices, hotel, homes) set percentages, and the game always stacks them in that fixed order from the street up. He can't put the hotel on top, have shops at the street and on a sky deck, or learn why towers stack the way they do.

**The idea underneath (my call):** every use wants a different kind of floor. Offices want deep floors, hotel rooms and homes want to be near a window and high up, and shops want the street. A tapered tower has deep floors at the bottom and slim floors at the top, which is why real supertalls such as the Hancock Center, Burj Khalifa and Shanghai Tower put offices low and hotels and homes high. He should be able to discover this by moving zones around and watching the ratings and the money change.

## 2. Goals, non-goals, anti-goals

**Goals:**
1. **Paint the stack.** He can split the tower into zones (bands of floors), choose each zone's use, drag the boundaries between zones, move zones up and down, and add or remove zones. A use can appear more than once, for example shops at the street and shops on floor 80.
2. **Fit ratings.** Each zone gets 👍, 😐 or 👎 and a one-line reason he can act on, in his tower's numbers.
3. **Rent and profit.** The tower earns money every year depending on each zone's use, height and fit, and on the city. A "pays for itself in N years" figure appears next to the build cost.
4. **Seeing it.** The tower in 3D follows his zones, as it does now for balconies, AC units and night windows. A **🏷️ Zones** view shows the zones as coloured bands on the ghosted tower, with their fit emoji.
5. **Scoring.** There is a new sandbox grade, **Value**, based on the payback years, new brief requirements for payback and "no 👎 zones", and one new brief that teaches stacking.

**Non-goals:**
- Neighbour rules, systems effects (water use, rush hours), the day-and-night living tower, and special one-off floors such as a gym or school. These belong in Plan 15 (people) or later.
- Changing the existing engineering checks. Wind comfort already uses the top floor's use, so reordering zones now matters there for free.
- Importing designs. There is only export today.

**Anti-goals:**
- **Fiddly on a touchpad.** Every edit must also work with buttons, with no drag needed.
- **A spreadsheet.** He sees emoji, colours, floor numbers and one money figure. No tables of rents.
- **Wrong lessons.** Ratings and money must point the way real towers go: offices low on deep floors, hotels and homes high on slim floors, shops at the street.
- **Breaking old designs.** Briefs, tests and the default design must still produce the same towers in the default order.

## 3. Design model

- **Replace `useMix`** (four percentages in a fixed order) with `stack: UseBand[]`, ordered bottom to top.
  - Each band is `{ use: UseType; share: number }`, where `share` is a percentage of the floors.
  - Shares are normalized when read, so bands keep their proportions when the floor count changes.
- **Limits (my call):** 1 to 6 bands. Adjacent bands with the same use merge. A band always covers at least 1 floor after rounding, unless the tower has fewer floors than bands.
- **Floor assignment:** `floorUses(design)` keeps its current midpoint rule, applied to the stack in order, so a stack made from an old mix in the old order produces the same floors as today.
- **New helper, `bandFloors(design)`:** returns `{ use, from, to, index }[]` with whole floor numbers, for the UI, fit and income.
- **Migration helper, `stackFromMix(mix)`:** turns an old four-percentage mix into a stack in the old order, dropping zero shares. Briefs' reference designs and tests use it, so existing towers stay the same.
- **Actions:** `set_use_mix` is replaced by:
  - `set_stack` (a whole new stack), validated against the limits above and against unknown uses;
  - small editing helpers that return a new stack (move a boundary, move a band up or down, set a band's use, add, remove), used by the UI.
- **Export version** goes from 1 to 2.
- **Unchanged:** `useShares(design)` keeps its signature (the total share per use) for briefs, analysis and cost.

## 4. Fit ratings

Each band is rated on three factors. The band's rating is its **worst** factor, and its reason line comes from that worst factor.

**1. Floor depth** (the lease depth, the distance from the core to the windows):
- For each floor, depth = 0.35 × min(width, depth) of that floor's slice. This matches the drawn core of 0.3 × the plate.
- The band uses the average over its floors.

| Use | 👍 range | 😐 up to |
|---|---|---|
| Offices | 9–18 m | 22 m, or down to 7 m |
| Hotel | 5–10 m | 13 m |
| Homes | 6–12 m | 15 m |
| Shops | any depth of 6 m or more | — |

Outside 😐 is 👎. Example reasons: "Hotel rooms 14 m from the windows would be dark. Hotels like slim floors (under 10 m deep)." and "Offices up here are only 6 m deep, too narrow for desks."

**2. Height:**
- Shops not touching the street (`from > 0`) get 😐 "Shoppers won't ride up to floor 40 without a reason." With an observation deck they get 👍 "Visitors to the observation deck shop on the way down."
- Hotel or homes starting below floor 5 get 😐 "Street noise and no view down here."

**3. Size (my call):** a hotel band of fewer than 5 floors gets 😐 "Too small for a hotel: it needs at least 5 floors for its own lobby and staff."

All numbers live in `COEFFICIENTS.zones`, and all wording lives in a catalog file (`src/sim/catalog/zones.ts`), like the forces and systems catalogs.

**Calibration checks (must hold, and are tested):**
- On the default 40 m square tower (depth 14 m): offices 👍, homes 😐, hotel 👎.
- On a 30 m pencil tower (10.5 m): homes 👍.
- On a tapered tower (60 m base, taper 0.5): offices at the bottom 👍 or 😐, and hotel or homes at the top 👍.

## 5. Rent and profit

- **Yearly income:** sum over the bands of area × base rent per m² × height premium × fit multiplier × city market factor.
- **Base rent** ($/m²/yr, my call, simplified real ratios): offices 220, homes 200, hotel 240, shops 260.
- **Height premium:**
  - homes and hotel: +1% per floor, up to +80%;
  - offices: +0.3% per floor, up to +30%;
  - shops at the street: none;
  - shops up high: only with an observation deck.
- **Fit multiplier:** 👍 1.0, 😐 0.8, 👎 0.55.
- **City market factor** (per site and per use, my call, small and tested):
  - New York: homes 1.3, offices 1.2, hotel 1.1, shops 1.2;
  - Tokyo: offices 1.15, hotel 1.0, homes 0.95, shops 1.1;
  - Chicago: about 1.0;
  - Shanghai: 0.7, with hotel 0.8.
  - These sit roughly in line with each site's `costMultiplier`, so payback isn't decided by the city alone.
- **Payback years** = `analysis.cost.total / incomePerYear`, rounded to 1 decimal. A typical good tower lands at 15–25 years.
- **Analysis:** a new `analysis.value` holds `{ bands: { use, from, to, fit, reason, incomePerYear }[], incomePerYear, paybackYears }`.
- **New sandbox grade, Value:** payback ≤ 15 years A, ≤ 20 B, ≤ 26 C, ≤ 34 D, otherwise F.

## 6. UI

**The Uses group in the sidebar becomes a stack editor:**
- **The strip:** a vertical strip about 260 px tall, with bands drawn in proportion, bottom to top, in one colour per use (shops amber, offices blue, hotel purple, homes green, my call). Each band shows its use emoji (🛍️ 🏢 🛎️ 🏠), its floor range ("Floors 1–12", counted from 1), and its fit emoji.
- **Boundaries:** the line between two bands is a handle he can drag. It snaps to whole floors. It is also a keyboard slider (`role="slider"`, the arrow keys move it one floor) with a clear label.
- **Selecting a band** (click or tap) opens a small panel under the strip with:
  - a use picker (four big buttons);
  - **▲ Move up** and **▼ Move down**, which swap it with its neighbour;
  - **Remove** (disabled for the last band);
  - its fit line and its yearly income.
- **+ Add zone** splits the selected band in half, or the top band when none is selected. The upper half gets the first use (in the order shops, offices, hotel, homes) that differs from both that band and the band above it, so it never merges straight back. Disabled at 6 bands.
- **The money card** sits under the strip: "Earns about $38 M a year. Pays for itself in 22 years."
- **Edits** go through the store's `dispatch` with coalescing while dragging, so undo treats one drag as one step, matching the sliders today.

**The 🏷️ Zones view in 3D:**
- A new button joins the systems row, exclusive with the systems and the forces in the same way.
- The tower ghosts, as in Plan 13. Each band is drawn as a translucent coloured block following the floor slices, with a floating label: emoji, use and fit emoji.
- The selected band in the sidebar is highlighted in the scene.
- The technique is the builder's choice (Plan 13's `useGhost` and part meshes are available).
- Budget: under 10 extra draw calls.

## 7. Briefs

- **New requirement kinds:**
  - `maxPaybackYears`, labelled "Pays for itself in N years or less";
  - `noBadFit`, labelled "No 👎 zones", with a detail line naming the first 👎 zone.
- **New Chicago brief, "Stack It Right":**
  - Client: a lakefront developer.
  - Required: structural; at least 90 floors; offices ≥ 30%; homes ≥ 30%; shops ≥ 5%; `noBadFit`.
  - Bonus: payback ≤ 25 years; observation deck.
  - Lesson: "Offices like deep floors low down; homes like slim floors and views up high. That's why the Hancock Center tapers."
  - The reference design must earn at least one star (tested).
- **Existing briefs** keep their requirements. Their reference designs convert with `stackFromMix`.

## 8. Testing

- **Pure, tested functions:**
  - `bandFloors`, `floorUses` (old-order equivalence), `stackFromMix` and the stack edit helpers (limits, merging, minimum one floor);
  - validation of `set_stack`;
  - fit for each factor, including the calibration checks in §4;
  - income and payback, including the city factor;
  - the Value grade and the new requirement kinds;
  - the new brief's reference design earns a star.
- **UI tests:** the strip renders the bands; the keyboard slider moves a boundary; select, change use, move, remove and add all work and are each undone in one step.
- **Store:** the Zones view is exclusive with forces and systems, resets on a new project, and is hidden while building.
- **Visual check** with headless screenshots:
  - the default tower, a mixed 100-floor tapered tower, and a tower with shops at the street and on a sky deck;
  - the Zones view by day and by night;
  - the sidebar strip at Chromebook width.

## 9. Left to the builder

- The exact strip drawing and drag code (pointer events, touch-action).
- The 3D zone-block technique and label rendering.
- Colours.
- Where `analysis.value` is computed (a new `analysis/value.ts` is expected).
- Splitting the work into tasks.
