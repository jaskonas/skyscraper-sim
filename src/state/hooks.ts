import { useMemo } from 'react';
import { analyze } from '../sim/analysis';
import { getBrief, type Brief } from '../sim/briefs';
import { getSite } from '../sim/sites';
import type { Analysis, Design, Site } from '../sim/types';
import { selectDesign, useGame, type Project } from './store';

export interface CurrentProject {
  project: Project;
  site: Site;
  design: Design;
  analysis: Analysis;
  brief: Brief | undefined;
}

/** Everything about the open project. Only call inside the game screen (a project must be open). */
export function useCurrent(): CurrentProject {
  const project = useGame((s) => s.project);
  const design = useGame(selectDesign);
  if (!project || !design) throw new Error('useCurrent called with no open project');
  const site = getSite(project.siteId);
  const analysis = useMemo(() => analyze(site, design), [site, design]);
  const brief = project.briefId ? getBrief(project.briefId) : undefined;
  return { project, site, design, analysis, brief };
}
