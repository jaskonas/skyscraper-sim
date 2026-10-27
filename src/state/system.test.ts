import { beforeEach, describe, expect, it } from 'vitest';
import { useGame } from './store';

const state = () => useGame.getState();

describe('systems view', () => {
  beforeEach(() => {
    state().newProject();
    state().startProject('chicago', 'sandbox');
  });

  it('shows one system at a time', () => {
    expect(state().system).toBe('none');
    state().toggleSystem('water');
    expect(state().system).toBe('water');
    state().toggleSystem('power');
    expect(state().system).toBe('power');
    state().toggleSystem('power');
    expect(state().system).toBe('none');
  });

  it('is exclusive with Wind and Earthquake, both ways', () => {
    state().toggleForce('wind');
    state().toggleSystem('water');
    expect([state().system, state().force]).toEqual(['water', 'none']);
    state().toggleForce('quake');
    expect([state().system, state().force]).toEqual(['none', 'quake']);
  });

  it('is a view setting: never in the history, reset by a new project', () => {
    const history = state().history;
    state().toggleSystem('air');
    expect(state().history).toBe(history);
    state().newProject();
    expect(state().system).toBe('none');
  });
});
