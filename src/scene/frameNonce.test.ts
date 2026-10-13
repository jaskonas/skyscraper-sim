import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { GamePhase } from '../sim/actions';
import { useFrameNonce } from './frameNonce';

describe('useFrameNonce', () => {
  it('re-frames the tower when construction ends, however it ends, and when asked', () => {
    const { result, rerender } = renderHook(({ phase }: { phase: GamePhase }) => useFrameNonce(phase), { initialProps: { phase: 'design' as GamePhase } });
    const start = result.current[0];
    rerender({ phase: 'building' });
    expect(result.current[0]).toBe(start);
    rerender({ phase: 'complete' });
    expect(result.current[0]).toBe(start + 1);
    rerender({ phase: 'complete' });
    expect(result.current[0]).toBe(start + 1);
    act(() => result.current[1]());
    expect(result.current[0]).toBe(start + 2);
  });
});
