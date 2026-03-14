import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Copy, Check, X, PartyPopper } from 'lucide-react';

export const ReferralModal = ({ onClose }: { onClose: () => void }) => {
    const [copied, setCopied] = useState(false);
    const referralLink = "https://hireschema.com/?ref=FRIEND50";

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-sans"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="w-full max-w-md bg-zinc-900 border border-orange-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600"></div>
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl"></div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center text-center space-y-4 pt-2">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 mb-2">
                        <Gift className="w-8 h-8 text-white" />
                    </div>

                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
                            Unlock a Free Roast
                        </h3>
                        <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mx-auto">
                            You've unlocked the full analysis! Invite a friend to fix their resume, and we'll give you both a free specialized resume roast.
                        </p>
                    </div>

                    <div className="w-full p-4 bg-black/40 rounded-xl border border-white/5 space-y-3">
                        <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-left pl-1">Your Referral Link</div>
                        <div className="flex gap-2">
                            <input
                                readOnly
                                value={referralLink}
                                className="flex-1 bg-zinc-800 border-none rounded-lg px-3 py-2.5 text-sm text-zinc-300 font-mono focus:ring-1 focus:ring-orange-500/50 outline-none"
                            />
                            <button
                                onClick={handleCopy}
                                className="bg-orange-600 hover:bg-orange-500 text-white p-2.5 rounded-lg transition-colors flex items-center justify-center shrink-0"
                            >
                                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl transition-colors text-sm uppercase tracking-wide"
                    >
                        Got it, thanks!
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};
