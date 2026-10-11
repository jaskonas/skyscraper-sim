import { maxPlateDepth, maxPlateWidth } from '../design';
import { CROWNS } from './crowns';
import { CROWN_IDS } from './ids';
import type { Design, DetailLevel, Site } from '../types';

export type ParamGroupId = 'form' | 'structure' | 'foundation' | 'facade' | 'elevators' | 'systems';

export const PARAM_GROUPS: { id: ParamGroupId; label: string }[] = [
  { id: 'form', label: 'Shape' },
  { id: 'structure', label: 'Structure' },
  { id: 'foundation', label: 'Foundation' },
  { id: 'facade', label: 'Facade' },
  { id: 'elevators', label: 'Elevators' },
  { id: 'systems', label: 'Building systems' },
];

export type ParamId =
  | 'floors' | 'plateWidth' | 'plateDepth' | 'shape' | 'setbacks' | 'taper' | 'twist' | 'crown'
  | 'system' | 'material' | 'exposedStructure' | 'damping' | 'baseIsolation'
  | 'foundation' | 'facade' | 'windowRatio' | 'elevators' | 'zoning' | 'systemsGrade';

interface ParamBase {
  id: ParamId;
  group: ParamGroupId;
  label: string;
  /** Plain-language explanation for ages 12–15. */
  explain: string;
  /** Extra detail shown at the advanced level. */
  explainAdvanced?: string;
  minDetailLevel: DetailLevel;
  /** Hide this control unless the predicate holds (e.g. depth only for rectangles). */
  visibleWhen?: (design: Design) => boolean;
}

export interface NumberParam extends ParamBase {
  kind: 'number';
  min: number;
  /** Static maximum; `maxFor` overrides it when the site or design limits it. */
  max: number;
  maxFor?: (site: Site, design: Design) => number;
  step: number;
  unit: string;
  /** Show as a percentage (value × 100). */
  percent?: boolean;
}

export interface EnumOption {
  value: string;
  label: string;
  explain: string;
}

export interface EnumParam extends ParamBase {
  kind: 'enum';
  options: EnumOption[];
  /** Draw as a picture gallery instead of a dropdown. */
  widget?: 'gallery';
}

export interface BooleanParam extends ParamBase {
  kind: 'boolean';
}

export type ParamDef = NumberParam | EnumParam | BooleanParam;

export const PARAMS: ParamDef[] = [
  {
    id: 'floors', group: 'form', kind: 'number', label: 'Floors', min: 5, max: 150, step: 1, unit: 'floors',
    minDetailLevel: 'standard',
    explain: 'More floors means more space to rent — but more weight, more wind, and more elevators.',
  },
  {
    id: 'plateWidth', group: 'form', kind: 'number', label: 'Width', min: 15, max: 80, step: 1, unit: 'm',
    maxFor: (site, design) => maxPlateWidth(site, design),
    minDetailLevel: 'standard',
    explain: 'How wide each floor is. Wider towers are stiffer against wind, but the lot limits how wide you can go.',
  },
  {
    id: 'plateDepth', group: 'form', kind: 'number', label: 'Depth', min: 15, max: 80, step: 1, unit: 'm',
    maxFor: (site) => maxPlateDepth(site),
    visibleWhen: (d) => d.shape === 'rectangle',
    minDetailLevel: 'standard',
    explain: 'How deep each floor is (front to back). Only used for rectangular towers.',
  },
  {
    id: 'shape', group: 'form', kind: 'enum', label: 'Floor shape', minDetailLevel: 'standard',
    explain: 'The outline of each floor seen from above. Wind slips around round shapes more easily than square ones.',
    options: [
      { value: 'square', label: 'Square', explain: 'Simple and efficient to build; catches the most wind.' },
      { value: 'rectangle', label: 'Rectangle', explain: 'Lets you set width and depth separately.' },
      { value: 'circle', label: 'Round', explain: 'Wind flows around it — much less sway. Less floor area for the width.' },
      { value: 'triangle', label: 'Triangle', explain: 'Dramatic and good for views, but twists more in earthquakes.' },
    ],
  },
  {
    id: 'setbacks', group: 'form', kind: 'enum', label: 'Setbacks', minDetailLevel: 'standard',
    explain: 'Steps where the tower gets narrower as it rises. They let light reach the street and break up the wind.',
    options: [
      { value: 'none', label: 'None', explain: 'Straight up — the most floor space.' },
      { value: 'few', label: 'A few steps', explain: 'Two steps near the top.' },
      { value: 'wedding-cake', label: 'Wedding cake', explain: 'Four steps, like 1930s New York towers.' },
    ],
  },
  {
    id: 'taper', group: 'form', kind: 'number', label: 'Taper', min: 0, max: 0.6, step: 0.05, unit: '%', percent: true,
    minDetailLevel: 'standard',
    explain: 'How much narrower the top is than the bottom. Tapering cuts wind load and weight up high.',
  },
  {
    id: 'twist', group: 'form', kind: 'number', label: 'Twist', min: 0, max: 120, step: 5, unit: '°',
    minDetailLevel: 'standard',
    explain: 'Rotating each floor a little confuses the wind so it cannot push the tower in rhythm.',
  },
  {
    id: 'crown', group: 'form', kind: 'enum', label: 'Crown', minDetailLevel: 'standard', widget: 'gallery',
    explain: 'The top of the tower. Mostly about looks — but it adds height, and each style has a favourite.',
    options: CROWN_IDS.map((id) => ({ value: id, label: CROWNS[id].label, explain: `Seen on ${CROWNS[id].seenOn}. ${CROWNS[id].blurb}` })),
  },
  {
    id: 'system', group: 'structure', kind: 'enum', label: 'Structural system', minDetailLevel: 'standard',
    explain: "The skeleton that keeps the tower standing and stiff. Each system works best up to a certain height.",
    options: [
      { value: 'rigid-frame', label: 'Rigid frame', explain: 'Beams and columns locked together. Cheap, but floppy above ~30 floors.' },
      { value: 'framed-tube', label: 'Framed tube', explain: 'Closely spaced outer columns act like one big hollow tube. Good to ~60 floors.' },
      { value: 'core-outrigger', label: 'Core + outriggers', explain: 'A concrete core tied to outer columns by giant arms. Good to ~100 floors.' },
      { value: 'bundled-tube', label: 'Bundled tube', explain: 'Several tubes bundled together, like Willis Tower. Good to ~110 floors.' },
      { value: 'diagrid', label: 'Diagrid', explain: 'A diagonal grid on the outside. Stiff and uses less steel, but slower to build.' },
      { value: 'buttressed-core', label: 'Buttressed core', explain: "A Y-shaped core braced by wings, like Burj Khalifa. Works for the very tallest." },
    ],
  },
  {
    id: 'material', group: 'structure', kind: 'enum', label: 'Main material', minDetailLevel: 'standard',
    explain: 'What the structure is made of.',
    options: [
      { value: 'steel', label: 'Steel', explain: 'Light and fast to build, bends without breaking in quakes, but costs more.' },
      { value: 'concrete', label: 'Concrete', explain: 'Cheap and stiff, but heavy and slower to build.' },
      { value: 'composite', label: 'Composite', explain: 'Steel inside concrete — the stiffest mix, used in most supertalls.' },
    ],
  },
  {
    id: 'exposedStructure', group: 'structure', kind: 'boolean', label: 'Exposed outside bracing', minDetailLevel: 'standard',
    explain: 'Giant X-braces on the outside of the tower, like the Hancock Center. Much stiffer, a bit heavier and pricier.',
  },
  {
    id: 'damping', group: 'structure', kind: 'enum', label: 'Dampers', minDetailLevel: 'standard',
    explain: 'Devices that soak up shaking so people at the top do not feel sick.',
    options: [
      { value: 'none', label: 'None', explain: 'No dampers.' },
      { value: 'tmd', label: 'Tuned mass damper', explain: 'A huge swinging weight near the top that sways against the wind. Best for wind.' },
      { value: 'viscous', label: 'Viscous dampers', explain: 'Shock absorbers built into the frame. Help with both wind and earthquakes.' },
    ],
  },
  {
    id: 'baseIsolation', group: 'structure', kind: 'boolean', label: 'Base isolation', minDetailLevel: 'standard',
    explain: 'Rubber-and-steel bearings under the building let the ground shake while the tower stays calmer. Great in earthquake zones, wasted money elsewhere.',
  },
  {
    id: 'foundation', group: 'foundation', kind: 'enum', label: 'Foundation', minDetailLevel: 'standard',
    explain: 'How the tower stands on the ground. Soft soil needs deeper foundations.',
    options: [
      { value: 'mat', label: 'Shallow mat', explain: 'A thick concrete slab. Cheap — fine on rock, sinks in mud.' },
      { value: 'raft', label: 'Raft', explain: 'A deeper, thicker slab with basements. Spreads weight wider.' },
      { value: 'piles', label: 'Piles', explain: 'Hundreds of long columns driven deep; friction holds them in soft soil.' },
      { value: 'caissons', label: 'Caissons to bedrock', explain: 'Giant drilled concrete shafts that reach solid rock. Best if rock is in reach.' },
    ],
  },
  {
    id: 'facade', group: 'facade', kind: 'enum', label: 'Facade', minDetailLevel: 'standard',
    explain: 'The outer skin. It affects weight, cost, energy, and looks.',
    options: [
      { value: 'glass', label: 'Glass curtain wall', explain: 'Light and bright, but loses heat in winter and gains it in summer.' },
      { value: 'masonry', label: 'Stone / brick', explain: 'Beautiful and well-insulated, but very heavy.' },
      { value: 'precast', label: 'Precast concrete', explain: 'Cheap, sturdy panels made in a factory.' },
      { value: 'metal', label: 'Metal panels', explain: 'Light and modern; middling insulation.' },
    ],
  },
  {
    id: 'windowRatio', group: 'facade', kind: 'number', label: 'Window area', min: 0.2, max: 0.95, step: 0.05, unit: '%', percent: true,
    minDetailLevel: 'standard',
    explain: 'How much of the wall is window. More windows = better views but more heating and cooling.',
  },
  {
    id: 'elevators', group: 'elevators', kind: 'number', label: 'Elevator cars', min: 2, max: 120, step: 1, unit: 'cars',
    minDetailLevel: 'standard',
    explain: 'More cars means shorter waits — but each one costs money and takes up floor space.',
  },
  {
    id: 'zoning', group: 'elevators', kind: 'enum', label: 'Elevator zoning', minDetailLevel: 'standard',
    explain: 'Tall towers split elevators into zones so each car stops at fewer floors.',
    options: [
      { value: 'single', label: 'One zone', explain: 'Every car serves every floor. Fine for shorter towers.' },
      { value: 'two-zone', label: 'Low / high zones', explain: 'Some cars serve the bottom half, others express to the top half.' },
      { value: 'sky-lobby', label: 'Sky lobbies', explain: 'Express shuttles to lobbies high up, then local cars. Used in supertalls.' },
    ],
  },
  {
    id: 'systemsGrade', group: 'systems', kind: 'enum', label: 'Systems quality', minDetailLevel: 'standard',
    explain: 'Heating, cooling, lighting, and water systems. Better systems cost more but save energy every year.',
    options: [
      { value: 'standard', label: 'Standard', explain: 'Normal equipment.' },
      { value: 'efficient', label: 'Efficient', explain: 'Better equipment and controls — about 20% less energy.' },
      { value: 'green', label: 'Green', explain: 'Top-tier: heat recovery, smart controls, solar — about 40% less energy.' },
    ],
  },
];

export const PARAMS_BY_ID = Object.fromEntries(PARAMS.map((p) => [p.id, p])) as Record<ParamId, ParamDef>;

export function paramMax(def: NumberParam, site: Site, design: Design): number {
  return def.maxFor ? Math.min(def.max, def.maxFor(site, design)) : def.max;
}

export function visibleParams(level: DetailLevel, design: Design): ParamDef[] {
  return PARAMS.filter(
    (p) => (level === 'advanced' || p.minDetailLevel === 'standard') && (!p.visibleWhen || p.visibleWhen(design)),
  );
}
