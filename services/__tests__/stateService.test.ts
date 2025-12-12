import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import {
  saveStateBeforePayment,
  restoreStateAfterPayment,
  clearPersistedState,
  isValidPersistedState,
  isStateExpired,
  PersistedState
} from '../stateService'

// Mock localStorage
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

// Arbitrary for generating valid FileData
const fileDataArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
  type: fc.constantFrom('application/pdf', 'image/png', 'text/plain'),
  base64: fc.base64String({ minLength: 10, maxLength: 100 }),
  id: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  uploadDate: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined })
})

// Arbitrary for generating valid ContactProfile
const contactProfileArb = fc.record({
  name: fc.string({ maxLength: 50 }),
  email: fc.string({ maxLength: 50 }),
  phone: fc.string({ maxLength: 20 }),
  linkedin: fc.string({ maxLength: 100 }),
  location: fc.string({ maxLength: 50 }),
  photo: fc.option(fc.string({ maxLength: 100 }), { nil: undefined })
})

// Arbitrary for generating valid AnalysisResult
const analysisResultArb = fc.record({
  jobTitle: fc.option(fc.string({ maxLength: 50 }), { nil: undefined }),
  company: fc.option(fc.string({ maxLength: 50 }), { nil: undefined }),
  atsScore: fc.integer({ min: 0, max: 100 }),
  relevanceScore: fc.integer({ min: 0, max: 100 }),
  roleFitAnalysis: fc.string({ maxLength: 200 }),
  contactProfile: contactProfileArb,
  languages: fc.array(fc.string({ maxLength: 20 }), { maxLength: 5 }),
  missingKeywords: fc.array(fc.string({ maxLength: 30 }), { maxLength: 10 }),
  criticalIssues: fc.array(fc.string({ maxLength: 100 }), { maxLength: 5 }),
  keyStrengths: fc.array(fc.string({ maxLength: 100 }), { maxLength: 5 }),
  summary: fc.string({ maxLength: 500 })
})

// Arbitrary for generating valid PersistedState (without timestamp)
const persistedStateInputArb = fc.record({
  resumeFile: fileDataArb,
  resumeText: fc.string({ maxLength: 1000 }),
  jobDescription: fc.string({ maxLength: 500 }),
  analysisResult: analysisResultArb
})

describe('State Service', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>

  beforeEach(() => {
    localStorageMock = createLocalStorageMock()
    ;(global as any).window = { localStorage: localStorageMock }
    ;(global as any).localStorage = localStorageMock
  })

  afterEach(() => {
    localStorageMock.clear()
    delete (global as any).window
    delete (global as any).localStorage
  })

  /**
   * **Feature: improve-analysis-consistency, Property 3: State persistence round-trip**
   * 
   * *For any* valid persisted state, saving and then restoring SHALL return 
   * an equivalent state object.
   * 
   * **Validates: Requirements 3.1, 3.2**
   */
  describe('Property 3: State persistence round-trip', () => {
    it('saving and restoring returns equivalent state', () => {
      fc.assert(
        fc.property(
          persistedStateInputArb,
          (stateInput) => {
            // Save state
            saveStateBeforePayment(stateInput)
            
            // Restore state
            const restored = restoreStateAfterPayment()
            
            // Should not be null
            expect(restored).not.toBeNull()
            
            // Core fields should match
            expect(restored!.resumeFile).toEqual(stateInput.resumeFile)
            expect(restored!.resumeText).toBe(stateInput.resumeText)
            expect(restored!.jobDescription).toBe(stateInput.jobDescription)
            expect(restored!.analysisResult.atsScore).toBe(stateInput.analysisResult.atsScore)
            expect(restored!.analysisResult.relevanceScore).toBe(stateInput.analysisResult.relevanceScore)
            
            // Timestamp should be set
            expect(typeof restored!.timestamp).toBe('number')
            expect(restored!.timestamp).toBeGreaterThan(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('clearing state removes it', () => {
      fc.assert(
        fc.property(
          persistedStateInputArb,
          (stateInput) => {
            // Save state
            saveStateBeforePayment(stateInput)
            
            // Clear state
            clearPersistedState()
            
            // Restore should return null
            const restored = restoreStateAfterPayment()
            expect(restored).toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('State validation', () => {
    it('isValidPersistedState returns true for valid state', () => {
      fc.assert(
        fc.property(
          persistedStateInputArb,
          fc.integer({ min: 1, max: Date.now() }),
          (stateInput, timestamp) => {
            const state: PersistedState = { ...stateInput, timestamp }
            expect(isValidPersistedState(state)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('isValidPersistedState returns false for invalid state', () => {
      expect(isValidPersistedState(null)).toBe(false)
      expect(isValidPersistedState(undefined)).toBe(false)
      expect(isValidPersistedState({})).toBe(false)
      expect(isValidPersistedState({ resumeFile: null })).toBe(false)
      expect(isValidPersistedState({ resumeFile: {}, resumeText: 123 })).toBe(false)
    })

    it('isStateExpired returns true for old timestamps', () => {
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
      const state = {
        resumeFile: { name: 'test.pdf', type: 'application/pdf', base64: 'abc' },
        resumeText: 'test',
        jobDescription: 'test',
        analysisResult: { atsScore: 50, relevanceScore: 50, roleFitAnalysis: '', contactProfile: { name: '', email: '', phone: '', linkedin: '', location: '' }, languages: [], missingKeywords: [], criticalIssues: [], keyStrengths: [], summary: '' },
        timestamp: oldTimestamp
      } as PersistedState
      
      expect(isStateExpired(state)).toBe(true)
    })

    it('isStateExpired returns false for recent timestamps', () => {
      const recentTimestamp = Date.now() - (1 * 60 * 60 * 1000) // 1 hour ago
      const state = {
        resumeFile: { name: 'test.pdf', type: 'application/pdf', base64: 'abc' },
        resumeText: 'test',
        jobDescription: 'test',
        analysisResult: { atsScore: 50, relevanceScore: 50, roleFitAnalysis: '', contactProfile: { name: '', email: '', phone: '', linkedin: '', location: '' }, languages: [], missingKeywords: [], criticalIssues: [], keyStrengths: [], summary: '' },
        timestamp: recentTimestamp
      } as PersistedState
      
      expect(isStateExpired(state)).toBe(false)
    })
  })
})
