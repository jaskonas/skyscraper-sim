import { create } from 'zustand';

/**
 * How far (0..1) the current construction stage has played. The 3D view advances it about ten times a
 * second while a stage plays; kept apart from the game store so those updates re-render only the counters.
 */
export const useBuildProgress = create<{ t: number }>(() => ({ t: 0 }));

export const setBuildProgress = (t: number) => useBuildProgress.setState({ t });
