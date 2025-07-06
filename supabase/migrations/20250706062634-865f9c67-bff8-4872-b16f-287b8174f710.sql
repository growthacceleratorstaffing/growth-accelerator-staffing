-- Create local placements table for when JobAdder API is unavailable
CREATE TABLE public.local_placements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  candidate_name TEXT NOT NULL,
  candidate_email TEXT NOT NULL,
  job_id TEXT NOT NULL,
  job_title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  salary_rate DECIMAL,
  salary_currency TEXT DEFAULT 'USD',
  salary_rate_per TEXT DEFAULT 'Year',
  work_type_id TEXT,
  status_id INTEGER DEFAULT 1,
  status_name TEXT DEFAULT 'Active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced_to_jobadder BOOLEAN DEFAULT false,
  jobadder_placement_id INTEGER
);

-- Enable Row Level Security
ALTER TABLE public.local_placements ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view all local placements" 
ON public.local_placements 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create local placements" 
ON public.local_placements 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update local placements" 
ON public.local_placements 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete local placements" 
ON public.local_placements 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_local_placements()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_local_placements_updated_at
BEFORE UPDATE ON public.local_placements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_local_placements();