import React from 'react';
import { AnimatedLogo } from './AnimatedLogo';

interface FooterProps {
  onNavigate: (view: 'landing' | 'blog' | 'pricing' | 'roast' | 'scan') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-gradient-to-b from-zinc-950 via-zinc-900 to-orange-900 border-t border-orange-900/30 pt-12 sm:pt-20 pb-8 sm:pb-10 px-4 sm:px-6 w-full relative overflow-hidden safe-area-inset-bottom">
         {/* Subtle overlay */}
         <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
         
         <div className="max-w-7xl mx-auto w-full relative z-10">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 mb-12 sm:mb-16">
                <div className="col-span-2 sm:col-span-2 md:col-span-1">
                    <AnimatedLogo className="mb-4 sm:mb-6" />
                    <p className="text-zinc-400 text-sm leading-relaxed max-w-xs">
                        HireSchema is built by <a href="https://kingdomofkumar.com/" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-400 hover:underline">KoK Labs</a>.
                    </p>
                </div>
                
                <div>
                    <h4 className="text-orange-100 font-bold mb-4 sm:mb-6 text-sm uppercase tracking-wider">Product</h4>
                    <ul className="space-y-2 sm:space-y-3 text-sm text-zinc-400">
                        <li><span onClick={() => onNavigate('scan')} className="hover:text-white active:text-white transition-colors cursor-pointer touch-target py-1 block">Resume Scanner</span></li>
                        <li><span onClick={() => onNavigate('scan')} className="hover:text-white active:text-white transition-colors cursor-pointer touch-target py-1 block">Cover Letter Engine</span></li>
                        <li><span onClick={() => onNavigate('scan')} className="hover:text-white active:text-white transition-colors cursor-pointer touch-target py-1 block">Interview Prep</span></li>
                        <li><span onClick={() => onNavigate('blog')} className="hover:text-white active:text-white transition-colors cursor-pointer touch-target py-1 block">Blog</span></li>
                        <li><span onClick={() => onNavigate('pricing')} className="hover:text-white active:text-white transition-colors cursor-pointer touch-target py-1 block">$1 per download</span></li>
                    </ul>
                </div>

                <div>
                    <h4 className="text-orange-100 font-bold mb-6 text-sm uppercase tracking-wider">Legal</h4>
                    <ul className="space-y-3 text-sm text-zinc-400">
                        <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                        <li><a href="/terms" className="hover:text-white transition-colors">Terms & Conditions</a></li>
                        <li><a href="/cookies" className="hover:text-white transition-colors">Cookie Policy</a></li>
                    </ul>
                </div>

                 <div>
                    <h4 className="text-orange-100 font-bold mb-6 text-sm uppercase tracking-wider">Connect</h4>
                    <ul className="space-y-3 text-sm text-zinc-400">
                        <li><span className="hover:text-white transition-colors cursor-pointer">Twitter / X</span></li>
                        <li><span className="hover:text-white transition-colors cursor-pointer">LinkedIn</span></li>
                        <li><span className="hover:text-white transition-colors cursor-pointer">GitHub</span></li>
                    </ul>
                </div>
            </div>

            <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-zinc-500 text-xs">© 2026 HireSchema. All rights reserved.</p>
            </div>
         </div>
      </footer>
  );
};
