import type { Design, StyleId } from '../types';

export type StyleSettings = Pick<
  Design,
  | 'shape' | 'setbacks' | 'taper' | 'twist' | 'crown' | 'facade' | 'windowRatio' | 'exposedStructure' | 'palette'
  | 'ornament' | 'windowPattern' | 'spandrel' | 'ornaments'
>;

export interface StylePreset {
  id: StyleId;
  name: string;
  era: string;
  summary: string;
  /** Why it looks the way it does — the engineering or idea behind the form. */
  why: string;
  examples: { name: string; city: string }[];
  settings: StyleSettings;
}

export const STYLE_PRESETS: Record<StyleId, StylePreset> = {
  'chicago-school': {
    id: 'chicago-school',
    name: 'Chicago School',
    era: '1880s–1910s',
    summary: 'The first skyscrapers: steel frames wrapped in brick and terracotta, with wide "Chicago windows".',
    why: 'A steel skeleton carried the weight, so walls no longer had to be thick — windows could be big.',
    examples: [
      { name: 'Home Insurance Building', city: 'Chicago' },
      { name: 'Reliance Building', city: 'Chicago' },
      { name: 'Flatiron Building', city: 'New York' },
    ],
    settings: {
      shape: 'square', setbacks: 'none', taper: 0, twist: 0, crown: 'cornice', facade: 'masonry', windowRatio: 0.5,
      exposedStructure: false, ornament: 'low', palette: { body: '#a0522d', accent: '#e8dcc8', glass: '#7fa7c0' },
      windowPattern: 'chicago', spandrel: 'plain', ornaments: ['belt-courses', 'setback-cornices', 'rusticated-base'],
    },
  },
  'gothic-revival': {
    id: 'gothic-revival',
    name: 'Gothic Revival',
    era: '1900s–1930s',
    summary: '"Cathedrals of commerce": pointed crowns, vertical stone ribs and lots of carved detail.',
    why: 'Builders borrowed the soaring look of medieval cathedrals to make tall buildings feel grand and uplifting.',
    examples: [
      { name: 'Woolworth Building', city: 'New York' },
      { name: 'Tribune Tower', city: 'Chicago' },
    ],
    settings: {
      shape: 'square', setbacks: 'few', taper: 0, twist: 0, crown: 'gothic-pinnacles', facade: 'masonry', windowRatio: 0.35,
      exposedStructure: false, ornament: 'high', palette: { body: '#e6e0d2', accent: '#b9a77d', glass: '#6f8ea3' },
      windowPattern: 'arched', spandrel: 'plain', ornaments: ['stone-ribs', 'pinnacles', 'gargoyles', 'arched-entry'],
    },
  },
  'art-deco': {
    id: 'art-deco',
    name: 'Art Deco',
    era: '1925–1940',
    summary: 'Stepped "wedding cake" setbacks, gleaming spires, and geometric gold and chrome trim.',
    why: "New York's 1916 zoning law required towers to step back so light could reach the street — architects made the steps beautiful.",
    examples: [
      { name: 'Chrysler Building', city: 'New York' },
      { name: 'Empire State Building', city: 'New York' },
      { name: 'Carbide & Carbon Building', city: 'Chicago' },
      { name: 'Peace Hotel', city: 'Shanghai' },
    ],
    settings: {
      shape: 'square', setbacks: 'wedding-cake', taper: 0, twist: 0, crown: 'deco-arches', facade: 'masonry', windowRatio: 0.4,
      exposedStructure: false, ornament: 'high', palette: { body: '#d8cbb0', accent: '#c9a227', glass: '#5f7f94' },
      windowPattern: 'flush-grid', spandrel: 'chevron', ornaments: ['stone-ribs', 'sunburst-bands', 'deco-steps', 'gargoyles'],
    },
  },
  international: {
    id: 'international',
    name: 'International Style',
    era: '1950s–1970s',
    summary: 'Clean glass-and-steel boxes with no decoration — "less is more".',
    why: 'Modernists wanted honest buildings that showed their structure and used new curtain-wall glass.',
    examples: [
      { name: 'Seagram Building', city: 'New York' },
      { name: 'Lever House', city: 'New York' },
      { name: '860–880 Lake Shore Drive', city: 'Chicago' },
    ],
    settings: {
      shape: 'rectangle', setbacks: 'none', taper: 0, twist: 0, crown: 'flat', facade: 'glass', windowRatio: 0.9,
      exposedStructure: false, ornament: 'none', palette: { body: '#2f3a40', accent: '#1f2a30', glass: '#4d6f80' },
      windowPattern: 'flush-grid', spandrel: 'plain', ornaments: ['ibeam-mullions'],
    },
  },
  brutalist: {
    id: 'brutalist',
    name: 'Brutalist',
    era: '1955–1980',
    summary: 'Bold, chunky raw concrete with small deep-set windows.',
    why: 'Concrete was cheap, strong, and fireproof; architects celebrated its rough texture instead of hiding it.',
    examples: [
      { name: 'Nakagin Capsule Tower', city: 'Tokyo' },
      { name: 'Marina City', city: 'Chicago' },
    ],
    settings: {
      shape: 'square', setbacks: 'few', taper: 0, twist: 0, crown: 'concrete-cap', facade: 'precast', windowRatio: 0.3,
      exposedStructure: false, ornament: 'none', palette: { body: '#9c9a94', accent: '#77756f', glass: '#4a5a63' },
      windowPattern: 'punched', spandrel: 'plain', ornaments: ['concrete-fins'],
    },
  },
  postmodern: {
    id: 'postmodern',
    name: 'Postmodern',
    era: '1978–1995',
    summary: 'Playful references to history: granite, pediments, stepped tops and bold colors.',
    why: 'After decades of plain boxes, architects brought back ornament and wit — sometimes tongue-in-cheek.',
    examples: [
      { name: '550 Madison (AT&T Building)', city: 'New York' },
      { name: '311 South Wacker', city: 'Chicago' },
      { name: 'Tokyo Metropolitan Government Building', city: 'Tokyo' },
    ],
    settings: {
      shape: 'square', setbacks: 'few', taper: 0, twist: 0, crown: 'split-pediment', facade: 'masonry', windowRatio: 0.45,
      exposedStructure: false, ornament: 'low', palette: { body: '#c7a68a', accent: '#7a4b3a', glass: '#5c7484' },
      windowPattern: 'punched', spandrel: 'stripes', ornaments: ['belt-courses', 'arched-entry', 'urns'],
    },
  },
  'high-tech': {
    id: 'high-tech',
    name: 'High-Tech',
    era: '1970s–2000s',
    summary: 'The structure is on the outside: giant X-braces, exposed steel and machine-like details.',
    why: 'Putting the bracing on the outside makes the tower very stiff against wind and frees up the floors inside.',
    examples: [
      { name: '875 North Michigan (Hancock Center)', city: 'Chicago' },
      { name: 'Hearst Tower', city: 'New York' },
      { name: 'HSBC Building', city: 'Hong Kong' },
    ],
    settings: {
      shape: 'square', setbacks: 'none', taper: 0, twist: 0, crown: 'lattice-mast', facade: 'metal', windowRatio: 0.7,
      exposedStructure: true, ornament: 'none', palette: { body: '#c0c6cc', accent: '#d33f2f', glass: '#6b8797' },
      windowPattern: 'exposed-frame', spandrel: 'plain', ornaments: ['accent-ties'],
    },
  },
  'neo-futurist': {
    id: 'neo-futurist',
    name: 'Neo-futurist',
    era: '2000s–today',
    summary: 'Sculpted supertalls that taper and twist, designed with computers and wind tunnels.',
    why: 'Twisting and tapering confuse the wind so the tower sways less — Shanghai Tower cut its wind load by about a quarter.',
    examples: [
      { name: 'Shanghai Tower', city: 'Shanghai' },
      { name: 'Burj Khalifa', city: 'Dubai' },
      { name: 'Tokyo Skytree', city: 'Tokyo' },
    ],
    settings: {
      shape: 'circle', setbacks: 'none', taper: 0.3, twist: 120, crown: 'open-frame', facade: 'glass', windowRatio: 0.85,
      exposedStructure: false, ornament: 'none', palette: { body: '#a9c6d6', accent: '#e0e6ea', glass: '#7fa9c2' },
      windowPattern: 'diamond', spandrel: 'plain', ornaments: ['ribbon-bands'],
    },
  },
};

export const STYLE_IDS = Object.keys(STYLE_PRESETS) as StyleId[];
