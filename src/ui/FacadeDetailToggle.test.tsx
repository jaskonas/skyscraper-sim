import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGame } from '../state/store';
import { FacadeDetailToggle } from './FacadeDetailToggle';

describe('facade detail setting', () => {
  beforeEach(() => {
    useGame.getState().newProject();
    useGame.getState().startProject('chicago', 'sandbox');
  });

  it('starts on High, and switches to Simple and back', () => {
    expect(useGame.getState().facadeDetail).toBe('high');
    render(<FacadeDetailToggle />);
    const button = screen.getByRole('button', { name: /Detail: High/ });
    fireEvent.click(button);
    expect(useGame.getState().facadeDetail).toBe('simple');
    expect(screen.getByRole('button', { name: /Detail: Simple/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Detail: Simple/ }));
    expect(useGame.getState().facadeDetail).toBe('high');
  });

  it('is a view setting: kept for a new project, never in the design history', () => {
    const history = useGame.getState().history;
    useGame.getState().setFacadeDetail('simple');
    expect(useGame.getState().history).toBe(history);
    useGame.getState().newProject();
    expect(useGame.getState().facadeDetail).toBe('simple');
    useGame.getState().setFacadeDetail('high');
  });
});
