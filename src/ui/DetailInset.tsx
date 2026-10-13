import { useEffect, useState } from 'react';
import { DetailCanvas } from '../scene/detail/DetailCanvas';
import { DETAIL_VIEWS, detailModel, type DetailView } from '../scene/detail/detailModel';
import { useCurrent } from '../state/hooks';
import { useGame } from '../state/store';

const STORE_KEY = 'detail-inset';

/** Remembered for this browser session only; storage can be missing or blocked, so every access is guarded. */
function loadPrefs(): { view: DetailView; minimized: boolean } | null {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function savePrefs(prefs: { view: DetailView; minimized: boolean }) {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(prefs));
  } catch {
    // Not saved — the inset still works.
  }
}

/** Narrow screens (phones) start with the close-up tucked away so it doesn't cover the tower. */
const startsMinimized = () => typeof window !== 'undefined' && window.innerWidth < 900;

/** A picture-in-picture close-up of the facade, a setback corner or the base, in true 3D. */
export function DetailInset() {
  const { site, design } = useCurrent();
  const night = useGame((s) => s.timeOfDay === 'night');
  const building = useGame((s) => s.phase === 'building');
  const [prefs, setPrefs] = useState(() => loadPrefs() ?? { view: 'facade' as DetailView, minimized: startsMinimized() });
  useEffect(() => savePrefs(prefs), [prefs]);
  const caption = detailModel(design, prefs.view).caption;

  // The bare structure is the point of construction; the close-up shows the finished facade, so it waits.
  if (building) return null;
  if (prefs.minimized) {
    return (
      <button className="detail-open" onClick={() => setPrefs({ ...prefs, minimized: false })}>
        🔍 Close-up
      </button>
    );
  }
  return (
    <section className="detail-inset" aria-label="Close-up">
      <div className="detail-bar">
        {DETAIL_VIEWS.map((v) => (
          <button key={v.id} aria-pressed={prefs.view === v.id} onClick={() => setPrefs({ ...prefs, view: v.id })}>
            {v.label}
          </button>
        ))}
        <button className="detail-min" aria-label="Minimize close-up" onClick={() => setPrefs({ ...prefs, minimized: true })}>
          ▁
        </button>
      </div>
      <DetailCanvas site={site} design={design} view={prefs.view} night={night} />
      <p className="detail-caption">{caption}</p>
    </section>
  );
}
