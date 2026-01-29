
import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { PdfTemplate } from './PdfTemplate';
import { FileData, AnalysisResult, GeneratorType, ContactProfile } from '../types';
import { generateContent, calculateImprovedScore, refineContent, regenerateSection } from '../services/geminiService';
import { saveStateBeforePayment } from '../services/stateService';
import { MessageSquare, FileText, Mail, FileDown, FileOutput, X, Loader2, Minimize2, Maximize2, UserCircle, Camera, Wand2, Moon, Sun, Send, Youtube, GraduationCap, TrendingUp, Download, Link, Check, Linkedin, Copy, Lock, Edit2, CheckCircle2, DollarSign, RefreshCw, PenTool, Globe, ChevronDown, Printer } from 'lucide-react';
import PaymentLock from './PaymentLock';

interface ContentGeneratorProps {
  resumeFile: FileData;
  resumeText?: string; // Extracted text from PDF for content generation
  jobDescription: string;
  analysis: AnalysisResult;
  isPaid: boolean;
  onPaymentSuccess: () => void;
  appLanguage: string;
  setAppLanguage: (lang: string) => void;
}

const ACCENT_COLORS = [
    { name: 'Executive Orange', value: '#F97316' },
    { name: 'Deep Blue', value: '#2563EB' },
    { name: 'Emerald', value: '#059669' },
    { name: 'Purple', value: '#7C3AED' },
    { name: 'Slate', value: '#475569' },
];

const LANGUAGES = [
    "English", "Spanish", "French", "German", "Hindi", "Mandarin", "Portuguese", "Arabic"
];

const TEMPLATES = [
    { id: 'clarity', label: 'Improve Clarity', prompt: "Rewrite this to be clearer and easier to understand while keeping the meaning." },
    { id: 'concise', label: 'Make It Concise', prompt: "Shorten this by 20–30% without losing key information." },
    { id: 'impact', label: 'Strengthen Impact', prompt: "Use strong action verbs and emphasize measurable accomplishments." },
    { id: 'ats', label: 'ATS Optimization', prompt: "Make this recruiter-friendly, keyword-aligned, and strictly single-column compliant." },
    { id: 'professional', label: 'Professional Tone', prompt: "Rewrite in a polished, corporate professional writing style." },
    { id: 'quantify', label: 'Auto-Quantify', prompt: "Convert this text into 2–3 concise, quantified bullet points. Focus on measurable outcomes, numbers/metrics, and ATS-friendly keywords." },
];

const SECTIONS = [
    { id: 'header', label: 'Header / Contact' },
    { id: 'summary', label: 'Professional Summary' },
    { id: 'skills', label: 'Skills' },
    { id: 'experience', label: 'Experience' },
    { id: 'education', label: 'Education' },
    { id: 'languages', label: 'Languages' }
];

// --- CHAT SIDEBAR ---
const ChatSidebar = ({ 
    show, onClose, onRefine, onQuickAction, chatInput, setChatInput, isRefining, isLightMode, onSectionEdit 
}: any) => {
    const [mode, setMode] = useState<'chat' | 'sections'>('sections'); // Default to section editor

    if (!show) return null;
    return (
        <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className={`border-l flex flex-col absolute md:relative right-0 top-0 bottom-0 z-40 w-full md:w-[300px] h-full shadow-2xl ${isLightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}
        >
            <div className="p-4 border-b border-zinc-800/50 flex justify-between items-center">
                <div className="flex gap-4">
                     <button 
                        onClick={() => setMode('sections')}
                        className={`text-xs font-bold uppercase tracking-wider border-b-2 pb-1 transition-colors ${mode === 'sections' ? 'text-orange-500 border-orange-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
                     >
                        Editor
                     </button>
                     <button 
                        onClick={() => setMode('chat')}
                        className={`text-xs font-bold uppercase tracking-wider border-b-2 pb-1 transition-colors ${mode === 'chat' ? 'text-orange-500 border-orange-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
                     >
                        Assistant
                     </button>
                </div>
                <button onClick={onClose}><X className="w-4 h-4 text-zinc-500" /></button>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto">
                {mode === 'sections' ? (
                    <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase mb-3">Edit Specific Section</p>
                        <div className="space-y-2">
                            {SECTIONS.map(s => (
                                <button 
                                    key={s.id}
                                    onClick={() => onSectionEdit(s)}
                                    disabled={isRefining}
                                    className={`w-full p-3 rounded-lg border text-left transition-all flex items-center justify-between group ${isLightMode ? 'bg-white border-zinc-200 hover:border-orange-500' : 'bg-zinc-950/50 border-zinc-800 hover:border-orange-500/50'}`}
                                >
                                    <span className={`text-xs font-medium ${isLightMode ? 'text-zinc-700' : 'text-zinc-300'}`}>{s.label}</span>
                                    <Edit2 className="w-3 h-3 text-zinc-500 group-hover:text-orange-500" />
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div>
                         <p className="text-[10px] font-bold text-zinc-500 uppercase mb-3">Quick Actions</p>
                        <div className="grid grid-cols-1 gap-2 mb-6">
                            {TEMPLATES.map(t => (
                                <button 
                                    key={t.id}
                                    onClick={() => onQuickAction(t)} 
                                    disabled={isRefining} 
                                    className="p-2 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300 text-left transition-colors"
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-zinc-800/50">
                <div className="relative">
                    <textarea 
                        value={chatInput}
                        onChange={(e: any) => setChatInput(e.target.value)}
                        placeholder={mode === 'chat' ? "Custom instruction..." : "Select a section to edit..."}
                        className={`w-full rounded-lg text-sm p-3 pr-10 resize-none h-24 focus:outline-none focus:ring-1 focus:ring-orange-500 ${isLightMode ? 'bg-white border border-zinc-300 text-black' : 'bg-zinc-950 border border-zinc-800 text-white'}`}
                        onKeyDown={(e: any) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onRefine(); }}}
                        disabled={mode === 'sections' && !chatInput} // Disable if no section selected logic triggers input
                    />
                    <button 
                        onClick={onRefine}
                        disabled={isRefining || !chatInput.trim()}
                        className="absolute bottom-3 right-3 p-1.5 bg-orange-600 rounded-md text-white hover:bg-orange-500 disabled:opacity-50"
                    >
                        {isRefining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

const ContentGenerator: React.FC<ContentGeneratorProps> = ({ resumeFile, resumeText = '', jobDescription, analysis, isPaid, onPaymentSuccess, appLanguage, setAppLanguage }) => {
  
  // Local state for resume text - allows fallback extraction if prop is empty
  const [localResumeText, setLocalResumeText] = useState<string>(resumeText);
  const [isExtractingText, setIsExtractingText] = useState(false);
  
  // Effect to extract text from PDF if resumeText prop is empty but we have a file
  useEffect(() => {
    const extractTextIfNeeded = async () => {
      console.log('[ContentGenerator] extractTextIfNeeded called:', {
        resumeTextPropLength: resumeText?.length || 0,
        localResumeTextLength: localResumeText?.length || 0,
        hasResumeFile: !!resumeFile,
        resumeFileType: resumeFile?.type || 'none'
      });
      
      // If we already have text from prop, use it
      if (resumeText && resumeText.length > 100) {
        console.log('[ContentGenerator] Using provided resumeText, length:', resumeText.length);
        console.log('[ContentGenerator] resumeText preview:', resumeText.substring(0, 150));
        setLocalResumeText(resumeText);
        return;
      }
      
      // If no text but we have a PDF file, extract it
      if (resumeFile && resumeFile.type === 'application/pdf' && resumeFile.base64) {
        console.log('[ContentGenerator] resumeText empty/short, extracting from PDF...');
        setIsExtractingText(true);
        try {
          const { extractTextFromPdf } = await import('../services/geminiService');
          const extractedText = await extractTextFromPdf(resumeFile.base64);
          console.log('[ContentGenerator] Extracted text length:', extractedText?.length || 0);
          console.log('[ContentGenerator] Extracted text preview:', extractedText?.substring(0, 150) || 'EMPTY');
          if (extractedText && extractedText.length > 100) {
            setLocalResumeText(extractedText);
          } else {
            console.warn('[ContentGenerator] Extracted text too short or empty!');
          }
        } catch (e) {
          console.error('[ContentGenerator] Failed to extract text from PDF:', e);
        } finally {
          setIsExtractingText(false);
        }
      } else {
        console.warn('[ContentGenerator] No PDF file available for extraction');
      }
    };
    
    extractTextIfNeeded();
  }, [resumeFile, resumeText]);
  
  // Handler to save state before payment redirect
  const handleBeforePaymentRedirect = () => {
    const textToSave = localResumeText || resumeText;
    console.log('=== handleBeforePaymentRedirect called ===');
    console.log('Saving state:', {
      hasResumeFile: !!resumeFile,
      resumeFileName: resumeFile?.name || 'none',
      localResumeTextLength: localResumeText?.length || 0,
      resumeTextPropLength: resumeText?.length || 0,
      textToSaveLength: textToSave?.length || 0,
      textToSavePreview: textToSave?.substring(0, 100) || 'EMPTY',
      jobDescriptionLength: jobDescription?.length || 0,
      hasAnalysisResult: !!analysis,
      analysisContactName: analysis?.contactProfile?.name || 'unknown'
    });
    
    if (!textToSave || textToSave.length < 100) {
      console.warn('⚠️ WARNING: Saving state with empty/short resumeText!');
    }
    
    saveStateBeforePayment({
      resumeFile,
      resumeText: textToSave,
      jobDescription,
      analysisResult: analysis,
    });
    console.log('✅ State saved to localStorage');
  };
  const [activeTab, setActiveTab] = useState<GeneratorType>(GeneratorType.ATS_RESUME);
  const [generatedData, setGeneratedData] = useState<Record<string, string>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  
  const [isLightMode, setIsLightMode] = useState(false);
  const [optimizedScore, setOptimizedScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Settings
  const [tailorExperience, setTailorExperience] = useState(false);
  const [accentColor, setAccentColor] = useState(ACCENT_COLORS[0]);
  
  // Email/LinkedIn Settings
  const [emailChannel, setEmailChannel] = useState<'Email' | 'LinkedIn'>('Email');
  const [emailScenario, setEmailScenario] = useState('Follow-up');

  // Chat / Refinement
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', content: string}[]>([
      { role: 'model', content: "I'm your Resume Assistant. Ask me to rewrite a bullet point, explain a gap, or suggest stronger action verbs." }
  ]);
  const [isRefining, setIsRefining] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  
  // PDF Generation Ref
    const pdfRef = useRef<HTMLDivElement>(null);
    
    // Native browser print function (replaces react-to-print for React 18/19 compatibility)
    const handlePrint = () => {
        if (!pdfRef.current) return;
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups to print');
            return;
        }
        
        const content = pdfRef.current.innerHTML;
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Resume_${analysis.contactProfile.name.replace(/\s+/g, '_')}</title>
                <style>
                    body { font-family: Inter, sans-serif; margin: 0; padding: 0.5in; }
                    * { box-sizing: border-box; }
                </style>
            </head>
            <body>${content}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    // Sharing
    const [showCopyToast, setShowCopyToast] = useState(false);

  // Manual Edit Mode
  const [isEditing, setIsEditing] = useState(false);
  
  // Language Menu
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  // EAGER LOADING - wait for text extraction before generating
  useEffect(() => {
    if (isPaid && !isExtractingText && localResumeText) {
        console.log('[ContentGenerator] Starting content generation with resumeText length:', localResumeText.length);
        generateAllContent();
    }
  }, [appLanguage, isPaid, isExtractingText, localResumeText]);

  const generateAllContent = async () => {
    await handleGenerate(GeneratorType.ATS_RESUME, true);
    
    const queue = [
        { type: GeneratorType.COVER_LETTER, delay: 3000 },
        { type: GeneratorType.INTERVIEW_PREP, delay: 6000 },
        { type: GeneratorType.LEARNING_PATH, delay: 9000 },
        { type: GeneratorType.EMAIL_TEMPLATE, delay: 12000 }
    ];

    queue.forEach(item => {
        setTimeout(() => {
             if (!generatedData[item.type]) handleGenerate(item.type, true);
        }, item.delay);
    });
  };

  const handleGenerate = async (type: GeneratorType, forceRefresh = false) => {
    if (!isPaid) return; 

    if (generatedData[type] && !forceRefresh) return;

    setLoadingStates(prev => ({ ...prev, [type]: true }));
    setError(null);

    // Use localResumeText which has fallback extraction
    const textToUse = localResumeText || resumeText;
    console.log('[handleGenerate] Using resumeText length:', textToUse?.length || 0);

    try {
        const content = await generateContent(
            type, 
            resumeFile, 
            jobDescription, 
            analysis,
            { 
                verifiedProfile: analysis.contactProfile,
                tailorExperience: tailorExperience && type === GeneratorType.ATS_RESUME,
                language: appLanguage,
                emailChannel: emailChannel,
                emailScenario: emailScenario,
                resumeText: textToUse // Pass original resume text to preserve facts
            }
        );
        setGeneratedData(prev => ({ ...prev, [type]: content }));

        if (type === GeneratorType.ATS_RESUME) {
            calculateImprovedScore(content, jobDescription).then(score => setOptimizedScore(score));
        }
    } catch (err: any) {
        if (activeTab === type) setError(err.message || "Generation failed.");
    } finally {
        setLoadingStates(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleRefine = async () => {
      if (!chatInput.trim() || !generatedData[activeTab]) return;
      setIsRefining(true);
      try {
          let newContent = "";
          if (activeSection) {
              // Section specific regeneration
              newContent = await regenerateSection(
                  generatedData[activeTab], 
                  activeSection, 
                  chatInput, 
                  jobDescription
              );
              setActiveSection(null); // Clear section after edit
          } else {
              // General refinement
              newContent = await refineContent(
                generatedData[activeTab], 
                chatInput, 
                activeTab === GeneratorType.ATS_RESUME ? jobDescription : "Professional Context"
              );
          }
          setGeneratedData(prev => ({ ...prev, [activeTab]: newContent }));
          setChatInput("");
          // Refresh Score
          if (activeTab === GeneratorType.ATS_RESUME) {
             calculateImprovedScore(newContent, jobDescription).then(score => setOptimizedScore(score));
          }
      } catch (e) {
          setError("Failed to refine content.");
      } finally {
          setIsRefining(false);
      }
  };

  const handleQuickAction = async (template: { id: string, prompt: string }) => {
      setChatInput(template.prompt);
      setIsRefining(true);
      try {
          const newContent = await refineContent(
              generatedData[activeTab], 
              template.prompt, 
              activeTab === GeneratorType.ATS_RESUME ? jobDescription : "Context"
          );
          setGeneratedData(prev => ({ ...prev, [activeTab]: newContent }));
          setChatInput("");
      } finally {
          setIsRefining(false);
      }
  };

  const handleSectionEdit = (section: { id: string, label: string }) => {
      setActiveSection(section.label);
      setChatInput(`Rewrite the ${section.label} section to be...`);
  }
  
  const handleCopyText = () => {
      const content = generatedData[activeTab];
      if (content) {
          navigator.clipboard.writeText(content);
          setShowCopyToast(true);
          setTimeout(() => setShowCopyToast(false), 3000);
      }
  };

  const handleDownloadPDF = async () => {
    const content = generatedData[activeTab];
    if (!content || !pdfRef.current) return;

    setIsDownloading('pdf');
    await new Promise(resolve => setTimeout(resolve, 500)); 

    try {
        const opt = {
            margin: [0.5, 0.5, 0.5, 0.5], // Top, Left, Bottom, Right
            filename: `Optimized_${activeTab.replace(/\s/g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };
        
        // @ts-ignore
        await window.html2pdf().set(opt).from(pdfRef.current).save();
    } catch (e) {
        console.error("PDF generation error:", e);
        setError("PDF Download Failed.");
    } finally {
        setIsDownloading(null);
    }
  };
  
  const handleDownloadTXT = () => {
      const content = generatedData[activeTab];
      if (!content) return;
      const element = document.createElement("a");
      const file = new Blob([content], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `Optimized_${activeTab.replace(/\s/g, '_')}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
  };

  const tabs = [
    { id: GeneratorType.ATS_RESUME, icon: FileOutput, label: 'Full ATS Resume' },
    { id: GeneratorType.LEARNING_PATH, icon: GraduationCap, label: 'Skill Gap & Learning' },
    { id: GeneratorType.COVER_LETTER, icon: FileText, label: 'Cover Letter' },
    { id: GeneratorType.INTERVIEW_PREP, icon: MessageSquare, label: 'Interview' },
    { id: GeneratorType.EMAIL_TEMPLATE, icon: Mail, label: 'Outreach' },
  ];

  const renderContent = () => {
    const isResume = activeTab === GeneratorType.ATS_RESUME;
    // Force white background for resume, irrespective of app theme
    // For other content, follow isLightMode
    const bgClass = isResume ? 'bg-white' : (isLightMode ? 'bg-white' : 'bg-zinc-950');
    const textClass = isResume ? 'text-zinc-900' : (isLightMode ? 'text-zinc-800' : 'text-zinc-300');
    const borderClass = isResume ? 'border-zinc-200' : (isLightMode ? 'border-zinc-200' : 'border-zinc-800');
    const h1Class = isResume ? 'text-zinc-900' : (isLightMode ? 'text-zinc-900' : 'text-white');

    if (isEditing) {
        return (
            <textarea
                value={generatedData[activeTab]}
                onChange={(e) => setGeneratedData(prev => ({ ...prev, [activeTab]: e.target.value }))}
                className={`w-full h-[600px] p-4 font-mono text-sm resize-none focus:outline-none ${isLightMode ? 'bg-white text-zinc-900 border border-zinc-200 rounded' : 'bg-zinc-950 text-zinc-300'}`}
            />
        );
    }

    const content = (
        <ReactMarkdown
            components={{
                h1: ({node, ...props}) => (
                    <div className="text-center mb-6">
                        <h1 className={`text-3xl sm:text-4xl font-bold uppercase tracking-wide border-b ${borderClass} pb-4 inline-block px-8 ${h1Class}`} {...props} />
                    </div>
                ),
                h2: ({node, ...props}) => (
                    <h2 
                        className={`text-lg sm:text-xl font-bold mt-8 mb-4 uppercase tracking-widest border-b ${borderClass} pb-2 flex items-center gap-2`} 
                        style={{ color: accentColor.value }}
                        {...props} 
                    />
                ),
                h3: ({node, ...props}) => <h3 className={`text-base sm:text-lg font-bold mt-6 mb-2 ${isResume ? 'text-zinc-800' : (isLightMode ? 'text-zinc-800' : 'text-zinc-100')}`} {...props} />,
                ul: ({node, ...props}) => <ul className="space-y-2 my-4 pl-0" {...props} />,
                li: ({node, ...props}) => (
                    <li className={`flex items-start gap-3 text-sm sm:text-base leading-relaxed group ${textClass}`}>
                        <span className="mt-2 w-1.5 h-1.5 rounded-full shrink-0 group-hover:scale-125 transition-all" style={{ backgroundColor: accentColor.value }} />
                        <span className="flex-1">{props.children}</span>
                    </li>
                ),
                p: ({node, ...props}) => {
                    // Check if paragraph contains typical contact info delimiters (email or pipe)
                    // If so, center it to match PDF output logic
                    const text = String(props.children);
                    const isContactLine = text.includes('@') && text.includes('|');
                    
                    if (isContactLine) {
                         return <p className={`mb-4 whitespace-pre-wrap break-words text-sm sm:text-base leading-relaxed ${textClass} text-center`} {...props} />;
                    }

                    return <p className={`mb-4 whitespace-pre-wrap break-words text-sm sm:text-base leading-relaxed ${textClass}`} {...props} />;
                },
                a: ({node, ...props}) => (
                    <a className="text-orange-500 hover:underline font-bold" target="_blank" rel="noopener noreferrer" {...props} />
                ),
                strong: ({node, ...props}) => <strong className={`font-bold ${isResume ? 'text-black' : (isLightMode ? 'text-black' : 'text-white')}`} {...props} />,
                 // Ensure centering for div with align="center" if passed
                 div: ({node, className, ...props}) => {
                    // @ts-ignore
                    if (props.align === 'center') {
                         return <div className="text-center" {...props} />
                    }
                    return <div className={className} {...props} />
                }
            }}
        >
            {generatedData[activeTab]}
        </ReactMarkdown>
    );

    if (isResume && analysis.contactProfile.photo) {
        return (
            <div className={`${bgClass} transition-colors duration-500 p-6 rounded-sm`}>
                <div className="flex justify-center mb-6">
                    <div className="p-1 rounded-full shadow-lg" style={{ backgroundColor: accentColor.value }}>
                        <img src={analysis.contactProfile.photo} alt="Profile" className={`w-24 h-24 rounded-full object-cover border-4 border-white`} />
                    </div>
                </div>
                {content}
            </div>
        );
    }
    
    return <div className={`${bgClass} transition-colors duration-500 p-6 rounded-sm`}>{content}</div>;
  };

  return (
    <div className={`flex flex-col h-full relative transition-colors duration-500 ${isLightMode ? 'bg-zinc-100' : 'bg-zinc-950'}`}>

        {/* Hidden PDF Render Container - Positioned fixed off-screen to allow html2canvas access while keeping invisible */}
        <div style={{ position: 'fixed', top: 0, left: '-10000px', width: '7.5in', zIndex: -50 }}>
            <div ref={pdfRef} style={{
                // 8.5in (Letter) - 0.5in (Left Margin) - 0.5in (Right Margin) = 7.5in Width
                width: '7.5in', 
                minHeight: '11in',
                padding: '0', // Margins handled by html2pdf config
                backgroundColor: '#ffffff',
                color: '#000000',
                fontFamily: 'Inter, sans-serif',
                fontSize: '10.5pt',
                lineHeight: '1.4'
            }}>
                <ReactMarkdown
                    components={{
                        h1: ({node, ...props}) => (
                            <h1 style={{
                                fontSize: '24pt', fontWeight: 'bold', textTransform: 'uppercase', 
                                textAlign: 'center', marginBottom: '10px', color: '#000', borderBottom: '1px solid #ddd', paddingBottom: '10px'
                            }} {...props} />
                        ),
                        h2: ({node, ...props}) => (
                            <h2 style={{
                                fontSize: '12pt', fontWeight: 'bold', textTransform: 'uppercase', 
                                borderBottom: '1px solid #000', marginTop: '15px', marginBottom: '6px', 
                                paddingBottom: '2px', color: accentColor.value, display: 'flex', alignItems: 'center'
                            }} {...props} />
                        ),
                        h3: ({node, ...props}) => <h3 style={{fontSize: '11pt', fontWeight: 'bold', marginTop: '8px', marginBottom: '2px', color: '#000'}} {...props} />,
                        p: ({node, ...props}) => {
                             const text = String(props.children);
                             const isContactLine = text.includes('@') && text.includes('|');
                             return <p style={{
                                 marginBottom: '8px', 
                                 textAlign: isContactLine ? 'center' : 'left',
                                 whiteSpace: 'pre-wrap',
                                 fontSize: isContactLine ? '10pt' : '10.5pt'
                             }} {...props} />;
                        },
                        ul: ({node, ...props}) => <ul style={{marginBottom: '8px', paddingLeft: '20px', listStyleType: 'disc'}} {...props} />,
                        li: ({node, ...props}) => <li style={{marginBottom: '4px'}} {...props} />,
                        a: ({node, ...props}) => <a style={{color: '#000', textDecoration: 'none', fontWeight: 'bold'}} {...props} />,
                        strong: ({node, ...props}) => <strong style={{fontWeight: 'bold', color: '#000'}} {...props} />,
                        div: ({node, className, ...props}) => {
                            // @ts-ignore
                            if (props.align === 'center') return <div style={{textAlign: 'center'}} {...props} />
                            return <div className={className} {...props} />
                        }
                    }}
                >
                    {generatedData[activeTab] || ''}
                </ReactMarkdown>
            </div>
        </div>

        {/* Toast for Copy */}
        <AnimatePresence>
            {showCopyToast && (
                <motion.div 
                    initial={{ opacity: 0, y: -20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-full shadow-lg"
                >
                    <Check className="w-3.5 h-3.5" /> Copied to Clipboard
                </motion.div>
            )}
        </AnimatePresence>

      <div className={`flex flex-col border-b shrink-0 ${isLightMode ? 'bg-white border-zinc-200' : 'bg-zinc-900/30 border-zinc-800'}`}>
        {/* Tabs - Scrollable on mobile */}
        <div className="px-2 sm:px-4 pt-4 overflow-x-auto scrollbar-hide w-full">
          <div className="flex space-x-1 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-medium rounded-t-lg transition-all border-t border-x flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? isLightMode 
                        ? 'text-zinc-900 bg-white border-zinc-200 border-b-white'
                        : 'text-white bg-zinc-950 border-zinc-800 border-b-zinc-950'
                    : 'text-zinc-500 border-transparent hover:bg-zinc-800/50'
                }`}
              >
                  {loadingStates[tab.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-orange-500' : ''}`} />}
                  {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toolbar - Scrollable on Mobile */}
        <div className={`px-2 sm:px-4 py-2 flex items-center gap-3 border-t overflow-x-auto scrollbar-hide w-full ${isLightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/50 border-zinc-800'}`}>
            <div className="flex items-center gap-2 sm:gap-4 min-w-max">
                 {activeTab === GeneratorType.ATS_RESUME && (
                    <div className="flex items-center gap-2">
                        {/* REFRESH BUTTON */}
                         <button
                            onClick={() => handleGenerate(GeneratorType.ATS_RESUME, true)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] border transition-all hover:bg-zinc-800 ${isLightMode ? 'border-zinc-300 text-zinc-600' : 'border-zinc-700 text-zinc-400'}`}
                            title="Regenerate Resume"
                        >
                            <RefreshCw className={`w-3 h-3 ${loadingStates[GeneratorType.ATS_RESUME] ? 'animate-spin' : ''}`} /> 
                            <span className="hidden sm:inline">Refresh</span>
                        </button>

                        <div className="h-4 w-[1px] bg-zinc-700 mx-1 sm:mx-2"></div>
                        
                        {ACCENT_COLORS.map(color => (
                            <button
                                key={color.name}
                                onClick={() => setAccentColor(color)}
                                className={`w-3 h-3 rounded-full border ${accentColor.name === color.name ? 'border-white scale-110' : 'border-transparent opacity-50'}`}
                                style={{ backgroundColor: color.value }}
                            />
                        ))}
                    </div>
                )}
            </div>
            
            <div className="flex items-center gap-2 ml-auto min-w-max">
                {/* ... existing buttons ... */}
                <button
                    onClick={() => setShowChat(!showChat)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] sm:text-xs font-medium border transition-colors ${showChat ? 'bg-orange-500 text-white border-orange-600' : 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}
                >
                    <PenTool className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Editor</span>
                </button>

                 {/* LANGUAGE SELECTOR */}
                 <div className="relative">
                    <button 
                        onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] sm:text-xs font-medium border transition-colors ${isLightMode ? 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50' : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'}`}
                    >
                        <Globe className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{appLanguage}</span>
                        <ChevronDown className="w-3 h-3 opacity-50" />
                    </button>
                    <AnimatePresence>
                        {isLangMenuOpen && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className={`absolute top-full mt-2 right-0 w-32 border rounded-xl shadow-2xl overflow-hidden z-50 py-1 ${isLightMode ? 'bg-white border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}
                            >
                                {LANGUAGES.map(lang => (
                                    <button 
                                        key={lang}
                                        onClick={() => { setAppLanguage(lang); setIsLangMenuOpen(false); }}
                                        className={`w-full text-left px-4 py-2 text-[10px] font-medium flex items-center justify-between transition-colors ${appLanguage === lang ? 'text-orange-500 bg-orange-500/10' : (isLightMode ? 'text-zinc-600 hover:bg-zinc-100' : 'text-zinc-400 hover:bg-zinc-800')}`}
                                    >
                                        {lang}
                                        {appLanguage === lang && <Check className="w-3 h-3" />}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
               </div>

                 <div className="flex gap-1">
                    <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 text-[10px] sm:text-xs font-bold rounded transition-colors">
                        <Printer className="w-3.5 h-3.5" /> Print
                    </button>
                    <button onClick={handleDownloadPDF} disabled={!!isDownloading} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-white text-black text-[10px] sm:text-xs font-bold rounded transition-colors disabled:opacity-50 relative">
                        {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PDF
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* Hidden Print Template */}
      <div style={{ display: 'none' }}>
        <PdfTemplate ref={pdfRef} content={generatedData[activeTab] || ''} themeColor={accentColor.value} />
      </div>

      <div className="flex flex-1 overflow-hidden">
          <div className={`flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8 md:px-12 max-w-5xl mx-auto w-full relative transition-colors duration-500 ${isLightMode ? 'bg-white' : 'bg-zinc-950'}`}>
             
             {!isPaid ? (
                 <div className="h-full flex flex-col items-center justify-center relative min-h-[400px]">
                     <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none"></div>
                     <PaymentLock onPaymentVerified={onPaymentSuccess} onBeforeRedirect={handleBeforePaymentRedirect} />
                 </div>
             ) : (
                <>
                    {loadingStates[activeTab] && (
                        <div className={`absolute inset-0 flex flex-col items-center justify-center z-10 backdrop-blur-[1px] ${isLightMode ? 'bg-white/80' : 'bg-zinc-950/80'}`}>
                        <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-2" />
                        <p className="font-mono text-xs text-zinc-500">Generating...</p>
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        <motion.div
                        key={activeTab}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="pb-20 min-h-[500px]"
                        >
                            {generatedData[activeTab] ? renderContent() : !loadingStates[activeTab] && (
                                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                    <p className="text-zinc-500 font-mono text-sm">Ready to generate.</p>
                                    <button onClick={() => handleGenerate(activeTab, true)} className="mt-2 text-xs text-orange-500 hover:underline">Start</button>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </>
             )}
          </div>

          <AnimatePresence>
            {showChat && isPaid && (
                <ChatSidebar 
                    show={showChat}
                    onClose={() => setShowChat(false)}
                    onRefine={handleRefine}
                    onQuickAction={handleQuickAction}
                    chatInput={chatInput}
                    setChatInput={setChatInput}
                    isRefining={isRefining}
                    isLightMode={isLightMode}
                    onSectionEdit={handleSectionEdit}
                />
            )}
          </AnimatePresence>
      </div>
    </div>
  );
};

export default ContentGenerator;
