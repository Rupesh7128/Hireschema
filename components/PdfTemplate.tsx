import * as React from 'react';
import { forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';

interface PdfTemplateProps {
  content: string;
  themeColor?: string;
}

export const PdfTemplate = forwardRef<HTMLDivElement, PdfTemplateProps>(({ content, themeColor = '#ea580c' }, ref) => {
  return (
    <div style={{ position: 'absolute', top: '0', left: '0', width: '1px', height: '1px', overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}>
      <div 
        ref={ref} 
        className="pdf-export-container" 
        style={{ 
          backgroundColor: 'white',
          color: 'black',
          padding: '15mm 20mm',
          width: '210mm',
          minHeight: '297mm',
          fontFamily: "'Inter', 'Helvetica', 'Arial', sans-serif",
          fontSize: '10.5pt',
          lineHeight: '1.4'
        }}
      >
        <style>{`
          .pdf-export-container { box-sizing: border-box; }
          .pdf-export-container h1 { 
            font-size: 28pt; 
            font-weight: 900; 
            margin: 0 0 8px 0; 
            color: #000000; 
            text-transform: uppercase; 
            border-bottom: 3px solid ${themeColor}; 
            padding-bottom: 6px; 
            letter-spacing: -0.03em;
            line-height: 1;
          }
          .pdf-export-container h2 { 
            font-size: 13pt; 
            font-weight: 800; 
            margin: 20px 0 8px 0; 
            color: ${themeColor}; 
            text-transform: uppercase; 
            letter-spacing: 0.05em;
            border-bottom: none;
          }
          .pdf-export-container h3 { 
            font-size: 11pt; 
            font-weight: 700; 
            margin: 10px 0 4px 0; 
            color: #111; 
          }
          .pdf-export-container p { 
            margin: 0 0 6px 0; 
            color: #222; 
            text-align: left;
          }
          .pdf-export-container ul { 
            margin: 0 0 10px 0; 
            padding-left: 15px; 
            list-style-type: disc; 
          }
          .pdf-export-container li { 
            margin-bottom: 3px; 
            color: #333; 
          }
          .pdf-export-container strong { 
            font-weight: 700; 
            color: #000; 
          }
          /* Fix for html2pdf page breaking */
          .pdf-export-container section {
            page-break-inside: avoid;
          }
        `}</style>
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
});

PdfTemplate.displayName = 'PdfTemplate';
