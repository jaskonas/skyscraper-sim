import { evaluateBrief } from '../../sim/scoring';
import { useCurrent } from '../../state/hooks';

export function Stars({ count }: { count: number }) {
  return (
    <span className="stars" aria-label={`${count} of 3 stars`}>
      {[0, 1, 2].map((i) => (i < count ? '★' : '☆')).join('')}
    </span>
  );
}

export function BriefCard() {
  const { brief, design, analysis } = useCurrent();
  if (!brief) return null;
  const result = evaluateBrief(brief, design, analysis);
  return (
    <section className="card brief-card" aria-label="Client brief">
      <div className="card-title-row">
        <h2>{brief.title}</h2>
        <Stars count={result.stars} />
      </div>
      <p className="muted">{brief.client}</p>
      <p>{brief.blurb}</p>
      <ul className="req-list">
        {result.required.map((r, i) => (
          <li key={i} className={r.met ? 'met' : 'unmet'} title={r.detail}>
            {r.met ? '✅' : '❌'} {r.label}
          </li>
        ))}
      </ul>
      <p className="label">Bonus stars</p>
      <ul className="req-list">
        {result.bonus.map((r, i) => (
          <li key={i} className={r.met ? 'met' : 'unmet'} title={r.detail}>
            {r.met ? '★' : '☆'} {r.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
