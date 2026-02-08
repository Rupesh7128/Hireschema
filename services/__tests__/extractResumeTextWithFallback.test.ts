import { describe, expect, it } from 'vitest';
import { extractResumeTextWithFallback } from '../geminiService';

describe('extractResumeTextWithFallback', () => {
  it('returns empty string for non-pdf files', async () => {
    const text = await extractResumeTextWithFallback({
      name: 'resume.txt',
      type: 'text/plain',
      base64: ''
    });
    expect(text).toBe('');
  });
});

