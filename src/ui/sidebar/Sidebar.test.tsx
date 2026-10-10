import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { selectDesign, useGame } from '../../state/store';
import { Sidebar } from './Sidebar';

const design = () => selectDesign(useGame.getState())!;

describe('Sidebar', () => {
  beforeEach(() => {
    useGame.getState().newProject();
    useGame.getState().startProject('tokyo', 'challenge', 'tokyo-quake');
  });

  it('shows the brief with live requirements', () => {
    render(<Sidebar />);
    const brief = screen.getByRole('region', { name: 'Client brief' });
    expect(within(brief).getByText('Open for Business')).toBeInTheDocument();
    expect(within(brief).getByText(/At least 45 floors/)).toHaveClass('unmet');
  });

  it('moving the floors slider changes the design and updates the brief', () => {
    render(<Sidebar />);
    fireEvent.change(screen.getByRole('slider', { name: 'Floors' }), { target: { value: '50' } });
    expect(design().floors).toBe(50);
    expect(screen.getByText(/At least 45 floors/)).toHaveClass('met');
  });

  it('picking a style applies the preset and shows its badge', () => {
    render(<Sidebar />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Style' }), { target: { value: 'art-deco' } });
    expect(design().setbacks).toBe('wedding-cake');
    expect(screen.getByText(/Art Deco · 1925–1940/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('slider', { name: 'Twist' }), { target: { value: '30' } });
    expect(screen.getByText(/Art Deco \(modified\)/)).toBeInTheDocument();
  });

  it('the info button explains a control', () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole('button', { name: 'About Floors' }));
    expect(screen.getByText(/More floors means more space/)).toBeInTheDocument();
  });

  it('undo reverts the last change', () => {
    render(<Sidebar />);
    fireEvent.change(screen.getByRole('slider', { name: 'Floors' }), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(design().floors).toBe(40);
  });

  it('dragging the last use slider to zero is refused', () => {
    render(<Sidebar />);
    fireEvent.change(screen.getByRole('slider', { name: 'Shops share' }), { target: { value: '0' } });
    fireEvent.change(screen.getByRole('slider', { name: 'Offices share' }), { target: { value: '0' } });
    expect(design().useMix.office).toBe(90);
  });

  it('building shows the assessment and hides the controls', () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole('button', { name: 'Build it!' }));
    expect(screen.getByRole('region', { name: 'Engineering assessment' })).toBeInTheDocument();
    expect(screen.queryByRole('slider', { name: 'Floors' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });

  it('a sandbox assessment shows letter grades', () => {
    useGame.getState().startProject('new-york', 'sandbox');
    render(<Sidebar />);
    fireEvent.click(screen.getByRole('button', { name: 'Build it!' }));
    expect(screen.getByText('Safety')).toBeInTheDocument();
    expect(screen.getByText('Sustainability')).toBeInTheDocument();
  });

  it('releasing a slider ends its undo step', () => {
    render(<Sidebar />);
    const floors = screen.getByRole('slider', { name: 'Floors' });
    fireEvent.change(floors, { target: { value: '50' } });
    fireEvent.pointerUp(floors);
    fireEvent.change(floors, { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(design().floors).toBe(50);
  });

  it('asks before New project throws away the design', () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole('button', { name: 'New project' }));
    expect(useGame.getState().project).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Keep designing' }));
    expect(useGame.getState().project).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'New project' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, start over' }));
    expect(useGame.getState().project).toBeNull();
  });
});
