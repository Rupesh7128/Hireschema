import React, { useState } from 'react';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import { BookOpen, Zap, Flame, Menu, X, Globe, ChevronDown } from 'lucide-react';
import { AnimatedLogo } from './AnimatedLogo';

interface HeaderProps {
  onNavigate: (view: 'landing' | 'blog' | 'pricing' | 'roast' | 'scan') => void;
  appLanguage?: string;
  onLanguageChange?: (lang: string) => void;
}

const LANGUAGES = [
    "English", "Spanish", "French", "German", "Hindi", "Portuguese", "Japanese", "Korean", "Arabic"
];

// Consistent Global Button Styles - Mobile optimized with active states
const HEADER_BUTTON_STYLE = "px-4 sm:px-6 py-2 sm:py-2.5 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-mono font-bold text-xs uppercase tracking-wide flex items-center gap-1.5 sm:gap-2 shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] hover:shadow-none active:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[1px] active:translate-y-[1px] transition-all rounded-sm cursor-pointer border-none touch-target";

export const Header: React.FC<HeaderProps> = ({ onNavigate, appLanguage = "English", onLanguageChange }) => {
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  // Trigger header transition later (after hero) for smoother feel
  useMotionValueEvent(scrollY, "change", (latest) => {
    // 85vh is roughly where hero ends (~700-800px on desktop)
    const threshold = window.innerHeight * 0.8;
    setIsScrolled(latest > threshold);
  });

  const handleMobileNav = (view: 'landing' | 'blog' | 'pricing' | 'roast' | 'scan') => {
    setIsMobileMenuOpen(false);
    onNavigate(view);
  };

  return (
    <>
    <motion.nav 
        initial={{ y: 0, width: "100%", borderRadius: "0px", top: 0, borderColor: "rgba(255,255,255,0.0)", backgroundColor: "rgba(9,9,11,0.0)" }}
        animate={isScrolled ? { 
            width: "90%",
            maxWidth: "1024px", 
            borderRadius: "9999px",
            top: 24,
            borderColor: "rgba(255,255,255,0.1)",
            backgroundColor: "rgba(9,9,11,0.6)",
            backdropFilter: "blur(16px)"
        } : {
            width: "100%",
            maxWidth: "100%",
            borderRadius: "0px",
            top: 0,
            borderColor: "rgba(255,255,255,0.0)",
            backgroundColor: "rgba(9,9,11,0.0)", // Fully transparent at top
            backdropFilter: "blur(0px)"
        }}
        transition={{ duration: 1.2, type: "spring", damping: 30, stiffness: 50 }}
        style={{
            left: '50%',
            x: '-50%',
            position: 'fixed',
            zIndex: 50
        }}
        className="h-16 sm:h-20 flex items-center justify-between px-4 sm:px-6 md:px-8 border-b safe-area-inset"
    >
        <div className="cursor-pointer touch-target" onClick={() => { 
            window.scrollTo(0, 0); 
            // Manual push state to ensure URL updates if onNavigate doesn't handle it for landing
            window.history.pushState({}, '', '/');
            onNavigate('landing'); 
        }}>
            <AnimatedLogo />
        </div>
        
        {/* Desktop Nav */}
        <div className="hidden sm:flex items-center gap-2 sm:gap-6">
            <div className="relative">
                <button 
                    onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                    className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors uppercase tracking-widest px-3 py-1.5 cursor-pointer touch-target"
                >
                    <Globe className="w-3.5 h-3.5" />
                    <span>{appLanguage}</span>
                    <ChevronDown className="w-3 h-3 opacity-50" />
                </button>
                <AnimatePresence>
                    {isLangMenuOpen && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute top-full mt-2 right-0 w-32 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50 py-1"
                        >
                            {LANGUAGES.map(lang => (
                                <button 
                                    key={lang}
                                    onClick={() => { onLanguageChange?.(lang); setIsLangMenuOpen(false); }}
                                    className={`w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${appLanguage === lang ? 'text-orange-500 bg-orange-500/10' : 'text-zinc-400 hover:bg-zinc-800'}`}
                                >
                                    {lang}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <button onClick={() => { window.history.pushState({}, '', '/blog'); onNavigate('blog'); }} className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors uppercase tracking-widest px-3 py-1.5 cursor-pointer touch-target">
                <BookOpen className="w-3 h-3" /> Blog
            </button>
            <button onClick={() => { window.history.pushState({}, '', '/pricing'); onNavigate('pricing'); }} className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors uppercase tracking-widest px-3 py-1.5 cursor-pointer touch-target">
                Pricing
            </button>
            <button onClick={() => { window.history.pushState({}, '', '/roast-my-resume'); onNavigate('roast'); }} className="flex items-center gap-2 text-xs font-bold text-orange-500 hover:text-orange-400 active:text-orange-300 transition-colors uppercase tracking-widest border border-orange-500/20 px-3 py-1.5 rounded bg-orange-500/5 hover:bg-orange-500/10 cursor-pointer touch-target">
                  <Zap className="w-3 h-3" /> Roast My Resume
            </button>
            <button 
                onClick={() => { window.history.pushState({}, '', '/app'); onNavigate('scan'); }}
                className={HEADER_BUTTON_STYLE}
            >
                Start Analysis
            </button>
        </div>

        {/* Mobile Nav Toggle */}
        <div className="sm:hidden flex items-center gap-4">
             <button 
                onClick={() => onNavigate('scan')}
                className="px-4 py-2 bg-orange-600 text-white font-mono font-bold text-xs uppercase tracking-wide rounded-sm shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]"
            >
                Start
            </button>
            <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-white p-2"
            >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
        </div>
    </motion.nav>

    {/* Mobile Menu Overlay */}
    <AnimatePresence>
        {isMobileMenuOpen && (
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed inset-0 z-40 bg-zinc-950/95 backdrop-blur-xl pt-24 px-6 sm:hidden flex flex-col gap-8"
            >
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-2">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Language</span>
                        <select 
                            value={appLanguage}
                            onChange={(e) => onLanguageChange?.(e.target.value)}
                            className="bg-zinc-900 text-white text-sm font-bold p-2 rounded border border-zinc-800 outline-none"
                        >
                            {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                        </select>
                    </div>
                    <button onClick={() => { window.history.pushState({}, '', '/app'); handleMobileNav('scan'); }} className="text-2xl font-bold text-white text-left flex items-center gap-4">
                        <span className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-black"><Zap className="w-5 h-5" /></span>
                        Start Analysis
                    </button>
                    <button onClick={() => { window.history.pushState({}, '', '/roast-my-resume'); handleMobileNav('roast'); }} className="text-2xl font-bold text-white text-left flex items-center gap-4">
                        <span className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-orange-500"><Flame className="w-5 h-5" /></span>
                        Roast My Resume
                    </button>
                    <button onClick={() => { window.history.pushState({}, '', '/pricing'); handleMobileNav('pricing'); }} className="text-2xl font-bold text-zinc-400 text-left flex items-center gap-4">
                         <span className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500">P</span>
                        Pricing
                    </button>
                    <button onClick={() => { window.history.pushState({}, '', '/blog'); handleMobileNav('blog'); }} className="text-2xl font-bold text-zinc-400 text-left flex items-center gap-4">
                        <span className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500"><BookOpen className="w-5 h-5" /></span>
                        Blog
                    </button>
                </div>
            </motion.div>
        )}
    </AnimatePresence>
    </>
  );
};
