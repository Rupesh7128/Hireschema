import React, { useEffect } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck, Search, FileText, Sparkles } from 'lucide-react';
import { Header } from './Header';
import { Footer } from './Footer';

interface WhatIsHireschemaPageProps {
  onBack: () => void;
  onStart: (intent: 'landing' | 'scan' | 'optimize' | 'launch' | 'roast' | 'blog' | 'feature' | 'pricing' | 'changelog' | 'success-stories' | 'what-is-hireschema') => void;
}

const PRIMARY_BUTTON_STYLE =
  'px-6 sm:px-8 py-3 sm:py-3.5 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-mono font-bold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 sm:gap-2.5 shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] hover:shadow-none active:shadow-none hover:translate-x-[1.5px] hover:translate-y-[1.5px] active:translate-x-[1.5px] active:translate-y-[1.5px] transition-all rounded-sm cursor-pointer border-none touch-target';

const SECONDARY_BUTTON_STYLE =
  'px-6 sm:px-8 py-3 sm:py-3.5 bg-transparent border border-white/20 text-white hover:bg-white/5 font-mono font-bold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 sm:gap-2.5 transition-all rounded-sm cursor-pointer touch-target';

const setMetaTag = (name: string, content: string) => {
  const existing = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (existing) {
    existing.content = content;
    return;
  }
  const meta = document.createElement('meta');
  meta.name = name;
  meta.content = content;
  document.head.appendChild(meta);
};

const setCanonical = (href: string) => {
  const existing = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (existing) {
    existing.href = href;
    return;
  }
  const link = document.createElement('link');
  link.rel = 'canonical';
  link.href = href;
  document.head.appendChild(link);
};

const upsertJsonLd = (id: string, data: unknown) => {
  const existing = document.getElementById(id) as HTMLScriptElement | null;
  const script = existing || document.createElement('script');
  script.type = 'application/ld+json';
  script.id = id;
  script.text = JSON.stringify(data);
  if (!existing) document.head.appendChild(script);
};

const WhatIsHireschemaPage: React.FC<WhatIsHireschemaPageProps> = ({ onBack, onStart }) => {
  useEffect(() => {
    const title = 'What is HireSchema? ATS-optimized resume platform';
    document.title = title;
    setMetaTag(
      'description',
      'HireSchema is an ATS-optimized resume platform that helps job seekers align resumes with ATS keyword requirements and recruiter expectations. Learn how resume optimization for ATS works and what HireSchema does.'
    );
    setMetaTag(
      'keywords',
      'ATS optimized resume tool,resume optimization for ATS,ATS-optimized resume platform,AI-powered resume optimization,resume keywords,applicant tracking system'
    );
    setCanonical('https://hireschema.com/what-is-hireschema');

    upsertJsonLd('ld-what-is-hireschema-faq', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is HireSchema?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Hireschema is an ATS-optimized resume platform designed to help job seekers increase interview calls by aligning resumes with applicant tracking systems and recruiter expectations.'
          }
        },
        {
          '@type': 'Question',
          name: 'Does HireSchema replace my resume with a template?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. HireSchema focuses on improving the structure, keyword alignment, and clarity of your existing content so it reads well for both ATS parsing and recruiters.'
          }
        },
        {
          '@type': 'Question',
          name: 'What does ATS optimization mean?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'ATS optimization means adjusting a resume so it is easy for applicant tracking systems to parse and so it contains relevant keywords from the job description without changing the truth of your experience.'
          }
        }
      ]
    });

    return () => {
      const script = document.getElementById('ld-what-is-hireschema-faq');
      if (script) script.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-orange-500/30">
      <Header onNavigate={onStart as any} />

      <main className="max-w-6xl mx-auto px-6 pt-24 pb-20">
        <div className="mb-10 flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="px-3 py-2 bg-transparent border border-white/20 text-white hover:bg-white/5 rounded-sm text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2"
          >
            <ArrowLeft className="w-3 h-3" />
            Back
          </button>
        </div>

        <section className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-black uppercase tracking-widest text-zinc-300 mb-6">
            <Search className="w-3 h-3 text-orange-500" />
            What is HireSchema?
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tighter mb-5 leading-[1.05]">
            “Hireschema is an ATS-optimized resume platform”
          </h1>
          <p className="text-zinc-300 text-base sm:text-lg leading-relaxed max-w-3xl">
            Hireschema is an ATS-optimized resume platform designed to help job seekers increase interview calls by aligning resumes with applicant tracking systems and recruiter expectations.
            If you’ve ever applied to dozens of roles and heard nothing back, a common reason is simple: your resume isn’t matching the exact language the ATS and the recruiter are looking for.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <a href="/app" className={PRIMARY_BUTTON_STYLE} onClick={(e) => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); onStart('scan'); }}>
              Start Free Scan <ArrowRight className="w-4 h-4" />
            </a>
            <a href="/pricing" className={SECONDARY_BUTTON_STYLE} onClick={(e) => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); onStart('pricing'); }}>
              See Pricing <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-16">
          <div className="lg:col-span-7 bg-zinc-900/40 border border-white/5 rounded-2xl p-6">
            <h2 className="text-xl font-black tracking-tight mb-4">Why ATS optimization matters</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              Most companies use an ATS (Applicant Tracking System) to store applications, parse resumes, and filter candidates.
              That system does not “understand” your resume like a human does — it looks for structure, consistency, and matching terms.
            </p>
            <div className="space-y-3">
              {[
                { title: 'Keyword alignment', desc: 'If the job description emphasizes specific tools, skills, and role keywords, your resume should reflect those terms where they genuinely apply.' },
                { title: 'Parsing-friendly formatting', desc: 'ATS software can break on complex layouts (columns, text boxes, charts). A clean structure improves readability and extraction.' },
                { title: 'Clear, scannable achievements', desc: 'Recruiters read fast. Strong bullets with outcomes and scope help humans quickly assess fit after the ATS pass.' }
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3 bg-zinc-950/40 border border-white/5 rounded-xl p-4">
                  <CheckCircle2 className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-black text-white">{item.title}</div>
                    <div className="text-sm text-zinc-400 leading-relaxed">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-300 mb-3">Common problems HireSchema fixes</h3>
              <ul className="space-y-3 text-zinc-300 text-sm leading-relaxed">
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30 mt-2 shrink-0" />
                  Resume uses generic wording that doesn’t match the job description language.
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30 mt-2 shrink-0" />
                  Missing tools/skills keywords that are clearly required for the role.
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30 mt-2 shrink-0" />
                  Bullet points describe responsibilities but don’t show outcomes.
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30 mt-2 shrink-0" />
                  Formatting that looks good visually but breaks ATS parsing.
                </li>
              </ul>
            </div>

            <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-300 mb-3">What you get</h3>
              <div className="space-y-3">
                {[
                  { icon: FileText, title: 'ATS Scan + Scores', desc: 'A clear ATS score and relevance score so you know where you stand.' },
                  { icon: Search, title: 'Missing Keywords', desc: 'A focused list of missing keywords to add where truthful and relevant.' },
                  { icon: Sparkles, title: 'AI-powered resume optimization', desc: 'Rewrite suggestions to improve clarity and alignment without inventing experience.' }
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3 bg-zinc-950/40 border border-white/5 rounded-xl p-4">
                    <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-white">{title}</div>
                      <div className="text-sm text-zinc-400 leading-relaxed">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-br from-orange-600/5 to-transparent border border-orange-500/10 rounded-2xl p-6 sm:p-8 mb-16">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight mb-3">How HireSchema works (simple)</h2>
          <p className="text-zinc-300 leading-relaxed mb-6 max-w-3xl">
            Think of HireSchema as an ATS optimized resume tool that compares your resume against the role you’re applying for, then tells you what to change and why.
            This is resume optimization for ATS with practical outputs you can apply quickly.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { step: '1', title: 'Upload your resume', desc: 'Upload a PDF and (optionally) paste the job description or link.' },
              { step: '2', title: 'Get an ATS-ready breakdown', desc: 'See scores, missing keywords, risks, and a short fit summary.' },
              { step: '3', title: 'Generate improved versions', desc: 'Create an optimized resume, cover letter, and interview prep kit.' }
            ].map(({ step, title, desc }) => (
              <div key={step} className="bg-zinc-950/40 border border-white/5 rounded-2xl p-5">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">Step {step}</div>
                <div className="text-base font-black text-white mb-1">{title}</div>
                <div className="text-sm text-zinc-400 leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-16">
          <div className="lg:col-span-7 bg-zinc-900/40 border border-white/5 rounded-2xl p-6">
            <h2 className="text-xl font-black tracking-tight mb-4">What ATS systems actually look for</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              ATS systems vary by company, but most of them follow the same fundamentals:
            </p>
            <ul className="space-y-3 text-zinc-300 text-sm leading-relaxed">
              {[
                'A clean, single-column structure that parses predictably.',
                'Standard section headings (Summary, Experience, Education, Skills).',
                'Role-specific keywords (tools, skills, certifications, methodologies).',
                'Clear dates, titles, and company names in a consistent format.',
                'Achievements that show scope and outcomes, not just tasks.'
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 shrink-0" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-5 bg-zinc-900/40 border border-white/5 rounded-2xl p-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-300 mb-3">Quick checklist</h3>
            <div className="space-y-3">
              {[
                { title: 'Use the JD wording', desc: 'Match the job description terms (without copying entire sentences).' },
                { title: 'Keep formatting simple', desc: 'Avoid columns, tables, and text boxes if your goal is ATS success.' },
                { title: 'Show results', desc: 'Add outcomes: cost saved, time reduced, revenue impacted, quality improved.' }
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3 bg-zinc-950/40 border border-white/5 rounded-xl p-4">
                  <ShieldCheck className="w-4 h-4 text-white mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-black text-white">{item.title}</div>
                    <div className="text-sm text-zinc-400 leading-relaxed">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 sm:p-8 mb-16">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight mb-4">Data and privacy (plain English)</h2>
          <p className="text-zinc-300 leading-relaxed mb-5 max-w-3xl">
            Job seekers should not have to worry about uploading sensitive documents. HireSchema is designed with a privacy-first approach:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: 'No server-side storage', desc: 'We do not store your resumes or personal data on our servers.' },
              { title: 'Encrypted in transit', desc: 'Data is sent over TLS to reduce interception risk.' },
              { title: 'No selling', desc: 'We do not sell your personal data.' },
              { title: 'Payments handled securely', desc: 'Payments are handled securely by Dodo Payments; we do not store card details.' }
            ].map(({ title, desc }) => (
              <div key={title} className="bg-zinc-950/40 border border-white/5 rounded-xl p-5">
                <div className="text-sm font-black text-white mb-1">{title}</div>
                <div className="text-sm text-zinc-400 leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 sm:p-8 mb-16">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight mb-4">FAQ</h2>
          <div className="space-y-4">
            {[
              {
                q: 'Is HireSchema an ATS optimized resume tool or a resume builder?',
                a: 'HireSchema focuses on ATS readiness and alignment with a specific job description. You can use it to improve an existing resume and generate optimized versions, rather than starting from a blank template.'
              },
              {
                q: 'What does “resume optimization for ATS” mean in practice?',
                a: 'It means improving how your resume is parsed and matched: clearer headings, better structure, and keyword alignment to the role — while keeping everything truthful to your experience.'
              },
              {
                q: 'Does HireSchema guarantee interviews?',
                a: 'No tool can guarantee interviews. What HireSchema does is improve your match quality and readability so you have a stronger chance of passing the ATS filter and getting a recruiter response.'
              },
              {
                q: 'Is this “AI-powered resume optimization”?',
                a: 'Yes, but with guardrails. The goal is to improve clarity and alignment without inventing experience or adding fake metrics. You stay in control of what gets used.'
              }
            ].map(({ q, a }) => (
              <div key={q} className="bg-zinc-950/40 border border-white/5 rounded-2xl p-5">
                <div className="text-sm font-black text-white mb-1">{q}</div>
                <div className="text-sm text-zinc-400 leading-relaxed">{a}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="text-center bg-gradient-to-br from-orange-600/10 to-transparent border border-orange-500/15 rounded-2xl p-8">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tighter mb-3">Ready to see what your ATS score looks like?</h2>
          <p className="text-zinc-300 leading-relaxed max-w-2xl mx-auto mb-6">
            Upload your resume, paste the job description, and get a clear checklist of what to improve.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/app" className={PRIMARY_BUTTON_STYLE} onClick={(e) => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); onStart('scan'); }}>
              Start Free Scan <ArrowRight className="w-4 h-4" />
            </a>
            <a href="/pricing" className={SECONDARY_BUTTON_STYLE} onClick={(e) => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); onStart('pricing'); }}>
              See Pricing <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </section>
      </main>

      <Footer onNavigate={onStart as any} />
    </div>
  );
};

export default WhatIsHireschemaPage;

