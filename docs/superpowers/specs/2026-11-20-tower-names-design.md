# Tower Names — Design Spec

A small feature that sits outside the numbered roadmap. It does not depend on Plan 15 (footprints), and Plan 15 doesn't depend on it.

## 1. Why

**The request, in the user's words:** "when they hit the build button, can name their tower. This is then somehow displayed in the context of the completed tower, and also appears in the JSON file they can save."

**Who it's for:** the son, on a Chromebook. Naming the tower makes it *his* building, and the moment it's finished should feel like a ribbon-cutting.

## 2. Goals, non-goals, anti-goals

**Goals:**
1. Pressing **Build it!** asks for a name before construction starts.
2. The finished tower shows its name in four places:
   - a title card over the 3D view;
   - a 3D sign over the front door;
   - the sidebar header;
   - the construction card while building.
3. The saved JSON carries the name, and the file is named after it.

**Non-goals:**
- Renaming after the build. To change the name, he starts a new project.
- Importing designs.
- Showing the name during design.
- A name on the crown or the roof.

**Anti-goals:**
- **A blocker.** He must be able to build with one tap, using a suggested name, without typing.
- **Broken text.** A long name or an emoji name must not overflow the card, the sign or the file name.
- **Changing the design.** Naming must not touch the design, its undo history, its analysis or the briefs.

## 3. Model (my call)

- `Project` gains `towerName: string | null`. It is `null` until the build starts, and is reset by `startProject` and `newProject`.
  - The name lives on the project rather than the design, so the design's equality, history, analysis memo and tests stay untouched. Since `designExportPayload` already writes `project`, the name reaches the JSON as `project.towerName`.
- **`cleanTowerName(raw)`:**
  - trims;
  - collapses runs of whitespace to one space;
  - removes control characters;
  - keeps at most **40 characters**, counted as code points so an emoji is never split.
- **`build(name?)`:** the store's `build` takes an optional name and stores `cleanTowerName(name)`, or `null` when that is empty.
- **The export version stays 2.** The change only adds a field, and nothing imports these files yet.
- **The file name** is `skyscraper-<slug>-<timestamp>.json`.
  - The slug is the name lower-cased, with accents stripped and every other run of non `a–z0–9` characters turned into one `-`. It is trimmed of `-` and cut to 30 characters.
  - It falls back to the site id when it comes out empty, for example for an all-emoji name.

## 4. Name suggestions (my call)

`suggestTowerName(site, design, n)` builds a name from a **city word** and a **form word**. It is deterministic in `n`, so the 🎲 button just counts up.

- **City words:**
  - New York: Hudson, Midtown, Broadway, Harbor, Empire Park;
  - Tokyo: Sakura, Sumida, Kanto, Shinjuku Sky, Fuji View;
  - Chicago: Lakeshore, Prairie, Windy City, Riverbend, Loop;
  - Shanghai: Pearl River, Bund, Huangpu, Jade, Lotus.
- **Form words:** Tower, Heights, Point, Summit, Plaza. Each design adds one more:
  - **Spire** when the crown is a spire;
  - **Needle** when it is slender (height/base over 8);
  - **Twist** when twist is 30° or more.
- **The order:** suggestion `n` uses city word `n mod 5` and form word `(⌊n/5⌋ + n) mod (number of form words)`, with the design's extra forms listed first, so consecutive suggestions change both words. The result is "The <city> <form>", for example "The Sakura Spire".
- The words are chosen to avoid famous real towers' names.

## 5. UI

**Name dialog (`NameTowerDialog`):**
- Opens from **Build it!**.
- It is a `role="dialog"` with `aria-modal`, the heading "Name your tower" and the line "Every great skyscraper has a name."
- **The input:**
  - focused on open;
  - its placeholder is the current suggestion;
  - it shows a live count of characters left;
  - typing past 40 characters is cut off.
- **Buttons:**
  - **🎲 Another idea** puts the next suggestion into the field.
  - **Start building 🏗️** is the default and also triggers on Enter. A blank field builds with the placeholder suggestion.
  - **Back to designing** also closes on Escape. It leaves the design phase untouched.
- At Chromebook width (1024 px) it fits without scrolling.

**Construction card:** the heading gains a line above it, "Building <name>".

**Sidebar header:** once a name exists, the `h1` is the name. The line under it reads "<City> · <site> · <mode> · <phase>".

**Title card (`TowerTitle`):**
- Shown over the 3D view only in the `complete` phase, at the top centre.
- The top line is "🎉 <name>". Under it: "<tip height> m · <floors> floors · <city>".
- On appearing it fades in and rises over about 0.6 s. With `prefers-reduced-motion` it doesn't move.
- It ignores pointer events. The force banner stacks under it, and neither overlaps the other.
- A long name wraps to at most two lines.

**3D sign (`NameSign`):**
- A dark stone panel with gold capital letters, standing on the entrance canopy over the front door. It faces the street side that the entrance already uses.
- Its size is the entrance width × 1.4 m, with the centre 4.6 m above the ground.
- The text is drawn on a canvas texture. The font shrinks until the name fits on one line, down to a minimum, after which the text is cut with "…".
- At night the letters glow: an emissive map, the same idea as the lobby glass.
- It is drawn only when there is a name, and not on the ghosted tower (systems or zones view).
- One mesh and one texture, disposed when the name or the tower changes.

## 6. Testing

- **Unit tests:**
  - `cleanTowerName`: trimming, whitespace, control characters, the 40-code-point limit with emoji, empty input;
  - `towerFileSlug`: accents, emoji fallback, length;
  - `suggestTowerName`: deterministic; ten consecutive suggestions are all different, at most 40 characters, and contain a city word, for every site; Spire, Needle and Twist appear when they should.
- **Store:**
  - `build('  My  Tower ')` stores "My Tower";
  - `build()` leaves the name `null`;
  - `startProject` and `newProject` reset the name;
  - the design history is unchanged by naming.
- **Export:** the payload has `project.towerName`, and the file name uses the slug.
- **UI:**
  - Build it! opens the dialog and does not start building;
  - Enter and Start building begin construction with the typed name;
  - a blank field uses the suggestion;
  - 🎲 changes the field;
  - Escape and Back return to designing, with the phase still `design`;
  - the construction card, header and title card show the name.
- **Scene:** the sign mesh exists with a name, and is absent with no name or on the ghosted tower.
- **Visual check** with headless screenshots:
  - the dialog at 1024 px;
  - the completed tower's title card by day and at night;
  - a close-up of the sign, with a short name and with a 40-character name.

## 7. Left to the builder

- The exact colours and fonts.
- The canvas text-fitting loop.
- The animation curve.
- The CSS layout of the stack holding the title card and the force banner.
