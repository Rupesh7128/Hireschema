import React from 'react';
import { ArrowLeft, Check, LucideIcon, Upload, Zap, BookOpen, Flame } from 'lucide-react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { Header } from './Header';
import { Footer } from './Footer';

export interface FeaturePageProps {
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  benefits: string[];
  
  // New detailed sections
  problemTitle: string;
  problemDesc: string;
  solutionTitle: string;
  solutionDesc: string;
  howItWorksSteps: { title: string; desc: string }[];
  
  onBack: () => void;
  onCtaClick: () => void;
  
  // Pass navigate function for shared header
  onNavigate: (view: string) => void;
}

// Shared Button Style (Square/Techy)
const ORANGE_BUTTON_STYLE = "px-6 sm:px-10 py-3.5 sm:py-4 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-mono font-bold text-sm sm:text-base tracking-wide flex items-center justify-center gap-2 sm:gap-3 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] hover:shadow-none active:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[2px] active:translate-y-[2px] transition-all rounded-sm cursor-pointer border-none touch-target";

export const FeaturePage: React.FC<FeaturePageProps> = ({
  title,
  subtitle,
  description,
  icon: Icon,
  benefits,
  problemTitle,
  problemDesc,
  solutionTitle,
  solutionDesc,
  howItWorksSteps,
  onBack,
  onCtaClick,
  onNavigate
}) => {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-orange-500/30">
      
      <Header onNavigate={onNavigate as any} />

      <main className="container mx-auto max-w-5xl px-6 pt-32 sm:pt-40">
        
        {/* HERO */}
        <div className="flex flex-col items-center text-center mb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="w-20 h-20 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-10 shadow-2xl shadow-orange-900/20 relative">
            <div className="absolute inset-0 bg-orange-500/10 rounded-xl blur-xl" />
            <Icon className="w-10 h-10 text-orange-500 relative z-10" />
          </div>
          
          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter text-white mb-8 leading-[1.1] max-w-4xl">
            {title}
          </h1>
          
          <p className="text-xl sm:text-2xl text-zinc-400 font-light max-w-2xl mb-12 leading-relaxed">
            {subtitle}
          </p>
          
          <a 
            href="/app"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey) return;
              e.preventDefault();
              onCtaClick();
            }}
            className={ORANGE_BUTTON_STYLE}
          >
            Start Analyzing for Free
          </a>
        </div>

        {/* SECTION 1: THE PROBLEM */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-32">
            <motion.div 
                className="order-2 md:order-1 space-y-6"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
            >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider font-mono">
                    The Problem
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                    {problemTitle}
                </h2>
                <p className="text-zinc-400 leading-relaxed text-lg">
                    {problemDesc}
                </p>
            </motion.div>
            
            <motion.div 
                className="order-1 md:order-2 bg-zinc-900/30 border border-white/5 rounded-xl p-8 aspect-square flex items-center justify-center relative overflow-hidden group"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
            >
                 {/* Abstract "Bad" State Visual */}
                 <div className="w-full h-full bg-zinc-950 border border-zinc-800 rounded-lg relative p-6 opacity-80 shadow-2xl">
                    <div className="flex items-center gap-4 mb-6 border-b border-zinc-800 pb-4">
                        <div className="w-10 h-10 rounded-full bg-zinc-800" />
                        <div className="space-y-2">
                             <div className="w-32 h-3 bg-zinc-800 rounded-sm" />
                             <div className="w-20 h-2 bg-zinc-800/50 rounded-sm" />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="w-full h-2 bg-zinc-800/50 rounded-sm" />
                        <div className="w-full h-2 bg-zinc-800/50 rounded-sm" />
                        <div className="w-3/4 h-2 bg-zinc-800/50 rounded-sm" />
                    </div>
                    <div className="mt-8 p-3 bg-red-950/20 border border-red-900/30 rounded-sm">
                        <div className="flex items-center gap-2 text-red-500 text-xs font-mono mb-2">
                             <div className="w-2 h-2 rounded-full bg-red-500" />
                             CRITICAL ERROR
                        </div>
                        <div className="text-zinc-500 text-xs">Missing keywords: "JIRA", "Agile"</div>
                    </div>
                    
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded-sm font-bold transform -rotate-12 shadow-xl backdrop-blur-sm font-mono uppercase tracking-widest">
                        REJECTED
                    </div>
                 </div>
            </motion.div>
        </div>

        {/* SECTION 2: THE SOLUTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-32">
            <motion.div 
                className="bg-zinc-900/30 border border-orange-500/20 rounded-xl p-8 aspect-square flex items-center justify-center relative overflow-hidden group"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
            >
                 <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-50" />
                 {/* Abstract "Good" State Visual */}
                 <div className="w-full h-full bg-zinc-950 border border-zinc-800 rounded-lg relative p-6 shadow-2xl">
                    <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
                        <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                                <Check className="w-4 h-4 text-orange-500" />
                             </div>
                             <div className="w-24 h-3 bg-zinc-700 rounded-sm" />
                        </div>
                        <div className="px-2 py-1 bg-green-500/10 text-green-500 text-[10px] font-mono rounded-sm border border-green-500/20">
                            OPTIMIZED
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="w-full h-3 bg-zinc-800/50 rounded-sm" />
                        <div className="w-full h-3 bg-orange-500/10 border-l-2 border-orange-500 pl-2 rounded-r-sm" />
                        <div className="w-5/6 h-3 bg-zinc-800/50 rounded-sm" />
                    </div>
                    <div className="mt-auto absolute bottom-6 left-6 right-6 p-4 bg-zinc-900 rounded-sm border border-zinc-800 flex justify-between items-center">
                        <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold font-mono">ATS Score</div>
                        <div className="text-3xl font-black text-white font-mono">94%</div>
                    </div>
                 </div>
            </motion.div>

            <motion.div 
                className="space-y-8"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
            >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-wider font-mono">
                    The Solution
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                    {solutionTitle}
                </h2>
                <p className="text-zinc-400 leading-relaxed text-lg">
                    {solutionDesc}
                </p>
                
                <ul className="space-y-4">
                    {benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start gap-3">
                            <div className="mt-1 w-5 h-5 rounded-sm bg-orange-500 flex items-center justify-center shrink-0 shadow-[4px_4px_0px_0px_rgba(249,115,22,0.2)]">
                                <Check className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-zinc-200 font-medium">{benefit}</span>
                        </li>
                    ))}
                </ul>
            </motion.div>
        </div>

        {/* SECTION 3: HOW IT WORKS */}
        <div className="mb-32">
            <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">How it works</h2>
                <p className="text-zinc-400 text-lg">Three simple steps to go from rejected to hired.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {howItWorksSteps.map((step, i) => (
                    <div key={i} className="bg-zinc-900/50 border border-white/5 p-8 rounded-xl hover:bg-zinc-900 hover:border-white/10 transition-all relative overflow-hidden group">
                        <div className="w-10 h-10 bg-zinc-950 border border-zinc-800 rounded-sm flex items-center justify-center text-orange-500 font-bold font-mono text-lg mb-6 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)] group-hover:translate-x-1 group-hover:translate-y-1 transition-transform">
                            {i + 1}
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                        <p className="text-zinc-400 leading-relaxed text-sm">
                            {step.desc}
                        </p>
                    </div>
                ))}
            </div>
        </div>

        {/* BOTTOM CTA */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/10 rounded-xl p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-600 via-orange-400 to-orange-600" />
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">Ready to fix your resume?</h2>
            <p className="text-zinc-400 mb-8 max-w-xl mx-auto">Join 50,000+ job seekers who are landing more interviews with HireSchema.</p>
            <div className="flex justify-center">
                <a 
                    href="/app"
                    onClick={(e) => {
                        if (e.metaKey || e.ctrlKey) return;
                        e.preventDefault();
                        onCtaClick();
                    }}
                    className={ORANGE_BUTTON_STYLE}
                >
                    Get Started Now
                </a>
            </div>
        </div>

      </main>
      
      <Footer onNavigate={onNavigate as any} />
    </div>
  );
};

export default FeaturePage;

