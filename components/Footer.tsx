import React from 'react';
import { AnimatedLogo } from './AnimatedLogo';
import { ArrowRight, Zap, Mail } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: 'landing' | 'blog' | 'pricing' | 'roast' | 'scan' | 'changelog' | 'success-stories') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const currentYear = new Date().getFullYear();

  const handleNavClick = (e: React.MouseEvent, view: 'landing' | 'blog' | 'pricing' | 'roast' | 'scan' | 'changelog' | 'success-stories') => {
    if (e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    onNavigate(view);
  };

  const footerLinkClasses = "text-zinc-500 hover:text-white transition-all duration-300 text-sm flex items-center gap-2 group cursor-pointer";
  const columnHeaderClasses = "text-xs font-black uppercase tracking-[0.25em] text-zinc-300 mb-8";

  return (
    <footer className="relative bg-zinc-950 border-t border-white/5 pt-24 pb-12 overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-orange-600/5 rounded-full blur-[120px] pointer-events-none translate-x-1/2 translate-y-1/2"></div>
        <div className="absolute top-0 left-0 w-[300px] h-[300px] bg-orange-600/5 rounded-full blur-[100px] pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>

        <div className="max-w-7xl mx-auto px-6 sm:px-10 relative z-10">
            <div className="grid grid-cols-2 md:grid-cols-12 gap-y-16 gap-x-8 mb-24">
                {/* Brand Column */}
                <div className="col-span-2 md:col-span-4 flex flex-col items-start">
                    <a href="/" className="cursor-pointer mb-8" onClick={(e) => { 
                        if (e.metaKey || e.ctrlKey) return;
                        e.preventDefault();
                        window.scrollTo({ top: 0, behavior: 'smooth' }); 
                        onNavigate('landing'); 
                    }}>
                        <AnimatedLogo />
                    </a>
                    <p className="text-zinc-500 text-sm leading-relaxed max-w-xs">
                        The internet's most powerful ATS optimization engine. We don't just build resumes; we engineer careers.
                    </p>
                </div>

                {/* Product Column */}
                <div className="col-span-1 md:col-span-2">
                    <h4 className={columnHeaderClasses}>Product</h4>
                    <ul className="space-y-4">
                        <li>
                            <a href="/app" className={footerLinkClasses} onClick={(e) => handleNavClick(e, 'scan')}>
                                Resume Scanner
                            </a>
                        </li>
                        <li>
                            <a href="/roast-my-resume" className={footerLinkClasses} onClick={(e) => handleNavClick(e, 'roast')}>
                                Resume Roast
                            </a>
                        </li>
                        <li>
                            <a href="/pricing" className={footerLinkClasses} onClick={(e) => handleNavClick(e, 'pricing')}>
                                Pricing
                            </a>
                        </li>
                    </ul>
                </div>

                {/* Resources Column */}
                <div className="col-span-1 md:col-span-2">
                    <h4 className={columnHeaderClasses}>Resources</h4>
                    <ul className="space-y-4">
                        <li>
                            <a href="/blog" className={footerLinkClasses} onClick={(e) => handleNavClick(e, 'blog')}>
                                Blog
                            </a>
                        </li>
                        <li>
                            <a href="/changelog" className={footerLinkClasses} onClick={(e) => handleNavClick(e, 'changelog')}>
                                Changelog
                            </a>
                        </li>
                        <li>
                            <a href="/success-stories" className={footerLinkClasses} onClick={(e) => handleNavClick(e, 'success-stories')}>
                                Success Stories
                            </a>
                        </li>
                    </ul>
                </div>

                {/* Legal Column */}
                <div className="col-span-1 md:col-span-2">
                    <h4 className={columnHeaderClasses}>Legal</h4>
                    <ul className="space-y-4">
                        <li><a href="/privacy" className={footerLinkClasses}>Privacy Policy</a></li>
                        <li><a href="/terms" className={footerLinkClasses}>Terms of Service</a></li>
                        <li><a href="/cookies" className={footerLinkClasses}>Cookie Policy</a></li>
                    </ul>
                </div>

                {/* Contact Column */}
                <div className="col-span-1 md:col-span-2">
                    <h4 className={columnHeaderClasses}>Connect</h4>
                    <ul className="space-y-4">
                        <li>
                            <a href="mailto:support@hireschema.com" className={footerLinkClasses}>
                                Support
                            </a>
                        </li>
                        <li>
                            <a href="/roadmap" className={footerLinkClasses} onClick={(e) => e.preventDefault()}>
                                Roadmap
                            </a>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-zinc-600 text-xs font-bold uppercase tracking-widest">
                    © {currentYear} HireSchema. All rights reserved.
                </div>
                <div className="flex items-center gap-2 text-zinc-600 text-xs font-bold uppercase tracking-widest">
                    Built by <a href="https://kingdomofkumar.com/" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white transition-colors">KoK Labs</a>
                </div>
            </div>
        </div>
    </footer>
  );
};
