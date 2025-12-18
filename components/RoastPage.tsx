import * as React from 'react';
import { useState, useEffect } from 'react';
import { Upload, AlertCircle, Loader2, ArrowRight, Flame, Skull, TrendingDown, Trophy, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { AnimatedLogo } from './AnimatedLogo';
import { FileData, GeneratorType } from '../types';
import { generateContent, extractTextFromPdf } from '../services/geminiService';
import { Area, AreaChart, ResponsiveContainer, XAxis, Tooltip } from 'recharts';

export const RoastPage = () => {
  const [isRoasting, setIsRoasting] = useState(false);
  const [roastResult, setRoastResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roastScore, setRoastScore] = useState<number>(0);

  const roastData = [
    { name: 'Formatting', value: 20 },
    { name: 'Keywords', value: 15 },
    { name: 'Impact', value: 10 },
    { name: 'Brevity', value: 30 },
    { name: 'Cringe', value: 90 },
  ];

  useEffect(() => {
    if (roastResult) {
        // Simulate score extraction or random high roast score
        setRoastScore(Math.floor(Math.random() * 40) + 10); // Low score is funny
    }
  }, [roastResult]);

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
        const text = await extractTextFromPdf(base64Data);
        const result = await generateContent(
            GeneratorType.ROAST,
            fileData,
            '', // No job description for roast
            { missingKeywords: [], contactProfile: { name: 'Candidate', email: '', phone: '', linkedin: '', location: '' }, atsScore: 0, relevanceScore: 0, roleFitAnalysis: '', languages: [], criticalIssues: [], keyStrengths: [], summary: '' }, 
            { language: 'English', resumeText: text }
        );
        setRoastResult(result);
    } catch (err: any) {
        setError('Roast machine broke. Try again.');
        console.error(err);
    } finally {
        setIsRoasting(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-black text-white font-sans selection:bg-red-500/30">
      {/* Header - Mobile optimized */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5 h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 safe-area-inset">
        <AnimatedLogo />
        <a href="/" className="text-xs font-bold text-zinc-400 hover:text-white active:text-white transition-colors touch-target px-2 py-2">Back to Home</a>
      </header>

      <main className="pt-20 sm:pt-24 pb-8 sm:pb-12 px-4 container mx-auto max-w-5xl min-h-screen min-h-[100dvh] flex flex-col">
        
        {!roastResult && !isRoasting && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 sm:space-y-8 px-2">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="space-y-4"
                >
                    <div className="inline-flex items-center justify-center p-3 sm:p-4 bg-red-500/10 rounded-full mb-4 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                        <Flame className="w-8 sm:w-10 h-8 sm:h-10 text-red-500" />
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter uppercase">
                        Roast My <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">Resume</span>
                    </h1>
                    <p className="text-zinc-400 text-base sm:text-lg max-w-md mx-auto leading-relaxed px-2">
                        Your resume is about to have a very bad day. Get brutally honest feedback that's <span className="text-white font-bold">surgically mean and commercially effective.</span>
                    </p>
                </motion.div>

                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="w-full max-w-md px-2"
                >
                    <label className="group relative flex flex-col items-center justify-center w-full h-56 sm:h-64 rounded-2xl border-2 border-dashed border-zinc-800 hover:border-red-500/50 active:border-red-500/70 bg-zinc-900/30 hover:bg-zinc-900 transition-all cursor-pointer overflow-hidden touch-target">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5"></div>
                        <div className="relative z-10 flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-10 sm:w-12 h-10 sm:h-12 text-zinc-600 group-hover:text-red-500 mb-4 transition-colors transform group-hover:scale-110 duration-300" />
                            <p className="mb-2 text-base sm:text-lg text-white font-bold">Drop your PDF here</p>
                            <p className="text-xs text-zinc-500 font-mono">TAP TO UPLOAD</p>
                        </div>
                        <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
                    </label>
                </motion.div>
                {error && <p className="text-red-500 text-sm font-bold flex items-center gap-2 bg-red-950/30 px-4 py-2 rounded-lg border border-red-900/50 mx-2"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</p>}
            </div>
        )}

        {isRoasting && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="relative">
                    <div className="absolute inset-0 bg-red-500 blur-2xl opacity-20 animate-pulse"></div>
                    <Loader2 className="w-16 h-16 text-red-500 animate-spin relative z-10" />
                </div>
                <h2 className="text-3xl font-black mt-8 tracking-tight animate-pulse">COOKING YOUR CAREER...</h2>
                <div className="h-1 w-64 bg-zinc-800 rounded-full mt-6 overflow-hidden">
                    <div className="h-full bg-red-600 animate-progress-indeterminate"></div>
                </div>
                <p className="text-zinc-500 mt-4 font-mono text-sm">Calibrating cringe detector • Quantifying disappointment • Preparing surgical burns</p>
            </div>
        )}

        {roastResult && (
            <div className="space-y-5 sm:space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                
                {/* Scoreboard */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                    <div className="bg-zinc-900/80 border border-red-900/30 p-4 sm:p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-xl">
                        <div className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-2">Employability Score</div>
                        <div className="text-5xl sm:text-6xl font-black text-red-500">{roastScore}/100</div>
                        <div className="flex items-center gap-1 text-red-400 text-[10px] sm:text-xs font-bold mt-2 bg-red-950/30 px-2 py-1 rounded">
                            <TrendingDown className="w-3 h-3" /> {roastScore < 30 ? "Medically Unhireable" : roastScore < 50 ? "Spiritually Bootstrapped" : "Barely Breathing"}
                        </div>
                    </div>
                    
                    <div className="bg-zinc-900/80 border border-zinc-800 p-4 sm:p-6 rounded-2xl md:col-span-2 relative overflow-hidden">
                        <div className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-3 sm:mb-4">Cringe Analytics</div>
                        <div className="h-28 sm:h-32 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={roastData}>
                                    <defs>
                                        <linearGradient id="colorCringe" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" hide />
                                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }} itemStyle={{ color: '#fff' }} />
                                    <Area type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorCringe)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-8 md:p-12 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-orange-600 to-red-600"></div>
                    <div className="absolute top-4 sm:top-6 right-4 sm:right-6">
                        <Skull className="w-8 sm:w-12 h-8 sm:h-12 text-zinc-800/50" />
                    </div>
                    
                    <div className="roast-content prose prose-invert max-w-none
                        prose-h2:text-xl prose-h2:sm:text-2xl prose-h2:font-black prose-h2:text-red-500 prose-h2:mt-8 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-red-500/20
                        prose-h3:text-lg prose-h3:font-bold prose-h3:text-orange-400 prose-h3:mt-6 prose-h3:mb-3
                        prose-p:text-zinc-300 prose-p:leading-relaxed prose-p:text-sm prose-p:sm:text-base prose-p:mb-4
                        prose-strong:text-white prose-strong:font-bold
                        prose-ul:my-4 prose-ul:space-y-3
                        prose-li:text-zinc-300 prose-li:text-sm prose-li:sm:text-base prose-li:leading-relaxed prose-li:pl-2
                        prose-li:marker:text-red-500
                        [&_ul]:list-none [&_ul]:pl-0
                        [&_li]:relative [&_li]:pl-4 [&_li]:before:content-['🔥'] [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-0
                    ">
                        <ReactMarkdown>{roastResult}</ReactMarkdown>
                    </div>
                </div>

                {/* CTA Footer */}
                <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-2xl p-5 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-5 sm:gap-8">
                    <div className="flex items-start gap-3 sm:gap-4">
                        <div className="p-2 sm:p-3 bg-orange-500/10 rounded-xl border border-orange-500/20 shrink-0">
                            <Trophy className="w-6 sm:w-8 h-6 sm:h-8 text-orange-500" />
                        </div>
                        <div>
                            <h3 className="text-lg sm:text-xl font-bold text-white">Ready to stop being a punchline?</h3>
                            <p className="text-zinc-400 text-xs sm:text-sm mt-1 max-w-md">
                                Roasted thousands. Hired hundreds. Yours is next.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <button onClick={() => window.location.reload()} className="px-5 sm:px-6 py-3 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all touch-target">
                            <RotateCcw className="w-4 h-4" /> <span className="hidden xs:inline">Roast</span> Another
                        </button>
                        <a href="/" className="px-6 sm:px-8 py-3 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-transform hover:scale-105 shadow-lg shadow-orange-900/20 touch-target text-sm sm:text-base">
                            Fix It Fast <ArrowRight className="w-4 h-4" />
                        </a>
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
};

