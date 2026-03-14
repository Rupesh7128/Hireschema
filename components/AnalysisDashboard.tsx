
import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalysisResult, ContactProfile } from '../types';
import {
  AlertTriangle, CheckCircle, Target, FileSearch, TrendingUp, Download,
  ShieldAlert, Info, User, BrainCircuit, Globe, Briefcase, DollarSign,
  Pencil, X, Check, Camera, Mail, Phone, Linkedin, MapPin,
  ChevronRight, AlertCircle, Zap, ShieldCheck, ListChecks, Award,
  Copy, ExternalLink, Sparkles, Rocket, ArrowRight
} from 'lucide-react';

interface AnalysisDashboardProps {
  result: AnalysisResult;
  onUpdateProfile?: (profile: ContactProfile) => void;
  onNavigateTab?: (tab: 'analysis' | 'generator') => void;
  onReScan?: () => void;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const dedupeCommaSegments = (value: string): string => {
  const raw = (value || '').trim();
  if (!raw) return raw;
  if (!raw.includes(',')) return raw.replace(/\s+/g, ' ').trim();
  const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  const keptNorm: string[] = [];
  const endsWithWholeSegment = (container: string, segment: string) => {
    if (!container || !segment) return false;
    if (!container.endsWith(segment)) return false;
    if (container.length === segment.length) return true;
    const boundaryChar = container[container.length - segment.length - 1] || '';
    return !/[a-z0-9]/i.test(boundaryChar);
  };
  for (const part of parts) {
    const key = part.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!key) continue;
    if (seen.has(key)) continue;
    if (keptNorm.some(prev => endsWithWholeSegment(prev, key))) continue;
    seen.add(key);
    out.push(part);
    keptNorm.push(key);
  }
  return out.join(', ');
};

const formatOpportunityTitle = (jobTitle: string | undefined, company: string | undefined) => {
  const base = dedupeCommaSegments(jobTitle || '');
  if (!company) return base || 'Target Role';
  const companyEsc = escapeRegExp(company.trim());
  const cleaned = base.replace(new RegExp(`\\s*[\\/|\\-–—]\\s*${companyEsc}\\s*$`, 'i'), '').trim();
  return cleaned || 'Target Role';
};

const ScoreGauge = ({ score, subScore1, subScore2 }: { score: number, subScore1: { label: string, value: number }, subScore2: { label: string, value: number } }) => {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = score;
    const duration = 1500;
    const increment = end / (duration / 16);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setAnimatedScore(end);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [score]);

  return (
    <div className="relative p-8 rounded-3xl bg-gradient-to-b from-zinc-900 to-black border border-white/10 shadow-[0_0_40px_-10px_rgba(249,115,22,0.15)] flex flex-col items-center justify-center overflow-hidden group hover:border-orange-500/30 transition-all duration-500">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent opacity-50 pointer-events-none" />
      
      {/* Main Score Display */}
      <div className="relative z-10 flex flex-col items-center mb-8">
        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4">Master Score</h3>
        <div className="relative">
           {/* Simple Arc SVG or just big number for now as per "Hero" request */}
           <h1 className="text-[80px] leading-none font-black text-white tracking-tighter tabular-nums" style={{ fontFamily: '"Bebas Neue", "Impact", sans-serif' }}>
             {animatedScore}
             <span className="text-3xl text-zinc-600 ml-1">/100</span>
           </h1>
        </div>
        <div className={`mt-2 px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-widest ${
            score >= 80 ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
            score >= 60 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
            'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
            {score >= 80 ? 'Interview Ready' : score >= 60 ? 'Optimization Needed' : 'Critical Alignment Gaps'}
        </div>
      </div>

      {/* Sub Scores */}
      <div className="w-full grid grid-cols-2 gap-6 relative z-10">
        {[subScore1, subScore2].map((sub, i) => (
            <div key={i} className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    <span>{sub.label}</span>
                    <span className="text-white">{sub.value}%</span>
                </div>
                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${sub.value}%` }}
                        transition={{ duration: 1, delay: 0.5 + (i * 0.2) }}
                        className={`h-full rounded-full ${i === 0 ? 'bg-orange-500' : 'bg-zinc-500'}`}
                    />
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

const BulletList = ({ title, items, icon: Icon, color = "zinc" }: { title: string, items: string[], icon: any, color?: string }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-black text-white tracking-tight uppercase">{title}</h3>
      </div>
      <div className="grid gap-2">
        {items.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-start gap-3 p-3 bg-zinc-950/40 border border-white/5 rounded-xl hover:border-white/10 transition-colors group/item"
          >
            <div className={`mt-1.5 w-1 h-1 rounded-full bg-${color}-500 shrink-0 group-hover/item:scale-125 transition-transform`} />
            <p className="text-sm text-zinc-300 leading-relaxed font-medium">{item}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// --- PROGRESS INDICATOR (Exported for App.tsx) ---
export const AnalysisProgress = () => {
  const [steps, setSteps] = useState([
    { id: 1, label: "Scanning resume structure...", status: 'pending' },
    { id: 2, label: "Matching keywords against job description...", status: 'pending' },
    { id: 3, label: "Running AI optimization...", status: 'pending' },
    { id: 4, label: "Generating cover letter...", status: 'pending' },
    { id: 5, label: "Preparing interview questions...", status: 'pending' }
  ]);

  useEffect(() => {
    const timings = [500, 1500, 3000, 4500, 6000];

    timings.forEach((t, i) => {
      setTimeout(() => {
        setSteps(prev => prev.map((s, idx) => {
          if (idx < i) return { ...s, status: 'completed' };
          if (idx === i) return { ...s, status: 'active' };
          return s;
        }));
      }, t);
    });

    setTimeout(() => {
      setSteps(prev => prev.map(s => ({ ...s, status: 'completed' })));
    }, 7500);
  }, []);

  return (
    <div className="w-full max-w-md bg-[#111] p-6 rounded-sm border border-white/10 shadow-2xl mx-auto flex flex-col items-center justify-center min-h-[50vh]">
      <div className="mb-6 flex flex-col items-center">
        <Rocket className="w-8 h-8 text-orange-500 animate-bounce mb-2" />
        <h3 className="text-white font-black uppercase tracking-widest text-sm">Analyzing Profile</h3>
      </div>
      <div className="space-y-4 w-full">
        {steps.map((step, i) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.2 }}
            className="flex items-center gap-3"
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${step.status === 'completed' ? 'bg-green-500 border-green-500' :
              step.status === 'active' ? 'border-orange-500' : 'border-zinc-700'
              }`}>
              {step.status === 'completed' && <Check className="w-3 h-3 text-black" />}
              {step.status === 'active' && <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />}
            </div>
            <span className={`text-xs font-mono transition-colors ${step.status === 'completed' ? 'text-green-400' :
              step.status === 'active' ? 'text-white font-bold' : 'text-zinc-600'
              }`}>
              {step.label} {step.status === 'active' && '⟳'}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// --- EMAIL CAPTURE COMPONENT ---
const EmailCapture = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    // Fake API
    await new Promise(r => setTimeout(r, 1000));
    localStorage.setItem('userEmail', email);
    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    // Section removed
    return null;
  }

  return (
      // Section removed
      null
  );
};

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ result, onUpdateProfile, onNavigateTab, onReScan }) => {
  // --- PROFILE EDIT STATE ---
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState<ContactProfile>(result.contactProfile);

  const risksRef = React.useRef<HTMLDivElement>(null);

  const scrollToRisks = () => {
    risksRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    setEditProfileData(result.contactProfile);
  }, [result.contactProfile]);

  const handleSaveProfile = () => {
    if (onUpdateProfile) onUpdateProfile(editProfileData);
    setIsEditingProfile(false);
  };

  const handleCancelEdit = () => {
    setEditProfileData(result.contactProfile);
    setIsEditingProfile(false);
  };

  const VerificationWarning = () => {
    if (!result.verification || result.verification.isSafe) return null;

    return (
      <div className="mb-3 p-4 rounded-sm border border-red-500/30 bg-red-950/20 text-red-200 animate-pulse">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-2 w-full">
            <div>
              <h3 className="text-sm font-bold text-red-400">Truth Verification Alert</h3>
              <p className="text-xs text-red-300/80">
                Found {result.verification.fabricatedCount} potential hallucinations.
              </p>
            </div>
            <div className="space-y-1">
              {result.verification.checks.map((check, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px] font-mono bg-red-950/50 p-1.5 rounded-sm border border-red-900/30">
                  <span className="text-red-500 font-bold uppercase">{check.type}</span>
                  <span className="text-zinc-300 truncate max-w-[150px]">"{check.claim}"</span>
                  <span className="ml-auto text-red-400">Not in source</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };


  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setEditProfileData({ ...editProfileData, photo: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  // --- HELPERS ---
  const handleDownloadCSV = () => {
    const headers = ["Category", "Details"];
    const rows = [
      ["Job Title", result.jobTitle || "N/A"],
      ["Company", result.company || "N/A"],
      ["ATS Score", result.atsScore.toString()],
      ["Baseline ATS Score", baselineAts.toString()],
      ["Baseline Recruiter Score", baselineRecruiter.toString()],
      ["Job ATS Score", jobAts.toString()],
      ["Job Recruiter Score", jobRecruiter.toString()],
      ["ATS Delta", atsDelta.toString()],
      ["Recruiter Delta", recruiterDelta.toString()],
      ["Relevance Score", result.relevanceScore.toString()],
      ["Role Fit", `"${result.roleFitAnalysis.replace(/"/g, '""')}"`],
      ["Summary", `"${result.summary.replace(/"/g, '""')}"`],
      ["Missing Keywords", `"${result.missingKeywords.join(", ")}"`],
      ["Key Strengths", `"${result.keyStrengths.join(", ")}"`],
      ["Critical Issues", `"${result.criticalIssues.join(", ")}"`],
      ["Resume Languages", `"${resumeLanguages.join(", ")}"`],
      ["JD Required Languages", `"${requiredLanguages.join(", ")}"`],
      ["Language Match", requiredLanguages.length === 0 ? "Not specified" : (languageMatch.isMatch ? "Match" : `Missing: ${languageMatch.missing.join(", ")}`)]
    ];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `HireSchema_Analysis_${result.contactProfile.name || 'Report'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Convert paragraph text into bullet points for better readability
  const textToBullets = (text: string): string[] => {
    if (!text) return [];
    return text
      .split(/[.!?]\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 10)
      .map(s => s.endsWith('.') ? s : s + '.');
  };

  const summaryBullets = textToBullets(result.summary);
  const verdictBullets = textToBullets(result.roleFitAnalysis);

  const [copiedKeywords, setCopiedKeywords] = useState(false);

  const secondaryButtonClasses = "px-2 py-1 bg-transparent border border-white/20 rounded-sm text-xs font-black text-white hover:bg-white/5 transition-all";

  const normalizeLanguageToken = (value: string) => {
    return value
      .trim()
      .replace(/[\u2022•·]/g, ' ')
      .replace(/\(.*?\)/g, ' ')
      .replace(/\b(fluent|native|professional|working|basic|beginner|intermediate|advanced|proficient|bilingual|conversational)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  };

  const computeLanguageMatch = (required: string[], available: string[]) => {
    const requiredNorm = required.map(normalizeLanguageToken).filter(Boolean);
    const availableNorm = available.map(normalizeLanguageToken).filter(Boolean);
    const availableSet = new Set(availableNorm);
    const matched: string[] = [];
    const missing: string[] = [];
    for (let i = 0; i < requiredNorm.length; i += 1) {
      const req = requiredNorm[i];
      if (!req) continue;
      if (availableSet.has(req)) matched.push(required[i]);
      else missing.push(required[i]);
    }
    const isMatch = requiredNorm.length > 0 ? missing.length === 0 : true;
    return { matched, missing, isMatch };
  };

  const requiredLanguages = (result.requiredLanguages || []).filter(Boolean);
  const resumeLanguages = (result.languages || []).filter(Boolean);
  const languageMatch = result.languageMatch || computeLanguageMatch(requiredLanguages, resumeLanguages);
  const baselineAts = result.scoreComparison?.baseline.ats ?? result.atsScore;
  const baselineRecruiter = result.scoreComparison?.baseline.recruiter ?? (result.recruiterScore ?? result.dualScoring?.recruiter_score ?? 0);
  const jobAts = result.scoreComparison?.jobTarget.ats ?? (result.dualScoring?.ats_score ?? result.atsScore);
  const jobRecruiter = result.scoreComparison?.jobTarget.recruiter ?? (result.dualScoring?.recruiter_score ?? result.recruiterScore ?? 0);
  const atsDelta = result.scoreComparison?.delta.ats ?? (jobAts - baselineAts);
  const recruiterDelta = result.scoreComparison?.delta.recruiter ?? (jobRecruiter - baselineRecruiter);

  const copyKeywords = () => {
    navigator.clipboard.writeText(result.missingKeywords.join(", "));
    setCopiedKeywords(true);
    setTimeout(() => setCopiedKeywords(false), 2000);
  };

  // --- MAJOR ACTION LOGIC ---
  const getMajorActionState = () => {
    if (result.atsScore >= 80) return 'ready';
    if (result.relevanceScore >= 40) return 'needs_edit'; // Job aligned but ATS/resume issues
    return 'not_fit'; // Low relevance
  };

  const actionState = getMajorActionState();

  // --- STICKY ACTION BAR ---
  const StickyActionBar = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
      const handleScroll = () => {
        setIsVisible(window.scrollY > 300);
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-3xl bg-zinc-900/90 backdrop-blur-xl border border-white/10 shadow-2xl rounded-sm p-3 flex items-center justify-between z-50"
          >
            <div className="flex items-center gap-4 pl-2">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Master Score</span>
                <span className={`text-2xl font-black leading-none ${
                   result.atsScore >= 80 ? 'text-green-500' : 
                   result.atsScore >= 60 ? 'text-orange-500' : 'text-red-500'
                }`} style={{ fontFamily: '"Bebas Neue", "Impact", sans-serif' }}>
                  {result.atsScore}/100
                </span>
              </div>
              <div className="h-8 w-px bg-white/10 mx-2" />
              <div className="hidden sm:flex flex-col">
                <span className="text-[10px] font-bold text-zinc-400">Target Role</span>
                <span className="text-xs font-bold text-white max-w-[150px] truncate">
                   {formatOpportunityTitle(result.jobTitle, result.company)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => onReScan?.()}
                className="px-4 py-2 rounded-sm bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-black uppercase tracking-wide transition-colors border border-white/5"
              >
                Re-Scan
              </button>
              <button 
                onClick={() => onNavigateTab?.('generator')}
                className="px-6 py-2 rounded-sm bg-orange-600 hover:bg-orange-500 text-white text-xs font-black uppercase tracking-wide transition-colors shadow-lg shadow-orange-600/20 flex items-center gap-2"
              >
                Go to Editor <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-4 sm:py-6 flex flex-col gap-4 sm:gap-6 pb-32">
      <StickyActionBar />

      {/* --- HEADER: TARGET ROLE --- */}
      {(result.jobTitle || result.company) && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-900/40 border border-white/5 p-4 sm:p-6 rounded-sm shadow-xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-[60px] -mr-16 -mt-16" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Target Opportunity</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex flex-wrap items-center gap-x-2">
              {formatOpportunityTitle(result.jobTitle, result.company)}
              {result.company && (
                <>
                  <span className="text-zinc-700 mx-1">/</span>
                  <span className="text-orange-500">{result.company}</span>
                </>
              )}
            </h1>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <div className="px-4 py-2 bg-zinc-950/80 border border-white/10 rounded-sm flex items-center gap-4 backdrop-blur-xl shadow-inner">
              <div className="text-center">
                <span className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-1">Date</span>
                <span className="text-sm font-mono font-bold text-zinc-400">{new Date().toLocaleDateString()}</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="text-center">
                <span className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-1">Status</span>
                <div className="flex items-center gap-1.5 justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)] animate-pulse" />
                  <span className="text-sm font-bold text-orange-500 uppercase tracking-wider">Live</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* --- REORDERED ARCHITECTURE --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: HERO SCORE + BREAKDOWN + WARNINGS */}
        <div className="lg:col-span-7 flex flex-col gap-4">
            
            {/* 1. HERO SCORE GAUGE */}
            <ScoreGauge
              score={result.atsScore}
              subScore1={{ label: "ATS Compliance", value: result.atsScore }}
              subScore2={{ label: "Skill Density", value: result.relevanceScore }}
            />

            {/* 2. SCORE BREAKDOWN — why did you get this score */}
            {result.dualScoring?.ats_factors && result.dualScoring.ats_factors.length > 0 && (
              <div className="bg-zinc-900/40 border border-white/5 p-5 rounded-sm shadow-xl">
                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4 text-zinc-500" />
                  Why This Score
                </h3>
                <div className="space-y-3">
                  {result.dualScoring.ats_factors.map((f, i) => {
                    const earned = Math.round((f.score / 100) * f.weight);
                    const pct = Math.round(f.score);
                    const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-orange-500' : 'bg-red-500';
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-zinc-400">{f.factor}</span>
                          <span className="text-xs font-black text-white tabular-nums">
                            {earned}<span className="text-zinc-600">/{f.weight}</span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: i * 0.07 }}
                            className={`h-full rounded-full ${color}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Total ATS Score</span>
                  <span className={`text-sm font-black tabular-nums ${
                    result.atsScore >= 80 ? 'text-emerald-400' : result.atsScore >= 60 ? 'text-orange-400' : 'text-red-400'
                  }`}>{result.atsScore}/100</span>
                </div>
              </div>
            )}

            {/* 3. LOW ALIGNMENT WARNING (Conditional) */}
            {actionState === 'not_fit' && (
                <div className="p-4 rounded-sm border border-red-500/30 bg-red-950/40 shadow-[0_0_20px_rgba(220,38,38,0.2)] animate-pulse">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-black text-red-400 uppercase tracking-wide mb-1">Low Alignment Warning</h3>
                            <p className="text-xs text-red-200/80 font-medium leading-relaxed">
                                This role is a significant stretch based on your current resume. ATS parsers may auto-reject due to low keyword density. Proceed with caution.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. MISSION CRITICAL: NEXT STEPS */}
            <div className="bg-gradient-to-br from-orange-600/10 to-zinc-900 border border-orange-500/20 p-6 rounded-sm shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[60px] -mr-10 -mt-10" />
                
                <h2 className="text-lg font-black text-white tracking-tight mb-6 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-orange-500" /> Mission Critical
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                    {[
                        { title: "Skill Injection", desc: "Add missing keywords.", linkText: "GO TO EDITOR", onClick: () => onNavigateTab?.('generator'), priority: true },
                        { title: "Format Cleanup", desc: "Fix parsing risks.", linkText: "VIEW RISKS", onClick: () => onNavigateTab?.('generator') },
                        { title: "Story Alignment", desc: "Update summary.", linkText: "UPDATE BIO", onClick: () => onNavigateTab?.('generator') },
                        { title: "Final Validation", desc: "Hit 85%+ score.", linkText: "RE-SCAN", onClick: () => onReScan?.() },
                    ].map((step, i) => (
                        <div
                            key={i}
                            onClick={step.onClick}
                            className={`flex flex-col justify-between p-4 rounded-sm border transition-all cursor-pointer group/card min-h-[110px] ${
                                step.priority 
                                ? 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20' 
                                : 'bg-zinc-950/40 border-white/5 hover:border-white/20'
                            }`}
                        >
                            <div>
                                <h4 className={`text-sm font-black mb-1 ${step.priority ? 'text-orange-400' : 'text-white'}`}>{step.title}</h4>
                                <p className="text-xs text-zinc-400 font-medium">{step.desc}</p>
                            </div>
                            <div className="mt-3 flex items-center gap-2 text-[10px] font-black tracking-widest uppercase text-zinc-500 group-hover/card:text-white transition-colors">
                                {step.linkText} <ArrowRight className="w-3 h-3" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN: SKILL GAPS + PROFILE + NARRATIVE */}
        <div className="lg:col-span-5 flex flex-col gap-4">
            
            {/* 5. SKILL GAPS (High Visibility) */}
            <div className="bg-zinc-900/40 border border-white/5 p-5 rounded-sm shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-red-500" />
                        <h3 className="text-xs font-black text-white uppercase tracking-widest">Critical Skill Gaps</h3>
                    </div>
                    <button 
                        onClick={copyKeywords} 
                        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-black uppercase tracking-wider rounded-sm border border-white/10 transition-all hover:border-white/20 active:scale-95"
                    >
                        <Copy className="w-3 h-3" />
                        {copiedKeywords ? 'COPIED' : 'COPY LIST'}
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {result.missingKeywords.length > 0 ? (
                        result.missingKeywords.map((keyword, idx) => (
                            <motion.span 
                                key={idx}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                className="px-2.5 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-sm text-xs font-bold hover:bg-red-500/20 transition-colors cursor-default"
                            >
                                {keyword}
                            </motion.span>
                        ))
                    ) : (
                        <div className="w-full text-center py-4 text-emerald-500 text-sm font-bold bg-emerald-500/5 rounded-sm border border-emerald-500/10">
                            No critical gaps found.
                        </div>
                    )}
                </div>
            </div>

            {/* MATCHING SKILLS */}
            {(result.matchedKeywords ?? []).length > 0 && (
              <div className="bg-zinc-900/40 border border-white/5 p-5 rounded-sm shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Matching Skills</h3>
                  <span className="ml-auto text-[10px] font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    {(result.matchedKeywords ?? []).length} matched
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(result.matchedKeywords ?? []).map((keyword, idx) => (
                    <motion.span
                      key={idx}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.04 }}
                      className="px-2.5 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-sm text-xs font-bold hover:bg-emerald-500/20 transition-colors cursor-default"
                    >
                      {keyword}
                    </motion.span>
                  ))}
                </div>
              </div>
            )}

            {/* Profile Card (Simplified) */}
            <div className="bg-zinc-900/40 border border-white/5 p-5 rounded-sm shadow-xl">
                 <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-white/10">
                        {editProfileData.photo ? (
                            <img src={editProfileData.photo} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-5 h-5 text-zinc-500" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white">{result.contactProfile.name || "Candidate"}</h3>
                        <p className="text-xs text-zinc-500 font-medium">{result.contactProfile.email}</p>
                    </div>
                    <button onClick={() => setIsEditingProfile(true)} className="ml-auto p-2 hover:bg-white/5 rounded-sm text-zinc-500 hover:text-white transition-colors">
                        <Pencil className="w-4 h-4" />
                    </button>
                 </div>
                 {/* Narrative / Strategic Fit */}
                 <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    <BulletList title="Strategic Fit" items={verdictBullets} icon={Target} color="orange" />
                    <BulletList title="Key Strengths" items={result.keyStrengths} icon={Award} color="green" />
                 </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default AnalysisDashboard;
