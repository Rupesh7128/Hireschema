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
        }, 1200);
        return () => window.clearInterval(id);
    }, [type]);

    const sizeClasses = {
        sm: 'text-3xl',
        md: 'text-6xl',
        lg: 'text-7xl'
    };

    return (
        <div className="flex flex-col items-center justify-center gap-6">
            <div className="relative flex items-center justify-center" style={{ perspective: 800 }}>
                <motion.div
                    animate={{ 
                        y: [0, -15, 0],
                        rotateY: [0, 180, 360],
                        scale: [1, 1.05, 1]
                    }}
                    transition={{ 
                        duration: 2.8, 
                        repeat: Infinity, 
                        ease: "easeInOut" 
                    }}
                    className={`relative flex items-center justify-center z-10`}
                    style={{ transformStyle: 'preserve-3d' }}
                >
                    <span className={`${sizeClasses[size]} leading-none select-none`} aria-label="Loading">
                        {activeDog === 'muffin' ? '🧁' : '🐶'}
                    </span>
                </motion.div>
            </div>

            {message && (
                <div className="flex flex-col items-center gap-1.5">
                    <p className="text-orange-500/80 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">
                        Please Wait
                    </p>
                    <p className="text-white text-xs font-black uppercase tracking-widest text-center max-w-[200px] drop-shadow-sm">
                        {message}
                    </p>
                </div>
            )}
        </div>
    );
};
