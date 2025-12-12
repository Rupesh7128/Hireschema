import type { IncomingMessage, ServerResponse } from 'http';

interface VercelRequest extends IncomingMessage {
  query: { [key: string]: string | string[] };
  cookies: { [key: string]: string };
  body: any;
}

interface VercelResponse extends ServerResponse {
  send: (body: any) => VercelResponse;
  json: (jsonBody: any) => VercelResponse;
  status: (statusCode: number) => VercelResponse;
  redirect: (statusOrUrl: string | number, url?: string) => VercelResponse;
}

/**
 * Valid payment ID pattern - alphanumeric with hyphens/underscores, 10-60 chars
 * Dodo payment IDs are typically UUIDs or alphanumeric strings
 */
const PAYMENT_ID_PATTERN = /^[a-zA-Z0-9_-]{10,60}$/;

/**
 * Validates the format of a payment ID.
 * Returns false for obviously invalid IDs to prevent unnecessary API calls.
 * 
 * @param paymentId - The payment ID to validate
 * @returns true if the format is valid
 */
export function isValidPaymentIdFormat(paymentId: string): boolean {
  if (!paymentId || typeof paymentId !== 'string') {
    return false;
  }
  const trimmed = paymentId.trim();
  if (trimmed.length < 10 || trimmed.length > 60) {
    return false;
  }
  return PAYMENT_ID_PATTERN.test(trimmed);
}

/**
 * Determines the Dodo API base URL based on environment configuration.
 * 
 * @param env - Environment variables object
 * @returns The base URL for Dodo API (test or live)
 */
export function getDodoApiBaseUrl(env: Record<string, string | undefined>): string {
  const mode = String(env.VITE_DODO_ENV || env.DODO_ENV || 'live').toLowerCase();
  const isTestMode = mode === 'test';
  return isTestMode ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';
}

/**
 * Gets the alternate Dodo API base URL for fallback verification.
 * 
 * @param env - Environment variables object
 * @returns The alternate base URL (opposite of primary)
 */
export function getAlternateDodoApiBaseUrl(env: Record<string, string | undefined>): string {
  const mode = String(env.VITE_DODO_ENV || env.DODO_ENV || 'live').toLowerCase();
  const isTestMode = mode === 'test';
  return isTestMode ? 'https://live.dodopayments.com' : 'https://test.dodopayments.com';
}

/**
 * Checks if a payment status indicates successful payment.
 * 
 * @param status - The payment status string from Dodo API
 * @returns true if the status indicates payment succeeded
 */
export function isPaymentStatusSuccessful(status: string): boolean {
  const normalizedStatus = String(status || '').toLowerCase();
  return ['succeeded', 'paid', 'completed', 'success'].includes(normalizedStatus);
}

/**
 * Returns a human-readable error reason based on the payment status.
 * 
 * @param status - The payment status string
 * @returns A descriptive error message
 */
export function getPaymentErrorReason(status: string): string {
  const normalizedStatus = String(status || '').toLowerCase();
  
  switch (normalizedStatus) {
    case 'pending':
      return 'Payment is still pending. Please wait a moment and try again.';
    case 'failed':
      return 'Payment failed. Please try again or use a different payment method.';
    case 'cancelled':
    case 'canceled':
      return 'Payment was cancelled. Please complete the payment to unlock premium features.';
    case 'refunded':
      return 'Payment was refunded. Please make a new payment to unlock premium features.';
    case 'expired':
      return 'Payment session expired. Please start a new payment.';
    default:
      if (!status) {
        return 'Payment status unknown. Please try again or contact support.';
      }
      return `Payment not completed. Current status: ${status}`;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const paymentId = String(body?.paymentId || '').trim();
    
    if (!paymentId) {
      res.status(400).json({ ok: false, isPaid: false, reason: 'Missing paymentId' });
      return;
    }

    // Validate payment ID format before making external API call
    if (!isValidPaymentIdFormat(paymentId)) {
      console.warn('Invalid payment ID format:', paymentId.substring(0, 20));
      res.status(400).json({ 
        ok: false, 
        isPaid: false, 
        reason: 'Invalid payment ID format. Please check your Payment ID and try again.' 
      });
      return;
    }

    const env = process.env || {};
    const apiKey = env.DODO_PAYMENTS_API_KEY || '';
    
    if (!apiKey) {
      console.error('Missing DODO_PAYMENTS_API_KEY environment variable');
      res.status(500).json({ 
        ok: false, 
        isPaid: false, 
        reason: 'Server misconfiguration. Please contact support.' 
      });
      return;
    }

    const primaryBase = getDodoApiBaseUrl(env);
    const secondaryBase = getAlternateDodoApiBaseUrl(env);

    console.log(`Verifying payment ${paymentId} against ${primaryBase}`);

    // Helper to fetch payment status from Dodo API
    const checkPayment = async (baseUrl: string): Promise<Response> => {
      return fetch(`${baseUrl}/payments/${paymentId}`, { 
        method: 'GET', 
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        } 
      });
    };

    // Try primary endpoint
    let response = await checkPayment(primaryBase);

    // If 404 (Not Found) or 401 (Unauthorized), try secondary environment
    if (!response.ok && (response.status === 404 || response.status === 401)) {
      console.warn(`Primary check failed (${response.status}), trying secondary: ${secondaryBase}`);
      response = await checkPayment(secondaryBase);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`Payment verification failed: ${response.status} ${errorText}`);
      
      if (response.status === 404) {
        res.status(200).json({ 
          ok: true, 
          isPaid: false, 
          reason: 'Payment not found. Please check your Payment ID and try again.' 
        });
      } else if (response.status === 401 || response.status === 403) {
        res.status(500).json({ 
          ok: false, 
          isPaid: false, 
          reason: 'Server configuration error. Please contact support.' 
        });
      } else {
        res.status(502).json({ 
          ok: false, 
          isPaid: false, 
          code: response.status,
          reason: 'Payment service temporarily unavailable. Please try again.' 
        });
      }
      return;
    }

    const data: any = await response.json();
    const status = String(data?.status || '');
    const isPaid = isPaymentStatusSuccessful(status);
    
    console.log(`Payment ${paymentId} status: ${status}, isPaid: ${isPaid}`);

    if (isPaid) {
      res.status(200).json({ 
        ok: true, 
        isPaid: true, 
        status, 
        product_id: data?.product_id || null,
        customer_id: data?.customer_id || null
      });
    } else {
      res.status(200).json({ 
        ok: true, 
        isPaid: false, 
        status,
        reason: getPaymentErrorReason(status),
        product_id: data?.product_id || null
      });
    }

  } catch (e: any) {
    console.error('Server error verifying payment:', e);
    res.status(500).json({ 
      ok: false, 
      isPaid: false,
      reason: 'An unexpected error occurred. Please try again.' 
    });
  }
}
