import { SKILL_DATABASE, ABBREVIATIONS } from './skillDatabase';
import { extractKeywordsWithAI } from '../aiService';

export interface ExtractedKeyword {
    original: string;
    normalized: string;
    count: number;
    category: 'hard' | 'soft' | 'tool' | 'certification';
    source?: 'database' | 'ai';
}

/**
 * Build a regex that safely matches a skill/variant as a whole token,
 * handling special chars (C++, C#, .NET, Node.js) and multi-word terms.
 */
const buildSkillRegex = (term: string): RegExp | null => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Allow any non-alphanumeric boundary on either side (handles spaces, punctuation, line starts/ends)
    const pattern = `(?:^|[^a-zA-Z0-9.#])${escaped}(?=$|[^a-zA-Z0-9.#])`;
    try {
        return new RegExp(pattern, 'gi');
    } catch {
        return null;
    }
};

/**
 * Check if a given term appears in a normalized text string.
 * Handles: case-insensitive, whole-word boundaries, abbreviation expansion.
 */
const termInText = (term: string, textLower: string): boolean => {
    const termLower = term.toLowerCase().trim();
    if (!termLower) return false;

    // Direct substring check (fast path for common cases)
    if (textLower.includes(termLower)) return true;

    // Check if it's a known abbreviation and the expansion appears in text
    const expanded = ABBREVIATIONS[termLower];
    if (expanded && textLower.includes(expanded.toLowerCase())) return true;

    // Check if any known abbreviation that maps to this term appears in text
    for (const [abbr, canonical] of Object.entries(ABBREVIATIONS)) {
        if (canonical.toLowerCase() === termLower && textLower.includes(abbr.toLowerCase())) {
            return true;
        }
    }

    return false;
};

/**
 * Deterministically extracts keywords from text using the Skill Database.
 * Returns unique keywords with frequencies.
 */
export const extractKeywords = (text: string): ExtractedKeyword[] => {
    if (!text) return [];

    const textLower = text.toLowerCase();
    const foundSkills = new Map<string, ExtractedKeyword>();

    SKILL_DATABASE.forEach(skill => {
        const variants = [skill.name, ...skill.variants];
        let totalCount = 0;

        for (const variant of variants) {
            const regex = buildSkillRegex(variant);
            if (!regex) continue;
            const matches = text.match(regex);
            if (matches) {
                totalCount += matches.length;
            }
        }

        // Also check abbreviations that map to this skill
        if (totalCount === 0) {
            for (const [abbr, canonical] of Object.entries(ABBREVIATIONS)) {
                if (canonical.toLowerCase() === skill.name.toLowerCase()) {
                    const regex = buildSkillRegex(abbr);
                    if (regex) {
                        const matches = textLower.match(regex);
                        if (matches) {
                            totalCount += matches.length;
                            break;
                        }
                    }
                }
            }
        }

        if (totalCount > 0) {
            foundSkills.set(skill.id, {
                original: skill.name,
                normalized: skill.name,
                count: totalCount,
                category: skill.category,
                source: 'database'
            });
        }
    });

    return Array.from(foundSkills.values());
};

/**
 * Static-only gap analysis — no AI calls.
 * Used by the deterministic scanner to avoid hidden LLM calls.
 */
export const findKeywordGapsStatic = (resumeText: string, jobDescriptionText: string) => {
    const resumeKeywords = extractKeywords(resumeText);
    const jdKeywords = extractKeywords(jobDescriptionText);

    const resumeNormSet = new Set(resumeKeywords.map(k => k.normalized.toLowerCase()));
    const resumeTextLower = resumeText.toLowerCase();

    const present: ExtractedKeyword[] = [];
    const missing: ExtractedKeyword[] = [];

    jdKeywords.forEach(kw => {
        const inStatic = resumeNormSet.has(kw.normalized.toLowerCase());
        const inText = termInText(kw.normalized, resumeTextLower);
        if (inStatic || inText) {
            present.push(kw);
        } else {
            missing.push(kw);
        }
    });

    return {
        present,
        missing,
        matchScore: Math.round((present.length / Math.max(jdKeywords.length, 1)) * 100)
    };
};

/**
 * Compares two texts (Resume vs JD) and checks for keyword gaps.
 * Uses Hybrid Approach: Static DB + AI Extraction.
 */
export const findKeywordGaps = async (resumeText: string, jobDescriptionText: string) => {
    // 1. Static Analysis (Fast, deterministic, uses expanded 500+ DB)
    const resumeKeywordsStatic = extractKeywords(resumeText);
    const jdKeywordsStatic = extractKeywords(jobDescriptionText);

    // 2. AI Analysis — catches domain-specific terms not in DB
    let jdKeywordsAI: string[] = [];
    try {
        jdKeywordsAI = await extractKeywordsWithAI(jobDescriptionText);
    } catch (e) {
        console.warn('AI keyword extraction failed, using static DB only', e);
    }

    // 3. Merge JD Keywords (Static + AI)
    const allJdKeywords = new Map<string, ExtractedKeyword>();

    jdKeywordsStatic.forEach(k => allJdKeywords.set(k.normalized.toLowerCase(), k));

    jdKeywordsAI.forEach(k => {
        const norm = k.trim();
        if (!norm) return;
        const lower = norm.toLowerCase();
        if (!allJdKeywords.has(lower)) {
            allJdKeywords.set(lower, {
                original: k,
                normalized: norm,
                count: 1,
                category: 'hard',
                source: 'ai'
            });
        }
    });

    // 4. Check Presence in Resume (static match + full-text fuzzy check)
    const resumeNormSet = new Set(resumeKeywordsStatic.map(k => k.normalized.toLowerCase()));
    const resumeTextLower = resumeText.toLowerCase();

    const present: ExtractedKeyword[] = [];
    const missing: ExtractedKeyword[] = [];

    allJdKeywords.forEach(kw => {
        const inStatic = resumeNormSet.has(kw.normalized.toLowerCase());
        const inText = termInText(kw.normalized, resumeTextLower);
        // Also check variants from DB for this skill
        const skillDef = SKILL_DATABASE.find(s => s.name.toLowerCase() === kw.normalized.toLowerCase());
        const inVariant = skillDef
            ? skillDef.variants.some(v => termInText(v, resumeTextLower))
            : false;

        if (inStatic || inText || inVariant) {
            present.push(kw);
        } else {
            missing.push(kw);
        }
    });

    return {
        present,
        missing,
        matchScore: Math.round((present.length / Math.max(allJdKeywords.size, 1)) * 100)
    };
};

/**
 * Maps a JD-required skill (lowercase key) to resume context patterns that imply it.
 * When the JD requires skill X and the resume has any of the listed patterns,
 * X is "contextually backed" and safe to include in the SKILLS section.
 */
const JD_SKILL_IMPLICATION_MAP: Record<string, { label: string; patterns: string[] }> = {
    'excel': {
        label: 'Microsoft Excel',
        patterns: [
            'data analytic', 'market research', 'category management', 'category plan',
            'merchandise plan', 'fashion buy', 'buying', 'merchandis', 'inventory',
            'financial analysis', 'forecasting', 'business analysis', 'operations',
            'supply chain', 'procurement', 'analyst', 'planner', 'buyer', 'reporting',
            'category manager', 'product manager', 'brand manager', 'account manager',
            'business development', 'retail', 'commercial', 'trade marketing', 'ecommerce',
            'e-commerce', 'demand planning', 'sales planning',
        ],
    },
    'microsoft excel': {
        label: 'Microsoft Excel',
        patterns: [
            'data analytic', 'market research', 'category management', 'category plan',
            'merchandise plan', 'fashion buy', 'buying', 'merchandis', 'inventory',
            'financial analysis', 'forecasting', 'business analysis', 'operations',
            'analyst', 'planner', 'buyer', 'reporting', 'retail',
        ],
    },
    'google analytics': {
        label: 'Google Analytics',
        patterns: [
            'e-commerce', 'ecommerce', 'digital marketing', 'marketing analytics',
            'seo', 'sem', 'performance marketing', 'growth', 'web analytics',
        ],
    },
    'sql': {
        label: 'SQL',
        patterns: [
            'data analytic', 'data analysis', 'business analytic', 'data science',
            'business intelligence', 'reporting', 'data engineer', 'etl', 'data warehouse',
        ],
    },
    'tableau': {
        label: 'Tableau',
        patterns: [
            'data analytic', 'business intelligence', 'data visualization', 'reporting',
            'data analysis', 'bi developer', 'business analyst',
        ],
    },
    'power bi': {
        label: 'Power BI',
        patterns: [
            'data analytic', 'business intelligence', 'data visualization',
            'reporting', 'business analyst', 'operations analyst',
        ],
    },
    'salesforce': {
        label: 'Salesforce',
        patterns: [
            'crm', 'sales operations', 'account management', 'sales management',
            'business development', 'customer success',
        ],
    },
    'jira': {
        label: 'Jira',
        patterns: [
            'project management', 'product management', 'agile', 'scrum',
            'software development', 'engineering manager', 'program management',
        ],
    },
    'google sheets': {
        label: 'Google Sheets',
        patterns: [
            'data analytic', 'market research', 'operations', 'reporting', 'planning',
            'coordinator', 'analyst', 'e-commerce', 'ecommerce',
        ],
    },
};

/**
 * Returns JD-required skills that aren't explicit in the resume but are strongly
 * implied by the candidate's existing roles and skill set.
 * These are safe to include in the SKILLS section only — not fabricated in bullets.
 */
export const getImpliedJdSkills = (resumeText: string, jdText: string): string[] => {
    const resumeLower = resumeText.toLowerCase();
    const jdLower = jdText.toLowerCase();
    const implied: string[] = [];

    for (const [jdSkillKey, { label, patterns }] of Object.entries(JD_SKILL_IMPLICATION_MAP)) {
        // Skip if JD doesn't mention this skill
        if (!jdLower.includes(jdSkillKey)) continue;

        // Skip if resume already mentions this skill
        if (resumeLower.includes(jdSkillKey) || resumeLower.includes(label.toLowerCase())) continue;

        // Check if resume has any of the implying context patterns
        const hasImplyingContext = patterns.some(p => resumeLower.includes(p));
        if (hasImplyingContext) {
            implied.push(label);
        }
    }

    return [...new Set(implied)];
};
