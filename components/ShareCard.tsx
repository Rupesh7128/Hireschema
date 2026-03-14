import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Share2, Loader2, Copy } from 'lucide-react';
import html2canvas from 'html2canvas';

interface ShareCardProps {
    score: number;
    metrics: {
        buzzwordDensity: number;
        cringeScore: number;
        impactScore: number;
        brevityScore: number;
        hireProbability: number;
    };
    verdict: string;
}

export const ShareCard: React.FC<ShareCardProps> = ({ score, metrics, verdict }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleDownload = async () => {
        if (!cardRef.current) return;
        setIsGenerating(true);
        try {
            const canvas = await html2canvas(cardRef.current, {
                backgroundColor: '#09090b', // zinc-950
                scale: 2, // High resolution
                useCORS: true,
                logging: false,
            });

            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = image;
            link.download = `roast-my-resume-score-${score}.png`;
            link.click();
        } catch (err) {
            console.error('Failed to generate image:', err);
        } finally {
            setIsGenerating(false);
        }
    };

    const getGrade = (s: number) => {
        if (s >= 90) return 'A';
        if (s >= 80) return 'B';
        if (s >= 70) return 'C';
        if (s >= 60) return 'D';
        return 'F';
    };

    const grade = getGrade(score);

    return (
        <div className="flex flex-col items-center gap-6 p-4">
            {/* --- THE CARD TO CAPTURE --- */}
            <div
                ref={cardRef}
                className="relative w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl"
                style={{ aspectRatio: '4/5' }}
            >
                {/* Background Gradients */}
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-orange-950/30"></div>
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600"></div>
                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-orange-600/10 blur-[100px] rounded-full"></div>

                <div className="relative h-full flex flex-col p-6 justify-between">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Employability Score</h3>
                            <div className="flex items-baseline gap-1">
                                <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500 tracking-tighter">
                                    {score}
                                </span>
                                <span className="text-zinc-600 font-bold">/100</span>
                            </div>
                        </div>
                        <div className="w-16 h-16 flex items-center justify-center bg-orange-500 text-black font-black text-4xl rounded-lg rotate-3 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
                            {grade}
                        </div>
                    </div>

                    {/* Verdict */}
                    <div className="text-center py-4">
                        <div className="inline-block px-3 py-1 bg-orange-950/40 border border-orange-500/30 rounded text-orange-400 text-xs font-black uppercase tracking-widest mb-2">
                            Verdict
                        </div>
                        <div className="text-2xl font-black text-white uppercase tracking-tight leading-none">
                            {verdict}
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-zinc-900/50 p-3 rounded border border-zinc-800">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Cringe</div>
                            <div className="text-xl font-bold text-white">{metrics.cringeScore}/100</div>
                        </div>
                        <div className="bg-zinc-900/50 p-3 rounded border border-zinc-800">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Buzzwords</div>
                            <div className="text-xl font-bold text-white">{metrics.buzzwordDensity}%</div>
                        </div>
                        <div className="bg-zinc-900/50 p-3 rounded border border-zinc-800">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Impact</div>
                            <div className="text-xl font-bold text-white">{metrics.impactScore}/100</div>
                        </div>
                        <div className="bg-zinc-900/50 p-3 rounded border border-zinc-800">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Hireable</div>
                            <div className="text-xl font-bold text-white">{metrics.hireProbability}%</div>
                        </div>
                    </div>

                    {/* Footer Branding */}
                    <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50 mt-2">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-orange-600 rounded-sm"></div>
                            <span className="text-sm font-bold text-zinc-300">HireSchema</span>
                        </div>
                        <div className="text-[10px] text-zinc-600 font-mono">roastmyresume.ios</div>
                    </div>
                </div>
            </div>

            {/* --- ACTIONS --- */}
            <div className="flex gap-3">
                <button
                    onClick={handleDownload}
                    disabled={isGenerating}
                    className="px-6 py-2.5 bg-white text-black font-bold text-sm rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Save Image
                </button>
            </div>
        </div>
    );
};
