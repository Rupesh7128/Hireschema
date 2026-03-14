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

/**
 * Parses a cover letter markdown/text into structured sections and renders each
 * with appropriate letter formatting (date block, salutation, body, closing).
 */
const CoverLetterBody: React.FC<{ content: string }> = ({ content }) => {
  const trimmed = content.trim();

  // HTML content (from rich text editor) — render with cover-letter prose styles
  if (/^\s*<[a-z][\s\S]*>/i.test(trimmed)) {
    return <div className="cl-html-body" dangerouslySetInnerHTML={{ __html: trimmed }} />;
  }

  // Split into paragraphs separated by one or more blank lines
  const paras = trimmed.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);

  // Locate "Dear …" salutation
  const salIdx = paras.findIndex(p => /^dear\b/i.test(p));

  // Locate closing line ("Sincerely,", "Regards,", etc.) — search backwards
  let closeIdx = -1;
  for (let i = paras.length - 1; i > Math.max(0, salIdx); i--) {
    if (/^(sincerely|regards|best regards|yours truly|yours sincerely|thank you|warm regards|kind regards|best,)\b/i.test(paras[i])) {
      closeIdx = i;
      break;
    }
  }

  // Fallback: no structure detected → plain paragraphs
  if (salIdx < 0) {
    return (
      <div className="cl-plain">
        {paras.map((p, i) => (
          <div key={i} className="cl-para">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{p}</ReactMarkdown>
          </div>
        ))}
      </div>
    );
  }

  const addressBlock = paras.slice(0, salIdx);
  const salutation = paras[salIdx];
  const bodyEnd = closeIdx > salIdx ? closeIdx : paras.length;
  const bodyParas = paras.slice(salIdx + 1, bodyEnd);
  const closingParas = closeIdx >= 0 ? paras.slice(closeIdx) : [];

  return (
    <>
      {/* Date + company address block */}
      {addressBlock.length > 0 && (
        <div className="cl-address-block">
          {addressBlock.map((p, i) => {
            const lines = p.split('\n').map(l => l.trim()).filter(Boolean);
            return (
              <div key={i} className={i > 0 ? 'cl-address-para cl-address-gap' : 'cl-address-para'}>
                {lines.map((line, j) => (
                  <div key={j} className="cl-address-line">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{line}</ReactMarkdown>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Salutation */}
      <div className="cl-salutation">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{salutation}</ReactMarkdown>
      </div>

      {/* Body paragraphs */}
      <div className="cl-body">
        {bodyParas.map((p, i) => (
          <div key={i} className="cl-para">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{p}</ReactMarkdown>
          </div>
        ))}
      </div>

      {/* Closing / sign-off */}
      {closingParas.length > 0 && (
        <div className="cl-closing">
          {closingParas.map((p, i) => {
            const lines = p.split('\n').map(l => l.trim()).filter(Boolean);
            const firstLine = lines[0] || '';
            const isValediction = /^(sincerely|regards|best|yours|thank you|warm|kind)/i.test(firstLine);

            // "Sincerely,\nJohn Doe" → valediction + signature gap + name
            if (isValediction && lines.length >= 2) {
              return (
                <div key={i}>
                  <div className="cl-valediction">{firstLine}</div>
                  <div className="cl-sig-space" />
                  <div className="cl-sig-name">{lines.slice(1).join(', ')}</div>
                </div>
              );
            }

            return (
              <div key={i} className={isValediction ? 'cl-valediction' : 'cl-sig-name'}>
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{p}</ReactMarkdown>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
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
      // Trim location to "City, Country" — drop intermediate state/province parts
      const rawLocation = parts[3] || '';
      const locParts = rawLocation.split(',').map(p => p.trim()).filter(Boolean);
      const location = locParts.length >= 3
        ? `${locParts[0]}, ${locParts[locParts.length - 1]}`
        : rawLocation;

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

  const setCombinedRef = React.useCallback((node: HTMLDivElement | null) => {
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as any).current = node;
  }, [ref]);

  const outerStyle =
    mode === 'export'
      ? {
          position: 'fixed' as const,
          top: '0',
          left: '0',
          opacity: 0,
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

  const CustomP = ({ children }: { children: React.ReactNode }) => {
    if (type !== 'interview') {
      return <p>{children}</p>;
    }

    // Handle Interview Q/A styling
    const text = React.Children.toArray(children).reduce((acc, child) => {
        if (typeof child === 'string') return acc + child;
        return acc; // Simplified for now, mostly text
    }, '') as string;
    
    const lower = text.trim().toLowerCase();
    const isQuestion = lower.startsWith('q:') || lower.startsWith('question:') || lower.startsWith('q ') || text.trim().endsWith('?');
    const isAnswer = lower.startsWith('a:') || lower.startsWith('answer:') || lower.startsWith('a ');

    if (isQuestion) {
      // Strip prefix if present for cleaner look, or keep it? 
      // User image shows just the question text.
      // Let's keep the text as is but style the container.
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e5e7eb',
          padding: '12px 0',
          marginTop: '12px',
          marginBottom: '8px',
          pageBreakInside: 'avoid'
        }}>
          <span style={{ 
            fontWeight: 700, 
            color: '#111827', 
            fontSize: '10.5pt',
            paddingRight: '16px'
          }}>
            {children}
          </span>
          <span style={{ 
            color: '#9ca3af', 
            fontSize: '14pt', 
            fontWeight: 300,
            lineHeight: 1
          }}>+</span>
        </div>
      );
    }

    if (isAnswer) {
      return (
        <div style={{
          padding: '0 0 16px 0',
          color: '#374151',
          fontSize: '10pt',
          lineHeight: '1.6'
        }}>
          {children}
        </div>
      );
    }

    return <p>{children}</p>;
  };

  return (
    <div style={outerStyle}>
      <div 
        ref={setCombinedRef} 
        className="pdf-export-container" 
        style={{ 
          backgroundColor: '#ffffff',
          color: '#000000',
          padding: '10mm 10mm 14mm 10mm',
          width: '210mm',
          minHeight: '297mm',
          height: 'auto',
          fontFamily: "'Inter', 'Helvetica', 'Arial', sans-serif",
          fontSize: '10pt',
          lineHeight: '1.4',
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
          boxSizing: 'border-box',
          overflow: 'visible'
        }}
      >
        <style>{`
          .pdf-export-container { box-sizing: border-box; background: white; }
          .pdf-content-block { transform-origin: top left; }
          
          /* Header */
          .pdf-contact-header {
            margin: 0 0 ${type === 'cover_letter' ? '0' : '12px'} 0;
            display: flex;
            flex-direction: ${type === 'cover_letter' ? 'row' : 'column'};
            align-items: ${type === 'cover_letter' ? 'center' : 'center'};
            justify-content: ${type === 'cover_letter' ? 'space-between' : 'flex-start'};
            text-align: ${type === 'cover_letter' ? 'left' : 'center'};
            gap: ${type === 'cover_letter' ? '12px' : '0'};
            padding-bottom: ${type === 'cover_letter' ? '0' : '0'};
          }
          .pdf-contact-name {
            display: ${name ? 'block' : 'none'};
            font-size: ${type === 'cover_letter' ? '20pt' : '24pt'};
            font-weight: 800;
            letter-spacing: ${type === 'cover_letter' ? '0.06em' : '-0.02em'};
            line-height: 1.1;
            margin: 0;
            color: #111827 !important;
            text-transform: ${type === 'cover_letter' ? 'uppercase' : 'capitalize'};
            flex: 1 1 auto;
            min-width: 0;
          }
          .pdf-contact-line {
            font-size: ${type === 'cover_letter' ? '9pt' : '9pt'};
            color: #4b5563 !important;
            margin: 0;
            line-height: 1.6;
            display: flex;
            flex-direction: ${type === 'cover_letter' ? 'column' : 'row'};
            align-items: ${type === 'cover_letter' ? 'flex-end' : 'center'};
            justify-content: ${type === 'cover_letter' ? 'flex-end' : 'center'};
            flex-wrap: wrap;
            gap: ${type === 'cover_letter' ? '1px' : '0'};
            flex: 0 0 auto;
          }
          .pdf-contact-sep {
            color: #d1d5db !important;
            padding: 0;
            font-size: 10pt;
            display: ${type === 'cover_letter' ? 'none' : 'inline-block'};
          }
          .pdf-contact-line a { color: #4b5563 !important; text-decoration: none; }
          
          /* Section Headers */
          .pdf-export-container h1 {
            display: none; /* We handle name separately */
          }
          .pdf-export-container h2 {
            font-size: ${type === 'cover_letter' ? '11pt' : '14pt'};
            font-weight: ${type === 'cover_letter' ? '600' : '800'};
            margin: ${type === 'cover_letter' ? '14px 0 4px 0' : '16px 0 10px 0'};
            color: #111827 !important;
            text-transform: ${type === 'resume' ? 'uppercase' : 'none'};
            letter-spacing: ${type === 'resume' ? '0.05em' : '0'};
            border-bottom: ${type === 'resume' ? '1.5px solid #374151' : 'none'};
            padding-bottom: ${type === 'resume' ? '6px' : '0'};
            line-height: 1.4;
          }
          
          /* Job Headers (Custom H3) */
          .pdf-job-header { margin: 12px 0 4px 0; }
          .pdf-job-row { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 4px 10px; }
          .pdf-job-title { font-size: 10.5pt; font-weight: 800; color: #111827; flex: 1 1 auto; min-width: 0; }
          .pdf-job-date { font-size: 10pt; font-weight: 600; color: #374151; text-align: right; flex: 0 0 auto; white-space: nowrap; }
          .pdf-job-company { font-size: 10pt; font-weight: 400; color: #4b5563; margin-top: 1px; }
          
          /* Fallback H3 */
          .pdf-export-container h3 { 
            font-size: 11pt; 
            font-weight: 700; 
            margin: 16px 0 8px 0; 
            color: #111827 !important; 
          }

          /* Body Text */
          .pdf-export-container p {
            margin: 0 0 ${type === 'resume' ? '6px' : '12px'} 0;
            color: #374151 !important;
            text-align: left;
            line-height: ${type === 'cover_letter' ? '1.65' : '1.45'};
            font-weight: 400;
            font-size: ${type === 'cover_letter' ? '10.5pt' : '10pt'};
          }
          /* Cover letter: first paragraph = date + address block — tighter spacing */
          .pdf-export-container p:first-of-type {
            margin-bottom: ${type === 'cover_letter' ? '14px' : '6px'};
          }
          /* Sign-off paragraph: extra space before it */
          .pdf-export-container p:last-of-type {
            margin-top: ${type === 'cover_letter' ? '18px' : '0'};
          }
          .pdf-export-container ul {
            margin: 0 0 16px 0;
            padding-left: 0;
            list-style: none;
          }
          .pdf-export-container li {
            margin-bottom: 6px;
            color: #374151 !important;
            line-height: 1.6;
            padding-left: 14px;
            position: relative;
          }
          .pdf-export-container li::before {
            content: '•';
            position: absolute;
            left: 2px;
            top: 0;
            color: #374151;
            font-size: 10pt;
            line-height: 1.6;
          }
          .pdf-export-container strong { 
            font-weight: ${type === 'resume' ? '400' : '700'};
            color: ${type === 'resume' ? '#374151' : '#111827'} !important; 
          }
          .pdf-export-container hr { border: none; border-top: 1px solid #e5e7eb; margin: 10px 0; }

          .pdf-export-container a { color: #374151 !important; text-decoration: underline; text-underline-offset: 2px; }
          .pdf-export-container blockquote { margin: 12px 0; padding-left: 10px; border-left: 3px solid #d1d5db; color: #374151 !important; font-style: italic; }
          .pdf-export-container pre { margin: 10px 0; padding: 10px; background: #111827; color: #f9fafb; border-radius: 6px; overflow-x: auto; }
          .pdf-export-container code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
          .pdf-export-container :not(pre) > code { background: #f3f4f6; color: #111827; padding: 1px 4px; border-radius: 4px; }

          /* ── Cover Letter Structured Sections ── */
          .cl-address-block { margin-bottom: 22px; }
          .cl-address-para p { margin: 0 !important; font-size: 10pt !important; color: #6b7280 !important; line-height: 1.5 !important; font-weight: 400; }
          .cl-address-line p { margin: 0 !important; line-height: 1.5 !important; }
          .cl-address-gap { margin-top: 10px !important; }
          /* First line = date: slightly bolder */
          .cl-address-para:first-child .cl-address-line:first-child p { color: #374151 !important; font-weight: 500; }

          .cl-salutation { margin-bottom: 20px; }
          .cl-salutation p { margin: 0 !important; font-size: 10.5pt !important; color: #111827 !important; font-weight: 400; line-height: 1.5 !important; }

          .cl-body { }
          .cl-para { margin-bottom: 14px; }
          .cl-para:last-child { margin-bottom: 0; }
          .cl-para p { margin: 0 !important; font-size: 10.5pt !important; line-height: 1.72 !important; color: #374151 !important; }
          .cl-para ul { margin: 6px 0 0 0 !important; padding-left: 20px !important; }
          .cl-para li { margin-bottom: 5px !important; line-height: 1.65 !important; color: #374151 !important; font-size: 10.5pt !important; }
          .cl-para strong { font-weight: 700; color: #111827 !important; }

          .cl-plain .cl-para { margin-bottom: 14px; }
          .cl-plain .cl-para p { margin: 0 !important; }

          .cl-closing { margin-top: 28px; }
          .cl-valediction { font-size: 10.5pt; color: #374151; line-height: 1.5; }
          .cl-sig-space { height: 28px; }
          .cl-sig-name { font-size: 10.5pt; font-weight: 700; color: #111827; line-height: 1.4; }
          .cl-sig-name p { margin: 0 !important; font-weight: 700 !important; color: #111827 !important; font-size: 10.5pt !important; }
          .cl-valediction p { margin: 0 !important; color: #374151 !important; font-size: 10.5pt !important; }

          /* HTML body (rich-text editor output) */
          .cl-html-body p { margin-bottom: 14px !important; font-size: 10.5pt !important; line-height: 1.72 !important; color: #374151 !important; }
          .cl-html-body ul { margin-bottom: 14px !important; padding-left: 20px !important; }
          .cl-html-body li { margin-bottom: 5px !important; line-height: 1.65 !important; color: #374151 !important; font-size: 10.5pt !important; }
          .cl-html-body strong { font-weight: 700; color: #111827 !important; }
          .pdf-cover-line {
            height: 3px;
            width: 100%;
            background: ${themeColor};
            margin: 12px 0 22px 0;
            border-radius: 2px;
          }
          .pdf-export-container table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 16px 0; 
            font-size: 9pt; 
            border-radius: 6px; 
            overflow: hidden; 
            border: 1px solid #fed7aa; /* Light Orange Border */
          }
          .pdf-export-container th { 
            text-align: left; 
            font-weight: 800; 
            font-size: 8.5pt; 
            padding: 12px 10px; 
            border-bottom: 2px solid #ea580c; 
            background: #fff7ed; /* Very light orange bg for header */
            color: #9a3412 !important; /* Dark orange text */
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .pdf-export-container td { 
            padding: 10px 10px; 
            border-bottom: 1px solid #ffedd5; 
            color: #374151 !important; 
            vertical-align: middle;
            line-height: 1.4;
          }
          .pdf-export-container tr:last-child td { border-bottom: none; }
          .pdf-export-container tr:nth-child(even) { background-color: #fffaf0; } /* Subtle stripe */
          
          /* First column emphasis like the image */
          .pdf-export-container td:first-child {
            font-weight: 700;
            color: #ea580c !important; /* Orange accent for skill name */
            width: 25%; /* Give first column reasonable space */
          }
          
          /* Print Safety */
          .pdf-export-container h1, .pdf-export-container h2, .pdf-job-header { 
            page-break-after: avoid;
            break-after: avoid-page;
          }
          .pdf-export-container h3,
          .pdf-export-container p,
          .pdf-export-container ul,
          .pdf-export-container li,
          .pdf-export-container blockquote,
          .pdf-export-container pre { 
            page-break-inside: avoid;
            break-inside: avoid-page;
          }
          .pdf-export-container p {
            orphans: 3;
            widows: 3;
          }
        `}</style>
        <div
          className="pdf-content-block"
          style={{ width: '100%' }}
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

          {type === 'cover_letter' && <div className="pdf-cover-line" />}

          {type === 'cover_letter' ? (
            <CoverLetterBody content={contentToRender} />
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={{
                h3: CustomH3,
                p: CustomP
              }}
            >
              {contentToRender}
            </ReactMarkdown>
          )}
          
          <div style={{ height: '12mm' }} />
        </div>
      </div>
    </div>
  );
});

PdfTemplate.displayName = 'PdfTemplate';
