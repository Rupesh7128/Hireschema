import { extractKeywords } from './keywordExtraction';
import { SKILL_DATABASE } from './skillDatabase';

export interface VerificationResult {
    isSafe: boolean;
    fabricatedCount: number;
    checks: VerificationCheck[];
}

export interface VerificationCheck {
    claim: string;
    isVerified: boolean;
    severity: 'critical' | 'warning';
    type: 'skill' | 'metric';
}

/**
 * Extract all numeric values from metric-like patterns (50%, $1M, 10x).
 */
const extractNumericValues = (text: string): number[] => {
    const values: number[] = [];
    const patterns = [
        /(\d+(?:\.\d+)?)\s*%/gi,
        /\$\s*(\d+(?:\.\d+)?)\s*[kmb]?/gi,
        /(\d+(?:\.\d+)?)\s*x\b/gi,
        /(\d+(?:\.\d+)?)\s*(?:million|billion|thousand)\b/gi,
    ];
    for (const pattern of patterns) {
        let match: RegExpExecArray | null;
        // reset lastIndex for global regexes
        pattern.lastIndex = 0;
        while ((match = pattern.exec(text)) !== null) {
            const val = parseFloat(match[1]);
            if (!isNaN(val)) values.push(val);
        }
    }
    return values;
};

/** Extract metric tokens normalized to lowercase. */
const extractMetricTokens = (text: string): string[] =>
    (text.match(/\d+(?:\.\d+)?%|\$\d+(?:\.\d+)?[kmb]?|\d+(?:\.\d+)?x/gi) || [])
        .map(m => m.toLowerCase());

/** Check if a generated metric value is within ±15% of any original value. */
const isMetricWithinTolerance = (generatedValue: number, originalValues: number[]): boolean =>
    originalValues.some(orig => {
        if (orig === 0) return generatedValue === 0;
        return Math.abs(generatedValue - orig) / orig <= 0.15;
    });

/**
 * Compares the Generated Resume against the Original Resume to find
 * hallucinated content: skills and metrics that appear in output but NOT input.
 *
 * Improvements over v1:
 * - Skills: verified against full original text + all skill variants, not just DB-matched names
 * - Metrics: ±15% numeric tolerance, case-normalized
 * - Soft skills: flagged as 'warning' not 'critical'
 */
export const verifyTruth = (
    originalText: string,
    generatedText: string
): VerificationResult => {
    const originalLower = originalText.toLowerCase();
    const originalKeywords = new Set(
        extractKeywords(originalText).map(k => k.normalized.toLowerCase())
    );
    const generatedKeywords = extractKeywords(generatedText);

    const checks: VerificationCheck[] = [];
    let fabricatedCount = 0;

    // 1. Verify Skills
    generatedKeywords.forEach(kw => {
        const kwLower = kw.normalized.toLowerCase();

        // Check 1: DB-extracted match from original
        if (originalKeywords.has(kwLower)) return;

        // Check 2: direct substring in original text
        if (originalLower.includes(kwLower)) return;

        // Check 3: any canonical variant of this skill in original text
        const skillDef = SKILL_DATABASE.find(s => s.name.toLowerCase() === kwLower);
        if (skillDef && skillDef.variants.some(v => originalLower.includes(v.toLowerCase()))) return;

        // Truly fabricated — determine severity by category
        const isCritical = kw.category === 'hard' || kw.category === 'tool';
        checks.push({
            claim: kw.original,
            isVerified: false,
            severity: isCritical ? 'critical' : 'warning',
            type: 'skill'
        });
        if (isCritical) fabricatedCount++;
    });

    // 2. Verify Metrics with fuzzy tolerance
    const originalMetricTokens = new Set(extractMetricTokens(originalText));
    const originalNumericValues = extractNumericValues(originalText);
    const generatedMetricTokens = extractMetricTokens(generatedText);

    generatedMetricTokens.forEach(token => {
        // Exact match (most common valid case)
        if (originalMetricTokens.has(token)) return;

        // Fuzzy numeric match
        const numMatch = token.match(/(\d+(?:\.\d+)?)/);
        if (numMatch) {
            const val = parseFloat(numMatch[1]);
            if (isMetricWithinTolerance(val, originalNumericValues)) return;
        }

        // If the original resume had NO quantitative metrics at all, an invented metric is critical
        const severity = originalNumericValues.length === 0 ? 'critical' : 'warning';
        checks.push({
            claim: token,
            isVerified: false,
            severity,
            type: 'metric'
        });
        fabricatedCount++;
    });

    return {
        isSafe: fabricatedCount === 0,
        fabricatedCount,
        checks
    };
};
