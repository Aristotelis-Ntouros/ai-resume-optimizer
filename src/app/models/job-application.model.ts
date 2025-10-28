export interface JobApplication {
  id: string;
  user_id: string;
  company_name: string;
  job_title: string;
  job_description?: string;
  job_url?: string;
  location?: string;
  status: 'saved' | 'applied' | 'interviewing' | 'offered' | 'rejected';
  original_resume_url?: string;
  tailored_resume_url?: string;
  tailored_resume_text?: string;
  match_score?: number;
  optimization_suggestions?: string;
  created_at: string;
  updated_at: string;
  applied_at?: string;
  notes?: string;
}

export interface CreateJobApplicationDto {
  company_name: string;
  job_title: string;
  job_description?: string;
  job_url?: string;
  location?: string;
  status?: 'saved' | 'applied' | 'interviewing' | 'offered' | 'rejected';
  original_resume_url?: string;
  tailored_resume_url?: string;
  tailored_resume_text?: string;
  match_score?: number;
  optimization_suggestions?: string;
  notes?: string;
}

export interface UpdateJobApplicationDto {
  company_name?: string;
  job_title?: string;
  job_description?: string;
  job_url?: string;
  location?: string;
  status?: 'saved' | 'applied' | 'interviewing' | 'offered' | 'rejected';
  original_resume_url?: string;
  tailored_resume_url?: string;
  tailored_resume_text?: string;
  match_score?: number;
  optimization_suggestions?: string;
  applied_at?: string;
  notes?: string;
}
