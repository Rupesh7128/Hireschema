import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Dog } from 'lucide-react';

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
    const [hasError, setHasError] = useState(false);
    const [imgLoaded, setImgLoaded] = useState(false);

    // Choose the dog image
    const dogImage = type === 'muffin' ? '/assets/muffin.svg' : 
                     type === 'bruno' ? '/assets/bruno.svg' :
                     Math.random() > 0.5 ? '/assets/muffin.svg' : '/assets/bruno.svg';

    const sizeClasses = {
        sm: 'w-12 h-12',
        md: 'w-24 h-24',
        lg: 'w-32 h-32'
    };

    return (
        <div className="flex flex-col items-center justify-center gap-6">
            <div className="relative flex items-center justify-center">
                {/* Spinning Loading Ring */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className={`absolute ${size === 'sm' ? 'w-16 h-16' : size === 'md' ? 'w-28 h-28' : 'w-36 h-36'} border-2 border-dashed border-orange-500/30 rounded-full`}
                />
                
                <motion.div
                    animate={{ 
                        y: [0, -15, 0],
                        rotate: [0, 8, -8, 0],
                        scaleX: [1, -1, 1],
                        scale: [1, 1.05, 1]
                    }}
                    transition={{ 
                        duration: 3, 
                        repeat: Infinity, 
                        ease: "easeInOut" 
                    }}
                    className={`${sizeClasses[size]} relative flex items-center justify-center z-10`}
                >
                    {(!imgLoaded || hasError) && (
                        <div className="relative w-full h-full flex items-center justify-center">
                            <div className="absolute inset-0 bg-orange-500/10 rounded-full animate-pulse blur-2xl" />
                            <Dog className={`${size === 'sm' ? 'w-6 h-6' : 'w-12 h-12'} text-orange-500 relative z-10 drop-shadow-[0_0_15px_rgba(249,115,22,0.4)]`} />
                        </div>
                    )}
                    
                    {!hasError && (
                        <img 
                            src={dogImage} 
                            alt="Loading..." 
                            className={`w-full h-full object-contain transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0 absolute'}`}
                            onLoad={() => {
                                console.log(`[LoadingIndicator] Successfully loaded: ${dogImage}`);
                                setImgLoaded(true);
                            }}
                            onError={() => {
                                console.error(`[LoadingIndicator] Failed to load image at: ${window.location.origin}${dogImage}. Please ensure the file exists in public/assets/`);
                                setHasError(true);
                            }}
                        />
                    )}
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
