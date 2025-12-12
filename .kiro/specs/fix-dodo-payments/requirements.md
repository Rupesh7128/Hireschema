# Requirements Document

## Introduction

This document specifies the requirements for fixing the Dodo Payments integration in HireSchema, a resume analysis application. The current implementation has issues with webhook signature verification, payment state persistence, and checkout flow handling. The goal is to create a robust, reliable payment verification system that works correctly with Dodo Payments API.

## Glossary

- **Dodo_Payments**: A payment processing service that handles checkout and payment verification
- **Payment_Verification_System**: The backend component that verifies payment status via Dodo API
- **Webhook_Handler**: The serverless function that receives payment event notifications from Dodo
- **Payment_State**: The record of whether a user has completed payment, stored in localStorage
- **Checkout_Flow**: The process of redirecting users to Dodo checkout and handling their return
- **Payment_ID**: A unique identifier returned by Dodo after a payment is initiated or completed

## Requirements

### Requirement 1

**User Story:** As a user, I want to complete payment and have my premium access unlocked immediately, so that I can download my optimized resume without delays.

#### Acceptance Criteria

1. WHEN a user clicks the payment button THEN the Checkout_Flow SHALL redirect the user to the Dodo Payments checkout page with the correct product ID and return URL
2. WHEN a user returns from Dodo checkout with a payment_id parameter THEN the Payment_Verification_System SHALL verify the payment status via the Dodo API
3. WHEN the Dodo API confirms payment status as "succeeded" THEN the Payment_Verification_System SHALL unlock premium features and persist the Payment_State to localStorage
4. WHEN payment verification succeeds THEN the Checkout_Flow SHALL restore the user's previous analysis state and navigate to the editor view

### Requirement 2

**User Story:** As a user, I want to manually verify my payment using a Payment ID, so that I can unlock premium features if automatic verification fails.

#### Acceptance Criteria

1. WHEN a user enters a valid Payment_ID and clicks verify THEN the Payment_Verification_System SHALL check the payment status via the Dodo API
2. WHEN manual verification confirms payment succeeded THEN the Payment_Verification_System SHALL unlock premium features and persist the Payment_State
3. WHEN a user enters an invalid or unpaid Payment_ID THEN the Payment_Verification_System SHALL display a clear error message explaining the issue
4. WHEN a user exceeds 5 failed verification attempts THEN the Payment_Verification_System SHALL temporarily lock the verification form

### Requirement 3

**User Story:** As a system operator, I want the webhook handler to correctly process Dodo payment events, so that payment status is tracked reliably.

#### Acceptance Criteria

1. WHEN Dodo sends a webhook request THEN the Webhook_Handler SHALL verify the signature using HMAC-SHA256 with base64 decoding of the webhook secret
2. WHEN the webhook signature is valid and event type is "payment.succeeded" THEN the Webhook_Handler SHALL log the payment success event
3. WHEN the webhook signature is invalid THEN the Webhook_Handler SHALL reject the request with a 400 status code
4. WHEN the webhook payload is malformed THEN the Webhook_Handler SHALL return a 200 status to prevent retries while logging the error

### Requirement 4

**User Story:** As a developer, I want the payment verification API to handle both test and live Dodo environments, so that I can test payments without affecting production.

#### Acceptance Criteria

1. WHEN the DODO_ENV environment variable is set to "test" THEN the Payment_Verification_System SHALL use the test API endpoint (test.dodopayments.com)
2. WHEN the DODO_ENV environment variable is set to "live" or not set THEN the Payment_Verification_System SHALL use the live API endpoint (live.dodopayments.com)
3. WHEN a payment is not found in the primary environment THEN the Payment_Verification_System SHALL attempt verification in the alternate environment as fallback

### Requirement 5

**User Story:** As a user, I want my payment status to persist across browser sessions, so that I don't have to re-verify after refreshing the page.

#### Acceptance Criteria

1. WHEN payment is verified successfully THEN the Payment_State SHALL be stored in localStorage with key "hireSchema_isPaid"
2. WHEN the application loads THEN the Checkout_Flow SHALL check localStorage for existing Payment_State before requiring payment
3. WHEN Payment_State exists in localStorage THEN the application SHALL skip the payment lock and show premium features
