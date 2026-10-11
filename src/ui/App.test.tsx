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
    fireEvent.click(screen.getByRole('button', { name: 'Yes, start over' }));
    expect(screen.getByRole('heading', { name: 'Skyscraper Studio' })).toBeInTheDocument();
  });

  it('starts each screen at the top of the page, whatever was scrolled before', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    render(<App />);
    scrollTo.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Sandbox in Chicago' }));
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0);
    scrollTo.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'New project' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, start over' }));
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0);
    scrollTo.mockRestore();
  });
});
