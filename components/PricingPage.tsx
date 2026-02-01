import React from 'react';
import { CheckCircle2, XCircle, ArrowLeft, Check, Minus, Zap, BookOpen, Lock } from 'lucide-react';
import { Header } from './Header';
import { Footer } from './Footer';

interface PricingPageProps {
  onBack: () => void;
  onStart: (intent: 'scan' | 'optimize' | 'launch' | 'roast' | 'blog' | 'feature' | 'pricing') => void;
}

const ORANGE_BUTTON_STYLE = "px-6 sm:px-8 py-3 sm:py-3.5 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-mono font-bold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 sm:gap-2.5 shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] hover:shadow-none active:shadow-none hover:translate-x-[1.5px] hover:translate-y-[1.5px] active:translate-x-[1.5px] active:translate-y-[1.5px] transition-all rounded-sm cursor-pointer border-none touch-target";

const PricingPage: React.FC<PricingPageProps> = ({ onBack, onStart }) => {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-orange-500/30">
      {/* Header */}
      <Header onNavigate={onStart as any} />

      <main className="max-w-6xl mx-auto px-6 py-12 pt-24">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tighter mb-4">
            Why pay for <span className="text-orange-500">HireSchema</span>?
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Generic AI tools write generic resumes. We are purpose-built to beat the Applicant Tracking Systems (ATS) that reject 75% of candidates.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto pb-10">
          <div className="min-w-[700px] bg-zinc-900/30 border border-white/10 rounded-xl overflow-hidden">
            <div className="grid grid-cols-4 p-4 border-b border-white/10 bg-zinc-900/50">
              <div className="col-span-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider self-end pb-1">Features</div>
              <div className="col-span-1 text-center pb-1">
                <div className="text-base font-black text-orange-500 mb-0.5">HireSchema</div>
                <div className="text-[8px] text-orange-500/60 font-mono uppercase tracking-widest">Purpose Built</div>
              </div>
              <div className="col-span-1 text-center pb-1 opacity-60">
                <div className="text-sm font-bold text-white mb-0.5">ChatGPT / Gemini</div>
                <div className="text-[8px] text-zinc-500 font-mono uppercase tracking-widest">General AI</div>
              </div>
              <div className="col-span-1 text-center pb-1 opacity-60">
                <div className="text-sm font-bold text-white mb-0.5">Other Tools</div>
                <div className="text-[8px] text-zinc-500 font-mono uppercase tracking-widest">Builders</div>
              </div>
            </div>

            {/* Row 1 */}
            <div className="grid grid-cols-4 p-4 border-b border-white/5 hover:bg-white/5 transition-colors items-center">
              <div className="col-span-1 text-xs font-bold text-white">ATS Keyword Optimization</div>
              <div className="col-span-1 flex justify-center"><div className="w-1.5 h-1.5 rounded-full bg-orange-500" /></div>
              <div className="col-span-1 flex justify-center text-center text-[10px] text-zinc-500">Manual prompting required</div>
              <div className="col-span-1 flex justify-center text-center text-[10px] text-zinc-500">Basic matching</div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-4 p-4 border-b border-white/5 hover:bg-white/5 transition-colors items-center">
              <div className="col-span-1 text-xs font-bold text-white">Resume Scoring (0-100)</div>
              <div className="col-span-1 flex justify-center"><div className="w-1.5 h-1.5 rounded-full bg-orange-500" /></div>
              <div className="col-span-1 flex justify-center text-zinc-700 font-bold">—</div>
              <div className="col-span-1 flex justify-center text-zinc-500 font-bold text-[10px]">YES</div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-4 p-4 border-b border-white/5 hover:bg-white/5 transition-colors items-center">
              <div className="col-span-1 text-xs font-bold text-white">Missing Keyword Identification</div>
              <div className="col-span-1 flex justify-center text-center text-[10px] text-orange-400 font-bold uppercase tracking-widest">Exact Match</div>
              <div className="col-span-1 flex justify-center text-center text-[10px] text-zinc-500">Hallucinates keywords</div>
              <div className="col-span-1 flex justify-center text-center text-[10px] text-zinc-500">Limited database</div>
            </div>

            {/* Row 4 */}
            <div className="grid grid-cols-4 p-4 border-b border-white/5 hover:bg-white/5 transition-colors items-center">
              <div className="col-span-1 text-xs font-bold text-white">Auto-Rewrite Bullet Points</div>
              <div className="col-span-1 flex justify-center"><div className="w-1.5 h-1.5 rounded-full bg-orange-500" /></div>
              <div className="col-span-1 flex justify-center text-zinc-500 font-bold text-[10px]">YES</div>
              <div className="col-span-1 flex justify-center text-center text-[10px] text-zinc-500">Templates only</div>
            </div>

            {/* Row 5 */}
            <div className="grid grid-cols-4 p-4 border-b border-white/5 hover:bg-white/5 transition-colors items-center">
              <div className="col-span-1 text-xs font-bold text-white">Privacy & Data Retention</div>
              <div className="col-span-1 flex justify-center text-center text-[10px] text-green-500 font-bold">Zero Retention</div>
              <div className="col-span-1 flex justify-center text-center text-[10px] text-zinc-500">Trains on your data</div>
              <div className="col-span-1 flex justify-center text-center text-[10px] text-zinc-500">Stores data forever</div>
            </div>

            {/* Row 6 */}
            <div className="grid grid-cols-4 p-4 hover:bg-white/5 transition-colors items-center bg-white/5">
              <div className="col-span-1 text-xs font-bold text-white">Cost</div>
              <div className="col-span-1 flex justify-center flex-col items-center">
                <span className="text-xl font-black text-white">$1</span>
                <span className="text-[8px] text-zinc-400 uppercase">Per Download</span>
              </div>
              <div className="col-span-1 flex justify-center flex-col items-center">
                <span className="text-lg font-bold text-zinc-400">$20</span>
                <span className="text-[8px] text-zinc-500 uppercase">/ Month</span>
              </div>
              <div className="col-span-1 flex justify-center flex-col items-center">
                <span className="text-lg font-bold text-zinc-400">$30+</span>
                <span className="text-[8px] text-zinc-500 uppercase">/ Month</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Details & Addons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16 max-w-4xl mx-auto">
             {/* Left: Included */}
             <div className="bg-zinc-900/30 border border-orange-500/20 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-orange-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-bl-md uppercase tracking-widest">
                    Unlock
                </div>
                <h3 className="text-xl font-bold text-white mb-1.5">Pay As You Go</h3>
                <div className="flex items-baseline gap-1.5 mb-4">
                    <span className="text-4xl font-black text-white">$1</span>
                    <span className="text-zinc-500 text-xs font-medium">/ download</span>
                </div>
                <p className="text-zinc-400 text-xs mb-6">
                    No subscriptions. No hidden fees. Pay only when you are 100% happy with the result.
                </p>
                
                <div className="space-y-3">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Everything Included</div>
                    <ul className="space-y-2">
                        <li className="flex items-start gap-2.5">
                            <div className="mt-1 w-1 h-1 rounded-full bg-orange-500 shrink-0" />
                            <span className="text-zinc-300 text-xs"><strong>ATS-Optimized PDF Resume</strong> <span className="text-zinc-500 block text-[10px]">Formatted to pass the robots.</span></span>
                        </li>
                        <li className="flex items-start gap-2.5">
                            <div className="mt-1 w-1 h-1 rounded-full bg-orange-500 shrink-0" />
                            <span className="text-zinc-300 text-xs"><strong>Tailored Cover Letter</strong> <span className="text-zinc-500 block text-[10px]">Generated based on the job.</span></span>
                        </li>
                        <li className="flex items-start gap-2.5">
                            <div className="mt-1 w-1 h-1 rounded-full bg-orange-500 shrink-0" />
                            <span className="text-zinc-300 text-xs"><strong>Interview Prep Kit</strong> <span className="text-zinc-500 block text-[10px]">Questions & STAR answers.</span></span>
                        </li>
                    </ul>
                </div>
             </div>

             {/* Right: Why Us / Addons */}
             <div className="space-y-6">
                <div className="bg-zinc-900/30 border border-white/10 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-3">Why HireSchema?</h3>
                    <ul className="space-y-3">
                        <li className="flex gap-2.5">
                            <div>
                                <h4 className="font-bold text-white text-[10px] uppercase tracking-widest">Time Saver</h4>
                                <p className="text-[10px] text-zinc-500">Save 10+ hours per application.</p>
                            </div>
                        </li>
                        <li className="flex gap-2.5">
                            <div>
                                <h4 className="font-bold text-white text-[10px] uppercase tracking-widest">No AI Fluff</h4>
                                <p className="text-[10px] text-zinc-500">We remove robotic phrases recruiters hate.</p>
                            </div>
                        </li>
                    </ul>
                </div>

                <div className="bg-zinc-900/30 border border-white/10 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-3">Premium Add-ons <span className="text-[10px] font-normal text-zinc-500 ml-2">(Free)</span></h3>
                    <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-center gap-2.5 p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg">
                            <div>
                                <div className="text-[10px] font-bold text-white uppercase tracking-widest">Skill Upgrader</div>
                                <div className="text-[9px] text-zinc-500">Links to learn missing skills.</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg">
                            <div>
                                <div className="text-[10px] font-bold text-white uppercase tracking-widest">LinkedIn Optimizer</div>
                                <div className="text-[9px] text-zinc-500">Headline & About section generator.</div>
                            </div>
                        </div>
                    </div>
                </div>
             </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
           <h2 className="text-xl font-bold text-white mb-4">Ready to get hired?</h2>
           <a 
              href="/app"
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey) return;
                e.preventDefault();
                onStart('scan');
              }}
              className={ORANGE_BUTTON_STYLE}
           >
              Start Free Scan
           </a>
        </div>

      </main>

      <Footer onNavigate={onStart as any} />
    </div>
  );
};

export default PricingPage;
