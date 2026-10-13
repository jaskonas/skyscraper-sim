import { beforeEach, describe, expect, it } from 'vitest';
import { useBuildProgress } from './buildProgress';
import { selectCanRedo, selectCanUndo, selectDesign, useGame } from './store';

const state = () => useGame.getState();
const design = () => selectDesign(state())!;

describe('game store', () => {
  beforeEach(() => {
    state().newProject();
    state().startProject('chicago', 'sandbox');
  });

  it('starts a project with the default design', () => {
    expect(state().project).toEqual({ siteId: 'chicago', mode: 'sandbox', briefId: null });
    expect(design().floors).toBe(40);
    expect(selectCanUndo(state())).toBe(false);
  });

  it('keeps the brief only in challenge mode', () => {
    state().startProject('tokyo', 'challenge', 'tokyo-quake');
    expect(state().project?.briefId).toBe('tokyo-quake');
    state().startProject('tokyo', 'sandbox', 'tokyo-quake');
    expect(state().project?.briefId).toBeNull();
  });

  it('pushes each change onto history and undoes/redoes it', () => {
    state().dispatch([{ type: 'set_parameter', id: 'floors', value: 50 }]);
    state().dispatch([{ type: 'set_parameter', id: 'floors', value: 60 }]);
    expect(design().floors).toBe(60);
    state().undo();
    expect(design().floors).toBe(50);
    state().undo();
    expect(design().floors).toBe(40);
    expect(selectCanRedo(state())).toBe(true);
    state().redo();
    expect(design().floors).toBe(50);
  });

  it('coalesces a slider drag into one undo step', () => {
    for (const v of [41, 42, 43, 44]) state().dispatch([{ type: 'set_parameter', id: 'floors', value: v }], { coalesceKey: 'floors' });
    expect(state().history).toHaveLength(2);
    state().undo();
    expect(design().floors).toBe(40);
  });

  it('does not coalesce across different controls', () => {
    state().dispatch([{ type: 'set_parameter', id: 'floors', value: 45 }], { coalesceKey: 'floors' });
    state().dispatch([{ type: 'set_parameter', id: 'twist', value: 10 }], { coalesceKey: 'twist' });
    state().dispatch([{ type: 'set_parameter', id: 'floors', value: 46 }], { coalesceKey: 'floors' });
    expect(state().history).toHaveLength(4);
  });

  it('a new change after undo discards the redo branch', () => {
    state().dispatch([{ type: 'set_parameter', id: 'floors', value: 50 }]);
    state().undo();
    state().dispatch([{ type: 'set_parameter', id: 'floors', value: 70 }]);
    expect(selectCanRedo(state())).toBe(false);
    expect(state().history.map((d) => d.floors)).toEqual([40, 70]);
  });

  it('ignores a batch where nothing applies', () => {
    const r = state().dispatch([{ type: 'set_parameter', id: 'floors', value: 9999 }]);
    expect(r.rejected).toHaveLength(1);
    expect(state().history).toHaveLength(1);
  });

  it('locks the design after build: no changes, no undo', () => {
    state().dispatch([{ type: 'set_parameter', id: 'floors', value: 50 }]);
    state().build();
    expect(state().phase).toBe('building');
    const r = state().dispatch([{ type: 'set_parameter', id: 'floors', value: 60 }]);
    expect(r.applied).toHaveLength(0);
    expect(selectCanUndo(state())).toBe(false);
    state().undo();
    expect(design().floors).toBe(50);
  });

  it('new project returns to site select', () => {
    state().newProject();
    expect(state().project).toBeNull();
    expect(selectDesign(state())).toBeUndefined();
  });

  it('two separate drags of the same slider are two undo steps', () => {
    for (const v of [45, 50]) state().dispatch([{ type: 'set_parameter', id: 'floors', value: v }], { coalesceKey: 'floors' });
    state().endCoalesce();
    for (const v of [55, 60]) state().dispatch([{ type: 'set_parameter', id: 'floors', value: v }], { coalesceKey: 'floors' });
    state().undo();
    expect(design().floors).toBe(50);
  });
});

describe('construction', () => {
  beforeEach(() => {
    state().newProject();
    state().startProject('chicago', 'sandbox');
  });

  it('Build starts the first of six stages instead of jumping to the finished tower', () => {
    state().build();
    expect(state()).toMatchObject({ phase: 'building', buildStage: 0, stageDone: false });
    expect(useBuildProgress.getState().t).toBe(0);
  });

  it('Next waits until the stage has finished playing, then moves on', () => {
    state().build();
    state().nextStage();
    expect(state().buildStage).toBe(0);
    state().finishStage();
    expect(state().stageDone).toBe(true);
    expect(useBuildProgress.getState().t).toBe(1);
    state().nextStage();
    expect(state()).toMatchObject({ buildStage: 1, stageDone: false });
    expect(useBuildProgress.getState().t).toBe(0);
  });

  it('Next on the last stage opens the finished building', () => {
    state().build();
    for (let i = 0; i < 6; i++) {
      state().finishStage();
      state().nextStage();
    }
    expect(state().phase).toBe('complete');
  });

  it('Replay plays the stage again, and Skip goes straight to the finished building', () => {
    state().build();
    state().finishStage();
    const run = state().stageRun;
    state().replayStage();
    expect(state().stageDone).toBe(false);
    expect(state().stageRun).toBe(run + 1);
    state().skipBuild();
    expect(state().phase).toBe('complete');
  });

  it('stage controls do nothing outside construction', () => {
    state().finishStage();
    state().nextStage();
    state().skipBuild();
    expect(state()).toMatchObject({ phase: 'design', buildStage: 0, stageDone: false });
  });

  it('a new project forgets the construction', () => {
    state().build();
    state().finishStage();
    state().nextStage();
    state().newProject();
    state().startProject('tokyo', 'sandbox');
    expect(state()).toMatchObject({ phase: 'design', buildStage: 0, stageDone: false });
  });
});
