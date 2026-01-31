/**
 * State Persistence Service
 * 
 * Handles saving and restoring application state before/after payment redirect.
 * This ensures users don't lose their resume analysis when redirected to Dodo checkout.
 */

import { FileData, AnalysisResult } from '../types';

const STATE_KEY = 'hireSchema_pendingState';
const STATE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * State that needs to be persisted across payment redirect
 */
export interface PersistedState {
  analysisId?: string; // ID of the history item
  resumeFile: FileData;
  resumeText: string;
  jobDescription: string;
  analysisResult: AnalysisResult;
  timestamp: number;
}

/**
 * Validates that a persisted state object has all required fields
 */
export function isValidPersistedState(state: any): state is PersistedState {
  if (!state || typeof state !== 'object') {
    console.log('isValidPersistedState: state is null or not an object');
    return false;
  }
  if (!state.resumeFile || typeof state.resumeFile !== 'object') {
    console.log('isValidPersistedState: resumeFile missing or invalid');
    return false;
  }
  if (typeof state.resumeText !== 'string') {
    console.log('isValidPersistedState: resumeText missing or not a string');
    return false;
  }
  if (typeof state.jobDescription !== 'string') {
    console.log('isValidPersistedState: jobDescription missing or not a string');
    return false;
  }
  if (!state.analysisResult || typeof state.analysisResult !== 'object') {
    console.log('isValidPersistedState: analysisResult missing or invalid');
    return false;
  }
  if (typeof state.timestamp !== 'number') {
    console.log('isValidPersistedState: timestamp missing or not a number');
    return false;
  }
  return true;
}

/**
 * Checks if a persisted state has expired
 */
export function isStateExpired(state: PersistedState): boolean {
  const now = Date.now();
  return now - state.timestamp > STATE_EXPIRY_MS;
}

/**
 * Saves the current state to localStorage before payment redirect.
 * 
 * @param state - The state to persist
 */
export function saveStateBeforePayment(state: Omit<PersistedState, 'timestamp'>): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn('localStorage not available');
      return;
    }

    const stateWithTimestamp: PersistedState = {
      ...state,
      timestamp: Date.now(),
    };

    localStorage.setItem(STATE_KEY, JSON.stringify(stateWithTimestamp));
    console.log('State saved before payment redirect:', {
      hasResumeFile: !!state.resumeFile,
      resumeTextLength: state.resumeText?.length || 0,
      jobDescriptionLength: state.jobDescription?.length || 0,
      hasAnalysisResult: !!state.analysisResult
    });
  } catch (e) {
    console.error('Failed to save state before payment:', e);
  }
}

/**
 * Restores the state from localStorage after payment redirect.
 * Returns null if no state exists, state is invalid, or state has expired.
 * 
 * @returns The restored state or null
 */
export function restoreStateAfterPayment(): PersistedState | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      console.log('restoreStateAfterPayment: localStorage not available');
      return null;
    }

    const stored = localStorage.getItem(STATE_KEY);
    if (!stored) {
      console.log('restoreStateAfterPayment: no stored state found in localStorage');
      return null;
    }

    console.log('restoreStateAfterPayment: found stored state, parsing...');
    const parsed = JSON.parse(stored);
    
    if (!isValidPersistedState(parsed)) {
      console.warn('restoreStateAfterPayment: invalid persisted state structure, clearing');
      console.log('Parsed state keys:', Object.keys(parsed || {}));
      clearPersistedState();
      return null;
    }

    if (isStateExpired(parsed)) {
      console.warn('restoreStateAfterPayment: persisted state expired, clearing');
      clearPersistedState();
      return null;
    }

    console.log('restoreStateAfterPayment: state restored successfully');
    return parsed;
  } catch (e) {
    console.error('restoreStateAfterPayment: failed to restore state:', e);
    clearPersistedState();
    return null;
  }
}

/**
 * Clears the persisted state from localStorage.
 */
export function clearPersistedState(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(STATE_KEY);
    }
  } catch (e) {
    console.error('Failed to clear persisted state:', e);
  }
}
