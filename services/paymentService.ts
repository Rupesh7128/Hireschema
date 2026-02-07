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
