-- Create job_applications table
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Job details
  company_name VARCHAR(255) NOT NULL,
  job_title VARCHAR(255) NOT NULL,
  job_description TEXT,
  job_url VARCHAR(500),
  location VARCHAR(255),

  -- Application status
  status VARCHAR(50) NOT NULL DEFAULT 'saved',
  -- Status options: saved, applied, interviewing, offered, rejected

  -- Resume data
  original_resume_url VARCHAR(500),
  tailored_resume_url VARCHAR(500),
  tailored_resume_text TEXT,

  -- AI optimization data
  match_score INTEGER,
  optimization_suggestions TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_at TIMESTAMPTZ,

  -- Metadata
  notes TEXT,

  CONSTRAINT valid_status CHECK (status IN ('saved', 'applied', 'interviewing', 'offered', 'rejected')),
  CONSTRAINT valid_match_score CHECK (match_score >= 0 AND match_score <= 100)
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_job_applications_user_id ON job_applications(user_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_job_applications_created_at ON job_applications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own applications
CREATE POLICY "Users can view their own applications"
  ON job_applications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own applications
CREATE POLICY "Users can insert their own applications"
  ON job_applications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own applications
CREATE POLICY "Users can update their own applications"
  ON job_applications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can delete their own applications
CREATE POLICY "Users can delete their own applications"
  ON job_applications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON job_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
