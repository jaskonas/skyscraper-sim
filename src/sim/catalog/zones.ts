import type { UseType } from '../types';

export type Fit = 'good' | 'ok' | 'bad';

export const FIT_EMOJI: Record<Fit, string> = { good: '👍', ok: '😐', bad: '👎' };

export const USE_LABEL: Record<UseType, { label: string; icon: string; color: string }> = {
  retail: { label: 'Shops', icon: '🛍️', color: '#f2a93b' },
  office: { label: 'Offices', icon: '🏢', color: '#4a7fd4' },
  hotel: { label: 'Hotel', icon: '🛎️', color: '#9a5fd0' },
  residential: { label: 'Homes', icon: '🏠', color: '#4fae6a' },
};

/** Reason lines for the fit ratings. `{depth}` is metres from the core to the windows; `{floor}` counts from 1. */
export const FIT_TEXT = {
  tooDeep: {
    office: 'Desks {depth} m from the windows would be gloomy. Offices like floors 9–18 m deep.',
    hotel: 'Hotel rooms {depth} m from the windows would be dark. Hotels like slim floors (under 10 m deep).',
    residential: 'Homes {depth} m from the windows would be dark. Homes like slim floors (under 12 m deep).',
    retail: '',
  } satisfies Record<UseType, string>,
  tooNarrow: {
    office: 'Offices up here are only {depth} m deep, too narrow for desks.',
    hotel: 'Only {depth} m deep: too narrow for hotel rooms.',
    residential: 'Only {depth} m deep: too narrow for homes.',
    retail: 'Only {depth} m deep: too narrow for shops.',
  } satisfies Record<UseType, string>,
  goodDepth: {
    office: '{depth} m deep: plenty of room for desks near the windows.',
    hotel: 'Every room is close to a window.',
    residential: 'Every home is close to a window.',
    retail: 'Room for big shops.',
  } satisfies Record<UseType, string>,
  street: 'Right on the street, where shoppers walk past.',
  shopsUpHigh: "Shoppers won't ride up to floor {floor} without a reason.",
  shopsByDeck: 'Visitors to the observation deck shop on the way down.',
  streetNoise: 'Street noise and no view down here.',
  smallHotel: 'Too small for a hotel: it needs at least 5 floors for its own lobby and staff.',
};

export function fillText(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ''));
}

/** The 🏷️ Zones view: its button and card. */
export const ZONES_VIEW_TEXT = {
  icon: '🏷️',
  button: 'Zones',
  title: 'Zones',
  payback: 'Pays for itself in {years} years.',
  never: 'It never pays for itself.',
  note: 'Change the zones in the sidebar under Zones.',
};
