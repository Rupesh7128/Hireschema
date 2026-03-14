import { describe, expect, it } from 'vitest';
import { computeDeterministicScoreBundle } from '../engine/scoringMath';
import { type ParsedJobProfile, type ParsedResumeProfile } from '../engine/universalParsers';

const resumeFixture: ParsedResumeProfile = {
  contact: {
    fullName: 'Alex Candidate',
    email: 'alex@example.com',
    phone: '+1 555 555 5555',
    linkedInUrl: 'https://linkedin.com/in/alex',
    githubUrl: null,
    portfolioUrl: null,
    location: 'Austin, TX'
  },
  sections: {
    contactInformation: true,
    professionalSummary: true,
    workExperience: true,
    education: true,
    skills: true,
    certifications: false,
    projects: true,
    publications: false,
    awards: false,
    volunteerExperience: false
  },
  professionalSummary: 'Operations analyst with measurable impact.',
  experience: [
    {
      jobTitle: 'Senior Operations Analyst',
      companyName: 'Example Co',
      industry: 'Retail',
      employmentType: 'Full-time',
      startDate: 'Jan 2020',
      endDate: 'Present',
      durationMonths: 60,
      bulletPoints: [
        'Led weekly KPI reviews and reduced stockout incidents by 23%.',
        'Built SQL and Tableau dashboards used by leadership for planning.'
      ],
      leadershipIndicators: true,
      teamSize: 6,
      budgetOwnership: '$250K'
    }
  ],
  education: [],
  skills: {
    technical: ['SQL', 'Tableau', 'Microsoft Excel'],
    business: ['Forecasting', 'Stakeholder Management'],
    leadership: ['Team Management']
  },
  metrics: [
    { text: 'Reduced stockout incidents by 23%', type: 'Operational Improvement', value: 23, unit: '%' }
  ],
  senioritySignals: {
    ownershipDensity: 0.35,
    strategicDensity: 0.22
  },
  careerSummary: {
    totalYearsExperience: 8,
    totalLeadershipYears: 4,
    industryCluster: 'Retail',
    careerProgressionPattern: 'Promotion'
  }
};

const jobFixture: ParsedJobProfile = {
  jobInfo: {
    jobTitle: 'Lead Operations Analyst',
    company: 'Target Co',
    location: 'Austin, TX',
    employmentType: 'Full-time',
    industry: 'Retail',
    department: 'Operations'
  },
  responsibilities: {
    primary: [
      'Own KPI reporting and dashboard delivery',
      'Drive cross-functional forecasting improvements'
    ],
    secondary: []
  },
  requiredSkills: ['SQL', 'Tableau', 'Forecasting', 'Inventory Management'],
  preferredSkills: ['Python'],
  experienceRequirements: {
    minimumYearsRequired: 6,
    preferredYears: 8
  },
  educationRequirements: {
    requirement: 'Bachelors'
  },
  certifications: [],
  seniorityLevelInferred: 'Lead',
  compensation: {
    salaryRange: null,
    bonus: null,
    equity: null,
    benefits: []
  }
};

describe('computeDeterministicScoreBundle', () => {
  it('returns bounded baseline and job scores with missing required skills', () => {
    const bundle = computeDeterministicScoreBundle(
      resumeFixture,
      jobFixture,
      `
      SUMMARY
      Led operations analytics.
      EXPERIENCE
      - Led weekly KPI reviews and reduced stockout incidents by 23%.
      - Built SQL and Tableau dashboards used by leadership.
      SKILLS
      SQL, Tableau, Microsoft Excel, Forecasting
      `,
      `
      Lead Operations Analyst
      Required: SQL, Tableau, Forecasting, Inventory Management
      Responsibilities: KPI reporting, forecasting improvements
      `
    );

    expect(bundle.baseline.ats_score).toBeGreaterThanOrEqual(0);
    expect(bundle.baseline.ats_score).toBeLessThanOrEqual(100);
    expect(bundle.jobSpecific.recruiter_score).toBeGreaterThanOrEqual(0);
    expect(bundle.jobSpecific.recruiter_score).toBeLessThanOrEqual(100);
    expect(bundle.missingRequiredSkills).toContain('Inventory Management');
    expect(bundle.relevanceScore).toBeGreaterThan(0);
    expect(bundle.atsBreakdown.keywords).toBeGreaterThanOrEqual(0);
    expect(bundle.atsBreakdown.keywords).toBeLessThanOrEqual(100);
  });
});
