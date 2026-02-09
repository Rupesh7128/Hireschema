
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

const ScoreRing = ({ value, label, icon: Icon, color = "orange", subtext }: { value: number, label: string, icon: any, color?: string, subtext?: string }) => {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  
  return (
    <div className="flex items-center gap-4 bg-zinc-900/40 border border-white/5 p-4 rounded-2xl hover:border-white/10 transition-all group">
      <div className="relative w-16 h-16 shrink-0">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="32"
            cy="32"
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            className="text-zinc-800"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={circumference}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            className={`text-${color}-500 transition-all duration-1000 ease-out`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-black text-white leading-none">{value}%</span>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-0.5">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{label}</h3>
        </div>
        <p className="text-sm text-white font-bold mb-0.5">
          {value >= 80 ? "Interview Ready" : value >= 60 ? "Strong Potential" : "Critical Gaps"}
        </p>
        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{subtext || "Target: 85%+"}</p>
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

  const secondaryButtonClasses = "px-2 py-1 bg-transparent border border-white/20 rounded-md text-xs font-black text-white hover:bg-white/5 transition-all";

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

  return (
    <div className="container mx-auto max-w-4xl px-4 py-4 sm:py-6 flex flex-col gap-4 sm:gap-6">
      
      {/* --- HEADER: TARGET ROLE --- */}
      {(result.jobTitle || result.company) && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-900/40 border border-white/5 p-4 sm:p-6 rounded-2xl shadow-xl relative overflow-hidden"
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
            <div className="px-4 py-2 bg-zinc-950/80 border border-white/10 rounded-xl flex items-center gap-4 backdrop-blur-xl shadow-inner">
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

      {/* --- TOP ROW: PROFILE & SCORES --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* Profile Card */}
        <div className="lg:col-span-5 bg-zinc-900/40 border border-white/5 p-4 rounded-2xl shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex items-center gap-3">
            <div 
              className="w-14 h-14 rounded-xl bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0 overflow-hidden relative shadow-lg group/photo cursor-pointer"
              onClick={() => document.getElementById('photo-upload')?.click()}
            >
              <input 
                type="file" 
                id="photo-upload" 
                className="hidden" 
                accept="image/*"
                onChange={handlePhotoUpload}
              />
              {editProfileData.photo ? (
                <img src={editProfileData.photo} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-zinc-600" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-3 h-3 text-white" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              {isEditingProfile ? (
                <div className="space-y-1.5">
                  <input 
                    value={editProfileData.name} 
                    onChange={e => setEditProfileData({...editProfileData, name: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-2 py-1 text-sm text-white font-bold focus:border-orange-500/50 outline-none"
                    placeholder="Full Name"
                  />
                  <input
                    value={editProfileData.email}
                    onChange={e => setEditProfileData({ ...editProfileData, email: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-2 py-1 text-sm text-white font-bold focus:border-orange-500/50 outline-none"
                    placeholder="Email"
                  />
                  <input
                    value={editProfileData.phone}
                    onChange={e => setEditProfileData({ ...editProfileData, phone: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-2 py-1 text-sm text-white font-bold focus:border-orange-500/50 outline-none"
                    placeholder="Phone"
                  />
                  <input
                    value={editProfileData.linkedin}
                    onChange={e => setEditProfileData({ ...editProfileData, linkedin: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-2 py-1 text-sm text-white font-bold focus:border-orange-500/50 outline-none"
                    placeholder="LinkedIn URL"
                  />
                  <input
                    value={editProfileData.location}
                    onChange={e => setEditProfileData({ ...editProfileData, location: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-2 py-1 text-sm text-white font-bold focus:border-orange-500/50 outline-none"
                    placeholder="Location"
                  />
                </div>
              ) : (
                <div className="space-y-0.5">
                  <h2 className="text-base font-black text-white tracking-tight flex items-center gap-1.5">
                    {result.contactProfile.name || "Candidate"}
                    <button onClick={() => setIsEditingProfile(true)} className="p-1 hover:bg-white/5 rounded-md text-zinc-500 hover:text-white transition-all">
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                  </h2>
                  <div className="flex flex-col gap-0.5">
                    {result.contactProfile.email && (
                      <div className="flex items-center gap-1.5 text-sm text-zinc-500 font-bold">
                        <Mail className="w-2.5 h-2.5 text-zinc-700" />
                        {result.contactProfile.email}
                      </div>
                    )}
                    {result.contactProfile.phone && (
                      <div className="flex items-center gap-1.5 text-sm text-zinc-500 font-bold">
                        <Phone className="w-2.5 h-2.5 text-zinc-700" />
                        {result.contactProfile.phone}
                      </div>
                    )}
                    {result.contactProfile.linkedin && (
                      <div className="flex items-center gap-1.5 text-sm text-zinc-500 font-bold">
                        <Linkedin className="w-2.5 h-2.5 text-zinc-700" />
                        {result.contactProfile.linkedin}
                      </div>
                    )}
                    {result.contactProfile.location && (
                      <div className="flex items-center gap-1.5 text-sm text-zinc-500 font-bold">
                        <MapPin className="w-2.5 h-2.5 text-zinc-700" />
                        {result.contactProfile.location}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/5 relative z-10">
            <div className="flex gap-1.5">
              {isEditingProfile ? (
                <>
                  <button onClick={handleSaveProfile} className="px-2 py-1 bg-orange-600 hover:bg-orange-500 text-white text-xs font-black rounded-md transition-all flex items-center gap-1">Save</button>
                  <button onClick={handleCancelEdit} className={secondaryButtonClasses}>Cancel</button>
                </>
              ) : (
                <button 
                  onClick={handleDownloadCSV}
                  className={secondaryButtonClasses + " flex items-center gap-1"}
                >
                  <Download className="w-2.5 h-2.5" /> Export
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Scores Grid */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            <ScoreRing 
              value={result.atsScore} 
              label="ATS Compliance" 
              icon={ShieldCheck}
              color="orange"
              subtext="Parsing Accuracy"
            />
            <ScoreRing 
              value={result.relevanceScore} 
              label="Skill Density" 
              icon={BrainCircuit}
              color="orange"
              subtext="Keyword Weighting"
            />
          </div>
          
          {/* Main Verdict */}
          <div className="p-5 bg-zinc-900/60 border border-white/10 rounded-2xl shadow-xl relative overflow-hidden group">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1">Master Verdict</h4>
                <p className="text-xl font-black text-white leading-tight">{result.atsScore >= 70 ? 'Interview Candidate' : 'Optimization Required'}</p>
              </div>

              <div className="flex items-center gap-6 px-5 py-2.5 bg-zinc-950/80 rounded-xl border border-white/10 backdrop-blur-xl shadow-inner">
                <div className="text-center">
                  <span className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Likelihood</span>
                  <span className={`text-sm font-black tracking-tight ${result.atsScore >= 80 ? 'text-white' : result.atsScore >= 60 ? 'text-orange-400' : 'text-orange-600'}`}>
                    {result.atsScore >= 80 ? 'HIGH' : result.atsScore >= 60 ? 'MEDIUM' : 'LOW'}
                  </span>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <span className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Impact Issues</span>
                  <span className={`text-sm font-black ${result.criticalIssues.length > 0 ? 'text-orange-500' : 'text-white'}`}>{result.criticalIssues.length + result.missingKeywords.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- MAJOR ACTION CARD --- */}
      <div className={`p-6 rounded-2xl border shadow-xl relative overflow-hidden transition-all ${
        actionState === 'ready' 
          ? 'bg-emerald-950/40 border-emerald-500/20 shadow-emerald-900/10' 
          : actionState === 'needs_edit'
            ? 'bg-orange-950/40 border-orange-500/20 shadow-orange-900/10'
            : 'bg-red-950/40 border-red-500/20 shadow-red-900/10'
      }`}>
        <div className={`absolute top-0 right-0 w-64 h-64 blur-[80px] -mr-20 -mt-20 opacity-20 pointer-events-none ${
          actionState === 'ready' ? 'bg-emerald-500' : actionState === 'needs_edit' ? 'bg-orange-500' : 'bg-red-500'
        }`} />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              {actionState === 'ready' ? (
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              ) : actionState === 'needs_edit' ? (
                <Sparkles className="w-5 h-5 text-orange-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              )}
              <h2 className={`text-lg font-black tracking-tight uppercase ${
                actionState === 'ready' ? 'text-emerald-400' : actionState === 'needs_edit' ? 'text-orange-400' : 'text-red-400'
              }`}>
                {actionState === 'ready' ? 'Ready to Apply' : actionState === 'needs_edit' ? 'Optimization Needed' : 'Low Alignment'}
              </h2>
            </div>
            <p className="text-zinc-300 font-medium leading-relaxed max-w-2xl">
              {actionState === 'ready' 
                ? "Your resume is ATS-optimized and aligned with this job description. You're good to go!" 
                : actionState === 'needs_edit'
                  ? "Great news: Your experience matches the job! However, your resume formatting is blocking your ATS score. Let's fix that."
                  : "This role seems to be a stretch based on your current resume. You can still proceed, but we recommend tailoring your experience further."
              }
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
            {actionState === 'ready' ? (
              <>
                <button 
                  onClick={() => onNavigateTab?.('generator')}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2"
                >
                  <FileSearch className="w-4 h-4" /> Generate Cover Letter
                </button>
                <button 
                  onClick={() => onNavigateTab?.('generator')}
                  className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-black rounded-xl border border-white/5 transition-all flex items-center gap-2"
                >
                  <BrainCircuit className="w-4 h-4" /> Interview Prep
                </button>
              </>
            ) : actionState === 'needs_edit' ? (
              <>
                <button 
                  onClick={() => onNavigateTab?.('generator')}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-xl shadow-lg shadow-orange-900/20 transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Generate ATS Resume
                </button>
                <button 
                  onClick={scrollToRisks}
                  className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-black rounded-xl border border-white/5 transition-all flex items-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4" /> View Issues
                </button>
              </>
            ) : (
              <button 
                onClick={() => onNavigateTab?.('generator')}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl shadow-lg shadow-red-900/20 transition-all flex items-center gap-2"
              >
                <Rocket className="w-4 h-4" /> Proceed Anyway
              </button>
            )}
          </div>
        </div>
      </div>

      {/* --- STRATEGIC ROADMAP --- */}
      <div className="bg-gradient-to-br from-orange-600/5 to-transparent border border-orange-500/10 p-5 sm:p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-6 items-center">
          <div className="lg:w-[30%]">
            <h2 className="text-lg font-black text-white tracking-tight mb-1">Mission Critical: Next Steps</h2>
            <p className="text-sm text-zinc-500 leading-relaxed mb-4 font-medium">
              We've identified the fastest path to an interview. Focus on these <span className="text-orange-500 font-black underline underline-offset-4 decoration-2">4 key areas</span> to transform your application.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-zinc-950/60 rounded-lg border border-white/5 text-center">
                <h4 className="text-xs font-black text-zinc-600 uppercase mb-0.5 tracking-widest">Priority</h4>
                <p className="text-sm text-white font-black">Fix Gaps</p>
              </div>
              <div className="p-2 bg-zinc-950/60 rounded-lg border border-white/5 text-center">
                <h4 className="text-xs font-black text-zinc-600 uppercase mb-0.5 tracking-widest">Est. Time</h4>
                <p className="text-sm text-white font-black">~12 Mins</p>
              </div>
            </div>
          </div>
          
          <div className="lg:w-[70%] grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { title: "Skill Injection", desc: "Embed the top 3 missing keywords into your bullet points.", linkText: "GO TO EDITOR", onClick: () => onNavigateTab?.('generator') },
              { title: "Format Cleanup", desc: "Remove identified risks to ensure 100% ATS readability.", linkText: "VIEW RISKS", onClick: () => onNavigateTab?.('generator') },
              { title: "Story Alignment", desc: "Sync your summary with the Role Fit analysis below.", linkText: "UPDATE BIO", onClick: () => onNavigateTab?.('generator') },
              { title: "Final Validation", desc: "Re-run analysis to hit the 85% golden score.", linkText: "RE-SCAN", onClick: () => onReScan?.() },
            ].map((step, i) => (
              <div 
                key={i} 
                onClick={step.onClick}
                className="flex flex-col justify-between p-4 bg-zinc-950/40 border border-white/5 rounded-2xl hover:border-orange-500/30 transition-all cursor-pointer group/card min-h-[120px]"
              >
                <div>
                  <h4 className="text-sm font-black text-white mb-1.5">{step.title}</h4>
                  <p className="text-sm text-zinc-500 leading-relaxed font-medium">{step.desc}</p>
                </div>
                <div className="mt-4 flex items-center gap-2 text-orange-500 font-black text-xs tracking-widest uppercase">
                  {step.linkText} <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- DETAILED DIAGNOSTICS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        <div className="lg:col-span-5 space-y-4 lg:order-2">
          {/* Missing Keywords */}
          <div className="bg-zinc-900/40 border border-white/5 p-4 rounded-2xl shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 blur-[40px] -mr-10 -mt-10 transition-opacity group-hover:opacity-100 opacity-50" />
            <div className="flex items-center justify-between gap-3 mb-4 relative z-10">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-orange-500" />
                <h3 className="text-xs font-black text-white uppercase tracking-widest">The Skill Gap</h3>
              </div>
              <button 
                onClick={copyKeywords}
                className={secondaryButtonClasses}
              >
                {copiedKeywords ? 'COPIED' : 'COPY LIST'}
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-2 relative z-10">
              {result.missingKeywords.length > 0 ? (
                result.missingKeywords.map((keyword, idx) => (
                  <span key={idx} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-950/50 text-orange-400 border border-orange-500/20 rounded-lg text-xs font-bold tracking-tight hover:bg-orange-500/10 transition-colors cursor-default">
                    <X className="w-3 h-3 text-orange-500/70" />
                    {keyword}
                  </span>
                ))
              ) : (
                <div className="text-emerald-400 text-sm font-bold bg-emerald-500/10 p-3 rounded-xl w-full border border-emerald-500/20 text-center flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  100% Keyword Match
                </div>
              )}
            </div>
          </div>

          {/* Language Match */}
          <div className="bg-zinc-900/40 border border-white/5 p-4 rounded-2xl shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-xs font-black text-white uppercase tracking-widest">Language Check</h3>
              <div className="flex items-center gap-2">
                {requiredLanguages.length === 0 ? (
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Not specified</span>
                ) : languageMatch.isMatch ? (
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Match</span>
                ) : (
                  <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Missing</span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">JD Required</p>
                <div className="flex flex-wrap gap-1.5">
                  {requiredLanguages.length > 0 ? (
                    requiredLanguages.map((lang, idx) => (
                      <span key={`${lang}-${idx}`} className="px-2 py-1 bg-white/5 text-white border border-white/10 rounded-lg text-sm font-black tracking-tight">
                        {lang}
                      </span>
                    ))
                  ) : (
                    <div className="text-zinc-600 text-sm font-bold bg-zinc-950/50 p-2 rounded-lg w-full border border-white/5 text-center">
                      No language requirement found
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">Resume Languages</p>
                <div className="flex flex-wrap gap-1.5">
                  {resumeLanguages.length > 0 ? (
                    resumeLanguages.map((lang, idx) => (
                      <span key={`${lang}-${idx}`} className="px-2 py-1 bg-zinc-950/40 text-zinc-300 border border-white/5 rounded-lg text-sm font-black tracking-tight">
                        {lang}
                      </span>
                    ))
                  ) : (
                    <div className="text-zinc-600 text-sm font-bold bg-zinc-950/50 p-2 rounded-lg w-full border border-white/5 text-center">
                      No languages detected in resume
                    </div>
                  )}
                </div>
              </div>

              {requiredLanguages.length > 0 && !languageMatch.isMatch && languageMatch.missing.length > 0 && (
                <div className="p-2 bg-orange-500/5 border border-orange-500/10 rounded-lg">
                  <span className="text-sm text-zinc-400 leading-snug font-bold">
                    Missing: {languageMatch.missing.join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Technical Risks */}
          <div ref={risksRef} className="bg-zinc-900/40 border border-white/5 p-4 rounded-2xl shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-4 h-4 text-orange-500" />
              <h3 className="text-xs font-black text-white uppercase tracking-widest">Critical Risks</h3>
            </div>
            <div className="space-y-2.5">
              {result.criticalIssues.length > 0 ? (
                result.criticalIssues.map((issue, idx) => (
                  <div key={idx} className="flex gap-3 p-3 bg-red-500/5 border border-red-500/10 rounded-xl hover:bg-red-500/10 transition-colors group">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span className="text-xs text-zinc-300 leading-relaxed font-medium">{issue}</span>
                  </div>
                ))
              ) : (
                <div className="text-emerald-400 text-sm font-bold bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-center flex items-center justify-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Clean Formatting
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Deep Analysis Column */}
        <div className="lg:col-span-7 space-y-4 lg:order-1">
          <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-2xl shadow-xl min-h-full">
            <div className="space-y-6">
              <BulletList 
                title="Strategic Role Fit" 
                items={verdictBullets} 
                icon={Target} 
                color="orange" 
              />
              <div className="h-px bg-white/5" />
              <BulletList 
                title="Marketable Strengths" 
                items={result.keyStrengths} 
                icon={Award} 
                color="orange" 
              />
              <div className="h-px bg-white/5" />
              <BulletList 
                title="Profile Narrative" 
                items={summaryBullets} 
                icon={TrendingUp} 
                color="zinc" 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisDashboard;
