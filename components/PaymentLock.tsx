import * as React from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, ExternalLink, KeyRound, AlertTriangle, Loader2, XCircle, HelpCircle, RefreshCw } from 'lucide-react';
import { logEvent } from '../services/analytics';
import { verifyDodoPayment, buildCheckoutUrl, PRODUCT_ID } from '../services/paymentService';

interface PaymentLockProps {
  onPaymentVerified: () => void;
  onBeforeRedirect?: () => void; // Called before redirecting to save state
}

const PaymentLock: React.FC<PaymentLockProps> = ({ onPaymentVerified, onBeforeRedirect }) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

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

  const handleVerify = async () => {
    if (isLocked) return;

    const cleanKey = licenseKey.trim();

    // Dev backdoor removed for security - payment verification is now required

    if (attempts >= 5) {
      setIsLocked(true);
      setError('Too many failed attempts. Please refresh the page to try again.');
      return;
    }

    setIsVerifying(true);
    setError(null);
    
    try {
      if (!cleanKey) {
        throw new Error('Please enter your Payment ID.');
      }

      const res = await verifyDodoPayment(cleanKey);

      if (res.ok && res.isPaid) {
        logEvent('payment_verify_success', { method: 'manual' });
        onPaymentVerified();
      } else {
        // Use the descriptive reason from the API
        throw new Error(res.reason || 'Invalid Payment ID or payment not completed.');
      }

    } catch (e: any) {
      setAttempts(prev => prev + 1);
      setError(e.message || 'Verification failed. Please try again.');
      logEvent('payment_verify_failed', { error: e.message, attempts: attempts + 1 });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setLicenseKey('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && licenseKey && !isVerifying && !isLocked) {
      e.preventDefault();
      handleVerify();
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden bg-zinc-950/50 min-h-[450px] sm:min-h-[500px]">
      {/* Background Decor - reduced on mobile for performance */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none hidden sm:block"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-orange-500/5 rounded-full blur-[80px] sm:blur-[100px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 max-w-md w-full bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/50 rounded-2xl overflow-hidden shadow-2xl shadow-black/80"
      >
        {/* Header Strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-orange-600 via-red-500 to-orange-600"></div>
        
        <div className="p-5 sm:p-8">
          <div className="flex justify-center mb-5 sm:mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-orange-500 blur-xl opacity-20 rounded-full hidden sm:block"></div>
              <div className="bg-zinc-950 border border-zinc-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg relative">
                <Lock className="w-6 sm:w-8 h-6 sm:h-8 text-orange-500" />
              </div>
            </div>
          </div>

          <div className="text-center mb-5 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">Unlock Premium Content</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Unlock the Full ATS Resume, Cover Letter, and Interview Prep for this specific job.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <div className="inline-block px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                One-time payment per analysis
              </div>
              <p className="text-[10px] text-zinc-500 italic">
                (One resume + one job description = one payment)
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-6">
            <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50 space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-orange-500 text-xs font-bold border border-zinc-700">1</span>
                <p className="text-sm text-zinc-300">Secure payment via Dodo.</p>
              </div>
              <button 
                onClick={handlePaymentClick}
                className="w-full py-4 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-mono font-bold text-sm uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] hover:shadow-none active:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[2px] active:translate-y-[2px] transition-all rounded-sm cursor-pointer border-none flex items-center justify-center gap-3 touch-target"
              >
                <span>Pay $1 & Unlock</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50 space-y-3 relative">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-orange-500 text-xs font-bold border border-zinc-700">2</span>
                <p className="text-sm text-zinc-300">Or enter Payment ID manually.</p>
              </div>
              
              <div className="relative group">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-orange-500 transition-colors" />
                <input 
                  type="text" 
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="paste_payment_id_here"
                  disabled={isVerifying || isLocked}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className={`w-full bg-zinc-900 border ${error ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-700 focus:border-orange-500'} rounded-lg py-3 pl-10 pr-24 text-sm text-white focus:outline-none transition-all placeholder:text-zinc-700 font-mono disabled:opacity-50 touch-target`}
                />
                <button 
                  onClick={handleVerify}
                  disabled={isVerifying || !licenseKey || isLocked}
                  className="absolute right-1 top-1 bottom-1 px-4 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-white font-mono font-bold text-[10px] uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all rounded-sm disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-700"
                >
                  {isVerifying ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'VERIFY'
                  )}
                </button>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-xs text-red-400 bg-red-950/20 p-2 rounded border border-red-900/30">
                  {isLocked ? (
                    <XCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span className="leading-tight flex-1">{error}</span>
                  {!isLocked && (
                    <button 
                      onClick={handleRetry}
                      className="text-zinc-400 hover:text-white transition-colors"
                      title="Clear and retry"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-[10px] text-zinc-600 flex items-center justify-center gap-1">
              <HelpCircle className="w-3 h-3" /> 
              Payment ID is in your Dodo Payments email receipt.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentLock;
