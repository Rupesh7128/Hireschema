import { includesKeyword } from './keywordUtils';

export type KeywordType = 'tool' | 'functional' | 'outcome' | 'unknown';
export type RiskLevel = 'low' | 'medium' | 'high';

export type ValidatorSeverity = 'hard' | 'soft';

export interface ComplianceIssue {
  severity: ValidatorSeverity;
  validator: string;
  message: string;
  details?: Record<string, any>;
}

export interface KeywordJustification {
  keyword: string;
  used: boolean;
  category: KeywordType;
  risk_level: RiskLevel;
  allowed_frequency: number;
  requires_proof: boolean;
  frequency: number;
  resume_evidence: string;
  job_description_reference: string;
  justification: string;
  reason?: string;
  alternative_used?: string;
}

export interface ScoreFactor {
  factor: string;
  weight: number;
  score: number;
}

export interface DualScoringReport {
  ats_score: number;
  recruiter_score: number;
  ats_factors: ScoreFactor[];
  recruiter_factors: ScoreFactor[];
  verdict: string;
  risk: 'Low' | 'Medium' | 'High';
  summary: string;
}

export interface ResumeComplianceReport {
  issues: ComplianceIssue[];
  keyword_justifications: KeywordJustification[];
  scoring: DualScoringReport;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const TOOL_KEYWORDS = [
  'excel',
  'google sheets',
  'power bi',
  'tableau',
  'sql',
  'python',
  'aws',
  'amazon web services',
  'azure',
  'microsoft azure',
  'gcp',
  'google cloud platform',
  'javascript',
  'typescript',
  'react',
  'node',
  'docker',
  'kubernetes',
  'git',
  'jira'
];

const BUZZWORDS = [
  'synergy',
  'dynamic',
  'results-driven',
  'self-starter',
  'go-getter',
  'detail-oriented',
  'hardworking',
  'fast-paced',
  'thought leader',
  'rockstar',
  'ninja',
  'guru',
  'passionate'
];

const HIGH_RISK_KEYWORDS: Record<string, { alternative: string; requires: Array<'excel_proof' | 'scale_proof' | 'ownership_proof' | 'cx_proof'> }> = {
  'excel': { alternative: 'data analysis tools', requires: ['excel_proof'] },
  'large data sets': { alternative: 'operational data', requires: ['scale_proof'] },
  'inventory management': { alternative: 'stock tracking and supply coordination', requires: ['ownership_proof'] },
  'customer experience': { alternative: 'customer interactions and service delivery', requires: ['cx_proof'] }
};

const normalizeText = (value: string) =>
  (value || '')
    .replace(/\r/g, '')
    .replace(/[•·]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

const tokenizeWords = (value: string) =>
  (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(w => w.length >= 3);

const countSharedNgramsSimilarity = (a: string, b: string, n: number) => {
  const aWords = tokenizeWords(a).slice(0, 1600);
  const bWords = tokenizeWords(b).slice(0, 1600);
  if (aWords.length < n || bWords.length < n) return { similarity: 0, intersection: 0, aSize: 0, bSize: 0 };
  const aSet = new Set<string>();
  for (let i = 0; i <= aWords.length - n; i += 1) aSet.add(aWords.slice(i, i + n).join(' '));
  const bSet = new Set<string>();
  for (let i = 0; i <= bWords.length - n; i += 1) bSet.add(bWords.slice(i, i + n).join(' '));
  let intersection = 0;
  for (const gram of bSet) if (aSet.has(gram)) intersection += 1;
  const denom = Math.max(1, Math.min(aSet.size, bSet.size));
  return { similarity: intersection / denom, intersection, aSize: aSet.size, bSize: bSet.size };
};

const splitAtsSections = (markdown: string) => {
  const lines = (markdown || '').split(/\r?\n/);
  const out: Record<string, string> = {};
  let current = 'OTHER';
  let buf: string[] = [];
  const flush = () => {
    if (!out[current]) out[current] = '';
    if (buf.length > 0) {
      out[current] = (out[current] ? `${out[current]}\n` : '') + buf.join('\n');
    }
    buf = [];
  };
  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      flush();
      current = m[1].trim().toUpperCase();
      continue;
    }
    buf.push(line);
  }
  flush();
  return out;
};

const countKeywordOccurrences = (text: string, keyword: string) => {
  const t = (text || '');
  const k = (keyword || '').trim();
  if (!t || !k) return 0;
  const escaped = escapeRegExp(k);
  const re = new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, 'gi');
  const matches = t.match(re);
  return matches ? matches.length : 0;
};

const dedupeKeywords = (keywords: string[]) => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const k of keywords.filter(Boolean)) {
    const key = k.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(k.trim());
  }
  return out;
};

export const classifyKeyword = (keyword: string): { type: KeywordType; risk_level: RiskLevel; allowed_frequency: number; requires_proof: boolean; alternative?: string } => {
  const k = (keyword || '').trim();
  const key = k.toLowerCase();
  if (!k) return { type: 'unknown', risk_level: 'low', allowed_frequency: 1, requires_proof: false };
  if (HIGH_RISK_KEYWORDS[key]) {
    const isTool = TOOL_KEYWORDS.includes(key);
    return {
      type: isTool ? 'tool' : (key.includes('management') ? 'functional' : 'unknown'),
      risk_level: 'high',
      allowed_frequency: isTool ? 2 : 1,
      requires_proof: true,
      alternative: HIGH_RISK_KEYWORDS[key].alternative
    };
  }
  if (TOOL_KEYWORDS.includes(key)) return { type: 'tool', risk_level: 'low', allowed_frequency: 2, requires_proof: true };
  const outcomeHints = ['improvement', 'optimization', 'growth', 'reduction', 'increase', 'efficiency', 'impact', 'revenue', 'cost', 'conversion'];
  if (outcomeHints.some(h => key.includes(h))) return { type: 'outcome', risk_level: 'medium', allowed_frequency: 1, requires_proof: true };
  if (key.includes('management') || key.includes('strategy') || key.includes('leadership') || key.includes('stakeholder')) {
    return { type: 'functional', risk_level: 'medium', allowed_frequency: 1, requires_proof: true };
  }
  return { type: 'functional', risk_level: 'low', allowed_frequency: 1, requires_proof: true };
};

const hasExcelProof = (resumeText: string) => {
  const t = (resumeText || '').toLowerCase();
  if (includesKeyword(t, 'Excel')) {
    const proofHints = ['report', 'reporting', 'dashboard', 'model', 'modeling', 'analysis', 'analyzing', 'pivot', 'vlookup', 'lookup', 'forecast', 'tracking'];
    return proofHints.some(h => t.includes(h));
  }
  const genericProofHints = ['spreadsheet', 'report', 'dashboard', 'model', 'analysis', 'tracking'];
  return genericProofHints.some(h => t.includes(h));
};

const hasScaleProof = (resumeText: string) => {
  const t = (resumeText || '');
  if (/\b(\d{1,3}(?:,\d{3})+|\d{4,})\b/.test(t)) return true;
  if (/\b(million|billion|thousand|tb|gb|records|rows|transactions)\b/i.test(t)) return true;
  return false;
};

const hasOwnershipProof = (resumeText: string) => {
  const t = (resumeText || '').toLowerCase();
  const ownershipHints = ['owned', 'accountable', 'responsible for', 'led', 'managed', 'end-to-end', 'oversaw'];
  const inventoryHints = ['inventory', 'stock', 'supply', 'warehouse', 'replenish', 'replenishment', 'demand planning', 'procurement'];
  return inventoryHints.some(h => t.includes(h)) && ownershipHints.some(h => t.includes(h));
};

const hasCxProof = (resumeText: string) => {
  const t = (resumeText || '').toLowerCase();
  const cxHints = ['customer', 'client', 'support', 'service', 'satisfaction', 'nps', 'csat', 'complaint', 'tickets', 'calls'];
  return cxHints.some(h => t.includes(h));
};

const proofSatisfied = (keywordLower: string, resumeText: string) => {
  const rule = HIGH_RISK_KEYWORDS[keywordLower];
  if (!rule) return true;
  for (const req of rule.requires) {
    if (req === 'excel_proof' && !hasExcelProof(resumeText)) return false;
    if (req === 'scale_proof' && !hasScaleProof(resumeText)) return false;
    if (req === 'ownership_proof' && !hasOwnershipProof(resumeText)) return false;
    if (req === 'cx_proof' && !hasCxProof(resumeText)) return false;
  }
  return true;
};

const findEvidenceSnippet = (resumeText: string, keyword: string) => {
  const raw = (resumeText || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const key = (keyword || '').trim();
  if (!key) return '';
  for (const line of raw) {
    if (includesKeyword(line, key)) return line.slice(0, 160);
  }
  const parts = tokenizeWords(key);
  if (parts.length > 0) {
    for (const line of raw) {
      const lower = line.toLowerCase();
      if (parts.some(p => lower.includes(p))) return line.slice(0, 160);
    }
  }
  return '';
};

const findJdSnippet = (jd: string, keyword: string) => {
  const lines = (jd || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (includesKeyword(line, keyword)) return line.slice(0, 160);
  }
  return '';
};

const computeRoboticLanguageScore = (markdown: string) => {
  const text = normalizeText(markdown);
  if (!text) return 0;
  const lines = (markdown || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const bulletLines = lines.filter(l => l.startsWith('- ')).map(l => l.slice(2).trim()).filter(Boolean);
  const starters = bulletLines
    .map(l => (l.match(/^([A-Za-z]{3,12})\b/)?.[1] || '').toLowerCase())
    .filter(Boolean);
  const starterCounts = new Map<string, number>();
  for (const s of starters) starterCounts.set(s, (starterCounts.get(s) || 0) + 1);
  const repeatedStarterPenalty = Array.from(starterCounts.values()).filter(v => v >= 3).reduce((a, b) => a + b, 0);
  const buzzCount = BUZZWORDS.reduce((acc, b) => acc + countKeywordOccurrences(text, b), 0);
  const avgBulletLen = bulletLines.length > 0 ? bulletLines.reduce((a, b) => a + tokenizeWords(b).length, 0) / bulletLines.length : 0;
  const longBulletPenalty = Math.max(0, (avgBulletLen - 22) / 22);
  const raw = 0.15 * Math.min(1, repeatedStarterPenalty / Math.max(1, bulletLines.length)) + 0.35 * Math.min(1, buzzCount / 6) + 0.25 * Math.min(1, longBulletPenalty) + 0.25 * Math.min(1, (text.length > 6500 ? (text.length - 6500) / 4000 : 0));
  return Math.max(0, Math.min(1, raw));
};

const detectToolFirstBullets = (markdown: string) => {
  const lines = (markdown || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const offenders: string[] = [];
  for (const line of lines) {
    if (!line.startsWith('- ')) continue;
    const content = line.slice(2).trim();
    const firstWord = (content.match(/^([A-Za-z][A-Za-z0-9+.#/-]{1,20})/)?.[1] || '').toLowerCase();
    if (!firstWord) continue;
    if (TOOL_KEYWORDS.includes(firstWord)) offenders.push(line.slice(0, 160));
    if (firstWord === 'excel' || firstWord === 'sql' || firstWord === 'python') offenders.push(line.slice(0, 160));
  }
  return offenders.slice(0, 10);
};

const computeOutcomeClarity = (markdown: string) => {
  const lines = (markdown || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const bullets = lines.filter(l => l.startsWith('- ')).map(l => l.slice(2).trim()).filter(Boolean);
  if (bullets.length === 0) return 0.6;
  const outcomeVerbs = ['increased', 'reduced', 'improved', 'accelerated', 'decreased', 'grew', 'saved', 'delivered', 'launched', 'built', 'optimized', 'streamlined', 'automated'];
  const withOutcomes = bullets.filter(b => /\b\d+%?\b/.test(b) || outcomeVerbs.some(v => b.toLowerCase().includes(v))).length;
  return withOutcomes / bullets.length;
};

const computeSectionStructureScore = (markdown: string) => {
  const required = ['SUMMARY', 'EXPERIENCE', 'SKILLS', 'EDUCATION'];
  const sections = Object.keys(splitAtsSections(markdown)).map(s => s.toUpperCase());
  const present = required.filter(r => sections.includes(r)).length;
  return present / required.length;
};

const computeFormattingClarityScore = (markdown: string) => {
  const t = markdown || '';
  if (/\|.*\|/.test(t) && /\n\|?\s*---/.test(t)) return 0.6;
  if (/<table/i.test(t) || /<div/i.test(t)) return 0.6;
  return 0.9;
};

const computeConsistencyScore = (markdown: string) => {
  const lines = (markdown || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const expHeaders = lines.filter(l => l.startsWith('### ') && l.includes('|'));
  if (expHeaders.length === 0) return 0.75;
  const valid = expHeaders.filter(h => (h.split('|').length - 1) >= 3).length;
  return valid / expHeaders.length;
};

const computeSemanticSkillMatch = (markdown: string, targetKeywords: string[]) => {
  const ks = dedupeKeywords(targetKeywords);
  if (ks.length === 0) return 0.8;
  const present = ks.filter(k => includesKeyword(markdown, k)).length;
  return present / ks.length;
};

const computeRoleAlignment = (markdown: string, jd: string) => {
  const jdWords = tokenizeWords(jd).slice(0, 40);
  const summarySection = splitAtsSections(markdown)['SUMMARY'] || '';
  const summaryWords = new Set(tokenizeWords(summarySection));
  const overlap = jdWords.filter(w => summaryWords.has(w));
  const score = overlap.length / Math.max(1, Math.min(12, jdWords.length));
  return Math.max(0, Math.min(1, score));
};

const buildDualScoring = (markdown: string, jd: string, targetKeywords: string[], issues: ComplianceIssue[]) => {
  const semanticSkill = computeSemanticSkillMatch(markdown, targetKeywords);
  const roleAlign = computeRoleAlignment(markdown, jd);
  const sectionStruct = computeSectionStructureScore(markdown);
  const keywordPresence = Math.max(0, Math.min(1, semanticSkill * 0.9 + 0.1));
  const formatting = computeFormattingClarityScore(markdown);
  const consistency = computeConsistencyScore(markdown);

  const atsFactors: ScoreFactor[] = [
    { factor: 'Semantic skill match', weight: 30, score: Math.round(semanticSkill * 100) },
    { factor: 'Role alignment', weight: 20, score: Math.round(roleAlign * 100) },
    { factor: 'Section structure', weight: 15, score: Math.round(sectionStruct * 100) },
    { factor: 'Keyword presence (non-repetitive)', weight: 15, score: Math.round(keywordPresence * 100) },
    { factor: 'Formatting clarity', weight: 10, score: Math.round(formatting * 100) },
    { factor: 'Consistency', weight: 10, score: Math.round(consistency * 100) }
  ];

  const robotic = computeRoboticLanguageScore(markdown);
  const outcomeClarity = computeOutcomeClarity(markdown);
  const toolFirst = detectToolFirstBullets(markdown).length > 0;
  const buzzCount = BUZZWORDS.reduce((acc, b) => acc + countKeywordOccurrences(markdown.toLowerCase(), b), 0);
  const hardCount = issues.filter(i => i.severity === 'hard').length;

  const credibilityBase = Math.max(0, 1 - Math.min(1, hardCount / 4));
  const readability = Math.max(0, 1 - robotic);
  const skillBelievability = Math.max(0, 1 - Math.min(1, (toolFirst ? 0.15 : 0) + Math.max(0, (targetKeywords.length - 18) / 30)));
  const noBuzz = Math.max(0, 1 - Math.min(1, buzzCount / 6));
  const interviewDef = Math.max(0, 1 - Math.min(1, hardCount / 6));

  const recruiterFactors: ScoreFactor[] = [
    { factor: 'Credibility', weight: 30, score: Math.round(credibilityBase * 100) },
    { factor: 'Readability', weight: 20, score: Math.round(readability * 100) },
    { factor: 'Outcome clarity', weight: 20, score: Math.round(outcomeClarity * 100) },
    { factor: 'Skill believability', weight: 15, score: Math.round(skillBelievability * 100) },
    { factor: 'No buzzwords', weight: 10, score: Math.round(noBuzz * 100) },
    { factor: 'Interview defensibility', weight: 5, score: Math.round(interviewDef * 100) }
  ];

  const weightedTotal = (factors: ScoreFactor[]) =>
    Math.round(factors.reduce((acc, f) => acc + (f.score * f.weight) / 100, 0));

  const atsScore = weightedTotal(atsFactors);
  const recruiterScore = weightedTotal(recruiterFactors);

  const risk: 'Low' | 'Medium' | 'High' =
    hardCount >= 2 || recruiterScore < 60 ? 'High' : hardCount === 1 || recruiterScore < 75 ? 'Medium' : 'Low';

  const verdict =
    risk === 'Low' ? 'Strong resume' : risk === 'Medium' ? 'Good but needs cleanup' : 'High risk resume';

  const summary =
    risk === 'Low'
      ? 'ATS-safe with high recruiter trust. No over-optimization detected.'
      : risk === 'Medium'
        ? 'Solid structure, but a few risk patterns need cleanup for recruiter trust.'
        : 'Multiple compliance risks detected; rewrite required before using this resume.';

  return { ats_score: atsScore, recruiter_score: recruiterScore, ats_factors: atsFactors, recruiter_factors: recruiterFactors, verdict, risk, summary };
};

export const validateResumeMarkdown = (params: {
  markdown: string;
  jobDescription: string;
  originalResumeText: string;
  targetKeywords: string[];
  removeRiskyKeywords?: boolean;
  jdMirroringThreshold?: number;
}): ResumeComplianceReport => {
  const markdown = params.markdown || '';
  const jd = params.jobDescription || '';
  const original = params.originalResumeText || '';
  const threshold = typeof params.jdMirroringThreshold === 'number' ? params.jdMirroringThreshold : 0.75;
  const removeRisky = !!params.removeRiskyKeywords;

  const targetKeywords = dedupeKeywords(params.targetKeywords || []);
  const keywordMeta = new Map<string, ReturnType<typeof classifyKeyword>>();
  for (const k of targetKeywords) keywordMeta.set(k.toLowerCase(), classifyKeyword(k));

  const issues: ComplianceIssue[] = [];

  const sections = splitAtsSections(markdown);
  for (const keyword of targetKeywords) {
    const meta = keywordMeta.get(keyword.toLowerCase()) || classifyKeyword(keyword);
    const globalCount = countKeywordOccurrences(markdown, keyword);
    const allowed = meta.allowed_frequency;
    if (globalCount > allowed) {
      issues.push({
        severity: 'hard',
        validator: 'keyword_frequency',
        message: `"${keyword}" appears ${globalCount} times (max ${allowed}).`,
        details: { keyword, count: globalCount, max: allowed }
      });
    }
    for (const [section, content] of Object.entries(sections)) {
      if (section === 'OTHER') continue;
      const sectionCount = countKeywordOccurrences(content, keyword);
      if (sectionCount > 1) {
        issues.push({
          severity: 'hard',
          validator: 'keyword_frequency',
          message: `"${keyword}" repeats in ${section} (${sectionCount} times).`,
          details: { keyword, section, count: sectionCount, max: 1 }
        });
      }
    }
  }

  for (const keyword of targetKeywords) {
    const meta = keywordMeta.get(keyword.toLowerCase()) || classifyKeyword(keyword);
    const used = includesKeyword(markdown, keyword);
    if (!used) continue;
    if (!meta.requires_proof) continue;
    const hasDirect = includesKeyword(original, keyword);
    const satisfied = proofSatisfied(keyword.toLowerCase(), original);
    if (!hasDirect && !satisfied) {
      issues.push({
        severity: 'hard',
        validator: 'experience_evidence',
        message: `"${keyword}" is used but lacks evidence in the original resume.`,
        details: { keyword }
      });
    }
    if (removeRisky && meta.risk_level === 'high' && !satisfied) {
      issues.push({
        severity: 'hard',
        validator: 'remove_risky_keywords',
        message: `"${keyword}" flagged as high-risk; replace with experience-based phrasing.`,
        details: { keyword, alternative: meta.alternative }
      });
    }
  }

  const ngram = countSharedNgramsSimilarity(jd, markdown, 7);
  if (ngram.similarity >= threshold && ngram.intersection > 0) {
    issues.push({
      severity: 'hard',
      validator: 'jd_phrase_mirroring',
      message: `Detected likely JD phrase mirroring (similarity ${(ngram.similarity * 100).toFixed(0)}%).`,
      details: { similarity: ngram.similarity, threshold, intersection: ngram.intersection, n: 7 }
    });
  }

  const robotic = computeRoboticLanguageScore(markdown);
  if (robotic >= 0.6) {
    issues.push({
      severity: 'soft',
      validator: 'robotic_language_score',
      message: `Language may feel templated or repetitive (score ${robotic.toFixed(2)}).`,
      details: { score: robotic, threshold: 0.6 }
    });
  }

  const toolFirstBullets = detectToolFirstBullets(markdown);
  if (toolFirstBullets.length > 0) {
    issues.push({
      severity: 'soft',
      validator: 'tool_first_sentence',
      message: `Some bullets start with tools; move tools to the end of the sentence.`,
      details: { examples: toolFirstBullets }
    });
  }

  const keyword_justifications: KeywordJustification[] = targetKeywords.map(keyword => {
    const meta = keywordMeta.get(keyword.toLowerCase()) || classifyKeyword(keyword);
    const used = includesKeyword(markdown, keyword);
    const frequency = used ? countKeywordOccurrences(markdown, keyword) : 0;
    const evidence = used ? (findEvidenceSnippet(original, keyword) || '') : '';
    const jdRef = findJdSnippet(jd, keyword);
    const satisfied = proofSatisfied(keyword.toLowerCase(), original);
    const alternative = meta.alternative;
    if (!used) {
      return {
        keyword,
        used: false,
        category: meta.type,
        risk_level: meta.risk_level,
        allowed_frequency: meta.allowed_frequency,
        requires_proof: meta.requires_proof,
        frequency: 0,
        resume_evidence: '',
        job_description_reference: jdRef,
        justification: '',
        reason: meta.requires_proof ? 'No clear evidence found in resume experience' : 'Not applicable',
        alternative_used: alternative
      };
    }
    const justification = meta.risk_level === 'high' && !satisfied
      ? `High-risk term; rewrite recommended to preserve credibility and avoid over-optimization.`
      : `Used to support experience-based alignment. Kept within frequency limits to avoid keyword stuffing.`;
    return {
      keyword,
      used: true,
      category: meta.type,
      risk_level: meta.risk_level,
      allowed_frequency: meta.allowed_frequency,
      requires_proof: meta.requires_proof,
      frequency,
      resume_evidence: evidence,
      job_description_reference: jdRef,
      justification
    };
  });

  const scoring = buildDualScoring(markdown, jd, targetKeywords, issues);
  return { issues, keyword_justifications, scoring };
};

export const buildDualScoringFromText = (params: {
  resumeText: string;
  jobDescription: string;
}): DualScoringReport => {
  const mdLike = `## SUMMARY\n${(params.resumeText || '').slice(0, 2000)}\n\n## EXPERIENCE\n${(params.resumeText || '').slice(2000, 6000)}\n\n## SKILLS\n\n## EDUCATION\n`;
  const report = validateResumeMarkdown({
    markdown: mdLike,
    jobDescription: params.jobDescription || '',
    originalResumeText: params.resumeText || '',
    targetKeywords: [],
    removeRiskyKeywords: false
  });
  return report.scoring;
};

