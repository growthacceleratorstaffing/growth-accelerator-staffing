import { supabase } from "@/integrations/supabase/client";

export interface JazzHRJob {
  id: string;
  title: string;
  description: string;
  department?: string;
  city?: string;
  state?: string;
  status: string;
  recruiter?: string;
  hiring_lead?: string;
  employment_type?: string;
  minimum_experience?: string;
  created_at?: string;
  updated_at?: string;
}

export interface JazzHRApplicant {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  city?: string;
  state?: string;
  apply_date?: string;
  status?: {
    id: string;
    name: string;
  };
  rating?: number;
  source?: string;
  job?: {
    id: string;
    title: string;
  };
}

export interface JazzHRUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface JazzHRActivity {
  id: string;
  category: string;
  user_id: string;
  object_id: string;
  description: string;
  created_at: string;
}

export class JazzHRAPIClient {
  private async makeRequest(action: string, params: any = {}) {
    const { data, error } = await supabase.functions.invoke('jazzhr-api', {
      body: { action, params }
    });

    if (error) {
      throw new Error(`JazzHR API error: ${error.message}`);
    }

    return data;
  }

  // Jobs
  async getJobs(filters?: {
    title?: string;
    department?: string;
    status?: string;
    city?: string;
    state?: string;
  }): Promise<JazzHRJob[]> {
    return this.makeRequest('getJobs', filters);
  }

  async getJob(jobId: string): Promise<JazzHRJob> {
    return this.makeRequest('getJob', { job_id: jobId });
  }

  async createJob(jobData: {
    title: string;
    hiring_lead_id: string;
    description: string;
    workflow_id: string;
    employment_type?: string;
    minimum_experience?: string;
    department?: string;
    city?: string;
    state?: string;
    job_status?: string;
  }): Promise<JazzHRJob> {
    return this.makeRequest('createJob', jobData);
  }

  // Applicants
  async getApplicants(filters?: {
    name?: string;
    job_id?: string;
    city?: string;
    status?: string;
    rating?: string;
    from_apply_date?: string;
    to_apply_date?: string;
  }): Promise<JazzHRApplicant[]> {
    return this.makeRequest('getApplicants', filters);
  }

  async getApplicant(applicantId: string): Promise<JazzHRApplicant> {
    return this.makeRequest('getApplicant', { applicant_id: applicantId });
  }

  async createApplicant(applicantData: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    city?: string;
    state?: string;
    job?: string;
    workflow_step_id?: string;
    coverletter?: string;
    source?: string;
    referral?: string;
    salary?: string;
    resumetext?: string;
  }): Promise<JazzHRApplicant> {
    return this.makeRequest('createApplicant', applicantData);
  }

  // Users
  async getUsers(): Promise<JazzHRUser[]> {
    return this.makeRequest('getUsers');
  }

  // Activities
  async getActivities(filters?: {
    user_id?: string;
    object_id?: string;
    category?: string;
  }): Promise<JazzHRActivity[]> {
    return this.makeRequest('getActivities', filters);
  }

  // Notes
  async createNote(noteData: {
    applicant_id: string;
    contents: string;
    user_id?: string;
    security?: string;
  }): Promise<any> {
    return this.makeRequest('createNote', noteData);
  }
}

export const jazzhrAPI = new JazzHRAPIClient();