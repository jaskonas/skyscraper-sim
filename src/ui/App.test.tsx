import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGame } from '../state/store';
import { App } from './App';

// WebGL is not available in jsdom; the 3D scene has its own tests.
vi.mock('../scene/Scene', () => ({ Scene: () => <div data-testid="scene" /> }));

describe('App', () => {
  beforeEach(() => useGame.getState().newProject());

  it('goes from site select to the game and back', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Sandbox in Shanghai' }));
    expect(screen.getByTestId('scene')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Shanghai' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'New project' }));
    expect(screen.getByRole('heading', { name: 'Skyscraper Studio' })).toBeInTheDocument();
  });
});
