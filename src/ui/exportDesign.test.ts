import { describe, expect, it } from 'vitest';
import { defaultDesign } from '../sim/design';
import { SITES } from '../sim/sites';
import { EXPORT_VERSION, designExportPayload, exportFileName } from './exportDesign';

describe('designExportPayload', () => {
  it('round-trips the project and design as JSON', () => {
    const design = defaultDesign(SITES.tokyo);
    const project = { siteId: 'tokyo' as const, mode: 'sandbox' as const, briefId: null, towerName: null };
    const parsed = JSON.parse(designExportPayload(project, design));
    expect(parsed).toEqual({ version: EXPORT_VERSION, project, design });
  });

  it('carries the name and names the file after it', () => {
    const design = defaultDesign(SITES.tokyo);
    const project = { siteId: 'tokyo' as const, mode: 'sandbox' as const, briefId: null, towerName: 'Sakura Sky' };
    expect(JSON.parse(designExportPayload(project, design)).project.towerName).toBe('Sakura Sky');
    expect(exportFileName(project, 123)).toBe('skyscraper-sakura-sky-123.json');
    expect(exportFileName({ ...project, towerName: null }, 123)).toBe('skyscraper-tokyo-123.json');
  });
});
