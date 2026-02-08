export const normalizeAtsResumeMarkdown = (markdown: string) => {
  const input = (markdown || '').replace(/\r\n/g, '\n');
  let out = input;

  const recognizedSections = new Set(['summary', 'experience', 'skills', 'education']);

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
  out = out.replace(/([^\n])\s+(\*\*[^*]+:\*\*)/g, '$1\n\n$2');

  const lines = out.split('\n');
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

  return out.trim();
};
