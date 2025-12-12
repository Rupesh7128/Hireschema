# Requirements Document

## Introduction

This document specifies the requirements for improving the HireSchema application in three key areas: (1) consistent analysis results, (2) security hardening against manipulation, and (3) proper state restoration after payment redirect. The goal is to create a more reliable, secure, and user-friendly experience.

## Glossary

- **Analysis_System**: The Gemini AI-powered component that analyzes resumes and generates content
- **Resume_State**: The user's uploaded resume, job description, and analysis results stored in the application
- **Payment_Redirect**: The process of redirecting users to Dodo checkout and back to the app
- **Content_Generator**: The component that generates ATS resumes, cover letters, and other content
- **Temperature_Setting**: AI model parameter controlling randomness (0 = deterministic, 1 = creative)
- **Dev_Backdoor**: A testing shortcut that bypasses payment verification

## Requirements

### Requirement 1

**User Story:** As a user, I want consistent analysis results when I upload the same resume and job description, so that I can trust the analysis and make informed decisions.

#### Acceptance Criteria

1. WHEN a user uploads a resume and job description THEN the Analysis_System SHALL use a temperature setting of 0 for deterministic output
2. WHEN the Analysis_System generates content THEN the Content_Generator SHALL use consistent prompts with structured output requirements
3. WHEN a user regenerates content THEN the Analysis_System SHALL produce results within a 10% variance of the original scores

### Requirement 2

**User Story:** As a system operator, I want the application to be secure against payment bypass attempts, so that only paying users can access premium features.

#### Acceptance Criteria

1. WHEN the application is deployed to production THEN the Dev_Backdoor SHALL be disabled or removed
2. WHEN a user attempts to manipulate localStorage payment state THEN the application SHALL verify payment status via the backend API on sensitive operations
3. WHEN the verify-payment API receives a request THEN the API SHALL validate the payment ID format before making external API calls
4. WHEN the application loads THEN the Payment_State SHALL be validated against a server-side check for high-value operations

### Requirement 3

**User Story:** As a user, I want my resume analysis to be preserved after completing payment, so that I can immediately access my optimized content without re-uploading.

#### Acceptance Criteria

1. WHEN a user initiates payment THEN the Resume_State SHALL be persisted to localStorage before redirect
2. WHEN a user returns from payment THEN the application SHALL restore the Resume_State from localStorage
3. WHEN the Resume_State is restored THEN the Content_Generator SHALL use the restored analysis data to generate personalized content
4. WHEN content generation starts after payment THEN the Content_Generator SHALL pass the full resume text to the AI model
