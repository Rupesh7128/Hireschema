
import React, { useState, useEffect } from 'react';
import { 
    Plus, Link as LinkIcon, FileText, AlertCircle, Radar, 
    ChevronDown, Settings, LogOut, CheckCircle, Loader2
} from 'lucide-react';
import { FileData, AnalysisResult, HistoryItem, ContactProfile } from './types';
import { analyzeResume } from './services/geminiService';
import { db } from './services/db';
import { logEvent, logPageView } from './services/analytics';
import { verifyDodoPayment } from './services/paymentService';
import ResumeUploader from './components/ResumeUploader';
import AnalysisDashboard from './components/AnalysisDashboard';
import ContentGenerator from './components/ContentGenerator';
import LandingPage from './components/LandingPage';
import LegalPages from './components/LegalPages';
import { AnimatedLogo } from './components/AnimatedLogo';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; message: string }>{
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, message: String(error?.message || 'Unknown error') };
  }
  componentDidCatch(error: any) {}
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-zinc-950">
          <div className="max-w-lg p-6 rounded-xl border border-red-900/40 bg-red-950/20 text-red-300">
            <h2 className="text-xl font-bold mb-2 text-red-400">Something went wrong</h2>
            <p className="text-sm">{this.state.message}</p>
            <button onClick={() => this.setState({ hasError: false, message: '' })} className="mt-4 px-4 py-2 bg-zinc-800 text-white rounded">Try again</button>
          </div>
        </div>
      );
    }
    return this.props.children as any;
  }
}

const AppContent: React.FC = () => {
  // --- VIEWS ---
  const [view, setView] = useState<'landing' | 'dashboard' | 'legal'>('landing');
  const [legalPage, setLegalPage] = useState<'privacy' | 'terms' | 'cookies' | null>(null);
  const [dashboardView, setDashboardView] = useState<'scan' | 'result'>('scan');

  // --- DATA ---
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ContactProfile>({
      name: '', email: '', phone: '', linkedin: '', location: '', photo: ''
  });

  // --- SCAN STATE ---
  const [inputWizardStep, setInputWizardStep] = useState<0 | 1>(0);
  const [jobInputMode, setJobInputMode] = useState<'link' | 'text'>('link');
  const [resumeFile, setResumeFile] = useState<FileData | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStartTs, setAnalysisStartTs] = useState<number | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultTab, setResultTab] = useState<'analysis' | 'generator'>('analysis');

  // --- PERSISTENCE ---
  const [isPaid, setIsPaid] = useState(() => {
      // Persist payment state across refreshes
      if (typeof window !== 'undefined') {
          return localStorage.getItem('hireSchema_isPaid') === 'true';
      }
      return false;
  });
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [appLanguage, setAppLanguage] = useState("English");

  // --- INIT ---
  useEffect(() => {
    const initData = async () => {
        const [h, p] = await Promise.all([
            db.history.getAll(),
            db.user.get()
        ]);
        setHistory(h);
        setProfile(p);
        
        return h; // Return history for chaining
    };
    
    // Handle URL Routing & Payment Verification
    const initRoute = async () => {
        const h = await initData(); // Wait for data load
        
        const path = window.location.pathname;
        const searchParams = new URLSearchParams(window.location.search);
        
        // Dodo Payments can return various parameters depending on configuration
        const paymentId = searchParams.get('paymentId') || 
                          searchParams.get('payment_id') || 
                          searchParams.get('session_id') ||
                          searchParams.get('session'); // Some docs suggest 'session'

        // Check for Payment Callback
        if (paymentId) {
            console.log("Payment Callback detected:", paymentId);
            setView('dashboard');
            setIsVerifyingPayment(true);
            try {
                const isValid = await verifyDodoPayment(paymentId);
                if (isValid) {
                    setIsPaid(true);
                    localStorage.setItem('hireSchema_isPaid', 'true');
                    logEvent('payment_success_auto', { paymentId });
                    
                    // RESTORE STATE: If we just came back from paying, the user likely wants to see their result immediately.
                    // Load the most recent history item if active state is empty
                    if (h.length > 0) {
                         const mostRecent = h[0];
                         setResumeFile(mostRecent.resumeFile);
                         setJobDescription(mostRecent.jobDescription);
                         setAnalysisResult(mostRecent.analysisResult);
                         setDashboardView('result');
                         setSelectedHistoryId(mostRecent.id);
                    }
                    
                    // Clean URL - Remove payment params so refresh doesn't re-trigger
                    window.history.replaceState({}, '', '/app');
                } else {
                    console.warn("Payment verification failed for ID:", paymentId);
                    setError("Payment verification failed. If you paid, please enter the Payment ID manually.");
                }
            } catch (e) {
                console.error("Payment verification error:", e);
                setError("Network error verifying payment. Please enter Payment ID manually.");
            } finally {
                setIsVerifyingPayment(false);
            }
        }

        if (['/privacy', '/terms', '/cookies'].includes(path)) {
           setView('legal');
           setLegalPage(path.substring(1) as any);
        } else if (path === '/app') {
           setView('dashboard'); // Direct link to app
        }
    };
    
    initRoute();
    logPageView(view);
  }, []); // Run once on mount

  // --- ACTIONS ---

  const handleLandingStart = (intent: 'scan' | 'optimize' | 'launch', file?: FileData) => {
    setView('dashboard');
    window.history.pushState({}, '', '/app');
    
    // Always start a new scan session
    setResumeFile(file || null);
    setJobDescription('');
    setAnalysisResult(null);
    setInputWizardStep(file ? 1 : 0);
    setDashboardView('scan');
  };

  const startNewScan = () => {
      setResumeFile(null);
      setJobDescription('');
      setAnalysisResult(null);
      setInputWizardStep(0);
      setDashboardView('scan');
  }

  const handleAnalysis = async () => {
    if (!resumeFile) return setError('Please upload or select a resume first.');
    setError(null);
    setIsAnalyzing(true);
    setAnalysisStartTs(Date.now());
    
    try {
      const result = await analyzeResume(resumeFile, jobDescription);
      
      setAnalysisResult(result);
      
      // Create History Item
      const newItem: HistoryItem = {
          id: Math.random().toString(36).substr(2, 9),
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          jobTitle: result.jobTitle || 'General Application',
          company: result.company || 'Unknown Company',
          atsScore: result.atsScore,
          status: 'To Do',
          resumeFile,
          jobDescription,
          analysisResult: result
      };
      
      // Save to DB
      const updatedHistory = await db.history.add(newItem);
      setHistory(updatedHistory);
      setSelectedHistoryId(newItem.id);
      
      setDashboardView('result');
      setResultTab('analysis');
      logEvent('analysis_success', { ats_score: result.atsScore });

    } catch (err: any) {
      setError(err.message || 'Analysis Failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateAnalysisProfile = async (updatedProfile: ContactProfile) => {
      if (analysisResult && selectedHistoryId) {
          const updatedResult = { ...analysisResult, contactProfile: updatedProfile };
          setAnalysisResult(updatedResult);
          
          // Update specific history item in DB
          const historyItem = history.find(h => h.id === selectedHistoryId);
          if (historyItem) {
              await db.history.update({ ...historyItem, analysisResult: updatedResult });
              // Refresh state
              setHistory(await db.history.getAll());
          }
          
          // Sync profile to user settings too
          setProfile(updatedProfile);
          await db.user.update(updatedProfile);
      }
  };

  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      setAnalysisProgress(0);
      interval = setInterval(() => {
        const now = Date.now();
        const start = analysisStartTs || now;
        const elapsed = (now - start) / 1000;
        let target = 10;
        if (elapsed < 5) target = 35;
        else if (elapsed < 20) target = 75;
        else if (elapsed < 40) target = 95;
        else target = 99;
        setAnalysisProgress(prev => (prev < target ? prev + Math.min(2, target - prev) : prev));
      }, 250);
    } else {
      setAnalysisProgress(100);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing, analysisStartTs]);

  if (view === 'landing') return <LandingPage onStart={handleLandingStart} />;
  if (view === 'legal' && legalPage) return <LegalPages page={legalPage} onBack={() => { setView('landing'); window.history.pushState({}, '', '/'); }} />;

  return (
    <ErrorBoundary>
    <div className="flex h-screen bg-black text-zinc-100 overflow-hidden font-sans">
      
      {/* GLOBAL OVERLAY: Payment Verification */}
      {isVerifyingPayment && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
              <h2 className="text-xl font-bold text-white">Verifying Payment...</h2>
              <p className="text-zinc-500 text-sm mt-2">Please wait while we confirm your transaction.</p>
          </div>
      )}

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950">
         {/* HEADER */}
         <header className="h-16 border-b border-white/5 bg-zinc-950 flex items-center justify-between px-6 shrink-0">
             <div className="cursor-pointer" onClick={() => { setView('landing'); window.history.pushState({}, '', '/'); }}><AnimatedLogo /></div>
             
             <div className="flex items-center gap-4">
                 {isPaid && (
                     <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                         <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                         <span className="text-xs font-bold text-green-500 uppercase tracking-wider">Premium Unlocked</span>
                     </div>
                 )}
                 <button onClick={startNewScan} className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded shadow-lg shadow-orange-900/20 transition-all hover:translate-y-[-1px]">
                     <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">New Scan</span>
                 </button>
             </div>
         </header>

         {/* CONTENT */}
         <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
             
             {/* --- SCAN WIZARD & RESULTS --- */}
             {dashboardView === 'scan' && (
                 <div className="max-w-4xl mx-auto h-full flex flex-col items-center justify-center">
                     {isAnalyzing ? (
                        <div className="text-center">
                            <div className="relative w-32 h-32 mx-auto mb-8">
                                <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping opacity-20"></div>
                                <div className="relative w-full h-full bg-zinc-900 border border-zinc-700 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(249,115,22,0.3)]">
                                    <Radar className="w-16 h-16 text-orange-500 animate-[spin_3s_linear_infinite]" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">
                                {analysisProgress < 30 ? "Analyzing Resume Structure..." : 
                                 analysisProgress < 60 ? "Extracting Skills & Experience..." :
                                 analysisProgress < 85 ? "Comparing with Job Description..." : 
                                 "Finalizing Strategic Insights..."}
                            </h2>
                            <p className="text-zinc-500 font-mono text-xs">{Math.round(analysisProgress)}% COMPLETE</p>
                        </div>
                     ) : (
                         <div className="w-full space-y-8">
                            <div className="text-center"><h1 className="text-3xl font-bold text-white mb-2">New Analysis</h1><p className="text-zinc-400">Step {inputWizardStep + 1} of 2</p></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[400px]">
                                <div className={`flex flex-col h-full ${inputWizardStep === 1 ? 'hidden md:flex' : ''}`}>
                                    <h3 className="text-xs font-bold text-zinc-500 uppercase mb-3">1. Select Resume</h3>
                                    <div className="flex-1 overflow-hidden h-full">
                                        <ResumeUploader onFileUpload={setResumeFile} currentFile={resumeFile} />
                                    </div>
                                    <div className="md:hidden mt-4"><button onClick={() => setInputWizardStep(1)} disabled={!resumeFile} className="w-full py-3 bg-zinc-800 text-white rounded font-bold">Next</button></div>
                                </div>
                                <div className={`flex flex-col h-full ${inputWizardStep === 0 ? 'hidden md:flex' : ''}`}>
                                     <div className="md:hidden mb-2"><button onClick={() => setInputWizardStep(0)} className="text-zinc-500">Back</button></div>
                                     <h3 className="text-xs font-bold text-zinc-500 uppercase mb-3">2. Job Details</h3>
                                     <div className="flex gap-2 mb-3 bg-zinc-900 p-1 rounded-lg border border-zinc-800 self-start">
                                        <button onClick={() => setJobInputMode('link')} className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors ${jobInputMode === 'link' ? 'bg-orange-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}><LinkIcon className="w-3 h-3" /> Link</button>
                                        <button onClick={() => setJobInputMode('text')} className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors ${jobInputMode === 'text' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}><FileText className="w-3 h-3" /> Text</button>
                                     </div>
                                     <div className="flex-1">{jobInputMode === 'link' ? (<div className="h-full bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col justify-center gap-4"><div className="text-center"><div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3"><LinkIcon className="w-6 h-6 text-orange-500" /></div><h4 className="text-white font-bold text-sm">Paste Job URL</h4><p className="text-zinc-500 text-xs">LinkedIn, Indeed, etc.</p></div><input type="text" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="https://..." className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm text-white focus:border-orange-500 outline-none" /></div>) : (<textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste job description..." className="w-full h-full bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600 resize-none font-mono" />)}</div>
                                </div>
                            </div>
                            {error && <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-lg flex items-center gap-3 text-red-400 text-sm"><AlertCircle className="w-5 h-5 shrink-0" /> {error}</div>}
                            <div className="flex justify-end"><button onClick={handleAnalysis} disabled={!resumeFile || isAnalyzing} className="px-8 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">Start Analysis</button></div>
                         </div>
                     )}
                 </div>
             )}

             {dashboardView === 'result' && analysisResult && resumeFile && (
                 <div className="h-full flex flex-col">
                     <div className="flex justify-center mb-6">
                        <div className="bg-zinc-900 p-1 rounded-lg border border-zinc-800 flex gap-1">
                          <button onClick={() => setResultTab('analysis')} className={`px-4 py-2 rounded text-xs font-bold transition-all ${resultTab === 'analysis' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Diagnostic</button>
                          <button onClick={() => setResultTab('generator')} className={`px-4 py-2 rounded text-xs font-bold transition-all ${resultTab === 'generator' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Editor</button>
                        </div>
                     </div>
                     <div className="flex-1 bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden">
                        {resultTab === 'analysis' ? (
                          <div className="h-full overflow-y-auto p-6">
                            <ErrorBoundary>
                              <AnalysisDashboard result={analysisResult} onUpdateProfile={handleUpdateAnalysisProfile} />
                            </ErrorBoundary>
                          </div>
                        ) : (
                          <ErrorBoundary>
                            <ContentGenerator 
                              resumeFile={resumeFile} 
                              jobDescription={jobDescription} 
                              analysis={analysisResult} 
                              isPaid={isPaid} 
                              onPaymentSuccess={() => { setIsPaid(true); localStorage.setItem('hireSchema_isPaid', 'true'); }} 
                              appLanguage={appLanguage} 
                              setAppLanguage={setAppLanguage} 
                            />
                          </ErrorBoundary>
                        )}
                     </div>
                 </div>
             )}
         </main>
      </div>
    </div>
    </ErrorBoundary>
  );
};

export default AppContent;
