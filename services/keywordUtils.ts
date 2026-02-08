const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeKeyword = (value: string) =>
  (value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[–—]/g, '-')
    .trim();

const keywordVariants = (keyword: string) => {
  const base = normalizeKeyword(keyword);
  if (!base) return [];
  const lowered = base.toLowerCase();

  const variants = new Set<string>([base]);

  if (lowered.startsWith('ms ')) variants.add(base.slice(3).trim());
  if (lowered.startsWith('microsoft ')) variants.add(base.slice('microsoft '.length).trim());

  variants.add(base.replace(/\bpowerbi\b/gi, 'Power BI'));
  variants.add(base.replace(/\bpower\s*bi\b/gi, 'PowerBI'));

  variants.add(base.replace(/\bgoogle\s*sheets\b/gi, 'Sheets'));
  variants.add(base.replace(/\bms\s*excel\b/gi, 'Excel'));
  variants.add(base.replace(/\bmicrosoft\s*excel\b/gi, 'Excel'));

  return [...variants]
    .map(v => normalizeKeyword(v))
    .filter(Boolean)
    .slice(0, 10);
};

export const includesKeyword = (haystack: string, keyword: string) => {
  const text = haystack || '';
  const variants = keywordVariants(keyword);
  if (variants.length === 0) return false;

  for (const variant of variants) {
    const safe = escapeRegExp(variant);
    const pattern = `\\b${safe.replace(/\s+/g, '\\s+')}\\b`;
    try {
      if (new RegExp(pattern, 'i').test(text)) return true;
    } catch {
      if (text.toLowerCase().includes(variant.toLowerCase())) return true;
    }
  }
  return false;
};

const KEYWORD_PRIORITY: Record<string, number> = {
  excel: 0,
  'microsoft excel': 0,
  'ms excel': 0,
  'power bi': 1,
  tableau: 1,
  sql: 1,
  'ms sql': 1,
  python: 1,
  'google sheets': 2,
  sheets: 2,
  'data analysis': 2,
  'data analytics': 2,
  'project management': 3,
  'stakeholder management': 3
};

export const prioritizeKeywords = (keywords: string[]) => {
  const withIdx = (keywords || []).filter(Boolean).map((k, idx) => ({ k: String(k).trim(), idx }));
  const scored = withIdx.map(({ k, idx }) => {
    const norm = normalizeKeyword(k).toLowerCase();
    const priority = KEYWORD_PRIORITY[norm] ?? 10;
    const lengthScore = Math.min(50, norm.length);
    return { k, idx, priority, lengthScore };
  });

  scored.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.lengthScore !== b.lengthScore) return a.lengthScore - b.lengthScore;
    return a.idx - b.idx;
  });

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const item of scored) {
    const norm = normalizeKeyword(item.k).toLowerCase();
    if (!norm) continue;
    if (seen.has(norm)) continue;
    seen.add(norm);
    deduped.push(item.k);
  }
  return deduped;
};
