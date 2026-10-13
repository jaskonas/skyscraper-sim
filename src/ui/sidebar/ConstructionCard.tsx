import { useMemo } from 'react';
import { stageCaption } from '../../sim/construction/captions';
import { STAGE_COUNT, constructionStages, constructionState } from '../../sim/construction/stages';
import { formatMoney } from '../../sim/format';
import { useBuildProgress } from '../../state/buildProgress';
import { useCurrent } from '../../state/hooks';
import { useGame } from '../../state/store';

/** The sidebar while the tower is being built: one stage at a time, explained, with Next, Replay and Skip. */
export function ConstructionCard() {
  const { site, design, analysis } = useCurrent();
  const stage = useGame((s) => s.buildStage);
  const done = useGame((s) => s.stageDone);
  const { nextStage, replayStage, skipBuild } = useGame.getState();
  const t = useBuildProgress((s) => s.t);
  const stages = useMemo(() => constructionStages(design, analysis), [design, analysis]);
  const caption = useMemo(() => stageCaption(design, site, analysis, stage), [design, site, analysis, stage]);
  const now = constructionState(design, analysis, stage, t);
  const total = analysis.cost.total;
  const last = stage === STAGE_COUNT - 1;
  return (
    <section className="card construction" aria-label="Construction">
      <h2>
        Stage {stage + 1} of {STAGE_COUNT} · {caption.title}
      </h2>
      <ol className="stage-strip" aria-hidden="true">
        {stages.map((s, i) => (
          <li key={s.id} className={i < stage ? 'done' : i === stage ? 'current' : ''} title={s.label} />
        ))}
      </ol>
      <div className="counters">
        <p>
          Day {now.day} of {analysis.schedule.totalDays}
        </p>
        <p>
          {formatMoney(now.spent)} of {formatMoney(total)} spent
        </p>
        <div className="spent-bar">
          <span style={{ width: `${Math.min(100, (now.spent / total) * 100)}%` }} />
        </div>
      </div>
      <p className="idea">{caption.idea}</p>
      <p className="yours">{caption.yours}</p>
      <div className="construction-buttons">
        <button className="build-button" onClick={nextStage} disabled={!done}>
          {last ? 'Open the building' : 'Next ▶'}
        </button>
        <button onClick={replayStage}>Replay</button>
        <button onClick={skipBuild}>Skip to finished</button>
      </div>
    </section>
  );
}
