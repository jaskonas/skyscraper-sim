import { create } from 'zustand';
import { STAGE_COUNT } from '../sim/construction/stages';
import { applyActions, type ApplyResult, type DesignAction, type GamePhase } from '../sim/actions';
import { defaultDesign } from '../sim/design';
import { getSite } from '../sim/sites';
import type { Design, DetailLevel, SiteId } from '../sim/types';
import { setBuildProgress } from './buildProgress';
import type { SystemId } from '../sim/systems/facts';

export type GameMode = 'challenge' | 'sandbox';
export type TimeOfDay = 'day' | 'night';
/** Which force the 3D view is showing acting on the tower. */
export type ForceView = 'none' | 'wind' | 'quake';
/** Which building system the 3D view is showing inside the tower. */
export type SystemView = 'none' | SystemId;
/** How much detail the facade is drawn with: rooms, recess and reflections, or the plain painted tile. */
export type FacadeDetail = 'high' | 'simple';

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
  /** View only, like `timeOfDay`. Hidden while building, but remembered through it. */
  force: ForceView;
  /** View only, like `force` (and exclusive with it): which building system is showing inside the tower. */
  system: SystemView;
  /** View only, and kept for new projects: it is about what the computer can draw smoothly, not the design. */
  facadeDetail: FacadeDetail;
  /** View only, kept for new projects like `facadeDetail`. Sun shadows also need Detail: High and daylight. */
  shadows: boolean;
  /** Construction stage being shown (0..5) while building. */
  buildStage: number;
  /** The current stage has finished playing, so Next is allowed. */
  stageDone: boolean;
  /** Goes up each time a stage starts playing (including replays), so the 3D view restarts it. */
  stageRun: number;
  startProject: (siteId: SiteId, mode: GameMode, briefId?: string | null) => void;
  dispatch: (actions: DesignAction[], opts?: { coalesceKey?: string }) => DispatchResult;
  /** Call when a drag or key press ends so the next change starts a new undo step. */
  endCoalesce: () => void;
  undo: () => void;
  redo: () => void;
  build: () => void;
  /** The 3D view calls this when the current stage has finished playing. */
  finishStage: () => void;
  nextStage: () => void;
  replayStage: () => void;
  skipBuild: () => void;
  newProject: () => void;
  setTimeOfDay: (t: TimeOfDay) => void;
  /** Show this force, or turn it off if it is already showing. */
  toggleForce: (f: Exclude<ForceView, 'none'>) => void;
  /** Show this system, or turn it off if it is already showing. Turns any force off. */
  toggleSystem: (s: SystemId) => void;
  setFacadeDetail: (d: FacadeDetail) => void;
  setShadows: (on: boolean) => void;
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
  force: 'none',
  system: 'none',
  facadeDetail: 'high',
  shadows: true,
  buildStage: 0,
  stageDone: false,
  stageRun: 0,

  startProject: (siteId, mode, briefId = null) =>
    set({
      project: { siteId, mode, briefId: mode === 'challenge' ? briefId : null },
      phase: 'design',
      history: [defaultDesign(getSite(siteId))],
      historyIndex: 0,
      lastCoalesceKey: null,
      buildStage: 0,
      stageDone: false,
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
    if (!get().project || get().phase !== 'design') return;
    setBuildProgress(0);
    set({ phase: 'building', buildStage: 0, stageDone: false, stageRun: get().stageRun + 1, lastCoalesceKey: null });
  },

  finishStage: () => {
    if (get().phase !== 'building') return;
    setBuildProgress(1);
    set({ stageDone: true });
  },

  nextStage: () => {
    const { phase, buildStage, stageDone, stageRun } = get();
    if (phase !== 'building' || !stageDone) return;
    if (buildStage >= STAGE_COUNT - 1) {
      set({ phase: 'complete' });
      return;
    }
    setBuildProgress(0);
    set({ buildStage: buildStage + 1, stageDone: false, stageRun: stageRun + 1 });
  },

  replayStage: () => {
    if (get().phase !== 'building') return;
    setBuildProgress(0);
    set({ stageDone: false, stageRun: get().stageRun + 1 });
  },

  skipBuild: () => {
    if (get().phase === 'building') set({ phase: 'complete' });
  },

  newProject: () =>
    set({
      project: null,
      phase: 'design',
      history: [],
      historyIndex: -1,
      lastCoalesceKey: null,
      timeOfDay: 'day',
      force: 'none',
      system: 'none',
      buildStage: 0,
      stageDone: false,
    }),

  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),

  toggleForce: (f) => set({ force: get().force === f ? 'none' : f, system: 'none' }),

  toggleSystem: (s) => set({ system: get().system === s ? 'none' : s, force: 'none' }),

  setFacadeDetail: (facadeDetail) => set({ facadeDetail }),

  setShadows: (shadows) => set({ shadows }),
}));

/** Whether the sun casts shadows now: chosen, on Detail: High, and by day (night has no sun). */
export const selectShadowsOn = (s: GameState): boolean => s.shadows && s.facadeDetail === 'high' && s.timeOfDay === 'day';

export const selectDesign = (s: GameState): Design | undefined => s.history[s.historyIndex];
export const selectCanUndo = (s: GameState): boolean => s.phase === 'design' && s.historyIndex > 0;
export const selectCanRedo = (s: GameState): boolean => s.phase === 'design' && s.historyIndex < s.history.length - 1;
