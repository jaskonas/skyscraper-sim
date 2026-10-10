import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { designFor } from '../sim/testUtils';
import { SoilLegend } from './SoilLegend';

describe('SoilLegend', () => {
  it('lists the soil layers and how deep the foundation reaches', () => {
    const { site, design } = designFor('chicago', { foundation: 'caissons' });
    render(<SoilLegend site={site} design={design} />);
    expect(screen.getByText('Soft blue clay')).toBeInTheDocument();
    expect(screen.getByText('Bedrock')).toBeInTheDocument();
    expect(screen.getByText(/Your caissons reach 36 m/)).toBeInTheDocument();
  });

  it('says how far down bedrock is when it is out of view', () => {
    const { site, design } = designFor('shanghai');
    render(<SoilLegend site={site} design={design} />);
    expect(screen.getByText(/Bedrock is 300 m down/)).toBeInTheDocument();
  });
});
