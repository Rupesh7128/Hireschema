# Implementation Plan

- [x] 1. Fix inconsistent AI results
  - [x] 1.1 Add temperature=0 to Gemini generation config
    - Update generateWithFallback to use temperature=0
    - Update analyzeResume to use deterministic config
    - Update generateContent to use deterministic config
    - _Requirements: 1.1, 1.2_

- [x] 2. Create state persistence service
  - [x] 2.1 Create stateService.ts with save/restore functions
    - Implement saveStateBeforePayment function
    - Implement restoreStateAfterPayment function
    - Implement clearPersistedState function
    - Add timestamp for expiration checking
    - _Requirements: 3.1, 3.2_
  - [x] 2.2 Write property test for state persistence round-trip
    - **Property 3: State persistence round-trip**
    - **Validates: Requirements 3.1, 3.2**

- [x] 3. Fix resume text passing to content generator
  - [x] 3.1 Update analyzeResume to return extracted text
    - Store resumeText in analysis result or separate field
    - Pass resumeText through the component chain
    - _Requirements: 3.3_
  - [x] 3.2 Update generateContent to use full resume text
    - Accept resumeText parameter
    - Include full resume text in AI prompts
    - _Requirements: 3.4_
  - [x] 3.3 Write property test for resume text in prompts
    - **Property 2: Resume text inclusion in prompts**
    - **Validates: Requirements 3.4**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement security hardening
  - [x] 5.1 Remove or disable dev backdoor in PaymentLock
    - Remove the "rupesh" backdoor code
    - Or conditionally disable based on NODE_ENV
    - _Requirements: 2.1_
  - [x] 5.2 Add payment ID format validation
    - Create validatePaymentId function
    - Add validation before API call in verify-payment.ts
    - Return 400 for invalid formats
    - _Requirements: 2.3_
  - [x] 5.3 Write property test for payment ID validation
    - **Property 1: Payment ID format validation**
    - **Validates: Requirements 2.3**

- [x] 6. Update App.tsx to use state persistence
  - [x] 6.1 Save state before payment redirect
    - Call saveStateBeforePayment in PaymentLock
    - Include resumeFile, resumeText, jobDescription, analysisResult
    - _Requirements: 3.1_
  - [x] 6.2 Restore state after payment verification
    - Call restoreStateAfterPayment after successful verification
    - Update component state with restored data
    - _Requirements: 3.2, 3.3_

- [x] 7. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
