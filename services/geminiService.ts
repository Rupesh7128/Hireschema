
import { GoogleGenerativeAI, GenerativeModel, GenerationConfig } from "@google/generative-ai";
import { AnalysisResult, FileData, GeneratorType, ContactProfile } from "../types";

// --- CONFIGURATION ---
const MODEL_PRIMARY = "gemini-1.5-flash"; 
const MODEL_FALLBACK = "gemini-pro";

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
        console.error("[Gemini Service] API Key is MISSING! Please set VITE_GEMINI_API_KEY in Vercel.");
    }

    // Use placeholder if key missing to allow app to load, requests will fail gracefully
    genAI = new GoogleGenerativeAI(apiKey || 'MISSING_API_KEY');
    return genAI;
};

// --- UTILS ---

let cachedModels: string[] | null = null;

const listAvailableModels = async (): Promise<string[]> => {
    const key = getApiKey();
    if (!key) return [];
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await res.json();
        const names = (data.models || []).map((m: any) => (m.name || '').replace(/^models\//, ''));
        return names;
    } catch {
        return [];
    }
};

const resolveModelName = async (preferred: string[]): Promise<string> => {
    if (!cachedModels) {
        cachedModels = await listAvailableModels();
    }
    if (cachedModels.length === 0) {
        for (const base of preferred) {
            if (base.endsWith('-001') || base.endsWith('-002')) return base;
            if (base.includes('1.5-flash')) return 'gemini-1.5-flash-001';
            if (base.includes('1.5-pro')) return 'gemini-1.5-pro-001';
        }
        return 'gemini-1.5-flash-001';
    }
    for (const base of preferred) {
        if (cachedModels.includes(base)) return base;
        if (cachedModels.includes(`${base}-001`)) return `${base}-001`;
        if (cachedModels.includes(`${base}-002`)) return `${base}-002`;
        if (cachedModels.includes(`${base}-latest`)) return `${base}-latest`;
    }
    return preferred[0];
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
    const resolvedPrimary = await resolveModelName([primaryModelName, MODEL_PRIMARY, "gemini-1.5-pro", "gemini-pro-vision", MODEL_FALLBACK]);
    const jsonWanted = config?.generationConfig?.responseMimeType === 'application/json';
    const strPrompt = Array.isArray(prompt) ? JSON.stringify(prompt) : String(prompt);
    
    // Merge deterministic config with any provided config
    const mergedConfig = {
        ...config,
        generationConfig: {
            ...DETERMINISTIC_CONFIG,
            ...config?.generationConfig,
        }
    };
    
    const orKey = getOpenRouterKey();
    if (orKey) {
        try {
            return await openrouterGenerateContent(strPrompt, jsonWanted);
        } catch {}
    }
    
    try {
        const model = ai.getGenerativeModel({ model: resolvedPrimary, ...mergedConfig });
        return await model.generateContent(prompt);
    } catch (error: any) {
        const msg = (error.message || '') + JSON.stringify(error);
        if (msg.includes('401') || msg.includes('API key') || msg.includes('PERMISSION_DENIED')) {
            throw error;
        }
        const resolvedFallback = await resolveModelName([fallbackModelName, MODEL_FALLBACK, "gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"]);
        if (resolvedFallback !== resolvedPrimary) {
            try {
                const fallbackModel = ai.getGenerativeModel({ model: resolvedFallback, ...mergedConfig });
                return await fallbackModel.generateContent(prompt);
            } catch {}
        }
        const openaiKey = getOpenAIKey();
        if (openaiKey) {
            try {
                return await openaiGenerateContent(strPrompt, jsonWanted);
            } catch {}
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
    // @ts-ignore
    if (typeof window.pdfjsLib === 'undefined') {
      console.warn("PDF.js not loaded.");
      return "Error: PDF Parser not loaded. Please refresh the page.";
    }

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
    } catch (error) {
         throw new Error("Unable to refine content.");
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
    } catch (error) {
        throw new Error("Unable to regenerate section.");
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
    5. Market Insights (Salary, Verdict, Culture).
    
    Return structured JSON:
    jobTitle: string, company: string, atsScore: number, relevanceScore: number, roleFitAnalysis: string,
    contactProfile: object, languages: array, missingKeywords: array, criticalIssues: array, keyStrengths: array,
    summary: string, marketAnalysis: object { salary, verdict, culture }
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
        summary: 'Basic scan completed with limited insights.',
        marketAnalysis: { salary: '', verdict: '', culture: '' }
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
    ? `IMPORTANT: TRANSLATE final output to ${language}.` 
    : `Write in professional English.`;

  let userPrompt = "";
  let selectedModel = MODEL_PRIMARY; // Default to Primary
  let useJson = false;

  switch (type) {
    case GeneratorType.ATS_RESUME:
      userPrompt = `
      You are an expert Resume Writer and ATS Optimization Specialist.
      
      ⚠️ **ABSOLUTE RULE - ZERO FABRICATION POLICY** ⚠️
      
      You are STRICTLY FORBIDDEN from changing, inventing, or hallucinating ANY factual information.
      
      **FACTS YOU MUST COPY EXACTLY FROM THE ORIGINAL RESUME:**
      ✗ Company names - If original says "Acme Corp", output MUST say "Acme Corp" (not "Google", not "Microsoft", not anything else)
      ✗ Job titles - If original says "Junior Developer", output MUST say "Junior Developer" (not "Senior Engineer")
      ✗ Employment dates - If original says "Jan 2020 - Dec 2022", output MUST say "Jan 2020 - Dec 2022"
      ✗ School names - If original says "State University", output MUST say "State University" (not "MIT", not "Stanford")
      ✗ Degrees - If original says "B.S. in Computer Science", output MUST say "B.S. in Computer Science"
      ✗ Graduation dates - Copy exactly
      ✗ Certifications - Copy exactly
      ✗ Contact info (name, email, phone, location) - Copy exactly
      
      **WHAT YOU CAN IMPROVE:**
      ✓ Rewrite bullet point descriptions to sound more impactful (same facts, better wording)
      ✓ Add keywords from the job description naturally into existing bullet points
      ✓ Write a compelling professional summary using the candidate's ACTUAL experience
      ✓ Reorganize sections for better flow
      ✓ Use stronger action verbs
      
      **WHAT YOU CANNOT DO:**
      ✗ Invent companies the candidate never worked at
      ✗ Invent job titles the candidate never held
      ✗ Invent schools the candidate never attended
      ✗ Invent metrics or numbers that aren't in the original
      ✗ Change any dates
      ✗ Add skills the candidate doesn't have
      
      **INPUTS:**
      1. **Original Resume Content**: Provided above - THIS IS YOUR ONLY SOURCE OF TRUTH
      2. **Job Description**: Provided below
      3. **Keywords to incorporate**: ${analysis.missingKeywords.join(", ")}
      
      **OUTPUT FORMAT:**
      - Use Markdown with # for name, ## for sections
      - Use - for bullet points
      - NO tables, NO columns
      
      **LANGUAGE:** ${langInstruction}
      
      Output the FULL optimized resume. No explanations. Just the resume.
      `;
      break;

    case GeneratorType.RESUME_SUGGESTIONS:
      userPrompt = `Based on missing keywords (${analysis.missingKeywords.join(", ")}), provide concrete bullet point suggestions. ${langInstruction}`;
      break;

    case GeneratorType.COVER_LETTER:
      userPrompt = `
      Write a persuasive Cover Letter for the candidate.
      
      **CRITICAL**: Use ONLY the candidate's ACTUAL experience from the original resume.
      - Reference their REAL companies, job titles, and achievements
      - Do NOT invent or fabricate any experience
      - The candidate's name is: ${profile.name}
      
      ${langInstruction}
      ${toneInstruction}
      
      Output only the cover letter text, ready to use.
      `;
      break;

    case GeneratorType.INTERVIEW_PREP:
      userPrompt = `
      Create an Interview Prep Kit for this candidate.
      
      **CRITICAL**: Base all examples on the candidate's ACTUAL experience from their resume.
      - Use their REAL companies, projects, and achievements for STAR examples
      - Do NOT invent fictional scenarios
      
      Include:
      1. 10 Predicted Interview Questions based on the job description
      2. STAR Method examples using the candidate's REAL experience
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
      
    case GeneratorType.MARKET_INSIGHTS:
        useJson = true;
        userPrompt = `
        Analyze the Job Description using internal knowledge.
        1. Verdict (Good job?), 2. Salary Range, 3. Culture/WFH, 4. Interview Trends.
        Output strictly valid JSON: { "verdict", "salary_range", "culture_wfh", "interview_trends", "pros", "cons" }
        `;
        break;

    case GeneratorType.ROAST:
        userPrompt = `
        You are a brutally honest resume roaster. Your job: surgically mean, structurally tight, commercially effective.
        
        TONE RULES:
        - Snark with spine: Every dunk ends in a fix. Funny → factual → fix.
        - Specific over loud: Precision is funnier than volume. Call out exact details (dates, duplicated entries, math errors).
        - One-liners sparingly: Use sparklers, not fireworks. Save the biggest punchline for the Verdict.
        
        STRUCTURE (use these exact headers):
        
        ## 💀 The Diagnosis
        Open with a one-line power sentence that sets tone and stakes.
        Example: "This resume was faxed in from 2011, emotionally attached to buzzwords, and numerically allergic to calendars."
        Then one sentence: "Here's the roast plus the cure."
        
        ## 📊 Cringe Analytics: Where Your Resume Goes to Cry
        For each issue, use this format:
        - **Symptom:** What's wrong (be specific - quote the resume)
        - **Severity:** 🔥 to 🔥🔥🔥🔥🔥
        - **Fix:** One surgical action to take
        
        Call out: vague dates, buzzword bingo, feature lists instead of outcomes, math errors, formatting crimes.
        Example: "Start date: June 2025. Bold. Visionary. Tragically unproofread."
        
        ## 🚩 Red Flag Energy
        What screams "do not hire" - be specific. Use rule-of-three, then break it for surprise.
        Example: "YC listed twice: prestige speedrun; impact optional; humility not found."
        
        ## ✨ The One Nice Thing
        Find something genuinely good. Make it backhanded if you must.
        
        ## ⚖️ Final Verdict
        Give a score out of 100 with a memorable one-liner.
        Example: "Employability Score: 17/100 — medically unhireable, spiritually bootstrapped."
        
        End with a callback to an earlier joke for narrative payoff.
        
        REMEMBER: Readers stay for jokes; they convert for credibility. Be funny enough to share, clear enough to trust, sharp enough to convert.
        `;
        break;
  }

  // Build the resume context - prioritize original text if available
  // Log for debugging
  console.log('[generateContent] originalResumeText length:', originalResumeText?.length || 0);
  
  const resumeContext = originalResumeText && originalResumeText.length > 100
    ? `
╔══════════════════════════════════════════════════════════════════════════════╗
║  ORIGINAL RESUME - THIS IS THE ONLY SOURCE OF TRUTH                          ║
║  ALL company names, job titles, dates, schools MUST be copied EXACTLY        ║
╚══════════════════════════════════════════════════════════════════════════════╝

${originalResumeText}

╔══════════════════════════════════════════════════════════════════════════════╗
║  END OF ORIGINAL RESUME - DO NOT INVENT ANY INFORMATION NOT SHOWN ABOVE      ║
╚══════════════════════════════════════════════════════════════════════════════╝
`
    : `
⚠️ WARNING: Original resume text not available - using limited profile data ⚠️
Summary: ${analysis.summary}
Key Strengths: ${analysis.keyStrengths.join(", ")}
Contact Info: ${JSON.stringify(analysis.contactProfile)}
⚠️ Generate a generic template since original details are unavailable ⚠️
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

  } catch (error) {
      console.error("Generation failed", error);
      throw new Error("Failed to generate content.");
  }
};
