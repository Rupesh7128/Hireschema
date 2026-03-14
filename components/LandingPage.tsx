
import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence, useMotionValueEvent } from 'framer-motion';
import {
    Sparkles, Upload, Search, ArrowRight, FileText, Globe, GraduationCap,
    BrainCircuit, ShieldCheck, CheckCircle2, XCircle,
    Check, Award, Lock, CreditCard, Database, Activity, Zap, Flame, BookOpen, Star
} from 'lucide-react';
import { Header } from './Header';
import { Footer } from './Footer';
import { FileData } from '../types';
import { logEvent } from '../services/analytics';
import { ResumeComparison } from './ResumeComparison';

interface LandingPageProps {
    onStart: (intent: 'scan' | 'optimize' | 'launch' | 'roast' | 'blog' | 'feature' | 'pricing', file?: FileData, featureSlug?: string, jobDescription?: string) => void;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Consistent Global Button Styles - Mobile optimized with active states
const ORANGE_BUTTON_STYLE = "px-6 sm:px-8 py-3 sm:py-3.5 bg-white hover:bg-zinc-50 active:bg-zinc-200 text-black font-mono font-bold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 sm:gap-2.5 shadow-[3px_3px_0px_0px_#f97316] hover:shadow-none active:shadow-none hover:translate-x-[1.5px] hover:translate-y-[1.5px] active:translate-x-[1.5px] active:translate-y-[1.5px] transition-all rounded-sm cursor-pointer border-none touch-target";

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
        "Download as PDF", "Works in 8 Languages", "Instant Results"
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
                    <div className="w-12 h-16 bg-white rounded border border-zinc-200 flex flex-col items-center justify-center gap-1 z-10 shadow-lg group-hover:scale-110 transition-transform">
                        <div className="text-[10px] font-black text-black group-hover:text-orange-500 transition-colors uppercase">PDF</div>
                        <div className="w-8 h-0.5 bg-orange-500 group-hover:bg-orange-600 transition-colors"></div>
                    </div>
                    {/* Floating particles */}
                    <div className="absolute top-4 right-4 w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce"></div>
                </>
            )}

            {step === 2 && (
                <>
                    {/* Analysis UI */}
                    <div className="w-12 h-16 bg-white rounded border border-zinc-200 flex flex-col p-1.5 gap-1.5 z-10 shadow-lg relative overflow-hidden group-hover:scale-110 transition-transform">
                        <div className="w-8 h-1 bg-zinc-200 rounded-full"></div>
                        <div className="w-6 h-1 bg-zinc-200 rounded-full"></div>
                        <div className="w-full h-1 bg-orange-500/30 rounded-full"></div>
                        <div className="w-5 h-1 bg-zinc-200 rounded-full"></div>
                        <div className="w-full h-1 bg-orange-500/30 rounded-full"></div>
                        {/* Scanner Line */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,1)] animate-[scan_1.5s_ease-in-out_infinite]"></div>
                    </div>
                </>
            )}

            {step === 3 && (
                <>
                    {/* Optimized UI */}
                    <div className="w-12 h-16 bg-white rounded border border-orange-500/30 flex flex-col p-1.5 gap-1.5 z-10 shadow-lg group-hover:scale-110 transition-transform">
                        <div className="w-8 h-1 bg-black rounded-full"></div>
                        <div className="w-full h-1 bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.5)]"></div>
                        <div className="w-6 h-1 bg-black rounded-full"></div>
                        <div className="w-full h-1 bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.5)]"></div>

                        <div className="absolute -bottom-2 -right-2 bg-orange-500 text-white px-2 py-0.5 rounded-full border-2 border-white text-[10px] font-black">
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

// --- NEW SECTIONS ---
const ExitIntentPopup = ({ onCta }: { onCta: () => void }) => {
    // Popup removed as per user request
    return null;
};

const ComparisonSection = () => {
    return (
        <section className="py-16 px-6 bg-[#111] border-b border-white/5">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-10">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Why pay $50/month for less?</h2>
                    <p className="text-zinc-400 max-w-xl mx-auto text-sm">HireSchema gives you everything competitors charge $50/month for — in a single $1 payment.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] border-collapse">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="p-4 text-left text-zinc-500 text-xs font-bold uppercase tracking-widest">Feature</th>
                                <th className="p-4 text-center text-orange-500 text-xs font-black uppercase tracking-widest bg-orange-500/5 rounded-t-lg border-x border-t border-orange-500/20">HireSchema</th>
                                <th className="p-4 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest">Jobscan</th>
                                <th className="p-4 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest">Resume Worded</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {[
                                { name: "ATS Resume Rewrite", us: true, c1: false, c2: false },
                                { name: "Custom Cover Letter", us: true, c1: false, c2: false },
                                { name: "20 Interview Q&A", us: true, c1: false, c2: "Limited" },
                                { name: "Gap Analysis", us: true, c1: true, c2: true },
                                { name: "Price", us: "$1", c1: "$49.95/mo", c2: "$19/mo", highlight: true },
                                { name: "One-time (no sub)", us: true, c1: false, c2: false },
                            ].map((row, i) => (
                                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                                    <td className="p-4 text-zinc-300 font-bold">{row.name}</td>
                                    <td className={`p-4 text-center border-x border-orange-500/20 bg-orange-500/5 ${row.highlight ? 'text-orange-400 font-black' : 'text-white'}`}>
                                        {row.us === true ? <CheckCircle2 className="w-5 h-5 text-orange-500 mx-auto fill-orange-500/20" /> : row.us === false ? <XCircle className="w-5 h-5 text-zinc-700 mx-auto" /> : row.us}
                                    </td>
                                    <td className="p-4 text-center text-zinc-500">
                                        {row.c1 === true ? <Check className="w-5 h-5 text-zinc-500 mx-auto" /> : row.c1 === false ? <XCircle className="w-5 h-5 text-zinc-800 mx-auto" /> : row.c1}
                                    </td>
                                    <td className="p-4 text-center text-zinc-500">
                                        {row.c2 === true ? <Check className="w-5 h-5 text-zinc-500 mx-auto" /> : row.c2 === false ? <XCircle className="w-5 h-5 text-zinc-800 mx-auto" /> : row.c2}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
};



const TestimonialsSection = () => {
    return (
        <section className="py-16 px-6 bg-zinc-950 border-b border-white/5 overflow-hidden">
            <div className="max-w-6xl mx-auto">
                <h2 className="text-2xl font-black text-white mb-10 text-center">Hired by the best.</h2>
                <div className="flex overflow-x-auto pb-8 gap-6 snap-x md:grid md:grid-cols-3 md:overflow-visible">
                    {[
                        { name: "Priya S.", role: "Software Engineer", company: "Hired at Flipkart", quote: "Applied to 30 jobs before HireSchema. 2 responses. Used it once, applied to 8 more — got 5 interview calls in a week." },
                        { name: "Rahul M.", role: "Product Manager", company: "Hired at Swiggy", quote: "My ATS score went from 34% to 91%. The interview questions section alone was worth it — my interviewer asked 3 of the exact questions." },
                        { name: "Ananya K.", role: "Marketing Manager", company: "Hired at Myntra", quote: "The cover letter it generated was better than anything I could write myself. Got a callback the same day I applied." }
                    ].map((t, i) => (
                        <div key={i} className="min-w-[85vw] md:min-w-0 bg-[#1a1a1a] border-t-2 border-orange-500 p-6 rounded-xl flex-shrink-0 snap-center">
                            <div className="flex gap-1 mb-4">{[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 text-orange-500 fill-orange-500" />)}</div>
                            <p className="text-zinc-300 text-sm leading-relaxed italic mb-6">"{t.quote}"</p>
                            <div><div className="text-white font-bold">{t.name}</div><div className="text-zinc-500 text-xs mt-0.5">{t.role}</div><div className="text-orange-500 text-xs font-bold mt-1 uppercase flex items-center gap-1"><ArrowRight className="w-3 h-3" /> {t.company}</div></div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

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
    
    // --- HERO STATE ---
    const [heroFile, setHeroFile] = useState<FileData | null>(null);
    const [heroJobDescription, setHeroJobDescription] = useState('');
    const [heroError, setHeroError] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const processHeroFile = (file: File) => {
        setHeroError(null);
        if (file.type !== 'application/pdf') {
            setHeroError('Invalid file type. Please upload a PDF.');
            return;
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
            setHeroError(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit.`);
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            const base64 = base64String.split(',')[1];
            setHeroFile({
                name: file.name,
                type: file.type,
                base64: base64
            });
        };
        reader.readAsDataURL(file);
    };

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
        if (file) processHeroFile(file);
    };

    const handleHeroUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processHeroFile(file);
    };

    const handleStartScan = () => {
        if (!heroFile) {
            setHeroError("Please upload a resume first.");
            return;
        }
        if (!heroJobDescription.trim()) {
            setHeroError("Please paste the job description or link.");
            return;
        }
        localStorage.removeItem('hireSchema_roastMode');
        onStart('scan', heroFile, undefined, heroJobDescription);
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
            title: "AI-Powered Interview Guide",
            desc: "Get a personalized interview guide with predicted questions and STAR-format answers tailored to your resume and the role.",
            micro: "Be prepared, not surprised."
        },
        {
            id: "skill-gap",
            title: "Learn What You're Missing",
            desc: "If you're missing a skill, we show you free resources to learn it quickly.",
            micro: "Turn weaknesses into strengths."
        },
        {
            id: "translate",
            title: "Works in 8 Languages",
            desc: "Generate ATS-friendly resumes and documents in your preferred language, ready to apply anywhere.",
            micro: "Apply globally, stay readable."
        }
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
                title="HireSchema | The Ultimate Interview Prep Kit - Resume, Cover Letter & Q&A"
                description="Get a complete Interview Preparation Kit for $1. Includes an ATS-optimized resume, tailored cover letter, and 20+ interview questions with AI-generated answers custom to your experience."
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
            <section className="relative min-h-[90vh] sm:min-h-[90vh] flex flex-col items-center justify-center pt-28 sm:pt-36 px-4 sm:px-6 border-b border-white/10 overflow-hidden bg-zinc-950 pb-16">

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
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.4 }}
                        className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter text-white mb-8 leading-[1.1] sm:leading-[1]"
                    >
                        Stop Getting Rejected.<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-br from-orange-400 to-orange-700">Start Getting Interviewed.</span>
                    </motion.h1>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.4, delay: 0.4 }}
                        className="w-full max-w-2xl mx-auto mb-8 relative z-20"
                    >
                        <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-sm p-6 shadow-2xl flex flex-col md:flex-row gap-6">
                            
                            {/* LEFT: Resume Upload */}
                            <div className="flex-1 flex flex-col gap-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-5 h-5 rounded-full bg-orange-600 flex items-center justify-center text-[10px] font-black text-white">1</div>
                                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Upload Resume</h3>
                                </div>
                                
                                <div 
                                    className={`flex-1 min-h-[140px] border-2 border-dashed rounded-sm flex flex-col items-center justify-center gap-3 transition-all cursor-pointer relative overflow-hidden group
                                        ${isDragging ? 'border-orange-500 bg-orange-500/10' : heroFile ? 'border-green-500/30 bg-green-500/5' : 'border-zinc-700 bg-zinc-950/50 hover:border-zinc-500 hover:bg-zinc-900'}
                                    `}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {heroFile ? (
                                        <>
                                            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                            </div>
                                            <div className="text-center px-4">
                                                <p className="text-sm font-bold text-white truncate max-w-[180px]">{heroFile.name}</p>
                                                <p className="text-[10px] text-zinc-500 mt-1">Ready to scan</p>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setHeroFile(null); }}
                                                className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-white/10 text-zinc-500 hover:text-white"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isDragging ? 'bg-orange-500/20' : 'bg-zinc-800 group-hover:bg-zinc-700'}`}>
                                                <Upload className={`w-5 h-5 ${isDragging ? 'text-orange-500' : 'text-zinc-400 group-hover:text-white'}`} />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs font-bold text-white mb-1">
                                                    {isDragging ? 'Drop it here!' : 'Click or Drag PDF'}
                                                </p>
                                                <p className="text-[10px] text-zinc-500">Max 5MB</p>
                                            </div>
                                        </>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf"
                                        className="hidden"
                                        onChange={handleHeroUpload}
                                    />
                                </div>
                            </div>

                            {/* RIGHT: Job Description */}
                            <div className="flex-1 flex flex-col gap-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-black text-white">2</div>
                                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Job Description</h3>
                                </div>
                                
                                <div className="flex-1 min-h-[140px] bg-zinc-950/50 border border-zinc-700 rounded-sm relative focus-within:border-orange-500/50 transition-colors">
                                    <textarea
                                        value={heroJobDescription}
                                        onChange={(e) => setHeroJobDescription(e.target.value)}
                                        placeholder="Paste the Link or Job description"
                                        className="w-full h-full bg-transparent p-4 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none resize-none font-mono leading-relaxed rounded-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Error Message */}
                        <AnimatePresence>
                            {heroError && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute -bottom-12 left-0 right-0 text-center"
                                >
                                    <span className="inline-block px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                                        {heroError}
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Action Button */}
                        <div className="mt-6 flex justify-center">
                            <button
                                onClick={handleStartScan}
                                className="px-6 py-3 bg-white hover:bg-zinc-50 active:bg-zinc-200 text-black font-mono font-bold text-sm uppercase tracking-widest shadow-[3px_3px_0px_0px_#f97316] hover:shadow-none active:shadow-none hover:translate-x-[1.5px] hover:translate-y-[1.5px] active:translate-x-[1.5px] active:translate-y-[1.5px] transition-all rounded-sm cursor-pointer border-none w-full sm:w-auto min-w-[200px]"
                            >
                                START SCAN — FREE
                            </button>
                        </div>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.4, delay: 0.6 }}
                        className="max-w-2xl text-base sm:text-xl text-zinc-400 mb-5 leading-relaxed font-medium"
                    >
                        The only AI career kit that gets you hired.<br />
                        <span className="text-white font-semibold">For $1, get an ATS-Optimized Resume, Custom Cover Letter, and an AI-Powered Interview Guide.</span>
                    </motion.p>

                    {/* Clear Value Prop */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.4, delay: 0.8 }}
                        className="flex flex-wrap justify-center gap-2 mb-8 text-xs"
                    >
                        <div className="flex items-center gap-2 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-full">
                            <span className="text-zinc-400">Pass Recruiters</span>
                        </div>
                        <div className="flex items-center gap-2 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-full">
                            <span className="text-zinc-400">Ace Interviews</span>
                        </div>
                        <div className="flex items-center gap-2 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-full">
                            <span className="text-zinc-400">Get Hired Faster</span>
                        </div>
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
                        <h2 className="text-2xl sm:text-3xl font-black text-white mb-3 tracking-tight">Optimized for <span className="text-orange-500">Humans & Robots</span></h2>
                        <p className="text-zinc-500 max-w-xl mx-auto text-sm font-light">We re-engineer your resume to pass the ATS scan AND impress the hiring manager.</p>
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
                        <div className="lg:col-span-7 relative h-[420px] flex items-center justify-center lg:justify-end">
                            {/* Background Glow */}
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[350px] h-[200px] bg-orange-500/5 blur-[80px] rounded-full"></div>

                            {/* Before Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                whileInView={{ opacity: 0.45, y: -20, scale: 0.93 }}
                                viewport={{ once: true }}
                                className="absolute w-full max-w-[360px] bg-zinc-900/80 border border-red-500/10 rounded-xl p-4 shadow-2xl z-10 backdrop-blur-md"
                            >
                                <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
                                    <span className="text-xs font-black text-red-400/70 uppercase tracking-widest">Before — Unoptimized</span>
                                    <div className="text-xs font-mono text-red-500/60 font-bold">Score: 28/100</div>
                                </div>
                                <div className="mb-1.5">
                                    <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Experience</div>
                                    <div className="space-y-1.5">
                                        <p className="text-zinc-600 text-xs leading-relaxed">• Responsible for sales and managing the team.</p>
                                        <p className="text-zinc-600 text-xs leading-relaxed">• Worked on various projects and helped customers.</p>
                                        <p className="text-zinc-600 text-xs leading-relaxed">• Handled day-to-day operations and reporting tasks.</p>
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Skills</div>
                                    <p className="text-zinc-700 text-xs">MS Office, Communication, Teamwork, Hard-working</p>
                                </div>
                                <div className="mt-2.5 flex gap-1.5 flex-wrap">
                                    <span className="text-[9px] bg-red-500/10 text-red-500/60 px-1.5 py-0.5 rounded border border-red-500/10 font-mono uppercase">No Keywords</span>
                                    <span className="text-[9px] bg-red-500/10 text-red-500/60 px-1.5 py-0.5 rounded border border-red-500/10 font-mono uppercase">No Metrics</span>
                                    <span className="text-[9px] bg-red-500/10 text-red-500/60 px-1.5 py-0.5 rounded border border-red-500/10 font-mono uppercase">ATS Fail</span>
                                </div>
                            </motion.div>

                            {/* Optimized Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 40, scale: 1 }}
                                whileInView={{ opacity: 1, y: 30, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.3, type: "spring", stiffness: 50 }}
                                className="absolute w-full max-w-[400px] bg-zinc-900 border border-orange-500/30 rounded-2xl p-5 shadow-[0_0_50px_rgba(234,88,12,0.15)] z-20 backdrop-blur-xl"
                            >
                                <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-3">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                                        <span className="text-xs font-black text-white uppercase tracking-widest">After — HireSchema Optimized</span>
                                    </div>
                                    <div className="text-xs font-mono text-orange-400 font-bold">Score: 94/100</div>
                                </div>

                                <div className="mb-2">
                                    <div className="text-[10px] font-bold text-orange-500/70 uppercase tracking-widest mb-1.5">Experience</div>
                                    <div className="space-y-2">
                                        <p className="text-white text-xs leading-relaxed">• Led a <span className="text-orange-300 font-bold">sales team of 10</span>, exceeding quota by <span className="text-orange-300 font-bold">150%</span> ($2M ARR) via <span className="text-orange-300 font-bold">Salesforce CRM</span> pipeline optimization.</p>
                                        <p className="text-white text-xs leading-relaxed">• Drove <span className="text-orange-300 font-bold">38% revenue growth</span> by implementing a <span className="text-orange-300 font-bold">data-driven</span> outreach strategy across 3 enterprise accounts.</p>
                                        <p className="text-white text-xs leading-relaxed">• Reduced churn by <span className="text-orange-300 font-bold">22%</span> through proactive <span className="text-orange-300 font-bold">customer success</span> workflows and QBR cadence.</p>
                                    </div>
                                </div>

                                <div className="mt-2">
                                    <div className="text-[10px] font-bold text-orange-500/70 uppercase tracking-widest mb-1.5">Skills</div>
                                    <p className="text-zinc-300 text-xs"><span className="text-orange-300 font-bold">Salesforce CRM</span> · <span className="text-orange-300 font-bold">Revenue Operations</span> · <span className="text-orange-300 font-bold">Pipeline Management</span> · Strategic Selling · B2B SaaS</p>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    <span className="text-[9px] bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/20 font-mono uppercase">Quantified</span>
                                    <span className="text-[9px] bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/20 font-mono uppercase">JD Keywords</span>
                                    <span className="text-[9px] bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/20 font-mono uppercase">ATS Ready</span>
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

            {/* --- NEW MARKETING SECTIONS --- */}
            <ComparisonSection />
            <ResumeComparison />
            <TestimonialsSection />

            {/* --- PRICING SECTION --- */}
            <section id="pricing" className="py-16 px-6 bg-zinc-900/20 border-t border-white/10 scroll-mt-20">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Simple Pricing</h2>
                    <p className="text-zinc-500 text-sm mb-10">Free analysis. Pay only when you download.</p>

                    <ExitIntentPopup onCta={() => onStart('scan')} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                        {/* Free Tier */}
                        <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-2xl flex flex-col items-center">
                            <span className="text-zinc-600 font-black uppercase tracking-[0.2em] text-xs mb-4">Analysis</span>
                            <div className="text-3xl font-black text-white mb-6 uppercase tracking-tighter">Free</div>
                            <ul className="space-y-3 text-left w-full mb-8 flex-1">
                                <li className="flex items-center gap-2 text-sm text-zinc-400 font-bold uppercase tracking-tight">Interview Prep</li>
                                <li className="flex items-center gap-2 text-sm text-zinc-400 font-bold uppercase tracking-tight">Cover Letter</li>
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
                            <div className="absolute top-0 right-0 bg-orange-600 text-white text-xs font-black px-3 py-1 rounded-bl-lg rounded-tr-lg uppercase tracking-widest animate-pulse">
                                Low Availability
                            </div>
                            <span className="text-orange-500 font-black uppercase tracking-[0.2em] text-xs mb-4">Full Access</span>
                            <div className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">$1 <span className="text-sm font-normal text-zinc-600 tracking-normal">/ download</span></div>

                            {/* Urgency Triggers */}
                            <div className="mb-6 w-full bg-orange-950/30 border border-orange-500/20 rounded-lg p-2.5 text-center">
                                <p className="text-orange-400 text-xs font-bold uppercase tracking-wide mb-1">🔥 Only 4 spots left</p>
                                <p className="text-zinc-500 text-[10px]">for today's priority batch</p>
                            </div>

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
                                    <span className="text-zinc-300 text-sm"><strong>No server-side storage.</strong> Your resume is not saved on HireSchema servers.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-zinc-300 text-sm"><strong>Local by default.</strong> Any history you keep is saved in your browser storage, and you can delete it anytime.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-zinc-300 text-sm"><strong>Encrypted in transit.</strong> Data is sent over TLS.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-zinc-300 text-sm"><strong>No selling.</strong> We don’t sell your personal data.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-zinc-300 text-sm"><strong>Secure payments.</strong> Checkout is handled by Dodo Payments — we don’t store card details.</span>
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



            {/* --- FAQ SECTION --- */}
            <section id="faq" className="py-16 sm:py-24 px-4 sm:px-6 bg-zinc-950 border-t border-white/10 scroll-mt-20">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8 sm:mb-12 text-center">Frequently Asked Questions</h2>
                    <div className="grid grid-cols-1 gap-4 max-w-3xl mx-auto">
                        {faqs.map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8, delay: i * 0.1 }}
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
