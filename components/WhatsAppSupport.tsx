import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircleQuestion } from 'lucide-react';

export const WhatsAppSupport: React.FC = () => {
  return (
    <motion.a
      href="https://wa.me/8217609641"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-[100] flex items-center justify-center w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all cursor-pointer group"
      style={{ backgroundColor: '#ea580c' }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      title="Contact Support"
    >
      <div className="absolute inset-0 rounded-full animate-ping opacity-20 group-hover:opacity-40" style={{ backgroundColor: '#ea580c' }} />
      <MessageCircleQuestion className="w-7 h-7 text-white relative z-10" />
    </motion.a>
  );
};
