import React, { useState } from 'react';
import { motion, useScroll, AnimatePresence, useTransform, useSpring } from 'framer-motion';
import { Menu, X, ArrowRight } from 'lucide-react';
import { AnimatedLogo } from './AnimatedLogo';

interface HeaderProps {
  onNavigate: (view: 'landing' | 'blog' | 'pricing' | 'roast' | 'scan' | 'changelog' | 'success-stories') => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
  const { scrollY } = useScroll();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Scroll range for transformation (0 to 500px)
  const scrollRange = [0, 500];
  
  // Transform values linked directly to scroll
  const navHeight = useTransform(scrollY, scrollRange, [90, 70]);
  const navBg = useTransform(scrollY, scrollRange, ["rgba(0,0,0,0)", "rgba(9,9,11,0.9)"]);
  const navBorder = useTransform(scrollY, scrollRange, ["rgba(255,255,255,0)", "rgba(255,255,255,0.08)"]);
  const navBlur = useTransform(scrollY, scrollRange, ["blur(0px)", "blur(20px)"]);

  // Springs for weighted, ultra-smooth motion
  const springConfig = { damping: 30, stiffness: 100, mass: 0.5 };
  const sHeight = useSpring(navHeight, springConfig);
  const sBg = useSpring(navBg, springConfig);
  const sBorder = useSpring(navBorder, springConfig);

  const handleNavClick = (e: React.MouseEvent, view: 'landing' | 'blog' | 'pricing' | 'roast' | 'scan' | 'changelog' | 'success-stories') => {
    // If command/ctrl is pressed, allow default browser behavior (open in new tab)
    if (e.metaKey || e.ctrlKey) return;
    
    e.preventDefault();
    setIsMobileMenuOpen(false);
    onNavigate(view);
  };

  const navItemClasses = "text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-white transition-all duration-300 relative group py-2 px-1";
  const navItemUnderline = "absolute bottom-0 left-0 w-0 h-[1px] bg-orange-500 transition-all duration-300 group-hover:w-full";

  return (
    <>
    <motion.header 
        style={{
            height: sHeight,
            backgroundColor: sBg,
            borderColor: sBorder,
            backdropFilter: navBlur,
            borderBottomWidth: '1px',
            borderStyle: 'solid',
        }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center transition-colors"
    >
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between px-6 sm:px-10">
            {/* Left: Logo */}
            <div className="flex-1 flex justify-start">
                <a 
                    href="/"
                    className="cursor-pointer transition-transform duration-500 hover:scale-105" 
                    onClick={(e) => handleNavClick(e, 'landing')}
                >
                    <AnimatedLogo />
                </a>
            </div>

            {/* Center: Navigation Links */}
            <nav className="hidden md:flex items-center gap-10">
                <a href="/blog" onClick={(e) => handleNavClick(e, 'blog')} className={navItemClasses}>
                    Blog <span className={navItemUnderline} />
                </a>
                <a href="/pricing" onClick={(e) => handleNavClick(e, 'pricing')} className={navItemClasses}>
                    Pricing <span className={navItemUnderline} />
                </a>
                <a href="/roast-my-resume" onClick={(e) => handleNavClick(e, 'roast')} className={navItemClasses}>
                    Roast <span className={navItemUnderline} />
                </a>
            </nav>

            {/* Right: Actions */}
            <div className="flex-1 flex justify-end items-center gap-4 sm:gap-8">
                <a 
                    href="/app"
                    onClick={(e) => handleNavClick(e, 'scan')}
                    className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-mono font-bold text-[10px] uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] hover:shadow-none active:shadow-none hover:translate-x-[1.5px] hover:translate-y-[1.5px] active:translate-x-[1.5px] active:translate-y-[1.5px] transition-all rounded-sm cursor-pointer border-none flex items-center gap-2"
                >
                    Start Analysis
                </a>

                {/* Mobile Menu Toggle */}
                <button 
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="md:hidden text-white p-2 hover:bg-white/5 rounded-full transition-colors font-bold text-[10px] uppercase tracking-widest"
                >
                    {isMobileMenuOpen ? 'Close' : 'Menu'}
                </button>
            </div>
        </div>
    </motion.header>

    {/* Mobile Menu Overlay */}
    <AnimatePresence>
        {isMobileMenuOpen && (
            <motion.div
                initial={{ opacity: 0, x: '100%' }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: '100%' }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-0 z-[60] bg-zinc-950 flex flex-col p-8 pt-24"
            >
                <button 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="absolute top-8 right-8 text-white p-2 font-bold text-sm uppercase tracking-widest"
                >
                    Close
                </button>

                <div className="flex flex-col gap-8">
                    <a href="/blog" onClick={(e) => handleNavClick(e, 'blog')} className="text-4xl font-black text-white text-left uppercase tracking-tighter hover:text-orange-500 transition-colors">
                        Blog
                    </a>
                    <a href="/pricing" onClick={(e) => handleNavClick(e, 'pricing')} className="text-4xl font-black text-white text-left uppercase tracking-tighter hover:text-orange-500 transition-colors">
                        Pricing
                    </a>
                    <a href="/roast-my-resume" onClick={(e) => handleNavClick(e, 'roast')} className="text-4xl font-black text-white text-left uppercase tracking-tighter hover:text-orange-500 transition-colors">
                        Roast
                    </a>
                    
                    <div className="h-[1px] bg-white/10 my-4" />

                    <a 
                        href="/app"
                        onClick={(e) => handleNavClick(e, 'scan')}
                        className="w-full py-5 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-mono font-bold text-lg uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] hover:shadow-none active:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[2px] active:translate-y-[2px] transition-all rounded-sm flex items-center justify-center gap-4"
                    >
                        Start Analysis
                    </a>
                </div>
            </motion.div>
        )}
    </AnimatePresence>
    </>
  );
};
