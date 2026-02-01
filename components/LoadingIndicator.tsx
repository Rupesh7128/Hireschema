import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Dog } from 'lucide-react';

interface LoadingIndicatorProps {
    message?: string;
    size?: 'sm' | 'md' | 'lg';
    type?: 'muffin' | 'shepherd' | 'random';
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
    message = 'Processing...', 
    size = 'md',
    type = 'random'
}) => {
    const [hasError, setHasError] = useState(false);

    // Choose the dog image
    const dogImage = type === 'muffin' ? '/assets/dog1.png' : 
                     type === 'shepherd' ? '/assets/dog2.png' :
                     Math.random() > 0.5 ? '/assets/dog1.png' : '/assets/dog2.png';

    const sizeClasses = {
        sm: 'w-12 h-12',
        md: 'w-24 h-24',
        lg: 'w-32 h-32'
    };

    return (
        <div className="flex flex-col items-center justify-center gap-4">
            <motion.div
                animate={{ 
                    y: [0, -15, 0],
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1]
                }}
                transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                }}
                className={`${sizeClasses[size]} relative flex items-center justify-center`}
            >
                {hasError ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <div className="absolute inset-0 bg-orange-500/20 rounded-full animate-pulse blur-xl" />
                        <Dog className="w-2/3 h-2/3 text-orange-500 relative z-10" />
                    </div>
                ) : (
                    <img 
                        src={dogImage} 
                        alt="Loading..." 
                        className="w-full h-full object-contain"
                        onError={() => {
                            console.warn(`[LoadingIndicator] Failed to load image: ${dogImage}`);
                            setHasError(true);
                        }}
                    />
                )}
            </motion.div>
            {message && (
                <p className="text-zinc-500 text-xs font-black animate-pulse uppercase tracking-[0.3em] text-center max-w-[200px]">
                    {message}
                </p>
            )}
        </div>
    );
};
