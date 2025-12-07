import React, { useState, useRef } from 'react';
import { Upload, Zap, AlertCircle, Loader2, ArrowRight, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { AnimatedLogo } from './AnimatedLogo';
import { FileData, GeneratorType } from '../types';
import { generateContent } from '../services/geminiService';
import { extractTextFromPdf } from '../services/geminiService';

export const RoastPage = () => {
  const [file, setFile] = useState<FileData | null>(null);
  const [isRoasting, setIsRoasting] = useState(false);
  const [roastResult, setRoastResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        // Extract text first (simulating context for the roast)
        const text = await extractTextFromPdf(fileData.base64.split(',')[1]);
        
        // Reuse existing service but with ROAST type
        // We pass a dummy "analysis" object because the service expects it, 
        // but the prompt for ROAST relies mostly on the 'jobDescription' arg 
        // which we will repurpose as the Resume Text for this specific call.
        // Or better, we update the service to handle this.
        // Actually, let's look at geminiService. The userPrompt for ROAST uses 'jobDescription' as context?
        // Let's check the service implementation.
        // In geminiService: const fullPrompt = `Job Description Context: ${jobDescription}\n\nTask: ${userPrompt}`;
        // So we pass the Resume Text as the "Job Description" param to give the model the content to roast.
        
        const result = await generateContent(
            GeneratorType.ROAST,
            fileData,
            text, // Passing resume text as context
            { missingKeywords: [], contactProfile: { name: 'Candidate', email: '', phone: '', linkedin: '', location: '' }, atsScore: 0, relevanceScore: 0, roleFitAnalysis: '', languages: [], criticalIssues: [], keyStrengths: [], summary: '' }, // Dummy analysis
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

      <main className="pt-24 pb-12 px-4 container mx-auto max-w-3xl min-h-screen flex flex-col">
        
        {!roastResult && !isRoasting && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="space-y-4"
                >
                    <div className="inline-flex items-center justify-center p-3 bg-red-500/10 rounded-full mb-4">
                        <Zap className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter">
                        ROAST MY <span className="text-red-500">RESUME</span>
                    </h1>
                    <p className="text-zinc-400 text-lg max-w-md mx-auto">
                        Our AI takes no prisoners. Upload your CV and get brutally honest (and hilarious) feedback.
                    </p>
                </motion.div>

                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="w-full max-w-sm"
                >
                    <label className="group relative flex flex-col items-center justify-center w-full h-64 rounded-2xl border-2 border-dashed border-zinc-800 hover:border-red-500/50 bg-zinc-900/50 hover:bg-zinc-900 transition-all cursor-pointer overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5"></div>
                        <div className="relative z-10 flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-10 h-10 text-zinc-500 group-hover:text-red-500 mb-3 transition-colors" />
                            <p className="mb-2 text-sm text-zinc-400 font-bold">Click to upload PDF</p>
                            <p className="text-xs text-zinc-600">Max 5MB</p>
                        </div>
                        <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
                    </label>
                </motion.div>
                {error && <p className="text-red-500 text-sm font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</p>}
            </div>
        )}

        {isRoasting && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-12 h-12 text-red-500 animate-spin mb-6" />
                <h2 className="text-2xl font-bold animate-pulse">Cooking your career...</h2>
                <p className="text-zinc-500 mt-2">Preparing the insults.</p>
            </div>
        )}

        {roastResult && (
            <div className="space-y-8">
                <div className="bg-zinc-900 border border-red-500/20 rounded-2xl p-8 md:p-12 shadow-2xl shadow-red-900/10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500"></div>
                    <div className="prose prose-invert prose-headings:font-black prose-headings:text-red-500 max-w-none">
                        <ReactMarkdown>{roastResult}</ReactMarkdown>
                    </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-center md:text-left">
                        <h3 className="text-xl font-bold text-white">Recover from that burn?</h3>
                        <p className="text-zinc-400 text-sm mt-1">Use our pro tools to fix your resume and actually get hired.</p>
                    </div>
                    <a href="/" className="px-8 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded flex items-center gap-2 transition-transform hover:scale-105 shadow-lg shadow-orange-900/20">
                        Fix My Resume <ArrowRight className="w-4 h-4" />
                    </a>
                </div>
            </div>
        )}

      </main>
    </div>
  );
};
