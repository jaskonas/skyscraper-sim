import { evaluateBrief, sandboxGrades, type GradeCategory } from '../../sim/scoring';
import { useCurrent } from '../../state/hooks';
import { useGame } from '../../state/store';
import { downloadDesign } from '../exportDesign';
import { Stars } from './BriefCard';

const ICON = { pass: '✅', marginal: '⚠️', fail: '❌' } as const;
const GRADE_LABEL: Record<GradeCategory, string> = {
  safety: 'Safety',
  cost: 'Cost',
  comfort: 'Comfort',
  efficiency: 'Efficiency',
  sustainability: 'Sustainability',
};

export function AssessmentPanel() {
  const { project, site, design, analysis, brief } = useCurrent();
  const newProject = useGame((s) => s.newProject);
  const structuralFail = analysis.checks.some(
    (c) => (c.id === 'windStrength' || c.id === 'seismic' || c.id === 'foundation') && c.status === 'fail',
  );
  return (
    <section className="card assessment" aria-label="Engineering assessment">
      <h2>Engineering assessment</h2>
      <p className={structuralFail ? 'verdict fail' : 'verdict pass'}>
        {structuralFail ? '❌ Failed structural engineering assessment' : '✅ Passed structural engineering assessment'}
      </p>
      <ul className="check-list">
        {analysis.checks.map((c) => (
          <li key={c.id}>
            <strong>
              {ICON[c.status]} {c.label}
            </strong>
            <span>{c.message}</span>
          </li>
        ))}
      </ul>
      {brief ? (
        (() => {
          const result = evaluateBrief(brief, design, analysis);
          return (
            <div>
              <h3>
                {brief.title} <Stars count={result.stars} />
              </h3>
              <ul className="req-list">
                {[...result.required, ...result.bonus].map((r, i) => (
                  <li key={i} className={r.met ? 'met' : 'unmet'}>
                    {r.met ? '✅' : '❌'} {r.label} <span className="muted">{r.detail}</span>
                  </li>
                ))}
              </ul>
              <p className="muted">Lesson: {brief.lesson}</p>
            </div>
          );
        })()
      ) : (
        <table className="grades">
          <tbody>
            {Object.entries(sandboxGrades(site, analysis)).map(([k, g]) => (
              <tr key={k}>
                <td>{GRADE_LABEL[k as GradeCategory]}</td>
                <td className={`grade grade-${g}`}>{g}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="assessment-actions">
        <button onClick={() => downloadDesign(project, design)}>Export design (JSON)</button>
        <button onClick={newProject}>New project</button>
      </div>
    </section>
  );
}
