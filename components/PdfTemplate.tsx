import * as React from 'react';
import { forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';

interface PdfTemplateProps {
  content: string;
  themeColor?: string;
}

export const PdfTemplate = forwardRef<HTMLDivElement, PdfTemplateProps>(({ content, themeColor = '#ea580c' }, ref) => {
  return (
    <div style={{ position: 'fixed', left: '-9999px', top: '0', zIndex: -100 }}>
      <div 
        ref={ref} 
        className="pdf-export-container" 
        style={{ 
          backgroundColor: 'white',
          color: 'black',
          padding: '20mm',
          width: '210mm',
          minHeight: '297mm',
          fontFamily: "'Inter', 'Helvetica', 'Arial', sans-serif",
          fontSize: '10.5pt',
          lineHeight: '1.5'
        }}
      >
        <style>{`
          .pdf-export-container { box-sizing: border-box; }
          .pdf-export-container h1 { 
            font-size: 26pt; 
            font-weight: 900; 
            margin: 0 0 12px 0; 
            color: #000000; 
            text-transform: uppercase; 
            border-bottom: 3px solid ${themeColor}; 
            padding-bottom: 8px; 
            letter-spacing: -0.02em;
          }
          .pdf-export-container h2 { 
            font-size: 13pt; 
            font-weight: 800; 
            margin: 24px 0 10px 0; 
            color: ${themeColor}; 
            text-transform: uppercase; 
            letter-spacing: 0.05em;
            border-bottom: none;
          }
          .pdf-export-container h3 { 
            font-size: 11pt; 
            font-weight: 700; 
            margin: 12px 0 6px 0; 
            color: #111; 
          }
          .pdf-export-container p { 
            margin: 0 0 8px 0; 
            color: #222; 
            text-align: left;
          }
          .pdf-export-container ul { 
            margin: 0 0 12px 0; 
            padding-left: 15px; 
            list-style-type: disc; 
          }
          .pdf-export-container li { 
            margin-bottom: 4px; 
            color: #333; 
          }
          .pdf-export-container strong { 
            font-weight: 700; 
            color: #000; 
          }
          /* Ensure no weird page breaks inside sections */
          .pdf-export-container h2, 
          .pdf-export-container h3 { 
            page-break-after: avoid; 
          }
        `}</style>
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
});

PdfTemplate.displayName = 'PdfTemplate';
