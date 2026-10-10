import { describe, expect, it } from 'vitest';
import { defaultDesign } from '../sim/design';
import { SITES } from '../sim/sites';
import { EXPORT_VERSION, designExportPayload } from './exportDesign';

describe('designExportPayload', () => {
  it('round-trips the project and design as JSON', () => {
    const design = defaultDesign(SITES.tokyo);
    const project = { siteId: 'tokyo' as const, mode: 'sandbox' as const, briefId: null };
    const parsed = JSON.parse(designExportPayload(project, design));
    expect(parsed).toEqual({ version: EXPORT_VERSION, project, design });
  });
});
