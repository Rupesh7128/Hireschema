/**
 * State Persistence Service
 * 
 * Handles saving and restoring application state before/after payment redirect.
 * This ensures users don't lose their resume analysis when redirected to Dodo checkout.
 */

import { FileData, AnalysisResult } from '../types';
import { storageService } from './storageService';

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
    return false;
  }
  if (!state.resumeFile || typeof state.resumeFile !== 'object') {
    return false;
  }
  if (typeof state.resumeText !== 'string') {
    return false;
  }
  if (typeof state.jobDescription !== 'string') {
    return false;
  }
  if (!state.analysisResult || typeof state.analysisResult !== 'object') {
    return false;
  }
  if (typeof state.timestamp !== 'number') {
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
export async function saveStateBeforePayment(state: Omit<PersistedState, 'timestamp'>): Promise<void> {
  try {
    const stateWithTimestamp: PersistedState = {
      ...state,
      timestamp: Date.now(),
    };

    await storageService.setJSON(STATE_KEY, stateWithTimestamp);
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
export async function restoreStateAfterPayment(): Promise<PersistedState | null> {
  try {
    await storageService.migrateFromLocalStorage(STATE_KEY);
    const parsed = await storageService.getJSON<PersistedState>(STATE_KEY);
    if (!parsed) {
      return null;
    }

    if (!isValidPersistedState(parsed)) {
      console.warn('restoreStateAfterPayment: invalid persisted state structure, clearing');
      await clearPersistedState();
      return null;
    }

    if (isStateExpired(parsed)) {
      console.warn('restoreStateAfterPayment: persisted state expired, clearing');
      await clearPersistedState();
      return null;
    }

    return parsed;
  } catch (e) {
    console.error('restoreStateAfterPayment: failed to restore state:', e);
    await clearPersistedState();
    return null;
  }
}

/**
 * Clears the persisted state from localStorage.
 */
export async function clearPersistedState(): Promise<void> {
  try {
    await storageService.remove(STATE_KEY);
  } catch (e) {
    console.error('Failed to clear persisted state:', e);
  }
}
