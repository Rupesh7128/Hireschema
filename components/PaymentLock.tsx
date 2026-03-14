import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ExternalLink, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { logEvent } from '../services/analytics';
import { buildCheckoutUrl, PRODUCT_ID, redeemPromoCode, pollPaymentStatus } from '../services/paymentService'; // Updated import

interface PaymentLockProps {
  onPaymentVerified: () => void;
  onBeforeRedirect?: () => void | Promise<void>; // Called before redirecting to save state
}

const PaymentLock: React.FC<PaymentLockProps> = ({ onPaymentVerified, onBeforeRedirect }) => {
  const [error, setError] = useState<string | null>(null);
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [liveCount, setLiveCount] = useState(84);
  const [currentSocialProof, setCurrentSocialProof] = useState(0);

  // Verification State
  const [showManualVerify, setShowManualVerify] = useState(false);
  const [manualPaymentId, setManualPaymentId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyProgress, setVerifyProgress] = useState(0);
  const [verifyStatus, setVerifyStatus] = useState('');

  const PROMO_PREFILL_CODE = 'kirishkagaanasunega';

  // Urgency: Live Counter
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCount(prev => {
        const change = Math.floor(Math.random() * 5) - 2; // -2 to +2
        return Math.max(60, Math.min(100, prev + change));
      });
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  // Urgency: Social Ticker
  const socialProofs = [
    "Emily from Austin just unlocked the full kit",
    "James from Toronto improved his ATS score to 89%",
    "Sophie from London just downloaded her resume",
    "Marco from Milan got 3 interview calls this week",
    "Hannah from Berlin fixed 12 ATS issues",
    "Daniel from Dublin improved relevance by 40%",
    "Olivia from Seattle just unlocked analysis",
    "Lucas from Amsterdam upgraded his interview answers"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSocialProof(prev => (prev + 1) % socialProofs.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handlePaymentClick = async () => {
    logEvent('payment_link_clicked');

    // Determine the return URL based on current environment
    const returnUrl = `${window.location.origin}/app`;

    // Build checkout URL using the payment service helper
    const checkoutUrl = buildCheckoutUrl(PRODUCT_ID, returnUrl);

    if (!checkoutUrl) {
      setError('Payment configuration error. Please contact support.');
      logEvent('payment_config_error', { reason: 'missing_product_id' });
      return;
    }

    // Save state before redirect so it can be restored after payment
    if (onBeforeRedirect) {
      try {
        await onBeforeRedirect();
      } catch (error) {
        console.error('Failed to persist state before redirect:', error);
      }
    }

    // Redirect to Dodo checkout
    window.location.href = checkoutUrl;
  };

  const handleManualVerify = async () => {
    if (!manualPaymentId.trim()) {
      setError("Please enter a Payment ID.");
      return;
    }

    setIsVerifying(true);
    setError(null);
    setVerifyProgress(0);
    setVerifyStatus("Initializing verification...");

    try {
      const result = await pollPaymentStatus(manualPaymentId.trim(), (progress) => {
        setVerifyProgress(progress);
        if (progress < 30) setVerifyStatus("Contacting payment provider...");
        else if (progress < 60) setVerifyStatus("Verifying transaction details...");
        else if (progress < 90) setVerifyStatus("Almost there...");
        else setVerifyStatus("Finalizing...");
      });

      if (result.status === 'verified') {
        setVerifyStatus("Payment confirmed! Unlocking...");
        setVerifyProgress(100);
        await new Promise(r => setTimeout(r, 800)); // Show 100% briefly
        onPaymentVerified();
      } else if (result.status === 'timeout') {
        setError(result.message || 'Verification timed out.');
      } else {
        setError(result.message || 'Verification failed. Please check the ID.');
      }
    } catch (e) {
      setError('An unexpected error occurred during verification.');
    } finally {
      setIsVerifying(false);
    }
  };

  const applyPromo = async () => {
    if (isApplyingPromo) return;
    if (!promoCode.trim()) {
      setError("Please enter a promo code.");
      return;
    }

    setIsApplyingPromo(true);
    setError(null);
    const codeToTest = promoCode.trim().toLowerCase();

    try {
      // Simulate network improvement
      await new Promise(resolve => setTimeout(resolve, 800));

      const res = await redeemPromoCode(codeToTest);

      if (res.ok && res.redeemed) {
        logEvent('promo_redeem_success', { code: codeToTest });
        onPaymentVerified();
        return;
      }

      // Granular Error Handling
      const reason = (res.reason || '').toLowerCase();
      if (reason.includes('expired')) {
        setError('This promo code has expired.');
      } else if (reason.includes('used') || reason.includes('already')) {
        setError('This promo code has already been used.');
      } else if (reason.includes('invalid') || reason.includes('not found')) {
        setError('Invaild promo code. Please check for typos.');
      } else {
        setError(res.reason || 'Promo application failed. Please try again.');
      }

      logEvent('promo_redeem_failed', { reason: res.reason || 'unknown', code: codeToTest });
    } catch (e: any) {
      if (e.message?.includes('fetch') || e.message?.includes('network')) {
        setError('Connection issue. Please check your internet and try again.');
      } else {
        setError('Something went wrong validating the code.');
      }
    } finally {
      setIsApplyingPromo(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-4 relative overflow-hidden bg-zinc-950/50 min-h-[400px]">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-orange-500/5 rounded-full blur-[60px] pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 max-w-sm w-full bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/50 rounded-xl overflow-hidden shadow-2xl shadow-black/80"
      >
        {/* Header Strip */}
        <div className="h-1 w-full bg-gradient-to-r from-orange-600 via-red-500 to-orange-600"></div>

        <div className="p-6 pb-6">
          {/* Live Counter */}
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2 px-2 py-1 bg-zinc-950 rounded-full border border-white/5">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-[10px] text-zinc-400 font-medium">
                <span className="text-white font-bold">{liveCount}</span> people analyzing now
              </span>
            </div>
          </div>

          {!showManualVerify ? (
            <>
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl shadow-lg relative cursor-pointer group">
                    <Lock className="w-5 h-5 text-orange-500 group-hover:scale-110 transition-transform" />
                  </div>
                </div>
              </div>

              <div className="text-center mb-6">
                <h2 className="text-lg font-black text-white mb-1 uppercase tracking-tight">Unlock Analysis</h2>
                <p className="text-zinc-500 text-[11px] leading-relaxed max-w-[240px] mx-auto">
                  Get the Full ATS Resume, Cover Letter, and Interview Prep for this job.
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-4">
                <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50 space-y-3">
                  <div>
                    <button
                      onClick={handlePaymentClick}
                      className="relative w-full py-3.5 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-mono font-bold text-xs uppercase tracking-widest shadow-[0px_4px_20px_rgba(249,115,22,0.2)] hover:shadow-orange-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all rounded-md cursor-pointer border-none flex items-center justify-center gap-2 touch-target"
                    >
                      <span className="absolute top-0 right-0 -mt-2 -mr-2 bg-white text-orange-600 text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm border border-orange-100 rotate-12">POPULAR</span>
                      <span>Pay $1 & Unlock</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                    {/* Social Proof Ticker */}
                    <div className="h-4 mt-2 overflow-hidden relative">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={currentSocialProof}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-[10px] text-orange-500/80 text-center italic w-full absolute top-0"
                        >
                          ✓ {socialProofs[currentSocialProof]}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowManualVerify(true)}
                    className="w-full text-[10px] text-zinc-500 hover:text-zinc-300 underline underline-offset-2 mt-1"
                  >
                    Already paid? Enter Verification ID
                  </button>

                  <div className="pt-2 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => setIsPromoOpen(v => !v)}
                      className="w-full text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors flex items-center justify-center gap-1"
                    >
                      {isPromoOpen ? 'Hide Promo Code' : 'Have a promo code?'}
                    </button>
                    {isPromoOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="space-y-2 mt-2"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value)}
                            placeholder="Enter code"
                            className="flex-1 bg-zinc-900 border border-zinc-700 focus:border-orange-500/60 rounded-md px-3 py-2 text-[11px] text-white font-mono outline-none placeholder:text-zinc-700"
                            disabled={isApplyingPromo}
                            onKeyDown={(e) => e.key === 'Enter' && applyPromo()}
                          />
                          <button
                            type="button"
                            onClick={applyPromo}
                            disabled={isApplyingPromo || !promoCode.trim()}
                            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-mono font-black text-[10px] uppercase tracking-widest rounded-md border border-zinc-700 min-w-[60px] flex items-center justify-center"
                          >
                            {isApplyingPromo ? (
                              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : 'APPLY'}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPromoCode(PROMO_PREFILL_CODE)}
                          className="text-[9px] font-bold uppercase tracking-wide text-orange-500/70 hover:text-orange-400 transition-colors w-full text-left"
                        >
                          Use demo code: {PROMO_PREFILL_CODE}
                        </button>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-zinc-950/50 p-4 rounded-lg border border-zinc-800/50">
                <h3 className="text-white font-bold text-sm mb-2">Verify Payment</h3>
                <p className="text-zinc-400 text-[11px] mb-4">
                  Please enter the Payment ID from your email receipt specifically if the automatic redirect didn't work.
                </p>

                <input
                  type="text"
                  value={manualPaymentId}
                  onChange={(e) => setManualPaymentId(e.target.value)}
                  placeholder="Enter Payment ID (e.g., pay_123...)"
                  className="w-full bg-zinc-900 border border-zinc-700 focus:border-orange-500/60 rounded-md px-3 py-2 text-xs text-white font-mono outline-none mb-3"
                  disabled={isVerifying}
                />

                {isVerifying ? (
                  <div className="space-y-2">
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-orange-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${verifyProgress}%` }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                    <p className="text-[10px] text-orange-400 text-center animate-pulse">{verifyStatus}</p>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowManualVerify(false)}
                      className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-bold rounded-md"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleManualVerify}
                      className="flex-1 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-md flex items-center justify-center gap-2"
                    >
                      Verify ID
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && !isVerifying && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex items-start gap-2 text-[10px] text-red-300 bg-red-950/40 p-2.5 rounded border border-red-500/20"
            >
              <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
              <span className="leading-tight flex-1 font-medium">{error}</span>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
export default PaymentLock;
