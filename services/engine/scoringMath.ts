import { type DualScoringReport, type ScoreFactor } from '../resumeCompliance';
import { type ParsedJobProfile, type ParsedResumeProfile, type SeniorityLevel } from './universalParsers';

interface ScoringSignals {
  requiredSkillCoverage: number;
  preferredSkillCoverage: number;
  responsibilityAlignment: number;
  experienceFit: number;
  sectionCompleteness: number;
  parsingHygiene: number;
  keywordPrecision: number;
  impactDensity: number;
  achievementDensity: number;
  leadershipStrength: number;
  seniorityAlignment: number;
  readability: number;
  progression: number;
  skillInventoryDepth: number;
  contactCompleteness: number;
  chronologyStrength: number;
}

export interface DeterministicScoreBundle {
  baseline: DualScoringReport;
  jobSpecific: DualScoringReport;
  missingRequiredSkills: string[];
  matchedKeywords: string[];
  criticalIssues: string[];
  relevanceScore: number;
  atsBreakdown: {
    keywords: number;
    formatting: number;
    sections: number;
  };
  keyStrengths: string[];
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const toPercent = (ratio: number) => Math.round(clamp(ratio) * 100);

const weighted = (factors: ScoreFactor[]) =>
  Math.round(factors.reduce((sum, factor) => sum + (factor.score * factor.weight) / 100, 0));

const normalizeText = (value: string) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s+#./-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (value: string) =>
  normalizeText(value)
    .split(' ')
    .map((word) => word.trim())
    .filter((word) => word.length >= 3);

const dedupe = (items: string[]) => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const key = normalizeText(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
  }
  return out;
};

const skillMatch = (skill: string, resumeSkillsNorm: Set<string>, resumeTextNorm = '') => {
  const key = normalizeText(skill);
  if (!key) return false;
  if (resumeSkillsNorm.has(key)) return true;
  for (const candidate of resumeSkillsNorm) {
    if (candidate === key) return true;
    if (candidate.includes(key) && key.length >= 4) return true;
    if (key.includes(candidate) && candidate.length >= 4) return true;
  }
  // Fallback: check if skill appears in full resume text (handles PDF extraction + parser misses)
  if (resumeTextNorm && key.length >= 3) return resumeTextNorm.includes(key);
  return false;
};

const scoreCoverage = (targetSkills: string[], resumeSkillsNorm: Set<string>, resumeTextNorm = '') => {
  const targets = dedupe(targetSkills).map(normalizeText).filter(Boolean);
  if (targets.length === 0) return 0.8;
  const matched = targets.filter((skill) => skillMatch(skill, resumeSkillsNorm, resumeTextNorm)).length;
  return clamp(matched / targets.length);
};

const scoreResponsibilityAlignment = (resumeText: string, responsibilities: string[]) => {
  if (!responsibilities || responsibilities.length === 0) return 0.75;
  const responsibilityTokens = new Set<string>();
  for (const responsibility of responsibilities) {
    for (const token of tokenize(responsibility)) {
      if (token.length >= 4) responsibilityTokens.add(token);
    }
  }
  if (responsibilityTokens.size === 0) return 0.7;
  const resumeTokens = new Set(tokenize(resumeText));
  const matched = Array.from(responsibilityTokens).filter((token) => resumeTokens.has(token)).length;
  return clamp(matched / responsibilityTokens.size);
};

const scoreExperienceFit = (resumeYears: number | null, minYears: number | null, preferredYears: number | null) => {
  if (resumeYears === null || !Number.isFinite(resumeYears)) return 0.55;
  if (minYears === null || minYears <= 0) return clamp(0.75 + Math.min(0.25, resumeYears / 20));

  if (resumeYears >= minYears) {
    const over = resumeYears - minYears;
    let base = 0.8 + Math.min(0.15, over / 8);
    if (preferredYears && resumeYears >= preferredYears) {
      base += 0.05;
    }
    return clamp(base);
  }

  const ratio = resumeYears / Math.max(minYears, 1);
  return clamp(0.2 + ratio * 0.6);
};

const scoreSectionCompleteness = (resume: ParsedResumeProfile) => {
  const required: Array<keyof ParsedResumeProfile['sections']> = [
    'contactInformation',
    'professionalSummary',
    'workExperience',
    'education',
    'skills'
  ];
  const present = required.filter((key) => resume.sections[key]).length;
  return clamp(present / required.length);
};

const scoreParsingHygiene = (resumeText: string) => {
  const lines = String(resumeText || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return 0.4;
  const bullets = lines.filter((line) => /^[-•*]\s+/.test(line));
  const avgLineLen = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
  const longLines = lines.filter((line) => line.length > 160).length;
  const bulletRatio = bullets.length / Math.max(lines.length, 1);
  const lineLenScore = clamp(1 - Math.abs(avgLineLen - 90) / 110);
  const bulletScore = clamp(bulletRatio / 0.35);
  const longLinePenalty = clamp(longLines / Math.max(lines.length, 1));
  return clamp(0.45 * lineLenScore + 0.4 * bulletScore + 0.15 * (1 - longLinePenalty));
};

const countSkillOccurrences = (resumeText: string, skill: string) => {
  const text = normalizeText(resumeText);
  const key = normalizeText(skill);
  if (!text || !key) return 0;
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const re = new RegExp(`\\b${escaped}\\b`, 'gi');
  const matches = text.match(re);
  return matches ? matches.length : 0;
};

const scoreKeywordPrecision = (resumeText: string, requiredSkills: string[], preferredSkills: string[], requiredCoverage: number) => {
  const targets = dedupe([...requiredSkills, ...preferredSkills]).slice(0, 40);
  if (targets.length === 0) return 0.8;
  let overusePenalty = 0;
  for (const skill of targets) {
    const count = countSkillOccurrences(resumeText, skill);
    if (count > 4) {
      overusePenalty += Math.min(0.08, (count - 4) * 0.02);
    }
  }
  const penalty = clamp(overusePenalty, 0, 0.35);
  return clamp(requiredCoverage * (1 - penalty));
};

const classifyActionBullet = (bullet: string) => {
  return /\b(led|built|delivered|improved|reduced|increased|optimized|launched|managed|designed|implemented|owned)\b/i.test(bullet);
};

const scoreImpactDensity = (resume: ParsedResumeProfile) => {
  const bullets = resume.experience.flatMap((role) => role.bulletPoints);
  if (bullets.length === 0) return 0.35;
  const metricCount = resume.metrics.length;
  const metricDensity = clamp(metricCount / Math.max(4, bullets.length * 0.35));
  const diversity = clamp(new Set(resume.metrics.map((metric) => metric.type)).size / 6);
  return clamp(0.7 * metricDensity + 0.3 * diversity);
};

const scoreAchievementDensity = (resume: ParsedResumeProfile) => {
  const bullets = resume.experience.flatMap((role) => role.bulletPoints);
  if (bullets.length === 0) return 0.35;
  const actionBullets = bullets.filter((bullet) => classifyActionBullet(bullet)).length;
  return clamp(actionBullets / bullets.length);
};

const scoreLeadershipStrength = (resume: ParsedResumeProfile) => {
  const roles = resume.experience;
  if (roles.length === 0) return clamp(resume.senioritySignals.ownershipDensity * 0.7 + resume.senioritySignals.strategicDensity * 0.3);
  const leadershipRoles = roles.filter((role) => role.leadershipIndicators).length;
  const teamSignals = roles.filter((role) => (role.teamSize || 0) > 0 || !!role.budgetOwnership).length;
  const roleLeadershipRatio = leadershipRoles / roles.length;
  const teamSignalRatio = teamSignals / roles.length;
  return clamp(
    0.45 * clamp(resume.senioritySignals.ownershipDensity) +
    0.35 * roleLeadershipRatio +
    0.2 * teamSignalRatio
  );
};

const seniorityTargets: Record<SeniorityLevel, { years: number; ownership: number; strategic: number }> = {
  Entry: { years: 1, ownership: 0.1, strategic: 0.08 },
  Mid: { years: 3, ownership: 0.18, strategic: 0.12 },
  Senior: { years: 6, ownership: 0.26, strategic: 0.2 },
  Lead: { years: 8, ownership: 0.32, strategic: 0.25 },
  Director: { years: 11, ownership: 0.4, strategic: 0.32 },
  Executive: { years: 14, ownership: 0.48, strategic: 0.38 },
  Unknown: { years: 5, ownership: 0.24, strategic: 0.2 }
};

const closeness = (actual: number, target: number, spread: number) =>
  clamp(1 - Math.abs(actual - target) / Math.max(spread, 0.1));

const scoreSeniorityAlignment = (resume: ParsedResumeProfile, job: ParsedJobProfile) => {
  const target = seniorityTargets[job.seniorityLevelInferred || 'Unknown'];
  const years = resume.careerSummary.totalYearsExperience ?? 0;
  const ownership = clamp(resume.senioritySignals.ownershipDensity);
  const strategic = clamp(resume.senioritySignals.strategicDensity);
  const yearsScore = closeness(years, target.years, 6);
  const ownershipScore = closeness(ownership, target.ownership, 0.22);
  const strategicScore = closeness(strategic, target.strategic, 0.2);
  return clamp((yearsScore + ownershipScore + strategicScore) / 3);
};

const scoreReadability = (resume: ParsedResumeProfile) => {
  const bullets = resume.experience.flatMap((role) => role.bulletPoints);
  if (bullets.length === 0) return 0.5;
  const avgWords = bullets.reduce((sum, bullet) => sum + tokenize(bullet).length, 0) / bullets.length;
  const conciseScore = clamp(1 - Math.abs(avgWords - 18) / 20);
  const punctuationScore = clamp(bullets.filter((bullet) => /[.;:]$/.test(bullet.trim()) || /,/.test(bullet)).length / bullets.length);
  return clamp(0.75 * conciseScore + 0.25 * punctuationScore);
};

const progressionScoreMap: Record<string, number> = {
  Promotion: 0.95,
  Linear: 0.82,
  Lateral: 0.68,
  Fragmented: 0.45,
  Unknown: 0.6
};

const scoreSkillInventoryDepth = (resume: ParsedResumeProfile) => {
  const count = dedupe([
    ...resume.skills.technical,
    ...resume.skills.business,
    ...resume.skills.leadership
  ]).length;
  return clamp(count / 24);
};

const scoreContactCompleteness = (resume: ParsedResumeProfile) => {
  const fields = [
    resume.contact.fullName,
    resume.contact.email,
    resume.contact.phone,
    resume.contact.linkedInUrl,
    resume.contact.location
  ];
  const filled = fields.filter((field) => !!field).length;
  return clamp(filled / fields.length);
};

const scoreChronologyStrength = (resume: ParsedResumeProfile) => {
  const roles = resume.experience;
  if (roles.length === 0) return 0.25;
  const withDates = roles.filter((role) => !!role.startDate && !!role.endDate).length;
  const ratio = withDates / roles.length;
  return clamp(0.4 + ratio * 0.6);
};

const buildDualScore = (atsFactors: ScoreFactor[], recruiterFactors: ScoreFactor[]): DualScoringReport => {
  const atsScore = weighted(atsFactors);
  const recruiterScore = weighted(recruiterFactors);
  const risk: 'Low' | 'Medium' | 'High' =
    atsScore >= 80 && recruiterScore >= 78
      ? 'Low'
      : atsScore >= 65 && recruiterScore >= 62
        ? 'Medium'
        : 'High';

  const verdict =
    risk === 'Low' ? 'Strong resume' : risk === 'Medium' ? 'Good but needs cleanup' : 'Needs substantial improvement';

  const summary =
    risk === 'Low'
      ? 'Strong alignment with clear recruiter-ready evidence.'
      : risk === 'Medium'
        ? 'Good foundation; improve weak factors to increase interview probability.'
        : 'Low match confidence; significant alignment and clarity improvements needed.';

  return {
    ats_score: atsScore,
    recruiter_score: recruiterScore,
    ats_factors: atsFactors,
    recruiter_factors: recruiterFactors,
    verdict,
    risk,
    summary
  };
};

const mergeIssues = (issues: string[]) => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const issue of issues) {
    const normalized = issue.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(issue.trim());
  }
  return out;
};

const deriveKeyStrengths = (jobDual: DualScoringReport, baselineDual: DualScoringReport): string[] => {
  const allFactors = [
    ...jobDual.ats_factors,
    ...jobDual.recruiter_factors,
    ...baselineDual.ats_factors,
    ...baselineDual.recruiter_factors
  ];
  const high = allFactors
    .filter((factor) => factor.score >= 78)
    .sort((a, b) => (b.score * b.weight) - (a.score * a.weight))
    .slice(0, 3)
    .map((factor) => factor.factor);

  const mapping: Record<string, string> = {
    'Required skill coverage': 'Strong required-skill match',
    'Preferred skill coverage': 'Broad preferred-skill fit',
    'Responsibility alignment': 'Responsibilities aligned',
    'Experience fit': 'Experience level aligned',
    'Section completeness': 'Solid resume structure',
    'Parsing hygiene': 'ATS-friendly formatting',
    'Keyword precision': 'Precise keyword usage',
    'Impact evidence': 'Strong measurable impact',
    'Achievement density': 'Action-oriented achievements',
    'Leadership credibility': 'Leadership credibility',
    'Seniority alignment': 'Seniority well aligned',
    'Readability': 'High readability',
    'Career progression': 'Stable career progression'
  };

  return dedupe(high.map((factor) => mapping[factor] || factor)).slice(0, 3);
};

export const computeDeterministicScoreBundle = (
  resume: ParsedResumeProfile,
  job: ParsedJobProfile,
  resumeText: string,
  jdText: string
): DeterministicScoreBundle => {
  const resumeSkills = dedupe([...resume.skills.technical, ...resume.skills.business, ...resume.skills.leadership]);
  const resumeSkillsNorm = new Set(resumeSkills.map((skill) => normalizeText(skill)));
  const resumeTextNorm = normalizeText(resumeText || '');

  const requiredSkills = dedupe(job.requiredSkills || []);
  const preferredSkills = dedupe(job.preferredSkills || []);
  const missingRequiredSkills = requiredSkills.filter((skill) => !skillMatch(skill, resumeSkillsNorm, resumeTextNorm));
  const matchedKeywords = dedupe([
    ...requiredSkills.filter((skill) => skillMatch(skill, resumeSkillsNorm, resumeTextNorm)),
    ...preferredSkills.filter((skill) => skillMatch(skill, resumeSkillsNorm, resumeTextNorm)),
  ]);

  const sectionCompleteness = scoreSectionCompleteness(resume);
  const parsingHygiene = scoreParsingHygiene(resumeText);
  const requiredSkillCoverage = scoreCoverage(requiredSkills, resumeSkillsNorm, resumeTextNorm);
  const preferredSkillCoverage = scoreCoverage(preferredSkills, resumeSkillsNorm, resumeTextNorm);
  const responsibilityAlignment = scoreResponsibilityAlignment(
    resumeText,
    [...(job.responsibilities.primary || []), ...(job.responsibilities.secondary || [])]
  );
  const experienceFit = scoreExperienceFit(
    resume.careerSummary.totalYearsExperience,
    job.experienceRequirements.minimumYearsRequired,
    job.experienceRequirements.preferredYears
  );
  const keywordPrecision = scoreKeywordPrecision(
    resumeText,
    requiredSkills,
    preferredSkills,
    requiredSkillCoverage
  );
  const impactDensity = scoreImpactDensity(resume);
  const achievementDensity = scoreAchievementDensity(resume);
  const leadershipStrength = scoreLeadershipStrength(resume);
  const seniorityAlignment = scoreSeniorityAlignment(resume, job);
  const readability = scoreReadability(resume);
  const progression = progressionScoreMap[resume.careerSummary.careerProgressionPattern || 'Unknown'] ?? progressionScoreMap.Unknown;
  const skillInventoryDepth = scoreSkillInventoryDepth(resume);
  const contactCompleteness = scoreContactCompleteness(resume);
  const chronologyStrength = scoreChronologyStrength(resume);

  const jobAtsFactors: ScoreFactor[] = [
    { factor: 'Required skill coverage', weight: 30, score: toPercent(requiredSkillCoverage) },
    { factor: 'Preferred skill coverage', weight: 8, score: toPercent(preferredSkillCoverage) },
    { factor: 'Responsibility alignment', weight: 17, score: toPercent(responsibilityAlignment) },
    { factor: 'Experience fit', weight: 15, score: toPercent(experienceFit) },
    { factor: 'Section completeness', weight: 10, score: toPercent(sectionCompleteness) },
    { factor: 'Parsing hygiene', weight: 10, score: toPercent(parsingHygiene) },
    { factor: 'Keyword precision', weight: 10, score: toPercent(keywordPrecision) }
  ];

  const jobRecruiterFactors: ScoreFactor[] = [
    { factor: 'Impact evidence', weight: 25, score: toPercent(impactDensity) },
    { factor: 'Achievement density', weight: 20, score: toPercent(achievementDensity) },
    { factor: 'Seniority alignment', weight: 18, score: toPercent(seniorityAlignment) },
    { factor: 'Leadership credibility', weight: 15, score: toPercent(leadershipStrength) },
    { factor: 'Readability', weight: 12, score: toPercent(readability) },
    { factor: 'Career progression', weight: 10, score: toPercent(progression) }
  ];

  const baselineAtsFactors: ScoreFactor[] = [
    { factor: 'Section completeness', weight: 28, score: toPercent(sectionCompleteness) },
    { factor: 'Parsing hygiene', weight: 24, score: toPercent(parsingHygiene) },
    { factor: 'Skill inventory depth', weight: 20, score: toPercent(skillInventoryDepth) },
    { factor: 'Experience chronology', weight: 16, score: toPercent(chronologyStrength) },
    { factor: 'Contact completeness', weight: 12, score: toPercent(contactCompleteness) }
  ];

  const baselineRecruiterFactors: ScoreFactor[] = [
    { factor: 'Impact evidence', weight: 30, score: toPercent(impactDensity) },
    { factor: 'Achievement density', weight: 20, score: toPercent(achievementDensity) },
    { factor: 'Leadership credibility', weight: 20, score: toPercent(leadershipStrength) },
    { factor: 'Readability', weight: 15, score: toPercent(readability) },
    { factor: 'Career progression', weight: 15, score: toPercent(progression) }
  ];

  const jobSpecific = buildDualScore(jobAtsFactors, jobRecruiterFactors);
  const baseline = buildDualScore(baselineAtsFactors, baselineRecruiterFactors);

  const criticalIssues = mergeIssues([
    requiredSkillCoverage < 0.45
      ? `Low required skill coverage (${toPercent(requiredSkillCoverage)}%). Add core JD requirements explicitly with evidence.`
      : '',
    responsibilityAlignment < 0.5
      ? `Low responsibility alignment (${toPercent(responsibilityAlignment)}%). Rewrite bullets toward JD responsibilities.`
      : '',
    experienceFit < 0.5
      ? `Experience gap against JD minimum years requirement.`
      : '',
    parsingHygiene < 0.62
      ? `Formatting/parsing clarity is weak for ATS parsing.`
      : '',
    impactDensity < 0.35
      ? `Few measurable outcomes detected. Add impact metrics in experience bullets.`
      : '',
    sectionCompleteness < 0.75
      ? `Missing core sections (Summary, Experience, Skills, Education).`
      : ''
  ]);

  const relevanceScore = toPercent(
    0.55 * requiredSkillCoverage +
    0.3 * responsibilityAlignment +
    0.15 * experienceFit
  );

  const atsBreakdown = {
    keywords: toPercent(0.7 * requiredSkillCoverage + 0.1 * preferredSkillCoverage + 0.2 * keywordPrecision),
    formatting: toPercent(0.45 * parsingHygiene + 0.25 * sectionCompleteness + 0.3 * readability),
    sections: toPercent(sectionCompleteness)
  };

  const keyStrengths = deriveKeyStrengths(jobSpecific, baseline);

  return {
    baseline,
    jobSpecific,
    missingRequiredSkills,
    matchedKeywords,
    criticalIssues,
    relevanceScore,
    atsBreakdown,
    keyStrengths
  };
};
