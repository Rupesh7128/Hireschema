import React from 'react';
import { motion } from 'framer-motion';

export const AnimatedLogo = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center gap-2 select-none whitespace-nowrap ${className}`}>
    <div className="relative w-8 h-8 flex items-end justify-between overflow-hidden shrink-0">
      <motion.div 
        animate={{ height: ["30%", "80%", "40%", "30%"] }} 
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="w-1.5 bg-orange-600 rounded-t-sm"
      />
      <motion.div 
        animate={{ height: ["50%", "100%", "60%", "50%"] }} 
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
        className="w-1.5 bg-orange-500 rounded-t-sm"
      />
      <motion.div 
        animate={{ height: ["40%", "70%", "90%", "40%"] }} 
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        className="w-1.5 bg-orange-400 rounded-t-sm"
      />
       <motion.div 
        animate={{ height: ["60%", "30%", "70%", "60%"] }} 
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        className="w-1.5 bg-white rounded-t-sm"
      />
    </div>
    <span className="text-lg font-black font-mono tracking-tighter text-white">
      HIRE<span className="text-orange-500">SCHEMA</span>
    </span>
  </div>
);