import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MoveHorizontal, X, PhoneCall } from 'lucide-react';
import { PdfTemplate } from './PdfTemplate';

const profile = {
    name: "John Doe",
    email: "john.doe@email.com",
    phone: "+1 555 010 9999",
    linkedin: "linkedin.com/in/johndoe",
    location: "New York, NY"
};

// ── BEFORE: weak, vague, unoptimized resume ──────────────────────────────────
const beforeMarkdown = `
## PROFESSIONAL SUMMARY
Hardworking and motivated Operations Manager with experience in retail management. Good at leading teams and solving problems. Looking for a new opportunity to grow professionally.

## EXPERIENCE
### Store Manager | BestBuy | 2019 - 2023 | New York, NY
- Responsible for managing the store and overseeing staff members.
- Helped with sales and made sure customers were satisfied.
- Worked on improving store processes and handled inventory.
- Dealt with day-to-day operational issues as they came up.

### Assistant Manager | Target | 2017 - 2019 | Brooklyn, NY
- Assisted the manager with various tasks.
- Supervised employees and handled scheduling.
- Helped train new staff members.

## SKILLS
Communication, Teamwork, Microsoft Word, Excel, Leadership, Hard Working, Time Management, Customer Service
`.trim();

// ── AFTER: strong, keyword-rich, metric-driven optimized resume ───────────────
const afterMarkdown = `
## PROFESSIONAL SUMMARY
Results-driven Operations Manager with 6+ years driving revenue growth and operational efficiency in high-volume retail. Delivered $50K in annual cost savings and 20% efficiency gains through data-driven process optimization and cross-functional team leadership.

## EXPERIENCE
### Retail Store Manager | BestBuy | 2019 - 2023 | New York, NY
- Led team restructuring initiative that increased sales productivity by **15% YoY**, generating $800K in incremental revenue.
- Managed annual P&L budget of **$1.2M**, consistently achieving under-budget operations with 8% cost reduction.
- Implemented real-time inventory management system, reducing shrinkage by **40%** and cutting stock discrepancies by 60%.
- Coached and developed 30-person team, achieving **92% employee retention** — 18% above company average.

### Assistant Manager | Target | 2017 - 2019 | Brooklyn, NY
- Supervised team of 25 associates across 3 departments, driving **NPS score from 72 to 89** in 12 months.
- Designed onboarding program adopted company-wide, improving new-hire ramp time by **35%**.

## SKILLS
**Operations:** Inventory Management · P&L Ownership · Process Optimization · Workforce Planning
**Tools:** Microsoft Excel · POS Systems · Data Analysis · CRM Software
**Leadership:** Cross-functional Team Leadership · Stakeholder Communication · Performance Coaching
`.trim();

export const ResumeComparison = () => {
    const [sliderPosition, setSliderPosition] = useState(35);
    const [isDragging, setIsDragging] = useState(false);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        setSliderPosition((x / rect.width) * 100);
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const touch = e.touches[0];
        const x = Math.max(0, Math.min(touch.clientX - rect.left, rect.width));
        setSliderPosition((x / rect.width) * 100);
    };

    const ResumePreview = ({ status, content }: { status: 'rejected' | 'accepted'; content: string }) => (
        <div className="w-full h-full bg-white relative overflow-hidden select-none">
            <div className="absolute inset-0 overflow-y-auto scrollbar-hide p-4 sm:p-8">
                <PdfTemplate
                    content={content}
                    profile={profile}
                    mode="preview"
                    type="resume"
                />
            </div>

            {status === 'rejected' ? (
                <>
                    <div className="absolute inset-0 bg-red-500/8 pointer-events-none"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 border-4 border-red-600/60 text-red-600/60 font-black text-2xl sm:text-4xl p-3 sm:p-4 rounded-xl opacity-75 whitespace-nowrap backdrop-blur-sm">
                        REJECTED
                    </div>
                    <div className="absolute bottom-6 left-6 flex gap-2 items-center text-red-700 font-bold bg-white/90 px-3 py-1.5 rounded-lg shadow-lg border border-red-200 opacity-80 scale-90 origin-bottom-left">
                        <X className="w-5 h-5" />
                        <span className="text-xs sm:text-sm">ATS Score: 12/100</span>
                    </div>
                </>
            ) : (
                <>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 border-4 border-green-600/60 text-green-600/60 font-black text-2xl sm:text-4xl p-3 sm:p-4 rounded-xl opacity-75 whitespace-nowrap backdrop-blur-sm">
                        INTERVIEW CALL
                    </div>
                    <div className="absolute bottom-6 right-6 bg-green-600 text-white px-4 py-2 rounded-full text-xs sm:text-sm font-black shadow-xl shadow-green-600/20 flex items-center gap-2 animate-bounce border border-white/20 opacity-90 scale-90 origin-bottom-right">
                        <PhoneCall className="w-4 h-4" />
                        <span>ATS SCORE: 94</span>
                    </div>
                </>
            )}
        </div>
    );

    return (
        <section className="py-20 px-4 bg-zinc-950 border-b border-white/5 overflow-hidden">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-block px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-4"
                    >
                        Transformation
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tighter"
                    >
                        From <span className="text-zinc-600 line-through decoration-red-500 decoration-4">Rejection</span> to <span className="text-orange-500">Interview</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-zinc-400 max-w-lg mx-auto text-sm sm:text-base"
                    >
                        See the difference correctly optimized keywords and formatting make.
                    </motion.p>
                </div>

                <div
                    className="relative w-full aspect-[4/5] sm:aspect-[4/3] md:aspect-[16/9] max-h-[600px] bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl cursor-col-resize select-none touch-none group"
                    onMouseDown={() => setIsDragging(true)}
                    onMouseUp={() => setIsDragging(false)}
                    onMouseLeave={() => setIsDragging(false)}
                    onMouseMove={handleMouseMove}
                    onTouchStart={() => setIsDragging(true)}
                    onTouchEnd={() => setIsDragging(false)}
                    onTouchMove={handleTouchMove}
                >
                    {/* RIGHT SIDE (AFTER — optimized) */}
                    <div className="absolute inset-0 w-full h-full select-none pointer-events-none">
                        <ResumePreview status="accepted" content={afterMarkdown} />
                    </div>

                    {/* LEFT SIDE (BEFORE — unoptimized) */}
                    <div
                        className="absolute inset-0 w-full h-full select-none pointer-events-none border-r border-orange-500 bg-zinc-100"
                        style={{
                            clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`
                        }}
                    >
                        <ResumePreview status="rejected" content={beforeMarkdown} />
                    </div>

                    {/* SLIDER HANDLE */}
                    <div
                        className="absolute top-0 bottom-0 w-1 bg-orange-500 cursor-col-resize z-20 flex items-center justify-center hover:bg-orange-400 transition-colors"
                        style={{ left: `${sliderPosition}%` }}
                    >
                        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.5)] group-hover:scale-110 transition-transform relative z-30">
                            <MoveHorizontal className="w-4 h-4 text-white" />
                        </div>

                        <div className="absolute w-8 h-8 rounded-full bg-orange-500 animate-ping opacity-20 pointer-events-none"></div>

                        <div className="absolute top-4 left-[-70px] bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            BEFORE
                        </div>
                        <div className="absolute top-4 right-[-60px] bg-orange-600/90 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            AFTER
                        </div>
                    </div>

                    <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs font-mono pointer-events-none transition-opacity duration-500 ${isDragging ? 'opacity-0' : 'opacity-100'}`}>
                        Drag to compare
                    </div>
                </div>
            </div>
        </section>
    );
};
