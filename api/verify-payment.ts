import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPayment, isPaymentSucceeded } from './_paymentsStore'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const paymentId = String(body?.paymentId || '')
    if (!paymentId) {
      res.status(400).json({ ok: false, error: 'Missing paymentId' })
      return
    }

    const record = getPayment(paymentId)
    const paidByWebhook = isPaymentSucceeded(paymentId)
    if (paidByWebhook) {
      res.status(200).json({ ok: true, isPaid: true, status: record?.status || null, product_id: record?.product_id || null })
      return
    }

    const env = process.env || {}
    const apiKey = env.DODO_PAYMENTS_API_KEY || ''
    if (!apiKey) {
      res.status(200).json({ ok: false, isPaid: false, reason: 'no_server_secret' })
      return
    }

    const mode = String(env.VITE_DODO_ENV || 'live').toLowerCase()
    const base = mode === 'test' ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com'
    const r = await fetch(`${base}/payments/${paymentId}`, { method: 'GET', headers: { Authorization: `Bearer ${apiKey}` } })
    if (!r.ok) {
      const txt = await r.text()
      const code = r.status
      if (code === 404 || code === 401) {
        const other = base.includes('test') ? 'https://live.dodopayments.com' : 'https://test.dodopayments.com'
        const rr = await fetch(`${other}/payments/${paymentId}`, { method: 'GET', headers: { Authorization: `Bearer ${apiKey}` } })
        if (!rr.ok) {
          const t2 = await rr.text()
          res.status(rr.status).json({ ok: false, isPaid: false, code: rr.status, reason: t2 })
          return
        }
        const d2 = await rr.json()
        const s2 = String(d2?.status || '').toLowerCase()
        const p2 = ['succeeded', 'paid', 'completed', 'success'].includes(s2)
        res.status(200).json({ ok: true, isPaid: p2, status: s2, product_id: d2?.product_id || null })
        return
      }
      res.status(code).json({ ok: false, isPaid: false, code, reason: txt })
      return
    }
    const data = await r.json()
    const status = String(data?.status || '').toLowerCase()
    const isPaid = ['succeeded', 'paid', 'completed', 'success'].includes(status)
    res.status(200).json({ ok: true, isPaid, status, product_id: data?.product_id || null })
  } catch (e: any) {
    res.status(500).json({ ok: false, reason: e?.message || 'Server error' })
  }
}
