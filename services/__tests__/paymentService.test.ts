import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fc from 'fast-check'
import { 
  buildCheckoutUrl, 
  savePaymentState,
  isIdPaid,
  clearAllPayments
} from '../paymentService'

// Mock localStorage for testing
const createLocalStorageMock = () => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (index: number) => Object.keys(store)[index] || null
  }
}

describe('Payment Service', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>

  beforeEach(() => {
    localStorageMock = createLocalStorageMock()
    // Setup window and localStorage mock
    ;(global as any).window = { localStorage: localStorageMock }
    ;(global as any).localStorage = localStorageMock
  })

  afterEach(() => {
    localStorageMock.clear()
    delete (global as any).window
    delete (global as any).localStorage
  })

  /**
   * **Feature: fix-dodo-payments, Property 1: Checkout URL contains required parameters**
   * 
   * *For any* product ID and return URL, the constructed checkout URL SHALL contain 
   * the product ID in the path and the return URL as an encoded query parameter.
   * 
   * **Validates: Requirements 1.1**
   */
  describe('Property 1: Checkout URL contains required parameters', () => {
    it('URL contains product ID in path', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/') && !s.includes('?')),
          fc.webUrl(),
          (productId, returnUrl) => {
            const url = buildCheckoutUrl(productId, returnUrl)
            
            // URL should contain the product ID in the path
            expect(url).toContain(`/buy/${productId}`)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('URL contains encoded return URL as query parameter', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/') && !s.includes('?')),
          fc.webUrl(),
          (productId, returnUrl) => {
            const url = buildCheckoutUrl(productId, returnUrl)
            
            // URL should contain redirect_url parameter
            expect(url).toContain('redirect_url=')
            
            // The return URL should be encoded
            const encodedReturnUrl = encodeURIComponent(returnUrl)
            expect(url).toContain(encodedReturnUrl)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('URL uses correct Dodo checkout base', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/') && !s.includes('?')),
          fc.webUrl(),
          (productId, returnUrl) => {
            const url = buildCheckoutUrl(productId, returnUrl)
            
            // URL should start with Dodo checkout base
            expect(url).toMatch(/^https:\/\/checkout\.dodopayments\.com\/buy\//)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('returns empty string for missing product ID', () => {
      const url = buildCheckoutUrl('', 'https://example.com')
      expect(url).toBe('')
    })

    it('handles special characters in return URL', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/') && !s.includes('?')),
          fc.string({ minLength: 1 }).map(s => `https://example.com/app?param=${s}&other=value`),
          (productId, returnUrl) => {
            const url = buildCheckoutUrl(productId, returnUrl)
            
            // Should be a valid URL (no unencoded special chars breaking it)
            expect(() => new URL(url)).not.toThrow()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: fix-dodo-payments, Property 7: Payment state persistence round-trip**
   * 
   * *For any* successful payment verification, storing the state and then reading 
   * it back SHALL return the same isPaid value.
   * 
   * **Validates: Requirements 5.1, 5.3**
   */
  describe('Property 7: Payment state persistence round-trip', () => {
    it('saving an id and reading returns true for that id', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 64 }),
          (analysisId) => {
            savePaymentState(analysisId)
            expect(isIdPaid(analysisId)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('does not mark different ids as paid', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 64 }),
          fc.string({ minLength: 1, maxLength: 64 }),
          (paidId, otherId) => {
            fc.pre(paidId !== otherId)
            localStorageMock.clear()
            savePaymentState(paidId)
            expect(isIdPaid(otherId)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('round-trip preserves paid status for id', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 64 }),
          (analysisId) => {
            savePaymentState(analysisId)
            expect(isIdPaid(analysisId)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('clearing state resets to false', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 64 }),
          (analysisId) => {
            savePaymentState(analysisId)
            clearAllPayments()
            expect(isIdPaid(analysisId)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('default state is false when nothing saved', () => {
      localStorageMock.clear()
      expect(isIdPaid('any-id')).toBe(false)
    })
  })
})
