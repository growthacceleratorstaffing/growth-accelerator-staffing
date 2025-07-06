-- Create local jobs table for storing job postings
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  company_id TEXT,
  company_name TEXT,
  contact_id TEXT,
  location_id TEXT,
  location_name TEXT,
  area_id TEXT,
  work_type_id TEXT,
  work_type_name TEXT,
  category_id TEXT,
  category_name TEXT,
  sub_category_id TEXT,
  salary_rate_per TEXT,
  salary_rate_low NUMERIC,
  salary_rate_high NUMERIC,
  salary_currency TEXT DEFAULT 'USD',
  job_description TEXT,
  skill_tags TEXT[],
  source TEXT DEFAULT 'Website',
  jobadder_job_id TEXT,
  synced_to_jobadder BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for job access
CREATE POLICY "Authenticated users can view all jobs" 
ON public.jobs 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create jobs" 
ON public.jobs 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = created_by);

CREATE POLICY "Users can update their own jobs" 
ON public.jobs 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own jobs" 
ON public.jobs 
FOR DELETE 
USING (auth.uid() = created_by);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_jobs_updated_at();