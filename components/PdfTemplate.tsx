import * as React from 'react';
import { forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { ContactProfile } from '../types';

interface PdfTemplateProps {
  content: string;
  themeColor?: string;
  profile?: ContactProfile;
  showContactHeader?: boolean;
  mode?: 'export' | 'preview';
  type?: 'resume' | 'cover_letter' | 'interview' | 'general';
}

const isMeaningfulText = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const lowered = trimmed.toLowerCase();
  return !['not provided', 'n/a', 'na', 'none', 'null', 'undefined', '-'].includes(lowered);
};

const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, '')}`;
};

const toTelHref = (value: string) => {
  const digits = value.replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : '';
};

const looksLikeContactLine = (line: string) => {
  const text = line.trim();
  if (!text) return false;
  if (text.length > 220) return false;

  const hasEmail = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text);
  const hasPhone = /\+?\d[\d\s().-]{7,}\d/.test(text);
  const hasLinkedIn = /\blinkedin\b/i.test(text) || /\blinkedIn\.com\b/i.test(text);
  const hasSeparator = text.includes('|') || text.includes('•');

  if (!(hasEmail || hasPhone || hasLinkedIn)) return false;
  return hasSeparator || (hasEmail && hasPhone) || (hasLinkedIn && (hasEmail || hasPhone));
};

const stripLeadingNameAndContactInfo = (raw: string, name: string) => {
  const lines = raw.split(/\r?\n/);
  let firstNonEmpty = 0;
  while (firstNonEmpty < lines.length && lines[firstNonEmpty].trim() === '') firstNonEmpty += 1;

  const firstLine = lines[firstNonEmpty] ?? '';
  const startsWithHeading = /^\s*#{1,6}\s+/.test(firstLine);
  const headingText = startsWithHeading ? firstLine.replace(/^\s*#{1,6}\s+/, '').trim() : '';
  const normalizedName = (name || '').trim().toLowerCase();

  if (normalizedName) {
    if (headingText && (headingText.toLowerCase() === normalizedName || headingText.toLowerCase().startsWith(`${normalizedName} `))) {
      lines.splice(firstNonEmpty, 1);
      while (firstNonEmpty < lines.length && lines[firstNonEmpty].trim() === '') lines.splice(firstNonEmpty, 1);
    } else if (!startsWithHeading && firstLine.trim().toLowerCase() === normalizedName) {
      lines.splice(firstNonEmpty, 1);
      while (firstNonEmpty < lines.length && lines[firstNonEmpty].trim() === '') lines.splice(firstNonEmpty, 1);
    }
  }

  while (firstNonEmpty < lines.length && lines[firstNonEmpty].trim() === '') firstNonEmpty += 1;
  const nextLine = lines[firstNonEmpty] ?? '';
  const nextStartsWithHeading = /^\s*#{1,6}\s+/.test(nextLine);
  const candidateIndex = nextStartsWithHeading ? firstNonEmpty + 1 : firstNonEmpty;
  const candidateLine = lines[candidateIndex] ?? '';

  if (looksLikeContactLine(candidateLine)) {
    lines.splice(candidateIndex, 1);
    if (lines[candidateIndex]?.trim() === '') lines.splice(candidateIndex, 1);
  }

  return lines.join('\n');
};

const CustomH3 = ({ children }: { children: React.ReactNode }) => {
  // If children is a string containing pipes, parse it
  const text = typeof children === 'string' ? children : '';
  if (text && text.includes('|')) {
    const parts = text.split('|').map(p => p.trim());
    
    // Format: Job Title | Company | Date | Location
    if (parts.length >= 2) {
      const title = parts[0];
      const company = parts[1];
      const date = parts[2] || '';
      const location = parts[3] || '';

      return (
        <div className="pdf-job-header">
          <div className="pdf-job-row">
            <span className="pdf-job-title">{title}</span>
            {date && <span className="pdf-job-date">{date}{location ? `, ${location}` : ''}</span>}
          </div>
          <div className="pdf-job-company">{company}</div>
        </div>
      );
    }
  }
  return <h3>{children}</h3>;
};

export const PdfTemplate = forwardRef<HTMLDivElement, PdfTemplateProps>(({ content, themeColor = '#374151', profile, showContactHeader = true, mode = 'export', type = 'resume' }, ref) => {
  const name = (profile?.name || '').trim();
  const email = (profile?.email || '').trim();
  const phone = (profile?.phone || '').trim();
  const linkedin = (profile?.linkedin || '').trim();
  const location = (profile?.location || '').trim();
  // We generally hide photo for this specific professional template style as per image, but keeping logic if needed
  
  const hasEmail = isMeaningfulText(email);
  const hasPhone = isMeaningfulText(phone);
  const hasLocation = isMeaningfulText(location);
  const hasLinkedin = isMeaningfulText(linkedin);

  const contactItems: Array<{ key: string; node: React.ReactNode }> = [
    hasLocation ? { key: 'location', node: <span>{location}</span> } : null,
    hasEmail
      ? { key: 'email', node: <a href={`mailto:${email}`}>{email}</a> }
      : null,
    hasPhone
      ? { key: 'phone', node: <a href={toTelHref(phone)}>{phone}</a> }
      : null,
    hasLinkedin
      ? {
          key: 'linkedin',
          node: (
            <a href={normalizeUrl(linkedin)} target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
          )
        }
      : null
  ].filter(Boolean) as Array<{ key: string; node: React.ReactNode }>;

  const hasContactInfo = contactItems.length > 0 || !!name;
  const contentToRender = showContactHeader && hasContactInfo ? stripLeadingNameAndContactInfo(content, name) : content;

  const pageRef = React.useRef<HTMLDivElement | null>(null);
  const contentBlockRef = React.useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = React.useState(1);

  const setCombinedRef = React.useCallback((node: HTMLDivElement | null) => {
    pageRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as any).current = node;
  }, [ref]);

  React.useLayoutEffect(() => {
    setScale(1);
    const id = requestAnimationFrame(() => {
      const page = pageRef.current;
      const block = contentBlockRef.current;
      if (!page || !block) return;
      const available = page.clientHeight;
      const needed = block.scrollHeight;
      if (!available || !needed) return;
      if (needed <= available) return;
      // For resumes, we might shrink to fit. For others, we generally prefer multi-page flow, 
      // but since this is a single page template, we still scale.
      const next = Math.max(0.65, Math.min(1, available / needed));
      setScale(next);
    });
    return () => cancelAnimationFrame(id);
  }, [contentToRender, name, email, phone, linkedin, location, showContactHeader, themeColor, mode, type]);

  const outerStyle =
    mode === 'export'
      ? {
          position: 'fixed' as const,
          top: '0',
          left: '0',
          transform: 'translateX(-10000px)',
          width: '210mm',
          height: 'auto',
          overflow: 'visible',
          zIndex: -100,
          pointerEvents: 'none' as const
        }
      : {
          width: '100%',
          display: 'flex',
          justifyContent: 'center'
        };

  return (
    <div style={outerStyle}>
      <div 
        ref={setCombinedRef} 
        className="pdf-export-container" 
        style={{ 
          backgroundColor: '#ffffff',
          color: '#000000',
          padding: '10mm',
          width: '210mm',
          height: '297mm',
          fontFamily: "'Inter', 'Helvetica', 'Arial', sans-serif",
          fontSize: '10pt',
          lineHeight: '1.4',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        <style>{`
          .pdf-export-container { box-sizing: border-box; background: white; }
          .pdf-content-block { transform-origin: top left; }
          
          /* Header */
          .pdf-contact-header { margin: 0 0 16px 0; display: flex; flex-direction: column; align-items: center; text-align: center; }
          .pdf-contact-name { 
            font-size: 24pt; 
            font-weight: 800; 
            letter-spacing: -0.02em; 
            line-height: 1.1; 
            margin: 0 0 6px 0; 
            color: #374151 !important; 
            text-transform: capitalize;
          }
          .pdf-contact-line { 
            font-size: 9pt; 
            color: #4b5563 !important; 
            margin: 0; 
            line-height: 1.4;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-wrap: wrap;
            gap: 0;
          }
          .pdf-contact-sep { color: #9ca3af !important; padding: 0 8px; font-size: 8pt; }
          .pdf-contact-line a { color: #4b5563 !important; text-decoration: none; }
          
          /* Section Headers */
          .pdf-export-container h1 { 
            display: none; /* We handle name separately */
          }
          .pdf-export-container h2 { 
            font-size: 11pt; 
            font-weight: 800; 
            margin: 18px 0 8px 0; 
            color: #374151 !important; 
            text-transform: ${type === 'resume' ? 'uppercase' : 'none'}; 
            letter-spacing: 0.05em;
            border-bottom: 1.5px solid #374151;
            padding-bottom: 4px;
            line-height: 1.2;
          }
          
          /* Job Headers (Custom H3) */
          .pdf-job-header { margin: 12px 0 4px 0; }
          .pdf-job-row { display: flex; justify-content: space-between; align-items: baseline; }
          .pdf-job-title { font-size: 10.5pt; font-weight: 800; color: #111827; }
          .pdf-job-date { font-size: 10pt; font-weight: 700; color: #111827; text-align: right; }
          .pdf-job-company { font-size: 10pt; font-weight: 600; color: #374151; margin-top: 1px; }
          
          /* Fallback H3 */
          .pdf-export-container h3 { 
            font-size: 10.5pt; 
            font-weight: 700; 
            margin: 12px 0 4px 0; 
            color: #111827 !important; 
          }

          /* Body Text */
          .pdf-export-container p { 
            margin: 0 0 ${type === 'resume' ? '6px' : '12px'} 0; 
            color: #374151 !important; 
            text-align: left;
            line-height: 1.45;
            font-weight: 400;
          }
          .pdf-export-container ul { 
            margin: 0 0 10px 0; 
            padding-left: 16px; 
            list-style-type: disc; 
          }
          .pdf-export-container li { 
            margin-bottom: 3px; 
            color: #374151 !important; 
            line-height: 1.45;
            padding-left: 2px;
          }
          .pdf-export-container strong { 
            font-weight: 700; 
            color: #111827 !important; 
          }
          .pdf-export-container hr { border: none; border-top: 1px solid #e5e7eb; margin: 10px 0; }
          
          /* Print Safety */
          .pdf-export-container h1, .pdf-export-container h2, .pdf-job-header { 
            page-break-after: avoid;
            break-after: avoid;
          }
          .pdf-export-container p, .pdf-export-container ul, .pdf-export-container li { 
            page-break-inside: auto;
            break-inside: auto;
          }
        `}</style>
        <div
          ref={contentBlockRef}
          className="pdf-content-block"
          style={{
            transform: scale < 1 ? `scale(${scale})` : undefined,
            width: scale < 1 ? `${(100 / scale).toFixed(6)}%` : '100%'
          }}
        >
          {showContactHeader && hasContactInfo && (
            <div className="pdf-contact-header">
              {name && <div className="pdf-contact-name">{name}</div>}
              {contactItems.length > 0 && (
                <div className="pdf-contact-line">
                  {contactItems.map((item, idx) => (
                    <React.Fragment key={item.key}>
                      {idx > 0 && <span className="pdf-contact-sep">•</span>}
                      {item.node}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkBreaks]}
            components={{
              h3: CustomH3
            }}
          >
            {contentToRender}
          </ReactMarkdown>
          
          <div style={{ height: '12mm' }} />
        </div>
      </div>
    </div>
  );
});

PdfTemplate.displayName = 'PdfTemplate';
