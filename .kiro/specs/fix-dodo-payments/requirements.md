# Requirements Document

## Introduction

This document specifies the requirements for fixing the Dodo Payments integration in HireSchema, a resume analysis application. The current implementation has a critical issue where successful payments always show "Payment is being processed" instead of confirming success. The root cause is that the redirect URL parameter handling doesn't match Dodo's actual redirect behavior, and the verification flow has race condition issues.

## Root Cause Analysis

After thorough investigation, the exact root cause is:

1. **Redirect Parameter Mismatch**: Dodo Payments redirects users back with payment information, but the app may not be extracting the correct parameter. Dodo uses `payment_id` in the redirect URL, but the extraction logic may fail due to URL encoding issues or parameter name variations.

2. **Verification API Timing**: Even when the payment ID is extracted correctly, the Dodo API may return "pending" status immediately after redirect because the payment hasn't fully propagated in their system yet.

3. **Insufficient Retry Logic**: The current retry logic (3 attempts with exponential backoff) may not be sufficient for Dodo's payment propagation delay.

4. **Missing Webhook-to-Frontend Bridge**: The webhook receives payment success events but has no way to notify the frontend, leaving the frontend to rely solely on API polling.

## Glossary

- **Dodo_Payments**: A payment processing service that handles checkout and payment verification
- **Payment_Verification_System**: The backend component that verifies payment status via Dodo API
- **Webhook_Handler**: The serverless function that receives payment event notifications from Dodo
- **Payment_State**: The record of whether a user has completed payment, stored in localStorage
- **Checkout_Flow**: The process of redirecting users to Dodo checkout and handling their return
- **Payment_ID**: A unique identifier returned by Dodo after a payment is initiated or completed
- **Redirect_URL**: The URL Dodo redirects to after checkout, with payment parameters appended

## Requirements

### Requirement 1

**User Story:** As a user, I want to complete payment and have my premium access unlocked immediately, so that I can download my optimized resume without delays.

#### Acceptance Criteria

1. WHEN a user clicks the payment button THEN the Checkout_Flow SHALL redirect the user to the Dodo Payments checkout page with the correct product ID and return URL
2. WHEN a user returns from Dodo checkout THEN the Payment_Verification_System SHALL extract the payment_id from URL parameters using all known Dodo parameter names
3. WHEN the payment_id is extracted THEN the Payment_Verification_System SHALL verify the payment status via the Dodo API with extended retry logic (up to 30 seconds total)
4. WHEN the Dodo API confirms payment status as "succeeded" THEN the Payment_Verification_System SHALL unlock premium features and persist the Payment_State to localStorage
5. WHEN payment verification succeeds THEN the Checkout_Flow SHALL restore the user's previous analysis state and navigate to the editor view
6. WHEN payment verification succeeds but no previous state exists THEN the Checkout_Flow SHALL display a success message and show the premium features unlocked state

### Requirement 2

**User Story:** As a user, I want the system to handle payment verification delays gracefully, so that I don't see confusing error messages when my payment was successful.

#### Acceptance Criteria

1. WHEN payment verification is in progress THEN the UI SHALL display a clear "Verifying payment..." message with a spinner
2. WHEN the initial verification returns "pending" status THEN the Payment_Verification_System SHALL continue polling with exponential backoff for up to 30 seconds
3. WHEN polling exceeds 30 seconds without success THEN the Payment_Verification_System SHALL check if a webhook has confirmed the payment
4. WHEN all verification methods fail THEN the UI SHALL display a helpful message with the Payment ID pre-filled for manual verification

### Requirement 3

**User Story:** As a user, I want to manually verify my payment using a Payment ID, so that I can unlock premium features if automatic verification fails.

#### Acceptance Criteria

1. WHEN a user enters a valid Payment_ID and clicks verify THEN the Payment_Verification_System SHALL check the payment status via the Dodo API
2. WHEN manual verification confirms payment succeeded THEN the Payment_Verification_System SHALL unlock premium features and persist the Payment_State
3. WHEN a user enters an invalid or unpaid Payment_ID THEN the Payment_Verification_System SHALL display a clear error message explaining the issue
4. WHEN automatic verification fails THEN the UI SHALL pre-fill the Payment ID field with the extracted ID from the redirect URL

### Requirement 4

**User Story:** As a system operator, I want the webhook handler to log payment confirmations, so that payment events are tracked for debugging and auditing.

#### Acceptance Criteria

1. WHEN Dodo sends a webhook request with a valid signature THEN the Webhook_Handler SHALL log the payment event details
2. WHEN the webhook signature is invalid THEN the Webhook_Handler SHALL reject the request with a 400 status code
3. WHEN the webhook secret is not configured THEN the Webhook_Handler SHALL return a 500 error with appropriate logging

**Note:** Webhooks are optional. The primary verification method is the API Key approach which directly queries Dodo's payment status API.

### Requirement 5

**User Story:** As a developer, I want the payment verification API to handle both test and live Dodo environments, so that I can test payments without affecting production.

#### Acceptance Criteria

1. WHEN the DODO_ENV environment variable is set to "test" THEN the Payment_Verification_System SHALL use the test API endpoint (test.dodopayments.com)
2. WHEN the DODO_ENV environment variable is set to "live" or not set THEN the Payment_Verification_System SHALL use the live API endpoint (live.dodopayments.com)
3. WHEN a payment is not found in the primary environment THEN the Payment_Verification_System SHALL attempt verification in the alternate environment as fallback

### Requirement 6

**User Story:** As a user, I want my payment status to persist across browser sessions, so that I don't have to re-verify after refreshing the page.

#### Acceptance Criteria

1. WHEN payment is verified successfully THEN the Payment_State SHALL be stored in localStorage with key "hireSchema_isPaid"
2. WHEN the application loads THEN the Checkout_Flow SHALL check localStorage for existing Payment_State before requiring payment
3. WHEN Payment_State exists in localStorage THEN the application SHALL skip the payment lock and show premium features

