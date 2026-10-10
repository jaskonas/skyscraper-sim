import { beforeEach, describe, expect, it } from 'vitest';
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
    expect(state().phase).toBe('complete');
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
