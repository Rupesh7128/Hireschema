import { calculateDeterministicScore, DeterministicScore } from './atsScoring';
import { verifyTruth, VerificationResult } from './fabricationDetection';
import { cacheService } from './cacheService';
import { extractTextFromPdf } from './pdfParser';
import { refineAtsResumeContent } from '../aiService';

export interface OptimizationRequest {
    resumeText: string;
    jobDescriptionText: string;
    resumePageCount?: number;
}

export interface EngineResult {
    atsScore: DeterministicScore;
    verification?: VerificationResult;
    isCached: boolean;
    processingTimeMs: number;
    optimizedResume?: string;
}

export class EngineOrchestrator {

    /**
     * Parse a PDF file to plain text using the optimized engine parser.
     */
    static async parseResume(file: File): Promise<string> {
        try {
            return await extractTextFromPdf(file);
        } catch (e) {
            console.warn('PDF parser failed', e);
            throw e;
        }
    }

    /**
     * Scan: fast, deterministic, no LLM.
     * Returns cached result if available.
     */
    static scan(request: OptimizationRequest): EngineResult {
        const startTime = performance.now();
        const cacheKey = cacheService.getKey(
            request.resumeText,
            request.jobDescriptionText,
            'scan_v2'  // bumped version to avoid stale cached results from old async scan
        );

        const cached = cacheService.get<EngineResult>(cacheKey);
        if (cached) {
            return { ...cached, isCached: true, processingTimeMs: performance.now() - startTime };
        }

        const atsScore = calculateDeterministicScore(
            request.resumeText,
            request.jobDescriptionText,
            request.resumePageCount || 1
        );

        const result: EngineResult = {
            atsScore,
            isCached: false,
            processingTimeMs: performance.now() - startTime
        };

        cacheService.set(cacheKey, result);
        return result;
    }

    /**
     * Optimize: uses AI to refine resume content, then verifies truth.
     * The `currentDraft` is the AI's working copy (may be the original or a previous draft).
     * The `originalResumeText` is the immutable source of truth for fabrication detection.
     */
    static async optimize(
        originalResumeText: string,
        jobDescription: string,
        instruction: string = 'Optimize for ATS',
        currentDraft?: string
    ): Promise<{ optimizedText: string; verification: VerificationResult }> {
        // Use original as starting draft if no prior draft provided
        const draft = currentDraft || originalResumeText;

        const optimizedText = await refineAtsResumeContent(
            draft,
            instruction,
            jobDescription,
            originalResumeText  // always the immutable source for zero-fabrication checks
        );

        const verification = verifyTruth(originalResumeText, optimizedText);
        return { optimizedText, verification };
    }
}
