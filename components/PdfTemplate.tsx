import * as React from 'react';
import { forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';

interface PdfTemplateProps {
  content: string;
  themeColor?: string;
}

export const PdfTemplate = forwardRef<HTMLDivElement, PdfTemplateProps>(({ content, themeColor = '#ea580c' }, ref) => {
  return (
    <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
      <div ref={ref} className="pdf-export-container bg-white text-black p-[40mm] w-[210mm]" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', lineHeight: '1.4' }}>
        <style>{`
          .pdf-export-container h1 { font-size: 24pt; font-weight: bold; margin-bottom: 8px; color: ${themeColor}; text-transform: uppercase; border-bottom: 2px solid ${themeColor}; padding-bottom: 4px; line-height: 1.2; }
          .pdf-export-container h2 { font-size: 13pt; font-weight: bold; margin-top: 14px; margin-bottom: 6px; color: #111; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 2px; }
          .pdf-export-container h3 { font-size: 11pt; font-weight: bold; margin-top: 10px; margin-bottom: 4px; color: #333; }
          .pdf-export-container p { margin-bottom: 6px; text-align: justify; font-size: 10pt; color: #333; }
          .pdf-export-container ul { margin-bottom: 8px; padding-left: 18px; list-style-type: disc; }
          .pdf-export-container li { margin-bottom: 3px; font-size: 10pt; color: #333; }
          .pdf-export-container strong { font-weight: bold; color: #000; }
          .pdf-export-container * { box-sizing: border-box; }
        `}</style>
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
});

PdfTemplate.displayName = 'PdfTemplate';
