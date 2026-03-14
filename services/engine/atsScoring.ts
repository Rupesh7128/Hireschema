import { findKeywordGapsStatic } from './keywordExtraction';

export interface DeterministicScore {
    totalScore: number;
    breakdown: {
        keywordMatch: number;
        formatting: number;
        sections: number;
    };
    missingKeywords: string[];
}

/**
 * PURE FUNCTION: Calculates a deterministic score (0-100) based on inputs.
 * Fully synchronous — no AI calls, no async, no side effects.
 */
export const calculateDeterministicScore = (
    resumeText: string,
    jobDescriptionText: string,
    resumePageCount: number = 1
): DeterministicScore => {
    // 1. Keyword Analysis via static DB only — 60 points
    const { matchScore, missing } = findKeywordGapsStatic(resumeText, jobDescriptionText);
    const keywordPoints = Math.round(matchScore * 0.6); // 0-100 → 0-60

    // 2. Formatting / Length Checks — 20 points (page-count aware)
    let formattingPoints = 20;
    const wordCount = resumeText.split(/\s+/).filter(Boolean).length;

    // Optimal word counts vary by page count
    const minWords = resumePageCount === 1 ? 250 : resumePageCount === 2 ? 500 : 800;
    const maxWords = resumePageCount === 1 ? 700 : resumePageCount === 2 ? 1200 : 2000;

    if (wordCount < minWords * 0.5) formattingPoints -= 10;   // severely short
    else if (wordCount < minWords) formattingPoints -= 5;     // slightly short

    if (wordCount > maxWords * 1.5) formattingPoints -= 8;    // severely long
    else if (wordCount > maxWords) formattingPoints -= 4;     // slightly long

    if (resumePageCount > 2) formattingPoints -= 5;

    formattingPoints = Math.max(0, formattingPoints);

    // 3. Section Analysis — 20 points
    const requiredSections = [
        'experience|work history|employment history|work experience',
        'education|degree|academic background|qualifications',
        'skills|technologies|core competencies|technical skills|tech stack',
        'summary|profile|about|objective|professional summary'
    ];
    const lowerResume = resumeText.toLowerCase();

    let sectionPoints = 0;
    const pointPerSection = 20 / requiredSections.length;

    requiredSections.forEach(pattern => {
        if (new RegExp(pattern, 'i').test(lowerResume)) {
            sectionPoints += pointPerSection;
        }
    });

    const totalScore = Math.min(100, Math.max(0, Math.round(keywordPoints + formattingPoints + sectionPoints)));

    return {
        totalScore,
        breakdown: {
            keywordMatch: keywordPoints,
            formatting: formattingPoints,
            sections: Math.round(sectionPoints)
        },
        missingKeywords: missing.map(k => k.normalized)
    };
};
