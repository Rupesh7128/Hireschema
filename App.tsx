import React, { useState, useEffect, lazy, Suspense } from 'react';
import { 
    Plus, Link as LinkIcon, FileText, AlertCircle, Radar, 
    CheckCircle, Search, Sparkles, BrainCircuit, GraduationCap, Globe,
    History, X, ArrowRight, Zap, Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingIndicator } from './components/LoadingIndicator';
import { FileData, AnalysisResult, HistoryItem, ContactProfile } from './types';
import { analyzeResume, extractResumeTextWithFallback, fetchJobDescriptionContent } from './services/geminiService';
import { db } from './services/db';
import { logEvent, logPageView } from './services/analytics';
import { verifyDodoPayment, savePaymentState, isIdPaid } from './services/paymentService';
import { restoreStateAfterPayment, clearPersistedState } from './services/stateService';
import { AnimatedLogo } from './components/AnimatedLogo';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { WhatsAppSupport } from './components/WhatsAppSupport';

// Lazy load heavy components for better initial load performance
const ResumeUploader = lazy(() => import('./components/ResumeUploader'));
const AnalysisDashboard = lazy(() => import('./components/AnalysisDashboard'));
const Editor = lazy(() => import('./components/Editor'));
const LandingPage = lazy(() => import('./components/LandingPage'));
const LegalPages = lazy(() => import('./components/LegalPages'));
const RoastPage = lazy(() => import('./components/RoastPage'));
const BlogPage = lazy(() => import('./components/BlogPage'));
const FeaturePage = lazy(() => import('./components/FeaturePage'));
const PricingPage = lazy(() => import('./components/PricingPage'));
const WhatIsHireschemaPage = lazy(() => import('./components/WhatIsHireschemaPage'));

// --- CONSTANTS ---
const FEATURES_DATA = {
  'missing-keywords': {
      title: "Find Missing Keywords",
      subtitle: "The secret reason your resume is getting rejected.",
      description: "Most resumes get rejected because they don't match the specific language of the job description. ATS software scans for exact keyword matches. If you say 'customer service' but the job wants 'client success', you might get filtered out. Our tool compares your resume against the job posting and highlights exactly which keywords you are missing, so you can add them instantly.",
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
      description: "Walk into your interview with confidence. We analyze the job description to predict the most likely interview questions you' face. But we don't stop there — we also provide sample answers based on your actual resume experience, helping you frame your stories to prove you're the right hire.",
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

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen bg-zinc-950">
    <LoadingIndicator message="Loading Experience..." size="lg" />
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
          <div className="max-w-lg p-6 rounded-xl border border-orange-900/40 bg-orange-950/20 text-orange-300">
            <h2 className="text-xl font-bold mb-2 text-orange-400">Something went wrong</h2>
            <p className="text-sm">{this.state.message}</p>
            <button onClick={() => this.setState({ hasError: false, message: '' })} className="mt-4 px-4 py-2 bg-zinc-800 text-white rounded">Try again</button>
          </div>
        </div>
      );
    }
    return this.props.children || null;
  }
}

export default function App() {
  // --- URL PARAMS (Pre-render check for smoother routing) ---
  const searchParams = new URLSearchParams(window.location.search);
  const hasPaymentCallback = !!(
    searchParams.get('paymentId') || 
    searchParams.get('payment_id') || 
    searchParams.get('session_id') ||
    searchParams.get('session') ||
    searchParams.get('checkout_session') ||
    searchParams.get('id')
  );

  // --- VIEWS ---
  const [view, setView] = useState<'landing' | 'dashboard' | 'legal' | 'roast' | 'blog' | 'feature' | 'pricing' | 'changelog' | 'success-stories' | 'what-is-hireschema'>(() => {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const hasPayment = !!(
      searchParams.get('paymentId') || 
      searchParams.get('payment_id') || 
      searchParams.get('session_id') ||
      searchParams.get('session') ||
      searchParams.get('checkout_session') ||
      searchParams.get('id')
    );

    if (hasPayment) return 'dashboard';
    if (path === '/app') return 'dashboard';
    if (['/privacy', '/terms', '/cookies'].includes(path)) return 'legal';
    if (path === '/roast' || path === '/roast-my-resume') return 'roast';
    if (path === '/pricing') return 'pricing';
    if (path === '/what-is-hireschema') return 'what-is-hireschema';
    if (path.startsWith('/feature/')) return 'feature';
    if (path.startsWith('/blog')) return 'blog';
    if (path === '/changelog') return 'changelog';
    if (path === '/success-stories') return 'success-stories';
    return 'landing';
  });

  const [legalPage, setLegalPage] = useState<'privacy' | 'terms' | 'cookies' | null>(() => {
    const path = window.location.pathname;
    if (['/privacy', '/terms', '/cookies'].includes(path)) return path.substring(1) as any;
    return null;
  });

  const [dashboardView, setDashboardView] = useState<'scan' | 'result'>('scan');
  const [blogSlug, setBlogSlug] = useState<string | null>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/blog')) {
      const slug = path.replace(/^\/blog\/?/, '');
      return slug || null;
    }
    return null;
  });

  const [featureId, setFeatureId] = useState<string | null>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/feature/')) return path.replace('/feature/', '');
    return null;
  });

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
  const [isPaid, setIsPaid] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  
  // Effect to update isPaid state when the selected history item changes
  useEffect(() => {
      setIsPaid(isIdPaid(selectedHistoryId));
  }, [selectedHistoryId]);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [appLanguage, setAppLanguage] = useState("English");

  // --- INIT ---
  useEffect(() => {
    const initData = async () => {
        try {
            const [h, p] = await Promise.all([
                db.history.getAll(),
                db.user.get()
            ]);
            setHistory(h);
            setProfile(p);
            return h;
        } catch (e) {
            console.error('Failed to load initial data:', e);
            return [];
        }
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
            setIsVerifyingPayment(true);
            
            try {
                // Helper to restore user state after successful payment
                const restoreUserState = (): string | null => {
                    console.log('=== restoreUserState called ===');
                    
                    // First try to restore from persisted state (saved before redirect)
                    const persistedState = restoreStateAfterPayment();
                    
                    if (persistedState) {
                        console.log('Restoring from persisted state, navigating to editor...');
                        
                        // Set all state in sequence to ensure proper updates
                        setResumeFile(persistedState.resumeFile);
                        setResumeText(persistedState.resumeText || '');
                        setJobDescription(persistedState.jobDescription);
                        setAnalysisResult(persistedState.analysisResult);
                        setSelectedHistoryId(persistedState.analysisId || null);
                        
                        // CRITICAL: Set dashboard view to 'result' and tab to 'generator' (Editor)
                        setDashboardView('result');
                        setResultTab('generator');
                        
                        // If it's paid, ensure the UI reflects it
                        if (persistedState.analysisId && isIdPaid(persistedState.analysisId)) {
                            setIsPaid(true);
                        }

                        clearPersistedState(); // Clean up after restore
                        console.log('State restored - dashboardView=result, resultTab=generator');
                        return persistedState.analysisId || null;
                    }
                    
                    // Fallback to history if no persisted state
                    if (h.length > 0) {
                        const mostRecent = h[0];
                        setResumeFile(mostRecent.resumeFile);
                        setResumeText(mostRecent.resumeText || '');
                        setJobDescription(mostRecent.jobDescription);
                        setAnalysisResult(mostRecent.analysisResult);
                        setDashboardView('result');
                        setResultTab('generator');
                        setSelectedHistoryId(mostRecent.id);
                        return mostRecent.id;
                    }
                    
                    setDashboardView('scan');
                    return null;
                };

                // Helper to mark payment as successful
                const markPaymentSuccess = () => {
                    const restoredId = restoreUserState();
                    const idToMark = selectedHistoryId || restoredId;

                    if (idToMark) {
                        savePaymentState(idToMark);
                        setIsPaid(true);
                    }

                    logEvent('payment_success_auto', { paymentId });
                    window.history.replaceState({}, '', '/app');
                    setShowPaymentSuccess(true);
                    setTimeout(() => setShowPaymentSuccess(false), 4000);
                };

                // Initial verification attempt
                let res = await verifyDodoPayment(paymentId);
                
                if (res.ok && res.isPaid) {
                    markPaymentSuccess();
                } else if (redirectLooksSuccessful) {
                    const retryDelays = [2000, 4000, 8000];
                    let verified = false;
                    
                    for (let i = 0; i < retryDelays.length && !verified; i++) {
                        await new Promise(r => setTimeout(r, retryDelays[i]));
                        res = await verifyDodoPayment(paymentId);
                        
                        if (res.ok && res.isPaid) {
                            verified = true;
                            markPaymentSuccess();
                        }
                    }
                    
                    if (!verified) {
                        setError('Payment is being processed. Please wait a moment or check your email for the receipt.');
                    }
                } else {
                    const msg = res.reason || 'Payment verification failed.';
                    setError(`${msg} If you paid, please wait a moment and check your email for the receipt.`);
                }
            } catch (e) {
                console.error('Payment verification error:', e);
                setError('Network error verifying payment.');
            } finally {
                setIsVerifyingPayment(false);
            }
        }
    };
    
    initRoute();
  }, []); // Run once on mount

  // Separate effect for page views
  useEffect(() => {
    logPageView(view);
  }, [view]);

  // --- ACTIONS ---

  const handleFileUpload = async (file: FileData | null) => {
    setResumeFile(file);
    if (file && file.type === 'application/pdf') {
      try {
        const text = await extractResumeTextWithFallback(file);
        setResumeText(text);
      } catch (e) {
        console.error('Failed to extract text from PDF:', e);
        setResumeText('');
      }
    } else {
      setResumeText('');
    }
  };

  const handleLandingStart = async (intent: 'landing' | 'scan' | 'optimize' | 'launch' | 'roast' | 'blog' | 'feature' | 'pricing' | 'changelog' | 'success-stories' | 'what-is-hireschema', file?: FileData, featureSlug?: string) => {
    if (intent === 'landing') {
      setView('landing');
      window.history.pushState({}, '', '/');
      window.scrollTo(0, 0);
      return;
    }

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

    if (intent === 'what-is-hireschema') {
      setView('what-is-hireschema');
      window.history.pushState({}, '', '/what-is-hireschema');
      window.scrollTo(0, 0);
      return;
    }

    if (intent === 'changelog') {
      setView('changelog');
      window.history.pushState({}, '', '/changelog');
      return;
    }

    if (intent === 'success-stories') {
      setView('success-stories');
      window.history.pushState({}, '', '/success-stories');
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
      // Scrape JD if it's a URL
      let finalJobDescription = jobDescription;
      if (jobDescription.trim().startsWith('http')) {
          const url = jobDescription.trim();
          console.log('[App] Job Description is a URL, attempting to scrape content...');
          const scraped = await fetchJobDescriptionContent(url);
          if (scraped) {
              finalJobDescription = `${url}\n\n${scraped}`;
              console.log('[App] Successfully scraped JD content. Length:', finalJobDescription.length);
          } else {
              console.warn('[App] JD scraping failed or returned empty. Falling back to URL.');
              finalJobDescription = url;
          }
      }

      const result = await analyzeResume(resumeFile, finalJobDescription);
      setAnalysisResult(result);
      
      const newItem: HistoryItem = {
          id: Math.random().toString(36).substring(2, 11),
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          jobTitle: result.jobTitle || 'General Application',
          company: result.company || 'Unknown Company',
          atsScore: result.atsScore,
          status: 'To Do',
          resumeFile,
          resumeText,
          jobDescription: finalJobDescription, // Save the actual content (scraped or text)
          analysisResult: result
      };
      
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
          
          const historyItem = history.find(h => h.id === selectedHistoryId);
          if (historyItem) {
              await db.history.update({ ...historyItem, analysisResult: updatedResult });
              setHistory(await db.history.getAll());
          }
          
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

  const [showHistory, setShowHistory] = useState(false);

  return (
    <ErrorBoundary>
      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Suspense fallback={<LoadingFallback />}><LandingPage onStart={handleLandingStart} /></Suspense>
          </motion.div>
        )}
        {view === 'roast' && (
          <motion.div key="roast" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Suspense fallback={<LoadingFallback />}><RoastPage onNavigate={handleNav} appLanguage={appLanguage} /></Suspense>
          </motion.div>
        )}
        {view === 'pricing' && (
          <motion.div key="pricing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Suspense fallback={<LoadingFallback />}><PricingPage onBack={() => { setView('landing'); window.history.pushState({}, '', '/'); }} onStart={handleNav} /></Suspense>
          </motion.div>
        )}
        {view === 'what-is-hireschema' && (
          <motion.div key="what-is-hireschema" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Suspense fallback={<LoadingFallback />}>
              <WhatIsHireschemaPage
                onBack={() => { setView('landing'); window.history.pushState({}, '', '/'); }}
                onStart={handleNav}
              />
            </Suspense>
          </motion.div>
        )}
        {view === 'blog' && (
          <motion.div key="blog" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Suspense fallback={<LoadingFallback />}><BlogPage onBack={() => { setView('landing'); window.history.pushState({}, '', '/'); }} initialSlug={blogSlug} onNavigate={handleNav} /></Suspense>
          </motion.div>
        )}
        {view === 'legal' && legalPage && (
          <motion.div key="legal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Suspense fallback={<LoadingFallback />}><LegalPages page={legalPage} onBack={() => { setView('landing'); window.history.pushState({}, '', '/'); }} /></Suspense>
          </motion.div>
        )}
        {view === 'feature' && featureId && (
          <motion.div key="feature" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Suspense fallback={<LoadingFallback />}>
               {/* Inline Feature Logic */}
               {(() => {
                  const feature = (FEATURES_DATA as any)[featureId];
                  if (!feature) return null;
                  return (
                    <FeaturePage 
                      {...feature} 
                      onBack={() => { setView('landing'); window.history.pushState({}, '', '/'); }}
                      onCtaClick={() => handleLandingStart('scan')}
                      onNavigate={(target) => {
                           if (target === 'blog') handleLandingStart('blog');
                           else if (target === 'roast') handleLandingStart('roast');
                           else handleLandingStart('scan');
                      }}
                    />
                  );
               })()}
            </Suspense>
          </motion.div>
        )}
        {view === 'changelog' && (
          <motion.div key="changelog" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-black text-white">
            <Header onNavigate={handleLandingStart} />
            <main className="pt-32 px-6 max-w-4xl mx-auto">
              <h1 className="text-4xl font-bold mb-8">Changelog</h1>
              <div className="space-y-12">
                <div className="border-l-2 border-orange-500 pl-6 relative">
                  <div className="absolute w-3 h-3 bg-orange-500 rounded-full -left-[7px] top-1"></div>
                  <div className="text-sm text-zinc-500 font-mono mb-2">January 31, 2026</div>
                  <h3 className="text-xl font-bold mb-4">V2.0 - The AI Transformation</h3>
                  <ul className="list-disc list-inside space-y-2 text-zinc-400">
                    <li>Complete redesign of the landing page and dashboard</li>
                    <li>New AI-powered Resume Roast engine</li>
                    <li>Unified button styles and premium tech aesthetic</li>
                    <li>Improved ATS scanning accuracy by 40%</li>
                    <li>Added multilingual support for 8 languages</li>
                  </ul>
                </div>
              </div>
            </main>
            <Footer onNavigate={handleLandingStart} />
          </motion.div>
        )}
        {view === 'success-stories' && (
          <motion.div key="success-stories" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-black text-white">
            <Header onNavigate={handleLandingStart} />
            <main className="pt-32 px-6 max-w-6xl mx-auto">
              <h1 className="text-4xl font-bold mb-4 text-center">Success Stories</h1>
              <p className="text-zinc-500 text-center mb-16 max-w-2xl mx-auto">Join thousands of professionals who have transformed their careers with HireSchema.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                  { name: "Sarah J.", role: "Senior Frontend Engineer", company: "Google", quote: "HireSchema's scan revealed that I was missing key cloud-native terms. Fixed it, and got an interview at Google within a week." },
                  { name: "Michael R.", role: "Product Manager", company: "Stripe", quote: "The Resume Roast was brutal but necessary. It pointed out exactly why I was getting ghosted. Now I'm at my dream company." },
                  { name: "Elena K.", role: "UX Designer", company: "Airbnb", quote: "The interview prep feature gave me the confidence I needed. The STAR method breakdown was a game changer." }
                ].map((story, i) => (
                  <div key={i} className="bg-zinc-900/50 border border-white/5 p-8 rounded-2xl hover:border-orange-500/30 transition-all">
                    <div className="text-orange-500 mb-6 font-bold">5/5 Rating</div>
                    <p className="text-zinc-300 italic mb-8 italic">"{story.quote}"</p>
                    <div>
                      <div className="font-bold text-white">{story.name}</div>
                      <div className="text-xs text-zinc-500">{story.role} @ {story.company}</div>
                    </div>
                  </div>
                ))}
              </div>
            </main>
            <Footer onNavigate={handleLandingStart} />
          </motion.div>
        )}
        {view === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-screen bg-black text-zinc-100 overflow-hidden font-sans w-full relative selection:bg-orange-500/30">
            
            {/* AMBIENT BACKGROUND */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-600/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />

            {/* HISTORY SIDEBAR */}
            <AnimatePresence>
              {showHistory && (
                <>
                    <motion.div 
                        key="history-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowHistory(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                    />
                    <motion.div 
                        key="history-sidebar"
                        initial={{ x: -300 }}
                        animate={{ x: 0 }}
                        exit={{ x: -300 }}
                        className="fixed inset-y-0 left-0 w-[300px] bg-zinc-950/90 backdrop-blur-xl border-r border-white/5 flex flex-col shadow-2xl z-[61]"
                    >
                        <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Scan History</h2>
                            <button onClick={() => setShowHistory(false)} className="p-1 rounded-md hover:bg-white/10 text-zinc-500 hover:text-white transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {history.length === 0 ? (
                                <div className="text-center py-12 px-4 border border-dashed border-white/5 rounded-xl">
                                    <History className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                                    <p className="text-zinc-500 text-xs font-medium">No history yet. Start your first scan!</p>
                                </div>
                            ) : (
                                history.map((item) => {
                                    const isSelected = selectedHistoryId === item.id;
                                    const paid = isIdPaid(item.id);
                                    return (
                                        <button 
                                            key={item.id}
                                            onClick={async () => {
                                                setSelectedHistoryId(item.id);
                                                setResumeFile(item.resumeFile);
                                                const storedText = item.resumeText || '';
                                                if (storedText.trim().length >= 120) {
                                                    setResumeText(storedText);
                                                } else {
                                                    setResumeText('');
                                                    try {
                                                        const extracted = await extractResumeTextWithFallback(item.resumeFile);
                                                        setResumeText(extracted);
                                                    } catch {
                                                        setResumeText(storedText);
                                                    }
                                                }
                                                setJobDescription(item.jobDescription);
                                                setAnalysisResult(item.analysisResult);
                                                setDashboardView('result');
                                                setResultTab('analysis');
                                                setShowHistory(false);
                                            }}
                                            className={`w-full text-left p-4 rounded-xl border transition-all group relative overflow-hidden ${isSelected ? 'bg-orange-500/10 border-orange-500/40' : 'bg-white/5 border-transparent hover:border-white/10 hover:bg-white/10'}`}
                                        >
                                            <div className="flex justify-between items-start mb-2 relative z-10">
                                                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">{item.date}</span>
                                                {paid && (
                                                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/20 border border-orange-500/30 rounded text-[10px] font-black text-orange-400 uppercase tracking-wider shadow-[0_0_10px_rgba(249,115,22,0.2)]">
                                                        PAID
                                                    </div>
                                                )}
                                            </div>
                                            <h4 className={`text-sm font-bold leading-tight break-words mb-1 relative z-10 ${isSelected ? 'text-white' : 'text-zinc-200 group-hover:text-white'}`}>{item.jobTitle}</h4>
                                            <p className="text-xs text-zinc-500 leading-tight break-words mb-3 relative z-10">{item.company}</p>
                                            <div className="flex items-center justify-between relative z-10">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-1 w-12 bg-zinc-800 rounded-full overflow-hidden">
                                                        <div className="h-full bg-orange-500" style={{ width: `${item.atsScore}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-mono text-zinc-400">{item.atsScore}%</span>
                                                </div>
                                                <ArrowRight className={`w-3 h-3 transition-transform ${isSelected ? 'text-orange-500' : 'text-zinc-600 group-hover:translate-x-1 group-hover:text-zinc-300'}`} />
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* GLOBAL OVERLAY: Payment Verification */}
            {isVerifyingPayment && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center">
                    <div className="bg-zinc-900/50 border border-white/10 p-8 rounded-3xl backdrop-blur-md shadow-2xl flex flex-col items-center">
                        <LoadingIndicator message="Verifying Payment..." size="lg" />
                    </div>
                </div>
            )}
            
            {/* Payment Success Toast */}
            {showPaymentSuccess && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-xl text-emerald-400 text-sm font-bold rounded-full shadow-2xl animate-in fade-in slide-in-from-top-4">
                    <CheckCircle className="w-5 h-5" />
                    <span>Payment successful! Premium features unlocked.</span>
                </div>
            )}

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col min-w-0 z-10 relative">
               {/* HEADER */}
               <header className="h-16 border-b border-white/5 bg-black/20 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-20 sticky top-0">
                   <div className="cursor-pointer touch-target flex items-center gap-4" onClick={() => { 
                       setView('landing'); 
                       window.history.pushState({}, '', '/');
                       window.scrollTo(0, 0);
                   }}>
                        <AnimatedLogo />
                   </div>
                   
                   <div className="flex items-center gap-3 sm:gap-6">
                       <button 
                          onClick={() => setShowHistory(true)}
                          className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-all"
                          title="View History"
                       >
                          <History className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 group-hover:text-white transition-colors hidden sm:inline-block">History</span>
                       </button>
                       
                       <div className="h-6 w-[1px] bg-white/10 mx-2 hidden sm:block"></div>

                       {isPaid && (
                           <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.1)]">
                               <Sparkles className="w-3 h-3 text-orange-400" />
                               <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Premium Active</span>
                           </div>
                       )}
                       <a 
                          href="/app"
                          onClick={(e) => {
                              if (e.metaKey || e.ctrlKey) return;
                              e.preventDefault();
                              startNewScan();
                          }} 
                          className="group relative flex items-center gap-2 px-5 py-2.5 bg-zinc-100 hover:bg-white text-black font-bold text-xs uppercase tracking-wide transition-all rounded-full cursor-pointer shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                       >
                           <Plus className="w-4 h-4" />
                           <span className="hidden xs:inline">New Scan</span>
                       </a>
                   </div>
               </header>

               {/* CONTENT */}
               <main className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8 relative">
                   <AnimatePresence mode="wait">
                       {dashboardView === 'scan' ? (
                           <motion.div 
                              key="scan-view"
                              initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                              exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
                              className="max-w-5xl mx-auto w-full min-h-[70vh] flex flex-col items-center justify-center"
                           >
                               {isAnalyzing ? (
                                 <div className="w-full max-w-lg mx-auto bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
                                      <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent pointer-events-none" />
                                      <LoadingIndicator 
                                          message={analysisProgress < 30 ? "Reading Resume..." : 
                                                   analysisProgress < 60 ? "Extracting Skills..." :
                                                   analysisProgress < 85 ? "Analyzing Gaps..." : 
                                                   "Generating Report..."}
                                          size="lg"
                                      />
                                      <div className="w-full h-1 bg-zinc-800 rounded-full mt-8 overflow-hidden">
                                        <motion.div 
                                            className="h-full bg-orange-500" 
                                            initial={{ width: 0 }} 
                                            animate={{ width: `${analysisProgress}%` }} 
                                        />
                                      </div>
                                      <p className="text-zinc-500 font-mono text-xs mt-4 tracking-widest">{Math.round(analysisProgress)}% COMPLETE</p>
                                  </div>
                               ) : (
                                   <div className="w-full space-y-12">
                                      <div className="text-center space-y-4">
                                          <motion.div 
                                            initial={{ y: -20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2"
                                          >
                                            <Zap className="w-3 h-3 text-orange-500" />
                                            <span>AI-Powered Resume Scanner</span>
                                          </motion.div>
                                          <h1 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-500 tracking-tight">
                                              Optimize Your Application
                                          </h1>
                                          <p className="text-zinc-400 text-sm sm:text-base font-medium max-w-lg mx-auto leading-relaxed">
                                              Upload your resume and the job description. We'll identify the gaps and help you fix them instantly.
                                          </p>
                                      </div>
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch relative">
                                          {/* Connecting Line (Desktop) */}
                                          <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-zinc-900 rounded-full border border-white/10 z-20 flex items-center justify-center shadow-xl">
                                            <ArrowRight className="w-5 h-5 text-zinc-600" />
                                          </div>

                                          {/* Step 1: Resume */}
                                          <motion.div 
                                            initial={{ x: -20, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{ delay: 0.1 }}
                                            className={`flex flex-col gap-5 group relative p-1 rounded-3xl transition-all duration-500 ${!resumeFile ? 'hover:bg-white/5' : ''}`}
                                          >
                                              <div className="flex items-center gap-4 px-2">
                                                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-sm font-bold text-white shadow-lg group-hover:border-orange-500/50 group-hover:bg-orange-500/20 group-hover:text-orange-500 transition-all">1</div>
                                                  <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest group-hover:text-white transition-colors">Upload Resume</h3>
                                              </div>
                                              
                                              <div className="flex-1 min-h-[280px] bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden group-hover:border-white/20 transition-all shadow-2xl hover:shadow-[0_0_30px_rgba(0,0,0,0.3)]">
                                                  <Suspense fallback={<div className="h-full flex items-center justify-center"><LoadingIndicator size="sm" message="" /></div>}>
                                                    <ResumeUploader onFileUpload={handleFileUpload} currentFile={resumeFile} />
                                                  </Suspense>
                                              </div>
                                          </motion.div>

                                          {/* Step 2: Job Details */}
                                          <motion.div 
                                            initial={{ x: 20, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{ delay: 0.2 }}
                                            className="flex flex-col gap-5 group relative p-1 rounded-3xl"
                                          >
                                               <div className="flex items-center justify-between px-2">
                                                   <div className="flex items-center gap-4">
                                                       <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-sm font-bold text-white shadow-lg group-hover:border-orange-500/50 group-hover:bg-orange-500/20 group-hover:text-orange-500 transition-all">2</div>
                                                       <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest group-hover:text-white transition-colors">Target Job</h3>
                                                   </div>
                                                   
                                                   <div className="flex bg-black/40 p-1 rounded-lg border border-white/10 backdrop-blur-md">
                                                      <button 
                                                          onClick={() => setJobInputMode('link')} 
                                                          className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${jobInputMode === 'link' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                      >
                                                          Link
                                                      </button>
                                                      <button 
                                                          onClick={() => setJobInputMode('text')} 
                                                          className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${jobInputMode === 'text' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                      >
                                                          Text
                                                      </button>
                                                   </div>
                                               </div>

                                               <div className="flex-1 min-h-[280px] bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden group-hover:border-white/20 transition-all shadow-2xl hover:shadow-[0_0_30px_rgba(0,0,0,0.3)] flex flex-col">
                                                   {jobInputMode === 'link' ? (
                                                       <div className="flex-1 p-8 flex flex-col justify-center items-center gap-6 text-center relative">
                                                           <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                           <div className="w-12 h-12 rounded-2xl bg-zinc-800/50 border border-white/10 flex items-center justify-center relative z-10 shadow-inner">
                                                               <LinkIcon className="w-5 h-5 text-zinc-400 group-hover:text-orange-500 transition-colors" />
                                                           </div>
                                                           <div className="relative z-10">
                                                               <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-2">Paste Job Link</h4>
                                                               <p className="text-zinc-500 text-xs font-medium leading-relaxed max-w-[200px] mx-auto">LinkedIn, Indeed, or any company career page.</p>
                                                           </div>
                                                           <div className="w-full relative z-10">
                                                               <input 
                                                                   type="url" 
                                                                   inputMode="url" 
                                                                   value={jobDescription} 
                                                                   onChange={(e) => setJobDescription(e.target.value)} 
                                                                   placeholder="https://..." 
                                                                   className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-zinc-700 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 outline-none transition-all font-mono shadow-inner" 
                                                               />
                                                           </div>
                                                       </div>
                                                   ) : (
                                                       <textarea 
                                                           value={jobDescription} 
                                                           onChange={(e) => setJobDescription(e.target.value)} 
                                                           placeholder="Paste the full job description here..." 
                                                           className="w-full h-full bg-transparent p-6 text-sm text-zinc-300 placeholder:text-zinc-700 focus:outline-none resize-none font-mono leading-relaxed" 
                                                       />
                                                   )}
                                               </div>
                                          </motion.div>
                                      </div>

                                      {error && (
                                          <motion.div 
                                              initial={{ opacity: 0, y: 5 }}
                                              animate={{ opacity: 1, y: 0 }}
                                              className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-bold uppercase tracking-widest max-w-lg mx-auto backdrop-blur-md"
                                          >
                                              <AlertCircle className="w-4 h-4 shrink-0" />
                                              <span>{error}</span>
                                          </motion.div>
                                      )}

                                      <div className="flex justify-center pt-6">
                                          <button 
                                              onClick={handleAnalysis} 
                                              disabled={!resumeFile || isAnalyzing || !jobDescription.trim()} 
                                              className="group relative px-10 py-5 bg-white text-black font-black text-sm uppercase tracking-wider rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:hover:scale-100 shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)]"
                                          >
                                              <span className="relative z-10 flex items-center gap-3">
                                                  <span>Run Analysis</span>
                                                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                              </span>
                                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                          </button>
                                      </div>
                                   </div>
                               )}
                           </motion.div>
                       ) : (
                           <motion.div 
                              key="result-view"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              className="h-full flex flex-col max-w-[1400px] mx-auto"
                           >
                               {analysisResult && resumeFile && (
                                   <>
                                      <div className="flex justify-between items-center mb-6">
                                          <div className="flex items-center gap-4">
                                              <h2 className="text-xl font-bold text-white hidden sm:block">Analysis Results</h2>
                                              <div className="bg-black/40 p-1 rounded-full border border-white/10 flex gap-1 backdrop-blur-md">
                                                <button onClick={() => setResultTab('analysis')} className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${resultTab === 'analysis' ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>Diagnostic</button>
                                                <button onClick={() => setResultTab('generator')} className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${resultTab === 'generator' ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>Editor</button>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                              {/* Optional actions */}
                                          </div>
                                      </div>

                                      <div className="flex-1 bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
                                          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
                                          
                                         {resultTab === 'analysis' ? (
                                           <div className="h-full overflow-y-auto p-4 sm:p-8 relative z-10">
                                             <ErrorBoundary>
                                               <Suspense fallback={<div className="flex items-center justify-center h-64"><LoadingIndicator size="md" message="Loading Analysis..." /></div>}>
                                                 <AnalysisDashboard 
                                                   result={analysisResult} 
                                                   onUpdateProfile={handleUpdateAnalysisProfile} 
                                                   onNavigateTab={setResultTab}
                                                   onReScan={startNewScan}
                                                 />
                                               </Suspense>
                                             </ErrorBoundary>
                                           </div>
                                         ) : (
                                           <ErrorBoundary>
                                             <Suspense fallback={<div className="flex items-center justify-center h-64"><LoadingIndicator size="md" message="Loading Editor..." /></div>}>
                                               <Editor 
                                                 analysisId={selectedHistoryId}
                                                 resumeFile={resumeFile}
                                                 resumeText={resumeText}
                                                 jobDescription={jobDescription} 
                                                 analysis={analysisResult}
                                                 isPaid={isPaid}
                                                 onPaymentSuccess={() => {
                                                     if (selectedHistoryId) {
                                                         savePaymentState(selectedHistoryId);
                                                         setIsPaid(true);
                                                     }
                                                 }}
                                                 appLanguage={appLanguage}
                                                 setAppLanguage={setAppLanguage}
                                               />
                                             </Suspense>
                                           </ErrorBoundary>
                                         )}
                                      </div>
                                   </>
                               )}
                           </motion.div>
                       )}
                   </AnimatePresence>
               </main>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <WhatsAppSupport />
    </ErrorBoundary>
  );
}
