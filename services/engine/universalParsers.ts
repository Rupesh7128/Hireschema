export type SeniorityLevel = 'Entry' | 'Mid' | 'Senior' | 'Lead' | 'Director' | 'Executive' | 'Unknown';
export type CareerProgressionPattern = 'Linear' | 'Promotion' | 'Lateral' | 'Fragmented' | 'Unknown';
export type MetricType =
  | 'Revenue'
  | 'Growth'
  | 'Efficiency'
  | 'Cost Reduction'
  | 'Customer Impact'
  | 'Operational Improvement'
  | 'Risk Reduction'
  | 'Innovation';

export interface ParsedResumeMetric {
  text: string;
  type: MetricType;
  value: number | null;
  unit: string | null;
}

export interface ParsedResumeRole {
  jobTitle: string | null;
  companyName: string | null;
  industry: string | null;
  employmentType: string | null;
  startDate: string | null;
  endDate: string | null;
  durationMonths: number | null;
  bulletPoints: string[];
  leadershipIndicators: boolean;
  teamSize: number | null;
  budgetOwnership: string | null;
}

export interface ParsedResumeProfile {
  contact: {
    fullName: string | null;
    email: string | null;
    phone: string | null;
    linkedInUrl: string | null;
    githubUrl: string | null;
    portfolioUrl: string | null;
    location: string | null;
  };
  sections: {
    contactInformation: boolean;
    professionalSummary: boolean;
    workExperience: boolean;
    education: boolean;
    skills: boolean;
    certifications: boolean;
    projects: boolean;
    publications: boolean;
    awards: boolean;
    volunteerExperience: boolean;
  };
  professionalSummary: string | null;
  experience: ParsedResumeRole[];
  education: Array<Record<string, any>>;
  skills: {
    technical: string[];
    business: string[];
    leadership: string[];
  };
  metrics: ParsedResumeMetric[];
  senioritySignals: {
    ownershipDensity: number;
    strategicDensity: number;
  };
  careerSummary: {
    totalYearsExperience: number | null;
    totalLeadershipYears: number | null;
    industryCluster: string | null;
    careerProgressionPattern: CareerProgressionPattern;
  };
}

export interface ParsedJobProfile {
  jobInfo: {
    jobTitle: string | null;
    company: string | null;
    location: string | null;
    employmentType: string | null;
    industry: string | null;
    department: string | null;
  };
  responsibilities: {
    primary: string[];
    secondary: string[];
  };
  requiredSkills: string[];
  preferredSkills: string[];
  experienceRequirements: {
    minimumYearsRequired: number | null;
    preferredYears: number | null;
  };
  educationRequirements: {
    requirement: string | null;
  };
  certifications: string[];
  seniorityLevelInferred: SeniorityLevel;
  compensation: {
    salaryRange: string | null;
    bonus: string | null;
    equity: string | null;
    benefits: string[];
  };
}

export const UNIVERSAL_RESUME_PARSER_PROMPT = `
You are Hireschema Resume Parsing Engine v3.

Goal:
Extract deterministic, normalized, structured data from a professional resume.
The resume may be from any industry and typically mid-to-senior level.

Hard rules:
- Return strict JSON only (no markdown, no commentary).
- Do NOT hallucinate.
- If unknown, use null (never invent values).
- Keep all extracted bullet points factual and as close to source wording as possible.
- Normalize section names to canonical keys.
- Normalize skill variants to canonical names (e.g., "MS Excel" => "Microsoft Excel", "G-Sheets" => "Google Sheets").

Required JSON schema:
{
  "contact": {
    "fullName": string|null,
    "email": string|null,
    "phone": string|null,
    "linkedInUrl": string|null,
    "githubUrl": string|null,
    "portfolioUrl": string|null,
    "location": string|null
  },
  "sections": {
    "contactInformation": boolean,
    "professionalSummary": boolean,
    "workExperience": boolean,
    "education": boolean,
    "skills": boolean,
    "certifications": boolean,
    "projects": boolean,
    "publications": boolean,
    "awards": boolean,
    "volunteerExperience": boolean
  },
  "professionalSummary": string|null,
  "experience": [{
    "jobTitle": string|null,
    "companyName": string|null,
    "industry": string|null,
    "employmentType": string|null,
    "startDate": string|null,
    "endDate": string|null,
    "durationMonths": number|null,
    "bulletPoints": string[],
    "leadershipIndicators": boolean,
    "teamSize": number|null,
    "budgetOwnership": string|null
  }],
  "education": [object],
  "skills": {
    "technical": string[],
    "business": string[],
    "leadership": string[]
  },
  "metrics": [{
    "text": string,
    "type": "Revenue"|"Growth"|"Efficiency"|"Cost Reduction"|"Customer Impact"|"Operational Improvement"|"Risk Reduction"|"Innovation",
    "value": number|null,
    "unit": string|null
  }],
  "senioritySignals": {
    "ownershipDensity": number,
    "strategicDensity": number
  },
  "careerSummary": {
    "totalYearsExperience": number|null,
    "totalLeadershipYears": number|null,
    "industryCluster": string|null,
    "careerProgressionPattern": "Linear"|"Promotion"|"Lateral"|"Fragmented"|"Unknown"
  }
}
`;

export const UNIVERSAL_JD_PARSER_PROMPT = `
You are Hireschema Job Description Parsing Engine v3.

Goal:
Extract structured hiring signals from a job description across industries.

Hard rules:
- Return strict JSON only (no markdown, no commentary).
- Do NOT hallucinate.
- If unknown, use null.
- Normalize skill variants to canonical names.
- Distinguish required vs preferred skills carefully.

Required JSON schema:
{
  "jobInfo": {
    "jobTitle": string|null,
    "company": string|null,
    "location": string|null,
    "employmentType": string|null,
    "industry": string|null,
    "department": string|null
  },
  "responsibilities": {
    "primary": string[],
    "secondary": string[]
  },
  "requiredSkills": string[],
  "preferredSkills": string[],
  "experienceRequirements": {
    "minimumYearsRequired": number|null,
    "preferredYears": number|null
  },
  "educationRequirements": {
    "requirement": string|null
  },
  "certifications": string[],
  "seniorityLevelInferred": "Entry"|"Mid"|"Senior"|"Lead"|"Director"|"Executive"|"Unknown",
  "compensation": {
    "salaryRange": string|null,
    "bonus": string|null,
    "equity": string|null,
    "benefits": string[]
  }
}
`;

const OWNERSHIP_VERBS = [
  'led', 'directed', 'owned', 'spearheaded', 'managed', 'architected', 'executed', 'oversaw', 'drove'
];

const STRATEGIC_TERMS = [
  'strategy', 'roadmap', 'vision', 'forecast', 'planning', 'cross-functional', 'enterprise', 'company-wide', 'global'
];

const METRIC_TYPE_PATTERNS: Array<{ type: MetricType; patterns: RegExp[] }> = [
  { type: 'Revenue', patterns: [/\brevenue\b/i, /\$[\d,.]+/i, /\barr\b/i, /\bmrr\b/i] },
  { type: 'Growth', patterns: [/\bgrowth\b/i, /\bincrease[ds]?\b/i, /\bgrew\b/i, /\bexpand(ed)?\b/i] },
  { type: 'Efficiency', patterns: [/\befficien(cy|t)\b/i, /\bthroughput\b/i, /\bautomation\b/i, /\bcycle time\b/i] },
  { type: 'Cost Reduction', patterns: [/\bcost\b/i, /\bsav(ed|ings?)\b/i, /\breduced spend\b/i] },
  { type: 'Customer Impact', patterns: [/\bcustomer\b/i, /\bclient\b/i, /\bnps\b/i, /\bcsat\b/i, /\bretention\b/i] },
  { type: 'Operational Improvement', patterns: [/\bprocess\b/i, /\boperations?\b/i, /\bsla\b/i, /\bquality\b/i] },
  { type: 'Risk Reduction', patterns: [/\brisk\b/i, /\bcompliance\b/i, /\bincident\b/i, /\bsecurity\b/i] },
  { type: 'Innovation', patterns: [/\binnovation\b/i, /\bnew\b/i, /\blaunch(ed)?\b/i, /\bpatent\b/i] }
];

const SKILL_CANONICAL_RULES: Array<{ pattern: RegExp; canonical: string }> = [
  { pattern: /\b(ms|microsoft)\s*excel\b|\bexcel pivot tables?\b|\bvlookup\b|\bxlookup\b/i, canonical: 'Microsoft Excel' },
  { pattern: /\bg-?sheets?\b|\bgoogle sheets\b/i, canonical: 'Google Sheets' },
  { pattern: /\bpower\s*bi\b|\bpowerbi\b/i, canonical: 'Power BI' },
  { pattern: /\bamazon web services\b|\baws\b/i, canonical: 'AWS' },
  { pattern: /\bgoogle cloud platform\b|\bgcp\b/i, canonical: 'Google Cloud Platform' },
  { pattern: /\bmicrosoft azure\b|\bazure\b/i, canonical: 'Microsoft Azure' },
  { pattern: /\bnode\.?js\b|\bnodejs\b/i, canonical: 'Node.js' },
  { pattern: /\breact\.?js\b|\breactjs\b/i, canonical: 'React' },
  { pattern: /\bk8s\b|\bkubernetes\b/i, canonical: 'Kubernetes' },
  { pattern: /\bci\/cd\b|\bcontinuous integration\b|\bcontinuous delivery\b/i, canonical: 'CI/CD' },
  { pattern: /\bcrm\b|\bsalesforce\b|\bhubspot\b/i, canonical: 'CRM' },
  { pattern: /\berp\b|\bsap\b|\boracle erp\b/i, canonical: 'ERP' },
  { pattern: /\bbi\b|\bbusiness intelligence\b/i, canonical: 'Business Intelligence' },
  { pattern: /\broad-?mapping\b/i, canonical: 'Roadmapping' },
  { pattern: /\bstakeholder management\b/i, canonical: 'Stakeholder Management' }
];

const SENIORITY_KEYWORDS: Array<{ level: SeniorityLevel; pattern: RegExp }> = [
  { level: 'Executive', pattern: /\b(cxo|chief|vice president|vp|executive)\b/i },
  { level: 'Director', pattern: /\bdirector\b/i },
  { level: 'Lead', pattern: /\blead\b/i },
  { level: 'Senior', pattern: /\bsenior|sr\.?\b|principal|staff\b/i },
  { level: 'Mid', pattern: /\bmid\b/i },
  { level: 'Entry', pattern: /\bjunior|entry\b/i }
];

const SECTION_ALIASES: Array<{ key: keyof ParsedResumeProfile['sections']; pattern: RegExp }> = [
  { key: 'contactInformation', pattern: /\b(contact|profile)\b/i },
  { key: 'professionalSummary', pattern: /\b(summary|professional summary|profile|about)\b/i },
  { key: 'workExperience', pattern: /\b(work experience|professional experience|career history|employment)\b/i },
  { key: 'education', pattern: /\beducation\b/i },
  { key: 'skills', pattern: /\bskills|technical skills|core competencies\b/i },
  { key: 'certifications', pattern: /\bcertifications?\b/i },
  { key: 'projects', pattern: /\bprojects?\b/i },
  { key: 'publications', pattern: /\bpublications?\b/i },
  { key: 'awards', pattern: /\bawards?|honors?\b/i },
  { key: 'volunteerExperience', pattern: /\bvolunteer\b/i }
];

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const asString = (value: any): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
};

const asNumber = (value: any): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value.replace(/[^\d.-]/g, ''));
    if (Number.isFinite(n)) return n;
  }
  return null;
};

const asStringArray = (value: any): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => asString(v))
    .filter((v): v is string => !!v);
};

const dedupeStrings = (values: string[]) => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value.trim());
  }
  return out;
};

const canonicalizeSkill = (skill: string): string => {
  const raw = String(skill || '').trim();
  if (!raw) return '';
  for (const rule of SKILL_CANONICAL_RULES) {
    if (rule.pattern.test(raw)) return rule.canonical;
  }
  return raw
    .replace(/\s+/g, ' ')
    .replace(/\bjs\b/gi, 'JavaScript')
    .trim();
};

const normalizeSkillList = (input: any): string[] => {
  const items = Array.isArray(input) ? input : [];
  const normalized = items
    .map((entry) => {
      if (typeof entry === 'string') return canonicalizeSkill(entry);
      if (entry && typeof entry === 'object') {
        return canonicalizeSkill(
          asString((entry as any).name) ||
          asString((entry as any).skill) ||
          asString((entry as any).value) ||
          ''
        );
      }
      return '';
    })
    .filter(Boolean);
  return dedupeStrings(normalized);
};

const splitPotentialSkills = (text: string): string[] => {
  return String(text || '')
    .split(/[,|;/\n]+/g)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length >= 2 && chunk.length <= 60);
};

const inferMetricType = (text: string): MetricType => {
  for (const item of METRIC_TYPE_PATTERNS) {
    if (item.patterns.some((p) => p.test(text))) return item.type;
  }
  return 'Operational Improvement';
};

const extractMetricValue = (text: string): { value: number | null; unit: string | null } => {
  const percent = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percent) return { value: Number(percent[1]), unit: '%' };
  const currency = text.match(/\$([\d,.]+)\s*([kmb])?/i);
  if (currency) {
    const base = Number(currency[1].replace(/,/g, ''));
    const suffix = (currency[2] || '').toLowerCase();
    const multiplier = suffix === 'k' ? 1_000 : suffix === 'm' ? 1_000_000 : suffix === 'b' ? 1_000_000_000 : 1;
    return { value: Number.isFinite(base) ? base * multiplier : null, unit: '$' };
  }
  const numeric = text.match(/\b(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\b/);
  if (numeric) return { value: Number(numeric[1].replace(/,/g, '')), unit: null };
  return { value: null, unit: null };
};

const parseMonthYear = (token: string): Date | null => {
  const value = String(token || '').trim();
  if (!value) return null;
  if (/present|current|now/i.test(value)) return new Date();
  const normalized = value
    .replace(/[^a-zA-Z0-9\s/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const parsed = Date.parse(normalized);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
};

const monthsBetween = (start: string | null, end: string | null): number | null => {
  const s = parseMonthYear(start || '');
  const e = parseMonthYear(end || '');
  if (!s || !e) return null;
  const years = e.getFullYear() - s.getFullYear();
  const months = e.getMonth() - s.getMonth();
  const out = years * 12 + months + 1;
  return out > 0 ? out : null;
};

const detectSections = (text: string): ParsedResumeProfile['sections'] => {
  const lines = String(text || '').split(/\r?\n/);
  const headings = lines
    .map((line) => line.trim())
    .filter((line) => !!line)
    .filter((line) => /^#{1,3}\s+/.test(line) || /^[A-Z][A-Za-z\s/&-]{2,40}$/.test(line));
  const found = headings.join('\n');
  const defaults: ParsedResumeProfile['sections'] = {
    contactInformation: false,
    professionalSummary: false,
    workExperience: false,
    education: false,
    skills: false,
    certifications: false,
    projects: false,
    publications: false,
    awards: false,
    volunteerExperience: false
  };
  for (const alias of SECTION_ALIASES) {
    defaults[alias.key] = alias.pattern.test(found) || alias.pattern.test(text.slice(0, 1800));
  }
  return defaults;
};

const inferSeniorityLevel = (text: string, minYears: number | null = null): SeniorityLevel => {
  for (const item of SENIORITY_KEYWORDS) {
    if (item.pattern.test(text)) return item.level;
  }
  if (minYears === null) return 'Unknown';
  if (minYears >= 14) return 'Executive';
  if (minYears >= 10) return 'Director';
  if (minYears >= 7) return 'Lead';
  if (minYears >= 5) return 'Senior';
  if (minYears >= 2) return 'Mid';
  return 'Entry';
};

const extractYearsRequirement = (text: string): { min: number | null; preferred: number | null } => {
  const compact = String(text || '').replace(/\s+/g, ' ');
  const minMatch = compact.match(/\b(?:minimum|min\.?|at least|requires?)\s*(\d{1,2})\+?\s*(?:years?|yrs?)\b/i)
    || compact.match(/\b(\d{1,2})\+?\s*(?:years?|yrs?)\s+(?:of\s+)?experience\b/i);
  const prefMatch = compact.match(/\b(?:preferred|ideally)\s*(\d{1,2})\+?\s*(?:years?|yrs?)\b/i);
  const min = minMatch ? Number(minMatch[1]) : null;
  const preferred = prefMatch ? Number(prefMatch[1]) : null;
  return { min: Number.isFinite(min as number) ? min : null, preferred: Number.isFinite(preferred as number) ? preferred : null };
};

const extractExperienceFallback = (resumeText: string): ParsedResumeRole[] => {
  const lines = String(resumeText || '').split(/\r?\n/);
  const roles: ParsedResumeRole[] = [];
  let current: ParsedResumeRole | null = null;

  const pushCurrent = () => {
    if (!current) return;
    if (!current.jobTitle && !current.companyName && current.bulletPoints.length === 0) return;
    if (!current.durationMonths) {
      current.durationMonths = monthsBetween(current.startDate, current.endDate);
    }
    roles.push(current);
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const dateMatch = line.match(/\b([A-Za-z]{3,9}\s+\d{4}|\d{4})\s*[-–—]\s*([A-Za-z]{3,9}\s+\d{4}|\d{4}|Present|Current|Now)\b/i);
    if (dateMatch) {
      pushCurrent();
      const chunks = line.split('|').map((chunk) => chunk.trim()).filter(Boolean);
      current = {
        jobTitle: chunks[0] || null,
        companyName: chunks[1] || null,
        industry: null,
        employmentType: null,
        startDate: dateMatch[1] || null,
        endDate: dateMatch[2] || null,
        durationMonths: monthsBetween(dateMatch[1], dateMatch[2]),
        bulletPoints: [],
        leadershipIndicators: false,
        teamSize: null,
        budgetOwnership: null
      };
      continue;
    }

    if (!current) {
      if (/^[-•*]\s+/.test(line)) continue;
      continue;
    }

    if (/^[-•*]\s+/.test(line)) {
      const bullet = line.replace(/^[-•*]\s+/, '').trim();
      if (bullet) current.bulletPoints.push(bullet);
      if (OWNERSHIP_VERBS.some((verb) => new RegExp(`\\b${verb}\\b`, 'i').test(bullet))) {
        current.leadershipIndicators = true;
      }
      const team = bullet.match(/\bteam of\s+(\d{1,4})\b/i);
      if (team) current.teamSize = Number(team[1]);
      const budget = bullet.match(/\$[\d,.]+\s*[kmb]?/i);
      if (budget) current.budgetOwnership = budget[0];
    } else if (!current.companyName && current.jobTitle && line.length < 120) {
      current.companyName = line;
    }
  }
  pushCurrent();
  return roles;
};

const extractSkillsFallback = (text: string): ParsedResumeProfile['skills'] => {
  const lowered = String(text || '');
  const skillChunks: string[] = [];
  const lines = lowered.split(/\r?\n/);
  let inSkills = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^(#{1,3}\s*)?(skills?|technical skills|core competencies)\b/i.test(line)) {
      inSkills = true;
      continue;
    }
    if (inSkills && /^(#{1,3}\s*)?(experience|education|projects?|certifications?)\b/i.test(line)) {
      inSkills = false;
    }
    if (!inSkills) continue;
    skillChunks.push(...splitPotentialSkills(line));
  }

  const discovered = dedupeStrings(skillChunks.map(canonicalizeSkill).filter(Boolean));
  const technical = discovered.filter((value) =>
    /\b(sql|python|java|javascript|typescript|react|node|docker|kubernetes|tableau|power bi|excel|aws|azure|gcp|crm|erp|sap|oracle)\b/i.test(value)
  );
  const leadership = discovered.filter((value) =>
    /\b(leadership|management|stakeholder|mentorship|hiring|coaching|roadmapping)\b/i.test(value)
  );
  const technicalSet = new Set(technical.map((v) => v.toLowerCase()));
  const leadershipSet = new Set(leadership.map((v) => v.toLowerCase()));
  const business = discovered.filter((value) => !technicalSet.has(value.toLowerCase()) && !leadershipSet.has(value.toLowerCase()));

  return {
    technical,
    business,
    leadership
  };
};

const extractMetricsFallback = (text: string): ParsedResumeMetric[] => {
  const lines = String(text || '').split(/\r?\n/);
  const out: ParsedResumeMetric[] = [];
  for (const line of lines) {
    const cleaned = line.replace(/^[-•*]\s+/, '').trim();
    if (!cleaned) continue;
    if (!(/%|\$|\b\d{1,3}(?:,\d{3})+\b|\b\d+\b/.test(cleaned))) continue;
    const { value, unit } = extractMetricValue(cleaned);
    out.push({
      text: cleaned,
      type: inferMetricType(cleaned),
      value,
      unit
    });
  }
  return out.slice(0, 80);
};

const computeDensity = (bullets: string[], terms: string[]) => {
  if (bullets.length === 0) return 0;
  const hits = bullets.filter((bullet) => terms.some((term) => new RegExp(`\\b${term}\\b`, 'i').test(bullet))).length;
  return clamp(hits / bullets.length);
};

const inferCareerPattern = (experience: ParsedResumeRole[]): CareerProgressionPattern => {
  if (experience.length < 2) return 'Unknown';
  const titles = experience.map((role) => (role.jobTitle || '').toLowerCase()).filter(Boolean);
  if (titles.length < 2) return 'Unknown';
  const hasSenior = titles.some((title) => /\bsenior|lead|principal|director|head|manager\b/.test(title));
  const hasJunior = titles.some((title) => /\bjunior|associate|analyst\b/.test(title));
  if (hasSenior && hasJunior) return 'Promotion';
  const uniqueTitles = new Set(titles).size;
  if (uniqueTitles <= Math.max(2, Math.floor(experience.length * 0.5))) return 'Linear';
  if (experience.length >= 4 && uniqueTitles >= 4) return 'Fragmented';
  return 'Lateral';
};

const inferTotalYearsFromExperience = (experience: ParsedResumeRole[]): number | null => {
  const ranges: Array<{ start: Date; end: Date }> = [];
  for (const role of experience) {
    const start = parseMonthYear(role.startDate || '');
    const end = parseMonthYear(role.endDate || '');
    if (!start || !end) continue;
    if (end < start) continue;
    ranges.push({ start, end });
  }
  if (ranges.length === 0) return null;
  const minStart = new Date(Math.min(...ranges.map((r) => r.start.getTime())));
  const maxEnd = new Date(Math.max(...ranges.map((r) => r.end.getTime())));
  const years = (maxEnd.getTime() - minStart.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return years > 0 ? Number(years.toFixed(1)) : null;
};

export const buildResumeFallbackProfile = (resumeText: string): ParsedResumeProfile => {
  const sections = detectSections(resumeText);
  const experience = extractExperienceFallback(resumeText);
  const metrics = extractMetricsFallback(resumeText);
  const skills = extractSkillsFallback(resumeText);
  const allBullets = experience.flatMap((role) => role.bulletPoints);
  const ownershipDensity = computeDensity(allBullets, OWNERSHIP_VERBS);
  const strategicDensity = computeDensity(allBullets, STRATEGIC_TERMS);
  const totalYears = inferTotalYearsFromExperience(experience);
  const leadershipMonths = experience
    .filter((role) => role.leadershipIndicators)
    .reduce((sum, role) => sum + (role.durationMonths || 0), 0);

  const email = resumeText.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)?.[0] || null;
  const phone = resumeText.match(/\+?\d[\d().\s-]{7,}\d/)?.[0] || null;
  const linkedInUrl = resumeText.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i)?.[0] || null;
  const githubUrl = resumeText.match(/https?:\/\/(?:www\.)?github\.com\/[^\s)]+/i)?.[0] || null;
  const portfolioUrl = resumeText.match(/https?:\/\/(?!www\.linkedin\.com|github\.com)[^\s)]+/i)?.[0] || null;
  const firstLine = resumeText.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || '';
  const fullName = /^[A-Za-z][A-Za-z\s.'-]{2,60}$/.test(firstLine) ? firstLine : null;

  const summaryLine = resumeText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 60 && !/^[-•*]/.test(line)) || null;

  const industryCluster = skills.technical.length > 0
    ? 'Technology'
    : skills.business.length > 0
      ? 'Business Operations'
      : null;

  return {
    contact: {
      fullName,
      email,
      phone,
      linkedInUrl,
      githubUrl,
      portfolioUrl,
      location: null
    },
    sections,
    professionalSummary: summaryLine,
    experience,
    education: [],
    skills,
    metrics,
    senioritySignals: {
      ownershipDensity,
      strategicDensity
    },
    careerSummary: {
      totalYearsExperience: totalYears,
      totalLeadershipYears: leadershipMonths > 0 ? Number((leadershipMonths / 12).toFixed(1)) : null,
      industryCluster,
      careerProgressionPattern: inferCareerPattern(experience)
    }
  };
};

export const buildJobFallbackProfile = (jobText: string): ParsedJobProfile => {
  const lines = String(jobText || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const firstLine = lines[0] || null;
  const joined = lines.join('\n');
  const years = extractYearsRequirement(joined);
  const seniority = inferSeniorityLevel(joined, years.min);

  const requiredLines = lines.filter((line) => /\b(required|must have|minimum qualifications|qualification)\b/i.test(line));
  const preferredLines = lines.filter((line) => /\b(preferred|nice to have|plus)\b/i.test(line));
  const respLines = lines.filter((line) => /^[-•*]/.test(line) || /\b(responsibilit(y|ies)|you will|what you'll do)\b/i.test(line));

  const requiredSkills = normalizeSkillList([
    ...requiredLines.flatMap(splitPotentialSkills),
    ...splitPotentialSkills(joined).filter((chunk) => /\b(sql|python|excel|aws|azure|react|java|tableau|power bi|salesforce|sap)\b/i.test(chunk))
  ]);
  const preferredSkills = normalizeSkillList(preferredLines.flatMap(splitPotentialSkills));

  const salary = joined.match(/\$\s?\d[\d,]*(?:\s?-\s?\$?\d[\d,]*)?(?:\s*(?:k|m))?/i)?.[0] || null;

  return {
    jobInfo: {
      jobTitle: firstLine,
      company: null,
      location: null,
      employmentType: /\bcontract|full[-\s]?time|part[-\s]?time|internship\b/i.test(joined)
        ? (joined.match(/\bcontract|full[-\s]?time|part[-\s]?time|internship\b/i)?.[0] || null)
        : null,
      industry: null,
      department: null
    },
    responsibilities: {
      primary: respLines.slice(0, 12),
      secondary: []
    },
    requiredSkills,
    preferredSkills,
    experienceRequirements: {
      minimumYearsRequired: years.min,
      preferredYears: years.preferred
    },
    educationRequirements: {
      requirement: joined.match(/\b(bachelor|master|phd|mba|degree)\b/i)?.[0] || null
    },
    certifications: normalizeSkillList(lines.filter((line) => /\b(certification|certified)\b/i.test(line))),
    seniorityLevelInferred: seniority,
    compensation: {
      salaryRange: salary,
      bonus: /\bbonus\b/i.test(joined) ? 'Mentioned' : null,
      equity: /\bequity|stock options?|rsu\b/i.test(joined) ? 'Mentioned' : null,
      benefits: dedupeStrings(lines.filter((line) => /\bbenefits?|pto|health|insurance|401k|retirement\b/i.test(line))).slice(0, 8)
    }
  };
};

export const normalizeResumeProfile = (raw: any, resumeText: string): ParsedResumeProfile => {
  const fallback = buildResumeFallbackProfile(resumeText);
  if (!raw || typeof raw !== 'object') return fallback;

  const sectionsRaw = (raw as any).sections || {};
  const experienceRaw = Array.isArray((raw as any).experience) ? (raw as any).experience : [];
  const metricsRaw = Array.isArray((raw as any).metrics) ? (raw as any).metrics : [];

  const experience: ParsedResumeRole[] = experienceRaw.map((entry: any) => {
    const bullets = asStringArray(entry?.bulletPoints || entry?.bullets || []);
    const leadershipIndicator = typeof entry?.leadershipIndicators === 'boolean'
      ? entry.leadershipIndicators
      : OWNERSHIP_VERBS.some((verb) => bullets.some((bullet) => new RegExp(`\\b${verb}\\b`, 'i').test(bullet)));
    const startDate = asString(entry?.startDate);
    const endDate = asString(entry?.endDate);
    const durationMonths = asNumber(entry?.durationMonths) || monthsBetween(startDate, endDate);

    return {
      jobTitle: asString(entry?.jobTitle),
      companyName: asString(entry?.companyName),
      industry: asString(entry?.industry),
      employmentType: asString(entry?.employmentType),
      startDate,
      endDate,
      durationMonths,
      bulletPoints: bullets,
      leadershipIndicators: leadershipIndicator,
      teamSize: asNumber(entry?.teamSize),
      budgetOwnership: asString(entry?.budgetOwnership)
    };
  }).filter((entry) => entry.jobTitle || entry.companyName || entry.bulletPoints.length > 0);

  const metrics: ParsedResumeMetric[] = metricsRaw.map((entry: any) => {
    const text = asString(entry?.text || entry?.metric || entry?.raw) || '';
    const typeRaw = asString(entry?.type);
    const type = ([
      'Revenue',
      'Growth',
      'Efficiency',
      'Cost Reduction',
      'Customer Impact',
      'Operational Improvement',
      'Risk Reduction',
      'Innovation'
    ] as MetricType[]).includes(typeRaw as MetricType)
      ? (typeRaw as MetricType)
      : inferMetricType(text);
    const { value, unit } = extractMetricValue(text);
    const val = asNumber(entry?.value) ?? value;
    return {
      text,
      type,
      value: val,
      unit: asString(entry?.unit) || unit
    };
  }).filter((metric) => !!metric.text);

  const skillObj = (raw as any).skills || {};
  const technical = normalizeSkillList(skillObj.technical || skillObj.tech || []);
  const business = normalizeSkillList(skillObj.business || []);
  const leadership = normalizeSkillList(skillObj.leadership || []);

  const ownershipRaw = asNumber((raw as any)?.senioritySignals?.ownershipDensity);
  const strategicRaw = asNumber((raw as any)?.senioritySignals?.strategicDensity);
  const ownershipDensity = ownershipRaw !== null ? clamp(ownershipRaw > 1 ? ownershipRaw / 100 : ownershipRaw) : fallback.senioritySignals.ownershipDensity;
  const strategicDensity = strategicRaw !== null ? clamp(strategicRaw > 1 ? strategicRaw / 100 : strategicRaw) : fallback.senioritySignals.strategicDensity;

  const totalYears = asNumber((raw as any)?.careerSummary?.totalYearsExperience) ?? inferTotalYearsFromExperience(experience);
  const leadershipYears = asNumber((raw as any)?.careerSummary?.totalLeadershipYears)
    ?? (() => {
      const months = experience.filter((role) => role.leadershipIndicators).reduce((sum, role) => sum + (role.durationMonths || 0), 0);
      return months > 0 ? Number((months / 12).toFixed(1)) : null;
    })();

  const progressionRaw = asString((raw as any)?.careerSummary?.careerProgressionPattern);
  const progression = (['Linear', 'Promotion', 'Lateral', 'Fragmented', 'Unknown'] as CareerProgressionPattern[]).includes(progressionRaw as CareerProgressionPattern)
    ? (progressionRaw as CareerProgressionPattern)
    : inferCareerPattern(experience);

  const normalized: ParsedResumeProfile = {
    contact: {
      fullName: asString((raw as any)?.contact?.fullName) || fallback.contact.fullName,
      email: asString((raw as any)?.contact?.email) || fallback.contact.email,
      phone: asString((raw as any)?.contact?.phone) || fallback.contact.phone,
      linkedInUrl: asString((raw as any)?.contact?.linkedInUrl) || fallback.contact.linkedInUrl,
      githubUrl: asString((raw as any)?.contact?.githubUrl) || fallback.contact.githubUrl,
      portfolioUrl: asString((raw as any)?.contact?.portfolioUrl) || fallback.contact.portfolioUrl,
      location: asString((raw as any)?.contact?.location) || fallback.contact.location
    },
    sections: {
      contactInformation: Boolean(sectionsRaw.contactInformation ?? fallback.sections.contactInformation),
      professionalSummary: Boolean(sectionsRaw.professionalSummary ?? fallback.sections.professionalSummary),
      workExperience: Boolean(sectionsRaw.workExperience ?? fallback.sections.workExperience),
      education: Boolean(sectionsRaw.education ?? fallback.sections.education),
      skills: Boolean(sectionsRaw.skills ?? fallback.sections.skills),
      certifications: Boolean(sectionsRaw.certifications ?? fallback.sections.certifications),
      projects: Boolean(sectionsRaw.projects ?? fallback.sections.projects),
      publications: Boolean(sectionsRaw.publications ?? fallback.sections.publications),
      awards: Boolean(sectionsRaw.awards ?? fallback.sections.awards),
      volunteerExperience: Boolean(sectionsRaw.volunteerExperience ?? fallback.sections.volunteerExperience)
    },
    professionalSummary: asString((raw as any)?.professionalSummary) || fallback.professionalSummary,
    experience: experience.length > 0 ? experience : fallback.experience,
    education: Array.isArray((raw as any)?.education) ? (raw as any).education : fallback.education,
    skills: {
      technical: technical.length > 0 ? technical : fallback.skills.technical,
      business: business.length > 0 ? business : fallback.skills.business,
      leadership: leadership.length > 0 ? leadership : fallback.skills.leadership
    },
    metrics: metrics.length > 0 ? metrics : fallback.metrics,
    senioritySignals: {
      ownershipDensity,
      strategicDensity
    },
    careerSummary: {
      totalYearsExperience: totalYears,
      totalLeadershipYears: leadershipYears,
      industryCluster: asString((raw as any)?.careerSummary?.industryCluster) || fallback.careerSummary.industryCluster,
      careerProgressionPattern: progression
    }
  };

  return normalized;
};

export const normalizeJobProfile = (raw: any, jobText: string): ParsedJobProfile => {
  const fallback = buildJobFallbackProfile(jobText);
  if (!raw || typeof raw !== 'object') return fallback;

  const responsibilitiesRaw = (raw as any).responsibilities;
  const responsibilities = Array.isArray(responsibilitiesRaw)
    ? { primary: asStringArray(responsibilitiesRaw), secondary: [] }
    : {
      primary: asStringArray(responsibilitiesRaw?.primary || responsibilitiesRaw?.primaryResponsibilities || []),
      secondary: asStringArray(responsibilitiesRaw?.secondary || responsibilitiesRaw?.secondaryResponsibilities || [])
    };

  const requiredSkills = normalizeSkillList((raw as any).requiredSkills || []);
  const preferredSkills = normalizeSkillList((raw as any).preferredSkills || []);
  const experienceRequirementsRaw = (raw as any).experienceRequirements || {};

  const minYears = asNumber(experienceRequirementsRaw.minimumYearsRequired || experienceRequirementsRaw.minimumYears || experienceRequirementsRaw.minYears);
  const preferredYears = asNumber(experienceRequirementsRaw.preferredYears || experienceRequirementsRaw.preferred);
  const inferredFromText = extractYearsRequirement(jobText);
  const seniorityRaw = asString((raw as any).seniorityLevelInferred);
  const seniorityLevel = (['Entry', 'Mid', 'Senior', 'Lead', 'Director', 'Executive', 'Unknown'] as SeniorityLevel[]).includes(seniorityRaw as SeniorityLevel)
    ? (seniorityRaw as SeniorityLevel)
    : inferSeniorityLevel(
      `${asString((raw as any)?.jobInfo?.jobTitle) || ''} ${jobText}`,
      minYears ?? inferredFromText.min
    );

  return {
    jobInfo: {
      jobTitle: asString((raw as any)?.jobInfo?.jobTitle) || fallback.jobInfo.jobTitle,
      company: asString((raw as any)?.jobInfo?.company) || fallback.jobInfo.company,
      location: asString((raw as any)?.jobInfo?.location) || fallback.jobInfo.location,
      employmentType: asString((raw as any)?.jobInfo?.employmentType) || fallback.jobInfo.employmentType,
      industry: asString((raw as any)?.jobInfo?.industry) || fallback.jobInfo.industry,
      department: asString((raw as any)?.jobInfo?.department) || fallback.jobInfo.department
    },
    responsibilities: {
      primary: responsibilities.primary.length > 0 ? responsibilities.primary : fallback.responsibilities.primary,
      secondary: responsibilities.secondary
    },
    requiredSkills: requiredSkills.length > 0 ? requiredSkills : fallback.requiredSkills,
    preferredSkills,
    experienceRequirements: {
      minimumYearsRequired: minYears ?? inferredFromText.min,
      preferredYears: preferredYears ?? inferredFromText.preferred
    },
    educationRequirements: {
      requirement: asString((raw as any)?.educationRequirements?.requirement)
        || asString((raw as any)?.experienceRequirements?.educationRequirement)
        || fallback.educationRequirements.requirement
    },
    certifications: normalizeSkillList((raw as any)?.certifications || []),
    seniorityLevelInferred: seniorityLevel,
    compensation: {
      salaryRange: asString((raw as any)?.compensation?.salaryRange) || fallback.compensation.salaryRange,
      bonus: asString((raw as any)?.compensation?.bonus) || fallback.compensation.bonus,
      equity: asString((raw as any)?.compensation?.equity) || fallback.compensation.equity,
      benefits: asStringArray((raw as any)?.compensation?.benefits || fallback.compensation.benefits)
    }
  };
};
