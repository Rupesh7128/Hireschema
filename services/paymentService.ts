
export const PRODUCT_ID = (import.meta as any).env.VITE_DODO_PRODUCT_ID || '';

export const verifyDodoPayment = async (paymentId: string): Promise<{ ok: boolean; isPaid: boolean; status?: string; product_id?: string | null; code?: number; reason?: string }> => {
  try {
    if (!paymentId) return { ok: false, isPaid: false, reason: 'missing_payment_id' };
    const res = await fetch('/api/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, isPaid: false, code: res.status, reason: json?.reason };
    const ok = !!json?.ok;
    const isPaid = !!json?.isPaid;
    const status = json?.status;
    const product_id = json?.product_id ?? null;
    if (PRODUCT_ID && product_id && product_id !== PRODUCT_ID) return { ok: true, isPaid: false, status, product_id, reason: 'product_mismatch' };
    return { ok, isPaid, status, product_id };
  } catch (e: any) {
    return { ok: false, isPaid: false, reason: e?.message };
  }
}
