import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface LoadingIndicatorProps {
    message?: string;
    size?: 'sm' | 'md' | 'lg';
    type?: 'muffin' | 'bruno' | 'random';
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
    message = 'Processing...', 
    size = 'md',
    type = 'random'
}) => {
    const [activeDog, setActiveDog] = useState<'muffin' | 'bruno'>(() => (Math.random() > 0.5 ? 'muffin' : 'bruno'));
    const [muffinReady, setMuffinReady] = useState(false);
    const [brunoReady, setBrunoReady] = useState(false);
    const [muffinError, setMuffinError] = useState(false);
    const [brunoError, setBrunoError] = useState(false);

    const muffinSrc = '/assets/muffin.png';
    const brunoSrc = '/assets/bruno.png';

    useEffect(() => {
        let alive = true;
        setMuffinReady(false);
        setBrunoReady(false);
        setMuffinError(false);
        setBrunoError(false);

        const muffin = new Image();
        muffin.onload = () => {
            if (!alive) return;
            setMuffinReady(true);
        };
        muffin.onerror = () => {
            if (!alive) return;
            setMuffinError(true);
        };
        muffin.src = muffinSrc;

        const bruno = new Image();
        bruno.onload = () => {
            if (!alive) return;
            setBrunoReady(true);
        };
        bruno.onerror = () => {
            if (!alive) return;
            setBrunoError(true);
        };
        bruno.src = brunoSrc;

        return () => {
            alive = false;
        };
    }, []);

    useEffect(() => {
        if (type === 'muffin' || type === 'bruno') {
            setActiveDog(type);
            return;
        }
        setActiveDog(Math.random() > 0.5 ? 'muffin' : 'bruno');
    }, [type]);

    useEffect(() => {
        if (type !== 'random') return;
        const id = window.setInterval(() => {
            setActiveDog(prev => (prev === 'muffin' ? 'bruno' : 'muffin'));
        }, 1400);
        return () => window.clearInterval(id);
    }, [type]);

    const sizeClasses = {
        sm: 'w-16 h-16',
        md: 'w-28 h-28',
        lg: 'w-32 h-32'
    };

    const anyReady = muffinReady || brunoReady;
    const canFlip = muffinReady && brunoReady;
    const allFailed = muffinError && brunoError;
    const effectiveDog: 'muffin' | 'bruno' = canFlip ? activeDog : (muffinReady ? 'muffin' : 'bruno');

    return (
        <div className="relative flex flex-col items-center justify-center gap-6 px-8 py-7 rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.16),transparent_46%),linear-gradient(180deg,rgba(24,24,27,0.95),rgba(9,9,11,0.95))] shadow-[0_24px_80px_rgba(0,0,0,0.45)] overflow-hidden">
            <motion.div
                aria-hidden
                className="absolute -top-10 -left-10 w-36 h-36 rounded-full bg-orange-500/20 blur-3xl"
                animate={{ x: [0, 20, 0], y: [0, 10, 0], opacity: [0.35, 0.55, 0.35] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                aria-hidden
                className="absolute -bottom-12 -right-10 w-40 h-40 rounded-full bg-zinc-400/20 blur-3xl"
                animate={{ x: [0, -18, 0], y: [0, -10, 0], opacity: [0.25, 0.45, 0.25] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="relative flex items-center justify-center z-10" style={{ perspective: 900 }}>
                <motion.div
                    aria-hidden
                    className={`absolute ${sizeClasses[size]} rounded-full border border-orange-400/20`}
                    animate={{ rotate: 360, scale: [1, 1.04, 1] }}
                    transition={{ rotate: { duration: 5, repeat: Infinity, ease: 'linear' }, scale: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } }}
                />
                <motion.div
                    animate={{ y: [0, -15, 0], scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="relative flex items-center justify-center z-10"
                >
                    <div className={`relative ${sizeClasses[size]}`}>
                        {(!anyReady || allFailed) && (
                            <div className="absolute inset-0 rounded-full bg-white/5 border border-white/10" />
                        )}
                        <motion.div
                            aria-label="Loading"
                            animate={{ rotateY: effectiveDog === 'muffin' ? 0 : 180, opacity: anyReady && !allFailed ? 1 : 0 }}
                            transition={{ duration: 0.9, ease: "easeInOut" }}
                            className="absolute inset-0"
                            style={{ transformStyle: 'preserve-3d', WebkitTransformStyle: 'preserve-3d', willChange: 'transform' }}
                        >
                            <img
                                src={muffinSrc}
                                alt=""
                                draggable={false}
                                onLoad={() => setMuffinReady(true)}
                                onError={() => setMuffinError(true)}
                                className="absolute inset-0 w-full h-full select-none object-contain drop-shadow-[0_12px_30px_rgba(0,0,0,0.55)]"
                                style={{
                                    backfaceVisibility: 'hidden',
                                    WebkitBackfaceVisibility: 'hidden',
                                    display: muffinError ? 'none' : 'block'
                                }}
                            />
                            <img
                                src={brunoSrc}
                                alt=""
                                draggable={false}
                                onLoad={() => setBrunoReady(true)}
                                onError={() => setBrunoError(true)}
                                className="absolute inset-0 w-full h-full select-none object-contain drop-shadow-[0_12px_30px_rgba(0,0,0,0.55)]"
                                style={{
                                    backfaceVisibility: 'hidden',
                                    WebkitBackfaceVisibility: 'hidden',
                                    transform: 'rotateY(180deg)',
                                    display: brunoError ? 'none' : 'block'
                                }}
                            />
                        </motion.div>
                    </div>
                </motion.div>
            </div>

            {message && (
                <div className="flex flex-col items-center gap-1.5 z-10">
                    <p className="text-orange-300 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">
                        Please Wait
                    </p>
                    <p className="text-white text-xs font-black uppercase tracking-[0.2em] text-center max-w-[240px] drop-shadow-sm">
                        {message}
                    </p>
                </div>
            )}
        </div>
    );
};
