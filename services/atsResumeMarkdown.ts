type ExperienceEntry = {
  title: string;
  company: string;
  date: string;
  location: string;
  bullets: string[];
};

type ParsedDateEdge = {
  text: string;
  key: number | null;
  isPresent: boolean;
};

const MONTH_INDEX: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12
};

const parseDateEdge = (value: string): ParsedDateEdge => {
  const text = (value || '').trim();
  if (!text) return { text: '', key: null, isPresent: false };
  if (/present|current|now/i.test(text)) return { text: 'Present', key: Number.POSITIVE_INFINITY, isPresent: true };
  const ym = text.match(/\b([A-Za-z]{3,9})\s+(\d{4})\b/);
  if (ym) {
    const month = MONTH_INDEX[(ym[1] || '').toLowerCase()] || 1;
    const year = Number(ym[2]);
    if (Number.isFinite(year)) return { text, key: year * 12 + month, isPresent: false };
  }
  const y = text.match(/\b(19|20)\d{2}\b/);
  if (y) {
    const year = Number(y[0]);
    if (Number.isFinite(year)) return { text, key: year * 12 + 1, isPresent: false };
  }
  return { text, key: null, isPresent: false };
};

const parseDateRange = (value: string) => {
  const text = (value || '').trim();
  if (!text) return { start: parseDateEdge(''), end: parseDateEdge('') };
  const parts = text.split(/\s*[–—-]\s*/);
  if (parts.length >= 2) {
    return {
      start: parseDateEdge(parts[0]),
      end: parseDateEdge(parts.slice(1).join(' - '))
    };
  }
  return { start: parseDateEdge(text), end: parseDateEdge('') };
};

const mergeTitles = (a: string, b: string) => {
  const items = [a, b].map((v) => (v || '').trim()).filter(Boolean);
  if (items.length === 0) return '';
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique.join(' / ');
};

const mergeDateRanges = (a: string, b: string) => {
  const ra = parseDateRange(a);
  const rb = parseDateRange(b);

  const starts = [ra.start, rb.start].filter((v) => v.text);
  const ends = [ra.end, rb.end].filter((v) => v.text);

  const bestStart = starts.reduce<ParsedDateEdge | null>((acc, cur) => {
    if (!acc) return cur;
    if (acc.key === null && cur.key !== null) return cur;
    if (acc.key !== null && cur.key === null) return acc;
    if (acc.key === null && cur.key === null) return acc;
    return (cur.key as number) < (acc.key as number) ? cur : acc;
  }, null);

  const bestEnd = ends.reduce<ParsedDateEdge | null>((acc, cur) => {
    if (!acc) return cur;
    if (acc.isPresent) return acc;
    if (cur.isPresent) return cur;
    if (acc.key === null && cur.key !== null) return cur;
    if (acc.key !== null && cur.key === null) return acc;
    if (acc.key === null && cur.key === null) return acc;
    return (cur.key as number) > (acc.key as number) ? cur : acc;
  }, null);

  if (bestStart?.text && bestEnd?.text) return `${bestStart.text} – ${bestEnd.text}`;
  if (bestStart?.text) return bestStart.text;
  if (bestEnd?.text) return bestEnd.text;
  return (a || b || '').trim();
};

const normalizeExperienceSection = (markdown: string) => {
  const lines = (markdown || '').split('\n');
  const expStart = lines.findIndex((line) => /^##\s+EXPERIENCE\s*$/i.test(line.trim()));
  if (expStart === -1) return markdown;

  let expEnd = lines.length;
  for (let i = expStart + 1; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i].trim())) {
      expEnd = i;
      break;
    }
  }

  const sectionLines = lines.slice(expStart + 1, expEnd);
  const entries: ExperienceEntry[] = [];

  let i = 0;
  while (i < sectionLines.length) {
    const line = sectionLines[i].trim();
    const headerMatch = line.match(/^###\s+(.+)$/);
    if (!headerMatch) {
      i += 1;
      continue;
    }

    const headerText = (headerMatch[1] || '').trim();
    const parts = headerText.split('|').map((p) => p.trim());
    const entry: ExperienceEntry = {
      title: parts[0] || '',
      company: parts[1] || '',
      date: parts[2] || '',
      location: parts[3] || '',
      bullets: []
    };

    i += 1;
    while (i < sectionLines.length) {
      const bodyLine = sectionLines[i].trim();
      if (/^###\s+/.test(bodyLine) || /^##\s+/.test(bodyLine)) break;
      const bullet = bodyLine.match(/^[-*]\s+(.+)$/);
      if (bullet && bullet[1]?.trim()) {
        entry.bullets.push(bullet[1].trim());
      }
      i += 1;
    }

    entries.push(entry);
  }

  if (entries.length === 0) return markdown;

  const grouped: ExperienceEntry[] = [];
  for (const entry of entries) {
    const currentCompany = (entry.company || '').trim().toLowerCase();
    const last = grouped[grouped.length - 1];
    const lastCompany = (last?.company || '').trim().toLowerCase();

    if (last && currentCompany && lastCompany && currentCompany === lastCompany) {
      last.title = mergeTitles(last.title, entry.title);
      last.date = mergeDateRanges(last.date, entry.date);
      if (!last.location && entry.location) last.location = entry.location;
      last.bullets.push(...entry.bullets);
      continue;
    }

    grouped.push({
      title: entry.title,
      company: entry.company,
      date: entry.date,
      location: entry.location,
      bullets: [...entry.bullets]
    });
  }

  const rebuilt: string[] = ['## EXPERIENCE', ''];
  for (const entry of grouped) {
    const title = entry.title || 'Role';
    const company = entry.company || 'Company';
    const date = (entry.date || '').trim();
    const location = (entry.location || '').trim();
    const headerParts = [title, company];
    if (date) headerParts.push(date);
    if (location) headerParts.push(location);
    rebuilt.push(`### ${headerParts.join(' | ')}`);
    for (const bullet of entry.bullets) {
      if (!bullet.trim()) continue;
      rebuilt.push(`- ${bullet.trim()}`);
    }
    rebuilt.push('');
  }

  const before = lines.slice(0, expStart);
  const after = lines.slice(expEnd);
  return [...before, ...rebuilt, ...after].join('\n');
};

/**
 * If the AI outputs the resume multiple times (original + refined), this extracts
 * only the LAST complete version starting from the last ## SUMMARY occurrence.
 * Also strips any repeated section blocks within a single resume.
 */
const deduplicateResumeSections = (markdown: string): string => {
  // Step 1: Strip everything before the FIRST ## SUMMARY.
  // This removes UI chrome ("Premium", "Workspace", tab labels), stray contact lines
  // ("Vivek Kumar", "Bengaluru, India", "• •"), and any AI preamble that leaked in.
  const firstSummaryIdx = markdown.search(/^##\s+SUMMARY\s*$/im);
  if (firstSummaryIdx > 0) {
    markdown = markdown.substring(firstSummaryIdx);
  }

  // Step 2: If ## SUMMARY still appears more than once (AI returned draft + revision),
  // keep the LAST occurrence which is the most recent rewrite.
  const summaryMatches = [...markdown.matchAll(/^##\s+SUMMARY\s*$/gim)];
  if (summaryMatches.length > 1) {
    const lastMatch = summaryMatches[summaryMatches.length - 1];
    if (lastMatch.index !== undefined) {
      markdown = markdown.substring(lastMatch.index);
    }
  }
  return markdown;
};

export const normalizeAtsResumeMarkdown = (markdown: string) => {
  const input = deduplicateResumeSections((markdown || '').replace(/\r\n/g, '\n'));
  let out = input;

  const recognizedSections = new Set(['summary', 'experience', 'skills', 'education']);
  const normalizePlainHeadingLine = (line: string) => {
    const trimmed = (line || '').trim();
    const upper = trimmed.toUpperCase();
    if (upper === 'SUMMARY') return '## SUMMARY';
    if (upper === 'EXPERIENCE') return '## EXPERIENCE';
    if (upper === 'SKILLS') return '## SKILLS';
    if (upper === 'EDUCATION') return '## EDUCATION';
    return null;
  };

  const splitInlineSection = (line: string) => {
    const idx = line.indexOf('##');
    if (idx === -1) return null;
    const sectionPart = line.slice(idx + 2).trim();
    const sectionWord = sectionPart.split(/\s+/)[0]?.trim().toLowerCase();
    if (!sectionWord || !recognizedSections.has(sectionWord)) return null;
    return `## ${sectionWord.toUpperCase()}`;
  };

  // Fix: Ensure headers starting with ## or ### are on their own lines with proper spacing
  // Case: Header follows text on the same line or next line without sufficient spacing
  out = out.replace(/([^\n])\s*(#{2,3}\s+)/g, '$1\n\n$2');

  // Fix: Ensure bolded keys (like **Category:**) start on a new line if they are embedded in text
  // This is common in Skills sections where AI might inline multiple categories
  // We handle both **Category:** and **Category**: patterns
  out = out.replace(/([^\n])\s*(\*\*[^*]+:\*\*|\*\*[^*]+\*\*:)/g, '$1\n\n$2');

  const lines = out.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const normalized = normalizePlainHeadingLine(lines[i]);
    if (normalized) lines[i] = normalized;
  }
  let firstNonEmpty = 0;
  while (firstNonEmpty < lines.length && lines[firstNonEmpty].trim() === '') firstNonEmpty += 1;
  if (firstNonEmpty < lines.length) {
    const firstLine = lines[firstNonEmpty];
    const trimmed = firstLine.trim();
    const withoutHashes = trimmed.replace(/^#+\s*/, '').trim();
    const inlineSection = splitInlineSection(withoutHashes);
    if (inlineSection) {
      lines[firstNonEmpty] = inlineSection;
    } else if (/^#\s+/.test(trimmed)) {
      lines.splice(firstNonEmpty, 1);
    }
    out = lines.join('\n');
  }

  const normalizeHeader = (re: RegExp, header: string) => {
    out = out.replace(re, `## ${header}`);
  };

  normalizeHeader(/^##\s+(summary)\s*$/gim, 'SUMMARY');
  normalizeHeader(/^##\s+(experiences?)\s*$/gim, 'EXPERIENCE');
  normalizeHeader(/^##\s+(experices)\s*$/gim, 'EXPERIENCE');
  normalizeHeader(/^##\s+(skills?)\s*$/gim, 'SKILLS');
  normalizeHeader(/^##\s+(education)\s*$/gim, 'EDUCATION');

  out = out.replace(/([^\n])\n(##\s+)/g, '$1\n\n$2');
  out = out.replace(/([^\n])\n(###\s+)/g, '$1\n\n$2');
  out = normalizeExperienceSection(out);
  out = out.replace(/\*\*([^*]+)\*\*/g, '$1');
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, '$1$2');

  return out.trim();
};
