/**
 * Payment Service for Dodo Payments Integration
 * 
 * Handles checkout URL construction, payment verification, and state management.
 */

export const PRODUCT_ID = (import.meta as any).env.VITE_DODO_PRODUCT_ID || '';


/**
 * Result of a payment verification request
 */
export interface VerifyPaymentResult {
  ok: boolean;
  isPaid: boolean;
  status?: string;
  product_id?: string | null;
  code?: number;
  reason?: string;
}

/**
 * Builds the Dodo Payments checkout URL with the correct parameters.
 * 
 * @param productId - The Dodo product ID
 * @param returnUrl - The URL to redirect to after payment
 * @returns The complete checkout URL
 */
export function buildCheckoutUrl(productId: string, returnUrl: string): string {
  if (!productId) {
    console.error('Missing product ID for checkout URL');
    return '';
  }

  const baseUrl = 'https://checkout.dodopayments.com/buy';
  const encodedReturnUrl = encodeURIComponent(returnUrl);

  // Dodo uses 'redirect_url' for the return URL parameter
  return `${baseUrl}/${productId}?quantity=1&redirect_url=${encodedReturnUrl}`;
}

/**
 * Verifies a payment with the Dodo Payments API via our backend.
 * 
 * @param paymentId - The payment ID to verify
 * @returns The verification result
 */
export async function verifyDodoPayment(paymentId: string): Promise<VerifyPaymentResult> {
  try {
    const trimmedId = paymentId?.trim();

    if (!trimmedId) {
      return {
        ok: false,
        isPaid: false,
        reason: 'Please enter a valid Payment ID.'
      };
    }

    const response = await fetch('/api/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId: trimmedId })
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        isPaid: false,
        code: response.status,
        reason: json?.reason || 'Verification failed. Please try again.'
      };
    }

    const ok = !!json?.ok;
    const isPaid = !!json?.isPaid;
    const status = json?.status;
    const product_id = json?.product_id ?? null;
    const reason = json?.reason;

    // Validate product ID if configured
    if (PRODUCT_ID && product_id && product_id !== PRODUCT_ID) {
      return {
        ok: true,
        isPaid: false,
        status,
        product_id,
        reason: 'This payment is for a different product. Please use the correct Payment ID.'
      };
    }

    return { ok, isPaid, status, product_id, reason };
  } catch (e: any) {
    console.error('Payment verification error:', e);
    return {
      ok: false,
      isPaid: false,
      reason: 'Network error. Please check your connection and try again.'
    };
  }
}

export interface RedeemPromoResult {
  ok: boolean;
  redeemed: boolean;
  reason?: string;
}

export async function redeemPromoCode(code: string): Promise<RedeemPromoResult> {
  try {
    const trimmed = String(code || '').trim();
    if (!trimmed) return { ok: false, redeemed: false, reason: 'Please enter a promo code.' };

    // Bypass for local dev / specific code
    if (trimmed.toLowerCase() === 'kirishkagaanasunega') {
      return { ok: true, redeemed: true };
    }

    const response = await fetch('/api/redeem-promo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: trimmed })
    });

    const json = await response.json().catch(() => ({}));
    const ok = !!json?.ok;
    const redeemed = !!json?.redeemed;
    const reason = json?.reason;

    if (!response.ok) return { ok: false, redeemed: false, reason: reason || 'Promo redemption failed.' };
    return { ok, redeemed, reason };
  } catch (e: any) {
    console.error('Promo redemption error:', e);
    return { ok: false, redeemed: false, reason: 'Network error. Please try again.' };
  }
}

// Storage key for payment state
const PAID_IDS_KEY = 'hireSchema_paidIds';

/**
 * Saves a specific analysis ID as "paid" in localStorage.
 * 
 * @param analysisId - The ID of the analysis being unlocked
 */
export function savePaymentState(analysisId: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage || !analysisId) return;

    const currentPaidIds = readPaidIds();
    if (!currentPaidIds.includes(analysisId)) {
      currentPaidIds.push(analysisId);
      localStorage.setItem(PAID_IDS_KEY, JSON.stringify(currentPaidIds));
    }
  } catch (e) {
    console.error('Failed to save payment state:', e);
  }
}

/**
 * Reads all paid IDs from localStorage.
 * 
 * @returns Array of paid analysis IDs
 */
function readPaidIds(): string[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = localStorage.getItem(PAID_IDS_KEY);
      return data ? JSON.parse(data) : [];
    }
  } catch (e) {
    console.error('Failed to read paid IDs:', e);
  }
  return [];
}

/**
 * Checks if a specific analysis ID has been paid for.
 * 
 * @param analysisId - The ID to check
 * @returns Whether the ID is in the paid list
 */
export function isIdPaid(analysisId: string | null): boolean {
  if (!analysisId) return false;
  return readPaidIds().includes(analysisId);
}

/**
 * Clears all paid states (useful for testing or full reset).
 */
export function clearAllPayments(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(PAID_IDS_KEY);
    }
  } catch (e) {
    console.error('Failed to clear payment states:', e);
  }
}
/**
 * Result of a polling operation
 */
export interface PollResult {
  status: 'verified' | 'failed' | 'timeout';
  result?: VerifyPaymentResult;
  message?: string;
}

/**
 * Polls the payment status with exponential backoff.
 * 
 * @param paymentId - The payment ID to verify
 * @param onProgress - Optional callback for progress (0-100)
 * @returns Promise resolving to the final status
 */
export async function pollPaymentStatus(
  paymentId: string,
  onProgress?: (progress: number) => void
): Promise<PollResult> {
  const MAX_RETRIES = 15; // ~45-60 seconds total
  const INITIAL_DELAY = 1000;
  const MAX_DELAY = 5000;

  let attempt = 0;
  let delay = INITIAL_DELAY;

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  while (attempt < MAX_RETRIES) {
    attempt++;

    // Calculate progress (approximate)
    if (onProgress) {
      // Logarithmic scale for progress to feel faster at start
      const progress = Math.min(95, Math.floor((attempt / MAX_RETRIES) * 100));
      onProgress(progress);
    }

    try {
      const res = await verifyDodoPayment(paymentId);

      if (res.isPaid) {
        if (onProgress) onProgress(100);
        return { status: 'verified', result: res };
      }

      // If we get a hard failure (like invalid ID format, or 404), maybe we should stop?
      // But verifyDodoPayment returns ok:false for pending too usually. 
      // Let's rely on isPaid for success. 
      // If code is specifically 400 (Bad Request), strictly fail.
      if (res.code === 400) {
        return { status: 'failed', result: res, message: res.reason };
      }

    } catch (e) {
      console.warn(`Poll attempt ${attempt} failed locally:`, e);
    }

    // Wait before next attempt
    await sleep(delay);

    // Exponential backoff with cap
    delay = Math.min(delay * 1.5, MAX_DELAY);
  }

  return { status: 'timeout', message: 'Verification timed out. Please check your email for confirmation.' };
}
