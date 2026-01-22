import * as React from 'react';
import { useState, useEffect } from 'react';
import { Upload, AlertCircle, Loader2, ArrowRight, Flame, Skull, TrendingDown, Trophy, RotateCcw, Star, Zap, Target, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AnimatedLogo } from './AnimatedLogo';
import { FileData, GeneratorType } from '../types';
import { generateContent, extractTextFromPdf } from '../services/geminiService';
import { Area, AreaChart, ResponsiveContainer, XAxis, Tooltip, PieChart, Pie, Cell, RadialBarChart, RadialBar } from 'recharts';

export const RoastPage = () => {
  const [isRoasting, setIsRoasting] = useState(false);
  const [roastResult, setRoastResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roastScore, setRoastScore] = useState<number>(0);
  const [roastingProgress, setRoastingProgress] = useState(0);
  const [currentRoastPhase, setCurrentRoastPhase] = useState('');

  const roastData = [
    { name: 'Formatting', value: Math.floor(Math.random() * 30) + 10, color: '#ef4444' },
    { name: 'Keywords', value: Math.floor(Math.random() * 25) + 15, color: '#f97316' },
    { name: 'Impact', value: Math.floor(Math.random() * 20) + 5, color: '#eab308' },
    { name: 'Brevity', value: Math.floor(Math.random() * 40) + 20, color: '#22c55e' },
    { name: 'Cringe Factor', value: Math.floor(Math.random() * 30) + 70, color: '#dc2626' },
  ];

  const roastCategories = [
    { name: 'Unemployable', value: 35, color: '#dc2626' },
    { name: 'Questionable', value: 25, color: '#f97316' },
    { name: 'Mediocre', value: 20, color: '#eab308' },
    { name: 'Decent', value: 15, color: '#22c55e' },
    { name: 'Hireable', value: 5, color: '#10b981' },
  ];

  const roastingPhases = [
    'Scanning for cringe...',
    'Analyzing buzzword density...',
    'Calculating disappointment levels...',
    'Preparing surgical burns...',
    'Finalizing career destruction...'
  ];

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
            { language: 'English', resumeText: text }
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
    <div className="min-h-screen min-h-[100dvh] bg-black text-white font-sans selection:bg-red-500/30">
      {/* Header - Mobile optimized */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5 h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 safe-area-inset">
        <div className="cursor-pointer" onClick={() => window.location.href = '/'}>
          <AnimatedLogo />
        </div>
        <button onClick={() => window.history.back()} className="text-xs font-bold text-zinc-400 hover:text-white active:text-white transition-colors touch-target px-2 py-2">Back to Home</button>
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
                    transition={{ delay: 0.4 }}
                    className="w-full max-w-md px-2"
                >
                    <label className="group relative flex flex-col items-center justify-center w-full h-56 sm:h-64 rounded-2xl border-2 border-dashed border-zinc-800 hover:border-red-500/50 active:border-red-500/70 bg-zinc-900/30 hover:bg-zinc-900 transition-all cursor-pointer overflow-hidden touch-target">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5"></div>
                        <div className="relative z-10 flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-10 sm:w-12 h-10 sm:h-12 text-zinc-600 group-hover:text-red-500 mb-4 transition-colors transform group-hover:scale-110 duration-500" />
                            <p className="mb-2 text-base sm:text-lg text-white font-bold">Drop your PDF here</p>
                            <p className="text-xs text-zinc-500 font-mono">TAP TO UPLOAD</p>
                        </div>
                        <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
                    </label>
                </motion.div>
                {error && (
                    <div className="text-red-500 text-sm font-bold flex items-center gap-2 bg-red-950/30 px-4 py-2 rounded-lg border border-red-900/50 mx-2">
                        <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                    </div>
                )}
            </div>
        )}

        {isRoasting && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative"
                >
                    <div className="absolute inset-0 bg-red-500 blur-3xl opacity-30 animate-pulse"></div>
                    <div className="relative w-24 h-24 bg-zinc-900 border-2 border-red-500/30 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.4)]">
                        <Flame className="w-12 h-12 text-red-500 animate-bounce" />
                    </div>
                </motion.div>
                
                <div className="space-y-4">
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                        ROASTING IN PROGRESS
                    </h2>
                    <p className="text-red-400 font-mono text-sm animate-pulse">
                        {currentRoastPhase}
                    </p>
                </div>

                <div className="w-full max-w-md space-y-3">
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-red-600"
                            initial={{ width: 0 }}
                            animate={{ width: `${roastingProgress}%` }}
                            transition={{ duration: 0.8 }}
                        />
                    </div>
                    <div className="text-zinc-500 text-xs font-mono">
                        {Math.round(roastingProgress)}% • Preparing career destruction
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="space-y-1">
                        <div className="text-2xl font-black text-red-500">{Math.floor(Math.random() * 50) + 20}</div>
                        <div className="text-xs text-zinc-500 uppercase">Buzzwords</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-2xl font-black text-orange-500">{Math.floor(Math.random() * 15) + 5}</div>
                        <div className="text-xs text-zinc-500 uppercase">Red Flags</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-2xl font-black text-yellow-500">{Math.floor(Math.random() * 8) + 2}</div>
                        <div className="text-xs text-zinc-500 uppercase">Cringe Level</div>
                    </div>
                </div>
            </div>
        )}

        {roastResult && (
            <AnimatePresence>
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.0 }}
                    className="space-y-6 sm:space-y-8"
                >
                    
                    {/* Enhanced Scoreboard */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
                        {/* Main Score */}
                        <div className="lg:col-span-2 bg-gradient-to-br from-zinc-900 via-zinc-900 to-red-950/20 border border-red-900/30 p-6 sm:p-8 rounded-2xl flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600"></div>
                            <div className="absolute top-4 right-4">
                                <Skull className="w-8 h-8 text-red-500/20" />
                            </div>
                            
                            <div className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-3">Employability Score</div>
                            <div className="relative mb-4">
                                <div className="text-6xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-red-400 to-red-600">
                                    {roastScore}
                                </div>
                                <div className="text-2xl font-bold text-zinc-500 absolute -bottom-1 -right-8">/100</div>
                            </div>
                            
                            <div className="flex items-center gap-2 text-red-400 text-sm font-bold bg-red-950/40 px-4 py-2 rounded-full border border-red-500/20">
                                <TrendingDown className="w-4 h-4" />
                                {roastScore < 25 ? "Medically Unhireable" : 
                                 roastScore < 40 ? "Spiritually Unemployable" : 
                                 roastScore < 55 ? "Barely Breathing" : "Surprisingly Decent"}
                            </div>
                        </div>
                        
                        {/* Category Breakdown */}
                        <div className="bg-zinc-900/80 border border-zinc-800 p-4 sm:p-6 rounded-2xl relative overflow-hidden">
                            <div className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-4">Damage Report</div>
                            <div className="h-32 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={roastCategories}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={25}
                                            outerRadius={50}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {roastCategories.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ 
                                                backgroundColor: '#18181b', 
                                                border: '1px solid #27272a', 
                                                borderRadius: '8px', 
                                                fontSize: '12px' 
                                            }} 
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        
                        {/* Cringe Analytics */}
                        <div className="bg-zinc-900/80 border border-zinc-800 p-4 sm:p-6 rounded-2xl relative overflow-hidden">
                            <div className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-4">Cringe Metrics</div>
                            <div className="h-32 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={roastData}>
                                        <defs>
                                            <linearGradient id="colorCringe" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
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
                                            stroke="#ef4444" 
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
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        {[
                            { icon: Target, label: 'Buzzword Density', value: `${Math.floor(Math.random() * 40) + 20}%`, color: 'text-red-500' },
                            { icon: Zap, label: 'Cringe Factor', value: `${Math.floor(Math.random() * 30) + 70}/100`, color: 'text-orange-500' },
                            { icon: Star, label: 'Originality', value: `${Math.floor(Math.random() * 15) + 5}%`, color: 'text-yellow-500' },
                            { icon: Award, label: 'Hire Probability', value: `${Math.floor(Math.random() * 20) + 10}%`, color: 'text-green-500' },
                        ].map((stat, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.2, duration: 0.8 }}
                                className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-xl text-center"
                            >
                                <stat.icon className={`w-6 h-6 ${stat.color} mx-auto mb-2`} />
                                <div className="text-lg font-bold text-white">{stat.value}</div>
                                <div className="text-xs text-zinc-500">{stat.label}</div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Enhanced Main Content */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.8 }}
                        className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-red-950/10 border border-zinc-800 rounded-2xl p-6 sm:p-8 md:p-12 shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-orange-600 to-red-600"></div>
                        <div className="absolute top-6 right-6">
                            <Flame className="w-10 h-10 text-red-500/20" />
                        </div>
                        
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                                <Skull className="w-6 h-6 text-red-500" />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">The Verdict</h2>
                                <p className="text-zinc-400 text-sm">Brutally honest feedback incoming</p>
                            </div>
                        </div>
                        
                        <div className="roast-content prose prose-invert max-w-none
                            prose-headings:text-red-400 prose-headings:font-black prose-headings:tracking-tight
                            prose-h1:text-2xl prose-h1:sm:text-3xl prose-h1:mb-8 prose-h1:pb-4 prose-h1:border-b prose-h1:border-red-500/20
                            prose-h2:text-xl prose-h2:sm:text-2xl prose-h2:mt-10 prose-h2:mb-6 prose-h2:pb-2 prose-h2:border-b prose-h2:border-red-500/10 prose-h2:text-orange-400
                            prose-h3:text-lg prose-h3:font-bold prose-h3:text-orange-300 prose-h3:mt-6 prose-h3:mb-3
                            prose-p:text-zinc-300 prose-p:leading-relaxed prose-p:text-sm prose-p:sm:text-base prose-p:mb-6 prose-p:font-medium
                            prose-strong:text-white prose-strong:font-bold prose-strong:bg-red-950/40 prose-strong:px-1.5 prose-strong:py-0.5 prose-strong:rounded prose-strong:border prose-strong:border-red-500/20
                            prose-em:text-orange-400 prose-em:not-italic prose-em:font-semibold
                            prose-ul:my-6 prose-ul:space-y-4
                            prose-li:text-zinc-300 prose-li:text-sm prose-li:sm:text-base prose-li:leading-relaxed prose-li:pl-2
                            prose-li:marker:text-red-500
                            prose-ol:my-6 prose-ol:space-y-4
                            prose-hr:my-10 prose-hr:border-zinc-800
                            prose-blockquote:border-l-4 prose-blockquote:border-red-500 prose-blockquote:bg-gradient-to-r prose-blockquote:from-red-950/20 prose-blockquote:to-transparent prose-blockquote:p-6 prose-blockquote:rounded-r-lg prose-blockquote:my-8 prose-blockquote:shadow-sm
                            prose-code:bg-zinc-800 prose-code:text-orange-400 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm
                            [&_ul]:list-disc [&_ul]:pl-5
                            [&_li_strong]:text-orange-200 [&_li_strong]:bg-transparent [&_li_strong]:border-none [&_li_strong]:px-0
                        ">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{roastResult}</ReactMarkdown>
                        </div>
                    </motion.div>

                    {/* Enhanced CTA Footer */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.0, duration: 0.8 }}
                        className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-orange-950/20 border border-zinc-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-600 to-red-600"></div>
                        
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20 shrink-0">
                                    <Trophy className="w-8 h-8 text-orange-500" />
                                </div>
                                <div>
                                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Ready to stop being a punchline?</h3>
                                    <p className="text-zinc-400 text-sm sm:text-base max-w-md leading-relaxed">
                                        We've roasted thousands and hired hundreds. Your resume doesn't have to be a comedy show.
                                    </p>
                                    <div className="flex items-center gap-4 mt-4 text-xs text-zinc-500">
                                        <div className="flex items-center gap-1">
                                            <Star className="w-3 h-3 text-yellow-500" />
                                            <span>4.9/5 Success Rate</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Target className="w-3 h-3 text-green-500" />
                                            <span>2x More Interviews</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                                <button 
                                    onClick={() => window.location.reload()} 
                                    className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all touch-target border border-zinc-700"
                                >
                                    <RotateCcw className="w-4 h-4" /> 
                                    <span>Roast Another</span>
                                </button>
                                <button 
                                    onClick={() => window.history.back()}
                                    className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 active:from-orange-700 active:to-red-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all hover:scale-105 shadow-lg shadow-orange-900/30 touch-target"
                                >
                                    Fix It Fast <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        )}

      </main>
    </div>
  );
};

