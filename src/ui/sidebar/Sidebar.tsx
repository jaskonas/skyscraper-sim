import { useGame } from '../../state/store';
import { AssessmentPanel } from './AssessmentPanel';
import { BriefCard } from './BriefCard';
import { BuildBar } from './BuildBar';
import { ConstructionCard } from './ConstructionCard';
import { ControlGroups } from './ControlGroups';
import { Gauges } from './Gauges';
import { SidebarHeader } from './SidebarHeader';
import { StylePicker } from './StylePicker';

export function Sidebar() {
  const phase = useGame((s) => s.phase);
  const hasProject = useGame((s) => s.project !== null);
  if (!hasProject) return null;
  return (
    <aside className="sidebar">
      <SidebarHeader />
      <div className="sidebar-scroll">
        {phase === 'complete' ? (
          <AssessmentPanel />
        ) : phase === 'building' ? (
          <ConstructionCard />
        ) : (
          <>
            <BriefCard />
            <Gauges />
            <StylePicker />
            <ControlGroups />
          </>
        )}
      </div>
      {phase === 'design' && <BuildBar />}
    </aside>
  );
}
