
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

    // DEBUG: Log masked key to verify it's being read correctly
    if (apiKey) {
        console.log(`[Gemini Service] API Key loaded: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
    } else {
        console.error("[Gemini Service] API Key is MISSING! Please check your environment variables.");
        console.error("[Gemini Service] Available env vars:", {
            vite_gemini: !!(import.meta as any).env?.VITE_GEMINI_API_KEY,
            gemini: !!(import.meta as any).env?.GEMINI_API_KEY,
            process_gemini: !!(process as any).env?.GEMINI_API_KEY,
            process_api: !!(process as any).env?.API_KEY
        });
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

const isProbablyResume = (text: string): boolean => {
    const t = (text || "").toLowerCase();
    const lenOk = t.replace(/\s+/g, " ").length > 400;
    let hits = 0;
    if (/(experience|work history|employment)/i.test(t)) hits++;
    if (/(education|degree|b\. ?tech|bachelor|master)/i.test(t)) hits++;
    if (/(skills|technologies|tooling)/i.test(t)) hits++;
    if (/(projects|achievements|certifications)/i.test(t)) hits++;
    if (/[\w.-]+@[\w.-]+\.[a-z]{2,}/i.test(t)) hits++;
    if (/(linkedin\.com\/in\/)/i.test(t)) hits++;
    if (/(\+?\d[\d\-\s()]{7,}\d)/.test(t)) hits++;
    return lenOk && hits >= 2;
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
    if (orKey) {
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
        if (openaiKey) {
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
    // If text starts with "Here is...", remove it until the first header or bold
    const firstHeader = text.search(/^(#{1,3}\s|\*\*|<div)/m);
    if (firstHeader !== -1) {
        return text.substring(firstHeader);
    }
    return text;
};

const getActionableError = (error: any): string => {
    const msg = error.message || '';
    console.error("Gemini API Error Details:", error); // Log full error for debugging
    
    if (msg.includes('401') || msg.includes('API key')) return "Invalid API Key. Please verify your configuration in Vercel.";
    if (msg.includes('429')) return "High traffic limit reached. Please try again in a minute.";
    if (msg.includes('503')) return "AI Service temporarily unavailable. Please try again later.";
    if (msg.includes('PasswordException')) return "This PDF is password protected. Please unlock it and try again.";
    
    // Show the actual network error to help debug
    if (msg.includes('NetworkError') || msg.includes('fetch')) return `Network Error: ${msg}. Check console for details.`;
    if (msg.includes('404')) return `Model Not Found (404): The selected AI model is unavailable for your API key/Region.`;
    
    return `Analysis failed: ${msg.substring(0, 100)}.`;
};

export async function extractTextFromPdf(base64Data: string): Promise<string> {
  try {
    // Wait for PDF.js to be available
    let attempts = 0;
    while (typeof (window as any).pdfjsLib === 'undefined' && attempts < 10) {
      console.log('Waiting for PDF.js to load...');
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    // @ts-ignore
    if (typeof window.pdfjsLib === 'undefined') {
      console.error("PDF.js not loaded after waiting.");
      throw new Error("PDF Parser not loaded. Please refresh the page and try again.");
    }

    console.log('PDF.js is ready, extracting text...');
    
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // @ts-ignore
    const loadingTask = window.pdfjsLib.getDocument({ data: bytes });
    
    // Handle password protected files
    loadingTask.onPassword = (updatePassword: any, reason: any) => {
        throw new Error("PasswordException: PDF is encrypted");
    };

    const pdf = await loadingTask.promise;
    let fullText = '';
    const maxPages = Math.min(pdf.numPages, 15);
    
    console.log(`Extracting text from ${maxPages} pages...`);
    
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // @ts-ignore
      const pageText = textContent.items.map(item => item.str).join(' ');
      
      // Improved Regex to catch LinkedIn URLs specifically
      const linkedinRegex = /linkedin\.com\/in\/[a-zA-Z0-9_-]+/gi;
      const links = pageText.match(linkedinRegex) || [];
      const uniqueLinks = [...new Set(links)];
      
      // Append links explicitly
      const linksText = uniqueLinks.length > 0 ? `\n\n[Metadata: ${uniqueLinks.join(', ')}]\n` : '';

      fullText += pageText + linksText + '\n';
    }

    console.log(`Extracted ${fullText.length} characters from PDF`);
    return fullText;
  } catch (e: any) {
    console.error("PDF Extraction Failed:", e);
    if (e.name === 'PasswordException' || e.message.includes('Password')) {
        return "Error: The PDF is password protected. Please remove the password and upload again.";
    }
    return "Error parsing PDF. Please ensure the file is a standard text-based PDF.";
  }
}

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
  let resumeText = '';
  try {
    if ((resumeFile.type || '').includes('pdf')) {
      resumeText = await extractTextFromPdf(resumeFile.base64);
    }
  } catch {}
  if ((resumeFile.type || '').startsWith('image/')) {
    throw new Error(NON_RESUME_MESSAGE);
  }
  if (resumeText && !isProbablyResume(resumeText)) {
    throw new Error(NON_RESUME_MESSAGE);
  }
  
  const systemPrompt = `
    You are an impartial, evidence-based ATS Algorithm and Career Coach.
    
    INPUT DATA:
    1. Resume Text
    2. Job Description (JD) OR Link. 
       - If the JD is a URL, try to infer context or state "Link content unavailable" (Search tool disabled for stability).
       - If JD is "NO_JD_PROVIDED", evaluate resume generally.
    
    TASKS:
    1. Extract Metadata (Job Title, Company).
    2. Dual Scoring (ATS Score, Relevance Score).
    3. Role Fit Analysis.
    4. Contact Profile (Name, Email, Phone, LinkedIn, Location).
    
    Return structured JSON:
    jobTitle: string, company: string, atsScore: number, relevanceScore: number, roleFitAnalysis: string,
    contactProfile: object, languages: array, missingKeywords: array, criticalIssues: array, keyStrengths: array,
    summary: string
  `;
  
  try {
    const payload = resumeText
      ? `${systemPrompt}\n\nRESUME TEXT:\n${resumeText}\n\nJob Description / Link:\n${jdText}\n\nOutput strictly valid JSON.`
      : `${systemPrompt}\n\nJob Description / Link:\n${jdText}\n\nOutput strictly valid JSON.`;

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
    if (parsed) return parsed as AnalysisResult;
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
      
      ════════════════════════════════════════════════════════════════════════════════
      ⛔ CRITICAL: ZERO FABRICATION POLICY - READ THIS CAREFULLY ⛔
      ════════════════════════════════════════════════════════════════════════════════
      
      Your task is to REFORMAT and OPTIMIZE the resume above, NOT to create a new one.
      
      🚫 ABSOLUTELY FORBIDDEN - DO NOT:
      • Invent ANY company names (use ONLY companies from the original resume)
      • Invent ANY job titles (use ONLY titles from the original resume)
      • Invent ANY school names (use ONLY schools from the original resume)
      • Invent ANY degrees (use ONLY degrees from the original resume)
      • Change ANY dates (copy dates EXACTLY as written)
      • Add ANY skills not mentioned in the original resume
      • Add ANY metrics/numbers not in the original resume
      • Add ANY certifications not in the original resume
      
      ✅ YOU MUST:
      • Copy the candidate's NAME exactly as shown
      • Copy ALL company names exactly as shown
      • Copy ALL job titles exactly as shown  
      • Copy ALL school names exactly as shown
      • Copy ALL dates exactly as shown
      • Copy the candidate's contact info exactly
      
      ✅ YOU MAY IMPROVE:
      • Reword bullet points to sound more impactful (same facts, better phrasing)
      • Add relevant keywords from the job description INTO existing bullet points
      • Write a professional summary based on their ACTUAL experience
      • Reorganize sections for better flow
      • Use stronger action verbs
      
      **Keywords to naturally incorporate**: ${analysis.missingKeywords.join(", ")}
      
      **OUTPUT FORMAT:**
      - Markdown format: # for name, ## for sections, - for bullets
      - Single column layout, NO tables
      - Include: Contact Info, Summary, Experience, Education, Skills
      
      **LANGUAGE:** ${langInstruction}
      
      Output ONLY the optimized resume. No explanations, no preamble.
      `;
      break;

    case GeneratorType.RESUME_SUGGESTIONS:
      userPrompt = `Based on missing keywords (${analysis.missingKeywords.join(", ")}), provide concrete bullet point suggestions. ${langInstruction}`;
      break;

    case GeneratorType.COVER_LETTER:
      userPrompt = `
      Write a persuasive Cover Letter for the candidate.
      
      ⛔ CRITICAL - ZERO FABRICATION POLICY:
      • Use ONLY companies, job titles, and achievements from the ORIGINAL RESUME above
      • Do NOT invent any experience, projects, or accomplishments
      • Reference their REAL work history exactly as shown in the resume
      • The candidate's name is: ${profile.name || 'the candidate'}
      
      The cover letter should:
      1. Open with enthusiasm for the specific role
      2. Highlight 2-3 relevant experiences FROM THE RESUME
      3. Connect their ACTUAL skills to the job requirements
      4. Close with a call to action
      
      ${langInstruction}
      ${toneInstruction}
      
      Output only the cover letter text, ready to use.
      `;
      break;

    case GeneratorType.INTERVIEW_PREP:
      userPrompt = `
      Create an Interview Prep Kit for this candidate.
      
      ⛔ CRITICAL - ZERO FABRICATION POLICY:
      • ALL STAR examples MUST use companies, projects, and achievements from the ORIGINAL RESUME above
      • Do NOT invent fictional scenarios or fake accomplishments
      • Reference ONLY their real work history as shown in the resume
      
      Include:
      1. 10 Predicted Interview Questions based on the job description
      2. STAR Method examples using ONLY experiences from the resume above
         - For each STAR example, cite the specific company/role from their resume
      3. Questions to ask the interviewer
      4. Common pitfalls to avoid
      
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
        Create a "Mini Learning Path" to help this candidate fill skill gaps.
        
        **Missing skills to learn**: ${analysis.missingKeywords.slice(0, 4).join(", ")}
        **Candidate's existing strengths**: ${analysis.keyStrengths.join(", ")}
        
        For each missing skill, provide:
        1. Why it matters for the target role
        2. 2-3 specific resources (courses, tutorials, projects)
        3. Estimated time to learn basics
        
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
        `;
        break;
  }

  // Build the resume context - prioritize original text if available
  // Log for debugging
  console.log('[generateContent] originalResumeText length:', originalResumeText?.length || 0);
  console.log('[generateContent] First 200 chars of resumeText:', originalResumeText?.substring(0, 200) || 'EMPTY');
  
  const resumeContext = originalResumeText && originalResumeText.length > 100
    ? `
════════════════════════════════════════════════════════════════════════════════
█ ORIGINAL RESUME CONTENT - THIS IS YOUR ONLY SOURCE OF TRUTH █
════════════════════════════════════════════════════════════════════════════════
⚠️ EVERY company name, job title, school name, date, and skill below is REAL.
⚠️ You MUST use ONLY the information below. DO NOT invent anything.
════════════════════════════════════════════════════════════════════════════════

${originalResumeText}

════════════════════════════════════════════════════════════════════════════════
█ END OF ORIGINAL RESUME - USE ONLY THE INFORMATION ABOVE █
════════════════════════════════════════════════════════════════════════════════
⛔ If you output ANY company, school, or job title NOT shown above, you have FAILED.
⛔ Double-check every fact against the original resume above before outputting.
════════════════════════════════════════════════════════════════════════════════
`
    : `
════════════════════════════════════════════════════════════════════════════════
⚠️ WARNING: Original resume text not available ⚠️
════════════════════════════════════════════════════════════════════════════════
Using limited profile data from analysis:
- Name: ${analysis.contactProfile?.name || 'Unknown'}
- Summary: ${analysis.summary || 'Not available'}
- Key Strengths: ${analysis.keyStrengths?.join(", ") || 'Not available'}
- Contact: ${JSON.stringify(analysis.contactProfile || {})}

⚠️ Since original resume is unavailable, create a TEMPLATE with placeholders.
⚠️ Use [Company Name], [Job Title], [School Name] as placeholders.
════════════════════════════════════════════════════════════════════════════════
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
