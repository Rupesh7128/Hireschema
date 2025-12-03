
import React, { useEffect } from 'react';
import { ArrowLeft, Shield, FileText, Cookie } from 'lucide-react';
import { motion } from 'framer-motion';

interface LegalPagesProps {
  page: 'privacy' | 'terms' | 'cookies';
  onBack: () => void;
}

const LegalPages: React.FC<LegalPagesProps> = ({ page, onBack }) => {
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  const renderContent = () => {
    switch (page) {
      case 'privacy':
        return (
          <div className="space-y-6 text-zinc-300">
            <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
              <Shield className="w-8 h-8 text-orange-500" /> Privacy Policy
            </h1>
            <p><strong>Last Updated: November 2025</strong></p>
            <p>At HireSchema (by KoK Labs), we prioritize your data privacy and security. This Privacy Policy outlines how we handle your information.</p>
            
            <h3 className="text-xl font-bold text-white mt-6">1. Data Collection & Usage</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>We do not store your uploaded resumes or personal documents on our servers (Zero Data Retention).</li>
              <li>Processing occurs in ephemeral memory during your active session and is wiped immediately after or when you close the tab.</li>
              <li>We collect anonymous usage analytics (via Google Analytics) to improve our service.</li>
            </ul>

            <h3 className="text-xl font-bold text-white mt-6">2. Third-Party Services</h3>
            <p>We use trusted third-party services for specific functions:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Google Gemini API:</strong> For AI analysis. Data sent is transient and not used to train models.</li>
              <li><strong>Dodo Payments:</strong> For secure payment processing. We do not handle or store your credit card information.</li>
            </ul>

            <h3 className="text-xl font-bold text-white mt-6">3. User Rights</h3>
            <p>Since we do not store your personal data, there is no data to request for deletion. Your session data is strictly local to your browser and our temporary processing instance.</p>
          </div>
        );
      case 'terms':
        return (
          <div className="space-y-6 text-zinc-300">
             <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
              <FileText className="w-8 h-8 text-orange-500" /> Terms & Conditions
            </h1>
            <p><strong>Last Updated: November 2025</strong></p>
            
            <h3 className="text-xl font-bold text-white mt-6">1. Service Usage</h3>
            <p>HireSchema provides AI-powered resume analysis and optimization. By using our service, you agree that:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>You are uploading documents you own or have the right to process.</li>
              <li>You will not use the service for any illegal or unauthorized purpose.</li>
            </ul>

            <h3 className="text-xl font-bold text-white mt-6">2. Payments</h3>
            <p>Our "Pay-as-you-go" model charges $1 per download. Payments are processed securely via Dodo Payments. Refunds are handled on a case-by-case basis if the service fails to deliver the generated content.</p>

            <h3 className="text-xl font-bold text-white mt-6">3. Disclaimer</h3>
            <p>The AI suggestions provided are for informational purposes only. We do not guarantee a specific job outcome or interview offer. Career decisions should be made based on your own judgment.</p>
          </div>
        );
      case 'cookies':
        return (
           <div className="space-y-6 text-zinc-300">
             <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
              <Cookie className="w-8 h-8 text-orange-500" /> Cookie Policy
            </h1>
            <p><strong>Last Updated: November 2025</strong></p>

            <h3 className="text-xl font-bold text-white mt-6">1. What are cookies?</h3>
            <p>Cookies are small text files stored on your device. We use them sparingly to enhance your experience.</p>

            <h3 className="text-xl font-bold text-white mt-6">2. How we use cookies</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Essential Cookies:</strong> To remember your session state (e.g., your analysis results) locally on your device so you don't lose work on refresh.</li>
              <li><strong>Analytics Cookies:</strong> Google Analytics uses cookies to help us understand site traffic and usage patterns.</li>
            </ul>

            <h3 className="text-xl font-bold text-white mt-6">3. Managing Cookies</h3>
            <p>You can choose to disable cookies through your browser settings, though this may affect the ability to save your session progress.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-12 font-sans"
    >
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to App
        </button>
        
        <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-8 md:p-12 shadow-2xl">
          {renderContent()}
        </div>

        <footer className="mt-12 text-center text-zinc-600 text-xs">
          © 2025 HireSchema AI. All rights reserved.
        </footer>
      </div>
    </motion.div>
  );
};

export default LegalPages;
