import { AMENITIES } from './catalog/amenities';
import { ORNAMENTS } from './catalog/facades';
import { PARAMS_BY_ID, paramMax, type ParamId } from './catalog/parameters';
import { STYLE_PRESETS } from './catalog/styles';
import { applyStylePreset, normalizeDesign } from './design';
import type { AmenityId, Design, OrnamentId, Site, StyleId, UseType } from './types';
import { USE_ORDER } from './types';

export type GamePhase = 'design' | 'building' | 'complete';

export type DesignAction =
  | { type: 'set_parameter'; id: ParamId; value: number | string | boolean }
  | { type: 'apply_style_preset'; style: StyleId }
  | { type: 'add_amenity'; id: AmenityId }
  | { type: 'remove_amenity'; id: AmenityId }
  | { type: 'add_ornament'; id: OrnamentId }
  | { type: 'remove_ornament'; id: OrnamentId }
  | { type: 'set_use_mix'; mix: Partial<Record<UseType, number>> };

export type ValidationResult = { ok: true } | { ok: false; reason: string };

export interface ApplyResult {
  design: Design;
  applied: DesignAction[];
  rejected: { action: DesignAction; reason: string }[];
}

export function validateAction(action: DesignAction, design: Design, site: Site, phase: GamePhase): ValidationResult {
  if (phase !== 'design') return { ok: false, reason: 'The design is locked once construction starts.' };
  switch (action.type) {
    case 'set_parameter': {
      const def = PARAMS_BY_ID[action.id as ParamId];
      if (!def) return { ok: false, reason: `"${action.id}" is not something this game can change.` };
      if (def.kind === 'number') {
        if (typeof action.value !== 'number' || !Number.isFinite(action.value))
          return { ok: false, reason: `${def.label} needs a number.` };
        const max = paramMax(def, site, design);
        if (action.value < def.min || action.value > max)
          return { ok: false, reason: `${def.label} must be between ${def.min} and ${max}.` };
        return { ok: true };
      }
      if (def.kind === 'boolean') {
        return typeof action.value === 'boolean' ? { ok: true } : { ok: false, reason: `${def.label} must be on or off.` };
      }
      if (!def.options.some((o) => o.value === action.value))
        return { ok: false, reason: `${def.label} can be: ${def.options.map((o) => o.label).join(', ')}.` };
      return { ok: true };
    }
    case 'apply_style_preset':
      return STYLE_PRESETS[action.style] ? { ok: true } : { ok: false, reason: `There is no "${action.style}" style.` };
    case 'add_amenity':
    case 'remove_amenity':
      return AMENITIES[action.id] ? { ok: true } : { ok: false, reason: `There is no "${action.id}" amenity.` };
    case 'add_ornament':
    case 'remove_ornament':
      return ORNAMENTS[action.id] ? { ok: true } : { ok: false, reason: `There is no "${action.id}" ornament.` };
    case 'set_use_mix': {
      const entries = Object.entries(action.mix);
      if (entries.length === 0) return { ok: false, reason: 'The use mix is empty.' };
      for (const [use, v] of entries) {
        if (!USE_ORDER.includes(use as UseType)) return { ok: false, reason: `"${use}" is not a building use.` };
        if (typeof v !== 'number' || v < 0 || v > 100) return { ok: false, reason: 'Use percentages must be 0–100.' };
      }
      const merged = { ...design.useMix, ...action.mix };
      if (USE_ORDER.every((u) => merged[u] <= 0)) return { ok: false, reason: 'At least one use must be above 0%.' };
      return { ok: true };
    }
  }
}

/** Apply one already-validated action. */
export function applyAction(design: Design, action: DesignAction, site: Site): Design {
  switch (action.type) {
    case 'set_parameter': {
      const def = PARAMS_BY_ID[action.id];
      let value = action.value;
      if (def.kind === 'number' && typeof value === 'number') value = Math.round(value / def.step) * def.step;
      if (def.kind === 'number' && typeof value === 'number') value = Number(value.toFixed(4));
      return normalizeDesign({ ...design, [action.id]: value }, site);
    }
    case 'apply_style_preset':
      return normalizeDesign(applyStylePreset(design, action.style), site);
    case 'add_amenity':
      return design.amenities.includes(action.id) ? design : { ...design, amenities: [...design.amenities, action.id] };
    case 'remove_amenity':
      return { ...design, amenities: design.amenities.filter((a) => a !== action.id) };
    case 'add_ornament':
      return design.ornaments.includes(action.id) ? design : { ...design, ornaments: [...design.ornaments, action.id] };
    case 'remove_ornament':
      return { ...design, ornaments: design.ornaments.filter((o) => o !== action.id) };
    case 'set_use_mix':
      return { ...design, useMix: { ...design.useMix, ...action.mix } };
  }
}

/** Validate and apply a batch. Invalid actions are skipped and reported; valid ones still apply. */
export function applyActions(
  design: Design,
  actions: DesignAction[],
  site: Site,
  phase: GamePhase,
): ApplyResult {
  let current = design;
  const applied: DesignAction[] = [];
  const rejected: ApplyResult['rejected'] = [];
  for (const action of actions) {
    const v = validateAction(action, current, site, phase);
    if (v.ok) {
      current = applyAction(current, action, site);
      applied.push(action);
    } else {
      rejected.push({ action, reason: v.reason });
    }
  }
  return { design: current, applied, rejected };
}
