
import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence, useMotionValueEvent } from 'framer-motion';
import { 
  Sparkles, Upload, Search, ArrowRight, FileText, Globe, GraduationCap, 
  BrainCircuit, ShieldCheck, CheckCircle2, XCircle, 
  Check, Award, Lock, CreditCard, Database, Activity, Zap, Flame, BookOpen 
} from 'lucide-react';
import { Header } from './Header';
import { Footer } from './Footer';
import { FileData } from '../types';
import { logEvent } from '../services/analytics';

interface LandingPageProps {
  onStart: (intent: 'scan' | 'optimize' | 'launch' | 'roast' | 'blog' | 'feature' | 'pricing', file?: FileData, featureSlug?: string) => void;
}

// Consistent Global Button Styles - Mobile optimized with active states
const ORANGE_BUTTON_STYLE = "px-6 sm:px-8 py-3 sm:py-3.5 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-mono font-bold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 sm:gap-2.5 shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] hover:shadow-none active:shadow-none hover:translate-x-[1.5px] hover:translate-y-[1.5px] active:translate-x-[1.5px] active:translate-y-[1.5px] transition-all rounded-sm cursor-pointer border-none touch-target";

// --- MOUSE TRAIL COMPONENT ---
const ArrowDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
)

const MouseTrail = () => {
    const [points, setPoints] = useState<{ x: number, y: number, id: number }[]>([]);
    
    useEffect(() => {
        let timeoutId: any;

        const handleMouseMove = (e: MouseEvent) => {
            setPoints(prev => [
                ...prev.slice(-12), 
                { x: e.clientX, y: e.clientY, id: Math.random() + Date.now() }
            ]);

            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                setPoints([]);
            }, 50); // Instantly disappear
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            clearTimeout(timeoutId);
        };
    }, []);

    return (
        <div className="pointer-events-none fixed inset-0 z-50 hidden sm:block">
            {points.map((point, i) => (
                <div 
                    key={point.id}
                    className="absolute w-2 h-2 rounded-full bg-orange-500 blur-[1px]"
                    style={{
                        left: point.x,
                        top: point.y,
                        opacity: (i / points.length),
                        transform: `scale(${i / points.length}) translate(-50%, -50%)`,
                    }}
                />
            ))}
        </div>
    );
};

// --- FEATURE MARQUEE ---
const FeatureMarquee = () => {
    const items = [
        "Find Missing Keywords", "Get Your ATS Score", "Fix Resume Gaps", "Generate Cover Letters", 
        "Prepare for Interviews", "Learn Missing Skills", "100% Secure",
        "Download as PDF", "Instant Results"
    ];

    return (
        <div className="w-full bg-zinc-950 border-y border-white/5 py-4 overflow-hidden relative z-20">
             <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-zinc-950 to-transparent z-10"></div>
             <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-zinc-950 to-transparent z-10"></div>
             
             <motion.div 
                className="flex whitespace-nowrap items-center w-max"
                animate={{ x: "-50%" }}
                transition={{ 
                    repeat: Infinity, 
                    ease: "linear", 
                    duration: 100 
                }}
             >
                {[...items, ...items, ...items, ...items].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 mx-6 opacity-60 hover:opacity-100 transition-opacity">
                         <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">{item}</span>
                    </div>
                ))}
             </motion.div>
        </div>
    );
};

// --- SEO COMPONENT ---
const SEO = ({ title, description, path }: { title: string, description: string, path: string }) => {
    useEffect(() => {
        document.title = title;
        
        let metaDescription = document.querySelector('meta[name="description"]');
        if (!metaDescription) {
            metaDescription = document.createElement('meta');
            metaDescription.setAttribute('name', 'description');
            document.head.appendChild(metaDescription);
        }
        metaDescription.setAttribute('content', description);

        let canonicalLink = document.querySelector('link[rel="canonical"]');
        if (!canonicalLink) {
            canonicalLink = document.createElement('link');
            canonicalLink.setAttribute('rel', 'canonical');
            document.head.appendChild(canonicalLink);
        }
        canonicalLink.setAttribute('href', window.location.origin + path);

        return () => {
            // Optional: Reset title or remove tags on unmount if needed
            // But usually we just leave them for the next page to overwrite
        };
    }, [title, description, path]);

    return null;
};

// --- VISUAL STEP GRAPHIC ---
const StepGraphic = ({ step }: { step: 1 | 2 | 3 }) => {
  return (
    <div className="w-32 h-24 bg-zinc-900 border border-zinc-800 rounded-lg relative mb-8 shadow-2xl flex items-center justify-center overflow-hidden group-hover:border-zinc-600 transition-all duration-700 mx-auto">
       {/* Background Grid */}
       <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:10px_10px]"></div>
       
       {step === 1 && (
         <>
            {/* Upload UI */}
            <div className="w-12 h-16 bg-zinc-800 rounded border border-zinc-700 flex flex-col items-center justify-center gap-1 z-10 shadow-lg group-hover:scale-110 transition-transform">
                <div className="text-xs font-black text-zinc-500 group-hover:text-orange-500 transition-colors uppercase">PDF</div>
                <div className="w-8 h-1 bg-zinc-700 rounded-full group-hover:bg-orange-500/50 transition-colors"></div>
            </div>
            {/* Floating particles */}
            <div className="absolute top-4 right-4 w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce"></div>
         </>
       )}

       {step === 2 && (
         <>
            {/* Analysis UI */}
             <div className="w-12 h-16 bg-zinc-800 rounded border border-zinc-700 flex flex-col p-1.5 gap-1.5 z-10 shadow-lg relative overflow-hidden group-hover:scale-110 transition-transform">
                <div className="w-8 h-1 bg-zinc-600 rounded-full"></div>
                <div className="w-6 h-1 bg-zinc-600 rounded-full"></div>
                <div className="w-full h-1 bg-orange-500/50 rounded-full"></div>
                <div className="w-5 h-1 bg-zinc-600 rounded-full"></div>
                <div className="w-full h-1 bg-orange-500/50 rounded-full"></div>
                {/* Scanner Line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,1)] animate-[scan_1.5s_ease-in-out_infinite]"></div>
            </div>
         </>
       )}

       {step === 3 && (
         <>
            {/* Optimized UI */}
             <div className="w-12 h-16 bg-zinc-800 rounded border border-orange-900/50 flex flex-col p-1.5 gap-1.5 z-10 shadow-lg group-hover:scale-110 transition-transform">
                <div className="w-8 h-1 bg-zinc-500 rounded-full"></div>
                <div className="w-full h-1 bg-orange-500/80 rounded-full shadow-[0_0_5px_rgba(249,115,22,0.5)]"></div>
                <div className="w-6 h-1 bg-zinc-500 rounded-full"></div>
                <div className="w-full h-1 bg-orange-500/80 rounded-full shadow-[0_0_5px_rgba(249,115,22,0.5)]"></div>
                
                <div className="absolute -bottom-2 -right-2 bg-orange-500 text-black px-2 py-0.5 rounded-full border-2 border-zinc-900 text-xs font-black">
                    OK
                </div>
            </div>
         </>
       )}
    </div>
  )
}

// --- FAQ ITEM COMPONENT ---
const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div 
            className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden hover:bg-zinc-900/70 hover:border-zinc-700/50 transition-all duration-300 group cursor-pointer"
            onClick={() => setIsOpen(!isOpen)}
        >
            <div className="p-6 flex justify-between items-center gap-4">
                <h3 className="text-base font-semibold text-white leading-relaxed group-hover:text-orange-100 transition-colors">
                    {question}
                </h3>
                <div className={`shrink-0 text-zinc-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    <ArrowDownIcon />
                </div>
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                        <div className="px-6 pb-6 text-zinc-400 text-sm leading-relaxed border-t border-white/5 pt-4">
                            {answer}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  const { scrollY } = useScroll();
  const yHero = useTransform(scrollY, [0, 500], [0, 100]);
  const [isScrolled, setIsScrolled] = useState(false);

  // Trigger header transition later (after hero) for smoother feel
  useMotionValueEvent(scrollY, "change", (latest) => {
    // 85vh is roughly where hero ends (~700-800px on desktop)
    const threshold = window.innerHeight * 0.8;
    setIsScrolled(latest > threshold);
  });
  
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            const base64 = base64String.split(',')[1];
            localStorage.removeItem('hireSchema_roastMode');
            onStart('scan', {
                name: file.name,
                type: file.type,
                base64: base64
            });
        };
        reader.readAsDataURL(file);
    } else {
        alert("Please upload a PDF file.");
    }
  };

  const handleHeroUpload = (e: React.ChangeEvent<HTMLInputElement>, isRoast = false) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            const base64 = base64String.split(',')[1];
            
            if (isRoast) {
                 localStorage.setItem('hireSchema_roastMode', 'true');
            } else {
                 localStorage.removeItem('hireSchema_roastMode');
            }

            onStart('scan', {
                name: file.name,
                type: file.type,
                base64: base64
            });
        };
        reader.readAsDataURL(file);
    } else {
        alert("Please upload a PDF file.");
    }
  };

  const features = [
    {
      id: "missing-keywords",
      title: "See What's Missing",
      desc: "We compare your resume to the job posting and show exactly which keywords you're missing.",
      micro: "Like spell-check, but for job applications."
    },
    {
      id: "fix-automatically",
      title: "Fix It Automatically",
      desc: "We rewrite your bullet points to include the right keywords naturally.",
      micro: "Your experience, better words."
    },
    {
      id: "cover-letter",
      title: "Cover Letter Included",
      desc: "Get a personalized cover letter that matches the job you're applying for.",
      micro: "No more blank page anxiety."
    },
    {
      id: "interview-prep",
      title: "Interview Questions",
      desc: "See likely interview questions based on the job description, with sample answers.",
      micro: "Be prepared, not surprised."
    },
    {
      id: "skill-gap",
      title: "Learn What You're Missing",
      desc: "If you're missing a skill, we show you free resources to learn it quickly.",
      micro: "Turn weaknesses into strengths."
    }
  ];

  const caseStudies = [
      { name: "David Kim", role: "Software Engineer", target: "Senior Backend Dev", before: 62, after: 88, outcome: "3 interviews in 7 days" },
      { name: "Sarah Jenkins", role: "Product Manager", target: "Group PM", before: 55, after: 91, outcome: "Offer received in 2 weeks" },
      { name: "Marcus Johnson", role: "Marketing Director", target: "VP Marketing", before: 71, after: 94, outcome: "Multiple screening calls" },
      { name: "Emily Chen", role: "Data Scientist", target: "Lead Data Scientist", before: 60, after: 92, outcome: "Hired by industry leader" },
      { name: "Michael Ross", role: "Sales Manager", target: "Regional VP", before: 45, after: 85, outcome: "5 callbacks in 1 week" },
      { name: "Jessica Wu", role: "UX Designer", target: "Senior Product Designer", before: 58, after: 89, outcome: "Portfolio review invited" },
      { name: "James Wilson", role: "DevOps Engineer", target: "SRE Lead", before: 70, after: 95, outcome: "Senior role offer" },
      { name: "Linda Martinez", role: "HR Specialist", target: "People Ops Manager", before: 50, after: 82, outcome: "Final round interviews" },
      { name: "Robert Taylor", role: "Financial Analyst", target: "Finance Manager", before: 65, after: 88, outcome: "Secured Manager role" }
  ];

  const faqs = [
      { q: "How is this different from generic AI tools?", a: "General chatbots write generic content that sounds artificial. We are purpose-built for ATS optimization. We reverse-engineer the specific keywords, skills, and formatting rules that Applicant Tracking Systems use to filter candidates. We provide a score, identify exact missing keywords based on the job description, and correct the underlying resume code." },
      { q: "What is ATS and why does it matter?", a: "ATS (Applicant Tracking System) is software companies use to filter resumes before a human reviews them. It scans for specific keywords from the job description. If a resume lacks these exact matches, it is often auto-rejected, regardless of the candidate's qualifications. Approximately 75% of resumes are rejected at this stage." },
      { q: "Is my data secure?", a: "Yes. We use TLS encryption, temporary in-session processing, and zero data retention. You can close the application to end processing immediately. Payments are handled securely by Dodo Payments." },
      { q: "How does the ATS scoring work?", a: "We compare your resume against the job description to identify missing keywords, verify section labeling (Experience, Education, Skills), detect mentioned tools and technologies, and flag formatting issues that confuse ATS parsers. Your score reflects the likelihood of passing the ATS filter." },
      { q: "Can I download the optimized resume?", a: "Yes. There is a $1 fee per download for the optimized resume PDF. A tailored cover letter PDF is included." },
      { q: "Does it work for all industries?", a: "It is most effective for roles with explicit hard skills (engineering, product, design, marketing, operations). Generalist roles are supported, though scoring precision may vary." },
      { q: "Is this free to use?", a: "The analysis is free. Payment is only required when you choose to download the optimized files." },
      { q: "Can I edit the suggestions?", a: "Yes. You can edit bullet points inline before exporting; your personal voice is preserved." }
  ];

  return (
    <div className="relative w-full bg-black text-white selection:bg-orange-500/30 font-sans overflow-x-hidden pb-0">
      
      <SEO 
        title="HireSchema | Beat the ATS - Get Your Resume Past the Robots" 
        description="75% of resumes are rejected by ATS robots. Scan your resume, find missing keywords, and download an optimized version for $1. Get hired faster with HireSchema."
        path="/"
      />

      <MouseTrail />

      {/* --- HEADER --- */}
      <Header 
        onNavigate={(view) => {
          if (view === 'landing') window.scrollTo(0, 0);
          else onStart(view as any);
      }} />

      {/* --- HERO SECTION --- */}
      <section className="relative min-h-[90vh] sm:min-h-[90vh] flex flex-col items-center justify-center pt-16 sm:pt-20 px-4 sm:px-6 border-b border-white/10 overflow-hidden bg-zinc-950 pb-16">
        
        {/* Live Animated Gradient Background - Reduced on mobile for performance */}
        <div className="absolute inset-0 bg-zinc-950 overflow-hidden pointer-events-none">
            {/* Dynamic Moving Orbs/Mesh - Simplified on mobile */}
            <div className="absolute top-[-50%] left-[-20%] w-[80%] h-[80%] rounded-full bg-orange-600/20 blur-[80px] sm:blur-[120px] sm:animate-[spin_40s_linear_infinite]" />
            <div className="absolute bottom-[-30%] right-[-10%] w-[60%] h-[60%] rounded-full bg-zinc-800/20 blur-[120px] animate-[spin_50s_linear_infinite_reverse]" />
            <div className="absolute top-[30%] right-[20%] w-[50%] h-[50%] rounded-full bg-orange-900/10 blur-[80px] animate-pulse" />
            
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-15 mix-blend-soft-light"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/50 to-zinc-950"></div>
        </div>
        
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] opacity-20"></div>
        
        <motion.div 
            style={{ y: yHero }}
            className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center"
        >
            {/* Problem Statement - What ATS is */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2 }}
                className="mb-5 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full inline-flex items-center gap-2"
            >
                <span className="text-orange-400 text-xs sm:text-sm font-black uppercase tracking-widest">75% of resumes are auto-rejected by robots</span>
            </motion.div>

            <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.4 }}
                className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter text-white mb-5 leading-[1.1] sm:leading-[1]"
            >
                Your resume gets filtered out<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-orange-400 to-orange-700">before recruiters see it.</span>
            </motion.h1>

            <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.4, delay: 0.4 }}
                className="max-w-2xl text-base sm:text-xl text-zinc-400 mb-5 leading-relaxed font-light"
            >
               Companies use <span className="text-white font-semibold">ATS</span> to auto-reject resumes missing keywords. 
               We scan your resume and show you exactly what's missing to get hired.
            </motion.p>

            {/* Clear Value Prop */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.4, delay: 0.6 }}
                className="flex flex-wrap justify-center gap-2 mb-8 text-xs"
            >
                <div className="flex items-center gap-2 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-full">
                    <span className="text-zinc-400">See ATS score</span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-full">
                    <span className="text-zinc-400">Find gaps</span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-full">
                    <span className="text-zinc-400">Fix & download</span>
                </div>
            </motion.div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.4, delay: 0.8 }}
                className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mb-8 relative"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {isDragging && (
                    <div className="absolute inset-0 -m-3 bg-orange-500/20 border-2 border-dashed border-orange-500 rounded-xl z-50 backdrop-blur-sm flex items-center justify-center">
                        <div className="bg-zinc-950 px-4 py-2 rounded-full border border-orange-500/50 text-orange-500 font-bold flex items-center gap-2 shadow-xl text-xs">
                            Drop PDF to Scan
                        </div>
                    </div>
                )}

                <button 
                  onClick={() => { 
                      logEvent('cta_click', { type: 'optimize' }); 
                      // Trigger file input click
                      document.getElementById('hero-upload')?.click();
                  }}
                  className={ORANGE_BUTTON_STYLE + " w-full sm:w-auto relative overflow-hidden group uppercase"}
                >
                    Scan My Resume — Free
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </button>
                <input 
                    type="file" 
                    id="hero-upload" 
                    accept=".pdf" 
                    className="hidden" 
                    onChange={(e) => handleHeroUpload(e)}
                />
                
                <p className="sm:hidden text-zinc-600 text-xs mt-1">Tap to upload PDF</p>
                <p className="hidden sm:block text-zinc-600 text-xs mt-1 absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-60">
                    or drag and drop PDF here
                </p>
            </motion.div>

            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="flex flex-wrap justify-center gap-3 sm:gap-4 text-xs text-zinc-600 font-mono items-center px-4"
            >
                <span className="flex items-center gap-2 whitespace-nowrap">50,000+ scanned</span>
                <span className="w-1 h-1 rounded-full bg-zinc-800 hidden sm:block"></span>
                <span className="flex items-center gap-2 whitespace-nowrap">Free scan • $1 fix</span>
                <span className="w-1 h-1 rounded-full bg-zinc-800 hidden sm:block"></span>
                <span className="flex items-center gap-2 whitespace-nowrap">No data retention</span>
            </motion.div>
        </motion.div>
      </section>

      {/* --- FEATURES CAROUSEL --- */}
      <FeatureMarquee />

      {/* --- VALUE + PROOF BLOCK --- */}
      <section className="py-12 px-6 bg-zinc-950 border-b border-white/5 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-orange-600/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-6xl mx-auto relative z-10">
            <div className="text-center mb-10">
                <h2 className="text-2xl sm:text-3xl font-black text-white mb-3 tracking-tight">How we get you past the <span className="text-orange-500">ATS robots</span></h2>
                <p className="text-zinc-500 max-w-xl mx-auto text-sm font-light">We re-engineer your resume to match exactly what recruiters are looking for.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Problem/Solution Cards */}
                <div className="lg:col-span-5 space-y-3">
                    {/* Missing Keywords */}
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="bg-zinc-900/40 border border-white/5 p-4 rounded-xl transition-all duration-500 group"
                    >
                        <div className="flex gap-3">
                            <div>
                                <h3 className="text-base font-bold text-white mb-1 uppercase tracking-tighter">Missing Keywords</h3>
                                <p className="text-zinc-500 text-sm leading-relaxed">
                                    If you don't have the exact keywords from the job description, the ATS scores you zero.
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Bad Formatting */}
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="bg-zinc-900/40 border border-white/5 p-4 rounded-xl transition-all duration-500 group"
                    >
                        <div className="flex gap-3">
                            <div>
                                <h3 className="text-base font-bold text-white mb-1 uppercase tracking-tighter">Bad Formatting</h3>
                                <p className="text-zinc-500 text-sm leading-relaxed">
                                    Columns and graphics confuse the parser. Your resume ends up looking like gibberish to the robot.
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* The HireSchema Fix */}
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="bg-zinc-900/40 border border-white/5 p-4 rounded-xl transition-all duration-500 group"
                    >
                        <div className="flex gap-3">
                            <div>
                                <h3 className="text-base font-bold text-white mb-1 uppercase tracking-tighter">The HireSchema Fix</h3>
                                <p className="text-zinc-500 text-sm leading-relaxed">
                                    We rewrite your bullets to include high-value keywords naturally, boosting your match score to 90%+.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Visual Proof */}
                <div className="lg:col-span-7 relative h-[350px] flex items-center justify-center lg:justify-end">
                    {/* Background Glow */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[350px] h-[200px] bg-orange-500/5 blur-[80px] rounded-full"></div>

                    {/* Before Card */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        whileInView={{ opacity: 0.4, y: -30, scale: 0.95 }}
                        viewport={{ once: true }}
                        className="absolute w-full max-w-[350px] bg-zinc-900/80 border border-white/5 rounded-xl p-4 shadow-2xl z-10 backdrop-blur-md"
                    >
                        <div className="flex justify-between items-center mb-2 border-b border-white/5 pb-2">
                            <span className="text-xs font-black text-red-500/50 uppercase tracking-widest">Before</span>
                            <div className="text-xs font-mono text-zinc-600 uppercase tracking-tight">Score: 42/100</div>
                        </div>
                        <p className="text-zinc-600 text-sm italic font-serif leading-relaxed line-through decoration-red-500/20">
                            Responsible for sales and managing the team during the quarter.
                        </p>
                    </motion.div>

                    {/* Optimized Card */}
                    <motion.div 
                        initial={{ opacity: 0, y: 30, scale: 1 }}
                        whileInView={{ opacity: 1, y: 15, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3, type: "spring", stiffness: 50 }}
                        className="absolute w-full max-w-[400px] bg-zinc-900 border border-orange-500/30 rounded-2xl p-5 sm:p-6 shadow-[0_0_50px_rgba(234,88,12,0.15)] z-20 backdrop-blur-xl"
                    >
                        <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                                <span className="text-xs font-black text-white uppercase tracking-widest">Optimized</span>
                            </div>
                            <div className="text-xs font-mono text-orange-400 font-bold uppercase tracking-tight">Score: 94/100</div>
                        </div>
                        
                        <p className="text-white text-base sm:text-lg leading-relaxed font-medium">
                            Led a <span className="text-orange-200 border-b-2 border-orange-500/50 pb-0.5 px-0.5 font-bold">sales team of 10</span>, achieving <span className="text-orange-200 border-b-2 border-orange-500/50 pb-0.5 px-0.5 font-bold">150% of quota</span> ($2M ARR) through strategic <span className="text-orange-200 border-b-2 border-orange-500/50 pb-0.5 px-0.5 font-bold">CRM implementation</span>.
                        </p>
                        
                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className="text-xs bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded-full border border-orange-500/20 font-mono uppercase tracking-widest">Quantified Impact</span>
                        </div>

                        {/* Success Badge */}
                        <motion.div 
                            initial={{ scale: 0, rotate: -5 }}
                            whileInView={{ scale: 1, rotate: 12 }}
                            viewport={{ once: true }}
                            transition={{ type: "spring", delay: 1, damping: 10 }}
                            className="absolute -right-2 -bottom-2 bg-orange-500 text-white font-black px-3 py-1.5 rounded-lg shadow-2xl z-40 border-2 border-zinc-950 text-xs uppercase"
                        >
                            ATS PASS
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </div>
      </section>

      {/* --- HOW IT WORKS --- */}
      <section className="py-12 px-6 bg-zinc-950 border-b border-white/5 relative overflow-hidden">
          <div className="max-w-6xl mx-auto relative z-10">
               <div className="text-center mb-12">
                  <h2 className="text-xl font-black text-white mb-1 uppercase tracking-tight">How it works</h2>
                  <p className="text-zinc-500 text-xs">Get a better resume in under 2 minutes.</p>
              </div>

              <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Step 1 */}
                  <div 
                      className="flex flex-col items-center text-center relative group cursor-pointer"
                      onClick={() => onStart('scan')}
                  >
                      <StepGraphic step={1} />
                      <h4 className="text-sm font-black text-white mb-1.5 group-hover:text-orange-500 transition-colors uppercase tracking-widest">1. Upload</h4>
                      <p className="text-zinc-500 text-xs leading-relaxed max-w-[200px]">
                          Drop your resume and paste the job posting. Takes 10 seconds.
                      </p>
                  </div>

                  {/* Step 2 */}
                  <div className="flex flex-col items-center text-center relative group">
                      <StepGraphic step={2} />
                      <h4 className="text-sm font-black text-white mb-1.5 uppercase tracking-widest">2. Analyze</h4>
                      <p className="text-zinc-500 text-xs leading-relaxed max-w-[200px]">
                          See your score and the exact keywords the job wants that you lack.
                      </p>
                  </div>

                  {/* Step 3 */}
                  <div className="flex flex-col items-center text-center relative group">
                      <StepGraphic step={3} />
                      <h4 className="text-sm font-black text-white mb-1.5 uppercase tracking-widest">3. Optimize</h4>
                      <p className="text-zinc-500 text-xs leading-relaxed max-w-[200px]">
                          Rewrite your resume with the right keywords and download the PDF.
                      </p>
                  </div>
              </div>
          </div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section id="features" className="py-12 px-6 bg-zinc-900/50 relative scroll-mt-20">
        <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
                <h2 className="text-xl font-black text-white mb-1 uppercase tracking-tight">Everything You Need</h2>
                <p className="text-zinc-500 text-xs">Not just a resume checker — a complete toolkit.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {features.map((f, i) => (
                    <motion.div 
                        key={i} 
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1, duration: 0.8 }}
                        className="bg-zinc-900 border border-white/5 p-5 rounded-xl hover:border-orange-500/30 transition-all group cursor-pointer"
                        onClick={() => onStart('feature', undefined, f.id)}
                    >
                        <h3 className="text-sm font-black text-white mb-1 flex items-center gap-2">
                            {f.title}
                            <span className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-orange-500 ml-1">→</span>
                        </h3>
                        <p className="text-zinc-500 text-xs leading-relaxed mb-2.5">
                            {f.desc}
                        </p>
                        <div className="border-t border-white/5 pt-2.5">
                            <p className="text-xs text-zinc-600 font-mono italic">
                                {f.micro}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
      </section>

      {/* --- PRICING SECTION --- */}
      <section id="pricing" className="py-16 px-6 bg-zinc-950 border-t border-white/10 scroll-mt-20">
          <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Simple Pricing</h2>
              <p className="text-zinc-500 text-sm mb-10">Free analysis. Pay only when you download.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                  {/* Free Tier */}
                  <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-2xl flex flex-col items-center">
                      <span className="text-zinc-600 font-black uppercase tracking-[0.2em] text-xs mb-4">Analysis</span>
                      <div className="text-3xl font-black text-white mb-6 uppercase tracking-tighter">Free</div>
                      <ul className="space-y-3 text-left w-full mb-8 flex-1">
                          <li className="flex items-center gap-2 text-sm text-zinc-400 font-bold uppercase tracking-tight">ATS score</li>
                          <li className="flex items-center gap-2 text-sm text-zinc-400 font-bold uppercase tracking-tight">Keyword gaps</li>
                          <li className="flex items-center gap-2 text-sm text-zinc-400 font-bold uppercase tracking-tight">AI Preview</li>
                      </ul>
                    <a 
                        href="/app"
                        onClick={(e) => { 
                            if (e.metaKey || e.ctrlKey) return;
                            e.preventDefault();
                            logEvent('cta_click', { tier: 'free' }); 
                            onStart('scan'); 
                        }} 
                        className={ORANGE_BUTTON_STYLE + " w-full py-3.5 text-sm"}
                    >
                        Start now
                    </a>
                </div>

                {/* Paid Tier */}
                <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-orange-500/30 p-6 rounded-2xl flex flex-col items-center relative shadow-2xl">
                     <div className="absolute top-0 right-0 bg-orange-600 text-white text-xs font-black px-3 py-1 rounded-bl-lg rounded-tr-lg uppercase tracking-widest">
                         Unlock
                     </div>
                    <span className="text-orange-500 font-black uppercase tracking-[0.2em] text-xs mb-4">Full Access</span>
                    <div className="text-3xl font-black text-white mb-6 uppercase tracking-tighter">$1 <span className="text-sm font-normal text-zinc-600 tracking-normal">/ download</span></div>
                    <ul className="space-y-3 text-left w-full mb-8 flex-1">
                        <li className="flex items-center gap-2 text-sm text-zinc-200 font-bold uppercase tracking-tight">Optimized Resume PDF</li>
                        <li className="flex items-center gap-2 text-sm text-zinc-200 font-bold uppercase tracking-tight">Tailored Cover Letter</li>
                        <li className="flex items-center gap-2 text-sm text-zinc-200 font-bold uppercase tracking-tight">Interview Prep Kit</li>
                        <li className="flex items-center gap-2 text-xs text-zinc-600 mt-3 border-t border-white/5 pt-3">Secure payment via Dodo</li>
                    </ul>
                    <a 
                        href="/app"
                        onClick={(e) => { 
                            if (e.metaKey || e.ctrlKey) return;
                            e.preventDefault();
                            logEvent('cta_click', { tier: 'paid' }); 
                            onStart('optimize'); 
                        }} 
                        className={ORANGE_BUTTON_STYLE + " w-full py-3.5 text-sm"}
                    >
                        Start now
                    </a>
                  </div>
              </div>
          </div>
      </section>

      {/* --- DATA SAFETY --- */}
      <section id="data-safety" className="py-24 px-6 bg-zinc-900 border-t border-white/10 scroll-mt-20">
          <div className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row gap-12 items-center">
                  <div className="flex-1">
                       <h2 className="text-3xl font-bold text-white mb-6">Your data, protected.</h2>
                       <ul className="space-y-4">
                           <li className="flex items-start gap-3">
                               <span className="text-zinc-300 text-sm"><strong>Zero Data Retention.</strong> We do not store your resumes or personal data on our servers.</span>
                           </li>
                           <li className="flex items-start gap-3">
                               <span className="text-zinc-300 text-sm">Processing occurs in ephemeral memory and is wiped after your session.</span>
                           </li>
                           <li className="flex items-start gap-3">
                               <span className="text-zinc-300 text-sm">Security: TLS encryption in transit.</span>
                           </li>
                           <li className="flex items-start gap-3">
                               <span className="text-zinc-300 text-sm">We don’t share or sell your data.</span>
                           </li>
                           <li className="flex items-start gap-3">
                               <span className="text-zinc-300 text-sm">Payments handled securely by Dodo Payments.</span>
                           </li>
                       </ul>
                       <div className="flex gap-4 mt-8">
                           <a href="/privacy" className="text-xs text-zinc-500 underline hover:text-white">Privacy Policy</a>
                           <a href="/terms" className="text-xs text-zinc-500 underline hover:text-white">Terms & Conditions</a>
                           <a href="/cookies" className="text-xs text-zinc-500 underline hover:text-white">Cookie Policy</a>
                       </div>
                  </div>
                  <div className="flex-1 w-full flex justify-center">
                      <div className="w-64 h-64 bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
                           <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%,100%_100%] animate-[shimmer_3s_linear_infinite]"></div>
                           <div className="px-4 py-1 bg-orange-500/10 rounded-full text-orange-500 text-xs font-bold">Zero storage</div>
                           <p className="text-xs text-zinc-500 mt-2">Ephemeral processing</p>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* --- PROVEN RESULTS (GRID) --- */}
      <section className="py-24 px-6 bg-zinc-950 border-t border-white/10 relative">
          <div className="max-w-7xl mx-auto mb-12 text-center">
                 <h2 className="text-3xl font-bold text-white mb-2">Proven Results</h2>
                 <p className="text-zinc-500">Real outcomes from real candidates.</p>
          </div>
          
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {caseStudies.map((c, i) => (
                    <motion.div 
                        key={i} 
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.15, duration: 0.8 }}
                        className="bg-zinc-900/50 border border-white/5 p-6 rounded-xl hover:border-zinc-700 transition-colors group"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-500 text-xs shrink-0 font-mono">
                                {c.name.charAt(0)}
                            </div>
                            <div className="overflow-hidden">
                                <h4 className="text-white font-bold text-sm truncate">{c.name}</h4>
                                <div className="text-zinc-500 text-xs flex items-center gap-1 flex-wrap">
                                    {c.role} <span className="text-zinc-600">/</span> <span className="text-zinc-300">{c.target}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-between items-center mb-6 bg-zinc-950/50 p-3 rounded-lg border border-white/5">
                            <div className="text-center">
                                <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Before</div>
                                <div className="text-xl font-mono text-zinc-400">{c.before}</div>
                            </div>
                            <span className="text-zinc-600">→</span>
                            <div className="text-center">
                                <div className="text-xs text-orange-500 uppercase font-bold tracking-wider">After</div>
                                <div className="text-xl font-mono text-orange-400 font-bold">{c.after}</div>
                            </div>
                        </div>

                        <div className="flex items-start gap-2">
                            <p className="text-sm text-zinc-300 font-medium tracking-tight uppercase"><span className="text-orange-500 font-black mr-2">RESULT</span> {c.outcome}</p>
                        </div>
                    </motion.div>
                ))}
          </div>
      </section>

      {/* --- FAQ SECTION --- */}
      <section id="faq" className="py-16 sm:py-24 px-4 sm:px-6 bg-zinc-950 border-t border-white/10 scroll-mt-20">
          <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8 sm:mb-12 text-center">Frequently Asked Questions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                  {faqs.map((item, i) => (
                      <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, delay: i * 0.2 }}
                      >
                          <FAQItem question={item.q} answer={item.a} />
                      </motion.div>
                  ))}
              </div>
          </div>
      </section>
      
      {/* --- FOOTER --- */}
      <Footer onNavigate={(view) => {
          if (view === 'landing') window.scrollTo(0, 0);
          else onStart(view as any);
      }} />
    </div>
  );
};

export default LandingPage;
