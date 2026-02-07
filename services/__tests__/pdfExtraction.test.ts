import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractTextFromPdf } from '../geminiService';

const base64Of = (value: string) => Buffer.from(value, 'utf8').toString('base64');

describe('extractTextFromPdf', () => {
  beforeEach(() => {
    (global as any).atob = (b64: string) => Buffer.from(b64, 'base64').toString('binary');
  });

  it('extracts text across multiple pages', async () => {
    const getTextContent = vi.fn()
      .mockResolvedValueOnce({ items: [{ str: 'Hello', hasEOL: true }, { str: 'World' }] })
      .mockResolvedValueOnce({ items: [{ str: 'Page2', hasEOL: true }, { str: 'Text' }] });

    const fakePdf = {
      numPages: 2,
      getPage: vi.fn(async () => ({
        getTextContent
      }))
    };

    (global as any).window = {
      pdfjsLib: {
        getDocument: vi.fn(() => ({ promise: Promise.resolve(fakePdf) }))
      }
    };

    const text = await extractTextFromPdf(base64Of('fakepdf'));
    expect(text).toContain('Hello');
    expect(text).toContain('World');
    expect(text).toContain('Page2');
    expect(text).toContain('Text');
  });

  it('throws a clear error for password-protected PDFs', async () => {
    (global as any).window = {
      pdfjsLib: {
        getDocument: vi.fn(() => ({ promise: Promise.reject({ name: 'PasswordException', message: 'PasswordException' }) }))
      }
    };

    await expect(extractTextFromPdf(base64Of('fakepdf'))).rejects.toThrow(/password protected/i);
  });
});

