import { useEffect, useRef, useState } from 'react';
import type { GamePhase } from '../sim/actions';

/**
 * A counter that re-frames the camera on the tower whenever it goes up: when the player asks ("Fit tower
 * in view"), and when construction ends — by Next, or by Skip from a stage whose camera was elsewhere.
 */
export function useFrameNonce(phase: GamePhase): [number, () => void] {
  const [nonce, setNonce] = useState(0);
  const previous = useRef(phase);
  useEffect(() => {
    if (previous.current === 'building' && phase !== 'building') setNonce((n) => n + 1);
    previous.current = phase;
  }, [phase]);
  return [nonce, () => setNonce((n) => n + 1)];
}
