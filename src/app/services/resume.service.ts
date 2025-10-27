import { Injectable, signal } from '@angular/core';
import { AuthService } from './auth.service';

export interface Rewrite {
  id: string;
  user_id: string;
  original_text: string;
  rewritten_text: string;
  created_at: string;
  type: 'cv' | 'linkedin';
}

export interface ATSIssue {
  category: string;
  severity: 'high' | 'medium' | 'low';
  issue: string;
  description: string;
  impact: number;
}

export interface ATSRecommendation {
  category: string;
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
  benefit: string;
}

export interface ATSScore {
  score: number;
  grade: string;
  scores: {
    format: number;
    keywords: number;
    structure: number;
    content: number;
    contact: number;
  };
  issues: ATSIssue[];
  recommendations: ATSRecommendation[];
  stats: {
    wordCount: number;
    actionVerbCount: number;
    quantifiableAchievements: number;
    keywordDensity: number;
    foundKeywords: number;
    totalKeywordsScanned: number;
  };
  keywordSuggestions: string[];
  summary: string;
}

export interface JobMatchKeyword {
  keyword: string;
  importance: 'high' | 'medium' | 'low';
  found?: boolean;
  category?: string;
}

export interface JobMatchAnalysis {
  matchScore: number;
  analysis: {
    strengths: string[];
    gaps: string[];
    recommendations: string[];
  };
  keywords: {
    matched: JobMatchKeyword[];
    missing: JobMatchKeyword[];
  };
  skillsBreakdown: {
    technical: {
      score: number;
      matched: string[];
      missing: string[];
    };
    soft: {
      score: number;
      matched: string[];
      missing: string[];
    };
    experience: {
      score: number;
      yearsRequired: string;
      yearsInResume: string;
      relevantExperience: boolean;
    };
  };
  atsCompatibility: {
    score: number;
    keywordDensity: string;
    formatIssues: string[];
  };
  summary: string;
}

@Injectable({
  providedIn: 'root'
})
export class ResumeService {
  rewrites = signal<Rewrite[]>([]);
  isLoading = signal(false);
  atsScore = signal<ATSScore | null>(null);
  jobMatchAnalysis = signal<JobMatchAnalysis | null>(null);
  tailoredResume = signal<string>('');

  constructor(private authService: AuthService) {}

  async rewriteCV(cvText: string): Promise<string> {
    this.isLoading.set(true);
    try {
      const atsIssues = this.atsScore()?.issues || [];

      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cvText,
          type: 'cv',
          atsIssues: atsIssues
        })
      });

      if (!response.ok) {
        throw new Error('Failed to rewrite CV');
      }

      const data = await response.json();
      await this.saveRewrite(cvText, data.rewrittenText, 'cv');
      return data.rewrittenText;
    } finally {
      this.isLoading.set(false);
    }
  }

  async generateLinkedIn(cvText: string): Promise<{ headline: string; summary: string }> {
    this.isLoading.set(true);
    try {
      const response = await fetch('/api/linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cvText })
      });

      if (!response.ok) {
        throw new Error('Failed to generate LinkedIn content');
      }

      const data = await response.json();
      return data;
    } finally {
      this.isLoading.set(false);
    }
  }

  async analyzeATS(cvText: string): Promise<ATSScore> {
    this.isLoading.set(true);
    try {
      const response = await fetch('/api/ats-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cvText })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze ATS score');
      }

      const data = await response.json();
      this.atsScore.set(data);
      return data;
    } finally {
      this.isLoading.set(false);
    }
  }

  async parseCV(cvText: string): Promise<any> {
    const response = await fetch('/api/parse-cv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cvText })
    });

    if (!response.ok) {
      throw new Error('Failed to parse CV');
    }

    return await response.json();
  }

  async generateTemplateHTML(cvData: any, templateName: string): Promise<string> {
    const response = await fetch('/api/generate-template-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cvData, templateName })
    });

    if (!response.ok) {
      throw new Error('Failed to generate template');
    }

    const data = await response.json();
    return data.html;
  }

  private sanitizeText(text: string): string {
    // Remove null bytes and other problematic Unicode characters
    return text.replace(/\u0000/g, '').replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '');
  }

  private async saveRewrite(originalText: string, rewrittenText: string, type: 'cv' | 'linkedin') {
    const supabase = this.authService.getSupabaseClient();
    const user = this.authService.currentUser();

    if (!user) return;

    const { error } = await supabase
      .from('rewrites')
      .insert({
        user_id: user.id,
        original_text: this.sanitizeText(originalText),
        rewritten_text: this.sanitizeText(rewrittenText),
        type
      });

    if (error) {
      console.error('Error saving rewrite:', error);
    } else {
      await this.fetchRewrites();
    }
  }

  async fetchRewrites() {
    const supabase = this.authService.getSupabaseClient();
    const user = this.authService.currentUser();

    if (!user) return;

    const { data, error } = await supabase
      .from('rewrites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching rewrites:', error);
    } else {
      this.rewrites.set(data || []);
    }
  }

  async analyzeJobMatch(resumeText: string, jobDescription: string): Promise<JobMatchAnalysis> {
    this.isLoading.set(true);
    try {
      const response = await fetch('/api/job-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jobDescription })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze job match');
      }

      const data = await response.json();
      this.jobMatchAnalysis.set(data);
      return data;
    } finally {
      this.isLoading.set(false);
    }
  }

  async tailorResumeForJob(resumeText: string, jobDescription: string, matchAnalysis?: JobMatchAnalysis): Promise<string> {
    this.isLoading.set(true);
    try {
      const response = await fetch('/api/tailor-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText,
          jobDescription,
          matchAnalysis: matchAnalysis || this.jobMatchAnalysis()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to tailor resume');
      }

      const data = await response.json();
      this.tailoredResume.set(data.tailoredResume);

      // Save the tailored version
      await this.saveRewrite(resumeText, data.tailoredResume, 'cv');

      return data.tailoredResume;
    } finally {
      this.isLoading.set(false);
    }
  }
}
