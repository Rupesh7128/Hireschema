import React from 'react';
import { CheckCircle2, XCircle, ArrowLeft, Check, Minus, Zap, BookOpen } from 'lucide-react';
import { AnimatedLogo } from './AnimatedLogo';

interface PricingPageProps {
  onBack: () => void;
  onStart: (intent: 'scan' | 'optimize') => void;
}

const PricingPage: React.FC<PricingPageProps> = ({ onBack, onStart }) => {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-orange-500/30">
      {/* Header */}
      <nav className="h-20 flex items-center justify-between px-6 border-b border-white/10 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="cursor-pointer" onClick={onBack}>
          <AnimatedLogo />
        </div>
        <button 
          onClick={onBack}
          className="text-sm font-bold text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-20">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tighter mb-6">
            Why pay for <span className="text-orange-500">HireSchema</span>?
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Generic AI tools write generic resumes. We are purpose-built to beat the Applicant Tracking Systems (ATS) that reject 75% of candidates.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto pb-12">
          <div className="min-w-[800px] bg-zinc-900/30 border border-white/10 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-4 p-6 border-b border-white/10 bg-zinc-900/50">
              <div className="col-span-1 text-sm font-bold text-zinc-500 uppercase tracking-wider self-end pb-2">Features</div>
              <div className="col-span-1 text-center pb-2">
                <div className="text-xl font-black text-orange-500 mb-1">HireSchema</div>
                <div className="text-[10px] text-orange-500/60 font-mono uppercase tracking-widest">Purpose Built</div>
              </div>
              <div className="col-span-1 text-center pb-2 opacity-60">
                <div className="text-lg font-bold text-white mb-1">ChatGPT / Gemini</div>
                <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">General AI</div>
              </div>
              <div className="col-span-1 text-center pb-2 opacity-60">
                <div className="text-lg font-bold text-white mb-1">Other Tools</div>
                <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Resume Builders</div>
              </div>
            </div>

            {/* Row 1 */}
            <div className="grid grid-cols-4 p-6 border-b border-white/5 hover:bg-white/5 transition-colors items-center">
              <div className="col-span-1 font-bold text-white">ATS Keyword Optimization</div>
              <div className="col-span-1 flex justify-center"><CheckCircle2 className="w-6 h-6 text-orange-500" /></div>
              <div className="col-span-1 flex justify-center text-center text-sm text-zinc-500">Manual prompting required</div>
              <div className="col-span-1 flex justify-center text-center text-sm text-zinc-500">Basic matching</div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-4 p-6 border-b border-white/5 hover:bg-white/5 transition-colors items-center">
              <div className="col-span-1 font-bold text-white">Resume Scoring (0-100)</div>
              <div className="col-span-1 flex justify-center"><CheckCircle2 className="w-6 h-6 text-orange-500" /></div>
              <div className="col-span-1 flex justify-center"><XCircle className="w-5 h-5 text-zinc-700" /></div>
              <div className="col-span-1 flex justify-center"><Check className="w-5 h-5 text-zinc-500" /></div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-4 p-6 border-b border-white/5 hover:bg-white/5 transition-colors items-center">
              <div className="col-span-1 font-bold text-white">Missing Keyword Identification</div>
              <div className="col-span-1 flex justify-center text-center text-sm text-orange-400 font-bold">Exact Match</div>
              <div className="col-span-1 flex justify-center text-center text-sm text-zinc-500">Hallucinates keywords</div>
              <div className="col-span-1 flex justify-center text-center text-sm text-zinc-500">Limited database</div>
            </div>

            {/* Row 4 */}
            <div className="grid grid-cols-4 p-6 border-b border-white/5 hover:bg-white/5 transition-colors items-center">
              <div className="col-span-1 font-bold text-white">Auto-Rewrite Bullet Points</div>
              <div className="col-span-1 flex justify-center"><CheckCircle2 className="w-6 h-6 text-orange-500" /></div>
              <div className="col-span-1 flex justify-center"><Check className="w-5 h-5 text-zinc-500" /></div>
              <div className="col-span-1 flex justify-center text-center text-sm text-zinc-500">Templates only</div>
            </div>

            {/* Row 5 */}
            <div className="grid grid-cols-4 p-6 border-b border-white/5 hover:bg-white/5 transition-colors items-center">
              <div className="col-span-1 font-bold text-white">Privacy & Data Retention</div>
              <div className="col-span-1 flex justify-center text-center text-sm text-green-500 font-bold">Zero Retention</div>
              <div className="col-span-1 flex justify-center text-center text-sm text-zinc-500">Trains on your data</div>
              <div className="col-span-1 flex justify-center text-center text-sm text-zinc-500">Stores data forever</div>
            </div>

            {/* Row 6 */}
            <div className="grid grid-cols-4 p-6 hover:bg-white/5 transition-colors items-center bg-white/5">
              <div className="col-span-1 font-bold text-white">Cost</div>
              <div className="col-span-1 flex justify-center flex-col items-center">
                <span className="text-2xl font-black text-white">$1</span>
                <span className="text-[10px] text-zinc-400 uppercase">Per Download</span>
              </div>
              <div className="col-span-1 flex justify-center flex-col items-center">
                <span className="text-xl font-bold text-zinc-400">$20</span>
                <span className="text-[10px] text-zinc-500 uppercase">/ Month</span>
              </div>
              <div className="col-span-1 flex justify-center flex-col items-center">
                <span className="text-xl font-bold text-zinc-400">$30+</span>
                <span className="text-[10px] text-zinc-500 uppercase">/ Month</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Details & Addons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20 max-w-5xl mx-auto">
             {/* Left: Included */}
             <div className="bg-zinc-900/30 border border-orange-500/20 rounded-2xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-orange-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase">
                    Most Popular
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Pay As You Go</h3>
                <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-5xl font-black text-white">$1</span>
                    <span className="text-zinc-500 font-medium">/ download</span>
                </div>
                <p className="text-zinc-400 text-sm mb-8">
                    No subscriptions. No hidden fees. Pay only when you are 100% happy with the result.
                </p>
                
                <div className="space-y-4">
                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Everything Included</div>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0" />
                            <span className="text-zinc-300 text-sm"><strong>ATS-Optimized PDF Resume</strong> <span className="text-zinc-500 block text-xs">Formatted to pass the robots.</span></span>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0" />
                            <span className="text-zinc-300 text-sm"><strong>Tailored Cover Letter</strong> <span className="text-zinc-500 block text-xs">Generated based on the job description.</span></span>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0" />
                            <span className="text-zinc-300 text-sm"><strong>Interview Prep Kit</strong> <span className="text-zinc-500 block text-xs">Predicted questions & STAR answers.</span></span>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0" />
                            <span className="text-zinc-300 text-sm"><strong>Keyword Gap Analysis</strong> <span className="text-zinc-500 block text-xs">See exactly what you're missing.</span></span>
                        </li>
                    </ul>
                </div>
             </div>

             {/* Right: Why Us / Addons */}
             <div className="space-y-8">
                <div className="bg-zinc-900/30 border border-white/10 rounded-2xl p-8">
                    <h3 className="text-xl font-bold text-white mb-4">Why HireSchema?</h3>
                    <ul className="space-y-4">
                        <li className="flex gap-3">
                            <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                                <Zap className="w-4 h-4 text-yellow-500" />
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-sm">Time Saver</h4>
                                <p className="text-xs text-zinc-500">Save 10+ hours per application. No more manual tailoring.</p>
                            </div>
                        </li>
                        <li className="flex gap-3">
                            <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                                <Check className="w-4 h-4 text-green-500" />
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-sm">Organized Tracking</h4>
                                <p className="text-xs text-zinc-500">Keep all your tailored resumes and job links in one place.</p>
                            </div>
                        </li>
                         <li className="flex gap-3">
                            <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                                <div className="text-xs font-bold text-zinc-400">AI</div>
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-sm">No "AI" Fluff</h4>
                                <p className="text-xs text-zinc-500">We remove robotic phrases that recruiters hate.</p>
                            </div>
                        </li>
                    </ul>
                </div>

                <div className="bg-zinc-900/30 border border-white/10 rounded-2xl p-8">
                    <h3 className="text-xl font-bold text-white mb-4">Premium Add-ons <span className="text-xs font-normal text-zinc-500 ml-2">(Included Free)</span></h3>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                            <BookOpen className="w-5 h-5 text-blue-400" />
                            <div>
                                <div className="text-sm font-bold text-white">Skill Upgrader</div>
                                <div className="text-xs text-zinc-500">Links to learn missing skills.</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                            <CheckCircle2 className="w-5 h-5 text-purple-400" />
                            <div>
                                <div className="text-sm font-bold text-white">LinkedIn Optimizer</div>
                                <div className="text-xs text-zinc-500">Headline & About section generator.</div>
                            </div>
                        </div>
                    </div>
                </div>
             </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
           <h2 className="text-2xl font-bold text-white mb-6">Ready to get hired?</h2>
           <button 
              onClick={() => onStart('scan')}
              className="px-10 py-4 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-mono font-bold text-lg tracking-wide rounded-sm shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
           >
              Start Free Scan
           </button>
        </div>

      </main>

      <footer className="py-12 border-t border-white/10 text-center">
        <p className="text-zinc-600 text-sm">© 2026 HireSchema. Built by KoK Labs.</p>
      </footer>
    </div>
  );
};

export default PricingPage;
