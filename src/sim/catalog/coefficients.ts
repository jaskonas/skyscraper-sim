/**
 * Every rule-of-thumb number the analysis uses, in one place.
 * Each value is chosen to be directionally right and roughly plausible —
 * not engineering-grade. Comments say what real idea each one stands for.
 */
import type {
  AmenityId,
  Damping,
  FacadeType,
  FoundationType,
  Material,
  PlanShape,
  StructuralSystem,
  SystemsGrade,
  UseType,
} from '../types';

export const COEFFICIENTS = {
  weight: {
    /** Dead + live load per m² of floor, kN/m². Concrete floors are much heavier than steel. */
    materialKNPerM2: { steel: 7, composite: 8.5, concrete: 11 } satisfies Record<Material, number>,
    /** Facade weight spread per m² of floor, kN/m². Stone is heavy, glass is light. */
    facadeKNPerM2: { glass: 0.5, metal: 0.6, precast: 1.5, masonry: 2.5 } satisfies Record<FacadeType, number>,
    /** Exposed exterior bracing adds steel. */
    exposedStructureKNPerM2: 0.5,
    /** Amenities are concentrated weight near the top, kN. A rooftop pool is ~2,000 tonnes of water. */
    amenityKN: { helipad: 3000, pool: 20000, 'observation-deck': 2000, 'sky-garden': 6000 } satisfies Record<AmenityId, number>,
  },

  wind: {
    /** Overall scale so a normal 60-storey tower drifts about 1/1400 of its height. */
    driftScale: 0.001,
    /** Wind speed the formula is normalized to, m/s. Pressure grows with speed squared. */
    referenceWindSpeed: 45,
    /** Slenderness (height ÷ base width) a "normal" tower has. Sway grows with slenderness squared. */
    referenceSlenderness: 6,
    /** Drag coefficients: round shapes let wind slip around them. */
    dragByShape: { square: 1.3, rectangle: 1.3, circle: 0.7, triangle: 1.0 } satisfies Record<PlanShape, number>,
    /** Setbacks break up the wind vortices that make towers shake. */
    setbackFactor: { none: 1, few: 0.92, 'wedding-cake': 0.85 },
    /** A full 120° twist cuts wind response by this fraction (Shanghai Tower's trick). */
    twistMaxReduction: 0.25,
    /** Each unit of taper cuts wind response by this fraction (on top of the smaller area). */
    taperReduction: 0.3,
    /** Base stiffness by structural system. */
    systemStiffness: {
      'rigid-frame': 1.0,
      'framed-tube': 1.15,
      'core-outrigger': 1.25,
      'bundled-tube': 1.35,
      diagrid: 1.35,
      'buttressed-core': 1.4,
    } satisfies Record<StructuralSystem, number>,
    /** Storeys each system stays efficient up to. Above this, stiffness falls off fast. */
    systemEfficientUpTo: {
      'rigid-frame': 30,
      'framed-tube': 60,
      'core-outrigger': 100,
      'bundled-tube': 110,
      diagrid: 110,
      'buttressed-core': 170,
    } satisfies Record<StructuralSystem, number>,
    materialStiffness: { steel: 0.9, concrete: 1.1, composite: 1.2 } satisfies Record<Material, number>,
    exposedStructureStiffness: 1.15,
    /** Drift (top movement ÷ height) limits: 1/500 is safe, 1/400 is the edge. */
    driftPass: 1 / 500,
    driftMarginal: 1 / 400,
    /** Converts drift into a top-floor acceleration proxy, milli-g. */
    accelScale: 10000,
    /** Dampers cut the shaking people feel. */
    dampingReduction: { none: 1, viscous: 1.6, tmd: 2.0 } satisfies Record<Damping, number>,
    /** People notice motion more at home than at work, milli-g. */
    comfortLimitMg: { office: 25, retail: 25, hotel: 15, residential: 15 } satisfies Record<UseType, number>,
  },

  seismic: {
    /** Rule of thumb: a building's sway period ≈ storeys ÷ 10 seconds. */
    periodPerFloor: 0.1,
    /** Tall, slow-swaying buildings feel less of the quake's sharp shaking. */
    cornerPeriodS: 2,
    /** Weight per m² treated as "normal". Heavier buildings attract more quake force. */
    referenceKNPerM2: 9,
    /** Base lateral strength a tower is designed with, in g. */
    baseCapacityG: 0.45,
    ductilityByMaterial: { steel: 1.3, composite: 1.2, concrete: 1.0 } satisfies Record<Material, number>,
    ductilityBySystem: {
      'rigid-frame': 1.2,
      'framed-tube': 1.0,
      'core-outrigger': 1.0,
      'bundled-tube': 1.1,
      diagrid: 1.1,
      'buttressed-core': 1.0,
    } satisfies Record<StructuralSystem, number>,
    /** Base isolation bearings let the ground move under the building. */
    isolationReduction: 2.5,
    /** Viscous dampers soak up quake energy; a TMD is tuned for wind and helps less. */
    dampingReduction: { none: 1, viscous: 1.3, tmd: 1.1 } satisfies Record<Damping, number>,
    /** Irregular shapes twist in quakes. */
    shapeIrregularity: { square: 1, circle: 1, rectangle: 1.05, triangle: 1.15 } satisfies Record<PlanShape, number>,
    setbackIrregularity: { none: 1, few: 1.05, 'wedding-cake': 1.1 },
    /** Heavy pool on the roof makes the top whip around. */
    poolIrregularity: 1.05,
    /** Demand ÷ capacity at or below this: fully operational after the quake. */
    operationalRatio: 0.35,
    /** Above operational but at or below this: survives with damage. Above: fails. */
    damagedRatio: 1.0,
  },

  foundation: {
    /** Utilization at or below this passes; up to 1.0 is marginal. */
    passUtilization: 0.8,
    /** Cost per m² of footprint, USD. */
    costPerM2: { mat: 800, raft: 1500, piles: 4000, caissons: 7000 } satisfies Record<FoundationType, number>,
  },

  elevators: {
    /** Gross floor area per person, m². */
    m2PerPerson: { office: 14, residential: 40, hotel: 35, retail: 50 } satisfies Record<UseType, number>,
    /** Share of people arriving in the busiest 5 minutes. Offices have a sharp morning rush. */
    peakFiveMinShare: { office: 0.12, residential: 0.06, hotel: 0.08, retail: 0.02 } satisfies Record<UseType, number>,
    /** People per car trip (16-person car at 80% full). */
    passengersPerTrip: 13,
    /** Seconds per stop: doors, people in and out. */
    secondsPerStop: 6,
    /** Express shuttle speed, m/s. */
    expressSpeed: 10,
    /** A zone can usefully use about this many cars (two banks of eight). */
    maxCarsPerZone: 16,
    /** Share of cars used as sky-lobby shuttles instead of local service. */
    skyLobbyShuttleShare: 0.15,
    /** Average wait ≈ this × the interval between cars. */
    waitPerInterval: 0.6,
    /** Classic office target is ~30 s; homes and hotels tolerate a bit more. */
    targetWaitS: { office: 30, retail: 30, hotel: 45, residential: 45 } satisfies Record<UseType, number>,
    carBaseCost: 250_000,
    carCostPerFloorServed: 12_000,
    skyLobbyCost: 8_000_000,
  },

  energy: {
    /** Lights, computers, appliances, kWh per m² per year. */
    baseEui: 120,
    heatingEui: 150,
    coolingEui: 120,
    /** Heat loss of solid wall per type, relative to glass = 1. Stone and concrete insulate better. */
    opaqueHeatLoss: { glass: 0.6, metal: 0.4, precast: 0.35, masonry: 0.3 } satisfies Record<FacadeType, number>,
    gradeFactor: { standard: 1, efficient: 0.8, green: 0.6 } satisfies Record<SystemsGrade, number>,
    dollarsPerKWh: 0.15,
    /** Rooftop wind turbines cover about 5% of a tower's electricity (Strata SE1 manages ~8%). */
    windTurbineFactor: 0.95,
    /** EUI (kWh/m²/yr) limits. */
    euiPass: 240,
    euiMarginal: 300,
  },

  cost: {
    /** Structure cost per m² of floor, USD. Steel costs more than concrete. */
    structurePerM2: { steel: 1100, composite: 950, concrete: 800 } satisfies Record<Material, number>,
    systemCostFactor: {
      'rigid-frame': 1.0,
      'framed-tube': 1.05,
      'core-outrigger': 1.08,
      'bundled-tube': 1.12,
      diagrid: 1.15,
      'buttressed-core': 1.1,
    } satisfies Record<StructuralSystem, number>,
    /** Taller is harder: cranes, pumping concrete, safety. Cost × (1 + floors / this). */
    heightPremiumFloors: 150,
    exposedStructureFactor: 1.05,
    /** Facade cost per m² of wall. Windows cost windowPerM2; the rest is the solid wall type. */
    windowPerM2: 900,
    opaquePerM2: { glass: 800, metal: 700, precast: 500, masonry: 1100 } satisfies Record<FacadeType, number>,
    ornamentFactor: { none: 1, low: 1.05, high: 1.15 },
    interiorsPerM2: { office: 1200, residential: 1600, hotel: 2000, retail: 1000 } satisfies Record<UseType, number>,
    systemsPerM2: { standard: 600, efficient: 750, green: 950 } satisfies Record<SystemsGrade, number>,
    /** Damper cost for a 60-storey tower, scaled by floors / 60. */
    dampingCost60: { none: 0, tmd: 5_000_000, viscous: 3_000_000 } satisfies Record<Damping, number>,
    isolationPerM2: 3000,
    amenityCost: { helipad: 3_000_000, pool: 12_000_000, 'observation-deck': 15_000_000, 'sky-garden': 20_000_000 } satisfies Record<AmenityId, number>,
    /** Typical all-in cost per m² before the city multiplier, used for sandbox grading. */
    benchmarkPerM2: 4200,
  },

  schedule: {
    excavationDays: 30,
    foundationDays: { mat: 60, raft: 90, piles: 150, caissons: 180 } satisfies Record<FoundationType, number>,
    /** Days per storey of frame. Steel goes up fastest. */
    daysPerFloor: { steel: 3, composite: 3.5, concrete: 4 } satisfies Record<Material, number>,
    diagridFactor: 1.2,
    exposedStructureFactor: 1.1,
    /** Facade starts once the frame is this many floors ahead. */
    facadeLagFloors: 8,
    crownDays: 30,
    amenityDays: 20,
    fitoutDays: 120,
  },
} as const;
