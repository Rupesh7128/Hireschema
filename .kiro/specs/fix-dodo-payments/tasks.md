# Implementation Plan

- [x] 1. Fix webhook signature verification
  - [x] 1.1 Update webhook handler to use correct Dodo signature format
    - Parse signature header format "v1,<base64-signature>"
    - Decode webhook secret from base64 before HMAC computation
    - Use correct signed message format: `${webhookId}.${timestamp}.${payload}`
    - _Requirements: 3.1, 3.3_
  - [x] 1.2 Write property test for webhook signature verification
    - **Property 4: Webhook signature verification round-trip**
    - **Validates: Requirements 3.1**
  - [x] 1.3 Write property test for invalid signature rejection
    - **Property 5: Invalid webhook signatures are rejected**
    - **Validates: Requirements 3.3**

- [x] 2. Fix payment verification API
  - [x] 2.1 Update verify-payment endpoint to handle Dodo API responses correctly
    - Remove dependency on in-memory payment store
    - Parse Dodo payment status correctly
    - Return clear error reasons for failed verifications
    - _Requirements: 1.2, 2.1, 2.3_
  - [x] 2.2 Implement environment-based URL selection
    - Use test.dodopayments.com when DODO_ENV=test
    - Use live.dodopayments.com otherwise
    - Keep fallback logic for cross-environment verification
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 2.3 Write property test for environment URL selection
    - **Property 6: Environment-based URL construction**
    - **Validates: Requirements 4.1, 4.2**
  - [x] 2.4 Write property test for failed verification error handling
    - **Property 3: Failed verification returns appropriate error**
    - **Validates: Requirements 2.3**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Fix frontend payment service
  - [x] 4.1 Update checkout URL construction
    - Use correct Dodo checkout URL format
    - Ensure return URL is properly encoded
    - Add product ID validation
    - _Requirements: 1.1_
  - [x] 4.2 Write property test for checkout URL construction
    - **Property 1: Checkout URL contains required parameters**
    - **Validates: Requirements 1.1**
  - [x] 4.3 Update payment state management
    - Ensure localStorage is updated on successful verification
    - Add helper functions for reading/writing payment state
    - _Requirements: 1.3, 5.1, 5.2, 5.3_
  - [x] 4.4 Write property test for payment state persistence
    - **Property 7: Payment state persistence round-trip**
    - **Validates: Requirements 5.1, 5.3**

- [x] 5. Update PaymentLock component
  - [x] 5.1 Fix checkout redirect logic
    - Use updated buildCheckoutUrl function
    - Ensure correct return URL is passed
    - _Requirements: 1.1_
  - [x] 5.2 Improve error handling and user feedback
    - Show clearer error messages based on verification result
    - Add retry button for network errors
    - _Requirements: 2.3, 2.4_

- [x] 6. Update App.tsx payment callback handling
  - [x] 6.1 Fix payment verification on redirect
    - Extract payment_id from URL correctly
    - Call verification API and handle response
    - Update isPaid state and localStorage on success
    - _Requirements: 1.2, 1.3, 1.4_
  - [x] 6.2 Improve retry logic for webhook delays
    - Add exponential backoff for retries
    - Limit retry attempts to prevent infinite loops
    - _Requirements: 1.2_

- [x] 7. Remove unused in-memory payment store
  - [x] 7.1 Delete _paymentsStore.ts file
    - Remove the file as it's no longer needed
    - Update any imports that reference it
    - _Requirements: 3.2_

- [x] 8. Fix post-payment navigation when no previous state exists
  - [x] 8.1 Update restoreUserState to handle missing state gracefully
    - When no persisted state exists and no history exists, show a success message
    - Ensure dashboardView is set appropriately after successful payment
    - Clear the payment verification overlay after success
    - _Requirements: 1.5, 1.6_
  - [x] 8.2 Add success feedback after payment verification
    - Show a brief success toast or message when payment is verified
    - Ensure the user knows their premium features are unlocked
    - _Requirements: 1.4, 1.6_

- [x] 9. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
