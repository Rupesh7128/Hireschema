
import * as pdfjsLib from 'pdfjs-dist';

// We need to set the worker source. 
// For simplicity in this dev environment ensuring compatibility, we'll use a CDN that likely matches the installed version (latest).
// In a strict production build, we'd import the worker file URL.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const NON_RESUME_MESSAGE = "That file screams 'not a resume.' Upload a real resume (PDF) and we’ll work our magic.";

const getResumeSignals = (text: string) => {
    const t = (text || '').toLowerCase();
    const compactLen = t.replace(/\s+/g, ' ').trim().length;
    let hits = 0;
    if (/(experience|work history|employment)/i.test(t)) hits++;
    if (/(education|degree|b\. ?tech|bachelor|master)/i.test(t)) hits++;
    if (/(skills|technologies|tooling)/i.test(t)) hits++;
    if (/(projects|achievements|certifications)/i.test(t)) hits++;
    if (/[\w.-]+@[\w.-]+\.[a-z]{2,}/i.test(t)) hits++;
    if (/(linkedin\.com\/in\/)/i.test(t)) hits++;
    if (/(\+?\d[\d\-\s()]{7,}\d)/.test(t)) hits++;
    return { hits, compactLen, lower: t };
};

const isDefinitelyNotResume = (text: string): boolean => {
    const { hits, compactLen, lower } = getResumeSignals(text);
    if (compactLen < 800 && hits === 0) return true;
    if (hits > 0) return false;
    return /(invoice|receipt|statement|bank statement|terms of service|privacy policy|license agreement)/i.test(lower);
};

export const extractTextFromPdf = async (fileOrBase64: File | string): Promise<string> => {
    try {
        let data: Uint8Array;

        if (typeof fileOrBase64 === 'string') {
            // Base64
            const binaryString = atob(fileOrBase64);
            const len = binaryString.length;
            data = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                data[i] = binaryString.charCodeAt(i);
            }
        } else {
            // File object
            const buffer = await fileOrBase64.arrayBuffer();
            data = new Uint8Array(buffer);
        }

        const loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;

        let fullText = '';
        const maxPages = Math.min(pdf.numPages, 10); // Limit parsing to first 10 pages for speed

        for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // Optimized text extraction with basic layout preservation
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');

            fullText += pageText + '\n\n';
        }

        const cleanedText = fullText.trim();

        if (isDefinitelyNotResume(cleanedText)) {
            throw new Error(NON_RESUME_MESSAGE);
        }

        return cleanedText;

    } catch (e: any) {
        if (e.message === NON_RESUME_MESSAGE) throw e;
        console.error("PDF Parsing Error", e);
        throw new Error("Failed to parse PDF. Please ensure it is not password protected or corrupted.");
    }
};
