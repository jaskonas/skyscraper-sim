import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { analyze } from '../../sim/analysis';
import { formatMoney } from '../../sim/format';
import { getSite } from '../../sim/sites';
import { useBuildProgress } from '../../state/buildProgress';
import { selectDesign, useGame } from '../../state/store';
import { ConstructionCard } from './ConstructionCard';

const analysis = () => analyze(getSite('chicago'), selectDesign(useGame.getState())!);

describe('<ConstructionCard />', () => {
  beforeEach(() => {
    useGame.getState().newProject();
    useGame.getState().startProject('chicago', 'sandbox');
    useGame.getState().build();
  });

  it('shows the stage, its explanation, your numbers and the counters', () => {
    render(<ConstructionCard />);
    const card = screen.getByRole('region', { name: 'Construction' });
    expect(within(card).getByRole('heading')).toHaveTextContent('Stage 1 of 6 · Digging the hole');
    expect(within(card).getByText(/Before anything goes up/)).toBeInTheDocument();
    expect(within(card).getByText(/Diggers spend \d+ days on your lot/)).toBeInTheDocument();
    expect(within(card).getByText(`Day 0 of ${analysis().schedule.totalDays}`)).toBeInTheDocument();
    expect(within(card).getByText(`${formatMoney(0)} of ${formatMoney(analysis().cost.total)} spent`)).toBeInTheDocument();
  });

  it('counts the days as the stage plays', () => {
    render(<ConstructionCard />);
    act(() => useBuildProgress.setState({ t: 1 }));
    expect(screen.getByText(/^Day 30 of /)).toBeInTheDocument();
  });

  it('Next is disabled until the stage finishes, then moves to the next stage', () => {
    render(<ConstructionCard />);
    expect(screen.getByRole('button', { name: 'Next ▶' })).toBeDisabled();
    act(() => useGame.getState().finishStage());
    fireEvent.click(screen.getByRole('button', { name: 'Next ▶' }));
    expect(screen.getByRole('heading')).toHaveTextContent('Stage 2 of 6 · Laying the foundation');
  });

  it('the last stage opens the building', () => {
    render(<ConstructionCard />);
    for (let i = 0; i < 5; i++)
      act(() => {
        useGame.getState().finishStage();
        useGame.getState().nextStage();
      });
    act(() => useGame.getState().finishStage());
    fireEvent.click(screen.getByRole('button', { name: 'Open the building' }));
    expect(useGame.getState().phase).toBe('complete');
  });

  it('Replay and Skip to finished', () => {
    render(<ConstructionCard />);
    act(() => useGame.getState().finishStage());
    fireEvent.click(screen.getByRole('button', { name: 'Replay' }));
    expect(screen.getByRole('button', { name: 'Next ▶' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Skip to finished' }));
    expect(useGame.getState().phase).toBe('complete');
  });
});
