# Skyscraper Studio

A teaching game about designing and building skyscrapers. Pick a real-city site, design a tower, build it, and see how it performs.

## Run it

    npm install
    npm run dev

Then open the printed `http://localhost:5173` link.

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
