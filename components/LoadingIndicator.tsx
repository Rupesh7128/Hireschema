import React from 'react';
import { motion } from 'framer-motion';

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
                    y: [0, -20, 0],
                    rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                    duration: 1.5, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                }}
                className={`${sizeClasses[size]} relative`}
            >
                <img 
                    src={dogImage} 
                    alt="Loading..." 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                        // Fallback to a pulse animation if image is missing
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as any).parentElement.innerHTML = '<div class="w-full h-full bg-orange-500 rounded-full animate-pulse" />'
                    }}
                />
            </motion.div>
            {message && (
                <p className="text-zinc-500 text-sm font-mono animate-pulse uppercase tracking-widest">
                    {message}
                </p>
            )}
        </div>
    );
};
