import { describe, expect, it } from 'vitest';
import { normalizeResumeProfile, normalizeJobProfile } from '../engine/universalParsers';

describe('universal parser normalization', () => {
  it('normalizes resume skills and preserves seniority signals', () => {
    const rawResume = {
      contact: { fullName: 'Alex Candidate', email: 'alex@example.com' },
      sections: {
        contactInformation: true,
        professionalSummary: true,
        workExperience: true,
        education: true,
        skills: true
      },
      experience: [
        {
          jobTitle: 'Ops Analyst',
          companyName: 'Example Co',
          startDate: '2020',
          endDate: 'Present',
          bulletPoints: ['Led KPI reporting and reduced cycle time by 18%.'],
          leadershipIndicators: true
        }
      ],
      skills: {
        technical: ['MS Excel', 'G-Sheets', 'PowerBI'],
        business: ['Forecasting'],
        leadership: ['Team management']
      },
      metrics: [{ text: 'Reduced cycle time by 18%', type: 'Efficiency', value: 18, unit: '%' }],
      senioritySignals: { ownershipDensity: 0.3, strategicDensity: 0.2 },
      careerSummary: { totalYearsExperience: 7, careerProgressionPattern: 'Promotion' }
    };

    const profile = normalizeResumeProfile(rawResume, 'Fallback text');
    expect(profile.skills.technical).toContain('Microsoft Excel');
    expect(profile.skills.technical).toContain('Google Sheets');
    expect(profile.skills.technical).toContain('Power BI');
    expect(profile.senioritySignals.ownershipDensity).toBeCloseTo(0.3, 3);
    expect(profile.careerSummary.careerProgressionPattern).toBe('Promotion');
  });

  it('normalizes job skills and seniority level', () => {
    const rawJob = {
      jobInfo: { jobTitle: 'Senior Analyst' },
      responsibilities: {
        primary: ['Own KPI delivery', 'Drive forecasting plans']
      },
      requiredSkills: ['MS Excel', 'SQL', 'G-Sheets'],
      preferredSkills: ['PowerBI'],
      experienceRequirements: { minimumYearsRequired: 5 },
      seniorityLevelInferred: 'Senior'
    };

    const profile = normalizeJobProfile(rawJob, 'Senior role requiring 5+ years');
    expect(profile.requiredSkills).toContain('Microsoft Excel');
    expect(profile.requiredSkills).toContain('Google Sheets');
    expect(profile.preferredSkills).toContain('Power BI');
    expect(profile.seniorityLevelInferred).toBe('Senior');
    expect(profile.experienceRequirements.minimumYearsRequired).toBe(5);
  });
});
