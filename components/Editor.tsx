
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { 
    FileText, Mail, MessageSquare, GraduationCap, 
    Download, Printer, RefreshCw, Globe, 
    Check, ChevronDown, Wand2, Copy, 
    Edit2, Send, Loader2, Sparkles, X,
} from 'lucide-react';
import { FileData, AnalysisResult, GeneratorType } from '../types';
import { generateContent, calculateImprovedScore, refineContent, refineAtsResumeContent, regenerateSection } from '../services/geminiService';
import { normalizeAtsResumeMarkdown } from '../services/atsResumeMarkdown';
import { saveStateBeforePayment } from '../services/stateService';
import { includesKeyword, prioritizeKeywords } from '../services/keywordUtils';
import { validateResumeMarkdown, type ResumeComplianceReport, type KeywordJustification } from '../services/resumeCompliance';
import PaymentLock from './PaymentLock';
import { PdfTemplate } from './PdfTemplate';
import { LoadingIndicator } from './LoadingIndicator';

interface EditorProps {
    analysisId?: string | null;
    resumeFile: FileData;
    resumeText?: string;
    jobDescription: string;
    analysis: AnalysisResult;
    isPaid: boolean;
    onPaymentSuccess: () => void;
    appLanguage: string;
    setAppLanguage: (lang: string) => void;
}

const ACCENT_COLORS = [
    { name: 'Pure Orange', value: '#F97316' },
    { name: 'Zinc White', value: '#F4F4F5' },
    { name: 'Muted Gray', value: '#71717A' },
];

const LANGUAGES = [
    "English", "Spanish", "French", "German", "Hindi", "Portuguese", "Japanese", "Korean"
];

const ATS_OPTIMIZE_DEFAULT_PROMPT = `HIRE SCHEMA — MASTER RESUME INTELLIGENCE PROMPT (V3 – FINAL)

Use this as the GLOBAL SYSTEM PROMPT for HireSchema

CORE IDENTITY (NON-NEGOTIABLE)
You are HireSchema, a Resume Intelligence & Verification Engine.

You do NOT optimize for keyword count.
You do NOT mirror job descriptions.
You do NOT invent experience.

You optimize for:
- Truth
- Credibility
- ATS semantic alignment
- Recruiter trust

If forced to choose, ALWAYS prioritize truth over ATS.

ULTIMATE OBJECTIVE
Produce the strongest possible resume that:
1. Is factually accurate
2. Passes modern ATS systems
3. Sounds written by a competent human
4. Survives recruiter + interview scrutiny
5. Aligns with the job WITHOUT imitation

ABSOLUTE HARD-STOP CONDITIONS
If ANY of the following occur, you MUST self-correct before output:
- Keyword stuffing
- Repetition of JD phrases
- Tool-first bullet points
- Buzzword inflation
- Experience exaggeration
- Section-level keyword clustering
- Resume reads like SEO content

MULTI-LAYER INTELLIGENCE PIPELINE (MANDATORY)
LAYER 1: EXPERIENCE AS SOURCE OF TRUTH
Resume = Evidence
JD = Reference
Rules:
- NOTHING enters the resume unless supported by evidence
- JD keywords are suggestions, not requirements
- Absence of evidence = no keyword

LAYER 2: SKILL & KEYWORD DECOMPOSITION
For EACH JD keyword, decompose internally into:
1. Skill Type:
   - Tool
   - Function
   - Outcome
   - Responsibility
   - Contextual language
2. Proof Requirement:
   - Direct proof
   - Indirect proof
   - No proof
If No proof → keyword is banned.

LAYER 3: ELIGIBILITY GATE (STRICT)
A keyword is eligible ONLY if:
- Resume shows ownership or execution
- The task can be defended verbally
- The keyword fits naturally in a sentence
Fail ANY → keyword is rejected.

FREQUENCY & DISTRIBUTION GOVERNOR (CRITICAL)
GLOBAL MAX LIMITS:
Tool keywords (Excel, SQL): ≤ 2 total
Functional skills: ≤ 1 total
Outcome concepts: ≤ 1 total
Buzzwords: 0 (default)
PER SECTION:
- No keyword may appear more than once per section
No override allowed. Ever.

SEMANTIC DIVERSITY ENFORCER
If a keyword is used once:
→ Subsequent mentions MUST be meaningfully different
→ Synonyms must not share the same root or ATS stem
Example:
inventory management / inventory oversight (bad)
stock coordination / supply tracking (good)

EXPERIENCE-FIRST BULLET FORMULA (MANDATORY)
ALL bullets MUST follow this structure:
Action → Scope → Impact → Evidence → Tool (optional)
Rules:
- Tools are optional, outcomes are not
- Tools NEVER lead sentences
- Impact must be measurable or observable

ATS SIMULATION ENGINE (ADVANCED)
ATS looks for:
- Contextual relevance
- Skill-to-task mapping
- Natural phrasing
ATS penalizes:
- Repetition
- Keyword clusters
- Copy-paste JD language
If detected → rewrite.

RECRUITER TRUST SIMULATION (MANDATORY)
Ask internally for EACH bullet:
“Would a senior recruiter believe this without raising an eyebrow?”
“Could the candidate explain this confidently in an interview?”
If NO → rewrite or remove.

HIGH-RISK KEYWORD FIREWALL
Excel: Allowed ONLY if resume shows analysis/reporting/tracking/modeling; else use “data analysis tools”.
Large Data Sets: Allowed ONLY if scale/frequency/volume is explicit; else use “operational data”.
Inventory Management: Allowed ONLY if ownership/accountability is proven; else use “stock tracking” or “supply coordination”.
Customer Experience: Allowed ONLY if direct customer interaction OR CX outcomes exist; else use “customer interactions” or “service delivery”.

5-STAGE SELF-VERIFICATION LOOP (MANDATORY)
Stage 1: Truth Audit (no invented skills, no inflated scope, no assumption-based rewriting)
Stage 2: Keyword Abuse Scan (no repeated phrases, no density patterns, no ATS baiting)
Stage 3: Semantic Quality Check (replace robotic/templated language; natural professional tone)
Stage 4: ATS + Human Balance Test (must pass BOTH)
Stage 5: Interview Survival Test (if asked, answer must exist)
If any stage fails → redo silently.

FINAL OUTPUT GUARANTEES
- Read like lived experience
- Avoid keyword gaming
- ATS-safe by structure, not spam
- Increase interview probability without risk

FINAL INTERNAL CHECK (DO NOT SKIP)
- No keyword exceeds limits
- No JD sentence is mirrored
- No tool is overused
- Resume sounds human, confident, credible`;

export const Editor: React.FC<EditorProps> = ({
    analysisId,
    resumeFile,
    resumeText = '',
    jobDescription,
    analysis,
    isPaid,
    onPaymentSuccess,
    appLanguage,
    setAppLanguage
}) => {
    // --- STATE ---
    const [activeTab, setActiveTab] = useState<GeneratorType>(GeneratorType.ATS_RESUME);
    const [generatedData, setGeneratedData] = useState<Record<string, string>>({});
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
    const [generationErrors, setGenerationErrors] = useState<Record<string, string>>({});
    const [optimizedScore, setOptimizedScore] = useState<number | null>(null);
    const [accentColor, setAccentColor] = useState(ACCENT_COLORS[0]);
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const [chatInput, setChatInput] = useState("");
    const [isRefining, setIsRefining] = useState(false);
    const [refineLabel, setRefineLabel] = useState<string>("");
    const [localResumeText, setLocalResumeText] = useState(resumeText);
    const [isEditing, setIsEditing] = useState(false);
    const [isCompare, setIsCompare] = useState(false);
    const [showCopyToast, setShowCopyToast] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [removeRiskyKeywords, setRemoveRiskyKeywords] = useState(false);
    const [complianceReports, setComplianceReports] = useState<Record<string, ResumeComplianceReport | null>>({});
    const [isComplianceOpen, setIsComplianceOpen] = useState(false);
    const [keywordApplyStatus, setKeywordApplyStatus] = useState<Record<string, boolean>>({});

    const pdfRef = useRef<HTMLDivElement>(null);
    const previewPdfRef = useRef<HTMLDivElement>(null);
    const lastLanguageRef = useRef(appLanguage);

    const isMeaningfulText = (value: string) => {
        const trimmed = (value || '').trim();
        if (!trimmed) return false;
        const lowered = trimmed.toLowerCase();
        return !['not provided', 'n/a', 'na', 'none', 'null', 'undefined', '-'].includes(lowered);
    };

    const normalizeUrl = (value: string) => {
        const trimmed = (value || '').trim();
        if (!trimmed) return '';
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        return `https://${trimmed.replace(/^\/+/, '')}`;
    };

    const toTelHref = (value: string) => {
        const digits = (value || '').replace(/[^\d+]/g, '');
        return digits ? `tel:${digits}` : '';
    };

    const renderContactHeader = () => {
        if (activeTab !== GeneratorType.ATS_RESUME) return null;
        const profile = analysis.contactProfile || { name: '', email: '', phone: '', linkedin: '', location: '' };
        const name = (profile.name || '').trim();
        const email = (profile.email || '').trim();
        const phone = (profile.phone || '').trim();
        const linkedin = (profile.linkedin || '').trim();
        const location = (profile.location || '').trim();

        const items: Array<{ key: string; node: React.ReactNode }> = [
            isMeaningfulText(phone) ? { key: 'phone', node: <a className="hover:underline" href={toTelHref(phone)}>{phone}</a> } : null,
            isMeaningfulText(email) ? { key: 'email', node: <a className="hover:underline" href={`mailto:${email}`}>{email}</a> } : null,
            isMeaningfulText(location) ? { key: 'location', node: <span>{location}</span> } : null,
            isMeaningfulText(linkedin)
                ? { key: 'linkedin', node: <a className="hover:underline" href={normalizeUrl(linkedin)} target="_blank" rel="noopener noreferrer">LinkedIn</a> }
                : null
        ].filter(Boolean) as Array<{ key: string; node: React.ReactNode }>;

        if (!name && items.length === 0) return null;

        return (
            <div className="mb-6">
                {name && (
                    <h1 className="text-4xl font-black uppercase tracking-tight mb-2 border-b-2 pb-2 text-black" style={{ borderColor: accentColor.value }}>
                        {name}
                    </h1>
                )}
                {items.length > 0 && (
                    <p className="text-sm text-zinc-700 font-bold">
                        {items.map((item, idx) => (
                            <React.Fragment key={item.key}>
                                {idx > 0 && <span className="px-2 text-zinc-400">•</span>}
                                {item.node}
                            </React.Fragment>
                        ))}
                    </p>
                )}
            </div>
        );
    };

    const markdownToPlainText = (markdown: string) => {
        const input = (markdown || '').replace(/\r\n/g, '\n');
        const withoutLinks = input.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
        const withoutFormatting = withoutLinks
            .replace(/[*_`>#]/g, '')
            .replace(/^\s*[-+]\s+/gm, '')
            .replace(/^\s*\d+\.\s+/gm, '')
            .replace(/\s+/g, ' ')
            .replace(/\n\s+/g, '\n')
            .trim();
        return withoutFormatting;
    };

    const normalizeLine = (line: string) => line.trim().toLowerCase().replace(/\s+/g, ' ');

    const buildOptimizedPlainText = () => {
        const profile = analysis.contactProfile || { name: '', email: '', phone: '', linkedin: '', location: '' };
        const name = isMeaningfulText(profile.name) ? profile.name.trim() : '';
        const parts = [
            isMeaningfulText(profile.phone) ? profile.phone.trim() : '',
            isMeaningfulText(profile.email) ? profile.email.trim() : '',
            isMeaningfulText(profile.location) ? profile.location.trim() : '',
            isMeaningfulText(profile.linkedin) ? `LinkedIn: ${normalizeUrl(profile.linkedin.trim())}` : ''
        ].filter(Boolean);
        const header = [name, parts.join(' • ')].filter(Boolean).join('\n');
        const body = markdownToPlainText(generatedData[activeTab] || '');
        return [header, body].filter(Boolean).join('\n');
    };

    const renderCompareView = () => {
        const original = (localResumeText || '').trim();
        const optimized = buildOptimizedPlainText();

        const originalLines = original.split(/\r?\n/);
        const optimizedLines = optimized.split(/\r?\n/);

        const originalSet = new Set(originalLines.map(normalizeLine).filter(Boolean));
        const optimizedSet = new Set(optimizedLines.map(normalizeLine).filter(Boolean));

        const highlightKeywords = (line: string) => {
            const keywords = (analysis.missingKeywords || []).filter(Boolean).slice(0, 30);
            if (keywords.length === 0) return [line];
            const escaped = keywords
                .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                .filter(Boolean);
            if (escaped.length === 0) return [line];
            const re = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
            const parts: React.ReactNode[] = [];
            let lastIndex = 0;
            let m: RegExpExecArray | null;
            while ((m = re.exec(line)) !== null) {
                const start = m.index;
                const end = start + m[0].length;
                if (start > lastIndex) parts.push(line.slice(lastIndex, start));
                parts.push(
                    <span key={`${start}-${end}`} className="bg-orange-500/20 text-white px-1 rounded-sm border border-orange-500/20">
                        {line.slice(start, end)}
                    </span>
                );
                lastIndex = end;
            }
            if (lastIndex < line.length) parts.push(line.slice(lastIndex));
            return parts.length > 0 ? parts : [line];
        };

        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-zinc-50 border border-zinc-200 rounded-sm overflow-hidden">
                    <div className="px-3 py-2 border-b border-zinc-200 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Original</span>
                        <span className="text-[10px] font-bold text-zinc-500">{originalLines.length} lines</span>
                    </div>
                    <div className="h-[700px] overflow-auto font-mono text-xs text-zinc-800">
                        {originalLines.map((line, idx) => {
                            const isRemoved = line.trim() && !optimizedSet.has(normalizeLine(line));
                            return (
                                <div key={idx} className={`px-3 py-0.5 whitespace-pre-wrap ${isRemoved ? 'bg-red-50 text-red-900' : ''}`}>
                                    {line || ' '}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-zinc-50 border border-zinc-200 rounded-sm overflow-hidden">
                    <div className="px-3 py-2 border-b border-zinc-200 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Optimized</span>
                        <span className="text-[10px] font-bold text-zinc-500">{optimizedLines.length} lines</span>
                    </div>
                    <div className="h-[700px] overflow-auto font-mono text-xs text-zinc-800">
                        {optimizedLines.map((line, idx) => {
                            const isAdded = line.trim() && !originalSet.has(normalizeLine(line));
                            return (
                                <div key={idx} className={`px-3 py-0.5 whitespace-pre-wrap ${isAdded ? 'bg-emerald-50 text-emerald-900' : ''}`}>
                                    {highlightKeywords(line)}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    // --- INITIALIZATION & AUTO-GENERATION ---
    useEffect(() => {
        setLocalResumeText(resumeText || '');
    }, [resumeText]);

    const dedupeKeywords = (keywords: string[]) => {
        const out: string[] = [];
        const seen = new Set<string>();
        for (const k of keywords.filter(Boolean)) {
            const key = k.trim().toLowerCase();
            if (!key || seen.has(key)) continue;
            seen.add(key);
            out.push(k.trim());
        }
        return out;
    };

    const buildTargetKeywordsForCompliance = (resumeText: string, jd: string, missingKeywords: string[]) => {
        const mustInclude = getMustIncludeSkills(resumeText, jd);
        const jdSignals = prioritizeKeywords(missingKeywords || []).slice(0, 14);
        const highRisk = ['Excel', 'Large Data Sets', 'Inventory Management', 'Customer Experience'];
        return dedupeKeywords([...mustInclude, ...jdSignals, ...highRisk]);
    };

    const buildAutofixInstruction = (report: ResumeComplianceReport) => {
        const hard = report.issues.filter(i => i.severity === 'hard');
        const needRemove = hard.filter(i => i.validator === 'experience_evidence' || i.validator === 'remove_risky_keywords');
        const needFreq = hard.filter(i => i.validator === 'keyword_frequency');
        const needMirror = hard.filter(i => i.validator === 'jd_phrase_mirroring');

        const removals = dedupeKeywords(
            needRemove
                .map(i => String(i.details?.keyword || '').trim())
                .filter(Boolean)
        );

        const freqKeywords = dedupeKeywords(
            needFreq
                .map(i => String(i.details?.keyword || '').trim())
                .filter(Boolean)
        );

        const replacementHints = removals
            .map(k => {
                const row = report.keyword_justifications.find(j => (j.keyword || '').toLowerCase() === k.toLowerCase());
                if (!row?.alternative_used) return '';
                return `${k} → ${row.alternative_used}`;
            })
            .filter(Boolean);

        return [
            `Run the HireSchema rule validators and fix violations without inventing experience.`,
            `Hard rules: do not mirror JD phrases; remove keyword stuffing; tools never lead bullets; preserve truth.`,
            removals.length > 0 ? `Remove or rewrite these unsupported/high-risk terms (use experience-based phrasing): ${removals.join(', ')}.` : '',
            replacementHints.length > 0 ? `Preferred replacements: ${replacementHints.join('; ')}.` : '',
            freqKeywords.length > 0 ? `Reduce repetition to meet caps for: ${freqKeywords.join(', ')}.` : '',
            needMirror.length > 0 ? `Rewrite any sentence that copies the JD phrasing. Keep meaning, change wording.` : '',
            `Return ONLY the resume. Keep headings as: ## SUMMARY, ## EXPERIENCE, ## SKILLS, ## EDUCATION.`
        ].filter(Boolean).join('\n');
    };

    const runComplianceAndAutofix = async (markdown: string) => {
        const targetKeywords = buildTargetKeywordsForCompliance(localResumeText, jobDescription, analysis.missingKeywords || []);
        let current = markdown;
        let report = validateResumeMarkdown({
            markdown: current,
            jobDescription,
            originalResumeText: localResumeText,
            targetKeywords,
            removeRiskyKeywords
        });

        for (let i = 0; i < 2; i += 1) {
            const hard = report.issues.filter(x => x.severity === 'hard');
            if (hard.length === 0) break;
            const prompt = buildAutofixInstruction(report);
            const rewritten = await refineAtsResumeContent(current, prompt, jobDescription, localResumeText);
            current = normalizeAtsResumeMarkdown(rewritten);
            report = validateResumeMarkdown({
                markdown: current,
                jobDescription,
                originalResumeText: localResumeText,
                targetKeywords,
                removeRiskyKeywords
            });
        }

        setComplianceReports(prev => ({ ...prev, [GeneratorType.ATS_RESUME]: report }));
        return { markdown: current, report };
    };

    const applyKeywordOnce = async (keyword: KeywordJustification) => {
        if (!isPaid) return;
        const currentMarkdown = generatedData[GeneratorType.ATS_RESUME];
        if (!currentMarkdown) return;
        const key = (keyword.keyword || '').trim().toLowerCase();
        if (!key) return;
        if (keywordApplyStatus[key]) return;

        setKeywordApplyStatus(prev => ({ ...prev, [key]: true }));
        try {
            const replacement = keyword.alternative_used ? keyword.alternative_used : '';
            const evidenceHint = keyword.resume_evidence ? `Resume evidence to anchor on: "${keyword.resume_evidence}".` : '';
            const instruction = [
                `One-click keyword apply: integrate "${keyword.keyword}" exactly once into the resume ONLY if supported by the ORIGINAL resume.`,
                `Do NOT mirror JD sentences. Do NOT keyword-stuff. Tools never lead bullets.`,
                `If "${keyword.keyword}" is unsupported, DO NOT add it. ${replacement ? `Instead, use this experience-based alternative (once, max): "${replacement}".` : ''}`,
                evidenceHint,
                `Preferred placement: ## SKILLS (single, natural mention). If it truly belongs in EXPERIENCE, integrate into an existing bullet without changing meaning or inventing metrics.`,
                `Hard caps still apply. Return ONLY the resume with the same headings.`
            ].filter(Boolean).join('\n');

            const updated = await refineAtsResumeContent(currentMarkdown, instruction, jobDescription, localResumeText);
            let normalized = normalizeAtsResumeMarkdown(updated);
            const compliance = await runComplianceAndAutofix(normalized);
            normalized = compliance.markdown;
            setGeneratedData(prev => ({ ...prev, [GeneratorType.ATS_RESUME]: normalized }));
            const score = await calculateImprovedScore(normalized, jobDescription);
            setOptimizedScore(score);
        } finally {
            setKeywordApplyStatus(prev => ({ ...prev, [key]: false }));
        }
    };

    const extractJobMinYears = (jd: string): number | null => {
        const text = (jd || '').replace(/\s+/g, ' ').trim();
        if (!text) return null;
        const patterns = [
            /\bminimum\s+of\s+(\d{1,2})\s*\+?\s*(?:years?|yrs?)\b/i,
            /\b(\d{1,2})\s*\+?\s*(?:years?|yrs?)\s+(?:of\s+)?experience\b/i,
            /\brequires?\s+(\d{1,2})\s*\+?\s*(?:years?|yrs?)\b/i
        ];
        for (const re of patterns) {
            const m = text.match(re);
            if (!m) continue;
            const n = Number(m[1]);
            if (Number.isFinite(n) && n > 0 && n < 50) return n;
        }
        return null;
    };

    const JD_SKILL_CANDIDATES = [
        'Excel',
        'Google Sheets',
        'Power BI',
        'Tableau',
        'SQL',
        'Python',
        'AWS',
        'Amazon Web Services',
        'Azure',
        'Microsoft Azure',
        'GCP',
        'Google Cloud Platform',
        'JavaScript',
        'TypeScript',
        'React',
        'Node',
        'Docker',
        'Kubernetes',
        'Git',
        'Jira',
        'Agile',
        'Scrum',
        'ETL',
        'CI/CD'
    ];

    const getMustIncludeSkills = (resumeText: string, jd: string) => {
        const out: string[] = [];
        const seen = new Set<string>();
        for (const skill of JD_SKILL_CANDIDATES) {
            const key = skill.toLowerCase();
            if (seen.has(key)) continue;
            if (!includesKeyword(jd, skill)) continue;
            if (!includesKeyword(resumeText, skill)) continue;
            seen.add(key);
            out.push(skill);
        }
        return out.slice(0, 12);
    };

    const generateTabContent = async (tab: GeneratorType, force = false) => {
        if (!isPaid || !localResumeText) return;
        if (loadingStates[tab]) return;
        if (!force && generatedData[tab]) return;

        setLoadingStates(prev => ({ ...prev, [tab]: true }));
        setGenerationErrors(prev => ({ ...prev, [tab]: '' }));
        try {
            const content = await generateContent(tab, resumeFile, jobDescription, analysis, {
                verifiedProfile: analysis.contactProfile,
                language: appLanguage,
                resumeText: localResumeText
            });
            let normalized = tab === GeneratorType.ATS_RESUME ? normalizeAtsResumeMarkdown(content) : content;
            if (tab === GeneratorType.ATS_RESUME) {
                try {
                    const minYears = extractJobMinYears(jobDescription);
                    const mustIncludeSkills = getMustIncludeSkills(localResumeText, jobDescription);
                    const jdSignals = prioritizeKeywords(analysis.missingKeywords || []).slice(0, 12);
                    const targetTerms = dedupeKeywords([...mustIncludeSkills, ...jdSignals]);
                    const keywordRules = `Keyword governor (V3): Tool terms may appear up to 2 times total. All other target terms may appear up to 1 time total. No target term may appear more than once per section. Do not cluster terms. Do not mirror JD phrases.`;
                    const basePrompt = [
                        ATS_OPTIMIZE_DEFAULT_PROMPT,
                        keywordRules,
                        targetTerms.length > 0
                            ? `JD reference signals (do not force; use ONLY if supported by the ORIGINAL resume and natural): ${targetTerms.join(', ')}.`
                            : '',
                        mustIncludeSkills.length > 0
                            ? `Ensure these skills/tools (already present in the ORIGINAL resume and mentioned in the JD) appear in the final resume, preferably in ## SKILLS: ${mustIncludeSkills.join(', ')}.`
                            : '',
                        minYears
                            ? `The JD mentions a minimum of ${minYears}+ years of experience. If (and only if) the ORIGINAL resume dates support it, state "${minYears}+ years" in the SUMMARY. Otherwise omit.`
                            : '',
                        `Do not add new claims. Do not change employers/titles/dates. Do not remove any existing skills/tools/technologies from the ORIGINAL resume text. Do not imitate or copy JD sentences. Prefer experience-first bullets (action → scope → impact → evidence → tool optional).`
                    ].filter(Boolean).join('\n');
                    const boosted = await refineAtsResumeContent(normalized, basePrompt, jobDescription, localResumeText);
                    normalized = normalizeAtsResumeMarkdown(boosted);

                    if (mustIncludeSkills.length > 0) {
                        const stillMissingSkills = mustIncludeSkills.filter(s => !includesKeyword(normalized, s));
                        if (stillMissingSkills.length > 0) {
                            const skillPassPrompt = [
                                `Final pass: ensure key JD skills that are already in the ORIGINAL resume are present in the final output.`,
                                keywordRules,
                                `Missing (but present in resume + JD): ${stillMissingSkills.join(', ')}.`,
                                `Add them to ## SKILLS (or existing bullets) without inventing any new claims. Keep formatting clean and ATS-friendly.`,
                                `Return ONLY the resume. Keep headings as: ## SUMMARY, ## EXPERIENCE, ## SKILLS, ## EDUCATION.`
                            ].join('\n');
                            const boosted3 = await refineAtsResumeContent(normalized, skillPassPrompt, jobDescription, localResumeText);
                            normalized = normalizeAtsResumeMarkdown(boosted3);
                        }
                    }

                    const compliance = await runComplianceAndAutofix(normalized);
                    normalized = compliance.markdown;
                } catch {}
            }
            setGeneratedData(prev => ({ ...prev, [tab]: normalized }));
            if (tab === GeneratorType.ATS_RESUME) {
                const score = await calculateImprovedScore(normalized, jobDescription);
                setOptimizedScore(score);
            }
        } catch (err: any) {
            const message = err?.message || 'Failed to generate content.';
            setGenerationErrors(prev => ({ ...prev, [tab]: message }));
        } finally {
            setLoadingStates(prev => ({ ...prev, [tab]: false }));
        }
    };

    useEffect(() => {
        if (!isPaid || !localResumeText) return;
        const languageChanged = lastLanguageRef.current !== appLanguage;
        if (languageChanged) lastLanguageRef.current = appLanguage;
        const shouldGenerate = languageChanged || !generatedData[activeTab];
        if (shouldGenerate) {
            generateTabContent(activeTab, true);
        }
    }, [activeTab, isPaid, localResumeText, appLanguage]);

    useEffect(() => {
        if (!isPaid) return;
        if (activeTab !== GeneratorType.ATS_RESUME) return;
        const current = generatedData[GeneratorType.ATS_RESUME];
        if (!current) return;
        if (loadingStates[GeneratorType.ATS_RESUME] || isRefining) return;
        runComplianceAndAutofix(current).then(res => {
            if (res.markdown !== current) {
                setGeneratedData(prev => ({ ...prev, [GeneratorType.ATS_RESUME]: res.markdown }));
            }
        }).catch(() => {});
    }, [removeRiskyKeywords]);

    useEffect(() => {
        if (!isPaid) return;
        setActiveTab(GeneratorType.ATS_RESUME);
    }, [isPaid]);

    useEffect(() => {
        if (isEditing) setIsCompare(false);
    }, [isEditing]);

    useEffect(() => {
        setIsCompare(false);
    }, [activeTab]);

    const activeError = generationErrors[activeTab] || '';
    const activeCompliance = complianceReports[GeneratorType.ATS_RESUME] || null;
    const displayedScore = activeTab === GeneratorType.ATS_RESUME
        ? (activeCompliance?.scoring.ats_score ?? optimizedScore ?? analysis.atsScore)
        : (analysis.atsScore);
    const displayedRecruiterScore = activeTab === GeneratorType.ATS_RESUME
        ? (activeCompliance?.scoring.recruiter_score ?? analysis.dualScoring?.recruiter_score ?? analysis.recruiterScore ?? null)
        : null;

    // --- ACTIONS ---
    const handleRefine = async (customPrompt?: string, label?: string) => {
        const prompt = customPrompt || chatInput;
        console.log('[Editor] handleRefine called with prompt:', prompt);
        console.log('[Editor] Current activeTab:', activeTab);
        console.log('[Editor] Has generatedData for activeTab:', !!generatedData[activeTab]);

        if (!prompt.trim() || !generatedData[activeTab]) {
            console.warn('[Editor] handleRefine aborted: prompt empty or no content to refine');
            return;
        }

        setIsRefining(true);
        setRefineLabel(label || 'Optimizing');
        try {
            console.log('[Editor] Calling refineContent...');
            const newContent = activeTab === GeneratorType.ATS_RESUME
                ? await refineAtsResumeContent(generatedData[activeTab], prompt, jobDescription, localResumeText)
                : await refineContent(generatedData[activeTab], prompt, jobDescription);
            console.log('[Editor] refineContent success, updating state');
            let normalized = activeTab === GeneratorType.ATS_RESUME ? normalizeAtsResumeMarkdown(newContent) : newContent;
            if (activeTab === GeneratorType.ATS_RESUME) {
                const compliance = await runComplianceAndAutofix(normalized);
                normalized = compliance.markdown;
            }
            setGeneratedData(prev => ({ ...prev, [activeTab]: normalized }));
            setChatInput("");
            if (activeTab === GeneratorType.ATS_RESUME) {
                const score = await calculateImprovedScore(normalized, jobDescription);
                setOptimizedScore(score);
            }
        } catch (err) {
            console.error('[Editor] handleRefine failed:', err);
        } finally {
            setIsRefining(false);
            setRefineLabel("");
        }
    };

    const handleCopy = () => {
        if (generatedData[activeTab]) {
            const toCopy = activeTab === GeneratorType.ATS_RESUME
                ? buildOptimizedPlainText()
                : generatedData[activeTab];
            navigator.clipboard.writeText(toCopy);
            setShowCopyToast(true);
            setTimeout(() => setShowCopyToast(false), 2000);
        }
    };

    const handlePrint = () => {
        if (!pdfRef.current) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Resume - HireSchema</title>
                    <style>
                        body { font-family: sans-serif; padding: 40px; }
                        h1 { color: ${accentColor.value}; border-bottom: 2px solid ${accentColor.value}; }
                        h2 { color: #333; margin-top: 20px; }
                        ul { padding-left: 20px; }
                        li { margin-bottom: 5px; }
                    </style>
                </head>
                <body>${pdfRef.current.innerHTML}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    const handleDownloadPDF = async () => {
        if (!generatedData[activeTab] || !pdfRef.current) return;
        const getHtml2Pdf = async (): Promise<any> => {
            const w = window as any;
            if (typeof w.html2pdf === 'function') return w.html2pdf;
            try {
                const mod: any = await import('html2pdf.js');
                const fn = mod?.default || mod;
                if (typeof fn === 'function') {
                    w.html2pdf = fn;
                    return fn;
                }
            } catch {}
            return null;
        };

        setIsDownloading(true);
        try {
            const html2pdf = await getHtml2Pdf();
            if (!html2pdf) {
                throw new Error('PDF export library unavailable');
            }
            const element = pdfRef.current;
            // Ensure fonts/layout are settled before rasterizing for PDF
            // @ts-ignore
            if (document.fonts?.ready) {
                // @ts-ignore
                await document.fonts.ready;
            }
            await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
            await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

            const exportWidth = Math.max(794, element.clientWidth);
            const exportHeight = Math.max(1123, element.scrollHeight);
            const maxCanvasHeight = 30000;
            const preferredScale = 2;
            const minScale = 0.25;
            const safeScale = Math.max(minScale, Math.min(preferredScale, maxCanvasHeight / exportHeight));
            const opt = {
                margin: [4, 4, 6, 4],
                filename: `HireSchema_Optimized_${activeTab.replace(/\s+/g, '_')}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                enableLinks: true,
                html2canvas: { 
                    scale: safeScale, 
                    useCORS: true, 
                    letterRendering: true,
                    scrollX: 0,
                    scrollY: 0,
                    x: 0,
                    y: 0,
                    windowWidth: exportWidth,
                    windowHeight: exportHeight,
                    logging: false,
                    backgroundColor: '#ffffff',
                    onclone: (clonedDoc: Document) => {
                        const clonedContainer = clonedDoc.querySelector('.pdf-export-container') as HTMLElement | null;
                        if (clonedContainer) {
                            clonedContainer.style.position = 'relative';
                            clonedContainer.style.left = '0';
                            clonedContainer.style.top = '0';
                        }
                    }
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
                pagebreak: { mode: ['css', 'legacy'] }
            };
            await html2pdf().set(opt).from(element).save();
        } catch (err) {
            console.error('PDF Generation Error:', err);
            alert('Unable to generate a PDF right now. Please try again in a moment.');
        } finally {
            setIsDownloading(false);
        }
    };

    // --- RENDER HELPERS ---
    const markdownText = (node: any): string => {
        if (node == null) return '';
        if (typeof node === 'string' || typeof node === 'number') return String(node);
        if (Array.isArray(node)) return node.map(markdownText).join('');
        if (typeof node === 'object' && 'props' in node) return markdownText((node as any).props?.children);
        return '';
    };

    const normalizeRichText = (raw: string, tab: GeneratorType) => {
        const input = (raw || '').replace(/\r\n/g, '\n');
        const trimmed = input.trim();
        if (!trimmed) return '';

        const looksLikeMarkdown =
            /(^|\n)\s*#{1,6}\s+\S+/.test(input) ||
            /(^|\n)\s*([-*+]\s+|\d+\.\s+)\S+/.test(input) ||
            /```/.test(input);

        if (looksLikeMarkdown) return input;
        if (tab === GeneratorType.INTERVIEW_PREP) return input;

        const lines = input.split('\n').map((line) => line.replace(/\s+$/g, ''));
        const out: string[] = [];
        for (const line of lines) {
            const t = line.trim();
            if (!t) {
                out.push('');
                continue;
            }
            if (/^[•·]\s*/.test(t)) {
                out.push(`- ${t.replace(/^[•·]\s*/, '')}`);
                continue;
            }
            out.push(t);
            out.push('');
        }
        return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    };

    const renderMarkdown = (content: string) => {
        const isCover = activeTab === GeneratorType.COVER_LETTER;
        const isInterview = activeTab === GeneratorType.INTERVIEW_PREP;
        const isGaps = activeTab === GeneratorType.LEARNING_PATH;

        const containerClassName = [
            'prose prose-zinc max-w-none',
            'prose-headings:tracking-tight',
            'prose-p:leading-relaxed',
            'prose-li:leading-relaxed',
            'text-zinc-900'
        ].join(' ');

        const displayContent = normalizeRichText(content, activeTab);

        return (
            <article className={containerClassName}>
                <ReactMarkdown
                    remarkPlugins={isInterview ? [remarkGfm, remarkBreaks] : [remarkGfm]}
                    components={{
                        h1: ({ ...props }) => (
                            <h1
                                className={`tracking-tight mb-6 ${isCover ? 'text-2xl sm:text-3xl font-black text-zinc-900 uppercase' : 'text-4xl font-black'} border-b-2 pb-4`}
                                style={{ borderColor: accentColor.value }}
                                {...props}
                            />
                        ),
                        h2: ({ ...props }) => (
                            <h2
                                className={`${isCover ? 'text-lg sm:text-xl font-bold tracking-tight mt-8 mb-4 text-zinc-800' : 'text-lg font-black tracking-widest mt-12 mb-4'} `}
                                style={!isCover ? { color: accentColor.value } : {}}
                                {...props}
                            />
                        ),
                        h3: ({ ...props }) => (
                            <h3 className={`${isCover ? 'text-base font-bold mt-6 mb-3 text-zinc-900' : 'text-base font-bold mt-6 mb-2 text-zinc-900'}`} {...props} />
                        ),
                        p: ({ ...props }) => {
                            const text = markdownText(props.children).trim();
                            if (isInterview) {
                                const lower = text.toLowerCase();
                                if (lower.startsWith('q:') || lower.startsWith('question:')) {
                                    return (
                                        <div className="mt-5 mb-3 p-4 rounded-xl border border-zinc-200 bg-zinc-50">
                                            <div className="text-[11px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">Question</div>
                                            <p className="text-sm sm:text-base font-semibold leading-relaxed text-zinc-900" {...props} />
                                        </div>
                                    );
                                }
                                if (lower.startsWith('a:') || lower.startsWith('answer:')) {
                                    return (
                                        <div className="mb-4 p-4 rounded-xl border border-zinc-200 bg-white">
                                            <div className="text-[11px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">Answer</div>
                                            <p className="text-sm sm:text-base leading-relaxed text-zinc-800" {...props} />
                                        </div>
                                    );
                                }
                            }
                            return (
                                <p
                                    className={`${isCover ? 'text-base sm:text-[15px] leading-7 text-zinc-800 mb-6 font-medium' : 'text-sm sm:text-base leading-relaxed text-zinc-800 mb-4'}`}
                                    {...props}
                                />
                            );
                        },
                        ul: ({ ...props }) => (
                            <ul className={`${isCover ? 'my-6 pl-5 list-disc space-y-2 marker:text-zinc-400' : 'space-y-3 my-6'}`} {...props} />
                        ),
                        ol: ({ ...props }) => (
                            <ol className={`${isCover ? 'my-6 pl-5 list-decimal space-y-2 marker:text-zinc-500' : 'my-6 pl-6 list-decimal space-y-3'}`} {...props} />
                        ),
                        li: ({ ...props }) => {
                            if (isCover) return <li className="text-base sm:text-[15px] leading-7 text-zinc-800 pl-1" {...props} />;
                            if (isGaps) return <li className="text-sm sm:text-base text-zinc-800 leading-relaxed" {...props} />;
                            return (
                                <li className="flex items-start gap-3 text-sm sm:text-base text-zinc-800">
                                    <span className="mt-2 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accentColor.value }} />
                                    <span>{props.children}</span>
                                </li>
                            );
                        },
                        blockquote: ({ ...props }) => (
                            <blockquote
                                className="my-8 pl-6 border-l-4 text-zinc-600 italic text-lg leading-relaxed bg-zinc-50 py-4 pr-4 rounded-r-lg"
                                style={{ borderColor: accentColor.value }}
                                {...props}
                            />
                        ),
                        a: ({ ...props }) => (
                            <a className="text-orange-600 underline underline-offset-2 hover:text-orange-500" target="_blank" rel="noopener noreferrer" {...props} />
                        ),
                        hr: ({ ...props }) => <hr className="my-8 border-zinc-200" {...props} />,
                        code: ({ inline, className, children, ...props }: any) => {
                            if (inline) {
                                return (
                                    <code className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-900 font-mono text-[0.85em]" {...props}>
                                        {children}
                                    </code>
                                );
                            }
                            return (
                                <code className={`block font-mono text-xs sm:text-sm text-zinc-100 ${className || ''}`} {...props}>
                                    {children}
                                </code>
                            );
                        },
                        pre: ({ ...props }) => (
                            <pre className="my-6 p-4 rounded-xl bg-zinc-950 overflow-x-auto border border-zinc-800" {...props} />
                        ),
                        table: ({ ...props }) => (
                            <div className="my-6 overflow-x-auto border border-zinc-200 rounded-xl">
                                <table className="min-w-full text-sm" {...props} />
                            </div>
                        ),
                        thead: ({ ...props }) => <thead className="bg-zinc-50" {...props} />,
                        th: ({ ...props }) => <th className="text-left px-3 py-2 font-black text-xs uppercase tracking-widest text-zinc-600 border-b border-zinc-200" {...props} />,
                        td: ({ ...props }) => <td className="px-3 py-2 text-zinc-800 border-b border-zinc-100 align-top" {...props} />,
                        input: ({ ...props }) => (
                            <input
                                {...props}
                                className="mr-2 accent-orange-600"
                                type="checkbox"
                                disabled
                            />
                        ),
                        strong: ({ ...props }) => <strong className="font-bold text-black" {...props} />
                    }}
                >
                    {displayContent}
                </ReactMarkdown>
            </article>
        );
    };

    return (
        <div className="flex flex-col h-full bg-black text-white font-sans overflow-hidden">
            
            {/* --- TOP BAR --- */}
            <div className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-zinc-950/50 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Workspace</span>
                    </div>
                    
                    <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-white/5">
                        {[
                            { id: GeneratorType.ATS_RESUME, label: 'Resume', icon: FileText },
                            { id: GeneratorType.COVER_LETTER, label: 'Cover', icon: Mail },
                            { id: GeneratorType.INTERVIEW_PREP, label: 'Interview', icon: MessageSquare },
                            { id: GeneratorType.LEARNING_PATH, label: 'Gaps', icon: GraduationCap },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <tab.icon className={`w-3 h-3 ${activeTab === tab.id ? 'text-orange-500' : ''}`} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border border-white/5 rounded-full">
                        <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">ATS</span>
                        <span className="text-sm font-black text-orange-500">{displayedScore}%</span>
                    </div>
                    {displayedRecruiterScore !== null && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border border-white/5 rounded-full">
                            <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Recruiter</span>
                            <span className="text-sm font-black text-white">{displayedRecruiterScore}</span>
                        </div>
                    )}
                    
                    <div className="h-5 w-px bg-white/10" />
                    
                    <div className="flex gap-1.5">
                        <button
                            onClick={() => generateTabContent(activeTab, true)}
                            disabled={!isPaid || !localResumeText || loadingStates[activeTab]}
                            className="p-1.5 text-zinc-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Refresh / Regenerate"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => generateTabContent(activeTab, true)}
                            disabled={!isPaid || !localResumeText || loadingStates[activeTab]}
                            className="p-1.5 text-zinc-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Enhance / Magic"
                        >
                            <Wand2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={handlePrint} className="p-1.5 text-zinc-500 hover:text-white transition-colors" title="Print"><Printer className="w-3.5 h-3.5" /></button>
                        <button onClick={handleCopy} className="p-1.5 text-zinc-500 hover:text-white transition-colors" title="Copy"><Copy className="w-3.5 h-3.5" /></button>
                        <button 
                            onClick={handleDownloadPDF} 
                            disabled={isDownloading}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-widest rounded-sm transition-all disabled:opacity-50"
                        >
                            {isDownloading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Download className="w-2.5 h-2.5" />}
                            PDF
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* --- MAIN PREVIEW AREA --- */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-black relative">
                    <div className={`${activeTab === GeneratorType.ATS_RESUME ? 'max-w-[900px]' : 'max-w-[700px]'} mx-auto`}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab + (loadingStates[activeTab] ? 'loading' : 'content')}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                className={`relative overflow-hidden ${activeTab === GeneratorType.ATS_RESUME && !loadingStates[activeTab] && !isEditing && !isCompare && !!generatedData[activeTab] ? 'bg-transparent border-0 p-0 shadow-none min-h-[1123px]' : 'bg-white border border-zinc-200 p-6 sm:p-12 rounded-sm shadow-2xl min-h-[900px]'}`}
                            >
                                {isEditing ? (
                                    <textarea
                                        value={generatedData[activeTab] || ''}
                                        onChange={(e) => setGeneratedData(prev => ({ ...prev, [activeTab]: e.target.value }))}
                                        className="w-full h-[700px] bg-transparent text-zinc-800 font-mono text-sm resize-none focus:outline-none"
                                    />
                                ) : (
                                    <>
                                        {isCompare ? (
                                            renderCompareView()
                                        ) : (
                                            <>
                                                {activeError && !generatedData[activeTab] ? (
                                                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-900">
                                                        <div className="text-xs font-black uppercase tracking-widest mb-2">Generation Failed</div>
                                                        <div className="text-sm font-medium leading-relaxed">{activeError}</div>
                                                        <button
                                                            onClick={() => generateTabContent(activeTab, true)}
                                                            className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest rounded-sm transition-all"
                                                        >
                                                            <Wand2 className="w-3 h-3" />
                                                            Try Again
                                                        </button>
                                                    </div>
                                                ) : !generatedData[activeTab] ? (
                                                    <div className="h-[260px]" />
                                                ) : (
                                                    activeTab === GeneratorType.ATS_RESUME ? (
                                                        <PdfTemplate
                                                            ref={previewPdfRef}
                                                            mode="preview"
                                                            content={generatedData[activeTab] || ''}
                                                            themeColor={accentColor.value}
                                                            profile={analysis.contactProfile}
                                                            showContactHeader
                                                        />
                                                    ) : (
                                                        renderMarkdown(generatedData[activeTab] || '')
                                                    )
                                                )}
                                            </>
                                        )}
                                    </>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {(isRefining || loadingStates[activeTab] || (!generatedData[activeTab] && !activeError)) && (
                        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
                            <div className="w-full max-w-md bg-zinc-950/85 border border-white/10 rounded-2xl shadow-2xl px-6 py-8 flex flex-col items-center">
                                <LoadingIndicator
                                    message={
                                        isRefining
                                            ? (refineLabel || 'Optimizing...')
                                            : loadingStates[activeTab]
                                                ? 'AI Drafting...'
                                                : 'Generating...'
                                    }
                                    size="lg"
                                />
                                {!isRefining && !loadingStates[activeTab] && !generatedData[activeTab] && (
                                    <button
                                        onClick={() => generateTabContent(activeTab, true)}
                                        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-widest rounded-sm transition-all"
                                    >
                                        <Wand2 className="w-3 h-3" />
                                        Generate Now
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <PdfTemplate
                        ref={pdfRef}
                        mode="export"
                        content={generatedData[activeTab] || ''}
                        themeColor={accentColor.value}
                        profile={analysis.contactProfile}
                        showContactHeader={activeTab === GeneratorType.ATS_RESUME}
                        type={
                            activeTab === GeneratorType.ATS_RESUME ? 'resume' :
                            activeTab === GeneratorType.COVER_LETTER ? 'cover_letter' :
                            activeTab === GeneratorType.INTERVIEW_PREP ? 'interview' : 'general'
                        }
                    />
                </div>

                {/* --- RIGHT CONTROL PANEL --- */}
                <div className="w-[260px] border-l border-white/5 bg-zinc-950 flex flex-col shrink-0">
                    <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between mb-2.5">
                            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Insights</h3>
                        </div>

                        <div className="space-y-2 mb-5">
                            {activeTab === GeneratorType.ATS_RESUME && activeCompliance && (
                                <div className="p-2.5 bg-white/5 border border-white/10 rounded-lg">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div>
                                            <div className="text-xs font-black text-white uppercase tracking-widest">ATS vs Recruiter</div>
                                            <div className="text-[11px] text-zinc-400 font-medium mt-1">{activeCompliance.scoring.verdict} • Risk: {activeCompliance.scoring.risk}</div>
                                        </div>
                                        <button
                                            onClick={() => setIsComplianceOpen(true)}
                                            className="px-2 py-1 bg-zinc-950/70 border border-white/10 rounded-md text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/5 transition-all"
                                        >
                                            Details
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-zinc-950/70 border border-white/10 rounded-md p-2 text-center">
                                            <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">ATS</div>
                                            <div className="text-lg font-black text-white leading-none">{activeCompliance.scoring.ats_score}</div>
                                        </div>
                                        <div className="bg-zinc-950/70 border border-white/10 rounded-md p-2 text-center">
                                            <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Recruiter</div>
                                            <div className="text-lg font-black text-white leading-none">{activeCompliance.scoring.recruiter_score}</div>
                                        </div>
                                    </div>
                                    <label className="mt-2.5 flex items-center gap-2 text-xs text-zinc-300 font-bold">
                                        <input
                                            type="checkbox"
                                            checked={removeRiskyKeywords}
                                            onChange={(e) => setRemoveRiskyKeywords(e.target.checked)}
                                            className="accent-orange-600"
                                        />
                                        Remove risky / over-optimized keywords
                                    </label>
                                </div>
                            )}
                            <div className="p-2.5 bg-orange-500/5 border border-orange-500/10 rounded-lg">
                                <div className="text-xs font-black text-orange-500 uppercase tracking-widest mb-1.5">ATS Keywords Injected</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {analysis.missingKeywords.length > 0 ? (
                                        analysis.missingKeywords.map((keyword, idx) => (
                                            <span key={idx} className="px-1.5 py-0.5 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded text-xs font-bold">
                                                {keyword}
                                            </span>
                                        ))
                                    ) : (
                                        <p className="text-sm text-zinc-500 leading-tight">No missing keywords detected.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mb-2.5">
                            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Assistant</h3>
                        </div>

                        <div className="relative">
                            <textarea
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Instructions..."
                                className="w-full bg-zinc-900/50 border border-white/5 rounded-lg p-2.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-orange-500/50 resize-none h-20 transition-all"
                            />
                            <button
                                onClick={() => handleRefine(undefined, 'Custom')}
                                disabled={isRefining || !chatInput.trim()}
                                className="absolute bottom-2 right-2 p-1 bg-orange-600 rounded-md text-white hover:bg-orange-500 disabled:opacity-50 transition-all"
                            >
                                {isRefining ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Send className="w-2.5 h-2.5" />}
                            </button>
                        </div>
                    </div>

                    <div className="p-3 border-t border-white/5 bg-zinc-950/80 backdrop-blur-md">
                        <div className="flex items-center justify-between mb-2.5">
                            <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Language</span>
                            <button 
                                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                                className="flex items-center gap-1 text-xs font-black text-white uppercase tracking-widest hover:text-zinc-200 transition-colors"
                            >
                                {appLanguage} <ChevronDown className="w-2 h-2" />
                            </button>
                        </div>
                        
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setIsEditing(!isEditing)}
                                className={`flex-1 py-2 rounded-sm border font-black text-xs uppercase tracking-widest transition-all ${isEditing ? 'bg-orange-600 border-orange-700 text-white' : 'bg-transparent border-white/20 text-white hover:bg-white/5'}`}
                            >
                                {isEditing ? 'Save' : 'Manual Edit'}
                            </button>
                            <button 
                                onClick={() => setIsCompare(!isCompare)}
                                disabled={isEditing || !generatedData[activeTab] || loadingStates[activeTab]}
                                className={`flex-1 py-2 rounded-sm border font-black text-xs uppercase tracking-widest transition-all ${isCompare ? 'bg-white/10 border-white/30 text-white' : 'bg-transparent border-white/20 text-white hover:bg-white/5'} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                Compare
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Language Selection Overlay */}
            <AnimatePresence>
                {isLangMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsLangMenuOpen(false)}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-zinc-900 border border-white/10 p-8 rounded-2xl max-w-md w-full shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <h2 className="text-xl font-black text-white uppercase tracking-widest mb-6 text-center">Select Language</h2>
                            <div className="grid grid-cols-2 gap-3">
                                {LANGUAGES.map(lang => (
                                    <button
                                        key={lang}
                                        onClick={() => { setAppLanguage(lang); setIsLangMenuOpen(false); }}
                                        className={`p-4 rounded-2xl border transition-all text-xs font-black uppercase tracking-widest ${appLanguage === lang ? 'bg-orange-500/10 border-orange-500 text-orange-500' : 'bg-zinc-950 border-white/5 text-zinc-500 hover:border-white/20'}`}
                                    >
                                        {lang}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Copy Toast */}
            <AnimatePresence>
                {showCopyToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-orange-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-2xl flex items-center gap-3"
                    >
                        <Check className="w-4 h-4" />
                        Copied to Clipboard
                    </motion.div>
                )}
            </AnimatePresence>

            {!isPaid && (
                <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6">
                    <div className="max-w-xl w-full">
                        <PaymentLock 
                            onPaymentVerified={onPaymentSuccess} 
                            onBeforeRedirect={() => saveStateBeforePayment({
                                analysisId: analysisId || undefined,
                                resumeFile,
                                resumeText,
                                jobDescription,
                                analysisResult: analysis,
                            })} 
                        />
                    </div>
                </div>
            )}

            <AnimatePresence>
                {isComplianceOpen && activeCompliance && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsComplianceOpen(false)}
                        className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden"
                        >
                            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                <div>
                                    <div className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Diagnostics</div>
                                    <div className="text-lg font-black text-white">ATS vs Recruiter Score</div>
                                </div>
                                <button
                                    onClick={() => setIsComplianceOpen(false)}
                                    className="p-2 text-zinc-400 hover:text-white transition-colors"
                                    title="Close"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-4 overflow-y-auto custom-scrollbar max-h-[calc(80vh-64px)]">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">ATS Score</div>
                                        <div className="text-3xl font-black text-white mt-2">{activeCompliance.scoring.ats_score}</div>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Recruiter Score</div>
                                        <div className="text-3xl font-black text-white mt-2">{activeCompliance.scoring.recruiter_score}</div>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Interpretation</div>
                                        <div className="text-sm font-black text-white mt-2">{activeCompliance.scoring.verdict}</div>
                                        <div className="text-xs text-zinc-400 font-medium mt-1 leading-relaxed">{activeCompliance.scoring.summary}</div>
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">ATS Factors (Weights)</div>
                                        <div className="space-y-1.5 text-xs">
                                            {activeCompliance.scoring.ats_factors.map((f, idx) => (
                                                <div key={idx} className="flex items-center justify-between">
                                                    <span className="text-zinc-300 font-medium">{f.factor}</span>
                                                    <span className="text-zinc-500 font-black tabular-nums">{f.weight}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">Recruiter Factors (Weights)</div>
                                        <div className="space-y-1.5 text-xs">
                                            {activeCompliance.scoring.recruiter_factors.map((f, idx) => (
                                                <div key={idx} className="flex items-center justify-between">
                                                    <span className="text-zinc-300 font-medium">{f.factor}</span>
                                                    <span className="text-zinc-500 font-black tabular-nums">{f.weight}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-3">
                                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">Validator Output</div>
                                    <div className="space-y-2">
                                        {activeCompliance.issues.length === 0 ? (
                                            <div className="text-sm text-zinc-400 font-medium">No issues detected.</div>
                                        ) : (
                                            activeCompliance.issues.map((i, idx) => (
                                                <div key={idx} className="flex items-start justify-between gap-3 bg-zinc-950/60 border border-white/10 rounded-lg p-2.5">
                                                    <div>
                                                        <div className={`text-[10px] font-black uppercase tracking-widest ${i.severity === 'hard' ? 'text-red-400' : 'text-orange-400'}`}>
                                                            {i.severity === 'hard' ? 'Hard Fail' : 'Soft Flag'} • {i.validator}
                                                        </div>
                                                        <div className="text-sm text-white font-medium mt-1 leading-snug">{i.message}</div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-3">
                                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">Keyword Justification Log</div>
                                    <div className="space-y-2">
                                        {activeCompliance.keyword_justifications.map((k, idx) => (
                                            <div key={idx} className="bg-zinc-950/60 border border-white/10 rounded-lg p-3">
                                                {(() => {
                                                    const applyKey = (k.keyword || '').trim().toLowerCase();
                                                    const isApplying = !!keywordApplyStatus[applyKey];
                                                    const canApply = !k.used && !!generatedData[GeneratorType.ATS_RESUME] && !isApplying;
                                                    return (
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <button
                                                            onClick={() => canApply && applyKeywordOnce(k)}
                                                            disabled={!canApply}
                                                            className={`text-sm font-black text-left ${
                                                                canApply ? 'text-white hover:underline' : 'text-white'
                                                            } disabled:opacity-80 disabled:cursor-default`}
                                                            title={canApply ? 'Apply once' : undefined}
                                                        >
                                                            {k.keyword}
                                                        </button>
                                                        <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-0.5">
                                                            {k.category} • Risk: {k.risk_level} • Freq: {k.frequency}/{k.allowed_frequency}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`px-2 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${
                                                            k.used ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-zinc-800/40 border-white/10 text-zinc-300'
                                                        }`}>
                                                            {k.used ? 'Used' : 'Not Used'}
                                                        </div>
                                                        {!k.used && (
                                                            <button
                                                                onClick={() => applyKeywordOnce(k)}
                                                                disabled={!generatedData[GeneratorType.ATS_RESUME] || isApplying}
                                                                className="px-2.5 py-1 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-800 disabled:opacity-60 text-white text-[10px] font-black uppercase tracking-widest rounded-full transition-all flex items-center gap-1.5"
                                                                title="Apply once"
                                                            >
                                                                {isApplying ? (
                                                                    <>
                                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                                        Applying
                                                                    </>
                                                                ) : (
                                                                    'Apply'
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                    );
                                                })()}
                                                {k.used ? (
                                                    <>
                                                        {k.resume_evidence && <div className="text-xs text-zinc-300 font-medium mt-2 leading-relaxed">Evidence: {k.resume_evidence}</div>}
                                                        {k.job_description_reference && <div className="text-xs text-zinc-500 font-medium mt-1 leading-relaxed">JD: {k.job_description_reference}</div>}
                                                        {k.justification && <div className="text-xs text-zinc-400 font-medium mt-2 leading-relaxed">{k.justification}</div>}
                                                    </>
                                                ) : (
                                                    <div className="text-xs text-zinc-400 font-medium mt-2 leading-relaxed">
                                                        {k.reason || 'Not used.'}{k.alternative_used ? ` Alternative: ${k.alternative_used}` : ''}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Editor;
