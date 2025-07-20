-- Create CRM integrations table to store user's connected CRM tools
CREATE TABLE public.crm_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crm_type TEXT NOT NULL, -- 'hubspot', 'salesforce', 'apollo', etc.
  crm_name TEXT NOT NULL,
  api_key_encrypted TEXT, -- Store encrypted API keys
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_frequency_hours INTEGER DEFAULT 24,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, crm_type)
);

-- Create CRM contacts table to store imported contacts per user
CREATE TABLE public.crm_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id TEXT, -- ID from the external CRM system
  crm_source TEXT NOT NULL, -- Which CRM this came from
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  position TEXT,
  status TEXT DEFAULT 'lead', -- 'lead', 'prospect', 'customer', 'inactive'
  last_contact_date TIMESTAMP WITH TIME ZONE,
  contact_data JSONB DEFAULT '{}', -- Additional data from CRM
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, external_id, crm_source)
);

-- Create CRM companies table to store imported companies per user
CREATE TABLE public.crm_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id TEXT, -- ID from the external CRM system
  crm_source TEXT NOT NULL, -- Which CRM this came from
  name TEXT NOT NULL,
  industry TEXT,
  company_size TEXT,
  location TEXT,
  website TEXT,
  contact_count INTEGER DEFAULT 0,
  last_activity_date TIMESTAMP WITH TIME ZONE,
  company_data JSONB DEFAULT '{}', -- Additional data from CRM
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, external_id, crm_source)
);

-- Enable Row Level Security
ALTER TABLE public.crm_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_companies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for crm_integrations
CREATE POLICY "Users can view their own CRM integrations"
ON public.crm_integrations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own CRM integrations"
ON public.crm_integrations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CRM integrations"
ON public.crm_integrations
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own CRM integrations"
ON public.crm_integrations
FOR DELETE
USING (auth.uid() = user_id);

-- Create RLS policies for crm_contacts
CREATE POLICY "Users can view their own CRM contacts"
ON public.crm_contacts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own CRM contacts"
ON public.crm_contacts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CRM contacts"
ON public.crm_contacts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own CRM contacts"
ON public.crm_contacts
FOR DELETE
USING (auth.uid() = user_id);

-- Create RLS policies for crm_companies
CREATE POLICY "Users can view their own CRM companies"
ON public.crm_companies
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own CRM companies"
ON public.crm_companies
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CRM companies"
ON public.crm_companies
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own CRM companies"
ON public.crm_companies
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_crm_integrations_user_id ON public.crm_integrations(user_id);
CREATE INDEX idx_crm_contacts_user_id ON public.crm_contacts(user_id);
CREATE INDEX idx_crm_contacts_crm_source ON public.crm_contacts(user_id, crm_source);
CREATE INDEX idx_crm_companies_user_id ON public.crm_companies(user_id);
CREATE INDEX idx_crm_companies_crm_source ON public.crm_companies(user_id, crm_source);

-- Create trigger functions for updating timestamps
CREATE OR REPLACE FUNCTION public.update_crm_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_crm_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_crm_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER trigger_crm_integrations_updated_at
BEFORE UPDATE ON public.crm_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_crm_integrations_updated_at();

CREATE TRIGGER trigger_crm_contacts_updated_at
BEFORE UPDATE ON public.crm_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_crm_contacts_updated_at();

CREATE TRIGGER trigger_crm_companies_updated_at
BEFORE UPDATE ON public.crm_companies
FOR EACH ROW
EXECUTE FUNCTION public.update_crm_companies_updated_at();