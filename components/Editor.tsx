
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { 
    FileText, Mail, MessageSquare, GraduationCap, 
    Download, Printer, RefreshCw, Globe, 
    Check, ChevronDown, Wand2, Copy, 
    Edit2, Send, Loader2, Sparkles,
    Target, ShieldCheck, Zap, ArrowRight,
    Eye, Settings, Layout, Minimize2
} from 'lucide-react';
import { FileData, AnalysisResult, GeneratorType } from '../types';
import { generateContent, calculateImprovedScore, refineContent, refineAtsResumeContent, regenerateSection } from '../services/geminiService';
import { normalizeAtsResumeMarkdown } from '../services/atsResumeMarkdown';
import { saveStateBeforePayment } from '../services/stateService';
import { includesKeyword, prioritizeKeywords } from '../services/keywordUtils';
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

const QUICK_ACTIONS = [
    { id: 'ats', label: 'ATS Optimize', icon: Target, prompt: "Optimize this for ATS keywords while preserving the original content and tone." },
    { id: 'impact', label: 'High Impact', icon: Zap, prompt: "Rewrite to be more impact-driven with strong action verbs." },
    { id: 'concise', label: 'Make Concise', icon: Minimize2, prompt: "Shorten this while keeping all key information." },
    { id: 'format', label: 'Fix Formatting', icon: Layout, prompt: "Fix formatting issues: improve readability, spacing, headings, and bullet consistency. Keep it ATS-friendly." }
];

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

    const getKeywordCoverage = (optimizedMarkdown: string) => {
        const missing = (analysis.missingKeywords || []).filter(Boolean);
        const present = missing.filter(k => includesKeyword(optimizedMarkdown, k));
        const stillMissing = missing.filter(k => !includesKeyword(optimizedMarkdown, k));
        return { present, stillMissing };
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
                    const missingKeywords = prioritizeKeywords(analysis.missingKeywords || []).slice(0, 18);
                    const basePrompt = [
                        QUICK_ACTIONS[0].prompt,
                        missingKeywords.length > 0
                            ? `Strategically incorporate these missing keywords where truthful and natural: ${missingKeywords.join(', ')}.`
                            : '',
                        `Do not add new claims. Do not change employers/titles/dates. Do not remove any existing skills/tools/technologies from the ORIGINAL resume text. Prefer adding keywords into Skills/Tools and existing bullets where they already apply. Avoid keyword stuffing.`
                    ].filter(Boolean).join('\n');
                    const boosted = await refineAtsResumeContent(normalized, basePrompt, jobDescription, localResumeText);
                    normalized = normalizeAtsResumeMarkdown(boosted);

                    const coverage = getKeywordCoverage(normalized);
                    if (coverage.stillMissing.length > 0) {
                        const followUpPrompt = [
                            `Second pass ATS keyword injection.`,
                            `Remaining missing keywords: ${prioritizeKeywords(coverage.stillMissing).slice(0, 18).join(', ')}.`,
                            `Add ONLY if they plausibly match existing experience/skills. Place them into Skills/Tools/Tech stack lists rather than inventing new work.`,
                            `Keep formatting tight and ATS-friendly.`
                        ].join('\n');
                        const boosted2 = await refineAtsResumeContent(normalized, followUpPrompt, jobDescription, localResumeText);
                        normalized = normalizeAtsResumeMarkdown(boosted2);
                    }
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
        setActiveTab(GeneratorType.ATS_RESUME);
    }, [isPaid]);

    useEffect(() => {
        if (isEditing) setIsCompare(false);
    }, [isEditing]);

    useEffect(() => {
        setIsCompare(false);
    }, [activeTab]);

    const activeError = generationErrors[activeTab] || '';

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
            const normalized = activeTab === GeneratorType.ATS_RESUME ? normalizeAtsResumeMarkdown(newContent) : newContent;
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
            navigator.clipboard.writeText(generatedData[activeTab]);
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
        
        // @ts-ignore
        if (typeof window.html2pdf === 'undefined') {
            console.error('html2pdf library not loaded');
            alert('PDF library is still loading. Please try again in a moment.');
            return;
        }

        setIsDownloading(true);
        try {
            const element = pdfRef.current;
            // Ensure fonts/layout are settled before rasterizing for PDF
            // @ts-ignore
            if (document.fonts?.ready) {
                // @ts-ignore
                await document.fonts.ready;
            }
            await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
            await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

            const exportWidth = Math.max(794, element.scrollWidth, element.clientWidth);
            const exportHeight = Math.max(1123, element.scrollHeight, element.clientHeight);
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
            // @ts-ignore
            await window.html2pdf().set(opt).from(element).save();
        } catch (err) {
            console.error('PDF Generation Error:', err);
            alert('Unable to generate a PDF right now. Please try again in a moment.');
        } finally {
            setIsDownloading(false);
        }
    };

    // --- RENDER HELPERS ---
    const renderMarkdown = (content: string) => (
        <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkBreaks]}
            components={{
                h1: ({...props}) => <h1 className="text-4xl font-black tracking-tight mb-6 border-b-2 pb-2 text-black" style={{ borderColor: accentColor.value }} {...props} />,
                h2: ({...props}) => <h2 className="text-lg font-black tracking-widest mt-12 mb-4" style={{ color: accentColor.value }} {...props} />,
                h3: ({...props}) => <h3 className="text-base font-bold mt-6 mb-2 text-zinc-900" {...props} />,
                p: ({...props}) => <p className="text-sm sm:text-base leading-relaxed text-zinc-800 mb-4" {...props} />,
                ul: ({...props}) => <ul className="space-y-3 my-6" {...props} />,
                li: ({...props}) => (
                    <li className="flex items-start gap-3 text-sm sm:text-base text-zinc-800">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accentColor.value }} />
                        <span>{props.children}</span>
                    </li>
                ),
                strong: ({...props}) => <strong className="font-bold text-black" {...props} />,
            }}
        >
            {content}
        </ReactMarkdown>
    );

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
                        <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Score</span>
                        <span className="text-sm font-black text-orange-500">{optimizedScore || analysis.atsScore}%</span>
                    </div>
                    
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
                    <div className="p-3 border-b border-white/5">
                        <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-3">Tools</h3>
                        
                        <div className="space-y-2">
                            {QUICK_ACTIONS.map(action => (
                                <button
                                    key={action.id}
                                    onClick={() => handleRefine(action.prompt, action.label)}
                                    disabled={isRefining || loadingStates[activeTab] || !generatedData[activeTab]}
                                    className="w-full group flex items-center gap-2.5 p-2.5 bg-zinc-900/50 border border-white/5 rounded-lg hover:border-orange-500/50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="w-7 h-7 rounded-md bg-orange-500/10 flex items-center justify-center shrink-0 group-hover:bg-orange-500 transition-colors">
                                        <action.icon className="w-3 h-3 text-orange-500 group-hover:text-white" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-black text-white uppercase tracking-wider">{action.label}</div>
                                        <div className="text-[10px] text-zinc-600 mt-0.5 tracking-tight">One-click boost</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between mb-2.5">
                            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Insights</h3>
                        </div>

                        <div className="space-y-2 mb-5">
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
        </div>
    );
};

export default Editor;
