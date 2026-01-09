
export interface ScoreFactor {
  category: string;
  score: number;
  maxScore: number;
  details: string;
}

export interface AnalysisResult {
  score: number;
  suggestions: string[];
  missingKeywords: string[];
  strengths: string[];
  optimizedContent: string;
  scoreBreakdown: ScoreFactor[];
  linkedinOptimization?: {
    headline: string;
    about: string;
  };
}

export interface UserCV {
  content: string;
  targetJob: string;
  jobUrl?: string;
}

export interface AppState {
  step: 'upload' | 'job-info' | 'analyzing' | 'result';
  cvData: UserCV | null;
  analysis: AnalysisResult | null;
  downloadCount: number;
  isPaid: boolean;
}

export type LanguageCode = 'en' | 'pt-BR' | 'es' | 'it' | 'fr' | 'de' | 'ar';

export enum FileType {
  PDF = 'application/pdf',
  DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  TEXT = 'text/plain'
}
