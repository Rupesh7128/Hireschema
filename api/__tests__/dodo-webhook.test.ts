import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import * as crypto from 'crypto'
import { verifyWebhookSignature } from '../dodo-webhook'

/**
 * Helper to create a valid signature for testing
 */
function createSignature(
  payload: string,
  timestamp: string,
  webhookId: string,
  secret: string
): string {
  const decodedSecret = Buffer.from(secret, 'base64')
  const signedMessage = `${webhookId}.${timestamp}.${payload}`
  const signature = crypto
    .createHmac('sha256', decodedSecret)
    .update(signedMessage)
    .digest('base64')
  return `v1,${signature}`
}

describe('Webhook Signature Verification', () => {
  /**
   * **Feature: fix-dodo-payments, Property 4: Webhook signature verification round-trip**
   * 
   * *For any* valid webhook payload, signing it with the secret and then verifying 
   * with the same secret SHALL return true. Verifying with a different secret SHALL return false.
   * 
   * **Validates: Requirements 3.1**
   */
  it('Property 4: sign-then-verify with same secret returns true', () => {
    fc.assert(
      fc.property(
        fc.json(),                           // Random JSON payload
        fc.string({ minLength: 1 }),         // Random timestamp
        fc.string({ minLength: 1 }),         // Random webhook ID
        fc.base64String({ minLength: 16 }),  // Random base64 secret
        (payloadObj, timestamp, webhookId, secret) => {
          const payload = JSON.stringify(payloadObj)
          const signature = createSignature(payload, timestamp, webhookId, secret)
          
          const result = verifyWebhookSignature(payload, signature, timestamp, webhookId, secret)
          
          expect(result).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: fix-dodo-payments, Property 4: Webhook signature verification round-trip**
   * 
   * Verifying with a different secret SHALL return false.
   * 
   * **Validates: Requirements 3.1**
   */
  it('Property 4: verify with different secret returns false', () => {
    fc.assert(
      fc.property(
        fc.json(),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.base64String({ minLength: 16 }),
        fc.base64String({ minLength: 16 }),
        (payloadObj, timestamp, webhookId, secret1, secret2) => {
          // Ensure secrets are different
          fc.pre(secret1 !== secret2)
          
          const payload = JSON.stringify(payloadObj)
          const signature = createSignature(payload, timestamp, webhookId, secret1)
          
          // Verify with different secret should fail
          const result = verifyWebhookSignature(payload, signature, timestamp, webhookId, secret2)
          
          expect(result).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: fix-dodo-payments, Property 5: Invalid webhook signatures are rejected**
   * 
   * *For any* webhook request with an invalid or missing signature, 
   * the handler SHALL return a 400 status code.
   * 
   * **Validates: Requirements 3.3**
   */
  it('Property 5: invalid signatures are rejected', () => {
    fc.assert(
      fc.property(
        fc.json(),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.base64String({ minLength: 16 }),
        fc.string({ minLength: 1, maxLength: 100 }), // Random invalid signature
        (payloadObj, timestamp, webhookId, secret, invalidSig) => {
          const payload = JSON.stringify(payloadObj)
          
          // Test with random invalid signature (not properly formatted)
          const result = verifyWebhookSignature(payload, invalidSig, timestamp, webhookId, secret)
          
          expect(result).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: fix-dodo-payments, Property 5: Invalid webhook signatures are rejected**
   * 
   * Missing signature should be rejected.
   * 
   * **Validates: Requirements 3.3**
   */
  it('Property 5: missing signature is rejected', () => {
    fc.assert(
      fc.property(
        fc.json(),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.base64String({ minLength: 16 }),
        (payloadObj, timestamp, webhookId, secret) => {
          const payload = JSON.stringify(payloadObj)
          
          // Test with empty signature
          expect(verifyWebhookSignature(payload, '', timestamp, webhookId, secret)).toBe(false)
          
          // Test with missing timestamp
          const validSig = createSignature(payload, timestamp, webhookId, secret)
          expect(verifyWebhookSignature(payload, validSig, '', webhookId, secret)).toBe(false)
          
          // Test with missing webhookId
          expect(verifyWebhookSignature(payload, validSig, timestamp, '', secret)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })
})
