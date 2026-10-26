# Inside the Tower: Systems Flow — Design Spec (Plan 13)

Extends `2026-10-10-skyscraper-sim-design.md` §9 ("Overlays"). This spec replaces that section's Structure / Elevators / Electrical / Plumbing / HVAC overlays with flow views of the tower's internal systems. Roadmap position: Plan 13. People becomes Plan 14 and design chat Plan 15.

## 1. Why

**What the user wants, in their words:**
- "The internal systems of the skyscraper, how electricity, water, elevators, waste, etc. flow through the building."
- "Flows should follow his specific choices."
- "Just turn on, no construction steps."

**Who it is for:** the user's son, on a Chromebook.

**The point:** *flow*. He should see things moving through his building:
- power rising from the street;
- water pumped up and falling to taps;
- waste falling to the sewer;
- elevator cars running;
- air pushed out from the plant floors.

He should see it change as he changes the design.

**The idea underneath (my call, to make the flows teach one thing):** every system has to beat height. Water needs pumping in stages, power needs substations partway up, elevators need zones and sky lobbies, and waste is the one flow that gravity does for free.

## 2. Goals, non-goals, anti-goals

**Goals:**
- Five systems, each switched on with one button: ⚡ Power, 💧 Water, 🚽 Waste, 🛗 Elevators, 🌬️ Air. When one is on:
  - the walls go see-through;
  - the system's network shows inside the tower, with things visibly moving along it;
  - a card explains it in his tower's numbers.
- Every system follows his design (§4). Changing the design while a system is showing updates it live.

**Non-goals:**
- A structure overlay. Plans 4 and 12 already show structure. *My call:* left out because it isn't a flow.
- People (Plan 14).
- Step-by-step tours or Next buttons. This was the user's call.
- Any change to the analysis, the scores or the design data.
- Several systems at once (§3).

**Anti-goals:**
- **Spaghetti:** so many lines he can't follow one flow from where it enters to where it ends.
- **The same picture on every tower:** if his choices change nothing visible, the plan has failed.
- **Choppy on the Chromebook:** it must cost no more than the Wind view.
- **Wrong science stated as fact:** the card's claims must match how real towers work, in simplified form.

## 3. Controls and state

- **Buttons:** a new row of five buttons in the scene overlay, next to Wind and Earthquake, each with `aria-pressed`.
- **One at a time:** pressing one turns any other system off, and turns off Wind or Earthquake too. Pressing a force turns the system off. *My call:* exclusive, like the forces, so each flow is easy to follow. The user said "ok" to the playback that asked.
- **Store:** a view setting `system: 'none' | 'power' | 'water' | 'waste' | 'elevators' | 'air'`, like `force`.
  - It is not part of the design, its history or the export.
  - New project resets it to `'none'`.
  - It is hidden while building and resumes when the tower is finished, like forces.
- **Available** while designing and on the finished tower.

## 4. What each system shows, following his design

**How it looks (the builder chooses the rendering technique):**
- **See-through walls:** while a system is on, the tower's walls, crown and dressing are drawn ghosted: faint, see-through, depth-sorted so the inside reads.
- **Floor slabs:** shown as thin faint plates, so he can count floors.
- **Network:** pipes, cables, ducts and shafts are drawn as solid, saturated lines or tubes, one colour per system:
  - power yellow;
  - water blue;
  - waste brown;
  - elevators the zone colours;
  - air cyan for supply and orange for return.
- **Motion:** small glowing pulses travel along the network in the flow direction. Elevator cars move as boxes. Pulse speed is constant on screen (readable, not physical).

**Plant floors** are where equipment sits. They are the mechanical floors from Plan 6 (`mechanicalFloors(floors)`: every 30 floors on towers of 40 or more). A tower with none uses a basement plant room (below ground, in the soil cutaway) plus the roof.

### 4.1 Power ⚡
- **The path:** utility cables from the street enter a basement transformer room, then rise up a main riser in the core to each floor. Each floor gets a short branch.
- **Height:** each plant floor carries a substation (a transformer box) that re-boosts the supply. The card explains that power sent a long way loses strength, so tall towers step it up again partway.
- **Backup:** generators in the basement, or on the lowest plant floor. They stay idle unless the user toggles a "power cut" button on the card, which makes the generators pulse and the lights stay on. *My call:* a fun cause-and-effect; drop it if the builder runs long.
- **His choices:**
  - The Wind turbines crown feeds power down from the roof. A second flow joins at the top.
  - Green systems add rooftop solar panels feeding in.
  - Every floor gets its branch; pulses run at the one constant speed (§4).
- **Card:** for example, "Power comes in from the street to the basement, and 3 substations re-boost it on your 92-floor tower (one on each plant floor). The turbines on the roof add about 5%." The figures come from the design and `CROWNS[…].generatesPower`.

### 4.2 Water 💧
- **The path:** the city main enters the basement. Pumps lift the water up a riser to a break tank on the first plant floor. From each tank it flows *down* by gravity to the floors below it. Another pump lifts it on to the next tank up, and so on, up to a roof tank for the top zone.
- **Pressure zones (my call, one rule for picture, tests and card):**
  - The lowest floors, 0–5, are fed straight from the city main.
  - Above that, zones = plant floors + 1:
    - each plant floor has a pump and a tank that feeds the floors below it, down to the next tank;
    - a roof tank feeds the top band.
  - Pumps sit in the basement and on each plant floor; each lifts water to the next tank up.
  - A tower with no plant floors has one pumped zone: a basement pump to a roof tank.
- **Why:** the card explains it. City pressure lifts water only about 6 floors. One pump couldn't push all the way up without bursting the pipes at the bottom, so towers pump in stages and let gravity do the rest.
- **His choices:**
  - A rooftop pool gets its own pumped loop, and the card notes that the pool's water is heavy (this already matters for earthquakes).
  - A sky garden gets an irrigation branch.
  - Green systems add a rainwater tank on the roof feeding the toilets' supply (a second, grey-blue line).
- **Card:** for example, "Your 92-floor tower has 4 water zones: pumps in the basement and on floors 29, 59 and 89 lift water to tanks, then it falls to the taps below each one."

### 4.3 Waste 🚽
- **The path:** drain stacks run straight down from every floor to a sewer connection at the street. They are drawn falling, the only system flowing down the whole height.
- **Vents:** vent stacks rise beside the drain stacks to the roof, letting air in so drains flow. They are faint lines with no pulses.
- **Height:** offsets (jogs) every ~30 floors slow the fall. Real tall towers do this so waste doesn't arrive at the bottom too fast. My call, simplified.
- **His choices:**
  - The number of stacks follows the **top** floor plate (the stacks run the full height, so they must fit the smallest plate): about one per 1,000 m², minimum 2, maximum 6. *My call.*
  - Green systems add a grey-water recycling plant in the basement, so shower and sink water is cleaned and pumped back up for toilets. This is a loop.
  - Restaurants and retail at the base get a grease trap box.
- **Card:** for example, "Waste is the one flow that's free: gravity does it. Your green systems clean shower water and send it back up to flush toilets."

### 4.4 Elevators 🛗
- **Zones come from the analysis, not the plant floors (my call), so the picture matches the card's wait times:**
  - `ZONE_COUNT[zoning]` zones of `floors / zones` floors each.
  - Sky lobbies sit at the zone boundaries, rounded to whole floors, on any height of tower.
  - The shuttle and local split follows the analysis's `skyLobbyShuttleShare`.
- **The shafts:** one per car, `design.elevators`, grouped in the core and coloured by zone:
  - **single:** all cars serve every floor;
  - **two-zone:** a low bank stops at the lower half, and a high bank expresses through the lower half without stopping;
  - **sky-lobby:** shuttles express to the sky lobbies at the zone boundaries, and local banks run from each sky lobby.
- **Motion:** cars move up and down their shafts and pause at floors. They express without pausing through the floors they skip.
- **Busyness:** the cars' busyness follows the analysis. The number moving at once scales with `peakDemand`. If `avgWaitS` is over `targetS`, a small queue of dots builds in the lobby and the card says so.
- **Card:** for example, "24 cars in 3 zones. Express shuttles take people to sky lobbies on floors 40 and 80. Average wait 22 s (target 30 s)."
- Speed matches the analysis's car speed, scaled for display. *My call:* faster than real, so a ride takes 2–6 s.

### 4.5 Air 🌬️
- **The path:** air handlers on each plant floor (on the roof and in the basement for towers without one) push fresh air out in cyan supply ducts to the floors they serve, about 15 floors above and below. Orange return ducts carry stale air back.
- **On the roof:** cooling towers and chillers (the Plan 12 kit) are linked to the handlers by chilled-water pipes.
- **His choices:**
  - Green systems show a heat-recovery wheel on each handler, which passes heat from outgoing to incoming air: a loop. *My call:* green also cuts how many pulses move, because less air is needed.
  - Floors used for different purposes (shops, offices, homes, hotel) are served the same way.
- **Card:** for example, "4 plant floors each look after about 15 floors above and below. Green systems recover the heat from stale air before it leaves."

## 4.6 Systems quality: Standard, Efficient, Green (my call)

The three grades all look different:
- **Standard:** the plain systems above.
- **Efficient** ("better equipment and controls"):
  - air handlers get heat-recovery wheels;
  - pumps and fans run variable-speed, shown as about 20% fewer pulses on Water and Air;
  - the card says so.
- **Green:** everything in Efficient, plus:
  - rooftop solar feeding power;
  - a rainwater tank feeding the toilets' supply;
  - grey-water recycling in the basement;
  - about 40% fewer pulses on Water and Air.

## 5. Cards

- **Where:** the card sits in the bottom-left of the scene, where the force readout goes, in the same style.
- **What it has:** three or four short lines, written for a child, with the tower's own numbers, and a "Why?" line for the system's height lesson (§1).
- **Wording** lives in a catalog file, like `src/sim/catalog/forces.ts`.

## 6. Speed

- **Budget:** no more than the Wind view. The builder sets a draw-call cap (my call: ≤ 30 extra draw calls) and caps the moving pulses at ~400 instances across all lines.
- **Detail: Simple:** walls ghost the same way; pulses are halved.
- **Nothing runs** when no system is on.

## 7. Testing

- **Pure builders per system** (in `src/sim/systems/` or `src/scene/systems/`), each tested to follow the choices in §4:
  - water zones vs height;
  - tank floors equal the plant floors;
  - turbines and solar only when chosen;
  - shafts equal the elevator count, and banks by zoning;
  - stacks vs plate size;
  - grey water only on green.
- **Card wording** quotes the right numbers.
- **Store:** exclusive with forces and other systems; reset on a new project; hidden while building.
- **Scene:** the ghosted walls render and restore when the system is turned off; pulses stay within the cap.
- **Visual check:** each system on a 40-floor tower and a 120-floor tower, plus single vs sky-lobby elevators, standard vs green, and day and night.

## 8. Left to the builder

- The ghosting technique (material swap, opacity, depth handling), the network geometry (tubes or thick lines), the pulse rendering, exact colours and speeds, and the layout of risers inside the core.
- Whether the "power cut" button makes it in (§4.1).
