import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FpsMeter, fpsEnabled } from './FpsMeter';

describe('frame-rate meter', () => {
  it('is turned on by an fps key in the address', () => {
    expect(fpsEnabled('?fps')).toBe(true);
    expect(fpsEnabled('?x=1&fps=1')).toBe(true);
    expect(fpsEnabled('')).toBe(false);
    expect(fpsEnabled('?fpsx=1')).toBe(false);
  });

  it('shows nothing normally', () => {
    const { container } = render(<FpsMeter />);
    expect(container).toBeEmptyDOMElement();
  });
});
