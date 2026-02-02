import * as React from 'react';
import { forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';

interface PdfTemplateProps {
  content: string;
  themeColor?: string;
}

export const PdfTemplate = forwardRef<HTMLDivElement, PdfTemplateProps>(({ content, themeColor = '#ea580c' }, ref) => {
  return (
    <div style={{ 
      position: 'absolute', 
      top: '-10000px', 
      left: '-10000px', 
      width: '210mm', 
      height: 'auto',
      overflow: 'visible',
      zIndex: -100,
      pointerEvents: 'none'
    }}>
      <div 
        ref={ref} 
        className="pdf-export-container" 
        style={{ 
          backgroundColor: '#ffffff',
          color: '#000000',
          padding: '20mm 25mm',
          width: '210mm',
          minHeight: '297mm',
          fontFamily: "'Inter', 'Helvetica', 'Arial', sans-serif",
          fontSize: '10.5pt',
          lineHeight: '1.5',
          boxSizing: 'border-box'
        }}
      >
        <style>{`
          .pdf-export-container { box-sizing: border-box; background: white; }
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
            margin: 25px 0 10px 0; 
            color: ${themeColor} !important; 
            text-transform: uppercase; 
            letter-spacing: 0.08em;
            border-bottom: none;
            line-height: 1.2;
          }
          .pdf-export-container h3 { 
            font-size: 11pt; 
            font-weight: 700; 
            margin: 15px 0 5px 0; 
            color: #111111 !important; 
          }
          .pdf-export-container p { 
            margin: 0 0 8px 0; 
            color: #222222 !important; 
            text-align: left;
            line-height: 1.5;
          }
          .pdf-export-container ul { 
            margin: 0 0 12px 0; 
            padding-left: 20px; 
            list-style-type: disc; 
          }
          .pdf-export-container li { 
            margin-bottom: 5px; 
            color: #333333 !important; 
            line-height: 1.5;
          }
          .pdf-export-container strong { 
            font-weight: 700; 
            color: #000000 !important; 
          }
          /* Page breaking safety */
          .pdf-export-container h1, .pdf-export-container h2, .pdf-export-container h3 { 
            page-break-after: avoid;
            break-after: avoid;
          }
          .pdf-export-container p, .pdf-export-container ul { 
            page-break-inside: auto;
            break-inside: auto;
          }
          .pdf-export-container li { 
            page-break-inside: avoid;
            break-inside: avoid;
          }
        `}</style>
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
});

PdfTemplate.displayName = 'PdfTemplate';
