
import * as React from 'react';
import { useState, useEffect, lazy, Suspense } from 'react';
import { 
    Plus, Link as LinkIcon, FileText, AlertCircle, Radar, 
    CheckCircle, Loader2, Search, Sparkles, BrainCircuit, GraduationCap, Globe
} from 'lucide-react';
import { FileData, AnalysisResult, HistoryItem, ContactProfile } from './types';
import { analyzeResume, extractTextFromPdf } from './services/geminiService';
import { db } from './services/db';
import { logEvent, logPageView } from './services/analytics';
import { verifyDodoPayment, savePaymentState, readPaymentState } from './services/paymentService';
import { restoreStateAfterPayment, clearPersistedState } from './services/stateService';
import { AnimatedLogo } from './components/AnimatedLogo';

// Lazy load heavy components for better initial load performance
const ResumeUploader = lazy(() => import('./components/ResumeUploader'));
const AnalysisDashboard = lazy(() => import('./components/AnalysisDashboard'));
const ContentGenerator = lazy(() => import('./components/ContentGenerator'));
const LandingPage = lazy(() => import('./components/LandingPage'));
const LegalPages = lazy(() => import('./components/LegalPages'));
const RoastPage = lazy(() => import('./components/RoastPage').then(m => ({ default: m.RoastPage })));
const BlogPage = lazy(() => import('./components/BlogPage').then(m => ({ default: m.BlogPage })));
const FeaturePage = lazy(() => import('./components/FeaturePage').then(m => ({ default: m.FeaturePage })));
const PricingPage = lazy(() => import('./components/PricingPage'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen bg-zinc-950">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      <p className="text-zinc-500 text-sm font-mono">Loading...</p>
    </div>
  </div>
);

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
  const [view, setView] = useState<'landing' | 'dashboard' | 'legal' | 'roast' | 'blog' | 'feature' | 'pricing'>('landing');
  const [legalPage, setLegalPage] = useState<'privacy' | 'terms' | 'cookies' | null>(null);
  const [dashboardView, setDashboardView] = useState<'scan' | 'result'>('scan');
  const [blogSlug, setBlogSlug] = useState<string | null>(null);
  const [featureId, setFeatureId] = useState<string | null>(null);

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
  const [resumeText, setResumeText] = useState<string>(''); // Extracted text for content generation
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStartTs, setAnalysisStartTs] = useState<number | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultTab, setResultTab] = useState<'analysis' | 'generator'>('analysis');

  // --- PERSISTENCE ---
  const [isPaid, setIsPaid] = useState(() => {
      // Read payment state from localStorage using the payment service
      return readPaymentState();
  });
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
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
        
        const paymentId = searchParams.get('paymentId') || 
                          searchParams.get('payment_id') || 
                          searchParams.get('session_id') ||
                          searchParams.get('session') ||
                          searchParams.get('checkout_session') ||
                          searchParams.get('id') || '';

        const redirectStatusRaw =
          searchParams.get('status') ||
          searchParams.get('payment_status') ||
          searchParams.get('success') ||
          searchParams.get('paid') ||
          searchParams.get('redirect_status') || '';
        const redirectStatus = String(redirectStatusRaw).toLowerCase();
        const redirectLooksSuccessful = ['true','1','yes','success','succeeded','completed','paid'].includes(redirectStatus);

        // Check for Payment Callback
        if (paymentId) {
            console.log('Payment Callback detected:', { paymentId, redirectStatus });
            setView('dashboard');
            setIsVerifyingPayment(true);
            
            try {
                // Helper to restore user state after successful payment
                const restoreUserState = () => {
                    console.log('=== restoreUserState called ===');
                    
                    // First try to restore from persisted state (saved before redirect)
                    const persistedState = restoreStateAfterPayment();
                    console.log('Persisted state:', persistedState ? JSON.stringify({
                        hasResumeFile: !!persistedState.resumeFile,
                        resumeFileName: persistedState.resumeFile?.name || 'none',
                        hasAnalysisResult: !!persistedState.analysisResult,
                        jobDescLength: persistedState.jobDescription?.length || 0,
                        resumeTextLength: persistedState.resumeText?.length || 0,
                        resumeTextPreview: persistedState.resumeText?.substring(0, 100) || 'EMPTY'
                    }) : 'null');
                    
                    if (persistedState) {
                        console.log('✅ Restoring from persisted state, navigating to editor...');
                        console.log('resumeText length being restored:', persistedState.resumeText?.length || 0);
                        console.log('resumeText preview:', persistedState.resumeText?.substring(0, 150) || 'EMPTY');
                        
                        if (!persistedState.resumeText || persistedState.resumeText.length < 100) {
                            console.warn('⚠️ WARNING: Restored resumeText is empty or too short!');
                        }
                        
                        // Set all state in sequence to ensure proper updates
                        setResumeFile(persistedState.resumeFile);
                        setResumeText(persistedState.resumeText || '');
                        setJobDescription(persistedState.jobDescription);
                        setAnalysisResult(persistedState.analysisResult);
                        // CRITICAL: Set dashboard view to 'result' and tab to 'generator' (Editor)
                        setDashboardView('result');
                        setResultTab('generator');
                        clearPersistedState(); // Clean up after restore
                        console.log('State restored - dashboardView=result, resultTab=generator');
                        return;
                    }
                    
                    // Fallback to history if no persisted state
                    console.log('No persisted state, checking history. Length:', h.length);
                    if (h.length > 0) {
                        const mostRecent = h[0];
                        console.log('Restoring from history item:', mostRecent.id);
                        setResumeFile(mostRecent.resumeFile);
                        setResumeText(mostRecent.resumeText || '');
                        setJobDescription(mostRecent.jobDescription);
                        setAnalysisResult(mostRecent.analysisResult);
                        // CRITICAL: Set dashboard view to 'result' and tab to 'generator' (Editor)
                        setDashboardView('result');
                        setResultTab('generator');
                        setSelectedHistoryId(mostRecent.id);
                        console.log('State restored from history - dashboardView=result, resultTab=generator');
                        return;
                    }
                    
                    // No state to restore - user paid but has no previous analysis
                    // Show scan view with success message - premium features are now unlocked
                    console.log('No state to restore, showing scan view with premium unlocked');
                    setDashboardView('scan');
                };

                // Helper to mark payment as successful
                const markPaymentSuccess = () => {
                    setIsPaid(true);
                    savePaymentState(true);
                    logEvent('payment_success_auto', { paymentId });
                    restoreUserState();
                    window.history.replaceState({}, '', '/app');
                    // Show success toast
                    setShowPaymentSuccess(true);
                    setTimeout(() => setShowPaymentSuccess(false), 4000);
                };

                // Initial verification attempt
                let res = await verifyDodoPayment(paymentId);
                console.log('Initial verification result:', res);
                
                if (res.ok && res.isPaid) {
                    console.log('Payment verified successfully on first attempt!');
                    markPaymentSuccess();
                } else if (redirectLooksSuccessful) {
                    console.log('Redirect looks successful but verification returned:', res);
                    // Redirect looks successful but API hasn't caught up yet
                    // Use exponential backoff for retries
                    const retryDelays = [2000, 4000, 8000]; // Exponential backoff
                    let verified = false;
                    
                    for (let i = 0; i < retryDelays.length && !verified; i++) {
                        console.log(`Retry ${i + 1}/${retryDelays.length} after ${retryDelays[i]}ms...`);
                        await new Promise(r => setTimeout(r, retryDelays[i]));
                        res = await verifyDodoPayment(paymentId);
                        
                        if (res.ok && res.isPaid) {
                            console.log('Payment verified successfully on retry!');
                            verified = true;
                            markPaymentSuccess();
                        } else {
                            console.log(`Retry ${i + 1} result:`, res);
                        }
                    }
                    
                    if (!verified) {
                        // All retries failed, but redirect looked successful
                        // Show a helpful message
                        console.warn('Payment verification failed after retries:', { paymentId, lastResult: res });
                        setError(
                            'Payment is being processed. If you completed payment, please wait a moment and enter your Payment ID manually, ' +
                            'or check your email for the receipt.'
                        );
                    }
                } else {
                    // Verification failed and redirect doesn't look successful
                    console.warn('Payment verification failed:', { paymentId, reason: res.reason, status: res.status });
                    const msg = res.reason || 'Payment verification failed.';
                    setError(`${msg} If you paid, please enter the Payment ID manually.`);
                }
            } catch (e) {
                console.error('Payment verification error:', e);
                setError('Network error verifying payment. Please check your connection and try again, or enter Payment ID manually.');
            } finally {
                setIsVerifyingPayment(false);
            }
        }

        if (['/privacy', '/terms', '/cookies'].includes(path)) {
           setView('legal');
           setLegalPage(path.substring(1) as any);
        } else if (path === '/roast' || path === '/roast-my-resume') {
           setView('roast');
           if (path === '/roast') window.history.replaceState({}, '', '/roast-my-resume');
        } else if (path === '/pricing') {
           setView('pricing');
        } else if (path.startsWith('/feature/')) {
           setView('feature');
           setFeatureId(path.replace('/feature/', ''));
        } else if (path.startsWith('/blog')) {
           setView('blog');
           const slug = path.replace(/^\/blog\/?/, '');
           if (slug) setBlogSlug(slug);
        } else if (path === '/app') {
           setView('dashboard'); // Direct link to app
        }
    };
    
    initRoute();
    logPageView(view);
  }, []); // Run once on mount

  // --- ACTIONS ---

  // Extract text from PDF when file is uploaded
  const handleFileUpload = async (file: FileData | null) => {
    setResumeFile(file);
    if (file && file.type === 'application/pdf') {
      try {
        const text = await extractTextFromPdf(file.base64);
        setResumeText(text);
      } catch (e) {
        console.error('Failed to extract text from PDF:', e);
        setResumeText('');
      }
    } else {
      setResumeText('');
    }
  };

  const handleLandingStart = async (intent: 'scan' | 'optimize' | 'launch' | 'roast' | 'blog' | 'feature' | 'pricing', file?: FileData, featureSlug?: string) => {
    if (intent === 'roast') {
      setView('roast');
      window.history.pushState({}, '', '/roast-my-resume');
      return;
    }

    if (intent === 'pricing') {
      setView('pricing');
      window.history.pushState({}, '', '/pricing');
      return;
    }

    if (intent === 'feature' && featureSlug) {
      setView('feature');
      setFeatureId(featureSlug);
      window.history.pushState({}, '', `/feature/${featureSlug}`);
      return;
    }

    if (intent === 'blog') {
      setView('blog');
      window.history.pushState({}, '', '/blog');
      return;
    }
    
    setView('dashboard');
    window.history.pushState({}, '', '/app');
    
    // Always start a new scan session
    if (file) {
      await handleFileUpload(file);
    } else {
      setResumeFile(null);
      setResumeText('');
    }
    setJobDescription('');
    setAnalysisResult(null);
    setInputWizardStep(file ? 1 : 0);
    setDashboardView('scan');
  };

  // Type-safe wrapper for components that expect a simpler navigation function
  const handleNav = (target: any) => {
    handleLandingStart(target);
  };

  const startNewScan = () => {
      setResumeFile(null);
      setResumeText('');
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
          id: Math.random().toString(36).substring(2, 11),
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          jobTitle: result.jobTitle || 'General Application',
          company: result.company || 'Unknown Company',
          atsScore: result.atsScore,
          status: 'To Do',
          resumeFile,
          resumeText, // Include extracted text for content generation
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

  if (view === 'landing') return <Suspense fallback={<LoadingFallback />}><LandingPage onStart={handleLandingStart} appLanguage={appLanguage} onLanguageChange={setAppLanguage} /></Suspense>;
  if (view === 'roast') return <Suspense fallback={<LoadingFallback />}><RoastPage onNavigate={handleNav} appLanguage={appLanguage} /></Suspense>;
  if (view === 'pricing') return <Suspense fallback={<LoadingFallback />}><PricingPage onBack={() => { setView('landing'); window.history.pushState({}, '', '/'); }} onStart={handleNav} /></Suspense>;
  if (view === 'blog') return <Suspense fallback={<LoadingFallback />}><BlogPage onBack={() => { setView('landing'); window.history.pushState({}, '', '/'); }} initialSlug={blogSlug} onNavigate={handleNav} /></Suspense>;
  
  if (view === 'feature' && featureId) {
     const features = {
         'missing-keywords': {
             title: "Find Missing Keywords",
             subtitle: "The secret reason your resume is getting rejected.",
             description: "Most resumes get rejected because they don't match the specific language of the job description. ATS software scans for exact keyword matches. If you say 'customer service' but the job wants 'client success', you might get filtered out. Our tool compares your resume against the job posting and highlights exactly which keywords you are missing, so you can add them instantly.",
             icon: Search,
             benefits: [
                 "Scan against any job description in seconds",
                 "See a list of exact missing keywords (hard skills, soft skills, tools)",
                 "Get a match score to know where you stand",
                 "Increase your chances of passing the ATS filter by 3x"
             ],
             problemTitle: "You're qualified, but the robot doesn't know it.",
             problemDesc: "Applicant Tracking Systems (ATS) are dumb. They look for exact keyword matches. If the job description asks for \"React.js\" and you write \"ReactJS\", some older systems might miss it. If they want \"Project Management\" and you write \"Led projects\", you lose points. This is why 75% of qualified candidates are rejected instantly.",
             solutionTitle: "We reverse-engineer the job description.",
             solutionDesc: "HireSchema scans the job posting just like an ATS would. We extract the critical skills, tools, and certifications it demands. Then, we compare it against your resume to show you the exact gap. We tell you: \"Hey, you're missing 'Agile Methodology' and 'JIRA'—add these to get past the filter.\"",
             howItWorksSteps: [
                 { title: "Upload & Paste", desc: "Upload your resume PDF and paste the job description you're applying for." },
                 { title: "Instant Analysis", desc: "We scan both documents and identify the keyword gaps in real-time." },
                 { title: "Fill the Gaps", desc: "We give you a checklist of words to add. You update your resume, and your score goes up." }
             ]
         },
         'fix-automatically': {
             title: "Fix It Automatically",
             subtitle: "Your experience, rewritten to win.",
             description: "Knowing what's missing is half the battle. Fixing it is the other half. We don't just list keywords; we rewrite your bullet points to include them naturally. Our AI analyzes your experience and suggests professional, impact-driven rewrites that seamlessly integrate the required skills, so you sound like the perfect candidate without lying.",
             icon: Sparkles,
             benefits: [
                 "One-click rewrites for bullet points",
                 "Natural integration of missing keywords",
                 "Maintain your unique voice while optimizing for ATS",
                 "Save hours of editing time per application"
             ],
             problemTitle: "Rewriting resumes is exhausting.",
             problemDesc: "Staring at a bullet point trying to figure out how to shoehorn in \"Cross-functional leadership\" without sounding robotic is painful. You spend hours tweaking wording, only to second-guess yourself. It's the biggest bottleneck in applying for jobs.",
             solutionTitle: "One-click optimization.",
             solutionDesc: "Our AI doesn't just tell you what to fix—it fixes it for you. We take your existing bullet point (e.g., \"Managed a team\") and rewrite it to match the job's level and requirements (e.g., \"Spearheaded a cross-functional team of 10 to deliver critical milestones\"). It sounds like you, just 10x more hireable.",
             howItWorksSteps: [
                 { title: "Select a Bullet", desc: "Click on any bullet point in your resume that needs improvement." },
                 { title: "Get Suggestions", desc: "See 3 AI-generated variations that include the missing keywords naturally." },
                 { title: "Apply & Export", desc: "Choose the best one, click apply, and download your perfectly optimized resume." }
             ]
         },
         'cover-letter': {
             title: "Cover Letter Included",
             subtitle: "Stop writing cover letters from scratch.",
             description: "Stop writing generic cover letters that get ignored. We generate a tailored cover letter that connects your specific experience to the company's needs. It highlights why you're a good fit based on the job description and your resume's strongest points, giving you a compelling narrative in seconds.",
             icon: FileText,
             benefits: [
                 "Personalized to the specific company and role",
                 "Highlights your most relevant achievements",
                 "Professional tone and formatting",
                 "Ready to download and send immediately"
             ],
             problemTitle: "Cover letters are a waste of time (but required).",
             problemDesc: "You hate writing them. Recruiters hate reading generic ones. But many jobs still require them, or they can be the tie-breaker. Writing a unique, thoughtful letter for every single application is impossible when you're applying to 50 jobs.",
             solutionTitle: "Hyper-personalized letters in seconds.",
             solutionDesc: "We analyze your resume and the company's mission. Then, we generate a cover letter that bridges the gap. It doesn't just say \"I want this job\"—it says \"I have done X at my past role, which proves I can solve Y problem for you.\" It's persuasive, professional, and instant.",
             howItWorksSteps: [
                 { title: "Analyze Context", desc: "We look at your resume's strengths and the job's requirements." },
                 { title: "Generate Draft", desc: "We write a compelling narrative connecting your past to their future." },
                 { title: "Download PDF", desc: "Get a formatted, ready-to-send PDF cover letter that matches your resume style." }
             ]
         },
         'interview-prep': {
             title: "Interview Questions",
             subtitle: "Know what they'll ask before you walk in.",
             description: "Walk into your interview with confidence. We analyze the job description to predict the most likely interview questions you'll face. But we don't stop there — we also provide sample answers based on your actual resume experience, helping you frame your stories to prove you're the right hire.",
             icon: BrainCircuit,
             benefits: [
                 "Predict likely technical and behavioral questions",
                 "Get personalized STAR-method answer suggestions",
                 "Identify key talking points from your resume",
                 "Practice with confidence before the real thing"
             ],
             problemTitle: "The \"Tell me about a time...\" freeze.",
             problemDesc: "You know you can do the job, but explaining it under pressure is hard. You get asked a specific technical question or a behavioral curveball, and your mind goes blank. You ramble, miss the point, and lose the offer.",
             solutionTitle: "Your personal interview coach.",
             solutionDesc: "We predict the questions based on the role (e.g., \"How do you handle API latency?\" for a backend role). Then, we give you the cheat sheet. \"Here is a project on your resume that proves you can do this. Mention X, Y, and Z.\" We structure the answer for you using the STAR method (Situation, Task, Action, Result).",
             howItWorksSteps: [
                 { title: "Predict Questions", desc: "We generate role-specific questions based on the JD keywords." },
                 { title: "Draft Answers", desc: "We use your resume history to draft bullet-proof answers for each question." },
                 { title: "Practice Mode", desc: "Review your talking points so you can recite them naturally in the interview." }
             ]
         },
         'skill-gap': {
             title: "Learn What You're Missing",
             subtitle: "Don't let one missing skill cost you the job.",
             description: "Sometimes you are missing a key skill required for the job. Instead of just flagging it, we help you bridge the gap. We identify the critical skills you lack and point you toward resources to learn them quickly, so you can honestly add them to your resume or discuss them in an interview.",
             icon: GraduationCap,
             benefits: [
                 "Identify critical skill gaps preventing you from getting hired",
                 "Get curated learning resources for missing tools",
                 "Understand the 'why' behind job requirements",
                 "Level up your profile for future roles"
             ],
             problemTitle: "The \"Must have experience with X\" blocker.",
             problemDesc: "You're perfect for the role, except they want \"JIRA\" and you've only used \"Trello\". Or they want \"Tableau\" and you know \"Excel\". These small gaps can get you rejected, even though you could learn the tool in an afternoon.",
             solutionTitle: "Bridge the gap instantly.",
             solutionDesc: "We identify these missing hard skills. Then, instead of just saying \"You fail\", we give you a path forward. \"Here is a crash course on JIRA. Watch this, understand the basics, and you can honestly say you're familiar with it.\" We turn a 'No' into a 'Yes'.",
             howItWorksSteps: [
                 { title: "Identify Gaps", desc: "We flag hard skills (tools, languages) that are strict requirements." },
                 { title: "Curate Resources", desc: "We link you to the best quick-start guides and tutorials for that specific tool." },
                 { title: "Update Resume", desc: "Once you understand the basics, we help you phrase it correctly on your resume." }
             ]
         },
         'translate': {
             title: "Works in 8 Languages",
             subtitle: "Go global without the headache.",
             description: "The job market is global, and so are you. Whether you're applying for a role in Berlin, Tokyo, or Sao Paulo, we've got you covered. Instantly translate your resume and cover letter into 8 major languages while maintaining professional formatting and ATS optimization.",
             icon: Globe,
             benefits: [
                 "Instant translation to Spanish, French, German, Hindi, Portuguese, Japanese, Korean",
                 "Maintain ATS-friendly formatting across languages",
                 "Localized keyword optimization",
                 "Expand your job search to international markets"
             ],
             problemTitle: "Applying abroad is a formatting nightmare.",
             problemDesc: "Translating a resume isn't just about words. It's about layout, tone, and keywords. Google Translate messes up your formatting and makes you sound unnatural. Hiring professional translators is expensive and slow.",
             solutionTitle: "Native-level translation, instantly.",
             solutionDesc: "We translate your entire resume and cover letter while keeping the hidden ATS code intact. We ensure the keywords match the local language's equivalent for that job title. It's like having a native speaker rewrite your resume in seconds.",
             howItWorksSteps: [
                 { title: "Choose Language", desc: "Select from English, Spanish, French, German, Hindi, Portuguese, Japanese, or Korean." },
                 { title: "AI Translation", desc: "We translate the content while preserving professional tone and industry terms." },
                 { title: "Download", desc: "Get a perfectly formatted PDF in the new language, ready to apply." }
             ]
         }
     };

     const feature = features[featureId as keyof typeof features];
     if (feature) {
         return (
             <Suspense fallback={<LoadingFallback />}>
                 <FeaturePage 
                    {...feature} 
                    onBack={() => { setView('landing'); window.history.pushState({}, '', '/'); }}
                    onCtaClick={() => handleLandingStart('scan')}
                    onNavigate={(target) => {
                         if (target === 'blog') handleLandingStart('blog');
                         else if (target === 'roast') handleLandingStart('roast');
                         else handleLandingStart('scan'); // default
                    }}
                 />
             </Suspense>
         );
     }
  }

  if (view === 'legal' && legalPage) return <Suspense fallback={<LoadingFallback />}><LegalPages page={legalPage} onBack={() => { setView('landing'); window.history.pushState({}, '', '/'); }} /></Suspense>;

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
      
      {/* Payment Success Toast */}
      {showPaymentSuccess && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-3 bg-green-600 text-white text-sm font-bold rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2">
              <CheckCircle className="w-5 h-5" />
              <span>Payment successful! Premium features unlocked.</span>
          </div>
      )}

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950">
         {/* HEADER */}
         <header className="h-14 sm:h-16 border-b border-white/5 bg-zinc-950 flex items-center justify-between px-3 sm:px-6 shrink-0 safe-area-inset">
             <div className="cursor-pointer touch-target flex items-center" onClick={() => { setView('landing'); window.history.pushState({}, '', '/'); }}><AnimatedLogo /></div>
             
             <div className="flex items-center gap-2 sm:gap-4">
                 <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg">
                    <Globe className="w-3.5 h-3.5 text-zinc-500" />
                    <select 
                        value={appLanguage}
                        onChange={(e) => setAppLanguage(e.target.value)}
                        className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer"
                    >
                        {["English", "Spanish", "French", "German", "Hindi", "Portuguese", "Japanese", "Korean", "Arabic"].map(lang => (
                            <option key={lang} value={lang} className="bg-zinc-900">{lang}</option>
                        ))}
                    </select>
                 </div>
                 {isPaid && (
                     <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                         <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                         <span className="text-xs font-bold text-green-500 uppercase tracking-wider">Premium</span>
                     </div>
                 )}
                 <button onClick={startNewScan} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white text-xs font-bold rounded shadow-lg shadow-orange-900/20 transition-all touch-target">
                     <Plus className="w-3.5 h-3.5" /> <span className="hidden xs:inline">New Scan</span>
                 </button>
             </div>
         </header>

         {/* CONTENT */}
         <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
             
             {/* --- SCAN WIZARD & RESULTS --- */}
             {isVerifyingPayment && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-white mb-1">Verifying Payment...</h3>
                            <p className="text-zinc-400 text-sm">Please do not close this window.</p>
                        </div>
                    </div>
                </div>
             )}

             {dashboardView === 'scan' && (
                 <div className="max-w-4xl mx-auto h-full flex flex-col items-center justify-center px-2 sm:px-0">
                     {isAnalyzing ? (
                        <div className="text-center px-4">
                            <div className="relative w-24 sm:w-32 h-24 sm:h-32 mx-auto mb-6 sm:mb-8">
                                <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping opacity-20"></div>
                                <div className="relative w-full h-full bg-zinc-900 border border-zinc-700 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(249,115,22,0.3)]">
                                    <Radar className="w-12 sm:w-16 h-12 sm:h-16 text-orange-500 animate-[spin_3s_linear_infinite]" />
                                </div>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                                {analysisProgress < 30 ? "Analyzing Resume..." : 
                                 analysisProgress < 60 ? "Extracting Skills..." :
                                 analysisProgress < 85 ? "Comparing with Job..." : 
                                 "Finalizing Insights..."}
                            </h2>
                            <p className="text-zinc-500 font-mono text-xs">{Math.round(analysisProgress)}% COMPLETE</p>
                        </div>
                     ) : (
                         <div className="w-full space-y-6 sm:space-y-8">
                            <div className="text-center"><h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">New Analysis</h1><p className="text-zinc-400 text-sm">Step {inputWizardStep + 1} of 2</p></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 min-h-[350px] sm:h-[400px]">
                                <div className={`flex flex-col h-full ${inputWizardStep === 1 ? 'hidden md:flex' : ''}`}>
                                    <h3 className="text-xs font-bold text-zinc-500 uppercase mb-3">1. Select Resume</h3>
                                    <div className="flex-1 overflow-hidden h-full min-h-[250px]">
                                        <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>}>
                                          <ResumeUploader onFileUpload={handleFileUpload} currentFile={resumeFile} />
                                        </Suspense>
                                    </div>
                                    <div className="md:hidden mt-4"><button onClick={() => setInputWizardStep(1)} disabled={!resumeFile} className="w-full py-3.5 bg-zinc-800 text-white rounded font-bold touch-target active:bg-zinc-700 disabled:opacity-50">Next</button></div>
                                </div>
                                <div className={`flex flex-col h-full ${inputWizardStep === 0 ? 'hidden md:flex' : ''}`}>
                                     <div className="md:hidden mb-2"><button onClick={() => setInputWizardStep(0)} className="text-zinc-500 py-2 touch-target">← Back</button></div>
                                     <h3 className="text-xs font-bold text-zinc-500 uppercase mb-3">2. Job Details</h3>
                                     <div className="flex gap-2 mb-3 bg-zinc-900 p-1 rounded-lg border border-zinc-800 self-start">
                                        <button onClick={() => setJobInputMode('link')} className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-bold transition-colors touch-target ${jobInputMode === 'link' ? 'bg-orange-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}><LinkIcon className="w-3 h-3" /> Link</button>
                                        <button onClick={() => setJobInputMode('text')} className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-bold transition-colors touch-target ${jobInputMode === 'text' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}><FileText className="w-3 h-3" /> Text</button>
                                     </div>
                                     <div className="flex-1 min-h-[200px]">{jobInputMode === 'link' ? (<div className="h-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-6 flex flex-col justify-center gap-4"><div className="text-center"><div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3"><LinkIcon className="w-6 h-6 text-orange-500" /></div><h4 className="text-white font-bold text-sm">Paste Job URL</h4><p className="text-zinc-500 text-xs">LinkedIn, Indeed, etc.</p></div><input type="url" inputMode="url" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="https://..." className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm text-white focus:border-orange-500 outline-none" /></div>) : (<textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste job description..." className="w-full h-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-5 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600 resize-none font-mono min-h-[200px]" />)}</div>
                                </div>
                            </div>
                            {error && <div className="p-3 sm:p-4 bg-red-950/20 border border-red-900/30 rounded-lg flex items-start gap-3 text-red-400 text-sm"><AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /> <span>{error}</span></div>}
                            <div className="flex justify-end pb-4"><button onClick={handleAnalysis} disabled={!resumeFile || isAnalyzing} className="w-full sm:w-auto px-8 py-3.5 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-bold rounded shadow-lg disabled:opacity-50 disabled:cursor-not-allowed touch-target">Start Analysis</button></div>
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
                              <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>}>
                                <AnalysisDashboard result={analysisResult} onUpdateProfile={handleUpdateAnalysisProfile} />
                              </Suspense>
                            </ErrorBoundary>
                          </div>
                        ) : (
                          <ErrorBoundary>
                            <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>}>
                              <ContentGenerator 
                                resumeFile={resumeFile}
                                resumeText={resumeText}
                                jobDescription={jobDescription} 
                                analysis={analysisResult} 
                                isPaid={isPaid} 
                                onPaymentSuccess={() => { setIsPaid(true); savePaymentState(true); }} 
                                appLanguage={appLanguage} 
                                setAppLanguage={setAppLanguage} 
                              />
                            </Suspense>
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
