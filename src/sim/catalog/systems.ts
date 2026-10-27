import type { SystemId } from '../systems/facts';

/** Button labels and card titles. */
export const SYSTEM_LABEL: Record<SystemId, { icon: string; label: string; title: string }> = {
  power: { icon: '⚡', label: 'Power', title: 'Power' },
  water: { icon: '💧', label: 'Water', title: 'Water' },
  waste: { icon: '🚽', label: 'Waste', title: 'Waste' },
  elevators: { icon: '🛗', label: 'Elevators', title: 'Elevators' },
  air: { icon: '🌬️', label: 'Air', title: 'Air' },
};

const floorList = (fs: number[]) => (fs.length === 1 ? `floor ${fs[0]}` : `floors ${fs.slice(0, -1).join(', ')} and ${fs.at(-1)}`);

/** Card wording: short, for a young reader, with the tower's own numbers filled in. */
export const SYSTEM_TEXT = {
  note: 'Walls see-through; flow shown much faster than real',
  power: {
    feed: 'Power comes in from the street to transformers in the basement, then up a riser to every floor.',
    substations: (n: number, floors: number[]) => `${n} substation${n === 1 ? '' : 's'} on ${floorList(floors)} boost it again on the way up.`,
    noSubstations: 'Your tower is short enough that one feed reaches the top.',
    turbines: 'The wind turbines on the roof feed in about 5% of the power.',
    solar: 'Solar panels on the roof add clean power.',
    backup: 'Backup generators in the basement start if the street power fails.',
    why: 'Why? Power sent a long way loses strength, so tall towers step it up again partway.',
  },
  water: {
    zones: (zones: number, tanks: number[]) =>
      tanks.length
        ? `Your tower has ${zones} water zones: pumps in the basement and on ${floorList(tanks)} lift water to tanks, then it falls to the taps below each one.`
        : `Your tower has 1 water zone: a pump in the basement lifts water to a tank on the roof, then it falls to the taps.`,
    city: 'The bottom floors run on the city main’s own pressure.',
    pool: 'The rooftop pool has its own pumped loop — and all that water is heavy!',
    garden: 'The sky garden gets its own watering pipe.',
    rain: 'A rainwater tank on the roof supplies the toilets.',
    why: 'Why? City pressure only lifts water about 6 floors, and one giant pump would burst the pipes at the bottom — so tall towers pump in stages and let gravity do the rest.',
  },
  waste: {
    stacks: (n: number) => `${n} drain stacks fall straight down every floor to the sewer under the street.`,
    jogs: 'Bends every 30 floors slow it down so it doesn’t crash into the bottom.',
    vents: 'Vent pipes beside them let air in so the drains flow.',
    grey: 'Your green systems clean shower and sink water (grey water) and pump it back up to flush the toilets.',
    grease: 'The shops at the bottom have a grease trap to keep the sewer clear.',
    why: 'Why? Waste is the one flow that’s free — gravity does all the work.',
  },
  elevators: {
    cars: (cars: number, zones: number) => `${cars} cars in ${zones} zone${zones === 1 ? '' : 's'}.`,
    single: 'Every car stops at every floor.',
    twoZone: (split: number) => `Low cars serve floors up to ${split}; high cars express past them to the floors above.`,
    sky: (shuttles: number, lobbies: number[]) => `${shuttles} express shuttles carry people to sky lobbies on ${floorList(lobbies)}, where local cars take over.`,
    wait: (wait: number, target: number) => `Average wait ${wait} s (target ${target} s).`,
    why: 'Why? In a tall tower, cars stopping at every floor would take forever — zones let each car serve fewer floors.',
  },
  air: {
    handlers: (n: number, floors: number[]) =>
      floors.length
        ? `${n} air handlers on ${floorList(floors)} each look after about 15 floors above and below.`
        : 'Air handlers in the basement and on the roof look after every floor.',
    supply: 'Fresh air goes out in blue ducts; stale air comes back in orange ones.',
    cooling: 'Cooling towers on the roof chill the water that cools the air.',
    efficient: 'Heat-recovery wheels catch the warmth from stale air before it leaves, and the fans slow down when they can.',
    green: 'Heat-recovery wheels catch the warmth from stale air before it leaves, and the fans and pumps run as gently as possible.',
    why: 'Why? Windows on tall towers mostly can’t open — it’s too windy — so every breath of air is pumped in.',
  },
};
