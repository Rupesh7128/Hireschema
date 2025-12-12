/**
 * Payment Service for Dodo Payments Integration
 * 
 * Handles checkout URL construction, payment verification, and state management.
 */

export const PRODUCT_ID = (import.meta as any).env.VITE_DODO_PRODUCT_ID || '';

// Storage key for payment state
const PAYMENT_STATE_KEY = 'hireSchema_isPaid';

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

/**
 * Saves the payment state to localStorage.
 * 
 * @param isPaid - Whether the user has paid
 */
export function savePaymentState(isPaid: boolean): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(PAYMENT_STATE_KEY, isPaid ? 'true' : 'false');
    }
  } catch (e) {
    console.error('Failed to save payment state:', e);
  }
}

/**
 * Reads the payment state from localStorage.
 * 
 * @returns Whether the user has paid (defaults to false)
 */
export function readPaymentState(): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(PAYMENT_STATE_KEY) === 'true';
    }
  } catch (e) {
    console.error('Failed to read payment state:', e);
  }
  return false;
}

/**
 * Clears the payment state from localStorage.
 */
export function clearPaymentState(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(PAYMENT_STATE_KEY);
    }
  } catch (e) {
    console.error('Failed to clear payment state:', e);
  }
}
