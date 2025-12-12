import React, { useState, useEffect } from 'react';
import { Upload, Zap, AlertCircle, Loader2, ArrowRight, Share2, Flame, Skull, TrendingDown, Trophy, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { AnimatedLogo } from './AnimatedLogo';
import { FileData, GeneratorType } from '../types';
import { generateContent } from '../services/geminiService';
import { extractTextFromPdf } from '../services/geminiService';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

export const RoastPage = () => {
  const [file, setFile] = useState<FileData | null>(null);
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
      setFile(fileData);
      await performRoast(fileData);
    };
    reader.readAsDataURL(uploadedFile);
  };

  const performRoast = async (fileData: FileData) => {
    setIsRoasting(true);
    setError(null);
    try {
        const text = await extractTextFromPdf(fileData.base64.split(',')[1]);
        const result = await generateContent(
            GeneratorType.ROAST,
            fileData,
            text,
            { missingKeywords: [], contactProfile: { name: 'Candidate', email: '', phone: '', linkedin: '', location: '' }, atsScore: 0, relevanceScore: 0, roleFitAnalysis: '', languages: [], criticalIssues: [], keyStrengths: [], summary: '' }, 
            { language: 'English' }
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
    <div className="min-h-screen bg-black text-white font-sans selection:bg-red-500/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5 h-16 flex items-center justify-between px-6">
        <AnimatedLogo />
        <a href="/" className="text-xs font-bold text-zinc-400 hover:text-white transition-colors">Back to Home</a>
      </header>

      <main className="pt-24 pb-12 px-4 container mx-auto max-w-5xl min-h-screen flex flex-col">
        
        {!roastResult && !isRoasting && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="space-y-4"
                >
                    <div className="inline-flex items-center justify-center p-4 bg-red-500/10 rounded-full mb-4 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                        <Flame className="w-10 h-10 text-red-500" />
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase">
                        Roast My <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">Resume</span>
                    </h1>
                    <p className="text-zinc-400 text-lg max-w-md mx-auto leading-relaxed">
                        Our AI is ruthless. Upload your CV and get brutally honest (and hilarious) feedback. <span className="text-white font-bold">Not for the faint of heart.</span>
                    </p>
                </motion.div>

                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="w-full max-w-md"
                >
                    <label className="group relative flex flex-col items-center justify-center w-full h-64 rounded-2xl border-2 border-dashed border-zinc-800 hover:border-red-500/50 bg-zinc-900/30 hover:bg-zinc-900 transition-all cursor-pointer overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5"></div>
                        <div className="relative z-10 flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-12 h-12 text-zinc-600 group-hover:text-red-500 mb-4 transition-colors transform group-hover:scale-110 duration-300" />
                            <p className="mb-2 text-lg text-white font-bold">Drop your PDF here</p>
                            <p className="text-xs text-zinc-500 font-mono">DARE TO CLICK</p>
                        </div>
                        <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
                    </label>
                </motion.div>
                {error && <p className="text-red-500 text-sm font-bold flex items-center gap-2 bg-red-950/30 px-4 py-2 rounded-lg border border-red-900/50"><AlertCircle className="w-4 h-4" /> {error}</p>}
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
                <p className="text-zinc-500 mt-4 font-mono text-sm">Preparing the insults • Sharpening the knives</p>
            </div>
        )}

        {roastResult && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                
                {/* Scoreboard */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-zinc-900/80 border border-red-900/30 p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-xl">
                        <div className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Employability Score</div>
                        <div className="text-6xl font-black text-red-500">{roastScore}/100</div>
                        <div className="flex items-center gap-1 text-red-400 text-xs font-bold mt-2 bg-red-950/30 px-2 py-1 rounded">
                            <TrendingDown className="w-3 h-3" /> Critical Condition
                        </div>
                    </div>
                    
                    <div className="bg-zinc-900/80 border border-zinc-800 p-6 rounded-2xl col-span-2 relative overflow-hidden">
                        <div className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Cringe Analytics</div>
                        <div className="h-32 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={roastData}>
                                    <defs>
                                        <linearGradient id="colorCringe" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" hide />
                                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                                    <Area type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorCringe)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-orange-600 to-red-600"></div>
                    <div className="absolute top-6 right-6">
                        <Skull className="w-12 h-12 text-zinc-800/50" />
                    </div>
                    
                    <div className="prose prose-invert prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-h1:text-3xl prose-h2:text-xl prose-h2:text-red-500 prose-p:text-zinc-300 prose-p:leading-relaxed prose-strong:text-white max-w-none">
                        <ReactMarkdown>{roastResult}</ReactMarkdown>
                    </div>
                </div>

                {/* CTA Footer */}
                <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
                            <Trophy className="w-8 h-8 text-orange-500" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Recover from the burn?</h3>
                            <p className="text-zinc-400 text-sm mt-1 max-w-md">
                                Use our AI to fix the gaps, optimize keywords, and actually get hired.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <button onClick={() => window.location.reload()} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all">
                            <RotateCcw className="w-4 h-4" /> Roast Another
                        </button>
                        <a href="/" className="px-8 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-transform hover:scale-105 shadow-lg shadow-orange-900/20">
                            Fix My Resume <ArrowRight className="w-4 h-4" />
                        </a>
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
};

