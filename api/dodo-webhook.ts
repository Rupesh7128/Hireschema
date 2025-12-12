import * as crypto from 'crypto'

/**
 * Verifies the webhook signature from Dodo Payments.
 * 
 * Dodo uses the following signature format:
 * - Header: webhook-signature contains "v1,<base64-signature>"
 * - Signed message: `${webhookId}.${timestamp}.${payload}`
 * - Secret: base64-encoded, must be decoded before HMAC computation
 * - Algorithm: HMAC-SHA256, output as base64
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  webhookId: string,
  secret: string
): boolean {
  if (!signature || !timestamp || !webhookId || !secret) {
    return false
  }

  // Parse signature - format is "v1,<base64-signature>" or just "<base64-signature>"
  const signatures = signature.split(' ')
  let signatureToVerify: string | null = null
  
  for (const sig of signatures) {
    const parts = sig.split(',')
    if (parts.length === 2 && parts[0] === 'v1') {
      signatureToVerify = parts[1]
      break
    } else if (parts.length === 1) {
      // Fallback: signature without version prefix
      signatureToVerify = parts[0]
    }
  }

  if (!signatureToVerify) {
    return false
  }

  // Decode the webhook secret from base64
  let decodedSecret: Buffer
  try {
    decodedSecret = Buffer.from(secret, 'base64')
  } catch {
    // If secret is not base64, use it as-is
    decodedSecret = Buffer.from(secret, 'utf8')
  }

  // Construct the signed message
  const signedMessage = `${webhookId}.${timestamp}.${payload}`
  
  // Compute HMAC-SHA256 and encode as base64
  const expectedSignature = crypto
    .createHmac('sha256', decodedSecret)
    .update(signedMessage)
    .digest('base64')

  // Timing-safe comparison
  try {
    const sigBuffer = Buffer.from(signatureToVerify, 'base64')
    const expectedBuffer = Buffer.from(expectedSignature, 'base64')
    
    if (sigBuffer.length !== expectedBuffer.length) {
      return false
    }
    
    return crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  } catch {
    return false
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed')
    return
  }

  const secret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET || ''
  if (!secret) {
    console.error('Webhook secret not configured')
    res.status(500).json({ error: 'Webhook secret not configured' })
    return
  }

  // Read raw body
  let raw: string
  if (typeof req.body === 'string') {
    raw = req.body
  } else if (req.body && typeof req.body === 'object') {
    raw = JSON.stringify(req.body)
  } else {
    const chunks: Buffer[] = []
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    raw = Buffer.concat(chunks).toString('utf8')
  }

  const webhookId = String(req.headers['webhook-id'] || '')
  const signature = String(req.headers['webhook-signature'] || '')
  const timestamp = String(req.headers['webhook-timestamp'] || '')

  // Verify signature
  const isValid = verifyWebhookSignature(raw, signature, timestamp, webhookId, secret)
  
  if (!isValid) {
    console.warn('Invalid webhook signature', { webhookId, timestamp, hasSignature: !!signature })
    res.status(400).json({ error: 'Invalid signature' })
    return
  }

  // Parse and process payload
  let payload: any = null
  try {
    payload = JSON.parse(raw)
  } catch (e) {
    console.error('Failed to parse webhook payload', e)
    // Return 200 to prevent retries for malformed payloads
    res.status(200).json({ received: true, error: 'Invalid JSON' })
    return
  }

  const eventType = String(payload?.type || '').toLowerCase()
  const paymentId = payload?.data?.payment_id || payload?.data?.id || ''
  const status = payload?.data?.status || ''
  const productId = payload?.data?.product_id || null

  console.log('dodo_webhook received', { 
    eventType, 
    webhookId, 
    timestamp, 
    paymentId,
    status,
    productId
  })

  // Log successful payments (no longer storing in memory as it's unreliable)
  if (eventType === 'payment.succeeded' && paymentId) {
    console.log('Payment succeeded via webhook', { paymentId, status, productId })
  }

  res.status(200).json({ received: true })
}
