import { useEffect, useState } from 'react';

/** True when the page address asks for the meter (`?fps`). */
export function fpsEnabled(search: string): boolean {
  return new URLSearchParams(search).has('fps');
}

/**
 * A small frame-rate readout for checking speed on a real computer: add `?fps` to the address. It counts
 * animation frames over each second, so it shows what the browser actually manages, shadows and all.
 */
export function FpsMeter() {
  const [on] = useState(() => fpsEnabled(window.location.search));
  const [fps, setFps] = useState<number | null>(null);
  useEffect(() => {
    if (!on) return;
    let frames = 0;
    let start = performance.now();
    let id = requestAnimationFrame(function tick(now) {
      frames++;
      if (now - start >= 1000) {
        setFps(Math.round((frames * 1000) / (now - start)));
        frames = 0;
        start = now;
      }
      id = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [on]);
  if (!on) return null;
  return (
    <div className="fps-meter" aria-live="off">
      {fps === null ? '… fps' : `${fps} fps`}
    </div>
  );
}
