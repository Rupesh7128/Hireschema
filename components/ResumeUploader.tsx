
import * as React from 'react';
import { useCallback, useState, useRef } from 'react';
import { Upload, FileText, X, CheckCircle2, Eye, AlertCircle, FileUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileData } from '../types';

interface ResumeUploaderProps {
  onFileUpload: (file: FileData | null) => void;
  currentFile: FileData | null;
  onPreview?: () => void;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ResumeUploader: React.FC<ResumeUploaderProps> = ({ onFileUpload, currentFile, onPreview }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setError(null);

    if (file.type !== 'application/pdf') {
      setError('Invalid file type. Please upload a PDF.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit.`);
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64 = base64String.split(',')[1];
      
      onFileUpload({
        name: file.name,
        type: file.type,
        base64: base64
      });
    };
    reader.onerror = () => {
        setError("Failed to read file.");
    };
    reader.readAsDataURL(file);
  };
  
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [onFileUpload]);

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) {
          processFile(file);
      }
  };

  const removeFile = () => {
      onFileUpload(null);
      setError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerFileInput = (e: React.MouseEvent) => {
      e.stopPropagation();
      fileInputRef.current?.click();
  }

  return (
    <div className="w-full h-full flex flex-col gap-6 overflow-hidden">
      {/* SECTION 1: PDF UPLOAD */}
      <div className="flex flex-col flex-1 h-full">
          {!currentFile ? (
            <div className="flex-1 flex flex-col h-full">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`relative group cursor-pointer h-full rounded-xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-4 ${isDragging ? 'border-orange-500 bg-orange-500/10' : error ? 'border-red-500/50 bg-red-950/10' : 'border-zinc-800 bg-zinc-900/50 hover:border-orange-500/30 hover:bg-zinc-900/80'}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={triggerFileInput}
                >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isDragging ? 'bg-orange-500/20' : 'bg-zinc-800 group-hover:bg-orange-500/10'}`}>
                        <Upload className={`w-5 h-5 transition-colors ${isDragging ? 'text-orange-500' : 'text-zinc-400 group-hover:text-orange-500'}`} />
                    </div>
                    
                    <div className="text-center">
                        <p className={`text-sm font-medium mb-1 ${isDragging ? 'text-orange-400' : 'text-zinc-300'}`}>
                            {isDragging ? 'Drop PDF here' : 'Drag & Drop PDF Resume'}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-mono mb-3">
                            Max Size: {MAX_FILE_SIZE_MB}MB
                        </p>
                        <button 
                            type="button"
                            onClick={triggerFileInput}
                            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 mx-auto"
                        >
                            <FileUp className="w-3.5 h-3.5" /> Select PDF
                        </button>
                    </div>
                    
                    <input 
                        ref={fileInputRef}
                        type="file" 
                        accept=".pdf" 
                        onChange={handleFileChange} 
                        className="hidden" 
                    />
                </motion.div>
                
                <AnimatePresence>
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mt-3 p-3 bg-red-950/30 border border-red-900/50 rounded-lg flex items-start gap-2 text-xs text-red-400"
                        >
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
          ) : (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center p-6 bg-zinc-900/80 border border-zinc-700/50 rounded-xl relative group overflow-hidden h-full"
            >
              {/* Animated scan line */}
              <div className="absolute top-0 left-0 w-full h-1 bg-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.5)] animate-[scan_2s_ease-in-out_infinite]"></div>

              <FileText className="w-10 h-10 text-orange-500 mb-3" />
              <p className="text-sm font-bold text-white max-w-[90%] truncate text-center">{currentFile.name}</p>
              <p className="text-[10px] text-zinc-500 font-mono mb-4">{(currentFile.base64.length * 0.75 / 1024).toFixed(1)} KB</p>

              <div className="flex items-center gap-2 flex-wrap justify-center">
                 {onPreview && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onPreview(); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-medium text-zinc-300 transition-colors border border-zinc-700 hover:text-white"
                    >
                        <Eye className="w-3.5 h-3.5" /> Preview PDF
                    </button>
                 )}
              </div>
              
              <button 
                onClick={removeFile}
                className="absolute top-2 right-2 p-2 hover:bg-red-900/20 rounded-lg transition-colors text-zinc-500 hover:text-red-400"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
      </div>
    </div>
  );
};

export default ResumeUploader;
