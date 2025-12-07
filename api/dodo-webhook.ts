import crypto from 'crypto'
import { markPaymentSucceeded } from './_paymentsStore'

function timingSafeEqual(a: string, b: string) {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed')
    return
  }

  const secret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET || ''
  if (!secret) {
    res.status(500).json({ error: 'Webhook secret not configured' })
    return
  }

  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const raw = Buffer.concat(chunks).toString('utf8')

  const id = String(req.headers['webhook-id'] || '')
  const sig = String(req.headers['webhook-signature'] || '')
  const ts = String(req.headers['webhook-timestamp'] || '')

  const signedMessage = `${id}.${ts}.${raw}`
  const digest = crypto.createHmac('sha256', secret).update(signedMessage).digest('hex')

  if (!timingSafeEqual(sig, digest)) {
    res.status(400).json({ error: 'Invalid signature' })
    return
  }

  let payload: any = null
  try {
    payload = JSON.parse(raw)
  } catch {}
  if (payload) {
    const type = payload?.type
    const status = payload?.data?.status
    const paymentId = payload?.data?.payment_id || payload?.data?.id || ''
    console.log('dodo_webhook', { type, id, ts, status, paymentId })
    if (String(type).toLowerCase() === 'payment.succeeded' && paymentId) {
      markPaymentSucceeded(String(paymentId), String(status || 'succeeded'), payload?.data?.product_id || null)
    }
  }
  res.status(200).json({ received: true })
}
