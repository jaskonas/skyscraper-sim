import { useGame } from '../state/store';

/** Turns the sun's shadows on and off. Shadows need Detail: High, so the button is greyed out on Simple. */
export function ShadowToggle() {
  const shadows = useGame((s) => s.shadows);
  const simple = useGame((s) => s.facadeDetail === 'simple');
  const setShadows = useGame((s) => s.setShadows);
  return (
    <button
      aria-pressed={shadows}
      disabled={simple}
      title={simple ? 'Shadows need Detail: High.' : 'Sun shadows. Off is faster on slow computers.'}
      onClick={() => setShadows(!shadows)}
    >
      ☀️ Shadows: {shadows ? 'On' : 'Off'}
    </button>
  );
}
