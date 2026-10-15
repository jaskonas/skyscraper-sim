import { beforeEach, describe, expect, it } from 'vitest';
import { useGame } from './store';

const state = () => useGame.getState();

describe('force overlay', () => {
  beforeEach(() => {
    state().newProject();
    state().startProject('tokyo', 'sandbox');
  });

  it('starts off, and shows one force at a time', () => {
    expect(state().force).toBe('none');
    state().toggleForce('wind');
    expect(state().force).toBe('wind');
    state().toggleForce('quake');
    expect(state().force).toBe('quake');
    state().toggleForce('quake');
    expect(state().force).toBe('none');
  });

  it('is a view setting: it never touches the design history', () => {
    const history = state().history;
    state().toggleForce('wind');
    expect(state().history).toBe(history);
  });

  it('is remembered through construction, and forgotten by a new project', () => {
    state().toggleForce('quake');
    state().build();
    expect(state().force).toBe('quake');
    state().skipBuild();
    expect(state().force).toBe('quake');
    state().newProject();
    expect(state().force).toBe('none');
  });
});
