import { beforeEach, describe, expect, it } from 'vitest';
import { useGame } from './store';

const state = () => useGame.getState();

describe('time of day', () => {
  beforeEach(() => {
    state().newProject();
    state().startProject('chicago', 'sandbox');
  });

  it('switches to night without touching the design history', () => {
    const history = state().history;
    state().setTimeOfDay('night');
    expect(state().timeOfDay).toBe('night');
    expect(state().history).toBe(history);
  });

  it('still works after the design is locked', () => {
    state().build();
    state().setTimeOfDay('night');
    expect(state().timeOfDay).toBe('night');
  });

  it('a new project starts in daylight', () => {
    state().setTimeOfDay('night');
    state().newProject();
    expect(state().timeOfDay).toBe('day');
  });
});
