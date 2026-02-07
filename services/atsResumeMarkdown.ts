export const normalizeAtsResumeMarkdown = (markdown: string) => {
  const input = (markdown || '').replace(/\r\n/g, '\n');
  let out = input;

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

