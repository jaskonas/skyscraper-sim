import { create } from 'zustand';
import { applyActions, type ApplyResult, type DesignAction, type GamePhase } from '../sim/actions';
import { defaultDesign } from '../sim/design';
import { getSite } from '../sim/sites';
import type { Design, DetailLevel, SiteId } from '../sim/types';

export type GameMode = 'challenge' | 'sandbox';
export type TimeOfDay = 'day' | 'night';

export interface Project {
  siteId: SiteId;
  mode: GameMode;
  briefId: string | null;
}

const HISTORY_LIMIT = 200;

export interface GameState {
  project: Project | null;
  phase: GamePhase;
  history: Design[];
  historyIndex: number;
  /** Consecutive dispatches with the same key (e.g. one slider drag) share one undo step. */
  lastCoalesceKey: string | null;
  detailLevel: DetailLevel;
  /** View only — not part of the design, its history, or the export. */
  timeOfDay: TimeOfDay;
  startProject: (siteId: SiteId, mode: GameMode, briefId?: string | null) => void;
  dispatch: (actions: DesignAction[], opts?: { coalesceKey?: string }) => DispatchResult;
  /** Call when a drag or key press ends so the next change starts a new undo step. */
  endCoalesce: () => void;
  undo: () => void;
  redo: () => void;
  build: () => void;
  newProject: () => void;
  setTimeOfDay: (t: TimeOfDay) => void;
}

export type DispatchResult = Pick<ApplyResult, 'applied' | 'rejected'>;

export const useGame = create<GameState>((set, get) => ({
  project: null,
  phase: 'design',
  history: [],
  historyIndex: -1,
  lastCoalesceKey: null,
  detailLevel: 'standard',
  timeOfDay: 'day',

  startProject: (siteId, mode, briefId = null) =>
    set({
      project: { siteId, mode, briefId: mode === 'challenge' ? briefId : null },
      phase: 'design',
      history: [defaultDesign(getSite(siteId))],
      historyIndex: 0,
      lastCoalesceKey: null,
    }),

  dispatch: (actions, opts) => {
    const { project, phase, history, historyIndex, lastCoalesceKey } = get();
    if (!project) return { applied: [], rejected: actions.map((action) => ({ action, reason: 'No project is open.' })) };
    const current = history[historyIndex];
    const result = applyActions(current, actions, getSite(project.siteId), phase);
    const outcome = { applied: result.applied, rejected: result.rejected };
    if (result.applied.length === 0) return outcome;
    const key = opts?.coalesceKey ?? null;
    const atTip = historyIndex === history.length - 1;
    const replaceTop = key !== null && key === lastCoalesceKey && atTip && historyIndex > 0;
    const base = history.slice(0, replaceTop ? historyIndex : historyIndex + 1);
    const next = [...base, result.design].slice(-HISTORY_LIMIT);
    set({ history: next, historyIndex: next.length - 1, lastCoalesceKey: key });
    return outcome;
  },

  endCoalesce: () => set({ lastCoalesceKey: null }),

  undo: () => {
    const { phase, historyIndex } = get();
    if (phase !== 'design' || historyIndex <= 0) return;
    set({ historyIndex: historyIndex - 1, lastCoalesceKey: null });
  },

  redo: () => {
    const { phase, historyIndex, history } = get();
    if (phase !== 'design' || historyIndex >= history.length - 1) return;
    set({ historyIndex: historyIndex + 1, lastCoalesceKey: null });
  },

  build: () => {
    if (get().project && get().phase === 'design') set({ phase: 'complete', lastCoalesceKey: null });
  },

  newProject: () =>
    set({ project: null, phase: 'design', history: [], historyIndex: -1, lastCoalesceKey: null, timeOfDay: 'day' }),

  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
}));

export const selectDesign = (s: GameState): Design | undefined => s.history[s.historyIndex];
export const selectCanUndo = (s: GameState): boolean => s.phase === 'design' && s.historyIndex > 0;
export const selectCanRedo = (s: GameState): boolean => s.phase === 'design' && s.historyIndex < s.history.length - 1;
