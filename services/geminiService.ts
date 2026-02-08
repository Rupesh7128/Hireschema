
import { GoogleGenerativeAI, GenerativeModel, GenerationConfig, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { AnalysisResult, FileData, GeneratorType, ContactProfile } from "../types";

// --- CONFIGURATION ---
const MODEL_PRIMARY = "gemini-1.5-flash-latest"; 
const MODEL_FALLBACK = "gemini-1.5-flash-latest"; 

// Safety settings to allow more "roast-like" content without triggering blocks
const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

// Deterministic generation config for consistent results
// temperature=0 ensures the same input produces the same output
const DETERMINISTIC_CONFIG: GenerationConfig = {
  temperature: 0,
  topP: 1,
  topK: 1,
};

// Singleton instance for the AI client
let genAI: GoogleGenerativeAI | null = null;

// Helper to safely get API key
const getApiKey = (): string => {
    try {
        // 1. Try Vite 'define' replacement
        // @ts-ignore
        const KEY_FROM_DEFINE = (process.env.API_KEY || process.env.GEMINI_API_KEY) as string;
        if (KEY_FROM_DEFINE && !KEY_FROM_DEFINE.startsWith('process.env')) return KEY_FROM_DEFINE;

        // 2. Try import.meta.env (Vite Standard) - Most reliable in Vercel
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
            // @ts-ignore
            const env = (import.meta as any).env;
            const fromImport = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || env.API_KEY;
            if (fromImport) return fromImport as string;
        }

        // 3. Try process.env (Node/Vercel fallback)
        // @ts-ignore
        if (typeof process !== 'undefined' && (process as any).env) {
            // @ts-ignore
            const fromProcess = (process as any).env.API_KEY || (process as any).env.GEMINI_API_KEY;
            if (fromProcess) return fromProcess as string;
        }
    } catch (e) {}
    return '';
};

// Lazy initialization of the AI client
const getGenAI = (): GoogleGenerativeAI => {
    if (genAI) return genAI;
    
    const apiKey = getApiKey();

    if (!apiKey) {
        throw new Error('Gemini API key not found. Please check your environment variables.');
    }

    genAI = new GoogleGenerativeAI(apiKey);
    return genAI;
};

// Test function to verify API key is working
let cachedModels: string[] | null = null;

const listAvailableModels = async (): Promise<string[]> => {
    const key = getApiKey();
    if (!key) return [];
    try {
        // Try v1 first as it's more stable for GA models
        const res = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${key}`);
        if (!res.ok) throw new Error('v1 failed');
        const data = await res.json();
        return (data.models || []).map((m: any) => (m.name || '').replace(/^models\//, ''));
    } catch {
        try {
            // Fallback to v1beta if v1 fails
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            const data = await res.json();
            return (data.models || []).map((m: any) => (m.name || '').replace(/^models\//, ''));
        } catch {
            return [];
        }
    }
};

const resolveModelName = async (preferred: string[]): Promise<string> => {
    try {
        if (!cachedModels) {
            cachedModels = await listAvailableModels();
        }
        
        if (!cachedModels || cachedModels.length === 0) {
            // Fallback to hardcoded safe defaults if listing fails
            for (const base of preferred) {
                if (base.includes('flash')) return 'gemini-1.5-flash-latest';
                if (base.includes('pro')) return 'gemini-1.5-pro-latest';
            }
            return 'gemini-1.5-flash-latest';
        }

        // Try to find the best match in the available models
        for (const base of preferred) {
            // 1. Exact match
            if (cachedModels.includes(base)) return base;
            
            // 2. Base name match (e.g. "gemini-1.5-flash" matches "gemini-1.5-flash-001")
            const baseName = base.replace(/-latest$|-[0-9]{3}$/, '');
            const match = cachedModels.find(m => m === baseName || m.startsWith(`${baseName}-`));
            if (match) return match;
        }

        // 3. Last resort: return the first available flash model
        const anyFlash = cachedModels.find(m => m.includes('1.5-flash'));
        if (anyFlash) return anyFlash;

        return cachedModels[0] || preferred[0];
    } catch (e) {
        return preferred[0];
    }
};

const NON_RESUME_MESSAGE = "That file screams 'not a resume.' Upload a real resume (PDF) and we’ll work our magic.";

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
    if (compactLen < 800) return false;
    if (hits > 0) return false;
    return /(invoice|receipt|statement|bank statement|terms of service|privacy policy|license agreement|user agreement|chapter|table of contents)/i.test(lower);
};

const getOpenAIKey = (): string => {
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
            // @ts-ignore
            const env = (import.meta as any).env;
            const k = env.VITE_OPENAI_API_KEY || env.OPENAI_API_KEY;
            if (k) return k as string;
        }
        // @ts-ignore
        if (typeof process !== 'undefined' && (process as any).env) {
            // @ts-ignore
            const k = (process as any).env.OPENAI_API_KEY;
            if (k) return k as string;
        }
    } catch {}
    return '';
};

const getOpenRouterKey = (): string => {
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
            // @ts-ignore
            const env = (import.meta as any).env;
            const k = env.VITE_OPEN_ROUTER_API_KEY || env.OPEN_ROUTER_API_KEY;
            if (k) return k as string;
        }
        // @ts-ignore
        if (typeof process !== 'undefined' && (process as any).env) {
            // @ts-ignore
            const k = (process as any).env.OPEN_ROUTER_API_KEY;
            if (k) return k as string;
        }
    } catch {}
    return '';
};

const openrouterGenerateContent = async (prompt: string, json: boolean = false): Promise<any> => {
    const key = getOpenRouterKey();
    if (!key) throw new Error('OpenRouter API key missing');
    const body: any = {
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }]
    };
    if (json) body.response_format = { type: 'json_object' };
    const res = await fetch('https://api.openrouter.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    return { response: { text: () => text } };
};

const openaiGenerateContent = async (prompt: string, json: boolean = false): Promise<any> => {
    const key = getOpenAIKey();
    if (!key) throw new Error('OpenAI API key missing');
    const body: any = {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }]
    };
    if (json) body.response_format = { type: 'json_object' };
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    return { response: { text: () => text } };
};

/**
 * Executes a model request with automatic fallback if the primary model fails.
 * Uses deterministic config (temperature=0) for consistent results.
 */
const generateWithFallback = async (
    primaryModelName: string, 
    prompt: string | Array<any>, 
    config: any = {},
    fallbackModelName: string = MODEL_FALLBACK
): Promise<any> => {
    const ai = getGenAI();
    const resolvedPrimary = await resolveModelName([primaryModelName, MODEL_PRIMARY, "gemini-1.5-pro", "gemini-1.5-flash"]);
    const jsonWanted = config?.generationConfig?.responseMimeType === 'application/json';
    const strPrompt = Array.isArray(prompt) ? JSON.stringify(prompt) : String(prompt);
    const isMultimodalPrompt = Array.isArray(prompt);
    
    // Merge deterministic config with any provided config and safety settings
    const mergedConfig = {
        ...config,
        safetySettings: SAFETY_SETTINGS,
        generationConfig: {
            ...DETERMINISTIC_CONFIG,
            ...config?.generationConfig,
        }
    };
    
    const orKey = getOpenRouterKey();
    if (orKey && !isMultimodalPrompt) {
        try {
            return await openrouterGenerateContent(strPrompt, jsonWanted);
        } catch (e) {
            console.warn("[Gemini Service] OpenRouter fallback failed", e);
        }
    }
    
    try {
        const model = ai.getGenerativeModel({ model: resolvedPrimary, ...mergedConfig });
        const result = await model.generateContent(prompt);
        
        // Check if the content was blocked by safety filters
        if (result.response.promptFeedback?.blockReason) {
            console.error("[Gemini Service] Content blocked by safety filters:", result.response.promptFeedback.blockReason);
            throw new Error(`Content blocked: ${result.response.promptFeedback.blockReason}`);
        }
        
        return result;
    } catch (error: any) {
        console.error("[Gemini Service] Primary model failed:", error);
        const msg = error.message || '';
        
        if (msg.includes('401') || msg.includes('API key') || msg.includes('PERMISSION_DENIED')) {
            throw error;
        }
        
        const resolvedFallback = await resolveModelName([fallbackModelName, MODEL_FALLBACK, "gemini-1.5-flash", "gemini-1.5-pro"]);
        if (resolvedFallback !== resolvedPrimary) {
            try {
                console.log(`[Gemini Service] Attempting fallback to ${resolvedFallback}...`);
                const fallbackModel = ai.getGenerativeModel({ model: resolvedFallback, ...mergedConfig });
                return await fallbackModel.generateContent(prompt);
            } catch (fallbackErr) {
                console.error("[Gemini Service] Fallback model failed:", fallbackErr);
            }
        }
        
        const openaiKey = getOpenAIKey();
        if (openaiKey && !isMultimodalPrompt) {
            try {
                console.log("[Gemini Service] Attempting fallback to OpenAI...");
                return await openaiGenerateContent(strPrompt, jsonWanted);
            } catch (openaiErr) {
                console.error("[Gemini Service] OpenAI fallback failed:", openaiErr);
            }
        }
        throw error;
    }
};

const withTimeout = <T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
    let timer: any;
    const timeoutPromise = new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(errorMessage)), ms);
    });
    return Promise.race([
        promise.finally(() => clearTimeout(timer)),
        timeoutPromise
    ]);
};

// Robust JSON cleaner
const cleanJsonOutput = (text: string): string => {
    let clean = text.trim();
    // Remove markdown code blocks
    clean = clean.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    
    // Find first '{' and last '}' to strip conversational preambles
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
        clean = clean.substring(firstBrace, lastBrace + 1);
    }
    
    return clean;
};

const safeJson = (text: string): any => {
    try { return JSON.parse(text); } catch {}
    try { return JSON.parse(cleanJsonOutput(text)); } catch {}
    return null;
};

// Helper to remove conversational filler
const cleanMarkdownOutput = (text: string): string => {
    const removeQuantifiablePlaceholders = (value: string) => {
        const cleaned = String(value || '')
            .replace(/\[\s*quantifiable\s*%?\s*\]/gi, '')
            .replace(/\[\s*quantifiable[^\]]*\]/gi, '')
            .replace(/\(\s*\)/g, '')
            .replace(/\s{2,}/g, ' ')
            .replace(/\s+([,.;:])/g, '$1')
            .replace(/([,.;:])([A-Za-z])/g, '$1 $2');
        return cleaned;
    };

    // If text starts with "Here is...", remove it until the first header or bold
    const firstHeader = text.search(/^(#{1,3}\s|\*\*|<div)/m);
    if (firstHeader !== -1) {
        return removeQuantifiablePlaceholders(text.substring(firstHeader));
    }
    return removeQuantifiablePlaceholders(text);
};

const getActionableError = (error: any): string => {
    const msg = error.message || '';
    console.error("Gemini API Error Details:", error); // Log full error for debugging
    
    if (msg.includes('401') || msg.includes('API key') || msg.includes('INVALID_ARGUMENT')) {
        return "Invalid API Key detected. Please ensure your GEMINI_API_KEY in .env.local is valid and active.";
    }
    if (msg.includes('429')) return "High traffic limit reached. Please try again in a minute.";
    if (msg.includes('503')) return "AI Service (Gemini) is temporarily unavailable. This usually means the service is overloaded. Please try again in a few minutes.";
    if (msg.includes('PasswordException')) return "This PDF is password protected. Please unlock it and try again.";
    
    // Show the actual network error to help debug
    if (msg.includes('NetworkError') || msg.includes('fetch')) return `Network Error: ${msg}. Check console for details.`;
    if (msg.includes('404')) return `Model Not Found (404): The selected AI model is unavailable for your API key/Region.`;
    
    return `Analysis failed: ${msg.substring(0, 100)}.`;
};

/**
 * Fetches the content of a job description URL using Jina Reader.
 * Jina Reader converts any URL to clean markdown text, bypassing CORS.
 */
export async function fetchJobDescriptionContent(url: string): Promise<string> {
    try {
        console.log(`[Scraper] Fetching JD content for: ${url}`);
        // Jina Reader is a free tool that converts any URL to markdown
        // It handles LinkedIn, Indeed, and other job boards effectively
        const response = await fetch(`https://r.jina.ai/${url}`, {
            headers: {
                'X-Return-Format': 'markdown'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch JD: ${response.statusText}`);
        }

        const text = await response.text();
        
        if (text && text.length > 100) {
            console.log(`[Scraper] Successfully fetched ${text.length} chars of JD content`);
            return text;
        }
        
        return ""; 
    } catch (error) {
        console.error("[Scraper] JD fetching failed:", error);
        return ""; 
    }
}

export async function extractTextFromPdf(base64Data: string): Promise<string> {
  try {
    let attempts = 0;
    while (typeof (window as any).pdfjsLib === 'undefined' && attempts < 80) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    // @ts-ignore
    if (typeof window.pdfjsLib === 'undefined') {
      throw new Error('PDF Parser not loaded. Please refresh the page and try again.');
    }

    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // @ts-ignore
    const loadingTask = window.pdfjsLib.getDocument({ data: bytes });
    const pdf = await loadingTask.promise;
    const maxPages = Math.min(pdf.numPages || 0, 50);
    let fullText = '';
    const collectedLinks: string[] = [];

    const normalizeLink = (value: string) => {
      const trimmed = String(value || '').trim();
      if (!trimmed) return '';
      if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
      if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
      if (/^linkedin\.com\//i.test(trimmed)) return `https://${trimmed}`;
      return trimmed;
    };

    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);

      // @ts-ignore
      const textContent = await page.getTextContent({ normalizeWhitespace: true });
      // @ts-ignore
      const items = (textContent.items || []) as Array<{ str?: string; hasEOL?: boolean }>;

      // @ts-ignore
      const annotations = await page.getAnnotations();
      const linksFromAnnotations = (annotations || [])
        // @ts-ignore
        .filter((a: any) => a && a.subtype === 'Link')
        // @ts-ignore
        .map((a: any) => a.url || a.unsafeUrl || a?.action?.url || a?.action?.unsafeUrl)
        .filter((u: any) => typeof u === 'string')
        .map((u: string) => normalizeLink(u))
        .filter((u: string) => {
          if (!u) return false;
          if (/^(https?:\/\/|mailto:|tel:)/i.test(u)) return true;
          return /linkedin\.com/i.test(u);
        });

      const buf: string[] = [];
      for (const item of items) {
        const s = String(item?.str || '');
        if (!s) continue;
        buf.push(s);
        buf.push(item?.hasEOL ? '\n' : ' ');
      }

      const pageTextRaw = buf.join('');
      const pageText = pageTextRaw
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();

      if (pageText) {
        fullText += pageText + '\n';
      }

      const urlRegex = /\bhttps?:\/\/[^\s)<>"']+/gi;
      const urlsInText = pageText.match(urlRegex) || [];
      const linkedinRegex = /\blinkedin\.com\/(?:in|company)\/[a-zA-Z0-9_-]+/gi;
      const linkedinNoScheme = pageText.match(linkedinRegex) || [];
      const normalizedInlineLinks = [...urlsInText, ...linkedinNoScheme.map(normalizeLink)]
        .map(normalizeLink)
        .filter(Boolean);

      for (const u of [...linksFromAnnotations, ...normalizedInlineLinks]) {
        if (u) collectedLinks.push(u);
      }
    }

    const uniqueLinks = [...new Set(collectedLinks)].filter(Boolean);
    const linksText = uniqueLinks.length > 0 ? `\n\n[Metadata: ${uniqueLinks.slice(0, 25).join(', ')}]\n` : '';
    return (fullText + linksText).trim();
  } catch (e: any) {
    if (e?.name === 'PasswordException' || String(e?.message || '').toLowerCase().includes('password')) {
      throw new Error('The PDF is password protected. Please remove the password and upload again.');
    }
    throw new Error('Error parsing PDF. Please ensure the file is a standard, text-based PDF.');
  }
}

const renderPdfPagesToPngBase64 = async (base64Data: string, pageLimit: number): Promise<string[]> => {
  let attempts = 0;
  while (typeof (window as any).pdfjsLib === 'undefined' && attempts < 80) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }

  // @ts-ignore
  if (typeof window.pdfjsLib === 'undefined') {
    throw new Error('PDF Parser not loaded. Please refresh the page and try again.');
  }

  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // @ts-ignore
  const loadingTask = window.pdfjsLib.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;
  const maxPages = Math.min(pdf.numPages || 0, Math.max(1, pageLimit));

  const images: string[] = [];
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    // @ts-ignore
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    // @ts-ignore
    const renderTask = page.render({ canvasContext: ctx, viewport });
    await renderTask.promise;

    const dataUrl = canvas.toDataURL('image/png');
    const base64 = (dataUrl.split(',')[1] || '').trim();
    if (base64) images.push(base64);

    canvas.width = 0;
    canvas.height = 0;
  }

  return images;
};

const extractTextFromPdfWithVision = async (base64Data: string, pageLimit: number = 5): Promise<string> => {
  const images = await renderPdfPagesToPngBase64(base64Data, pageLimit);
  if (images.length === 0) return '';

  const promptParts: any[] = [
    {
      text:
        "Extract ALL resume text from these images. Preserve section headings and bullet points with newlines. Return plain text only (no JSON, no markdown)."
    }
  ];

  for (const data of images) {
    promptParts.push({ inlineData: { mimeType: 'image/png', data } });
  }

  const response = await generateWithFallback(MODEL_PRIMARY, promptParts, {});
  return String(response?.response?.text?.() || '').trim();
};

export const extractResumeTextWithFallback = async (resumeFile: FileData): Promise<string> => {
  if (!resumeFile || !(resumeFile.type || '').includes('pdf')) return '';

  let initialText = await extractTextFromPdf(resumeFile.base64);
  if (initialText && isDefinitelyNotResume(initialText)) {
    throw new Error(NON_RESUME_MESSAGE);
  }

  const extractMetadataLinks = (raw: string) => {
    const input = String(raw || '');
    const matches = [...input.matchAll(/\[Metadata:\s*([^\]]+)\]/gi)];
    const parts = matches
      .map(m => String(m[1] || ''))
      .join(', ')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const urls = parts
      .map(u => u.trim())
      .filter(u => /^(https?:\/\/|mailto:|tel:)/i.test(u) || /linkedin\.com/i.test(u))
      .map(u => (u.startsWith('http') || u.startsWith('mailto:') || u.startsWith('tel:')) ? u : `https://${u}`);
    return [...new Set(urls)].slice(0, 25);
  };

  const stripMetadata = (raw: string) => String(raw || '').replace(/\[Metadata:[^\]]*\]/gi, ' ');
  const { compactLen, hits } = getResumeSignals(stripMetadata(initialText));

  if (compactLen < 120 || (compactLen < 250 && hits === 0)) {
    const metadataLinks = extractMetadataLinks(initialText);
    const visionText = await extractTextFromPdfWithVision(resumeFile.base64, compactLen < 120 ? 5 : 3);
    if (visionText) {
      const linksText = metadataLinks.length > 0 ? `\n\n[Metadata: ${metadataLinks.join(', ')}]\n` : '';
      initialText = (visionText + linksText).trim();
    }
  }

  return initialText;
};

export const calculateImprovedScore = async (
    generatedResumeText: string,
    jobDescription: string
): Promise<number> => {
    try {
        const prompt = `
            Act as a senior Technical Recruiter and ATS Expert.
            TASK: Calculate a Semantic Relevance Score (0-100) for the RESUME against the JOB DESCRIPTION.
            
            RESUME CONTENT:
            ${generatedResumeText.substring(0, 15000)}
            
            JOB DESCRIPTION:
            ${jobDescription.substring(0, 5000)}
            
            Output strictly valid JSON: { "score": number }
        `;

        const response = await generateWithFallback(
            MODEL_PRIMARY, 
            prompt, 
            { generationConfig: { responseMimeType: "application/json" } }
        );
        
        const cleanJson = cleanJsonOutput(response.response.text() || '');
        const result = JSON.parse(cleanJson);
        return result.score;
    } catch (e) {
        console.warn("Re-scoring failed", e);
        return 0;
    }
}

export const refineContent = async (
    currentContent: string,
    instruction: string,
    context: string
): Promise<string> => {
    const prompt = `
    You are a professional career editor assistant.
    CURRENT CONTENT: ${currentContent}
    USER INSTRUCTION: "${instruction}"
    CONTEXT: ${context.substring(0, 1000)}...
    CONSTRAINTS:
    - Do NOT use placeholders like [Quantifiable %], [Insert], [TBD], or bracket placeholders.
    - If a metric is unknown, omit it instead of inserting a placeholder.
    Task: Rewrite content to satisfy user instruction. Output ONLY the updated document.
    `;

    try {
        const response = await generateWithFallback(MODEL_PRIMARY, prompt);
        return cleanMarkdownOutput(response.response.text() || currentContent);
    } catch (error: any) {
         console.error("Refine content failed:", error);
         throw new Error(getActionableError(error) || "Unable to refine content.");
    }
};

export const refineAtsResumeContent = async (
    currentContent: string,
    instruction: string,
    jobDescription: string,
    originalResumeText: string
): Promise<string> => {
    const prompt = `
    You are an expert Resume Writer and ATS Optimization Specialist.

    --------------------------------------------------------------------------------
    CRITICAL: ZERO FABRICATION POLICY - READ THIS CAREFULLY
    --------------------------------------------------------------------------------
    You MUST preserve ALL factual information from the ORIGINAL RESUME.

    ABSOLUTELY FORBIDDEN - DO NOT:
    • Invent ANY company names, job titles, schools, degrees, locations, dates
    • Invent ANY skills/tools/technologies/certifications not present in ORIGINAL RESUME
    • Invent ANY metrics/numbers
    • Add new roles/projects/employers
    • Change dates or employers
    • Output placeholders like [Quantifiable %], [Insert], [TBD], or any bracket placeholders

    YOU MAY:
    • Improve ATS keyword alignment by emphasizing terms ALREADY PRESENT in the ORIGINAL RESUME
    • Improve structure/formatting and consistency

    CRITICAL INSTRUCTIONS FOR CONTENT PRESERVATION:
    • PRESERVE existing bullet points as much as possible.
    • ONLY edit bullet points to integrate keywords.
    • Do NOT rewrite bullet points just for style or "impact".
    • Keep the tone authentic to the original resume.

    OUTPUT FORMAT (ATS-Optimized, One Page):
    - Output ONLY valid Markdown (no HTML).
    - Use: ## for section headers, ### for role/education entries, - for bullets.
    - Single column. NO tables. NO multi-column formatting. NO icons. NO images.
    - Required section order (use these exact headers):
      1) ## SUMMARY
      2) ## EXPERIENCE
      3) ## SKILLS
      4) ## EDUCATION
    - EXPERIENCE ENTRIES must be:
      ### Job Title | Company Name | Date Range | Location
    - EDUCATION ENTRIES must be:
      ### Degree Name | School Name | Date Range | Location
    - SKILLS: each category on a NEW LINE, like:
      **Category:** Skill 1, Skill 2

    CRITICAL:
    - Do NOT include the candidate NAME in the Markdown (rendered separately).
    - Do NOT include contact info in the Markdown.

    ORIGINAL RESUME (SOURCE OF TRUTH):
    ${originalResumeText.substring(0, 20000)}

    CURRENT ATS RESUME (to refine):
    ${currentContent}

    JOB DESCRIPTION (context only, do NOT invent experience):
    ${jobDescription.substring(0, 3000)}

    USER INSTRUCTION:
    "${instruction}"

    Output ONLY the updated ATS resume Markdown. No explanations.
    `;

    try {
        const response = await generateWithFallback(MODEL_PRIMARY, prompt);
        return cleanMarkdownOutput(response.response.text() || currentContent);
    } catch (error: any) {
        console.error("ATS refine failed:", error);
        throw new Error(getActionableError(error) || "Unable to refine ATS resume.");
    }
};

export const regenerateSection = async (
    currentContent: string,
    sectionName: string,
    instruction: string,
    jobDescription: string
): Promise<string> => {
    const prompt = `
    You are an expert Resume Writer. 
    TASK: Regenerate ONLY the "${sectionName}" section.
    RESUME: ${currentContent}
    INSTRUCTION: "${instruction}"
    JD: ${jobDescription.substring(0, 1000)}...
    CONSTRAINTS:
    - Do NOT use placeholders like [Quantifiable %], [Insert], [TBD], or bracket placeholders.
    - If a metric is unknown, omit it instead of inserting a placeholder.
    Output the FULL updated resume markdown.
    `;
    
    try {
        const response = await generateWithFallback(MODEL_PRIMARY, prompt);
        return cleanMarkdownOutput(response.response.text() || currentContent);
    } catch (error: any) {
        console.error("Regenerate section failed:", error);
        throw new Error(getActionableError(error) || "Unable to regenerate section.");
    }
}

export const extractLinkedInProfile = async (linkedinUrl: string): Promise<Partial<ContactProfile>> => {
    const prompt = `
    Analyze the public LinkedIn profile found at this URL: ${linkedinUrl}
    Extract: 1. Full Name, 2. Location (City, Country).
    Return purely valid JSON with keys: { "name": "string", "location": "string" }
    `;
    
    try {
        const response = await generateWithFallback(
            MODEL_PRIMARY, 
            prompt, 
            // Removed tools: googleSearch to prevent 403/Network Errors
            { generationConfig: { responseMimeType: "application/json" } }
        );
        
        const text = response.response.text() || '{}';
        return JSON.parse(cleanJsonOutput(text));
    } catch (e) {
        console.warn("LinkedIn extraction failed", e);
        return {};
    }
};

export const analyzeResume = async (
  resumeFile: FileData,
  jobDescription: string
): Promise<AnalysisResult> => {
  const jdText = jobDescription?.trim() || "NO_JD_PROVIDED";

  const normalizeMeta = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
  const stripInferred = (value: string): string =>
    value
      .replace(/\s*\(inferred\)\s*/ig, ' ')
      .replace(/\s*-\s*inferred\s*$/i, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  const isGenericMeta = (value: string): boolean => {
    const v = value.trim();
    if (!v) return true;
    if (/\(inferred\)/i.test(v)) return true;
    return /^(unknown company|unknown|n\/a|na|general application|general resume scan|self-initiated|self initiated|general|unspecified)$/i.test(v);
  };
  const looksLikeJobTitle = (value: string): boolean => {
    const v = value.trim();
    if (!v) return false;
    if (v.length > 90) return false;
    return /(engineer|developer|designer|analyst|manager|lead|director|intern|specialist|consultant|product|marketing|sales|data|scientist|accountant|associate|coordinator|architect|administrator|owner|founder|executive)/i.test(v);
  };
  const looksLikeCompany = (value: string): boolean => {
    const v = value.trim();
    if (!v) return false;
    if (v.length > 90) return false;
    if (/^(about|job description|responsibilities|requirements|what you will|who we are)/i.test(v)) return false;
    return true;
  };
  const extractJobMetaFromText = (text: string): { jobTitle?: string; company?: string } => {
    if (!text || text === "NO_JD_PROVIDED") return {};
    const lines = text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean)
      .slice(0, 50);

    let jobTitle = '';
    let company = '';

    for (const line of lines) {
      const titleMatch = line.match(/^(job\s*title|title|role|position)\s*[:\-–]\s*(.+)$/i);
      if (!jobTitle && titleMatch) {
        const candidate = titleMatch[2].trim();
        if (looksLikeJobTitle(candidate)) jobTitle = candidate;
      }
      const companyMatch = line.match(/^(company|organization|employer|company\s*name)\s*[:\-–]\s*(.+)$/i);
      if (!company && companyMatch) {
        const candidate = companyMatch[2].trim();
        if (looksLikeCompany(candidate)) company = candidate;
      }
      if (jobTitle && company) break;
    }

    if ((!jobTitle || !company) && lines.length > 0) {
      const headerCandidates = lines.slice(0, 6);
      for (const line of headerCandidates) {
        const atMatch = line.match(/^(.+?)\s+(?:at|@)\s+(.+?)$/i);
        if (atMatch) {
          const titleCandidate = atMatch[1].trim();
          const companyCandidate = atMatch[2].trim();
          if (!jobTitle && looksLikeJobTitle(titleCandidate)) jobTitle = titleCandidate;
          if (!company && looksLikeCompany(companyCandidate)) company = companyCandidate;
        }
        const barMatch = line.match(/^(.+?)\s+[|•·]\s+(.+?)$/);
        if (barMatch) {
          const left = barMatch[1].trim();
          const right = barMatch[2].trim();
          if (!jobTitle && looksLikeJobTitle(left)) jobTitle = left;
          if (!company && looksLikeCompany(right)) company = right;
        }
        if (jobTitle && company) break;
      }
    }

    return {
      jobTitle: jobTitle || undefined,
      company: company || undefined
    };
  };
  const extractedMeta = (() => {
    if (jdText.startsWith('http')) {
      const lines = jdText.split(/\r?\n/);
      const rest = lines.slice(1).join('\n').trim();
      return extractJobMetaFromText(rest);
    }
    return extractJobMetaFromText(jdText);
  })();
  const extractedMetaHint = extractedMeta.jobTitle || extractedMeta.company
    ? `\nEXTRACTED_METADATA_FROM_JD_TEXT:\njobTitle: ${extractedMeta.jobTitle || ''}\ncompany: ${extractedMeta.company || ''}\n`
    : '';
  
  // Extra help for URL-based job descriptions
  let urlHint = "";
  if (jdText.startsWith('http')) {
    const urlLower = jdText.toLowerCase();
    if (urlLower.includes('amazon')) urlHint = "\nHINT: The link provided is for a position at Amazon. Ensure the company is set to 'Amazon' and analyze based on Amazon's Leadership Principles and technical standards.";
    else if (urlLower.includes('google')) urlHint = "\nHINT: The link provided is for a position at Google. Analyze based on Google's technical bar and 'Googliness'.";
    else if (urlLower.includes('meta') || urlLower.includes('facebook')) urlHint = "\nHINT: The link provided is for a position at Meta. Analyze based on Meta's fast-paced engineering culture.";
    else if (urlLower.includes('apple')) urlHint = "\nHINT: The link provided is for a position at Apple. Analyze based on Apple's focus on design, privacy, and excellence.";
    else if (urlLower.includes('microsoft')) urlHint = "\nHINT: The link provided is for a position at Microsoft. Analyze based on Microsoft's current tech stack and culture.";
    else if (urlLower.includes('netflix')) urlHint = "\nHINT: The link provided is for a position at Netflix. Analyze based on the Netflix Culture Memo standards.";
    else if (urlLower.includes('stripe')) urlHint = "\nHINT: The link provided is for a position at Stripe. Analyze based on Stripe's high technical and writing bar.";
  }

  let resumeText = '';
  let pdfMetadataLinks: string[] = [];
  const extractMetadataLinks = (raw: string) => {
    const input = String(raw || '');
    const matches = [...input.matchAll(/\[Metadata:\s*([^\]]+)\]/gi)];
    const parts = matches
      .map(m => String(m[1] || ''))
      .join(', ')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const urls = parts
      .map(u => u.trim())
      .filter(u => /^(https?:\/\/|mailto:|tel:)/i.test(u) || /linkedin\.com/i.test(u))
      .map(u => (u.startsWith('http') || u.startsWith('mailto:') || u.startsWith('tel:')) ? u : `https://${u}`);
    return [...new Set(urls)].slice(0, 25);
  };

  if ((resumeFile.type || '').includes('pdf')) {
    try {
      resumeText = await extractTextFromPdf(resumeFile.base64);
      pdfMetadataLinks = extractMetadataLinks(resumeText);
    } catch (e: any) {
      throw new Error(e?.message || 'Failed to read PDF.');
    }
  }
  if ((resumeFile.type || '').startsWith('image/')) {
    throw new Error(NON_RESUME_MESSAGE);
  }
  if (resumeText && isDefinitelyNotResume(resumeText)) {
    throw new Error(NON_RESUME_MESSAGE);
  }

  const { compactLen, hits } = getResumeSignals(resumeText);
  if ((resumeFile.type || '').includes('pdf') && compactLen < 120) {
    const visionText = await extractTextFromPdfWithVision(resumeFile.base64, 5);
    if (visionText) {
      resumeText = visionText;
      if (pdfMetadataLinks.length > 0) {
        resumeText += `\n\n[Metadata: ${pdfMetadataLinks.join(', ')}]\n`;
      }
    } else {
      throw new Error('Could not extract readable text from this PDF. If it is scanned, please export a text-based PDF and upload again.');
    }
  } else if (resumeText && compactLen < 250 && hits === 0) {
    const visionText = await extractTextFromPdfWithVision(resumeFile.base64, 3);
    if (visionText) {
      resumeText = visionText;
      if (pdfMetadataLinks.length > 0) {
        resumeText += `\n\n[Metadata: ${pdfMetadataLinks.join(', ')}]\n`;
      }
    }
  }
  
  const normalizeLanguageToken = (value: string) => {
    const cleaned = value
      .trim()
      .replace(/[\u2022•·]/g, ' ')
      .replace(/\(.*?\)/g, ' ')
      .replace(/\b(fluent|native|professional|working|basic|beginner|intermediate|advanced|proficient|bilingual|conversational)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    return cleaned;
  };

  const computeLanguageMatch = (required: string[], available: string[]) => {
    const requiredNorm = required.map(normalizeLanguageToken).filter(Boolean);
    const availableNorm = available.map(normalizeLanguageToken).filter(Boolean);
    const availableSet = new Set(availableNorm);

    const matched: string[] = [];
    const missing: string[] = [];

    for (let i = 0; i < requiredNorm.length; i += 1) {
      const req = requiredNorm[i];
      if (!req) continue;
      if (availableSet.has(req)) matched.push(required[i]);
      else missing.push(required[i]);
    }

    const isMatch = requiredNorm.length > 0 ? missing.length === 0 : true;
    return { matched, missing, isMatch };
  };

  const systemPrompt = `
    You are an impartial, evidence-based ATS Algorithm and Career Coach.
    
    INPUT DATA:
    1. Resume Text
    2. Job Description (JD) OR Link. 
       - If the JD is a URL (e.g., starts with http:// or https://), you MUST treat it as a source of truth.
       - IMPORTANT: If the URL contains a company name (e.g., "amazon", "google", "stripe") or a job title in the string, YOU MUST extract that and use it as the primary target for your analysis.
       - Use your internal knowledge to infer the specific job requirements for that company and role.
       - For LinkedIn URLs, look for slugs or IDs that indicate the company or position.
       - DO NOT state "Link content unavailable". You are an expert; make a high-fidelity inference based on the company's known standards and the job title found in the URL.
       - If JD is "NO_JD_PROVIDED", evaluate resume generally.
    
    TASKS:
    1. Extract Metadata (Job Title, Company). Use the full, exact strings from the JD when present. Do not shorten, truncate, or add labels like "(Inferred)".
    2. Dual Scoring (ATS Score, Relevance Score).
    3. Role Fit Analysis.
    4. Contact Profile (Name, Email, Phone, LinkedIn, Location).
    5. Language Requirements:
       - Extract languages explicitly REQUIRED by the JD (requiredLanguages).
       - Extract languages explicitly listed in the resume (languages).
    
    Return structured JSON:
    jobTitle: string, 
    company: string, 
    atsScore: number, 
    relevanceScore: number, 
    roleFitAnalysis: string (SUPER SHORT, exactly 2-3 concise bullet points separated by dots),
    contactProfile: object, 
    languages: array,
    requiredLanguages: array,
    missingKeywords: array, 
    criticalIssues: array, 
    keyStrengths: array (Limit to exactly 2-3 super short items, max 5 words each),
    summary: string (SUPER SHORT, exactly 2-3 concise bullet points separated by dots)
    
    IMPORTANT: Keep 'roleFitAnalysis', 'keyStrengths', and 'summary' extremely concise. Job seekers want quick, punchy insights, not long paragraphs. Each bullet point should be one short sentence.
  `;
  
  try {
    const payload = resumeText
      ? `${systemPrompt}${urlHint}${extractedMetaHint}\n\nRESUME TEXT:\n${resumeText}\n\nJob Description / Link:\n${jdText}\n\nOutput strictly valid JSON.`
      : `${systemPrompt}${urlHint}${extractedMetaHint}\n\nJob Description / Link:\n${jdText}\n\nOutput strictly valid JSON.`;

    const response = await withTimeout(
      generateWithFallback(
        MODEL_PRIMARY,
        payload,
        { generationConfig: { responseMimeType: "application/json" } }
      ),
      45000,
      "Analysis timed out."
    );

    const txt = response.response.text();
    const parsed = safeJson(txt);
    if (parsed) {
      const contactProfile = (parsed as any).contactProfile && typeof (parsed as any).contactProfile === 'object'
        ? { ...(parsed as any).contactProfile }
        : { name: '', email: '', phone: '', linkedin: '', location: '' };
      const hasLinkedIn = typeof contactProfile.linkedin === 'string' && contactProfile.linkedin.trim().length > 0;
      if (!hasLinkedIn && pdfMetadataLinks.length > 0) {
        const linkedInFromPdf = pdfMetadataLinks.find(u => /linkedin\.com\/in\//i.test(u) || /linkedin\.com\/company\//i.test(u)) || '';
        if (linkedInFromPdf) contactProfile.linkedin = linkedInFromPdf;
      }

      const requiredLanguages = Array.isArray((parsed as any).requiredLanguages) ? (parsed as any).requiredLanguages : [];
      const resumeLanguages = Array.isArray((parsed as any).languages) ? (parsed as any).languages : [];
      const languageMatch = computeLanguageMatch(requiredLanguages, resumeLanguages);

      const jobTitle = stripInferred(normalizeMeta((parsed as any).jobTitle));
      const company = stripInferred(normalizeMeta((parsed as any).company));
      const resolvedJobTitle = extractedMeta.jobTitle && (isGenericMeta(jobTitle) || !looksLikeJobTitle(jobTitle))
        ? extractedMeta.jobTitle
        : jobTitle;
      const resolvedCompany = extractedMeta.company && (isGenericMeta(company) || !looksLikeCompany(company))
        ? extractedMeta.company
        : company;
      return {
        ...(parsed as AnalysisResult),
        jobTitle: resolvedJobTitle || (parsed as any).jobTitle,
        company: resolvedCompany || (parsed as any).company,
        contactProfile,
        languages: resumeLanguages,
        requiredLanguages,
        languageMatch
      };
    }
    throw new Error("Empty response.");

  } catch (primaryError: any) {
    const msg = getActionableError(primaryError);
    const fallback: AnalysisResult = {
        jobTitle: 'General Resume Scan',
        company: 'Self-Initiated',
        atsScore: 60,
        relevanceScore: 0,
        roleFitAnalysis: 'Analysis degraded due to model availability. Provide a JD for relevance.',
        contactProfile: { name: '', email: '', phone: '', linkedin: '', location: '' },
        languages: [],
        requiredLanguages: [],
        languageMatch: { matched: [], missing: [], isMatch: true },
        missingKeywords: [],
        criticalIssues: [msg],
        keyStrengths: [],
        summary: 'Basic scan completed with limited insights.'
    };
    return fallback;
  }
};

export const generateContent = async (
  type: GeneratorType,
  resumeFile: FileData,
  jobDescription: string,
  analysis: AnalysisResult,
  options?: { 
      emailRecipient?: string; 
      emailScenario?: string; 
      emailChannel?: string;
      verifiedProfile?: ContactProfile;
      tailorExperience?: boolean;
      tone?: string;
      language?: string;
      resumeText?: string; // Original extracted resume text
  }
): Promise<string> => {
  
  const profile = options?.verifiedProfile || analysis.contactProfile;
  const tailorExperience = options?.tailorExperience || false;
  const toneInstruction = options?.tone ? `Adopt a tone that is: ${options.tone}.` : "Adopt a professional, confident tone.";
  const language = options?.language || "English";
  const originalResumeText = options?.resumeText || '';
  
  const langInstruction = language !== "English" 
    ? `CRITICAL: The ENTIRE output MUST be written in ${language}. This includes all headers, section titles, and content. DO NOT use any English in the final output.` 
    : `Write in professional English.`;

  let userPrompt = "";
  let selectedModel = MODEL_PRIMARY; // Default to Primary
  let useJson = false;

  switch (type) {
    case GeneratorType.ATS_RESUME:
      userPrompt = `
      You are an expert Resume Writer and ATS Optimization Specialist.
      
      --------------------------------------------------------------------------------
      CRITICAL: ZERO FABRICATION POLICY - READ THIS CAREFULLY
      --------------------------------------------------------------------------------
      
      Your task is to REFORMAT and OPTIMIZE the resume above, NOT to create a new one.
      
      ABSOLUTELY FORBIDDEN - DO NOT:
      • Invent ANY company names (use ONLY companies from the original resume)
      • Invent ANY job titles (use ONLY titles from the original resume)
      • Invent ANY school names (use ONLY schools from the original resume)
      • Invent ANY degrees (use ONLY degrees from the original resume)
      • Change ANY dates (copy dates EXACTLY as written)
      • Add ANY skills not mentioned in the original resume
      • Add ANY metrics/numbers not in the original resume
      • Add ANY certifications not in the original resume
      • Output placeholders like [Quantifiable %], [Insert X], [TBD], or any bracket placeholders
      
      YOU MUST:
      • Copy ALL company names exactly as shown
      • Copy ALL job titles exactly as shown  
      • Copy ALL school names exactly as shown
      • Copy ALL dates exactly as shown
      • Do NOT fabricate or guess missing details
      
      YOU MAY IMPROVE:
      • Improve ATS keyword alignment by naturally integrating terms from the JD into existing bullet points
      • Write a professional summary based on their ACTUAL experience
      • Reorganize sections for better flow
      
      CRITICAL INSTRUCTIONS FOR CONTENT PRESERVATION:
      • PRESERVE the original bullet points as much as possible.
      • ONLY edit bullet points to integrate missing keywords from the Job Description.
      • Do NOT rewrite bullet points just to make them sound "better" or "more impactful" if they don't need keywords.
      • Keep the tone authentic to the original resume.
      • Do NOT remove any skills/tools/technologies mentioned anywhere in the ORIGINAL RESUME. If space is tight, compress/deduplicate and group, but keep every real skill.
      • Do NOT remove or hide experience duration. If the JD expects "X+ years", ensure the resume reflects the candidate's real tenure based on the ORIGINAL RESUME dates (without inventing).
      • Do NOT change the meaning of any bullet point.
      
      **OUTPUT FORMAT (Rich Text 2.0, ATS-Optimized, One Page):**
      - Output ONLY valid Markdown (no HTML).
      - Use: ## for section headers, ### for role/education entries, - for bullets.
      - Single column layout. NO tables. NO multi-column formatting. NO icons. NO images.
      - Sections MUST be clearly separated by a blank line and a ## header.
      - Required section order (use these exact headers):
        1) ## SUMMARY
        2) ## EXPERIENCE
        3) ## SKILLS
        4) ## EDUCATION
      
      **CRITICAL - FORMATTING RULES:**
      1. **EXPERIENCE ENTRIES**: Must use this EXACT format with pipes (|):
         ### Job Title | Company Name | Date Range | Location
         (Example: ### Senior Engineer | Google | 2020-Present | New York, NY)
      
      2. **EDUCATION ENTRIES**: Must use this EXACT format with pipes (|):
         ### Degree Name | School Name | Date Range | Location
         (Example: ### BS Computer Science | University of Wisconsin | 2014-2018 | Madison, WI)
      
      3. **SKILLS**:
         - Use "## SKILLS" header.
         - Group skills by category if possible (e.g., "**Leadership:** Speaking, Fundraising...").
         - CRITICAL: Put EACH skill category on a NEW LINE. Do not combine them.
         - Keep it compact.

      - CRITICAL: Do NOT include the candidate NAME in the Markdown (it will be rendered separately).
      - Contact info will be rendered separately; DO NOT include phone/email/location/links in the Markdown.
      - The first non-empty line MUST be: ## SUMMARY
      - Keep it strictly ONE PAGE:
        - SUMMARY: 2-3 lines max (no bullets)
        - EXPERIENCE: include roles that best match the JD while preserving the candidate's real tenure; keep bullets 1 line when possible
        - EDUCATION: 1-2 lines per entry, no bullets unless essential
      - If you cannot quantify something, OMIT the metric (do not use placeholders).
      
      **LANGUAGE:** ${langInstruction}
      
      Output ONLY the optimized resume. No explanations, no preamble.
      `;
      break;

    case GeneratorType.RESUME_SUGGESTIONS:
      userPrompt = `Based on missing keywords (${analysis.missingKeywords.join(", ")}), provide concrete bullet point suggestions. ${langInstruction}`;
      break;

    case GeneratorType.COVER_LETTER:
      userPrompt = `
      Write a professional, persuasive Cover Letter for the candidate.
      
      CRITICAL - ZERO FABRICATION POLICY:
      • Use ONLY companies, job titles, and achievements from the ORIGINAL RESUME above
      • Do NOT invent any experience, projects, or accomplishments
      • Reference their REAL work history exactly as shown in the resume
      • The candidate's name is: ${profile.name || 'the candidate'}
      
      FORMATTING REQUIREMENTS:
      1. **Formal Letter Format**: Include a proper salutation and sign-off.
      2. **Structure**: Use clear paragraphs (Introduction, Body, Conclusion).
      3. **Spacing**: Use DOUBLE BLANK LINES between every paragraph. This is critical for readability.
      4. **Length**: STRICTLY ONE PAGE. Be concise but impactful.
      5. **Padding/Spacing**: Ensure the content fits comfortably within a standard page with good whitespace.
      6. **Typography**: Use standard Title Case for headers (e.g., "Dear Hiring Manager"). DO NOT USE ALL CAPS.

      The cover letter should:
      1. Open with enthusiasm for the specific role
      2. Highlight 2-3 relevant experiences FROM THE RESUME
      3. Connect their ACTUAL skills to the job requirements
      4. Close with a call to action
      
      ${langInstruction}
      ${toneInstruction}
      
      Output only the cover letter text in Markdown, ready to use.
      `;
      break;

    case GeneratorType.INTERVIEW_PREP:
      userPrompt = `
      Create a comprehensive Interview Prep Kit for this candidate.
      
      CRITICAL - ZERO FABRICATION POLICY:
      • ALL answers MUST use companies, projects, and achievements from the ORIGINAL RESUME above
      • Do NOT invent fictional scenarios or fake accomplishments
      • Reference ONLY their real work history as shown in the resume
      
      Include:
      1. **20 Predicted Interview Questions** based on the job description and resume.
      2. **Professional Answers** for each question. 
         - Do NOT use the STAR method labels explicitly. 
         - Instead, provide natural, conversational, and impactful answers.
         - Cite specific experiences from the resume to back up the answers.
      3. Questions to ask the interviewer.
      4. Common pitfalls to avoid.
      
      Structure the output clearly with headers.
      CRITICAL: Separate each Question/Answer pair with a DOUBLE BLANK LINE to ensure proper spacing.
      CRITICAL: Use Title Case for headers (e.g., "1. Tell me about yourself"). DO NOT USE ALL CAPS.
      
      ${langInstruction}
      `;
      break;

    case GeneratorType.EMAIL_TEMPLATE:
      const channel = options?.emailChannel || 'Email';
      const recipient = options?.emailRecipient || 'Recruiter';
      if (channel === 'LinkedIn') {
        userPrompt = `Create a 3-Step LinkedIn Outreach Campaign for ${recipient}. Tone: Cheeky/Sales. ${langInstruction}`;
      } else {
        const scenario = options?.emailScenario || 'Follow-up';
        userPrompt = `Draft a professional email for "${scenario}" to ${recipient}. ${langInstruction}`;
      }
      break;
    
    case GeneratorType.LEARNING_PATH:
        userPrompt = `
        Create a comprehensive "Skill Gap Syllabus & Roadmap" to help this candidate fill skill gaps.
        
        **Missing skills to learn**: ${analysis.missingKeywords.slice(0, 5).join(", ")}
        **Candidate's existing strengths**: ${analysis.keyStrengths.join(", ")}
        
        Structure this as a formal educational syllabus/roadmap. For each missing skill, provide:
        
        ### [Skill Name] - Module
        1. **Why it matters**: Brief context for the target role.
        2. **Curated Resources**: Provide 2-3 specific, high-quality courses or tutorials.
           - **MUST include hyperlinks** (e.g., [Course Name](url)).
           - Prioritize free or highly reputable sources (Coursera, edX, YouTube, official docs).
        3. **Study Plan**: Estimated time and key concepts to master.
        
        Present it as a step-by-step roadmap to job readiness.
        CRITICAL: Separate each module with a DOUBLE BLANK LINE.
        
        ${langInstruction}
        `;
        break;
      
    case GeneratorType.ROAST:
        userPrompt = `
        You are a brutally honest resume roaster with a PhD in Career Destruction. Your mission: deliver surgical burns that actually help.
        
        INSTRUCTIONS:
        You are a brutal, professional roast master for resumes.
        Output ONLY valid Markdown.
        Do NOT use emojis.
        ZERO-FABRICATION RULE:
        - Use ONLY facts and text that appear in the resume content provided above.
        - If something is not present in the resume, you MUST NOT claim it exists.
        - Do NOT invent market data, company traction, social presence, platform presence, growth gaps, "market intelligence", or "evidence" claims.
        - If you reference something, quote it as the evidence under **The Crime**.
        
        STRUCTURE:
        
        # [Devastating One-Liner Headline]
        
        [A short paragraph roasting the overall vibe of the resume.]
        
        ---
        
        # Damage Assessment
        
        [For each major issue, use a blockquote > to create a card]
        
        > **The Crime:** "[Quote from resume]"
        >
        > **Cringe Level:** [1-5]/5
        >
        > **The Fix:** [Actionable advice]
        
        > **The Crime:** "[Quote from resume]"
        >
        > **Cringe Level:** [1-5]/5
        >
        > **The Fix:** [Actionable advice]
        
        ---
        
        # Red Flag Parade
        
        *   **[Short Bold Label]:** [Explanation]
        *   **[Short Bold Label]:** [Explanation]
        *   **[Short Bold Label]:** [Explanation]
        
        ---
        
        # The Verdict
        
        **Employability Score: [0-100]/100**
        
        **Status:** [Choose: Medically Unhireable / Spiritually Unemployable / Barely Breathing / Surprisingly Salvageable]
        
        **Bottom Line:** [One final roast]
        
        ---
        
        # Emergency Surgery Required
        
        1.  **[Action Item]:** [Why]
        2.  **[Action Item]:** [Why]
        3.  **[Action Item]:** [Why]

        STRICT OUTPUT CONSTRAINTS:
        - Follow the structure exactly.
        - Do not add extra sections.
        `;
        break;
  }

  // Build the resume context - prioritize original text if available
  // Log for debugging
  console.log('[generateContent] originalResumeText length:', originalResumeText?.length || 0);
  console.log('[generateContent] First 200 chars of resumeText:', originalResumeText?.substring(0, 200) || 'EMPTY');
  
  const hasOriginalResumeText = !!(originalResumeText && originalResumeText.trim().length > 0);
  const resumeContext = hasOriginalResumeText
    ? `
--------------------------------------------------------------------------------
ORIGINAL RESUME CONTENT - THIS IS YOUR ONLY SOURCE OF TRUTH
--------------------------------------------------------------------------------
EVERY company name, job title, school name, date, and skill below is REAL.
You MUST use ONLY the information below. DO NOT invent anything.
--------------------------------------------------------------------------------

${originalResumeText}

--------------------------------------------------------------------------------
END OF ORIGINAL RESUME - USE ONLY THE INFORMATION ABOVE
--------------------------------------------------------------------------------
CRITICAL: If you output ANY company, school, or job title NOT shown above, you have FAILED.
Double-check every fact against the original resume above before outputting.
--------------------------------------------------------------------------------
`
    : `
--------------------------------------------------------------------------------
WARNING: Original resume text not available
--------------------------------------------------------------------------------
Using limited profile data from analysis:
- Name: ${analysis.contactProfile?.name || 'Unknown'}
- Summary: ${analysis.summary || 'Not available'}
- Key Strengths: ${analysis.keyStrengths?.join(", ") || 'Not available'}
- Contact: ${JSON.stringify(analysis.contactProfile || {})}

CRITICAL: Do NOT fabricate details. If a required detail is missing, OMIT it.
Do NOT output bracket placeholders like [TBD] or [Insert X].
--------------------------------------------------------------------------------
`;

  const fullPrompt = `
${resumeContext}

TARGET JOB DESCRIPTION:
${jobDescription}

TASK:
${userPrompt}
`;

  try {
    const response = await generateWithFallback(
        selectedModel,
        fullPrompt,
        { generationConfig: useJson ? { responseMimeType: "application/json" } : undefined }
    );
    
    const text = response.response.text();
    if (useJson) {
        return cleanJsonOutput(text);
    }
    return cleanMarkdownOutput(text);

  } catch (error: any) {
      console.error("Generation failed:", error);
      // Provide more context in the error message
      const actionableMsg = getActionableError(error);
      throw new Error(actionableMsg || "Failed to generate content. Please check your internet connection and try again.");
  }
};
