# Tower Names Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build it! asks for a tower name. The finished tower shows it on a title card, on a 3D sign over the front door, in the sidebar, and in the saved JSON and its file name.

**Architecture:**
- The name lives on `Project` (`towerName`), never on `Design`, so the design, its history, the analysis and the briefs are untouched.
- The pure helpers (cleaning, slug, suggestions) live in `src/sim`.
- The UI adds:
  - a dialog in front of `build`;
  - an overlay for the finished tower;
  - a canvas-texture sign mounted at the existing entrance anchor.

**Tech Stack:** React 19, TS 5.9, Zustand 5, three 0.186 / @react-three/fiber 9, Vitest 5 (jsdom, @testing-library/react, @react-three/test-renderer).

**Spec:** `docs/superpowers/specs/2026-11-20-tower-names-design.md`

## Global Constraints

- **Name limits:** at most 40 code points after cleaning. Cleaning trims, collapses whitespace runs to one space, and removes control characters (`\p{Cc}`). An empty result means `null`.
- **Where the name lives:** `Project.towerName: string | null`. It is `null` before the build and is reset by `startProject` and `newProject`. `Design` gains no field.
- **Export version:** `EXPORT_VERSION` stays `2`.
- **File name:** `skyscraper-<slug>-<Date.now()>.json`. The slug is at most 30 characters, made only of `[a-z0-9-]`, and falls back to `project.siteId` when empty.
- **Copy, exactly:**
  - the dialog heading "Name your tower";
  - the line "Every great skyscraper has a name.";
  - the input label "Tower name", its placeholder "Type a name…", and the ideas heading "Need an idea?";
  - the buttons "🎲 More ideas", "Start building 🏗️" and "Back to designing";
  - the construction line "Building {name}";
  - the title card's top line "🎉 {name}" and its second line "{tip} m · {floors} floors · {city}".
- **Sign:** the panel is the entrance width × 1.4 m, with its centre at 4.6 m above the ground. It has a dark stone background and gold capital letters, which glow at night.
- **When it shows:** the sign only when there is a name and the tower is not ghosted. The title card only in the `complete` phase.
- **Chromebook:** the dialog fits at 1024 × 640 with no scrolling and no horizontal page scroll. Every control works by keyboard: Enter starts, Escape goes back.
- **Draw calls:** at most 1 extra (the sign).

## Review Focus

1. **Typing a name must not trigger the game's keyboard shortcuts.** For example, the undo keys or Shift-scroll pan could fire while the input is focused. Expected: typing only types. Test in Task 3: pressing `z` with Ctrl or Meta inside the input leaves the design history unchanged.
2. **A long name, or one made of emoji, cut at 40.** It must not split a surrogate pair, and must not overflow the sign or the title. Tests in Task 1 (code points) and Task 5 (the text-fit function returns a font size of at least the minimum, or a text ending in "…").
3. **Opening the dialog twice, or pressing Build it! while it is open, must not start building.** Test in Task 3: the phase stays `design` until Start building is pressed.
4. **New project after completion, then build again:** the old name must not carry over. Test in Task 2.
5. **The ghosted tower** (systems or zones view on a completed tower) must not show a floating sign. Test in Task 5.

---

## File Structure

| File | Role |
|---|---|
| `src/sim/towerName.ts` (new) | `cleanTowerName`, `towerFileSlug`, `TOWER_NAME_MAX = 40` |
| `src/sim/catalog/towerNames.ts` (new) | word lists, `suggestTowerName` |
| `src/state/store.ts` | `Project.towerName`, `build(name?)`, resets |
| `src/ui/exportDesign.ts` | file name from the slug |
| `src/ui/sidebar/NameTowerDialog.tsx` (new) | the dialog |
| `src/ui/sidebar/BuildBar.tsx` | opens the dialog |
| `src/ui/sidebar/ConstructionCard.tsx`, `SidebarHeader.tsx` | show the name |
| `src/ui/TowerTitle.tsx` (new) | the title card over the 3D view |
| `src/scene/Scene.tsx`, `src/ui/styles.css` | mount the title, and stack the title and the force banner |
| `src/scene/dressing/dressing.ts` | export `entranceAnchor(design)` |
| `src/scene/NameSign.tsx` (new) | the sign mesh and `fitSignText` |
| `src/scene/Building.tsx` | `towerName` prop that mounts `NameSign` |

---

### Task 1: Name helpers and suggestions

**Files:**
- Create: `src/sim/towerName.ts`, `src/sim/towerName.test.ts`, `src/sim/catalog/towerNames.ts`, `src/sim/catalog/towerNames.test.ts`

**Interfaces:**
- Produces:
  - `TOWER_NAME_MAX = 40`
  - `cleanTowerName(raw: string): string`. Returns `''` when nothing is left.
  - `towerFileSlug(name: string | null, fallback: string): string`
  - `suggestTowerName(site: Site, design: Design, n: number): string`

- [ ] **Step 1: Write the failing tests**

```ts
// towerName.test.ts
expect(cleanTowerName('  The   Big\tOne \n')).toBe('The Big One');
expect(cleanTowerName('A\u0007B')).toBe('AB');
expect(cleanTowerName('   ')).toBe('');
const rockets = '🚀'.repeat(45);
expect(Array.from(cleanTowerName(rockets))).toHaveLength(40);   // no split surrogate
expect(cleanTowerName(rockets).endsWith('🚀')).toBe(true);
expect(towerFileSlug('Café Tower #1!', 'tokyo')).toBe('cafe-tower-1');
expect(towerFileSlug('🚀🚀', 'tokyo')).toBe('tokyo');
expect(towerFileSlug(null, 'chicago')).toBe('chicago');
expect(towerFileSlug('x'.repeat(50), 'tokyo')).toHaveLength(30);

// towerNames.test.ts — for every site in SITES, with its default design:
const names = Array.from({ length: 10 }, (_, n) => suggestTowerName(site, d, n));
expect(new Set(names).size).toBe(10);
names.forEach((s) => { expect(s.startsWith('The ')).toBe(true); expect(Array.from(s).length).toBeLessThanOrEqual(40); });
expect(names.some((s) => CITY_WORDS[site.id].some((w) => s.includes(w)))).toBe(true);
expect(suggestTowerName(site, d, 3)).toBe(suggestTowerName(site, d, 3));       // deterministic
// form words: with crown 'spire', some name among n = 0..9 contains 'Spire';
// with floors 100 and plateWidth 40 (height/base = 10 > 8), 'Needle'; with twist 45, 'Twist';
// with the default design, none of the three.
```

- [ ] **Step 2: Run** `npx vitest run src/sim/towerName.test.ts src/sim/catalog/towerNames.test.ts`. Expected: FAIL, because the modules don't exist yet.

- [ ] **Step 3: Implement.**
  - `cleanTowerName`: replace `\p{Cc}` with `''` (the `u` flag) *after* turning `\s+` into a space. That way tabs and newlines become spaces rather than vanishing. Then trim, and cut with `Array.from(...).slice(0, 40).join('')`, then `trimEnd`.
  - `towerFileSlug`: `normalize('NFKD')`, strip `\p{M}`, lower-case, replace `[^a-z0-9]+` with `-`, trim the dashes, `slice(0, 30)`, and trim the dashes again. Return `fallback` when the result is empty.
  - `towerNames.ts`: export `CITY_WORDS: Record<SiteId, string[]>` and `BASE_FORMS = ['Tower', 'Heights', 'Point', 'Summit', 'Plaza']`, with the exact words from spec §4.
    - Forms list = `BASE_FORMS` plus `'Spire'` if `design.crown === 'spire'`, `'Needle'` if `floors × FLOOR_HEIGHT / plateWidth > 8`, and `'Twist'` if `twist >= 30`.
    - Name n = `` `The ${city[n % 5]} ${forms[(Math.floor(n / 5) + n) % forms.length]}` ``. The added forms come *first* in the list, so they appear early.

- [ ] **Step 4: Run** the same command. Expected: PASS.

- [ ] **Step 5: Commit** `feat: tower name cleaning, file slugs and name ideas`

### Task 2: The name on the project, and in the export

**Files:**
- Modify: `src/state/store.ts`, `src/ui/exportDesign.ts`, and the `Project` literals in `src/ui/exportDesign.test.ts`, `src/ui/SiteSelect.test.tsx` and `src/state/store.test.ts` (tsc lists them all)
- Test: `src/state/store.test.ts`, `src/ui/exportDesign.test.ts`

**Interfaces:**
- Consumes: `cleanTowerName` and `towerFileSlug` (Task 1).
- Produces:
  - `Project.towerName: string | null`
  - `GameState.build: (name?: string) => void`
  - `exportFileName(project: Project, now: number): string`, exported from `exportDesign.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('Build stores the cleaned name and leaves the design alone', () => {
  const before = state().history.slice();
  state().build('  My   Tower ');
  expect(state().project?.towerName).toBe('My Tower');
  expect(state().history).toEqual(before);
});
it('Build with no name, or a blank one, leaves it null', () => {
  state().build('   ');
  expect(state().project?.towerName).toBeNull();
});
it('a new project forgets the old name', () => {
  state().build('First'); state().skipBuild(); state().newProject();
  state().startProject('tokyo', 'sandbox');
  expect(state().project?.towerName).toBeNull();
});
it('the name rides in the export and names the file', () => {
  const project = { siteId: 'tokyo' as const, mode: 'sandbox' as const, briefId: null, towerName: 'Sakura Sky' };
  expect(JSON.parse(designExportPayload(project, design)).project.towerName).toBe('Sakura Sky');
  expect(exportFileName(project, 123)).toBe('skyscraper-sakura-sky-123.json');
  expect(exportFileName({ ...project, towerName: null }, 123)).toBe('skyscraper-tokyo-123.json');
});
```

- [ ] **Step 2: Run** `npx vitest run src/state/store.test.ts src/ui/exportDesign.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement.**
  - `startProject` sets `towerName: null`. `newProject` already sets `project: null`.
  - `build(name)` keeps its current guard, then sets `project: { ...project, towerName: cleanTowerName(name ?? '') || null }` in the same `set` call.
  - `downloadDesign` uses `exportFileName(project, Date.now())`.

- [ ] **Step 4: Run** the same command plus `npx tsc -b --noEmit`. Expected: PASS, with no type errors.

- [ ] **Step 5: Commit** `feat: the tower's name is kept with the project and saved in the export`

### Task 3: The name dialog, and the name in the sidebar

**Files:**
- Create: `src/ui/sidebar/NameTowerDialog.tsx`, `src/ui/sidebar/NameTowerDialog.test.tsx`
- Modify: `src/ui/sidebar/BuildBar.tsx`, `src/ui/sidebar/ConstructionCard.tsx`, `src/ui/sidebar/SidebarHeader.tsx`, `src/ui/styles.css`, and `src/ui/sidebar/Sidebar.test.tsx` (lines 52 and 64 click Build it! and expect building; they now go through the dialog)

**Interfaces:**
- Consumes: `suggestTowerName` and `TOWER_NAME_MAX` (Task 1), `build(name?)` (Task 2).
- Produces: `NameTowerDialog({ onClose }: { onClose: () => void })`. It calls `useGame.getState().build(nameOrSuggestion)` on start.

- [ ] **Step 1: Write the failing tests** (render `<Sidebar />` after `startProject('chicago', 'sandbox')`)

```ts
it('Build it! asks for a name first', () => {
  click('Build it!');
  expect(screen.getByRole('dialog', { name: 'Name your tower' })).toBeTruthy();
  expect(useGame.getState().phase).toBe('design');
});
it('Enter starts building with the typed name', () => {
  click('Build it!');
  const input = screen.getByRole('textbox', { name: /name/i });
  fireEvent.change(input, { target: { value: 'Prairie Point' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(useGame.getState().phase).toBe('building');
  expect(useGame.getState().project?.towerName).toBe('Prairie Point');
  expect(screen.getByText('Building Prairie Point')).toBeTruthy();
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Prairie Point');
});
it('Start building waits for a name', () => {
  click('Build it!');
  expect((screen.getByRole('button', { name: 'Start building 🏗️' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(screen.getByRole('textbox', { name: 'Tower name' }), { target: { value: '   ' } });
  expect((screen.getByRole('button', { name: 'Start building 🏗️' }) as HTMLButtonElement).disabled).toBe(true);
});
it('tapping an idea fills the box, and it can still be edited', () => {
  click('Build it!');
  const idea = suggestTowerName(SITES.chicago, design(), 0);
  click(idea);
  const input = screen.getByRole('textbox', { name: 'Tower name' }) as HTMLInputElement;
  expect(input.value).toBe(idea);
  fireEvent.change(input, { target: { value: idea + ' Two' } });
  click('Start building 🏗️');
  expect(useGame.getState().project?.towerName).toBe(idea + ' Two');
});
it('🎲 More ideas shows three new ideas and leaves the box alone', () => {
  /* type 'Mine'; the three idea buttons are suggestions 0..2; click 🎲: they are now 3..5 and the box still reads 'Mine' */
});
it('Escape and Back return to designing', () => {
  /* Escape on the input: the dialog is gone and the phase is 'design'. Same with "Back to designing". */
});
it('typing in the box does not undo the design', () => {
  /* dispatch a floors change, open the dialog, keyDown 'z' with ctrlKey and with metaKey on the input: historyIndex is unchanged */
});
it('the input stops at 40 characters', () => { /* change to 'x'.repeat(60): value has length 40 */ });
```

- [ ] **Step 2: Run** `npx vitest run src/ui/sidebar`. Expected: FAIL.

- [ ] **Step 3: Implement.**
  - **`BuildBar`:** keeps `open` state. Build it! sets it to true and does not call `build`. The dialog renders inside the footer, positioned fixed and centred over a dim backdrop.
  - **The dialog:**
    - The box starts empty, with the placeholder "Type a name…". The idea offset `n` starts at 0, and the three idea buttons show `suggestTowerName(site, design, n + i)` for i = 0, 1, 2.
    - Tapping an idea sets the box's value and focuses the box, with the cursor at the end. 🎲 does `n += 3` only.
    - Start building is `disabled` when `cleanTowerName(value) === ''`. On submit it calls `build(value)`.
    - `onChange` passes the value through `Array.from(v).slice(0, TOWER_NAME_MAX).join('')`.
    - `onKeyDown` calls `stopPropagation()` on every key, so global shortcuts never see them. Enter submits and Escape closes.
    - Use `<form onSubmit>` so Enter works natively.
    - The input is labelled "Tower name" and has `autoFocus`.
  - **`ConstructionCard`:** a `<p className="building-name">` reading "Building {towerName}" above the `h2`, only when there is a name.
  - **`SidebarHeader`:** `h1` = `project.towerName ?? site.city`. When named, the muted line starts with "{site.city} · ".

- [ ] **Step 4: Run** `npx vitest run src/ui`. Expected: PASS.

- [ ] **Step 5: Commit** `feat: name your tower when you press Build it!`

### Task 4: Title card over the finished tower

**Files:**
- Create: `src/ui/TowerTitle.tsx`, `src/ui/TowerTitle.test.tsx`
- Modify: `src/scene/Scene.tsx` (wrap `<ForceBanner />` and `<TowerTitle />` in `<div className="scene-top">`), `src/ui/styles.css`

**Interfaces:**
- Consumes: `project.towerName`, `phase`, `analysis.tipHeightM` (through `useCurrent`), `design.floors`, `site.city`.
- Produces: `TowerTitle(): JSX.Element | null`.

- [ ] **Step 1: Write the failing tests**

```ts
it('shows the name, height, floors and city once the tower is complete', () => {
  start('new-york'); state().build('Hudson Heights'); state().skipBuild();
  render(<TowerTitle />);
  expect(screen.getByText('🎉 Hudson Heights')).toBeTruthy();
  expect(screen.getByText(`${Math.round(tip)} m · ${floors} floors · New York`)).toBeTruthy();
});
it('is hidden while designing, while building, and when there is no name', () => { /* container empty in each case */ });
```

- [ ] **Step 2: Run** `npx vitest run src/ui/TowerTitle.test.tsx`. Expected: FAIL.

- [ ] **Step 3: Implement.**
  - **`.scene-top`:** `position: absolute; top: 12px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 8px; pointer-events: none; max-width: min(90%, 640px)`.
  - **`.force-banner`:** drops its own absolute positioning.
  - **`.tower-title`:** a dark translucent panel. The name is at about 28 px, bold, white, and clamped to 2 lines (`-webkit-line-clamp: 2`). The facts line sits under it.
  - **The animation:** `@keyframes tower-title-in` runs from `opacity 0; translateY(-12px)` to the resting state over 0.6 s. It is turned off under `@media (prefers-reduced-motion: reduce)`.

- [ ] **Step 4: Run** `npx vitest run src/ui src/scene/Scene.test.ts`. Expected: PASS.

- [ ] **Step 5: Commit** `feat: the finished tower shows its name over the 3D view`

### Task 5: The name sign over the front door

**Files:**
- Modify: `src/scene/dressing/dressing.ts` (extract and export `entranceAnchor`, and use it in `entranceParts`), `src/scene/Building.tsx` (prop `towerName?: string | null`; mount `<NameSign>` inside the building group when it is set and `!ghost`), `src/scene/Scene.tsx` (pass `project.towerName`)
- Create: `src/scene/NameSign.tsx`, `src/scene/NameSign.test.tsx`

**Interfaces:**
- Produces:
  - `entranceAnchor(design: Design): { anchor: WorldAnchor; width: number }`. This is the same `at(0)` anchor and `width` that `entranceParts` uses today, and `entranceParts`'s output must be unchanged.
  - `fitSignText(measure: (text: string, px: number) => number, name: string, maxWidth: number): { text: string; px: number }`. It goes from 96 px down to a minimum of 40 px in steps of 4. Below that, it cuts the text and adds "…" until it fits.
  - `NameSign({ design, name, night }: { design: Design; name: string; night: boolean })`

- [ ] **Step 1: Write the failing tests**

```ts
it('entranceParts is unchanged by the refactor', () => { /* toEqual a snapshot taken before the refactor, for the default design and a 45° twisted circle */ });
it('fitSignText shrinks the font, then cuts with …', () => {
  const measure = (t: string, px: number) => t.length * px * 0.6;   // fake monospace
  expect(fitSignText(measure, 'HUDSON', 1000)).toEqual({ text: 'HUDSON', px: 96 });
  const long = fitSignText(measure, 'X'.repeat(40), 1000);
  expect(long.px).toBeGreaterThanOrEqual(40);
  expect(measure(long.text, long.px)).toBeLessThanOrEqual(1000);
  expect(long.text.endsWith('…')).toBe(true);
  expect(fitSignText(measure, '🚀'.repeat(40), 1000).text).not.toMatch(/[\uD800-\uDBFF]…/); // cut on code points
});
it('Building shows a sign only when named and not ghosted', async () => {
  /* @react-three/test-renderer: find the mesh named 'name-sign' with towerName set; none with towerName null; none with ghost */
});
it('the sign sits over the door, facing out', () => {
  /* mesh position y ≈ 4.6, and its world position matches entranceAnchor(design).anchor offset 3.05 m outward */
});
```

- [ ] **Step 2: Run** `npx vitest run src/scene/NameSign.test.tsx src/scene/Building.test.tsx`. Expected: FAIL.

- [ ] **Step 3: Implement `NameSign`.**
  - **The canvas:** 1024 × 256, scaled to the sign's aspect. The background is stone `#2b2a28`, with a thin gold border. The text is `name.toLocaleUpperCase()` in `#d9b25a`, using `600 {px}px Georgia, serif`. When `getContext` returns null (tests), there is no texture and the plain panel is still drawn.
  - **The material:** a `MeshStandardMaterial` with `map` set. At night it also gets an `emissiveMap`: a second canvas with only the letters on black, and `emissive '#ffd27a'`. By day the emissive intensity is 0.
  - **The mesh:** a plane named `'name-sign'`, at `placeAtAnchor`'s position for local `[0, 4.6, 3.05]`, with rotation `[0, anchor.yaw, 0]` and scale `[width, 1.4, 1]`.
  - Dispose the textures and the material on change.
  - The sign takes no part in `useSwayedInstances` or the sway. It sits at street level, where the sway is zero.

- [ ] **Step 4: Run** `npx vitest run src/scene`. Expected: PASS.

- [ ] **Step 5: Commit** `feat: a name sign over the front door of the finished tower`

### Task 6: Docs, visual check, full suite

**Files:** `README.md` (one feature line), and the roadmap note in the spec index if there is one.

- [ ] **Step 1:** Add to the README feature list: "Name your tower when you build it. The name goes on the title card, over the front door, and in the saved file."
- [ ] **Step 2: Headless screenshots.** Use the Plan 14 `shots.mjs` approach, driving the store through `await import('/src/state/store.ts')`. Capture:
  - the dialog at 1024 × 640;
  - a completed tower by day and at night with the title card;
  - a close-up of the sign, using the dev camera hook, with "Hudson Heights" and with a 40-character name.

  Expected: 0 console errors, no horizontal scroll, the sign readable and inside its panel.
- [ ] **Step 3:** Run `npx tsc -b --noEmit && npm run build && npx vitest run --maxWorkers=4 --testTimeout=120000`. Expected: no type errors, the build succeeds, all tests pass.
- [ ] **Step 4: Commit** `docs: tower names in README`
