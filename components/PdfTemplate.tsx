import React from 'react';
import ReactMarkdown from 'react-markdown';

interface PdfTemplateProps {
  content: string;
  themeColor?: string;
}

export const PdfTemplate = React.forwardRef<HTMLDivElement, PdfTemplateProps>(({ content, themeColor = '#ea580c' }, ref) => {
  return (
    <div className="hidden">
      <div ref={ref} className="pdf-container bg-white text-black p-[40px] max-w-[210mm] mx-auto min-h-[297mm]" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', lineHeight: '1.5' }}>
        <style>{`
          @page { size: A4; margin: 20mm; }
          .pdf-container h1 { font-size: 24pt; font-weight: bold; margin-bottom: 10px; color: ${themeColor}; text-transform: uppercase; border-bottom: 2px solid ${themeColor}; padding-bottom: 5px; }
          .pdf-container h2 { font-size: 14pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; color: #333; text-transform: uppercase; }
          .pdf-container h3 { font-size: 12pt; font-weight: bold; margin-top: 10px; margin-bottom: 5px; color: #444; }
          .pdf-container p { margin-bottom: 8px; text-align: justify; }
          .pdf-container ul { margin-bottom: 10px; padding-left: 20px; }
          .pdf-container li { margin-bottom: 4px; }
          .pdf-container a { color: ${themeColor}; text-decoration: none; }
          .pdf-container hr { border: 0; border-top: 1px solid #eee; margin: 15px 0; }
          .pdf-container strong { font-weight: bold; color: #222; }
        `}</style>
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
});

PdfTemplate.displayName = 'PdfTemplate';
