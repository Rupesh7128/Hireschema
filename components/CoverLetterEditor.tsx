import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import showdown from 'showdown';

interface CoverLetterEditorProps {
    initialContent: string;
    onChange: (content: string) => void;
}

const converter = new showdown.Converter();

export const CoverLetterEditor: React.FC<CoverLetterEditorProps> = ({ initialContent, onChange }) => {
    const [value, setValue] = useState('');

    useEffect(() => {
        // If it looks like HTML, use it. Otherwise convert Markdown to HTML.
        const trimmed = initialContent.trim();
        const isHtml = /^\s*<[a-z][\s\S]*>/i.test(trimmed);
        
        if (isHtml) {
            setValue(trimmed);
        } else {
            const html = converter.makeHtml(initialContent);
            setValue(html);
        }
    }, [initialContent]);

    const handleChange = (content: string) => {
        setValue(content);
        // Convert HTML back to Markdown for the parent state (if needed)
        // OR just pass the HTML if we decide to store HTML. 
        // For now, let's assume the parent expects Markdown to stay consistent with the rest of the app,
        // BUT converting back and forth can be lossy.
        // If we want true "Rich Text" experience, we should probably store HTML for cover letters.
        
        // Let's try to pass back HTML and handle it in the parent.
        onChange(content);
    };

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link'],
            ['clean']
        ],
    };

    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike', 'blockquote',
        'list', 'bullet',
        'link'
    ];

    return (
        <div className="bg-white text-black rounded-lg overflow-hidden h-full flex flex-col">
            <style>{`
                .ql-container {
                    flex: 1;
                    overflow-y: auto;
                    font-family: 'Geist Sans', sans-serif;
                    font-size: 16px;
                }
                .ql-editor {
                    min-height: 100%;
                    padding: 2rem;
                }
                .ql-toolbar {
                    border-top: none !important;
                    border-left: none !important;
                    border-right: none !important;
                    border-bottom: 1px solid #e5e7eb !important;
                    background: #f9fafb;
                }
                .ql-container.ql-snow {
                    border: none !important;
                }
            `}</style>
            <ReactQuill
                theme="snow"
                value={value}
                onChange={handleChange}
                modules={modules}
                formats={formats}
                className="h-full"
            />
        </div>
    );
};
