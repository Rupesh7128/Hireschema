type PaymentRecord = { status: string; ts: number; product_id?: string | null }
const store: Map<string, PaymentRecord> = new Map()

export function markPaymentSucceeded(id: string, status: string, product_id?: string | null) {
  store.set(id, { status, ts: Date.now(), product_id: product_id ?? null })
}

export function getPayment(id: string): PaymentRecord | undefined {
  return store.get(id)
}

export function isPaymentSucceeded(id: string): boolean {
  const rec = store.get(id)
  const s = String(rec?.status || '').toLowerCase()
  return ['succeeded', 'paid', 'completed', 'success'].includes(s)
}
