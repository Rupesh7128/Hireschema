export interface InternalLinkRule {
  keyword: string;
  url: string;
}

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeSafeUrl = (value: string): string => {
  const input = String(value || '').trim();
  if (!input) return '';

  if (input.startsWith('/')) return input;
  if (input.startsWith('#')) return input;

  try {
    const parsed = new URL(input);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') ? parsed.toString() : '';
  } catch {
    return '';
  }
};

const stripDangerousTags = (html: string): string =>
  html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>[\s\S]*?>/gi, '')
    .replace(/<link[\s\S]*?>/gi, '')
    .replace(/<meta[\s\S]*?>/gi, '');

const stripEventHandlers = (html: string): string =>
  html
    .replace(/\son[a-z0-9_-]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z0-9_-]+\s*=\s*'[^']*'/gi, '')
    .replace(/\son[a-z0-9_-]+\s*=\s*[^\s>]+/gi, '');

const stripUnsafeUrls = (html: string): string =>
  html
    .replace(/\s(href|src)\s*=\s*"(javascript:|data:|vbscript:)[^"]*"/gi, '')
    .replace(/\s(href|src)\s*=\s*'(javascript:|data:|vbscript:)[^']*'/gi, '')
    .replace(/\s(href|src)\s*=\s*(javascript:|data:|vbscript:)[^\s>]+/gi, '');

export const sanitizeBlogHtml = (input: string): string => {
  const html = String(input || '');
  return stripUnsafeUrls(stripEventHandlers(stripDangerousTags(html)));
};

export const applyInternalLinks = (content: string, rules: InternalLinkRule[]): string => {
  let output = String(content || '');
  for (const rule of rules || []) {
    const keyword = String(rule?.keyword || '').trim();
    const href = normalizeSafeUrl(rule?.url || '');
    if (!keyword || !href) continue;

    const pattern = new RegExp(`\\b(${escapeRegExp(keyword)})\\b`, 'gi');
    output = output.replace(
      pattern,
      `<a href="${href}" class="text-white underline underline-offset-4 font-bold hover:text-zinc-200" target="_blank" rel="noopener noreferrer">$1</a>`
    );
  }
  return output;
};

export const prepareBlogContent = (content: string, rules: InternalLinkRule[]): string =>
  sanitizeBlogHtml(applyInternalLinks(content, rules));
