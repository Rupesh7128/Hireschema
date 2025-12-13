import * as React from 'react';
import { motion } from 'framer-motion';

export const AnimatedLogo = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center gap-2 select-none whitespace-nowrap ${className}`}>
    <div className="relative w-8 h-8 flex flex-col justify-center gap-1 p-1.5 bg-zinc-900/50 border border-white/10 rounded-lg overflow-hidden shrink-0 shadow-inner shadow-orange-500/10">
      {/* Abstract Resume Lines Animation */}
      <motion.div 
        animate={{ width: ["40%", "60%", "40%"], opacity: [0.8, 1, 0.8] }} 
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="h-1 bg-orange-500 rounded-full"
      />
      <motion.div 
        animate={{ width: ["70%", "90%", "70%"], opacity: [0.5, 0.8, 0.5] }} 
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        className="h-1 bg-white rounded-full"
      />
      <motion.div 
        animate={{ width: ["50%", "80%", "50%"], opacity: [0.6, 0.9, 0.6] }} 
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        className="h-1 bg-orange-400 rounded-full"
      />
       <motion.div 
        animate={{ width: ["60%", "40%", "60%"], opacity: [0.4, 0.7, 0.4] }} 
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        className="h-1 bg-zinc-500 rounded-full"
      />
    </div>
    <span className="text-lg font-black font-mono tracking-tighter text-white">
      HIRE<span className="text-orange-500">SCHEMA</span>
    </span>
  </div>
);