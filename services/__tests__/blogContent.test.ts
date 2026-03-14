import { describe, it, expect } from 'vitest';
import { applyInternalLinks, prepareBlogContent, sanitizeBlogHtml } from '../blogContent';

describe('blogContent', () => {
  it('removes executable script payloads and event handlers', () => {
    const input = `
      <h1 onclick="alert(1)">Title</h1>
      <script>alert('xss')</script>
      <a href="javascript:alert(1)">bad</a>
    `;

    const output = sanitizeBlogHtml(input);
    expect(output).not.toContain('<script');
    expect(output).not.toContain('onclick=');
    expect(output).not.toContain('javascript:');
  });

  it('injects only safe internal links', () => {
    const output = applyInternalLinks('Learn ATS optimization now.', [
      { keyword: 'ATS', url: 'https://example.com/ats' },
      { keyword: 'optimization', url: 'javascript:alert(1)' }
    ]);

    expect(output).toContain('href="https://example.com/ats"');
    expect(output).not.toContain('javascript:');
  });

  it('prepares sanitized content with safe links end-to-end', () => {
    const output = prepareBlogContent(
      '<p onclick="x()">ATS score tips</p><iframe src="https://bad.com"></iframe>',
      [{ keyword: 'ATS', url: '/blog/ats-guide' }]
    );

    expect(output).toContain('href="/blog/ats-guide"');
    expect(output).not.toContain('onclick=');
    expect(output).not.toContain('<iframe');
  });
});
