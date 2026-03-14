import { useState, useCallback } from 'react';
import { EngineOrchestrator, EngineResult } from './orchestrator';

/**
 * React hook for consuming the EngineOrchestrator.
 * Separated from orchestrator.ts to keep business logic decoupled from React.
 */
export const useResumeOptimizer = () => {
    const [isScanning, setIsScanning] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<EngineResult | null>(null);

    const scan = useCallback((resumeText: string, jobDescriptionText: string) => {
        setIsScanning(true);
        setError(null);
        try {
            const res = EngineOrchestrator.scan({ resumeText, jobDescriptionText });
            setResult(res);
            return res;
        } catch (e: any) {
            setError(e.message || 'Scan failed');
            throw e;
        } finally {
            setIsScanning(false);
        }
    }, []);

    const optimize = useCallback(async (
        resumeText: string,
        jobDescriptionText: string,
        instruction?: string,
        currentDraft?: string
    ) => {
        setIsOptimizing(true);
        setError(null);
        try {
            const { optimizedText, verification } = await EngineOrchestrator.optimize(
                resumeText,
                jobDescriptionText,
                instruction,
                currentDraft
            );
            setResult(prev =>
                prev ? { ...prev, verification, optimizedResume: optimizedText } : null
            );
            return { optimizedText, verification };
        } catch (e: any) {
            setError(e.message || 'Optimization failed');
            throw e;
        } finally {
            setIsOptimizing(false);
        }
    }, []);

    return { scan, optimize, result, isScanning, isOptimizing, error };
};
