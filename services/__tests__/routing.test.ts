import { describe, it, expect } from 'vitest';
import { parseAppRoute } from '../routing';

describe('parseAppRoute', () => {
  it('parses payment callback routes as dashboard', () => {
    const parsed = parseAppRoute('/pricing', '?paymentId=pay_123');
    expect(parsed.hasPaymentCallback).toBe(true);
    expect(parsed.view).toBe('dashboard');
  });

  it('parses legal pages', () => {
    const parsed = parseAppRoute('/privacy', '');
    expect(parsed.view).toBe('legal');
    expect(parsed.legalPage).toBe('privacy');
  });

  it('parses blog detail slug', () => {
    const parsed = parseAppRoute('/blog/how-to-pass-ats', '');
    expect(parsed.view).toBe('blog');
    expect(parsed.blogSlug).toBe('how-to-pass-ats');
  });

  it('parses feature pages', () => {
    const parsed = parseAppRoute('/feature/cover-letter', '');
    expect(parsed.view).toBe('feature');
    expect(parsed.featureId).toBe('cover-letter');
  });
});
