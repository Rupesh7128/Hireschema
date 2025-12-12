import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { 
  getDodoApiBaseUrl, 
  getAlternateDodoApiBaseUrl, 
  isPaymentStatusSuccessful,
  getPaymentErrorReason,
  isValidPaymentIdFormat
} from '../verify-payment'

describe('Payment Verification API', () => {
  /**
   * **Feature: fix-dodo-payments, Property 6: Environment-based URL construction**
   * 
   * *For any* DODO_ENV value, the API base URL SHALL be "test.dodopayments.com" 
   * when env is "test", and "live.dodopayments.com" otherwise.
   * 
   * **Validates: Requirements 4.1, 4.2**
   */
  describe('Property 6: Environment-based URL construction', () => {
    it('returns test URL when DODO_ENV is "test"', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('test', 'TEST', 'Test', 'TEST'),
          (envValue) => {
            const env = { DODO_ENV: envValue }
            const url = getDodoApiBaseUrl(env)
            expect(url).toBe('https://test.dodopayments.com')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('returns live URL when DODO_ENV is "live" or not set', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('live', 'LIVE', 'Live', 'production', '', undefined),
          (envValue) => {
            const env: Record<string, string | undefined> = envValue !== undefined 
              ? { DODO_ENV: envValue } 
              : {}
            const url = getDodoApiBaseUrl(env)
            expect(url).toBe('https://live.dodopayments.com')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('VITE_DODO_ENV takes precedence over DODO_ENV', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('test', 'live'),
          fc.constantFrom('test', 'live'),
          (viteEnv, dodoEnv) => {
            const env = { VITE_DODO_ENV: viteEnv, DODO_ENV: dodoEnv }
            const url = getDodoApiBaseUrl(env)
            const expectedUrl = viteEnv === 'test' 
              ? 'https://test.dodopayments.com' 
              : 'https://live.dodopayments.com'
            expect(url).toBe(expectedUrl)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('alternate URL is opposite of primary', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('test', 'live', '', undefined),
          (envValue) => {
            const env: Record<string, string | undefined> = envValue !== undefined 
              ? { DODO_ENV: envValue } 
              : {}
            const primary = getDodoApiBaseUrl(env)
            const alternate = getAlternateDodoApiBaseUrl(env)
            
            // Primary and alternate should be different
            expect(primary).not.toBe(alternate)
            
            // Both should be valid Dodo URLs
            expect([
              'https://test.dodopayments.com',
              'https://live.dodopayments.com'
            ]).toContain(primary)
            expect([
              'https://test.dodopayments.com',
              'https://live.dodopayments.com'
            ]).toContain(alternate)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: fix-dodo-payments, Property 3: Failed verification returns appropriate error**
   * 
   * *For any* payment verification response where status is not "succeeded" or API returns error,
   * the result SHALL contain isPaid=false and a descriptive reason.
   * 
   * **Validates: Requirements 2.3**
   */
  describe('Property 3: Failed verification returns appropriate error', () => {
    it('non-success statuses return isPaid=false', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('pending', 'failed', 'cancelled', 'canceled', 'refunded', 'expired', 'unknown', ''),
          (status) => {
            const isPaid = isPaymentStatusSuccessful(status)
            expect(isPaid).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('success statuses return isPaid=true', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('succeeded', 'paid', 'completed', 'success', 'SUCCEEDED', 'PAID'),
          (status) => {
            const isPaid = isPaymentStatusSuccessful(status)
            expect(isPaid).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('failed statuses have descriptive error reasons', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('pending', 'failed', 'cancelled', 'refunded', 'expired', ''),
          (status) => {
            const reason = getPaymentErrorReason(status)
            
            // Reason should be a non-empty string
            expect(typeof reason).toBe('string')
            expect(reason.length).toBeGreaterThan(0)
            
            // Reason should not contain technical jargon
            expect(reason.toLowerCase()).not.toContain('error code')
            expect(reason.toLowerCase()).not.toContain('exception')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('random statuses get a generic but helpful message', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => 
            !['succeeded', 'paid', 'completed', 'success', 'pending', 'failed', 'cancelled', 'canceled', 'refunded', 'expired'].includes(s.toLowerCase())
          ),
          (randomStatus) => {
            const reason = getPaymentErrorReason(randomStatus)
            
            // Should include the status in the message
            expect(reason.toLowerCase()).toContain(randomStatus.toLowerCase())
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})


  /**
   * **Feature: improve-analysis-consistency, Property 1: Payment ID format validation**
   * 
   * *For any* payment ID string, the validation function SHALL return false for strings 
   * that don't match the expected format (alphanumeric, 10-60 characters).
   * 
   * **Validates: Requirements 2.3**
   */
  describe('Property 1: Payment ID format validation', () => {
    it('valid alphanumeric IDs (10-60 chars) pass validation', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-zA-Z0-9_-]{10,60}$/),
          (paymentId) => {
            expect(isValidPaymentIdFormat(paymentId)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('IDs shorter than 10 chars fail validation', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 9 }),
          (shortId) => {
            expect(isValidPaymentIdFormat(shortId)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('IDs longer than 60 chars fail validation', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 61, maxLength: 100 }),
          (longId) => {
            expect(isValidPaymentIdFormat(longId)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('IDs with special characters fail validation', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 60 }).filter(s => /[^a-zA-Z0-9_-]/.test(s)),
          (invalidId) => {
            expect(isValidPaymentIdFormat(invalidId)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('empty and null values fail validation', () => {
      expect(isValidPaymentIdFormat('')).toBe(false)
      expect(isValidPaymentIdFormat(null as any)).toBe(false)
      expect(isValidPaymentIdFormat(undefined as any)).toBe(false)
    })
  })
