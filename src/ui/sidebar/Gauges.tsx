import { COEFFICIENTS } from '../../sim/catalog/coefficients';
import { formatMoney } from '../../sim/format';
import type { CheckId, CheckStatus } from '../../sim/types';
import { useCurrent } from '../../state/hooks';

interface GaugeProps {
  label: string;
  valueText: string;
  status: CheckStatus;
  /** 0..1 how full the bar is. */
  fraction: number;
}

export function Gauge({ label, valueText, status, fraction }: GaugeProps) {
  return (
    <div className={`gauge gauge-${status}`} aria-label={`${label}: ${valueText} (${status})`}>
      <div className="gauge-top">
        <span>{label}</span>
        <span>{valueText}</span>
      </div>
      <div className="gauge-track">
        <div className="gauge-fill" style={{ width: `${Math.max(4, Math.min(1, fraction) * 100)}%` }} />
      </div>
    </div>
  );
}

const statusOf = (value: number, limit: number): CheckStatus => (value <= limit ? 'pass' : value <= limit * 1.1 ? 'marginal' : 'fail');

export function Gauges() {
  const { brief, analysis, site } = useCurrent();
  const check = (id: CheckId) => analysis.checks.find((c) => c.id === id)!;
  const briefBudget = brief?.required.find((r) => r.kind === 'maxBudget');
  const budget =
    briefBudget && briefBudget.kind === 'maxBudget'
      ? briefBudget.value
      : COEFFICIENTS.cost.benchmarkPerM2 * site.costMultiplier * analysis.gfa;
  const w = analysis.wind;
  const e = analysis.elevators;
  return (
    <section className="card" aria-label="Live estimates">
      <p className="stats">
        {Math.round(analysis.heightM)} m tall · {Math.round(analysis.gfa).toLocaleString()} m² · {analysis.schedule.totalDays} days to build
      </p>
      <Gauge
        label={briefBudget ? 'Budget' : 'Cost vs typical'}
        valueText={`${formatMoney(analysis.cost.total)} / ${formatMoney(budget)}`}
        status={statusOf(analysis.cost.total, budget)}
        fraction={analysis.cost.total / (budget * 1.2)}
      />
      <Gauge label="Wind strength" valueText={`1/${Math.round(1 / w.driftRatio)}`} status={check('windStrength').status} fraction={w.driftRatio / (COEFFICIENTS.wind.driftMarginal * 1.2)} />
      <Gauge label="Sway comfort" valueText={`${w.accelMg.toFixed(1)} / ${w.comfortLimitMg} mg`} status={check('windComfort').status} fraction={w.accelMg / (w.comfortLimitMg * 1.5)} />
      <Gauge label="Earthquake" valueText={analysis.seismic.outcome} status={check('seismic').status} fraction={analysis.seismic.ratio / 1.2} />
      <Gauge label="Foundation" valueText={`${Math.round(analysis.foundation.utilization * 100)}% load`} status={check('foundation').status} fraction={analysis.foundation.utilization / 1.2} />
      <Gauge label="Elevator wait" valueText={e.avgWaitS >= 999 ? 'overwhelmed' : `${Math.round(e.avgWaitS)} / ${e.targetS} s`} status={check('elevators').status} fraction={e.avgWaitS / (e.targetS * 2)} />
      <Gauge label="Energy" valueText={`${Math.round(analysis.energy.euiKWhPerM2)} kWh/m²`} status={check('energy').status} fraction={analysis.energy.euiKWhPerM2 / 360} />
    </section>
  );
}
