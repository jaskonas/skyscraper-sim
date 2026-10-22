# Skyscraper Studio

A teaching game about designing and building skyscrapers. Pick a real-city site, design a tower, build it, and see how it performs.

## Run it

    npm install
    npm run dev

Then open the printed `http://localhost:5173` link.

In the game, the **🔍 Close-up** window (bottom-right of the 3D view) shows a piece of the tower in full detail. Use **Facade**, **Corner** and **Base** to switch, and drag to look around.

Pressing **Build it!** builds the tower one stage at a time: digging, the foundation, the core and frame, the facade, the crown, then the interiors. Each stage explains what is happening and how it goes for your tower; press **Next** to move on, or **Skip to finished**. The bare structure you see while it rises depends on the structural system and material you chose.

**💨 Wind** and **〰️ Earthquake** (bottom-left of the 3D view) show those forces acting on your tower, while you design or after it is built: the tower sways (drawn much bigger than real), the ground shakes, and dampers and base isolation visibly do their jobs. The card beside them explains what you are seeing with your tower's own numbers.

Up close, the glass sits back from the wall, reflects the sky and varies from pane to pane, with blinds pulled here and there. Homes get balconies and tall towers get louvred plant floors every 30 floors. The sun casts real shadows — ledges, fins, bracing and balconies shade the walls, and buildings shade the street — and the ground darkens softly where buildings meet it. If your computer struggles, turn **☀️ Shadows** off, or switch **✨ Detail** to Simple (which also turns shadows off). Add `?fps` to the address to see the frame rate.

Open roofs carry real rooftop kit — cooling towers, a plant room, a window-cleaning crane on its rail, an antenna with a blinking light (and wooden water tanks on old New York styles) — setback ledges become planted terraces, and the front door gets a canopy and revolving doors.

Walls and parts wear real materials, true to scale: red or buff brick, limestone, granite, terracotta, board-formed or precast concrete, metal panels, copper patina and wood. The colours still come from the design's palette — the textures only add the light and dark of mortar, grain and seams — and walls weather a little: patchy tone, streaks under the windows, grime near the street. The textures are CC0 from [Poly Haven](https://polyhaven.com) (credits in `public/textures/LICENSES.md`); `scripts/textures/build_textures.py` rebuilds them.

Zoom in close and the walls nearest you turn into true 3D: window frames stand proud, the glass sits back in its opening, and sills and mullion caps catch the light — on square, round, tapered and twisted towers alike. Further out the walls stay painted, so it stays smooth.

Every crown is modelled on a real building: One World Trade Center's segmented mast, the Chrysler's stainless sunburst arches and eagles, Woolworth's copper roof and crocketed pinnacles, the Gherkin's diagrid, Jin Mao's flared eaves and more. The smallest pieces appear as you zoom in; Detail: Simple and the sidebar icons use plainer versions.

## Develop

    npm test          # unit and component tests
    npm run typecheck
    npm run build

All engineering rules of thumb live in `src/sim/catalog/coefficients.ts`.

## Adding crowns, ornaments and window patterns

Everything about how a tower looks is data:

- **Crowns:** add an id to `CROWN_IDS` in `src/sim/catalog/ids.ts`, then an entry in `src/sim/catalog/crowns.ts`. Most crowns are a list of `stages` (stacked shapes sized as fractions of the roof). A crown that needs real code sets `custom: true` and gets a builder in `src/scene/crowns/custom.ts`; the compiler insists.
- **Ornaments:** add an id to `ORNAMENT_IDS`, then an entry in `src/sim/catalog/facades.ts`: pick a placement rule (`bay-lines`, `floor-rings`, `setback-corners`, …) and a small template of parts.
- **Window patterns and spandrels:** add an id and a tile description in `facades.ts`.

The sidebar galleries, their icons, the clean-up of old saved designs and the catalog-wide tests all pick new entries up automatically.
