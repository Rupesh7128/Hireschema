
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { 
    FileText, Mail, MessageSquare, GraduationCap, 
    Download, Printer, RefreshCw, Globe, 
    Check, ChevronDown, Wand2, Copy, 
    Edit2, Send, Loader2, Sparkles,
    Target, ShieldCheck, Zap, ArrowRight,
    Eye, Settings, Layout, Minimize2
} from 'lucide-react';
import { FileData, AnalysisResult, GeneratorType } from '../types';
import { generateContent, calculateImprovedScore, refineContent, regenerateSection } from '../services/geminiService';
import { saveStateBeforePayment } from '../services/stateService';
import PaymentLock from './PaymentLock';
import { PdfTemplate } from './PdfTemplate';

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
    { id: 'ats', label: 'ATS Optimize', icon: Target, prompt: "Optimize this for ATS keywords and professional clarity." },
    { id: 'impact', label: 'High Impact', icon: Zap, prompt: "Rewrite to be more impact-driven with strong action verbs." },
    { id: 'concise', label: 'Make Concise', icon: Minimize2, prompt: "Shorten this while keeping all key information." }
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
    const [optimizedScore, setOptimizedScore] = useState<number | null>(null);
    const [accentColor, setAccentColor] = useState(ACCENT_COLORS[0]);
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const [chatInput, setChatInput] = useState("");
    const [isRefining, setIsRefining] = useState(false);
    const [localResumeText, setLocalResumeText] = useState(resumeText);
    const [isEditing, setIsEditing] = useState(false);
    const [showCopyToast, setShowCopyToast] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const pdfRef = useRef<HTMLDivElement>(null);

    // --- INITIALIZATION & AUTO-GENERATION ---
    useEffect(() => {
        if (isPaid && localResumeText) {
            generateAllContent();
        }
    }, [isPaid, localResumeText, appLanguage]);

    const generateAllContent = async () => {
        setLoadingStates(prev => ({ ...prev, [activeTab]: true }));
        try {
            const content = await generateContent(activeTab, resumeFile, jobDescription, analysis, {
                verifiedProfile: analysis.contactProfile,
                language: appLanguage,
                resumeText: localResumeText
            });
            setGeneratedData(prev => ({ ...prev, [activeTab]: content }));
            if (activeTab === GeneratorType.ATS_RESUME) {
                const score = await calculateImprovedScore(content, jobDescription);
                setOptimizedScore(score);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingStates(prev => ({ ...prev, [activeTab]: false }));
        }
    };

    // --- ACTIONS ---
    const handleRefine = async (customPrompt?: string) => {
        const prompt = customPrompt || chatInput;
        console.log('[Editor] handleRefine called with prompt:', prompt);
        console.log('[Editor] Current activeTab:', activeTab);
        console.log('[Editor] Has generatedData for activeTab:', !!generatedData[activeTab]);

        if (!prompt.trim() || !generatedData[activeTab]) {
            console.warn('[Editor] handleRefine aborted: prompt empty or no content to refine');
            return;
        }

        setIsRefining(true);
        try {
            console.log('[Editor] Calling refineContent...');
            const newContent = await refineContent(generatedData[activeTab], prompt, jobDescription);
            console.log('[Editor] refineContent success, updating state');
            setGeneratedData(prev => ({ ...prev, [activeTab]: newContent }));
            setChatInput("");
            if (activeTab === GeneratorType.ATS_RESUME) {
                const score = await calculateImprovedScore(newContent, jobDescription);
                setOptimizedScore(score);
            }
        } catch (err) {
            console.error('[Editor] handleRefine failed:', err);
        } finally {
            setIsRefining(false);
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
        setIsDownloading(true);
        try {
            const element = pdfRef.current;
            const opt = {
                margin: [0, 0, 0, 0],
                filename: `HireSchema_Optimized_${activeTab.replace(/\s+/g, '_')}.pdf`,
                image: { type: 'jpeg', quality: 1.0 },
                html2canvas: { 
                    scale: 3, 
                    useCORS: true, 
                    letterRendering: true,
                    scrollY: 0,
                    windowWidth: 794 // 210mm at 96dpi
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };
            // @ts-ignore
            await window.html2pdf().set(opt).from(element).save();
        } catch (err) {
            console.error('PDF Generation Error:', err);
        } finally {
            setIsDownloading(false);
        }
    };

    // --- RENDER HELPERS ---
    const renderMarkdown = (content: string) => (
        <ReactMarkdown
            components={{
                h1: ({...props}) => <h1 className="text-3xl font-black uppercase tracking-tight mb-8 border-b-2 pb-4 text-zinc-900" style={{ borderColor: accentColor.value }} {...props} />,
                h2: ({...props}) => <h2 className="text-lg font-black uppercase tracking-widest mt-10 mb-4 flex items-center gap-3" style={{ color: accentColor.value }} {...props} />,
                h3: ({...props}) => <h3 className="text-base font-bold mt-6 mb-2 text-zinc-800" {...props} />,
                p: ({...props}) => <p className="text-sm sm:text-base leading-relaxed text-zinc-700 mb-4" {...props} />,
                ul: ({...props}) => <ul className="space-y-3 my-6" {...props} />,
                li: ({...props}) => (
                    <li className="flex items-start gap-3 text-sm sm:text-base text-zinc-700">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accentColor.value }} />
                        <span>{props.children}</span>
                    </li>
                ),
                strong: ({...props}) => <strong className="font-bold text-zinc-900" {...props} />,
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
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-zinc-100 relative">
                    <div className="max-w-[700px] mx-auto">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab + (loadingStates[activeTab] ? 'loading' : 'content')}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                className="bg-white border border-zinc-200 p-6 sm:p-10 rounded-2xl shadow-2xl relative overflow-hidden min-h-[900px]"
                            >
                                <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/5 blur-[80px] -mr-24 -mt-24" />
                                
                                {loadingStates[activeTab] ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                        <div className="w-12 h-12 border-3 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                                        <p className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em]">AI Drafting...</p>
                                    </div>
                                ) : (
                                    <>
                                        {isEditing ? (
                                            <textarea
                                                value={generatedData[activeTab] || ''}
                                                onChange={(e) => setGeneratedData(prev => ({ ...prev, [activeTab]: e.target.value }))}
                                                className="w-full h-[700px] bg-transparent text-zinc-800 font-mono text-sm resize-none focus:outline-none"
                                            />
                                        ) : (
                                            renderMarkdown(generatedData[activeTab] || '')
                                        )}
                                    </>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Hidden PDF Template */}
                    <PdfTemplate 
                        ref={pdfRef} 
                        content={generatedData[activeTab] || ''} 
                        themeColor={accentColor.value} 
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
                                    onClick={() => handleRefine(action.prompt)}
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
                                onClick={() => handleRefine()}
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
                                className="flex items-center gap-1 text-xs font-black text-orange-500 uppercase tracking-widest hover:text-orange-400 transition-colors"
                            >
                                {appLanguage} <ChevronDown className="w-2 h-2" />
                            </button>
                        </div>
                        
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setIsEditing(!isEditing)}
                                className={`flex-1 py-2 rounded-sm border font-black text-xs uppercase tracking-widest transition-all ${isEditing ? 'bg-orange-600 border-orange-700 text-white' : 'bg-zinc-900 border-white/5 text-zinc-500 hover:text-white'}`}
                            >
                                {isEditing ? 'Save' : 'Manual Edit'}
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
                            className="bg-zinc-900 border border-white/10 p-8 rounded-[2.5rem] max-w-md w-full shadow-2xl"
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
