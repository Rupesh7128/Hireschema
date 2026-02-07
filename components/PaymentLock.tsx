import * as React from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, ExternalLink } from 'lucide-react';
import { logEvent } from '../services/analytics';
import { buildCheckoutUrl, PRODUCT_ID, redeemPromoCode } from '../services/paymentService';

interface PaymentLockProps {
  onPaymentVerified: () => void;
  onBeforeRedirect?: () => void; // Called before redirecting to save state
}

const PaymentLock: React.FC<PaymentLockProps> = ({ onPaymentVerified, onBeforeRedirect }) => {
  const [error, setError] = useState<string | null>(null);
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  const PROMO_PREFILL_CODE = 'kirishkagaanasunega';

  const handlePaymentClick = () => {
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
      console.log('Calling onBeforeRedirect to save state...');
      onBeforeRedirect();
      console.log('State saved, now redirecting...');
    } else {
      console.warn('No onBeforeRedirect callback provided!');
    }
    
    console.log('Redirecting to Dodo Checkout:', checkoutUrl);
    
    // Redirect to Dodo checkout
    window.location.href = checkoutUrl;
  };

  const applyPromo = async () => {
    if (isApplyingPromo) return;
    setIsApplyingPromo(true);
    setError(null);
    try {
      const res = await redeemPromoCode(promoCode);
      if (res.ok && res.redeemed) {
        logEvent('promo_redeem_success');
        onPaymentVerified();
        return;
      }
      setError(res.reason || 'Invalid promo code.');
      logEvent('promo_redeem_failed', { reason: res.reason || 'unknown' });
    } catch (e: any) {
      setError(e?.message || 'Promo redemption failed.');
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
        
        <div className="p-4 sm:p-6">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl shadow-lg relative">
                <Lock className="w-5 h-5 text-orange-500" />
              </div>
            </div>
          </div>

          <div className="text-center mb-4">
            <h2 className="text-lg font-black text-white mb-1 uppercase tracking-tight">Unlock Analysis</h2>
            <p className="text-zinc-500 text-[11px] leading-relaxed">
              Get the Full ATS Resume, Cover Letter, and Interview Prep for this job.
            </p>
            <div className="mt-2">
              <div className="inline-block px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded text-[8px] font-black text-orange-500 uppercase tracking-widest">
                One-time payment
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50 space-y-2">
              <button 
                onClick={handlePaymentClick}
                className="w-full py-3 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-mono font-bold text-xs uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] hover:shadow-none active:shadow-none hover:translate-x-[1.5px] hover:translate-y-[1.5px] active:translate-x-[1.5px] active:translate-y-[1.5px] transition-all rounded-sm cursor-pointer border-none flex items-center justify-center gap-2 touch-target"
              >
                <span>Pay $1 & Unlock</span>
                <ExternalLink className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setIsPromoOpen(v => !v)}
                className="w-full text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Have a promo code?
              </button>
              {isPromoOpen && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Enter promo code"
                      className="flex-1 bg-zinc-900 border border-zinc-700 focus:border-orange-500/60 rounded-md px-3 py-2 text-[11px] text-white font-mono outline-none"
                      disabled={isApplyingPromo}
                    />
                    <button
                      type="button"
                      onClick={applyPromo}
                      disabled={isApplyingPromo || !promoCode.trim()}
                      className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-mono font-black text-[10px] uppercase tracking-widest rounded-md border border-zinc-700"
                    >
                      Apply
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPromoCode(PROMO_PREFILL_CODE)}
                    className="text-[10px] font-black uppercase tracking-widest text-orange-500/90 hover:text-orange-400 transition-colors"
                  >
                    Click to auto-fill promo code
                  </button>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 text-[10px] text-red-400 bg-red-950/20 p-2 rounded border border-red-900/30">
              <span className="leading-tight flex-1">{error}</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentLock;
