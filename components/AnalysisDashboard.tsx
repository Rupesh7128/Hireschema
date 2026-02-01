
import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalysisResult, ContactProfile } from '../types';
import { 
  AlertTriangle, CheckCircle, Target, FileSearch, TrendingUp, Download, 
  ShieldAlert, Info, User, BrainCircuit, Globe, Briefcase, DollarSign, 
  Pencil, X, Check, Camera, Mail, Phone, Linkedin, MapPin, 
  ChevronRight, AlertCircle, Zap, ShieldCheck, ListChecks, Award,
  Copy, ExternalLink, Sparkles, Rocket
} from 'lucide-react';

interface AnalysisDashboardProps {
  result: AnalysisResult;
  onUpdateProfile?: (profile: ContactProfile) => void;
}

const ScoreRing = ({ value, label, icon: Icon, color = "orange", subtext }: { value: number, label: string, icon: any, color?: string, subtext?: string }) => {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  
  return (
    <div className="flex items-center gap-5 bg-zinc-900/40 border border-white/5 p-5 rounded-[2rem] hover:border-white/10 transition-all group">
      <div className="relative w-20 h-20 shrink-0">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="40"
            cy="40"
            r={radius}
            stroke="currentColor"
            strokeWidth="5"
            fill="transparent"
            className="text-zinc-800"
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            stroke="currentColor"
            strokeWidth="5"
            fill="transparent"
            strokeDasharray={circumference}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            className={`text-${color}-500 transition-all duration-1000 ease-out`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-black text-white leading-none">{value}%</span>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <Icon className={`w-4 h-4 text-${color}-500`} />
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{label}</h3>
        </div>
        <p className="text-sm text-white font-bold mb-0.5">
          {value >= 80 ? "Interview Ready" : value >= 60 ? "Strong Potential" : "Critical Gaps"}
        </p>
        <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{subtext || "Target: 85%+"}</p>
      </div>
    </div>
  );
};

const BulletList = ({ title, items, icon: Icon, color = "zinc" }: { title: string, items: string[], icon: any, color?: string }) => {
  if (!items || items.length === 0) return null;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-${color}-500/10 text-${color}-500`}>
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-black text-white tracking-tight uppercase">{title}</h3>
      </div>
      <div className="grid gap-3">
        {items.map((item, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-start gap-4 p-4 bg-zinc-950/40 border border-white/5 rounded-2xl hover:border-white/10 transition-colors group/item"
          >
            <div className={`mt-2 w-1.5 h-1.5 rounded-full bg-${color}-500 shrink-0 group-hover/item:scale-125 transition-transform`} />
            <p className="text-sm text-zinc-300 leading-relaxed font-medium">{item}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ result, onUpdateProfile }) => {
  // --- PROFILE EDIT STATE ---
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState<ContactProfile>(result.contactProfile);

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
      ["Languages", `"${(result.languages || []).join(", ")}"`]
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

  const copyKeywords = () => {
    navigator.clipboard.writeText(result.missingKeywords.join(", "));
    setCopiedKeywords(true);
    setTimeout(() => setCopiedKeywords(false), 2000);
  };

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-12">
      
      {/* --- HEADER: TARGET ROLE --- */}
      {(result.jobTitle || result.company) && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-zinc-950/50 border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[100px] -mr-32 -mt-32" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-1.5 bg-orange-500/10 rounded-lg">
                <Briefcase className="w-4 h-4 text-orange-500" />
              </div>
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Target Opportunity</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight flex flex-wrap items-center gap-x-3">
              {result.jobTitle || "Target Role"}
              {result.company && (
                <>
                  <ChevronRight className="w-6 h-6 text-zinc-700" />
                  <span className="text-orange-500">{result.company}</span>
                </>
              )}
            </h1>
          </div>
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="px-6 py-3 bg-zinc-900/50 border border-white/5 rounded-2xl flex items-center gap-6 backdrop-blur-xl">
              <div className="text-center">
                <span className="block text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Analysis Date</span>
                <span className="text-xs font-mono font-bold text-zinc-400">{new Date().toLocaleDateString()}</span>
              </div>
              <div className="w-px h-8 bg-white/5" />
              <div className="text-center">
                <span className="block text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Status</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-bold text-green-500 uppercase">Live Report</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* --- TOP ROW: PROFILE & SCORES --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Profile Card */}
        <div className="lg:col-span-5 bg-zinc-900/40 border border-white/5 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-24 h-24 rounded-3xl bg-zinc-800 border-2 border-zinc-700/50 flex items-center justify-center shrink-0 overflow-hidden relative shadow-2xl group/photo">
              {editProfileData.photo ? (
                <img src={editProfileData.photo} alt="Profile" className="w-full h-full object-cover transition-transform group-hover/photo:scale-110" />
              ) : (
                <User className="w-12 h-12 text-zinc-600" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              {isEditingProfile ? (
                <div className="space-y-3">
                  <input 
                    value={editProfileData.name} 
                    onChange={e => setEditProfileData({...editProfileData, name: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-white font-bold focus:border-orange-500/50 transition-colors"
                    placeholder="Full Name"
                  />
                  <div className="grid grid-cols-1 gap-2">
                    <input 
                      value={editProfileData.email} 
                      onChange={e => setEditProfileData({...editProfileData, email: e.target.value})}
                      className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-300"
                      placeholder="Email"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                    {result.contactProfile.name || "Candidate"}
                    <button onClick={() => setIsEditingProfile(true)} className="p-2 hover:bg-orange-500/10 rounded-xl text-zinc-600 hover:text-orange-500 transition-all">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </h2>
                  <div className="flex flex-col gap-1.5">
                    {result.contactProfile.email && (
                      <div className="flex items-center gap-2.5 text-xs text-zinc-500 font-bold group/info">
                        <Mail className="w-3.5 h-3.5 text-zinc-700 group-hover/info:text-orange-500 transition-colors" />
                        {result.contactProfile.email}
                      </div>
                    )}
                    {result.contactProfile.location && (
                      <div className="flex items-center gap-2.5 text-xs text-zinc-500 font-bold group/info">
                        <MapPin className="w-3.5 h-3.5 text-zinc-700 group-hover/info:text-orange-500 transition-colors" />
                        {result.contactProfile.location}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-8 flex items-center justify-between pt-6 border-t border-white/5 relative z-10">
            <div className="flex gap-3">
              {isEditingProfile ? (
                <>
                  <button onClick={handleSaveProfile} className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-black rounded-xl transition-all shadow-xl shadow-orange-900/20 flex items-center gap-2"><Check className="w-4 h-4" /> Save</button>
                  <button onClick={handleCancelEdit} className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-black rounded-xl transition-all">Cancel</button>
                </>
              ) : (
                <button 
                  onClick={handleDownloadCSV}
                  className="px-5 py-2.5 bg-zinc-800/50 hover:bg-zinc-800 border border-white/5 rounded-xl text-xs font-black text-zinc-400 hover:text-white transition-all flex items-center gap-2 group"
                >
                  <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" /> Export Report
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {result.languages && result.languages.slice(0, 2).map((l, i) => (
                <div key={i} className="px-2.5 py-1 bg-zinc-950/50 border border-white/5 rounded-lg text-[10px] text-zinc-500 font-black uppercase tracking-wider">{l}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Scores Grid */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
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
          
          {/* Main Verdict: Job Seeker First */}
          <div className="p-8 bg-zinc-900/40 border border-white/5 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-48 h-48 blur-[80px] -mr-24 -mt-24 opacity-30 ${result.atsScore >= 70 ? 'bg-green-500' : 'bg-orange-500'}`} />
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className={`p-4 rounded-3xl ${result.atsScore >= 70 ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500 shadow-2xl shadow-orange-500/10'}`}>
                  {result.atsScore >= 70 ? <Sparkles className="w-10 h-10" /> : <ShieldAlert className="w-10 h-10" />}
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-1.5">Master Verdict</h4>
                  <div className="flex flex-col">
                    <p className="text-2xl font-black text-white leading-tight">{result.atsScore >= 70 ? 'Interview Candidate' : 'Optimization Required'}</p>
                    <p className="text-sm text-zinc-500 font-bold mt-1">
                      {result.atsScore >= 80 ? "Your profile matches top-tier requirements." : 
                       result.atsScore >= 60 ? "Strong base, but missing critical identifiers." : 
                       "Significant gaps detected for this specific role."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-10 w-full md:w-auto px-8 py-4 bg-zinc-950/50 rounded-3xl border border-white/5 backdrop-blur-xl">
                <div className="text-center">
                  <span className="block text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1.5">Likelihood</span>
                  <span className={`text-xl font-black ${result.atsScore >= 80 ? 'text-green-500' : result.atsScore >= 60 ? 'text-orange-400' : 'text-orange-600'}`}>
                    {result.atsScore >= 80 ? 'HIGH' : result.atsScore >= 60 ? 'MEDIUM' : 'LOW'}
                  </span>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div className="text-center">
                  <span className="block text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1.5">Impact Issues</span>
                  <div className="flex items-center justify-center gap-2">
                    <span className={`text-xl font-black ${result.criticalIssues.length > 0 ? 'text-orange-500' : 'text-green-500'}`}>{result.criticalIssues.length + result.missingKeywords.length}</span>
                    <AlertTriangle className={`w-4 h-4 ${result.criticalIssues.length > 0 ? 'text-orange-500' : 'text-zinc-800'}`} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- STRATEGIC ROADMAP: THE "HOW TO FIX" SECTION --- */}
      <div className="bg-gradient-to-br from-orange-600/10 to-transparent border border-orange-500/20 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
        <div className="flex flex-col lg:flex-row gap-12 items-center">
          <div className="lg:w-[40%]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-500 rounded-xl shadow-lg shadow-orange-500/20">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight italic">Mission Critical: Next Steps</h2>
            </div>
            <p className="text-base text-zinc-400 leading-relaxed mb-8 font-medium">
              We've identified the fastest path to an interview. Focus on these <span className="text-white font-black underline decoration-orange-500 underline-offset-4">4 key areas</span> to transform your application.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-zinc-950/60 rounded-2xl border border-white/5 hover:border-orange-500/30 transition-all">
                <h4 className="text-[10px] font-black text-zinc-500 uppercase mb-2 tracking-widest">Priority</h4>
                <p className="text-sm text-white font-black">Fix Gaps</p>
              </div>
              <div className="p-5 bg-zinc-950/60 rounded-2xl border border-white/5 hover:border-orange-500/30 transition-all">
                <h4 className="text-[10px] font-black text-zinc-500 uppercase mb-2 tracking-widest">Est. Time</h4>
                <p className="text-sm text-white font-black">~12 Mins</p>
              </div>
            </div>
          </div>
          
          <div className="lg:w-[60%] grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { title: "Skill Injection", desc: "Embed the top 3 missing keywords into your bullet points.", icon: Target, action: "Go to Editor" },
              { title: "Format Cleanup", desc: "Remove identified risks to ensure 100% ATS readability.", icon: ShieldAlert, action: "View Risks" },
              { title: "Story Alignment", desc: "Sync your summary with the Role Fit analysis below.", icon: User, action: "Update Bio" },
              { title: "Final Validation", desc: "Re-run analysis to hit the 85% golden score.", icon: Download, action: "Re-Scan" },
            ].map((step, i) => (
              <div key={i} className="flex flex-col gap-4 p-6 bg-zinc-900/60 border border-white/5 rounded-3xl hover:bg-zinc-900/80 transition-all cursor-default group/card relative">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center shrink-0 group-hover/card:bg-orange-500/20 transition-colors">
                    <step.icon className="w-6 h-6 text-orange-500" />
                  </div>
                  <h4 className="text-base font-black text-white">{step.title}</h4>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed font-medium">{step.desc}</p>
                <div className="flex items-center gap-1.5 text-[10px] font-black text-orange-500 uppercase tracking-widest mt-2 group-hover/card:gap-2.5 transition-all">
                  {step.action} <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- DETAILED DIAGNOSTICS: THE "WHY" SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Gap Analysis & Risks (Right for Job Seeker to see first) */}
        <div className="lg:col-span-5 space-y-8 lg:order-2">
          
          {/* Missing Keywords / Gaps */}
          <div className="bg-zinc-900/40 border border-white/5 p-8 rounded-[3rem] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl -mr-16 -mt-16" />
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Zap className="w-5 h-5 text-orange-500" />
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">The Skill Gap</h3>
              </div>
              <button 
                onClick={copyKeywords}
                className="px-3 py-1.5 bg-zinc-950 border border-white/10 rounded-xl text-[10px] font-black text-zinc-400 hover:text-white hover:border-orange-500/50 transition-all flex items-center gap-2"
              >
                {copiedKeywords ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                {copiedKeywords ? "COPIED" : "COPY ALL"}
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2.5 mb-8">
              {result.missingKeywords.length > 0 ? (
                result.missingKeywords.map((keyword, idx) => (
                  <span key={idx} className="px-4 py-2 bg-orange-500/5 text-orange-500 border border-orange-500/20 rounded-2xl text-xs font-black tracking-tight hover:bg-orange-500/10 transition-colors cursor-default">
                    {keyword}
                  </span>
                ))
              ) : (
                <div className="flex items-center gap-3 text-zinc-500 text-sm font-bold bg-zinc-950/50 p-4 rounded-2xl w-full border border-green-500/20">
                  <CheckCircle className="w-5 h-5 text-green-500" /> 100% Keyword Match Found
                </div>
              )}
            </div>
            
            <div className="p-4 bg-zinc-950/50 rounded-2xl border border-white/5 flex gap-4 items-start">
              <Info className="w-5 h-5 text-zinc-700 shrink-0 mt-0.5" />
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                <span className="text-zinc-300 font-bold">Pro Tip:</span> Sprinkle these into your <span className="text-white">Summary</span> and <span className="text-white">Experience</span> sections. Don't just list them; show how you used them.
              </p>
            </div>
          </div>

          {/* Critical Risks / Issues */}
          <div className="bg-zinc-900/40 border border-white/5 p-8 rounded-[3rem] shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <ShieldAlert className="w-5 h-5 text-orange-500" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Technical Risks</h3>
            </div>
            <div className="space-y-4">
              {result.criticalIssues.length > 0 ? (
                result.criticalIssues.map((issue, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 bg-red-500/5 border border-red-500/10 rounded-2xl group/risk hover:bg-red-500/10 transition-all">
                    <div className="mt-1 p-1 bg-red-500/20 rounded-md">
                      <AlertTriangle className="w-3 h-3 text-orange-500" />
                    </div>
                    <span className="text-sm text-zinc-300 leading-snug font-bold">{issue}</span>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-3 text-zinc-500 text-sm font-bold bg-zinc-950/50 p-4 rounded-2xl border border-green-500/20">
                  <CheckCircle className="w-5 h-5 text-green-500" /> Clean Formatting - ATS Optimized
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Deep Analysis Column (Left for detailed reading) */}
        <div className="lg:col-span-7 space-y-8 lg:order-1">
          <div className="bg-zinc-900/40 border border-white/5 p-10 rounded-[3rem] shadow-xl relative overflow-hidden min-h-full">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-zinc-800/10 blur-[120px] -mr-48 -mt-48" />
            <div className="relative z-10 space-y-12">
              <BulletList 
                title="Strategic Role Fit" 
                items={verdictBullets} 
                icon={Target} 
                color="orange" 
              />
              <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <BulletList 
                title="Marketable Strengths" 
                items={result.keyStrengths} 
                icon={Award} 
                color="orange" 
              />
              <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
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
