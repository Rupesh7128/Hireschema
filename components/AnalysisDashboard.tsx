
import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalysisResult, ContactProfile } from '../types';
import { AlertTriangle, CheckCircle, Target, FileSearch, TrendingUp, Download, ShieldAlert, Info, User, BrainCircuit, Globe, Briefcase, DollarSign, Pencil, X, Check, Camera, Mail, Phone, Linkedin, MapPin } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface AnalysisDashboardProps {
  result: AnalysisResult;
  onUpdateProfile?: (profile: ContactProfile) => void;
}

const HoverTooltip = ({ children, content }: { children?: React.ReactNode, content: string }) => {
    const [isHovered, setIsHovered] = useState(false);
    return (
        <div 
            className="relative inline-flex items-center justify-center cursor-help"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => setIsHovered(!isHovered)}
        >
            {children}
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        className="absolute bottom-full mb-2 w-56 bg-zinc-900/90 backdrop-blur-xl border border-white/10 text-zinc-200 text-xs leading-relaxed p-4 rounded-xl shadow-2xl z-50 pointer-events-none left-1/2 -translate-x-1/2"
                    >
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 rotate-45 border-r border-b border-white/10"></div>
                        <span className="relative z-10">{content}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const CustomChartTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-950/80 border border-white/10 p-4 rounded-xl shadow-2xl max-w-[200px] backdrop-blur-md z-50">
        <p className="text-xs font-mono text-zinc-500 uppercase font-bold mb-1">{payload[0].name}</p>
        <p className={`text-xl font-bold ${payload[0].name.includes('Match') ? 'text-orange-500' : 'text-zinc-500'}`}>
            {payload[0].value}%
        </p>
      </div>
    );
  }
  return null;
};

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ result, onUpdateProfile }) => {
  const atsData = [
    { name: 'ATS Match', value: result.atsScore },
    { name: 'Gap', value: 100 - result.atsScore },
  ];
  const relevanceData = [
    { name: 'Relevance Match', value: result.relevanceScore || 0 },
    { name: 'Gap', value: 100 - (result.relevanceScore || 0) },
  ];
  
  const COLORS = ['#F97316', '#27272A'];
  const COLORS_RELEVANCE = ['#F97316', '#27272A'];

  // EDIT MODE STATE
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState<ContactProfile>(result.contactProfile);

  useEffect(() => {
      setEditProfileData(result.contactProfile);
  }, [result.contactProfile]);

  const handleSaveProfile = () => {
      if (onUpdateProfile) {
          onUpdateProfile(editProfileData);
      }
      setIsEditingProfile(false);
  };

  const handleCancelEdit = () => {
      setEditProfileData(result.contactProfile);
      setIsEditingProfile(false);
  };

  const handleDownloadCSV = () => {
    const headers = ["Category", "Details"];
    const rows = [
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
    link.setAttribute("download", "analysis_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLowRelevance = (result.relevanceScore || 0) < 50 && result.relevanceScore > 0;
  const isNoJD = result.relevanceScore === 0 && result.roleFitAnalysis.includes("No Job Description");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-7xl mx-auto pb-8">
      
      {/* --- HEADER / PROFILE CARD --- */}
      <div className="col-span-1 md:col-span-2 lg:col-span-4 flex flex-col md:flex-row justify-between items-start md:items-center mb-2 gap-4 bg-zinc-900/30 border border-white/5 p-4 rounded-xl">
        <div className="flex items-center gap-4 w-full">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden relative group">
                {editProfileData.photo ? (
                    <img src={editProfileData.photo} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <span className="text-xl font-bold text-zinc-500 font-mono">
                        {editProfileData.name ? editProfileData.name.charAt(0) : 'U'}
                    </span>
                )}
            </div>

            <div className="flex-1">
                {isEditingProfile ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input 
                            value={editProfileData.name} 
                            onChange={e => setEditProfileData({...editProfileData, name: e.target.value})}
                            className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm text-white font-bold"
                            placeholder="Name"
                        />
                        <input 
                            value={editProfileData.email} 
                            onChange={e => setEditProfileData({...editProfileData, email: e.target.value})}
                            className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300"
                            placeholder="Email"
                        />
                        <input 
                            value={editProfileData.phone} 
                            onChange={e => setEditProfileData({...editProfileData, phone: e.target.value})}
                            className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300"
                            placeholder="Phone"
                        />
                        <input 
                            value={editProfileData.location} 
                            onChange={e => setEditProfileData({...editProfileData, location: e.target.value})}
                            className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300"
                            placeholder="Location"
                        />
                    </div>
                ) : (
                    <div>
                        <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                            {result.contactProfile.name || "Candidate"}
                            <button onClick={() => setIsEditingProfile(true)} className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                        </h3>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-zinc-500">
                            {result.contactProfile.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {result.contactProfile.email}</span>}
                            {result.contactProfile.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {result.contactProfile.phone}</span>}
                            {result.contactProfile.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {result.contactProfile.location}</span>}
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className="flex gap-2 shrink-0">
            {isEditingProfile ? (
                <>
                    <button onClick={handleSaveProfile} className="p-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"><Check className="w-4 h-4" /></button>
                    <button onClick={handleCancelEdit} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
                </>
            ) : (
                <button 
                  onClick={handleDownloadCSV}
                  className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:border-zinc-700 transition-all group"
                >
                  <Download className="w-3.5 h-3.5 group-hover:text-orange-500 transition-colors" />
                  <span className="hidden sm:inline">Export Report</span>
                </button>
            )}
        </div>
      </div>

      {/* Role Mismatch Warning */}
      {isLowRelevance && (
        <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-zinc-900 border border-orange-500/20 p-4 rounded-xl flex items-start gap-3">
             <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
             <div>
                 <h4 className="text-orange-400 font-bold text-sm uppercase mb-1">Role Mismatch Detected</h4>
                 <p className="text-zinc-400 text-xs">{result.roleFitAnalysis || "Candidate profile does not strongly align with the Job Description requirements."}</p>
             </div>
        </div>
      )}
      
      {isNoJD && (
        <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-zinc-800/50 border border-zinc-700/50 p-4 rounded-xl flex items-start gap-3">
             <Info className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
             <div>
                 <h4 className="text-zinc-300 font-bold text-sm uppercase mb-1">Missing JD</h4>
                 <p className="text-zinc-500 text-xs">Relevance scores unavailable because no Job Description was provided.</p>
             </div>
        </div>
      )}

      {/* Score Card: ATS */}
      <div className="col-span-1 md:col-span-1 bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col items-center justify-between relative overflow-hidden shadow-xl min-h-[220px]">
        <div className="w-full flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
              <h3 className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">ATS Compliance</h3>
              <HoverTooltip content="Calculated based on formatting, keyword density, and section parsing compatibility.">
                  <Info className="w-3.5 h-3.5 text-zinc-600 hover:text-orange-500 transition-colors" />
              </HoverTooltip>
          </div>
          <Target className="w-4 h-4 text-orange-500" />
        </div>
        <div className="w-32 h-32 relative my-auto">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={atsData}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={50}
                startAngle={90}
                endAngle={-270}
                stroke="none"
                dataKey="value"
                cornerRadius={5}
                paddingAngle={2}
              >
                {atsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'transparent' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-bold text-white tracking-tighter">{result.atsScore}</span>
            <span className="text-[9px] text-zinc-500 font-mono mt-1">/ 100</span>
          </div>
        </div>
      </div>

       {/* Score Card: Relevance */}
       <div className="col-span-1 md:col-span-1 bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col items-center justify-between relative overflow-hidden shadow-xl min-h-[220px]">
        <div className="w-full flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
              <h3 className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">Skill Match</h3>
              <HoverTooltip content="0-100 score based on keyword presence and experience relevance.">
                  <Info className="w-3.5 h-3.5 text-zinc-600 hover:text-orange-500 transition-colors" />
              </HoverTooltip>
          </div>
          <BrainCircuit className="w-4 h-4 text-orange-500" />
        </div>
        <div className="w-32 h-32 relative my-auto">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={relevanceData}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={50}
                startAngle={90}
                endAngle={-270}
                stroke="none"
                dataKey="value"
                cornerRadius={5}
                paddingAngle={2}
              >
                {relevanceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS_RELEVANCE[index % COLORS_RELEVANCE.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'transparent' }} />
            </PieChart>
          </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    {isNoJD ? (
                         <span className="text-xl font-bold text-zinc-600 tracking-tighter">N/A</span>
                    ) : (
                        <>
                        <span className="text-3xl font-bold text-white tracking-tighter">{result.relevanceScore || 0}</span>
                        <span className="text-[9px] text-zinc-500 font-mono mt-1">/ 100</span>
                        </>
                    )}
                  </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            <h3 className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">Analysis Summary</h3>
        </div>
        <p className="text-zinc-300 text-sm leading-relaxed font-light mb-4">
          {result.summary}
        </p>
        <div className="p-3 bg-zinc-950/50 rounded-lg border border-white/5">
             <h4 className="text-xs font-bold text-zinc-500 uppercase mb-1">Role Fit Verdict</h4>
             <p className={`text-sm font-medium ${isLowRelevance ? 'text-orange-400' : 'text-zinc-300'}`}>
                 {result.roleFitAnalysis || "Analysis pending."}
             </p>
        </div>
      </div>

      {/* Missing Keywords */}
      <div className="col-span-1 md:col-span-1 lg:col-span-2 bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <FileSearch className="w-4 h-4 text-orange-500" />
           <div className="flex items-center gap-2">
                <h3 className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">Gap Analysis</h3>
                <HoverTooltip content="High-value keywords found in the Job Description but missing from your resume.">
                    <Info className="w-3.5 h-3.5 text-zinc-600 hover:text-orange-500 transition-colors" />
                </HoverTooltip>
            </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {result.missingKeywords.length > 0 ? (
            result.missingKeywords.map((keyword, idx) => (
              <span key={idx} className="px-2.5 py-1 bg-zinc-900 text-orange-400 border border-orange-500/20 rounded-md text-xs">
                {keyword}
              </span>
            ))
          ) : (
            <span className="text-zinc-400 text-sm italic flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> No major keywords missing. Great job!
            </span>
          )}
        </div>
      </div>

      {/* Critical Issues - Honest Reporting */}
      <div className="col-span-1 md:col-span-1 bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className={`w-4 h-4 ${result.atsScore > 85 ? 'text-orange-500' : 'text-orange-500'}`} />
           <div className="flex items-center gap-2">
                <h3 className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">
                    {result.atsScore > 85 ? 'Health Check' : 'Risks'}
                </h3>
           </div>
        </div>
        <ul className="space-y-2.5">
          {result.criticalIssues.length > 0 ? (
            result.criticalIssues.slice(0, 3).map((issue, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-zinc-400">
                <AlertTriangle className="w-3 h-3 text-orange-500 shrink-0 mt-0.5" />
                <span className="leading-tight">{issue}</span>
              </li>
            ))
          ) : (
            <li className="text-zinc-400 text-xs flex items-center gap-2">
                <CheckCircle className="w-3 h-3" /> No critical errors found.
            </li>
          )}
        </ul>
      </div>

      {/* Strengths & Languages */}
      <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                 <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4 text-orange-500" />
                    <h3 className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">Core Strengths</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                {result.keyStrengths.map((strength, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950/30 border border-white/5">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0"></div>
                        <span className="text-xs text-zinc-300 font-medium">{strength}</span>
                    </div>
                ))}
                </div>
            </div>

            <div>
                 <div className="flex items-center gap-2 mb-3">
                    <Globe className="w-4 h-4 text-zinc-500" />
                    <h3 className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">Languages Detected</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                    {result.languages && result.languages.length > 0 ? (
                        result.languages.map((lang, idx) => (
                            <span key={idx} className="px-3 py-1.5 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg text-xs font-medium">
                                {lang}
                            </span>
                        ))
                    ) : (
                        <span className="text-xs text-zinc-500 italic">None explicitly detected.</span>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisDashboard;
