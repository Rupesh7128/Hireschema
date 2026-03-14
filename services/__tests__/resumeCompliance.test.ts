import { describe, expect, it } from 'vitest';
import { validateResumeMarkdown } from '../resumeCompliance';

const baseMarkdown = `## SUMMARY
Operations professional with customer-facing experience.

## EXPERIENCE
### Specialist | Example Co | 2021-2024 | Austin, TX
- Managed support workflows and escalations.

## SKILLS
- Service Delivery

## EDUCATION
### BA | State University | 2017-2021 | Austin, TX`;

describe('resumeCompliance keyword alternatives', () => {
  it('marks a high-risk keyword as alternative_applied when safe phrasing is present', () => {
    const report = validateResumeMarkdown({
      markdown: baseMarkdown.replace('Service Delivery', 'Customer Interactions and Service Delivery'),
      jobDescription: 'Need strong customer experience ownership.',
      originalResumeText: 'Handled customer calls and support escalation tickets.',
      targetKeywords: ['Customer Experience'],
      removeRiskyKeywords: false
    });

    const row = report.keyword_justifications[0];
    expect(row.keyword).toBe('Customer Experience');
    expect(row.used).toBe(false);
    expect(row.alternative_applied).toBe(true);
  });

  it('keeps direct keyword usage as used when present', () => {
    const report = validateResumeMarkdown({
      markdown: baseMarkdown.replace('Service Delivery', 'Customer Experience'),
      jobDescription: 'Need strong customer experience ownership.',
      originalResumeText: 'Owned customer experience initiatives and support quality.',
      targetKeywords: ['Customer Experience'],
      removeRiskyKeywords: false
    });

    const row = report.keyword_justifications[0];
    expect(row.used).toBe(true);
    expect(row.alternative_applied).toBe(false);
  });
});
