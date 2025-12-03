
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, FileData, GeneratorType, ContactProfile } from "../types";

// --- CONFIGURATION ---
const MODEL_STANDARD = "gemini-1.5-flash-001"; // Standard tasks, Search Grounding
const MODEL_FAST = "gemini-1.5-flash-001"; // Low latency tasks
const MODEL_REASONING = "gemini-2.0-flash-thinking-exp-01-21"; // Complex reasoning, Chatbot

// Singleton instance for the AI client
let aiInstance: GoogleGenAI | null = null;

// Helper to safely get API key
const getApiKey = (): string => {
    try {
        // Prefer direct define replacement (Vite 'define')
        // @ts-ignore
        const KEY_FROM_DEFINE = (process.env.API_KEY || process.env.GEMINI_API_KEY) as string;
        if (KEY_FROM_DEFINE) return KEY_FROM_DEFINE;
        // @ts-ignore
        if (typeof process !== 'undefined' && (process as any).env) {
            // @ts-ignore
            const fromProcess = (process as any).env.API_KEY || (process as any).env.GEMINI_API_KEY;
            if (fromProcess) return fromProcess as string;
        }
        // @ts-ignore
        if (typeof window !== 'undefined' && window.process?.env) {
            // @ts-ignore
            const fromWindow = window.process.env.API_KEY || window.process.env.GEMINI_API_KEY;
            if (fromWindow) return fromWindow as string;
        }
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
            // @ts-ignore
            const fromImport = (import.meta as any).env.GEMINI_API_KEY || (import.meta as any).env.API_KEY;
            if (fromImport) return fromImport as string;
        }
    } catch (e) {}
    return '';
};

// Lazy initialization of the AI client
const getAiClient = (): GoogleGenAI => {
    if (aiInstance) return aiInstance;
    
    const apiKey = getApiKey();

    // Use placeholder if key missing to allow app to load, requests will fail gracefully
    aiInstance = new GoogleGenAI({ apiKey: apiKey || 'MISSING_API_KEY' });
    return aiInstance;
};

// --- UTILS ---

/**
 * Retries an async operation with exponential backoff.
 */
const retryOperation = async <T>(
    operation: () => Promise<T>, 
    maxRetries: number = 3, 
    delayMs: number = 1000
): Promise<T> => {
    let lastError: any;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;
            // Don't retry client-side errors (like invalid API key)
            if (error.message?.includes("API Key") || error.message?.includes("401")) throw error;
            
            // Wait with exponential backoff
            await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
        }
    }
    throw lastError;
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
    if (msg.includes('401') || msg.includes('API key')) return "Invalid API Key. Please verify your configuration.";
    if (msg.includes('429')) return "High traffic. Retrying analysis...";
    if (msg.includes('503')) return "AI Service temporarily unavailable. Please try again later.";
    if (msg.includes('PasswordException')) return "This PDF is password protected. Please unlock it and try again.";
    if (msg.includes('NetworkError') || msg.includes('fetch')) return "Network error. Please check your internet connection.";
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
        // Use Reasoning model for better semantic matching
        const prompt = `
            Act as a senior Technical Recruiter and ATS Expert.
            
            TASK: Calculate a Semantic Relevance Score (0-100) for the RESUME against the JOB DESCRIPTION.
            
            RESUME CONTENT:
            ${generatedResumeText.substring(0, 15000)}
            
            JOB DESCRIPTION:
            ${jobDescription.substring(0, 5000)}
            
            SCORING RULES:
            1. **Keyword Matching (40%)**: Do key hard skills appear? (Allow for synonyms, e.g. "React" = "React.js").
            2. **Experience Level (30%)**: Does the candidate match the seniority (Junior/Senior/Lead)?
            3. **Contextual Fit (30%)**: Do the achievements align with the role's core challenges?
            
            Be strict but fair. Do not give 100% unless it's a perfect clone.
            Average candidates usually score 60-75. Good matches 75-90.
            
            Output strictly valid JSON:
            { "score": number }
        `;

        const response = await getAiClient().models.generateContent({
            model: MODEL_REASONING, // Upgraded from FAST to REASONING
            contents: { text: prompt },
            config: { 
                responseMimeType: "application/json",
                temperature: 0.1 
            }
        });

        const cleanJson = cleanJsonOutput(response.text || '');
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
    
    Task: Rewrite content to satisfy user instruction. 
    Maintain Markdown structure.
    Output ONLY the updated document.
    `;

    try {
        const response = await getAiClient().models.generateContent({
            model: MODEL_STANDARD,
            contents: { text: prompt },
            config: { temperature: 0.7 }
        });
        return cleanMarkdownOutput(response.text || currentContent);
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
    
    TASK: Regenerate ONLY the "${sectionName}" section of the resume based on the instruction below.
    Keep the rest of the resume exactly as is.
    
    RESUME:
    ${currentContent}
    
    INSTRUCTION FOR ${sectionName}:
    "${instruction}"
    
    JOB DESCRIPTION CONTEXT:
    ${jobDescription.substring(0, 1000)}...
    
    Output the FULL updated resume markdown.
    `;
    
    try {
        const response = await getAiClient().models.generateContent({
            model: MODEL_STANDARD,
            contents: { text: prompt },
            config: { temperature: 0.7 }
        });
        return cleanMarkdownOutput(response.text || currentContent);
    } catch (error) {
        throw new Error("Unable to regenerate section.");
    }
}

export const extractLinkedInProfile = async (linkedinUrl: string): Promise<Partial<ContactProfile>> => {
    const prompt = `
    Analyze the public LinkedIn profile found at this URL: ${linkedinUrl}
    
    Use Google Search to find the person's public details.
    
    Extract:
    1. Full Name
    2. Location (City, Country)
    
    Return purely valid JSON with these keys:
    {
        "name": "string",
        "location": "string"
    }
    `;
    
    try {
        const response = await getAiClient().models.generateContent({
            model: MODEL_REASONING,
            contents: { text: prompt },
            config: {
                tools: [{ googleSearch: {} }],
                // Note: responseMimeType and responseSchema are not supported with googleSearch
            }
        });
        
        const text = response.text || '{}';
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
  
  const systemPrompt = `
    You are an impartial, evidence-based ATS Algorithm and Career Coach.
    
    INPUT DATA:
    1. Resume Text
    2. Job Description (JD) OR Link. 
       - If the JD input starts with 'http' or 'www' or looks like a URL, use your **Google Search** tool to access the link. **CRITICAL: You MUST fetching the actual content of the page to extract the real job title, requirements, and company name.** Do not hallucinate details if the link is inaccessible; instead, state "Could not access Job Link".
       - If JD is "NO_JD_PROVIDED", evaluate the resume for general ATS health only, set 'relevanceScore' to 0, and 'roleFitAnalysis' to "No Job Description provided for role fit analysis.".
    
    TASK 1: ADVANCED METADATA EXTRACTION
    - Extract **Job Title** from JD (e.g., "Senior React Developer"). If no JD, use "General Resume Scan".
    - Extract **Company Name** from JD (e.g., "Google"). If no JD, use "Self-Initiated".
    - **Hidden Signals**: Look for "implicit" requirements in the JD (e.g., "fast-paced" -> requires resilience; "startup" -> requires ownership).

    TASK 2: DUAL SCORING SYSTEM
    - **ATS Score (Formatting & Compliance)**: Evaluate parsing safety, header structure, date formats, file type, and section clarity. (0-100).
    - **Relevance Score (Skill Match)**: Evaluate strict skill/experience match against the JD. (0-100). If NO JD, return 0.
    
    TASK 3: ROLE FIT ANALYSIS
    - Provide a 1-sentence assessment. E.g., "Candidate is a strong match for Senior dev" or "Role Mismatch: Candidate background is Customer Support, JD is Engineering."
    
    TASK 4: CONTACT PROFILE (Mobile Privacy)
    - Extract Name, Email, Phone, LinkedIn.
    - **Address**: ONLY extract if fully explicit (e.g., "123 Main St, NY"). Do NOT infer or hallucinate location from area codes or company names. If unsure, leave generic (e.g., "New York, NY" or empty).
    - **Languages**: Extract spoken/written languages (e.g., English, Spanish). Do NOT extract programming languages here.
    
    TASK 5: MARKET INSIGHTS
    - Analyze the role and provide:
      - Estimated Salary Range (for the role/location inferred).
      - Brief Verdict (Good role? Competitive?).
      - Culture/WFH vibe (inferred from JD).

    Return structured JSON:
    jobTitle: string
    company: string
    atsScore: number
    relevanceScore: number
    roleFitAnalysis: string
    contactProfile: object
    languages: array
    missingKeywords: array
    criticalIssues: array
    keyStrengths: array
    summary: string
    marketAnalysis: object { salary, verdict, culture }
  `;
  
  try {
    const response = await retryOperation(() => 
        withTimeout<GenerateContentResponse>(
            getAiClient().models.generateContent({
                model: MODEL_STANDARD,
                contents: {
                    parts: [
                    { inlineData: { mimeType: resumeFile.type, data: resumeFile.base64 } },
                    { text: systemPrompt + `\n\nJob Description / Link:\n${jdText}\n\nOutput strictly valid JSON.` },
                    ],
                },
                config: { 
                    tools: [{ googleSearch: {} }], // Enable search for URL extraction and market data
                },
            }),
            120000, 
            "Analysis timed out."
        )
    );

    if (response.text) {
      return JSON.parse(cleanJsonOutput(response.text)) as AnalysisResult;
    }
    throw new Error("Empty response.");

  } catch (primaryError: any) {
    throw new Error(getActionableError(primaryError)); 
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
  }
): Promise<string> => {
  
  const profile = options?.verifiedProfile || analysis.contactProfile;
  const tailorExperience = options?.tailorExperience || false;
  const toneInstruction = options?.tone ? `Adopt a tone that is: ${options.tone}.` : "Adopt a professional, confident tone.";
  const language = options?.language || "English";
  
  const langInstruction = language !== "English" 
    ? `IMPORTANT: TRANSLATE final output to ${language}.` 
    : `Write in professional English.`;

  let userPrompt = "";
  let selectedModel = MODEL_STANDARD;
  let tools = undefined;
  let useJson = false;

  switch (type) {
    case GeneratorType.ATS_RESUME:
      selectedModel = MODEL_REASONING;
      userPrompt = `
      Rewrite resume to be 100% ATS-optimized for the Job Description.
      ${langInstruction}
      
      **THE 60/40 RULE**:
      - PROFESSIONAL EXPERIENCE: Keep 60% of the original core duties to maintain authenticity and truth.
      - TAILORING: ${tailorExperience ? "Rewrite the remaining 40% of bullet points to specifically align with JD keywords/metrics. Quantify achievements." : "Keep original points but optimize phrasing for impact."}
      
      **FORMAT & LAYOUT RULES**:
      1. **HEADER**: Use strictly **Markdown**. 
         - Line 1: # Name
         - Line 2: Contact Info separated by pipes (|).
           Format: Email | Phone | Location | LinkedIn
           *Do NOT include labels like 'Email:', just the values.*
      2. **SUMMARY**: High-impact pitch tailored to JD.
      3. **SKILLS**: Grouped keywords matching JD.
      4. **EXPERIENCE**: Reverse chronological. Metric-heavy. Use the 60/40 rule.
      5. **EDUCATION**.
      6. **LANGUAGES**: Include a section for spoken languages (e.g. English, Spanish) if applicable at the end.
      
      Output ONLY Markdown. Do NOT use code blocks or raw HTML tags.
      `;
      break;

    case GeneratorType.RESUME_SUGGESTIONS:
      selectedModel = MODEL_FAST;
      userPrompt = `Based on missing keywords (${analysis.missingKeywords.join(", ")}), provide concrete bullet point suggestions. ${langInstruction}`;
      break;

    case GeneratorType.COVER_LETTER:
      selectedModel = MODEL_REASONING;
      userPrompt = `Write a persuasive Cover Letter. ${langInstruction} Tone: ${toneInstruction}. Candidate: ${profile.name}. Structure: Hook, Value, CTA. Directly reference user's key strengths.`;
      break;

    case GeneratorType.INTERVIEW_PREP:
      userPrompt = `Create Interview Prep Kit. ${langInstruction}. Part 1: STAR Method intro. Part 2: 10 Predicted Questions based on JD with scripted STAR answers. Part 3: Follow-up Questions to ask. Part 4: Common Pitfalls to avoid.`;
      break;

    case GeneratorType.EMAIL_TEMPLATE:
      selectedModel = MODEL_FAST;
      const channel = options?.emailChannel || 'Email';
      const recipient = options?.emailRecipient || 'Recruiter';
      
      if (channel === 'LinkedIn') {
        userPrompt = `
        Create a 3-Step LinkedIn Outreach Campaign.
        Recipient: ${recipient}.
        Tone: Cheeky, Persuasive, Sales-Expert, Aware of current trends.
        ${langInstruction}
        
        Output Structure:
        ### Step 1: Connection Request (Max 300 chars)
        ### Step 2: First Message (Value drop, no hard pitch)
        ### Step 3: Follow-up (Humorous nudge)
        
        Also add a "Pro Tip" section on how to find their email if not connected.
        `;
      } else {
        const scenario = options?.emailScenario || 'Follow-up';
        userPrompt = `Draft a professional email for "${scenario}". ${langInstruction}. Recipient Role: ${recipient}. Tone: ${toneInstruction}. Include Subject Line.`;
      }
      break;
    
    case GeneratorType.LEARNING_PATH:
        userPrompt = `Create a "Mini Learning Path" for missing keywords: ${analysis.missingKeywords.slice(0, 4).join(", ")}. ${langInstruction}. Format as Markdown Guide.`;
        break;
      
    case GeneratorType.MARKET_INSIGHTS:
        selectedModel = MODEL_REASONING;
        tools = [{ googleSearch: {} }];
        useJson = true;
        userPrompt = `
        Analyze the Job Description first using Google Search Grounding for current data.
        1. **Verdict**: Is this a good job? (Based on typical salary/growth for this title).
        2. **Salary**: Find current market range for this Title/Location.
        3. **Culture**: What does the JD imply about culture/WFH?
        4. **Interview**: Common questions for this company/role.
        
        Output strictly valid JSON:
        {
          "verdict": "string",
          "salary_range": "string",
          "culture_wfh": "string",
          "interview_trends": ["string"],
          "pros": ["string"],
          "cons": ["string"]
        }
        `;
        break;
  }

  const fullPrompt = `Job Description Context: ${jobDescription}\n\nTask: ${userPrompt}`;

  try {
    const response = await retryOperation(() =>
        withTimeout<GenerateContentResponse>(
            getAiClient().models.generateContent({
                model: selectedModel,
                contents: {
                    parts: [
                    { inlineData: { mimeType: resumeFile.type, data: resumeFile.base64 } },
                    { text: fullPrompt },
                    ],
                },
                config: {
                    temperature: 0.4,
                    tools: tools,
                    responseMimeType: (useJson && !tools) ? "application/json" : undefined
                }
            }),
            60000, 
            "Generation Request Timed Out."
        )
    );

    let text = response.text || "Failed to generate content.";

    if (type === GeneratorType.MARKET_INSIGHTS && !useJson && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        // Fallback if not JSON
        const chunks = response.candidates[0].groundingMetadata.groundingChunks;
        let sourcesMd = "\n\n---\n### Sources & References\n";
        chunks.forEach((chunk: any, index: number) => {
            if (chunk.web?.uri) {
                sourcesMd += `- [${chunk.web.title || 'Source ' + (index + 1)}](${chunk.web.uri})\n`;
            }
        });
        text += sourcesMd;
    }
    
    return useJson ? cleanJsonOutput(text) : cleanMarkdownOutput(text);

  } catch (primaryError: any) {
    throw new Error(getActionableError(primaryError));
  }
};
    
