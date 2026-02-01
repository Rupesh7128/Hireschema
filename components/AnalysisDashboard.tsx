
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
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{label}</h3>
        </div>
        <p className="text-xs text-white font-bold mb-0.5">
          {value >= 80 ? "Interview Ready" : value >= 60 ? "Strong Potential" : "Critical Gaps"}
        </p>
        <p className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">{subtext || "Target: 85%+"}</p>
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
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Target Opportunity</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex flex-wrap items-center gap-x-2">
              {result.jobTitle || "Target Role"}
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
                <span className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Date</span>
                <span className="text-[11px] font-mono font-bold text-zinc-400">{new Date().toLocaleDateString()}</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="text-center">
                <span className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Status</span>
                <div className="flex items-center gap-1.5 justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)] animate-pulse" />
                  <span className="text-[11px] font-bold text-orange-500 uppercase tracking-wider">Live</span>
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
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-2 py-1 text-[10px] text-white font-bold focus:border-orange-500/50 outline-none"
                    placeholder="Full Name"
                  />
                </div>
              ) : (
                <div className="space-y-0.5">
                  <h2 className="text-base font-black text-white tracking-tight flex items-center gap-1.5">
                    {result.contactProfile.name || "Candidate"}
                    <button onClick={() => setIsEditingProfile(true)} className="p-1 hover:bg-orange-500/10 rounded-md text-zinc-600 hover:text-orange-500 transition-all">
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                  </h2>
                  <div className="flex flex-col gap-0.5">
                    {result.contactProfile.email && (
                      <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 font-bold">
                        <Mail className="w-2.5 h-2.5 text-zinc-700" />
                        {result.contactProfile.email}
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
                  <button onClick={handleSaveProfile} className="px-2 py-1 bg-orange-600 hover:bg-orange-500 text-white text-[9px] font-black rounded-md transition-all flex items-center gap-1">Save</button>
                  <button onClick={handleCancelEdit} className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-500 text-[9px] font-black rounded-md transition-all">Cancel</button>
                </>
              ) : (
                <button 
                  onClick={handleDownloadCSV}
                  className="px-2 py-1 bg-zinc-800/50 hover:bg-zinc-800 border border-white/5 rounded-md text-[9px] font-black text-zinc-500 hover:text-white transition-all flex items-center gap-1"
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

      {/* --- STRATEGIC ROADMAP --- */}
      <div className="bg-gradient-to-br from-orange-600/5 to-transparent border border-orange-500/10 p-5 sm:p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-6 items-center">
          <div className="lg:w-[30%]">
            <h2 className="text-lg font-black text-white tracking-tight mb-1">Mission Critical: Next Steps</h2>
            <p className="text-[10px] text-zinc-500 leading-relaxed mb-4 font-medium">
              We've identified the fastest path to an interview. Focus on these <span className="text-orange-500 font-black underline underline-offset-4 decoration-2">4 key areas</span> to transform your application.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-zinc-950/60 rounded-lg border border-white/5 text-center">
                <h4 className="text-[7px] font-black text-zinc-600 uppercase mb-0.5 tracking-widest">Priority</h4>
                <p className="text-[10px] text-white font-black">Fix Gaps</p>
              </div>
              <div className="p-2 bg-zinc-950/60 rounded-lg border border-white/5 text-center">
                <h4 className="text-[7px] font-black text-zinc-600 uppercase mb-0.5 tracking-widest">Est. Time</h4>
                <p className="text-[10px] text-white font-black">~12 Mins</p>
              </div>
            </div>
          </div>
          
          <div className="lg:w-[70%] grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { title: "Skill Injection", desc: "Embed the top 3 missing keywords into your bullet points.", linkText: "GO TO EDITOR", onClick: () => onNavigateTab?.('generator') },
              { title: "Format Cleanup", desc: "Remove identified risks to ensure 100% ATS readability.", linkText: "VIEW RISKS", onClick: () => onNavigateTab?.('generator') },
              { title: "Story Alignment", desc: "Sync your summary with the Role Fit analysis below.", linkText: "UPDATE BIO", onClick: () => onNavigateTab?.('generator') },
              { title: "Final Validation", desc: "Re-run analysis to hit the 85% golden score.", linkText: "RE-SCAN", onClick: () => onNavigateTab?.('generator') },
            ].map((step, i) => (
              <div 
                key={i} 
                onClick={step.onClick}
                className="flex flex-col justify-between p-4 bg-zinc-950/40 border border-white/5 rounded-2xl hover:border-orange-500/30 transition-all cursor-pointer group/card min-h-[120px]"
              >
                <div>
                  <h4 className="text-[12px] font-black text-white mb-1.5">{step.title}</h4>
                  <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">{step.desc}</p>
                </div>
                <div className="mt-4 flex items-center gap-2 text-orange-500 font-black text-[9px] tracking-widest uppercase">
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
          <div className="bg-zinc-900/40 border border-white/5 p-4 rounded-2xl shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-[9px] font-black text-white uppercase tracking-widest">The Skill Gap</h3>
              <button 
                onClick={copyKeywords}
                className="px-1.5 py-0.5 bg-zinc-950 border border-white/10 rounded text-[7px] font-black text-zinc-500 hover:text-white transition-all"
              >
                {copiedKeywords ? 'DONE' : 'COPY ALL'}
              </button>
            </div>
            
            <div className="flex flex-wrap gap-1.5 mb-2">
              {result.missingKeywords.length > 0 ? (
                result.missingKeywords.map((keyword, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-orange-500/5 text-orange-500 border border-orange-500/10 rounded-lg text-[9px] font-black tracking-tight">
                    {keyword}
                  </span>
                ))
              ) : (
                <div className="text-zinc-600 text-[9px] font-bold bg-zinc-950/50 p-2 rounded-lg w-full border border-orange-500/10 text-center">
                  100% Keyword Match
                </div>
              )}
            </div>
          </div>

          {/* Technical Risks */}
          <div ref={risksRef} className="bg-zinc-900/40 border border-white/5 p-4 rounded-2xl shadow-xl">
            <h3 className="text-[9px] font-black text-white uppercase tracking-widest mb-3">Technical Risks</h3>
            <div className="space-y-2">
              {result.criticalIssues.length > 0 ? (
                result.criticalIssues.map((issue, idx) => (
                  <div key={idx} className="p-2 bg-orange-500/5 border border-orange-500/10 rounded-lg">
                    <span className="text-[9px] text-zinc-400 leading-snug font-bold">{issue}</span>
                  </div>
                ))
              ) : (
                <div className="text-zinc-600 text-[9px] font-bold bg-zinc-950/50 p-2 rounded-lg border border-orange-500/10 text-center">
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
