import { describe, it, expect } from 'vitest';
import { normalizeAtsResumeMarkdown } from '../atsResumeMarkdown';

describe('normalizeAtsResumeMarkdown', () => {
  it('normalizes common section headers and spacing', () => {
    const input = `## Summary
Text line
## Experices
- Bullet
## skills
JavaScript, React
## Education
School`;

    const out = normalizeAtsResumeMarkdown(input);

    expect(out).toMatch(/^## SUMMARY\n/m);
    expect(out).toMatch(/^## EXPERIENCE\n/m);
    expect(out).toMatch(/^## SKILLS\n/m);
    expect(out).toMatch(/^## EDUCATION\n/m);
    expect(out).not.toMatch(/## Experices/i);
    expect(out).toMatch(/\nText line\n\n## EXPERIENCE\n/);
  });
});
