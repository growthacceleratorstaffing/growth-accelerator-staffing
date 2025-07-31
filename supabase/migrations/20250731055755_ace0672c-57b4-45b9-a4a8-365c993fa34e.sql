-- Create table for LinkedIn creatives
CREATE TABLE public.linkedin_creatives (
  id TEXT NOT NULL PRIMARY KEY,
  account_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  click_uri TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  creative_data JSONB
);

-- Enable Row Level Security
ALTER TABLE public.linkedin_creatives ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own creatives" 
ON public.linkedin_creatives 
FOR SELECT 
USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own creatives" 
ON public.linkedin_creatives 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own creatives" 
ON public.linkedin_creatives 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own creatives" 
ON public.linkedin_creatives 
FOR DELETE 
USING (auth.uid() = created_by);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_linkedin_creatives_updated_at
BEFORE UPDATE ON public.linkedin_creatives
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();