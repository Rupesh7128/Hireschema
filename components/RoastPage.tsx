import * as React from 'react';
import { useState, useEffect } from 'react';
import { LoadingIndicator } from './LoadingIndicator';
import { Upload, AlertCircle, ArrowRight, Flame, Skull, TrendingDown, Trophy, RotateCcw, Star, Zap, Target, Award, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AnimatedLogo } from './AnimatedLogo';
import { FileData, GeneratorType } from '../types';
import { generateContent, extractTextFromPdf } from '../services/geminiService';
import { Area, AreaChart, ResponsiveContainer, XAxis, Tooltip, PieChart, Pie, Cell, RadialBarChart, RadialBar } from 'recharts';
import { Header } from './Header';
import { Footer } from './Footer';

interface RoastPageProps {
  onNavigate: (view: 'landing' | 'blog' | 'pricing' | 'roast' | 'scan') => void;
  appLanguage?: string;
}

export const RoastPage: React.FC<RoastPageProps> = ({ onNavigate, appLanguage = "English" }) => {
  const [isRoasting, setIsRoasting] = useState(false);
  const [roastResult, setRoastResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roastScore, setRoastScore] = useState<number>(0);
  const [roastingProgress, setRoastingProgress] = useState(0);
  const [currentRoastPhase, setCurrentRoastPhase] = useState('');

  const roastData = [
    { name: 'Formatting', value: Math.floor(Math.random() * 30) + 10, color: '#f97316' },
    { name: 'Keywords', value: Math.floor(Math.random() * 25) + 15, color: '#fb923c' },
    { name: 'Impact', value: Math.floor(Math.random() * 20) + 5, color: '#fdba74' },
    { name: 'Brevity', value: Math.floor(Math.random() * 40) + 20, color: '#52525b' },
    { name: 'Cringe Factor', value: Math.floor(Math.random() * 30) + 70, color: '#ea580c' },
  ];

  const roastCategories = [
    { name: 'Unemployable', value: 35, color: '#c2410c' },
    { name: 'Questionable', value: 25, color: '#f97316' },
    { name: 'Mediocre', value: 20, color: '#fb923c' },
    { name: 'Decent', value: 15, color: '#71717a' },
    { name: 'Hireable', value: 5, color: '#a1a1aa' },
  ];

  const roastingPhases = [
    'Scanning for cringe...',
    'Analyzing buzzword density...',
    'Calculating disappointment levels...',
    'Preparing surgical burns...',
    'Finalizing career destruction...'
  ];

  useEffect(() => {
    // SEO: Dynamic Page Metadata
    document.title = "Roast My Resume | Brutally Honest AI Resume Feedback | HireSchema";
    
    // Meta Description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', 'Get a brutally honest, AI-powered roast of your resume. Discover red flags, cringe-worthy buzzwords, and actual fixes to get hired. Start your resume roast now.');

    // Canonical Link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', window.location.origin + '/roast-my-resume');

    // Structured Data (JSON-LD)
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.innerHTML = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Roast My Resume - HireSchema",
      "description": "Brutally honest AI resume feedback and roast machine.",
      "url": window.location.origin + "/roast-my-resume",
      "mainEntity": {
        "@type": "Service",
        "name": "AI Resume Roast",
        "serviceType": "Resume Review",
        "description": "Automated AI-driven resume roasting and feedback service."
      }
    });
    document.head.appendChild(script);

    return () => {
      // Cleanup on unmount
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
      // Reset title if needed (LandingPage handles its own)
    };
  }, []);

  useEffect(() => {
    if (roastResult) {
        // Generate a more realistic low score for comedy effect
        setRoastScore(Math.floor(Math.random() * 35) + 15); // 15-50 range
    }
  }, [roastResult]);

  useEffect(() => {
    let interval: any;
    if (isRoasting) {
      setRoastingProgress(0);
      let phaseIndex = 0;
      setCurrentRoastPhase(roastingPhases[0]);
      
      interval = setInterval(() => {
        setRoastingProgress(prev => {
          const newProgress = prev + Math.random() * 3 + 1;
          const newPhaseIndex = Math.floor(newProgress / 20);
          if (newPhaseIndex !== phaseIndex && newPhaseIndex < roastingPhases.length) {
            phaseIndex = newPhaseIndex;
            setCurrentRoastPhase(roastingPhases[phaseIndex]);
          }
          return Math.min(newProgress, 95);
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isRoasting]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    if (uploadedFile.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const fileData: FileData = {
        id: crypto.randomUUID(),
        name: uploadedFile.name,
        type: uploadedFile.type,
        base64: base64,
        uploadDate: new Date().toISOString()
      };
      await performRoast(fileData);
    };
    reader.readAsDataURL(uploadedFile);
  };

  const performRoast = async (fileData: FileData) => {
    setIsRoasting(true);
    setError(null);
    try {
        // Handle both cases: base64 with data URL prefix or raw base64
        const base64Data = fileData.base64.includes(',') 
            ? fileData.base64.split(',')[1] 
            : fileData.base64;
        
        console.log('Extracting text from PDF...');
        const text = await extractTextFromPdf(base64Data);
        console.log('Extracted text length:', text.length);
        
        if (!text || text.length < 50) {
            throw new Error('Could not extract enough text from PDF. Please ensure the PDF contains readable text.');
        }
        
        console.log('Generating roast content...');
        const result = await generateContent(
            GeneratorType.ROAST,
            fileData,
            '', // No job description for roast
            { missingKeywords: [], contactProfile: { name: 'Candidate', email: '', phone: '', linkedin: '', location: '' }, atsScore: 0, relevanceScore: 0, roleFitAnalysis: '', languages: [], criticalIssues: [], keyStrengths: [], summary: '' }, 
            { language: appLanguage, resumeText: text }
        );
        
        console.log('Roast generated successfully');
        setRoastResult(result);
    } catch (err: any) {
        console.error('Roast error:', err);
        const errorMessage = err.message || 'Roast machine broke. Try again.';
        setError(`Error: ${errorMessage}`);
    } finally {
        setIsRoasting(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-black text-white font-sans selection:bg-orange-500/30">
      {/* Header - Mobile optimized */}
      <Header onNavigate={onNavigate} />

      <main className="pt-28 sm:pt-36 pb-8 sm:pb-12 px-4 container mx-auto max-w-5xl min-h-screen min-h-[100dvh] flex flex-col">
        
        {/* SEO Hidden Semantic Content */}
        <div className="sr-only">
            <section>
                <h2>How our AI Resume Roast Works</h2>
                <p>Our resume roast engine uses advanced natural language processing to identify common pitfalls in modern resumes. We look for:</p>
                <ul>
                    <li>Excessive buzzword density (synergy, thought-leader, etc.)</li>
                    <li>Vague bullet points without quantified impact</li>
                    <li>Poor formatting that confuses ATS (Applicant Tracking Systems)</li>
                    <li>Generic objective statements that add no value</li>
                </ul>
                <p>By identifying these issues, you can improve your resume's performance in job applications and get more interviews.</p>
            </section>
        </div>

        {!roastResult && !isRoasting && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-5 sm:space-y-6 px-2">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="space-y-3"
                >
                    <div className="inline-flex items-center justify-center px-4 py-1.5 bg-orange-500/10 rounded-full mb-2 border border-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
                        <span className="text-orange-500 font-black text-[10px] uppercase tracking-[0.3em]">Roast Engine</span>
                    </div>
                    <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter uppercase">
                        Roast My <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-300">Resume</span>
                    </h1>
                    <p className="text-zinc-400 text-xs sm:text-base max-w-sm mx-auto leading-relaxed px-2 font-medium">
                        Get the internet's most <span className="text-white font-bold">brutally honest AI resume roast</span>. Our engine scans for cringe, red flags, and gaps to help you build a better career.
                    </p>
                </motion.div>

                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="w-full max-w-sm px-2"
                >
                    <label className="group relative flex flex-col items-center justify-center w-full h-48 sm:h-56 rounded-xl border-2 border-dashed border-zinc-800 hover:border-orange-500/50 active:border-orange-500/70 bg-zinc-900/30 hover:bg-zinc-900 transition-all cursor-pointer overflow-hidden touch-target">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5"></div>
                        <div className="relative z-10 flex flex-col items-center justify-center pt-4 pb-5">
                            <p className="mb-1.5 text-sm sm:text-base text-white font-bold uppercase tracking-widest">Drop PDF here</p>
                            <p className="text-[10px] text-zinc-500 font-mono uppercase">TAP TO UPLOAD</p>
                        </div>
                        <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
                    </label>
                </motion.div>
                {error && (
                    <div className="text-orange-500 text-[10px] font-bold flex items-center gap-2 bg-orange-950/30 px-3 py-1.5 rounded-lg border border-orange-900/50 mx-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
                    </div>
                )}
            </div>
        )}

        {isRoasting && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                <LoadingIndicator message={currentRoastPhase} size="lg" />
                
                <div className="w-full max-w-sm space-y-2.5 mt-6">
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600"
                            initial={{ width: 0 }}
                            animate={{ width: `${roastingProgress}%` }}
                            transition={{ duration: 0.8 }}
                        />
                    </div>
                    <div className="text-zinc-500 text-xs font-mono uppercase tracking-widest mt-2">
                        {Math.round(roastingProgress)}% • DESTROYING CAREER
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="space-y-0.5">
                        <div className="text-xl font-black text-orange-500">{Math.floor(Math.random() * 50) + 20}</div>
                        <div className="text-[8px] text-zinc-500 uppercase tracking-widest">Buzzwords</div>
                    </div>
                    <div className="space-y-0.5">
                        <div className="text-xl font-black text-zinc-400">{Math.floor(Math.random() * 15) + 5}</div>
                        <div className="text-[8px] text-zinc-500 uppercase tracking-widest">Red Flags</div>
                    </div>
                    <div className="space-y-0.5">
                        <div className="text-xl font-black text-zinc-500">{Math.floor(Math.random() * 8) + 2}</div>
                        <div className="text-[8px] text-zinc-500 uppercase tracking-widest">Cringe</div>
                    </div>
                </div>
            </div>
        )}

        {roastResult && (
            <AnimatePresence>
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="space-y-4 sm:space-y-6"
                >
                    
                    {/* Enhanced Scoreboard */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-4">
                        {/* Main Score */}
                        <div className="lg:col-span-2 bg-gradient-to-br from-zinc-900 via-zinc-900 to-orange-950/20 border border-orange-900/30 p-5 sm:p-6 rounded-xl flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600"></div>
                            
                            <div className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">Employability Score</div>
                            <div className="relative mb-3">
                                <div className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-400 to-orange-600">
                                    {roastScore}
                                </div>
                                <div className="text-sm font-bold text-zinc-500 absolute -bottom-1 -right-8">/100</div>
                            </div>
                            
                            <div className="flex items-center gap-2 text-orange-400 text-xs font-black bg-orange-950/40 px-3 py-1.5 rounded-full border border-orange-500/20 uppercase tracking-widest">
                                {roastScore < 25 ? "Unhireable" : 
                                 roastScore < 40 ? "Unemployable" : 
                                 roastScore < 55 ? "Mediocre" : "Decent"}
                            </div>
                        </div>
                        
                        {/* Category Breakdown */}
                        <div className="bg-zinc-900/80 border border-zinc-800 p-3 sm:p-4 rounded-xl relative overflow-hidden flex flex-col items-center">
                            <div className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">Damage Report</div>
                            <div className="h-24 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={roastCategories}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={20}
                                            outerRadius={40}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {roastCategories.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ 
                                                backgroundColor: '#18181b', 
                                                border: '1px solid #27272a', 
                                                borderRadius: '8px', 
                                                fontSize: '12px',
                                                color: '#e4e4e7'
                                            }}
                                            itemStyle={{ color: '#e4e4e7' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        
                        {/* Cringe Analytics */}
                        <div className="bg-zinc-900/80 border border-zinc-800 p-3 sm:p-4 rounded-xl relative overflow-hidden flex flex-col items-center">
                            <div className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">Cringe Metrics</div>
                            <div className="h-24 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={roastData}>
                                        <defs>
                                            <linearGradient id="colorCringe" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f97316" stopOpacity="0.4"/>
                                                <stop offset="95%" stopColor="#f97316" stopOpacity="0"/>
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="name" hide />
                                        <Tooltip 
                                            contentStyle={{ 
                                                backgroundColor: '#18181b', 
                                                border: '1px solid #27272a', 
                                                borderRadius: '8px', 
                                                fontSize: '12px' 
                                            }} 
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="value" 
                                            stroke="#f97316" 
                                            strokeWidth={2} 
                                            fillOpacity={1} 
                                            fill="url(#colorCringe)" 
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                        {[
                            { label: 'Buzzword Density', value: `${Math.floor(Math.random() * 40) + 20}%`, color: 'text-orange-500' },
                            { label: 'Cringe Factor', value: `${Math.floor(Math.random() * 30) + 70}/100`, color: 'text-zinc-400' },
                            { label: 'Originality', value: `${Math.floor(Math.random() * 15) + 5}%`, color: 'text-orange-400' },
                            { label: 'Hire Probability', value: `${Math.floor(Math.random() * 20) + 10}%`, color: 'text-zinc-500' },
                        ].map((stat, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1, duration: 0.6 }}
                                className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl text-center"
                            >
                                <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">{stat.label}</div>
                                <div className={`text-lg font-black ${stat.color}`}>{stat.value}</div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Enhanced Main Content */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-orange-950/10 border border-zinc-800 rounded-xl p-6 sm:p-8 md:p-10 shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-600 via-orange-600 to-orange-600"></div>
                        
                        <div className="flex items-center gap-2.5 mb-5">
                            <div className="px-3 py-1 bg-orange-500/10 rounded-md border border-orange-500/20">
                                <span className="text-orange-500 font-black text-[10px] uppercase tracking-widest">Master Verdict</span>
                            </div>
                        </div>
                        
                        <div className="roast-content prose prose-invert max-w-none
                            prose-headings:text-orange-400 prose-headings:font-black prose-headings:tracking-tight
                            prose-h1:text-2xl prose-h1:mb-6 prose-h1:pb-3 prose-h1:border-b prose-h1:border-orange-500/20
                            prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:pb-1.5 prose-h2:border-b prose-h2:border-orange-500/10
                            prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2
                            prose-p:text-zinc-300 prose-p:leading-relaxed prose-p:text-xs sm:prose-p:text-sm prose-p:mb-4 prose-p:font-medium
                            prose-strong:text-white prose-strong:font-bold prose-strong:bg-orange-950/40 prose-strong:px-1.5 prose-strong:py-0.5 prose-strong:rounded
                            prose-em:text-orange-400 prose-em:not-italic prose-em:font-bold
                            prose-ul:my-4 prose-ul:space-y-3
                            prose-li:text-zinc-300 prose-li:text-xs sm:prose-li:text-sm prose-li:leading-relaxed
                            prose-li:marker:text-orange-500
                            prose-blockquote:border-l-4 prose-blockquote:border-orange-500 prose-blockquote:bg-orange-950/20 prose-blockquote:p-4 prose-blockquote:rounded-r-lg prose-blockquote:my-6
                            prose-code:bg-zinc-800 prose-code:text-orange-400 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[10px]
                        ">
                            <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    h1: ({node, ...props}) => <h1 className="text-2xl font-black text-orange-500 mb-5 pb-3 border-b border-orange-500/20 tracking-tight" {...props} />,
                                    h2: ({node, ...props}) => <h2 className="text-xl font-black text-orange-500 mt-8 mb-3 pb-1.5 border-b border-white/5" {...props} />,
                                    h3: ({node, ...props}) => <h3 className="text-base font-black text-orange-400 mt-5 mb-2 uppercase tracking-wide" {...props} />,
                                    p: ({node, ...props}) => <p className="text-zinc-300 leading-relaxed mb-3 text-xs sm:text-sm font-medium" {...props} />,
                                    ul: ({node, ...props}) => <ul className="space-y-2.5 my-3 list-disc pl-4 text-zinc-300 text-xs sm:text-sm" {...props} />,
                                    li: ({node, ...props}) => <li className="pl-1" {...props} />,
                                    blockquote: ({node, ...props}) => (
                                        <blockquote className="my-6 border-l-4 border-orange-500 bg-orange-950/20 p-4 rounded-r-lg" {...props} />
                                    ),
                                    strong: ({node, ...props}) => <strong className="font-black text-white bg-white/5 px-1.5 py-0.5 rounded border border-white/10" {...props} />,
                                    hr: ({node, ...props}) => <hr className="my-8 border-zinc-800" {...props} />
                                }}
                            >
                                {roastResult}
                            </ReactMarkdown>
                        </div>
                    </motion.div>

                    {/* Enhanced CTA Footer */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.6 }}
                        className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-orange-950/20 border border-zinc-800 rounded-xl p-5 sm:p-6 relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-600 to-red-600"></div>
                        
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-5">
                            <div>
                                <h3 className="text-2xl font-black text-white mb-1 uppercase tracking-tighter">Ready to fix it?</h3>
                                <p className="text-zinc-400 text-xs sm:text-sm max-w-sm leading-relaxed font-medium">
                                    We've roasted thousands. Your resume doesn't have to be a joke.
                                </p>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-2.5 w-full lg:w-auto">
                                <a 
                                    href="/roast-my-resume"
                                    onClick={(e) => {
                                        if (e.metaKey || e.ctrlKey) return;
                                        e.preventDefault();
                                        window.location.reload();
                                    }} 
                                    className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-mono font-black text-[10px] uppercase tracking-widest transition-all rounded-sm border border-zinc-800 flex items-center justify-center gap-2"
                                >
                                    <span>Try Again</span>
                                </a>
                                <a 
                                    href="/app"
                                    onClick={(e) => {
                                        if (e.metaKey || e.ctrlKey) return;
                                        e.preventDefault();
                                        onNavigate('scan');
                                    }}
                                    className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-mono font-black text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all rounded-sm touch-target"
                                >
                                    Fix It Fast
                                </a>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        )}

      </main>
      
      <Footer onNavigate={onNavigate} />
    </div>
  );
};

export default RoastPage;

