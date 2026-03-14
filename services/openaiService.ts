type GenerationConfig = {
  temperature?: number;
  topP?: number;
  topK?: number;
  responseMimeType?: string;
  maxOutputTokens?: number;
};

import { AnalysisResult, FileData, GeneratorType, ContactProfile } from "../types";
import {
  UNIVERSAL_RESUME_PARSER_PROMPT,
  UNIVERSAL_JD_PARSER_PROMPT,
  normalizeResumeProfile,
  normalizeJobProfile,
  buildResumeFallbackProfile,
  buildJobFallbackProfile
} from './engine/universalParsers';
import { computeDeterministicScoreBundle } from './engine/scoringMath';
import { extractKeywords } from './engine/keywordExtraction';

// --- CONFIGURATION ---
const MODEL_PRIMARY = "gpt-4o-mini";
const MODEL_FALLBACK = "gpt-4o-mini";

// Deterministic generation config for consistent results
// temperature=0 ensures the same input produces the same output
const DETERMINISTIC_CONFIG: GenerationConfig = {
  temperature: 0,
  topP: 1,
  topK: 1,
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

const isRetryableGatewayStatus = (status: number): boolean => {
  return [408, 429, 500, 502, 503, 504].includes(status);
};

const isRetryableGatewayMessage = (message: string): boolean => {
  const msg = String(message || '').toLowerCase();
  return (
    msg.includes('fetch failed') ||
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('etimedout') ||
    msg.includes('socket') ||
    msg.includes('tls')
  );
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateViaServerGateway = async (
  primaryModelName: string,
  prompt: string | Array<any>,
  config: any,
  fallbackModelName: string,
  endpoint: string
): Promise<any> => {
  const maxAttempts = 3;
  let attempt = 0;
  let lastError: any = null;

  while (attempt < maxAttempts) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryModelName,
          fallbackModelName,
          prompt,
          config
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) {
        const reason = payload?.reason || `AI generation failed (${response.status})`;
        if (attempt < maxAttempts - 1 && isRetryableGatewayStatus(response.status)) {
          lastError = new Error(reason);
          await sleep(600 * Math.pow(2, attempt));
          attempt += 1;
          continue;
        }
        throw new Error(reason);
      }

      const text = String(payload?.text || '');
      return { response: { text: () => text } };
    } catch (error: any) {
      lastError = error;
      if (attempt < maxAttempts - 1 && isRetryableGatewayMessage(error?.message || String(error))) {
        await sleep(600 * Math.pow(2, attempt));
        attempt += 1;
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('AI generation failed');
};

/**
 * Executes a model request with automatic fallback if the primary model fails.
 * Uses deterministic config (temperature=0) for consistent results.
 */
const generateWithFallback = async (
  primaryModelName: string,
  prompt: string | Array<any>,
  config: any = {},
  fallbackModelName: string = MODEL_FALLBACK,
  endpoint: string = '/api/ai-generate'
): Promise<any> => {
  const mergedConfig = {
    ...config,
    generationConfig: {
      ...DETERMINISTIC_CONFIG,
      ...config?.generationConfig,
    }
  };
  const resolvedPrimary = primaryModelName || MODEL_PRIMARY;
  const resolvedFallback = fallbackModelName || MODEL_FALLBACK;
  return generateViaServerGateway(resolvedPrimary, prompt, mergedConfig, resolvedFallback, endpoint);
};

const getEndpointForGenerator = (type: GeneratorType): string => {
  switch (type) {
    case GeneratorType.ATS_RESUME:
      return '/api/ai-resume';
    case GeneratorType.COVER_LETTER:
      return '/api/ai-cover-letter';
    case GeneratorType.INTERVIEW_PREP:
      return '/api/ai-interview';
    case GeneratorType.LEARNING_PATH:
      return '/api/ai-gaps';
    case GeneratorType.LANGUAGES:
      return '/api/ai-languages';
    default:
      return '/api/ai-generate';
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
/** Truncate text to limit chars, preserving start and end (avoids cutting off most-recent experience). */
const smartTruncate = (text: string, limit: number): string => {
  if (text.length <= limit) return text;
  const half = Math.floor(limit / 2);
  return text.slice(0, half) + '\n...[content truncated for length]...\n' + text.slice(-half);
};

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
  try { return JSON.parse(text); } catch { }
  try { return JSON.parse(cleanJsonOutput(text)); } catch { }
  return null;
};

// Helper to remove conversational filler
const cleanMarkdownOutput = (text: string): string => {
  const removeQuantifiablePlaceholders = (value: string) => {
    const cleaned = String(value || '')
      .replace(/\[\s*quantifiable\s*%?\s*\]/gi, '')
      .replace(/\[\s*quantifiable[^\]]*\]/gi, '')
      .replace(/\(\s*\)/g, '')
      // Fix "domain. com" → "domain.com" spacing around dots in URLs/company names
      .replace(/(\w)\.\s+(com|in|co|org|net|io|ai)\b/gi, '$1.$2')
      // Collapse multiple SPACES/TABS on the same line (NOT newlines — preserve paragraph breaks)
      .replace(/[ \t]{2,}/g, ' ')
      // Remove trailing spaces before punctuation (spaces only, not newlines)
      .replace(/[ \t]+([,.;:])/g, '$1')
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
  console.error("AI API Error Details:", error);

  if (msg.includes('401') || msg.includes('API key') || msg.includes('INVALID_ARGUMENT')) {
    return "Invalid API Key detected. Please ensure your OPENAI_API_KEY in .env.local is valid and active.";
  }
  if (msg.includes('429')) return "High traffic limit reached. Please try again in a minute.";
  if (msg.includes('503')) return "AI Service is temporarily unavailable. Please try again in a few minutes.";
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
): Promise<{ atsScore: number, recruiterScore: number }> => {
  try {
    const prompt = `
            Act as a senior Technical Recruiter and ATS Expert.
            TASK: Calculate two scores (0-100) for the RESUME against the JOB DESCRIPTION.

            1. ATS_SCORE: Semantic relevance, keyword matching, and parsing friendliness.
            2. RECRUITER_SCORE: Readability, credibility, impact, and "would I interview this person?".

            RESUME CONTENT:
            ${generatedResumeText.substring(0, 8000)}

            JOB DESCRIPTION:
            ${jobDescription.substring(0, 4000)}

            Output strictly valid JSON: { "atsScore": number, "recruiterScore": number }
        `;

    const response = await generateWithFallback(
      MODEL_PRIMARY,
      prompt,
      { generationConfig: { responseMimeType: "application/json" } }
    );

    const raw = String(response.response.text() || '').trim();
    const cleanJson = cleanJsonOutput(raw);
    const parsed = safeJson(cleanJson) || safeJson(raw);
    const result = parsed && typeof parsed === 'object' ? parsed : null;
    if (!result) {
      const atsMatch = raw.match(/"atsScore"\s*:\s*(\d{1,3})/i) || raw.match(/\batsScore\b\s*[:=]\s*(\d{1,3})/i);
      const recruiterMatch = raw.match(/"recruiterScore"\s*:\s*(\d{1,3})/i) || raw.match(/\brecruiterScore\b\s*[:=]\s*(\d{1,3})/i);
      // If both regex fallbacks fail, throw so callers can distinguish "failed" from a legitimate low score
      if (!atsMatch && !recruiterMatch) throw new Error('scoring-unavailable');
      const atsScore = atsMatch ? Math.max(0, Math.min(100, Number(atsMatch[1]))) : 0;
      const recruiterScore = recruiterMatch ? Math.max(0, Math.min(100, Number(recruiterMatch[1]))) : 0;
      return { atsScore, recruiterScore };
    }
    return {
      atsScore: result.atsScore || 0,
      recruiterScore: result.recruiterScore || 0
    };
  } catch (e) {
    console.warn("Re-scoring failed", e);
    throw e; // propagate — callers use .catch(() => null) or outer try/catch
  }
}

export const calculateDeterministicRelevanceScore = async (
  resumeText: string,
  jobDescription: string
): Promise<number> => {
  try {
    const parsedResumeProfile = buildResumeFallbackProfile(resumeText || '');
    const parsedJobProfile = buildJobFallbackProfile(jobDescription || '');
    const bundle = computeDeterministicScoreBundle(
      parsedResumeProfile,
      parsedJobProfile,
      resumeText || '',
      jobDescription || ''
    );
    const score = Number(bundle?.relevanceScore ?? 0);
    if (!Number.isFinite(score)) return 0;
    return Math.max(0, Math.min(100, score));
  } catch {
    return 0;
  }
};

/**
 * Synchronous deterministic dual scorer — same engine used by analyzeResume on rescan.
 * Replaces calculateImprovedScore (AI-based) inside the generation pipeline so
 * pipeline decisions optimize the same score the user will see after rescanning.
 */
export const calculateDeterministicDualScore = (
  resumeText: string,
  jobDescription: string
): { atsScore: number; recruiterScore: number } => {
  try {
    const parsedResumeProfile = buildResumeFallbackProfile(resumeText || '');
    const parsedJobProfile = buildJobFallbackProfile(jobDescription || '');

    // buildJobFallbackProfile only captures tech-stack terms (sql/python/excel/aws…).
    // For domain JDs (retail, category management, finance, etc.) requiredSkills comes
    // back nearly empty, causing scoreCoverage() to default to 0.8 and inflate the score.
    // Supplement with the 500+ skill-DB extraction so the inline score matches rescan.
    const jdDbKeywords = extractKeywords(jobDescription || '').map(k => k.normalized);
    const merged = [...new Set([...parsedJobProfile.requiredSkills, ...jdDbKeywords])];
    parsedJobProfile.requiredSkills = merged.slice(0, 30);

    const bundle = computeDeterministicScoreBundle(
      parsedResumeProfile,
      parsedJobProfile,
      resumeText || '',
      jobDescription || ''
    );
    return {
      atsScore: Math.max(0, Math.min(100, bundle.jobSpecific.ats_score)),
      recruiterScore: Math.max(0, Math.min(100, bundle.jobSpecific.recruiter_score)),
    };
  } catch {
    return { atsScore: 0, recruiterScore: 0 };
  }
};

export const refineContent = async (
  type: GeneratorType,
  currentContent: string,
  instruction: string,
  context: string
): Promise<string> => {
  const prompt = `
    You are HireSchema, a JD-aligned, ATS-safe, recruiter-trust-first career writing engine.
    CONTENT TYPE: ${type}
    CURRENT CONTENT: ${currentContent.substring(0, 10000)}
    USER INSTRUCTION: "${instruction}"
    CONTEXT: ${context.substring(0, 5000)}...
    CONSTRAINTS:
    - Optimize for both ATS (semantic alignment) and recruiter readability.
    - Use JD terminology ONLY when it matches the candidate's evidence and sounds natural.
    - Do NOT mirror or copy JD sentences/phrases verbatim.
    - Avoid keyword stuffing, repetition, and tool-first sentences.
    - Do NOT use placeholders like [Quantifiable %], [Insert], [TBD], or bracket placeholders.
    - If a metric is unknown, omit it instead of inserting a placeholder.
    Task: Rewrite content to satisfy user instruction. Output ONLY the updated document.
    `;

  try {
    const endpoint = getEndpointForGenerator(type);
    const response = await generateWithFallback(MODEL_PRIMARY, prompt, {}, MODEL_FALLBACK, endpoint);
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
    HIRE SCHEMA — ATS RESUME REFINER (V5.0 — TARGETED PATCH MODE)

    CORE IDENTITY (NON-NEGOTIABLE)
    You are HireSchema. You refine an existing ATS resume draft with targeted edits only.
    You optimise for recruiter trust + ATS alignment while preserving truth.
    You NEVER mirror JD sentences.
    You NEVER invent experience.
    You NEVER add a tool/skill that is not in the ORIGINAL resume.
    You NEVER add metrics/numbers unless the ORIGINAL resume already contains them.

    TARGETED PATCH RULE (CRITICAL)
    Apply the smallest possible changes to satisfy the user instruction.
    Preserve unaffected lines verbatim. Do not reformat or rewrite the whole document.

    SMART SELF-CORRECTION (MAX 3 INTERNAL PASSES)
    Before output, silently run:
    1) Fabrication Audit (new facts/skills/metrics) -> remove
    2) JD Mirroring Scan (verbatim phrases) -> paraphrase
    3) Keyword Governance Scan (stuffing/repetition/tool-first) -> fix with minimal edits

    LENGTH INTENT
    Prefer compact, high-signal writing. Use as many pages as needed for real experience depth, up to 3 pages.

    EXPERIENCE-FIRST BULLET FORMULA
    Action → Scope → Impact → Evidence → Tool (optional, never first)

    BUSINESS OUTCOME RULE (APPLY TO EVERY WEAK BULLET)
    If a bullet is task-only ("managed X", "supported Y", "worked on Z"), reconstruct it:
    - Surface the business goal of that task
    - Add observable method or scope
    - Add result or outcome using ONLY evidence in the ORIGINAL resume
    Never use Tier-0 bullets ("responsible for", "assisted with", "helped with") in final output.

    --------------------------------------------------------------------------------
    CRITICAL: ZERO FABRICATION POLICY
    --------------------------------------------------------------------------------
    You MUST preserve ALL factual information from the ORIGINAL RESUME.
    
    ABSOLUTELY FORBIDDEN:
    • Inventing companies, titles, degrees, or dates.
    • Adding specific hard skills (tools/languages) not present in source.
    • Placeholder text like [Insert Metric].

    YOU MUST:
    • Rephrase existing experience to match JD keywords when evidence-backed.
    • Prioritize achievements relevant to the JD without changing facts.
    • Keep edits minimal and focused; do not expand length just to add keywords.
    • Improve specificity using only existing evidence (no new facts, no new metrics).
    
    --------------------------------------------------------------------------------
    CRITICAL OUTPUT RULES (ABSOLUTE — NEVER VIOLATE)
    --------------------------------------------------------------------------------
    1. Return EXACTLY ONE complete resume. Do NOT output the original resume, the current
       draft, or any commentary before or after. Output starts with ## SUMMARY.
    2. EXPERIENCE FORMAT: each role MUST be a SEPARATE entry:
         ### Job Title | Company Name | Date Range | Location
       NEVER merge roles at the same company (e.g. "Title A / Title B | Company" is WRONG).
       NEVER merge different employers into one ### header.
       The TOTAL number of ### entries must stay the same as in the CURRENT DRAFT.
    3. Required section order: ## SUMMARY → ## EXPERIENCE → ## SKILLS → ## EDUCATION
    4. No HTML. No multi-columns. No tables. Standard markdown only.

    ORIGINAL RESUME (SOURCE OF TRUTH — do NOT copy verbatim into output):
    ${smartTruncate(originalResumeText, 5000)}

    CURRENT DRAFT (To Refine — this is what you refine and return):
    ${smartTruncate(currentContent, 7000)}

    JOB DESCRIPTION (Target Language):
    ${jobDescription.substring(0, 3500)}

    USER INSTRUCTION:
    "${instruction}"
    `;

  try {
    const endpoint = getEndpointForGenerator(GeneratorType.ATS_RESUME);
    const response = await generateWithFallback(MODEL_PRIMARY, prompt, {}, MODEL_FALLBACK, endpoint);
    return cleanMarkdownOutput(response.response.text() || currentContent);
  } catch (error: any) {
    console.error("Refine ATS content failed:", error);
    throw new Error(getActionableError(error) || "Unable to refine content.");
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
    RESUME: ${currentContent.substring(0, 10000)}
INSTRUCTION: "${instruction}"
JD: ${jobDescription.substring(0, 1000)}...
CONSTRAINTS:
- Do NOT use placeholders like[Quantifiable %], [Insert], [TBD], or bracket placeholders.
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
Extract: 1. Full Name, 2. Location(City, Country).
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

export const extractKeywordsWithAI = async (text: string): Promise<string[]> => {
  if (!text || text.length < 50) return [];

  const prompt = `
You are an expert resume keyword analyst. Analyze the Job Description below and extract ALL skills, technologies, tools, domain terms, and methodologies that a candidate should have.

EXTRACTION RULES:
1. Hard skills: programming languages, frameworks, platforms, tools, software (Python, React, AWS, Salesforce, Tableau)
2. Domain-specific terms: industry jargon, compliance standards, methodologies (GAAP, HIPAA, Agile, SOC 2, SEO, MEDDIC)
3. Role-specific competencies: functional skills specific to this role (Financial Modeling, A/B Testing, Performance Marketing, ETL Pipelines)
4. Certifications mentioned as requirements (PMP, CFA, AWS Certified)
5. Include BOTH required AND preferred skills
6. Normalize variants to canonical form: "MS Excel" → "Excel", "Reactjs" → "React", "k8s" → "Kubernetes"
7. Include soft skills ONLY if explicitly required and role-critical (e.g., "Executive-level communication" for C-suite roles)

DO NOT include: generic fluff ("teamwork", "enthusiasm", "fast-paced"), obvious basics ("Microsoft Office" unless specifically required), company culture values

JOB DESCRIPTION:
${text.substring(0, 6000)}

Output strictly valid JSON — no markdown, no commentary:
{ "keywords": ["Keyword1", "Keyword2", ...] }

Return up to 60 most important keywords, ordered by importance (most critical first).
  `;

  try {
    const response = await generateWithFallback(
      MODEL_PRIMARY,
      prompt,
      { generationConfig: { responseMimeType: "application/json" } }
    );
    const cleanJson = cleanJsonOutput(response.response.text() || '');
    const result = JSON.parse(cleanJson);
    if (!Array.isArray(result?.keywords)) return [];
    // Deduplicate and filter empties
    const seen = new Set<string>();
    return result.keywords
      .map((k: unknown) => (typeof k === 'string' ? k.trim() : ''))
      .filter((k: string) => {
        if (!k || k.length < 2) return false;
        const lower = k.toLowerCase();
        if (seen.has(lower)) return false;
        seen.add(lower);
        return true;
      })
      .slice(0, 60);
  } catch (e) {
    console.warn('AI Keyword extraction failed', e);
    return [];
  }
};

export const analyzeResume = async (
  resumeFile: FileData,
  jobDescription: string
): Promise<AnalysisResult> => {
  const jdText = jobDescription?.trim() || "NO_JD_PROVIDED";

  const normalizeMeta = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
  const isMeaningfulText = (value: unknown): boolean => {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    const lowered = trimmed.toLowerCase();
    return !['not provided', 'n/a', 'na', 'none', 'null', 'undefined', '-', 'unknown'].includes(lowered);
  };
  const inferNameFromResumeText = (text: string): string => {
    const lines = (text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(0, 25);
    const isPhoneLike = (line: string) => /\+?\d[\d\s().-]{7,}\d/.test(line);
    const isEmailLike = (line: string) => /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(line);
    const isLinkLike = (line: string) => /\bhttps?:\/\//i.test(line) || /\blinkedin\.com\b/i.test(line);
    const isNoisy = (line: string) => {
      const lower = line.toLowerCase();
      return (
        lower.includes('resume') ||
        lower.includes('curriculum vitae') ||
        lower.includes('cv') ||
        lower.includes('page ') ||
        lower.startsWith('summary') ||
        lower.startsWith('experience') ||
        lower.startsWith('education') ||
        lower.startsWith('skills')
      );
    };

    for (const line of lines) {
      if (line.length < 4 || line.length > 70) continue;
      if (isEmailLike(line) || isPhoneLike(line) || isLinkLike(line) || isNoisy(line)) continue;
      if (/[0-9]/.test(line)) continue;
      if (!/^[A-Za-zÀ-ÖØ-öø-ÿ'’.\- ]+$/.test(line)) continue;
      const words = line.split(/\s+/).filter(Boolean);
      if (words.length < 2 || words.length > 4) continue;
      const alphaWords = words.filter(w => /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(w));
      if (alphaWords.length < 2) continue;
      return line.replace(/\s{2,}/g, ' ').trim();
    }
    return '';
  };
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
    ? `\nEXTRACTED_METADATA_FROM_JD_TEXT: \njobTitle: ${extractedMeta.jobTitle || ''} \ncompany: ${extractedMeta.company || ''} \n`
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

  const jdForScoring = jdText.startsWith('http')
    ? jdText.split(/\r?\n/).slice(1).join('\n').trim()
    : jdText;

  const parseStructuredJson = async (prompt: string, timeoutMs: number) => {
    const response = await withTimeout(
      generateWithFallback(
        MODEL_PRIMARY,
        prompt,
        { generationConfig: { responseMimeType: "application/json" } }
      ),
      timeoutMs,
      "Structured parsing timed out."
    );
    return safeJson(response.response.text() || '');
  };

  let parsedResumeProfile = buildResumeFallbackProfile(resumeText);
  if (resumeText) {
    try {
      const rawResumeProfile = await parseStructuredJson(
        `${UNIVERSAL_RESUME_PARSER_PROMPT}\n\nRESUME TEXT:\n${resumeText.substring(0, 8000)}\n\nReturn strict JSON only.`,
        30000
      );
      parsedResumeProfile = normalizeResumeProfile(rawResumeProfile, resumeText);
    } catch (err) {
      console.warn('[analyzeResume] Resume parser fallback used:', err);
    }
  }

  let parsedJobProfile = buildJobFallbackProfile(jdForScoring || jdText);
  if (jdForScoring && jdForScoring !== 'NO_JD_PROVIDED') {
    try {
      const rawJobProfile = await parseStructuredJson(
        `${UNIVERSAL_JD_PARSER_PROMPT}\n\nJOB DESCRIPTION TEXT:\n${jdForScoring.substring(0, 5000)}\n\nReturn strict JSON only.`,
        30000
      );
      parsedJobProfile = normalizeJobProfile(rawJobProfile, jdForScoring);
    } catch (err) {
      console.warn('[analyzeResume] JD parser fallback used:', err);
    }
  }

  const scoreBundle = computeDeterministicScoreBundle(
    parsedResumeProfile,
    parsedJobProfile,
    resumeText,
    jdForScoring
  );

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
    ? `${systemPrompt}${urlHint}${extractedMetaHint}\n\nRESUME TEXT:\n${resumeText.substring(0, 15000)}\n\nJob Description / Link:\n${jdText.substring(0, 5000)}\n\nOutput strictly valid JSON.`
    : `${systemPrompt}${urlHint}${extractedMetaHint}\n\nJob Description / Link:\n${jdText.substring(0, 5000)}\n\nOutput strictly valid JSON.`;

  const response = await withTimeout(
      generateWithFallback(
        MODEL_PRIMARY,
        payload,
        { generationConfig: { responseMimeType: "application/json" } }
      ),
      45000,
      "Analysis timed out."
    ).catch(async (error) => {
      // Retry logic for rate limits or transient errors
      if (error.message.includes('429') || error.message.includes('503')) {
         console.log("Rate limit/Service unavailable hit, retrying in 2s...");
         await new Promise(r => setTimeout(r, 2000));
         return generateWithFallback(
            MODEL_PRIMARY,
            payload,
            { generationConfig: { responseMimeType: "application/json" } }
         );
      }
      throw error;
    });

    const txt = response.response.text();
    const parsed = safeJson(txt);
    if (parsed) {
      const dualScoring = scoreBundle.jobSpecific;
      const baselineScoring = scoreBundle.baseline;
      const contactProfile = (parsed as any).contactProfile && typeof (parsed as any).contactProfile === 'object'
        ? { ...(parsed as any).contactProfile }
        : { name: '', email: '', phone: '', linkedin: '', location: '' };
      if (!isMeaningfulText(contactProfile.name)) {
        const inferred = inferNameFromResumeText(resumeText);
        if (inferred) contactProfile.name = inferred;
      }
      // Regex fallbacks: fill in any fields the AI missed
      const hasLinkedIn = typeof contactProfile.linkedin === 'string' && contactProfile.linkedin.trim().length > 0;
      if (!hasLinkedIn) {
        const linkedInFromPdf = pdfMetadataLinks.find(u => /linkedin\.com\/in\//i.test(u) || /linkedin\.com\/company\//i.test(u)) || '';
        if (linkedInFromPdf) {
          contactProfile.linkedin = linkedInFromPdf;
        } else {
          const liMatch = resumeText.match(/(?:linkedin\.com\/in\/|linkedin\.com\/company\/)[\w-]+/i);
          if (liMatch) contactProfile.linkedin = `https://www.${liMatch[0]}`;
        }
      }
      if (!isMeaningfulText(contactProfile.email)) {
        const emailMatch = resumeText.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
        if (emailMatch) contactProfile.email = emailMatch[0];
      }
      if (!isMeaningfulText(contactProfile.phone)) {
        const phoneMatch = resumeText.match(/(?:\+?\d{1,3}[\s\-.]?)?\(?\d{3,5}\)?[\s\-.]?\d{3,5}[\s\-.]?\d{3,5}/);
        if (phoneMatch) contactProfile.phone = phoneMatch[0].trim();
      }
      if (!isMeaningfulText(contactProfile.location)) {
        // Simple heuristic: look for "City, State" or "City, Country" patterns near top of resume
        const locationMatch = resumeText.substring(0, 600).match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),\s*([A-Z]{2}|[A-Z][a-z]+)\b/);
        if (locationMatch) contactProfile.location = locationMatch[0];
      }

      const dedupeList = (values: string[]) => {
        const out: string[] = [];
        const seen = new Set<string>();
        for (const value of values) {
          const s = String(value || '').trim();
          const key = s.toLowerCase();
          if (!key || seen.has(key)) continue;
          seen.add(key);
          out.push(s);
        }
        return out;
      };

      const parsedMissingKeywords = Array.isArray((parsed as any).missingKeywords)
        ? (parsed as any).missingKeywords.map((v: any) => String(v || '').trim()).filter(Boolean)
        : [];
      const missingKeywords = dedupeList([...scoreBundle.missingRequiredSkills, ...parsedMissingKeywords]).slice(0, 30);

      const parsedCriticalIssues = Array.isArray((parsed as any).criticalIssues)
        ? (parsed as any).criticalIssues.map((v: any) => String(v || '').trim()).filter(Boolean)
        : [];
      const criticalIssues = dedupeList([...scoreBundle.criticalIssues, ...parsedCriticalIssues]).slice(0, 12);

      const parsedKeyStrengths = Array.isArray((parsed as any).keyStrengths)
        ? (parsed as any).keyStrengths.map((v: any) => String(v || '').trim()).filter(Boolean)
        : [];
      const keyStrengths = dedupeList(
        parsedKeyStrengths.length > 0 ? parsedKeyStrengths : scoreBundle.keyStrengths
      ).slice(0, 3);

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
        atsScore: dualScoring.ats_score,
        recruiterScore: dualScoring.recruiter_score,
        relevanceScore: scoreBundle.relevanceScore,
        atsScoreBreakdown: scoreBundle.atsBreakdown,
        contactProfile,
        dualScoring,
        scoreComparison: {
          baseline: {
            ats: baselineScoring.ats_score,
            recruiter: baselineScoring.recruiter_score
          },
          jobTarget: {
            ats: dualScoring.ats_score,
            recruiter: dualScoring.recruiter_score
          },
          delta: {
            ats: dualScoring.ats_score - baselineScoring.ats_score,
            recruiter: dualScoring.recruiter_score - baselineScoring.recruiter_score
          }
        },
        missingKeywords,
        matchedKeywords: scoreBundle.matchedKeywords,
        criticalIssues,
        keyStrengths,
        languages: resumeLanguages,
        requiredLanguages,
        languageMatch
      };
    }
    throw new Error("Empty response.");

  } catch (primaryError: any) {
    const msg = getActionableError(primaryError);
    const dualScoring = scoreBundle.jobSpecific;
    const baselineScoring = scoreBundle.baseline;
    const fallback: AnalysisResult = {
      jobTitle: 'General Resume Scan',
      company: 'Self-Initiated',
      atsScore: dualScoring.ats_score,
      recruiterScore: dualScoring.recruiter_score,
      dualScoring,
      scoreComparison: {
        baseline: {
          ats: baselineScoring.ats_score,
          recruiter: baselineScoring.recruiter_score
        },
        jobTarget: {
          ats: dualScoring.ats_score,
          recruiter: dualScoring.recruiter_score
        },
        delta: {
          ats: dualScoring.ats_score - baselineScoring.ats_score,
          recruiter: dualScoring.recruiter_score - baselineScoring.recruiter_score
        }
      },
      atsScoreBreakdown: scoreBundle.atsBreakdown,
      relevanceScore: scoreBundle.relevanceScore,
      roleFitAnalysis: 'Analysis degraded due to model availability. Provide a JD for relevance.',
      contactProfile: { name: '', email: '', phone: '', linkedin: '', location: '' },
      languages: [],
      requiredLanguages: [],
      languageMatch: { matched: [], missing: [], isMatch: true },
      missingKeywords: scoreBundle.missingRequiredSkills,
      matchedKeywords: scoreBundle.matchedKeywords,
      criticalIssues: [...scoreBundle.criticalIssues, msg],
      keyStrengths: scoreBundle.keyStrengths,
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
    impliedJdSkills?: string[]; // JD skills implied by resume context (e.g. Analytics → Excel)
  }
): Promise<string> => {

  const profile = options?.verifiedProfile || analysis.contactProfile;
  const tailorExperience = options?.tailorExperience || false;
  const toneInstruction = options?.tone ? `Adopt a tone that is: ${options.tone}.` : "Adopt a professional, confident tone.";
  const language = options?.language || "English";
  const originalResumeText = options?.resumeText || '';
  const impliedJdSkills = options?.impliedJdSkills || [];

  const langInstruction = language !== "English"
    ? `CRITICAL: The ENTIRE output MUST be written in ${language}. This includes all headers, section titles, and content. DO NOT use any English in the final output.`
    : `Write in professional English.`;

  let userPrompt = "";
  let selectedModel = MODEL_PRIMARY; // Default to Primary
  let useJson = false;
  let generationConfigOverride: GenerationConfig | undefined = undefined;

  switch (type) {
    case GeneratorType.ATS_RESUME:
      const missingKeywordsList = (analysis.missingKeywords || []).join(', ');
      const keywordInjection = missingKeywordsList
        ? `\nJD KEYWORDS TO INCLUDE (include each ONE if supported by evidence in the ORIGINAL resume; skip if truly absent): ${missingKeywordsList}`
        : '';
      const impliedSkillsInjection = impliedJdSkills.length > 0
        ? `\nCONTEXTUALLY IMPLIED SKILLS — ADD TO ## SKILLS SECTION ONLY (do NOT fabricate bullets):\nThe JD requires these skills. The candidate's roles and existing skills strongly imply proficiency with them (e.g. a Category Analyst doing Market Research almost certainly uses Excel). List them under the appropriate Skills category:\n${impliedJdSkills.join(', ')}`
        : '';

      userPrompt = `
      HIRE SCHEMA — OPTIMISED RESUME ENGINE (V5.0 — NARRATIVE + ATS + TRUST)

      CORE IDENTITY (NON-NEGOTIABLE)
      You are HireSchema, a resume optimisation engine that writes like a top-tier human resume writer.
      You optimise for: recruiter trust + ATS semantic alignment + truthful specificity.
      You NEVER optimise for keyword count.
      You NEVER mirror job description sentences.
      You NEVER invent experience.
      You NEVER use bracket placeholders.

      ZERO HALLUCINATION CONTRACT (ABSOLUTE)
      The ORIGINAL resume is the only source of truth for:
      - companies, employers, clients, job titles, dates, locations
      - degrees, schools, certifications
      - skills/tools/technologies
      - metrics/numbers and scale
      If it is not in the ORIGINAL resume, you may NOT add it.
      If a metric is unknown, omit it or use a qualitative outcome (no invented numbers).

      ATS-OPTIMIZED RESUME GUIDELINES (STRUCTURE + HUMAN IMPACT)
      Structure and formatting:
      - Single column. No tables, text boxes, headers/footers, or columns.
      - No images, logos, or graphics.
      - Standard headers only: Summary, Experience, Skills, Education.
      - Dates in "Jan 2022 – Mar 2024" format.
      - Bullets use simple round bullets (•) only.
      - Target length: keep concise but complete; allow 1–3 pages based on real experience depth.

      Section requirements:
      - Summary (2–3 lines): role identity + domain + top 2–3 strengths + one evidence-backed achievement.
      - Skills: grouped lists (Technical | Tools | Soft Skills). No bars, no ratings.
      - Experience: CAR/STAR bullet structure (Challenge/Context → Action → Result). Lead with action verbs.
      - Education: degree, field, school, year (GPA only if above average).

      Example bullet quality:
      Weak: "Responsible for managing the team and working on backend APIs."
      Strong: "Led a team of 6 backend engineers to redesign microservices, cutting API latency 52% and saving $18K/year."

      Human recruiter impression rules:
      - Top third must signal role fit quickly.
      - At least 60% of bullets should show measurable or observable impact.
      - Show progression (growth in scope/title) when true.
      - Remove fluff; show outcomes instead of adjectives.

      KEYWORD CONTEXTUALISATION (NOT JUST PLACEMENT)
      JD terms must be integrated as credible narrative:
      - each used keyword must be anchored to an evidence line/phrase in the ORIGINAL resume
      - integrate keywords into responsibility + context + outcome, not as standalone skill lists
      - prefer verbs and domain nouns over tool lists
      - never cluster terms; never repeat for ATS baiting
      ${keywordInjection}
      ${impliedSkillsInjection}

      BULLET REWRITE LOGIC (MAKE IT IMPRESSIVE WITHOUT FABRICATION)
      Rewrite weak bullets into strong ones by:
      - adding missing "why" (business goal), "how" (method), and "so what" (impact) using ONLY existing evidence
      - replacing vague words (helped, worked on, responsible for, assisted, supported, coordinated) with specific actions and scope
      - expressing outcomes as either:
        - Metric-backed (ONLY if metric exists in the original)
        - Observable impact (conversion, catalog quality, vendor count, team size, category scope, revenue protection, stakeholder outcomes) without inventing numbers
      - keeping each bullet interview-defensible

      BUSINESS OUTCOME EXTRACTION (CRITICAL — APPLY TO EVERY BULLET)
      When a bullet is task-only ("managed inventory", "led team", "worked with vendors"), reconstruct it by:
      1. Surfacing the BUSINESS GOAL of that task (what outcome was being driven?)
      2. Adding the METHOD used (how — process, initiative, framework, tool)
      3. Adding the RESULT or IMPACT (what changed, improved, or was protected?)
      Use ONLY signals present in the ORIGINAL resume context. NEVER invent.
      Good reconstruction examples:
        - "Assisted vendor negotiations" → "Negotiated terms with vendors across [category], focusing on margin protection and lead-time reduction"
        - "Managed product categories" → "Owned category P&L and assortment for [domain], driving product mix decisions aligned with seasonal demand"
        - "Analyzed market trends" → "Applied consumer insights and market trend analysis to optimize product assortment and improve sell-through"

      SCALE SIGNALS — SURFACE THESE IF PRESENT IN ORIGINAL:
      Always check the ORIGINAL resume for these signals and include them if found:
      - Number of SKUs / products managed
      - Number of vendors / brands managed
      - Team size / number of reports
      - Geographic scope (cities, regions, countries)
      - Category size or revenue (even approximate if stated)
      - Number of seasons / campaigns / projects managed
      - Cross-functional team scope (number of teams, departments)
      If any of these appear in the ORIGINAL, weave them into the relevant bullets.

      FINANCIAL LANGUAGE — SURFACE IF EVIDENCED:
      If the ORIGINAL resume implies financial ownership (budget, revenue, margins, cost, P&L), frame it explicitly:
      - "Managed category" → if buying/planning role: "Managed category buying budget and OTB (open-to-buy) plan"
      - "Drove growth" → if with any business context: "Drove category growth through assortment strategy and promotional execution"
      - NEVER add specific $ or ₹ amounts unless present in the ORIGINAL.

      BULLET QUALITY TIERS (INTERNAL)
      Tier 0: vague task list ("worked on", "helped with")
      Tier 1: action + scope (still weak)
      Tier 2: action + scope + impact
      Tier 3: action + scope + impact + evidence (best; tool optional)
      Target: most bullets Tier 2–3. No tool-first bullets. Zero Tier-0 bullets allowed.

      SUMMARY (TRULY UNIQUE, HUMAN, NO TEMPLATE)
      - 2–3 lines maximum, no bullets
      - no pronouns ("I", "my", "we")
      - FORBIDDEN openers: "Results-driven", "Dynamic", "Highly motivated", "Hardworking", "Passionate", "Experienced professional"
      - REQUIRED elements: role identity + years of experience (if evident) + domain/industry signal + top differentiator + 1 evidence-backed outcome or scale signal
      - Must signal data-driven or analytical mindset if the JD requires it
      - Avoid JD mirroring; paraphrase naturally
      Example strong summary opener: "Category management professional with 11+ years across fashion retail and e-commerce, specializing in assortment strategy, vendor development, and data-driven buying decisions."

      SMART SELF-CORRECTION (TARGETED PATCHES, NOT FULL REWRITES)
      Do up to 3 internal correction passes. Each pass must:
      - identify violations (fabrication, JD mirroring, repetition, tool-first bullets, keyword stuffing)
      - apply the smallest possible edits to fix them
      - preserve unaffected lines verbatim

      AI ENGINE RULES (EVALUATE + REWRITE)
      1) Keyword extraction: pull hard skills, tools, certifications, job titles from the JD; flag missing high-frequency terms only if evidenced in ORIGINAL resume.
      2) Bullet scoring: Action Verb + Metric + Outcome (score 0–3). Rewrite bullets scoring ≤1.
      3) Section detection: ensure Summary, Skills, Experience, Education exist with standard names.
      4) Readability: flag bullets over 2 lines, paragraphs where bullets belong, and passive voice.

      ATS TARGET
      The final resume should reliably score 90+ on a modern ATS while still reading human.
      Achieve this via contextual phrasing and credible skill-to-task mapping, not repetition.

      OUTPUT CONTRACT (STRICT JSON)
      Return ONLY valid JSON with this schema:
      {
        "resumeMarkdown": "string",
        "verification": {
          "noFabrication": boolean,
          "noJdMirroring": boolean,
          "noKeywordStuffing": boolean,
          "noToolFirstBullets": boolean,
          "onePageIntent": boolean,
          "notes": string[]
        },
        "changeLog": { "change": string, "evidence": string }[]
      }

      RESUME MARKDOWN FORMAT RULES (INSIDE resumeMarkdown)
      - Output ONLY Markdown (no HTML) inside resumeMarkdown.
      - Required section order and exact headers:
        1) ## SUMMARY
        2) ## EXPERIENCE
        3) ## SKILLS
        4) ## EDUCATION
      - First non-empty line in resumeMarkdown MUST be: ## SUMMARY
      - Single column. No tables. No icons. No images.
      - Do NOT include candidate name or contact info in resumeMarkdown.
      - EXPERIENCE entry format (pipes required — ONE ENTRY PER ROLE):
        ### <Exact Job Title from Original> | <Exact Employer from Original> | <Exact Start> – <Exact End from Original> | <City, Country>
        Example: ### Category Analyst | Target (Target Plus) | Apr 2022 – Present | Bengaluru, India
        CRITICAL STRUCTURAL RULES (NEVER VIOLATE):
        1. Each unique job title is ALWAYS its own separate ### entry — even at the same company.
           Example: If the ORIGINAL shows "Category Planner" (Jul 2025–Present), "Senior Category
           Analyst" (Feb 2024–Jul 2025), and "Category Analyst" (Apr 2022–Feb 2024) all at Target
           — write THREE separate ### entries with the EXACT title and dates for each.
        2. NEVER combine multiple roles into one header.
        3. NEVER merge different employers into one header.
        4. The TOTAL count of ### entries in your output MUST match the total distinct roles in the
           ORIGINAL resume. Count all roles before writing.
        5. NEVER use the JD's target company as an employer unless it is already in the ORIGINAL.
        6. NEVER output the literal text "Date Range" — always use the real dates from the original.
           If dates are unclear, omit the date field rather than write "Date Range".
      - EDUCATION entry format (pipes required):
        ### <Exact Degree from Original> | <Exact School from Original> | <Graduation Year> | <City>
        Example: ### Bachelor of Fashion Technology | National Institute of Fashion Technology | 2013 | Delhi
        NEVER write "Degree Name", "School Name", or "Date Range" as literal values.
      - SKILLS: Extract ALL skills present in the ORIGINAL resume AND list every evidence-backed
        JD keyword. Include minimum 15 skills for experienced candidates. Group into categories:
        Category Management: ... | Data & Analytics: ... | Tools & Platforms: ... |
        Leadership & Strategy: ... etc. Be comprehensive — do not truncate the skills list.
        IMPORTANT: Scan the ORIGINAL resume carefully for tools/platforms that may be mentioned
        in passing (e.g. Excel, Google Sheets, ERP, POS, Analytics tools, BI tools). If present
        in the ORIGINAL, always list them explicitly under "Tools & Platforms". Never infer tools
        that are not mentioned at all.

      SPARSE RESUME HANDLING (when ORIGINAL has only job titles and dates, no bullet details):
      If a role in the ORIGINAL has no bullets or descriptions:
      - DO NOT copy JD language to fill the gap.
      - DO NOT use JD phrases like "drove traffic conversion", "managed P&L", "leveraged data-driven
        insights" unless that exact language appears in the ORIGINAL.
      - Build 2–3 observable bullets based ONLY on:
        1. The job title itself (what this role inherently does in this industry)
        2. The employer type (e-commerce marketplace, garment exporter, fashion startup)
        3. Any specific detail mentioned (e.g. "Buyer for Dressberry and Mr. Bowerbird — Myntra
           Private Brands" → mention private brand buying explicitly)
      - Express scope qualitatively using role context: "across the fashion category",
        "for private label brands", "spanning seasonal collections"
      - NEVER use invented metrics. NEVER use bracket placeholders.
      - Bullets must be interview-defensible: a candidate should be able to speak to them
        based on having held that job title at that company.

      PRIVATE BRAND / E-COMMERCE SIGNALS — ALWAYS SURFACE IF IN ORIGINAL:
      - If the ORIGINAL mentions private brand buying (e.g. "Myntra Private Brands"), highlight it
        explicitly in the bullet and in the Summary — this is premium experience for marketplaces.
      - If multiple employers are e-commerce platforms (Myntra, Bewakoof, Limeroad, Roposo, Amazon,
        Flipkart, Nykaa etc.), surface "e-commerce" prominently in Summary and Skills.

      LANGUAGE
      ${langInstruction}
      `;
      useJson = true;
      generationConfigOverride = { responseMimeType: "application/json", temperature: 0.3, maxOutputTokens: 8000 };
      selectedModel = "gpt-4o";
      break;

    case GeneratorType.RESUME_SUGGESTIONS:
      userPrompt = `Based on missing keywords (${analysis.missingKeywords.join(", ")}), provide concrete bullet point suggestions. ${langInstruction}`;
      break;

    case GeneratorType.COVER_LETTER:
      userPrompt = `
      Write a high-converting, persuasive cover letter designed to get an interview call.

      CORE STRATEGY:
      - The goal is NOT to summarize the resume. Tell a compelling story connecting the candidate's unique value to the company's needs in the JD.
      - Use a confident, professional, human tone.
      - Hook the reader in the first sentence.

      JD + RECRUITER OPTIMIZATION:
      - Align to the JD's top responsibilities and outcomes, without copying JD sentences.
      - Use relevant JD terms sparingly (max once each), only when supported by the ORIGINAL RESUME evidence.
      - Avoid keyword stuffing, repetition, and generic fluff.

      CRITICAL - ZERO FABRICATION POLICY (ABSOLUTE — NEVER VIOLATE):
      • Use ONLY companies and job titles that appear VERBATIM in the ORIGINAL RESUME.
      • NEVER invent metrics, percentages, or numbers (e.g. "20% increase", "15% reduction") unless they appear word-for-word in the ORIGINAL RESUME.
      • NEVER invent job titles not present in the ORIGINAL RESUME (e.g. "Senior Category Analyst" if it is not in the resume).
      • NEVER fabricate achievements, projects, or outcomes not in the ORIGINAL RESUME.
      • If there are no specific metrics in the ORIGINAL RESUME, express outcomes qualitatively (e.g. "improved inventory management" not "improved inventory by 30%").
      • Candidate name: ${profile.name || 'the candidate'}.

      FORMAT REQUIREMENTS (CRITICAL — FOLLOW EXACTLY):
      - Output ONLY plain text with minimal Markdown.
      - FORBIDDEN: Do NOT use ## or ### headers anywhere in the letter.
      - Use **bolding** only for key achievements or role titles (sparingly, max 2 uses).
      - Keep paragraphs short (2–4 lines). Under 380 words total.
      - CRITICAL PARAGRAPH SEPARATOR: Separate EVERY section and paragraph with a BLANK LINE (two newline characters \\n\\n). Never use single newlines between paragraphs. This is essential for correct rendering.

      EXACT OUTPUT STRUCTURE (follow this order, each section separated by a blank line):
      [Date in "5 March 2026" format]

      [Company Name]

      Dear [Team Name or specific title — not "Dear Hiring Manager"],

      [HOOK: 1–2 sentences. Open with a specific, concrete claim or role-relevant strength from the ORIGINAL RESUME.]

      [BODY PARAGRAPH 1: Connect one JD requirement to a specific role or responsibility from the ORIGINAL RESUME. No invented metrics.]

      [BODY PARAGRAPH 2: Another differentiator or progression from ORIGINAL RESUME. Show scope or career growth.]

      [OPTIONAL: 2–3 bullet highlights — ONLY include if backed by real evidence from the resume. If no real achievements exist, skip this block entirely. Do NOT invent.]
      - [Real achievement with context from resume]
      - [Real achievement with context from resume]

      [CLOSE: Confident CTA. Express enthusiasm and request for interview discussion.]

      Sincerely,
      ${profile.name || 'Name'}

      ${langInstruction}
      ${toneInstruction}

      Output only the cover letter text. Do not add any commentary, headers, or labels.
      `;
      break;

    case GeneratorType.INTERVIEW_PREP:
      userPrompt = `
      Create a high-caliber Interview Prep Kit for this candidate (top 1% quality).
      
      CRITICAL - ZERO FABRICATION POLICY:
      • ALL answers MUST use companies, projects, and achievements from the ORIGINAL RESUME above
      • Do NOT invent fictional scenarios or fake accomplishments
      • Reference ONLY their real work history as shown in the resume

      QUALITY BAR:
      - Questions must be specific to the JD (domain, scope, tools, seniority) and the candidate's actual background.
      - Avoid generic questions unless the answer is highly tailored to the role.
      - For each answer, anchor to a concrete resume evidence line (quote a short phrase from the resume so the candidate can quickly find it).
      - Add one strong follow-up question the interviewer might ask, and a crisp follow-up answer.
      - Optimize for recruiter trust: no buzzword stacking, no vague answers, no invented scope.
      - Use JD terminology sparingly (max once per key term) and never copy JD sentences verbatim.
      
      Include:
      1. **20 Predicted Interview Questions** based on the job description and resume.
      2. **STAR-based answers** for each question.
         - Use STAR explicitly for every answer:
           **Situation:** 1-2 sentences
           **Task:** 1 sentence
           **Action:** 2-3 sentences
           **Result:** 1-2 sentences (include real metric if present; otherwise realistic qualitative result)
         - Add a final line: **Takeaway:** one concise sentence that sounds interview-ready.
         - Keep answers direct, conversational, and evidence-backed.
      3. Questions to ask the interviewer.
      4. Common pitfalls to avoid.
      
      Structure the output clearly with headers.
      
      FORMATTING REQUIREMENTS (follow exactly):
      - Use Markdown.
      - Start with: ## Predicted Questions and STAR Answers
      - For each Q/A pair, use:
        ### 1. <Question Text>
        **Situation:** ...
        **Task:** ...
        **Action:** ...
        **Result:** ...
        **Takeaway:** ...
        **Evidence:** ...
        **Follow-up:** ...
        **Follow-up Answer:** ...
        ---
      - Separate each Q/A pair with a horizontal rule (---).
      - Use short paragraphs and bold key metrics.
      - After questions section, add:
        ## Questions To Ask The Interviewer
        ## Common Pitfalls To Avoid
      
      - Use Title Case for section headers. DO NOT USE ALL CAPS.
      - Avoid walls of text. Prefer short paragraphs and bullets where appropriate.
      
      CRITICAL OUTPUT INSTRUCTION:
      - Do NOT output any preamble or explanation about the "Zero Fabrication Policy" or "Dummy Content". Apply the policy silently.
      - If you MUST include a note (e.g. if the resume is empty), put it in a blockquote (>) and verify there is a blank line after it.
      
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

        OPTIMIZATION GOAL:
        - Prioritize skills that are most critical to the JD and ATS screening.
        - For each skill, include recruiter-friendly proof ideas (portfolio artifacts, measurable practice outcomes).
        
        OUTPUT FORMAT (STRICT MARKDOWN):
        - Start with: ## Skill Gap Syllabus & Roadmap
        - For each missing skill, use:
          ### <Skill Name> — Module
          #### Why It Matters
          #### Curated Resources
          #### Study Plan
          #### Practice Tasks
        - Use bullet lists under each subsection.
        - MUST include hyperlinks for resources: [Resource Name](url)
        - Add blank lines between sections. No run-on paragraphs.
        - No tables.
        
        ${langInstruction}
        `;
      break;

    case GeneratorType.LANGUAGES:
      userPrompt = `
        Build a concise, evidence-backed Languages report for this candidate, and output a ready-to-paste "Languages" section for a resume.

        INPUTS (may be incomplete):
        - Detected resume languages: ${(analysis.languages || []).join(', ') || 'None'}
        - JD required languages: ${(analysis.requiredLanguages || []).join(', ') || 'None'}
        - Language match object: ${JSON.stringify(analysis.languageMatch || {})}

        RULES (NON-NEGOTIABLE):
        - Do NOT invent languages or proficiency levels.
        - If proficiency is not explicitly present in the ORIGINAL RESUME CONTENT, do NOT add it.
        - If a required language is missing from the resume, mark it as missing and suggest what proof would be needed to add it.

        OUTPUT FORMAT (STRICT MARKDOWN):
        - Start with: ## Languages Match
        - Include:
          - Resume Languages (bullet list)
          - JD Required Languages (bullet list)
          - Matched (bullet list)
          - Missing (bullet list)
        - Then add: ## Resume Languages Section (Paste-Ready)
          - Provide a single, compact line suitable for ATS (no proficiency unless proven).
        - Then add: ## Recommendations
          - 3-6 bullets, focused on concrete, safe actions.
        - No tables. No HTML.

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
  console.log('[generateContent] originalResumeText length:', originalResumeText?.length || 0);

  const hasOriginalResumeText = !!(originalResumeText && originalResumeText.trim().length > 0);

  // For ATS_RESUME: pre-extract structured experience as locked headers via a fast AI call.
  // This prevents employer/date fabrication by providing an exact scaffold the AI must follow.
  type ExperienceEntry = { title: string; company: string; dateRange: string; location: string };
  let lockedExperienceHeaders: ExperienceEntry[] = [];
  if (type === GeneratorType.ATS_RESUME && hasOriginalResumeText) {
    try {
      const extractionPrompt = `Extract all work experience entries from this resume text as JSON.
Return ONLY a JSON array (no markdown, no prose) with this schema:
[{"title": "exact job title", "company": "exact company name", "dateRange": "start – end", "location": "City, Country"}]
Rules:
- Include EVERY job entry from the resume, in chronological order (most recent first)
- Use the EXACT company names, job titles, and dates as they appear — do not paraphrase
- If multiple roles at same company, create one entry per role
- If date is approximate (e.g. "2013-2017"), write it as-is
- If location not found, use empty string
Resume text:
${originalResumeText.substring(0, 5000)}`;
      const extractResp = await generateWithFallback(
        MODEL_PRIMARY,
        extractionPrompt,
        { generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 1200 } }
      );
      const parsed = safeJson(extractResp.response.text());
      if (Array.isArray(parsed) && parsed.length > 0) {
        lockedExperienceHeaders = (parsed as any[])
          .filter(e => e && typeof e.company === 'string' && e.company.trim())
          .map(e => ({
            title: (e.title || '').trim(),
            company: (e.company || '').trim(),
            dateRange: (e.dateRange || '').trim(),
            location: (e.location || '').trim(),
          }));
        console.log('[generateContent] Extracted experience anchors:', lockedExperienceHeaders.map(e => `${e.title} @ ${e.company}`));
      }
    } catch (err) {
      console.warn('[generateContent] Experience extraction failed, continuing without locked headers:', err);
    }
  }

  const lockedHeadersBlock = lockedExperienceHeaders.length > 0
    ? `
================================================================================
EXPERIENCE STRUCTURE LOCK — COPY THESE HEADERS VERBATIM (DO NOT MODIFY)
================================================================================
Your EXPERIENCE section MUST contain EXACTLY these ### entries in this order.
Copy each header character-for-character. Only write bullets below each one.
${lockedExperienceHeaders.map((e, i) =>
  `${i + 1}. ### ${e.title || '<title>'}${e.company ? ` | ${e.company}` : ''}${e.dateRange ? ` | ${e.dateRange}` : ''}${e.location ? ` | ${e.location}` : ''}`
).join('\n')}

DO NOT add any other employer. DO NOT change any employer name, date, or location.
DO NOT use the JD's target company as an employer unless it appears above.
================================================================================`
    : `
EMPLOYER CONSTRAINT: Use ONLY the employers named in the ORIGINAL RESUME above.
DO NOT add the target company from the JD as a past employer.
DO NOT write "Date Range", "Degree Name", "School Name" as literal values — these are format labels, not real values.`;

  const resumeContext = hasOriginalResumeText
    ? `
================================================================================
ORIGINAL RESUME — YOUR ONLY SOURCE OF TRUTH
================================================================================
Every company name, job title, school, date, location, skill, and metric below
is REAL. Reproduce them exactly. DO NOT invent, add, or replace any facts.
================================================================================

${originalResumeText.substring(0, 8000)}

================================================================================
END OF ORIGINAL RESUME
================================================================================
${lockedHeadersBlock}

ANTI-FABRICATION CHECKLIST — verify before output:
✗ Every employer in EXPERIENCE is from the locked list above
✗ No date written as the literal text "Date Range"
✗ No degree written as "Degree Name" — use the actual degree
✗ No school written as "School Name" — use the actual school name
✗ No city written as the literal word "Location"
✗ No metric invented ($ / ₹ / % not in the original)
Violating any item above = output is INVALID.
================================================================================
`
    : `
================================================================================
WARNING: Original resume text not available
================================================================================
Using limited profile data from analysis:
- Name: ${analysis.contactProfile?.name || 'Unknown'}
- Summary: ${analysis.summary || 'Not available'}
- Key Strengths: ${analysis.keyStrengths?.join(", ") || 'Not available'}
- Contact: ${JSON.stringify(analysis.contactProfile || {})}

CRITICAL: Do NOT fabricate details. If a detail is missing, OMIT it.
NEVER write "Date Range", "Degree Name", "School Name", or "Location" as literal values.
================================================================================
`;

  const fullPrompt = `
${resumeContext}

TARGET JOB DESCRIPTION:
${jobDescription.substring(0, 5000)}

TASK:
${userPrompt}
`;

  try {
    const endpoint = getEndpointForGenerator(type);
    const response = await generateWithFallback(
      selectedModel,
      fullPrompt,
      { generationConfig: generationConfigOverride ?? (useJson ? { responseMimeType: "application/json" } : undefined) },
      MODEL_FALLBACK,
      endpoint
    );

    const text = response.response.text();
    if (useJson) {
      const parsed = safeJson(text);
      if (type === GeneratorType.ATS_RESUME && parsed && typeof parsed.resumeMarkdown === 'string' && parsed.resumeMarkdown.trim()) {
        return cleanMarkdownOutput(parsed.resumeMarkdown);
      }
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
