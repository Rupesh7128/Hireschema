
export const PRODUCT_ID = (import.meta as any).env.VITE_DODO_PRODUCT_ID || 'pdt_d7rp85iimkphiaGBV5fxV';

export const verifyDodoPayment = async (paymentId: string): Promise<boolean> => {
  // Ideally this key should be an environment variable
  const DODO_API_KEY = (import.meta as any).env.VITE_DODO_API_KEY || "cjqzam76LbyDX8cj.rsclL18HXjWymrluMBcSI-_nmDzOJrQVV6hwiW3WsytX41HC"; 
  
  try {
    console.log(`Verifying payment: ${paymentId.substring(0, 10)}...`);
    const response = await fetch(`https://live.dodopayments.com/payments/${paymentId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${DODO_API_KEY}`
        }
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Payment verification failed: ${response.status} ${response.statusText}`, errorText);
        return false;
    }
    
    const data = await response.json();
    console.log("Payment data:", data);
    const status = data.status?.toLowerCase();
    
    // 1. Check if status is successful
    const isPaid = status === 'succeeded' || status === 'paid' || status === 'completed';
    if (!isPaid) {
        console.warn(`Payment status is '${status}', not 'succeeded'.`);
        return false;
    }

    // 2. SECURITY CHECK: Verify this payment was actually for OUR product
    // This prevents users from using a valid payment ID from a different product/merchant
    if (data.product_id && data.product_id !== PRODUCT_ID) {
        console.warn(`Security Warning: Payment ID ${paymentId} is valid but for wrong product: ${data.product_id}`);
        return false;
    }
    
    return true;
  } catch (e) {
    console.error("Payment check failed", e);
    return false;
  }
}
