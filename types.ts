
export interface ContactProfile {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  location: string;
  photo?: string; // Base64 string
}

export interface MarketAnalysis {
  salary: string;
  verdict: string;
  culture: string;
}

export interface AnalysisResult {
  jobTitle?: string; // New: For Dashboard
  company?: string; // New: For Dashboard
  atsScore: number; 
  relevanceScore: number; 
  roleFitAnalysis: string; 
  contactProfile: ContactProfile;
  languages: string[]; 
  missingKeywords: string[];
  criticalIssues: string[];
  keyStrengths: string[];
  summary: string;
  marketAnalysis?: MarketAnalysis;
}

export enum GeneratorType {
  ATS_RESUME = 'ATS Resume',
  RESUME_SUGGESTIONS = 'Resume Suggestions',
  COVER_LETTER = 'Cover Letter',
  INTERVIEW_PREP = 'Interview Q&A',
  EMAIL_TEMPLATE = 'Cold Outreach',
  LEARNING_PATH = 'Learning Path',
  MARKET_INSIGHTS = 'Market Insights',
}

export interface GeneratedContent {
  type: GeneratorType;
  content: string;
}

export interface FileData {
  id?: string; // Optional ID for master resumes
  name: string;
  type: string;
  base64: string;
  uploadDate?: string;
}

export type ApplicationStatus = 'To Do' | 'Applied' | 'Interviewing' | 'Offer' | 'Rejected';

export interface HistoryItem {
    id: string;
    date: string;
    jobTitle: string;
    company: string;
    atsScore: number;
    status: ApplicationStatus;
    resumeFile: FileData;
    jobDescription: string;
    analysisResult: AnalysisResult;
}