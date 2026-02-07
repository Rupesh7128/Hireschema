import * as React from 'react';
import { forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { ContactProfile } from '../types';

interface PdfTemplateProps {
  content: string;
  themeColor?: string;
  profile?: ContactProfile;
  showContactHeader?: boolean;
  mode?: 'export' | 'preview';
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

export const PdfTemplate = forwardRef<HTMLDivElement, PdfTemplateProps>(({ content, themeColor = '#ea580c', profile, showContactHeader = true, mode = 'export' }, ref) => {
  const name = (profile?.name || '').trim();
  const email = (profile?.email || '').trim();
  const phone = (profile?.phone || '').trim();
  const linkedin = (profile?.linkedin || '').trim();
  const location = (profile?.location || '').trim();
  const photo = (profile?.photo || '').trim();

  const hasEmail = isMeaningfulText(email);
  const hasPhone = isMeaningfulText(phone);
  const hasLocation = isMeaningfulText(location);
  const hasLinkedin = isMeaningfulText(linkedin);
  const hasPhoto = isMeaningfulText(photo);

  const contactItems: Array<{ key: string; node: React.ReactNode }> = [
    hasPhone
      ? { key: 'phone', node: <a href={toTelHref(phone)}>{phone}</a> }
      : null,
    hasEmail
      ? { key: 'email', node: <a href={`mailto:${email}`}>{email}</a> }
      : null,
    hasLocation ? { key: 'location', node: <span>{location}</span> } : null,
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
      const next = Math.max(0.65, Math.min(1, available / needed));
      setScale(next);
    });
    return () => cancelAnimationFrame(id);
  }, [contentToRender, name, email, phone, linkedin, location, photo, showContactHeader, themeColor, mode]);

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
          padding: '14mm 14mm 14mm',
          width: '210mm',
          height: '297mm',
          fontFamily: "'Inter', 'Helvetica', 'Arial', sans-serif",
          fontSize: '10.75pt',
          lineHeight: '1.38',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        <style>{`
          .pdf-export-container { box-sizing: border-box; background: white; }
          .pdf-content-block { transform-origin: top left; }
          .pdf-contact-header { margin: 0 0 14px 0; display: flex; justify-content: space-between; align-items: flex-end; gap: 14px; }
          .pdf-contact-meta { min-width: 0; flex: 1; }
          .pdf-contact-name { font-size: 24pt; font-weight: 900; letter-spacing: -0.04em; line-height: 1.1; margin: 0 0 6px 0; color: #000000 !important; text-transform: uppercase; border-bottom: 3.5px solid ${themeColor}; padding-bottom: 8px; }
          .pdf-contact-label { font-size: 8.5pt; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; color: #6b7280 !important; margin: 0 0 4px 0; }
          .pdf-contact-line { font-size: 10pt; color: #222222 !important; margin: 0; line-height: 1.35; }
          .pdf-contact-sep { color: #9ca3af !important; padding: 0 6px; }
          .pdf-contact-line a { color: #111111 !important; text-decoration: none; }
          .pdf-contact-photo { width: 52px; height: 52px; border-radius: 10px; object-fit: cover; border: 1px solid #e5e7eb; flex: 0 0 auto; }
          .pdf-export-container h1 { 
            font-size: 28pt; 
            font-weight: 900; 
            margin: 0 0 10px 0; 
            color: #000000 !important; 
            text-transform: uppercase; 
            border-bottom: 3.5px solid ${themeColor}; 
            padding-bottom: 8px; 
            letter-spacing: -0.04em;
            line-height: 1.1;
          }
          .pdf-export-container h2 { 
            font-size: 13pt; 
            font-weight: 800; 
            margin: 16px 0 8px 0; 
            color: ${themeColor} !important; 
            text-transform: uppercase; 
            letter-spacing: 0.08em;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 4px;
            line-height: 1.2;
          }
          .pdf-export-container h3 { 
            font-size: 11pt; 
            font-weight: 700; 
            margin: 10px 0 4px 0; 
            color: #111111 !important; 
          }
          .pdf-export-container p { 
            margin: 0 0 6px 0; 
            color: #222222 !important; 
            text-align: left;
            line-height: 1.38;
          }
          .pdf-export-container ul { 
            margin: 0 0 10px 0; 
            padding-left: 20px; 
            list-style-type: disc; 
          }
          .pdf-export-container li { 
            margin-bottom: 3px; 
            color: #333333 !important; 
            line-height: 1.38;
          }
          .pdf-export-container strong { 
            font-weight: 700; 
            color: #000000 !important; 
          }
          .pdf-export-container hr { border: none; border-top: 1px solid #e5e7eb; margin: 10px 0; }
          /* Page breaking safety */
          .pdf-export-container h1, .pdf-export-container h2, .pdf-export-container h3 { 
            page-break-after: avoid;
            break-after: avoid;
          }
          .pdf-export-container p, .pdf-export-container ul, .pdf-export-container li { 
            page-break-inside: auto;
            break-inside: auto;
          }
          .pdf-export-container p, .pdf-export-container li { overflow-wrap: anywhere; word-break: break-word; }
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
              <div className="pdf-contact-meta">
                {name && <div className="pdf-contact-name">{name}</div>}
                {contactItems.length > 0 && (
                  <>
                    <div className="pdf-contact-label">Contact Information</div>
                    <p className="pdf-contact-line">
                      {contactItems.map((item, idx) => (
                        <React.Fragment key={item.key}>
                          {idx > 0 && <span className="pdf-contact-sep">•</span>}
                          {item.node}
                        </React.Fragment>
                      ))}
                    </p>
                  </>
                )}
              </div>
              {hasPhoto && <img className="pdf-contact-photo" src={photo} alt="Profile" />}
            </div>
          )}
          <ReactMarkdown>{contentToRender}</ReactMarkdown>
          <div style={{ height: '12mm' }} />
        </div>
      </div>
    </div>
  );
});

PdfTemplate.displayName = 'PdfTemplate';
