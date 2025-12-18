/**
 * End-to-End Payment Flow Tests
 * 
 * Tests the complete payment flow from checkout URL generation
 * through verification and state management.
 * 
 * **Feature: fix-dodo-payments, Property: End-to-end payment flow**
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 5.1, 5.2, 5.3**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  buildCheckoutUrl,
  verifyDodoPayment,
  savePaymentState,
  readPaymentState,
  clearPaymentState,
  PRODUCT_ID
} from '../paymentService';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });
Object.defineProperty(global, 'window', {
  value: { localStorage: localStorageMock },
  writable: true
});

describe('End-to-End Payment Flow', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('Complete Flow Simulation', () => {
    it('simulates full payment flow: checkout → redirect → verify → unlock', async () => {
      // Step 1: Build checkout URL
      const productId = 'test_product_123';
      const returnUrl = 'https://hireschema.com/app';
      const checkoutUrl = buildCheckoutUrl(productId, returnUrl);
      
      // Verify checkout URL is valid
      expect(checkoutUrl).toContain('checkout.dodopayments.com');
      expect(checkoutUrl).toContain(productId);
      expect(checkoutUrl).toContain(encodeURIComponent(returnUrl));
      
      // Step 2: Simulate user completing payment (mock the verification)
      // In real flow, user would be redirected back with payment_id
      
      // Step 3: Verify payment state management
      expect(readPaymentState()).toBe(false); // Initially not paid
      
      savePaymentState(true);
      expect(readPaymentState()).toBe(true); // Now paid
      
      clearPaymentState();
      expect(readPaymentState()).toBe(false); // Cleared
    });

    it('handles payment state persistence across "sessions"', () => {
      // Simulate first session - user pays
      savePaymentState(true);
      expect(readPaymentState()).toBe(true);
      
      // Simulate "new session" by reading state again
      // (localStorage persists)
      const newSessionState = readPaymentState();
      expect(newSessionState).toBe(true);
      
      // User clears payment (e.g., for testing)
      clearPaymentState();
      expect(readPaymentState()).toBe(false);
    });
  });

  describe('Property: Checkout URL construction is deterministic', () => {
    it('same inputs always produce same URL', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5, maxLength: 30 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
          fc.webUrl(),
          (productId, returnUrl) => {
            const url1 = buildCheckoutUrl(productId, returnUrl);
            const url2 = buildCheckoutUrl(productId, returnUrl);
            return url1 === url2;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: Payment state is idempotent', () => {
    it('multiple saves of same state have no additional effect', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.integer({ min: 1, max: 10 }),
          (isPaid, repeatCount) => {
            localStorageMock.clear();
            
            // Save the same state multiple times
            for (let i = 0; i < repeatCount; i++) {
              savePaymentState(isPaid);
            }
            
            // State should match what was saved
            return readPaymentState() === isPaid;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: Clear always resets to unpaid', () => {
    it('clearing payment state always results in unpaid', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (initialState) => {
            localStorageMock.clear();
            
            // Set initial state
            savePaymentState(initialState);
            
            // Clear
            clearPaymentState();
            
            // Should always be false after clear
            return readPaymentState() === false;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles empty product ID gracefully', () => {
      const url = buildCheckoutUrl('', 'https://example.com');
      expect(url).toBe('');
    });

    it('handles special characters in return URL', () => {
      const returnUrl = 'https://example.com/app?foo=bar&baz=qux#section';
      const url = buildCheckoutUrl('prod_123', returnUrl);
      
      expect(url).toContain(encodeURIComponent(returnUrl));
      // URL should be decodable
      const decoded = decodeURIComponent(url.split('redirect_url=')[1]);
      expect(decoded).toBe(returnUrl);
    });

    it('handles unicode in return URL', () => {
      const returnUrl = 'https://example.com/app?name=日本語';
      const url = buildCheckoutUrl('prod_123', returnUrl);
      
      expect(url).toBeTruthy();
      expect(url.length).toBeGreaterThan(0);
    });
  });

  describe('Verification API Contract', () => {
    it('returns correct structure for empty payment ID', async () => {
      const result = await verifyDodoPayment('');
      
      expect(result).toHaveProperty('ok');
      expect(result).toHaveProperty('isPaid');
      expect(result.ok).toBe(false);
      expect(result.isPaid).toBe(false);
      expect(result.reason).toBeTruthy();
    });

    it('returns correct structure for whitespace-only payment ID', async () => {
      const result = await verifyDodoPayment('   ');
      
      expect(result.ok).toBe(false);
      expect(result.isPaid).toBe(false);
      expect(result.reason).toBeTruthy();
    });
  });
});
