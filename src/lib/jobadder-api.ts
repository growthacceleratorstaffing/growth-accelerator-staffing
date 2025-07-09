// External API client for Startup Accelerator Website
// Job Board: Startup Accelerator Website API (ID: 8734)
// Portal: Startup Accelerator API (ID: 4809)
import { supabase } from "@/integrations/supabase/client";

const JOBADDER_API_BASE = 'https://api.jobadder.com/v2';
const JOBBOARD_ID = 8734;
const PORTAL_ID = 4809;

export interface JobAdderJob {
  adId: number;
  state: string;
  title: string;
  reference: string;
  summary: string;
  bulletPoints: string[];
  company: {
    companyId: number;
    name: string;
  };
  location: {
    locationId: number;
    name: string;
    area?: {
      areaId: number;
      name: string;
    };
  };
  workType?: {
    workTypeId: number;
    name: string;
  };
  salary?: {
    ratePer: string;
    rateLow: number;
    rateHigh: number;
    currency: string;
  };
  category?: {
    categoryId: number;
    name: string;
    subCategory?: {
      subCategoryId: number;
      name: string;
    };
  };
  postAt: string;
  expireAt: string;
  owner: {
    userId: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface JobAdderJobDetail extends JobAdderJob {
  description: string;
  requirements?: string;
  benefits?: string;
  skillTags?: string[];
  applications?: {
    total: number;
    new: number;
    active: number;
  };
}

class JobAdderAPI {
  /**
   * Fetch jobs from the job board using Supabase edge function
   */
  async getJobBoardJobs(options: {
    offset?: number;
    limit?: number;
    search?: string;
  } = {}): Promise<{ items: JobAdderJob[]; totalCount: number }> {
    try {
      // Check if user is authenticated with JobAdder
      const { default: oauth2Manager } = await import('./oauth2-manager');
      const isAuth = await oauth2Manager.isAuthenticated();
      
      if (!isAuth) {
        throw new Error('No JobAdder authentication. Please connect your JobAdder account first.');
      }

      // Get current user ID
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        throw new Error('Please sign in to the app first.');
      }

      const { data, error } = await supabase.functions.invoke('jobadder-api', {
        body: { 
          endpoint: 'jobboards',
          boardId: JOBBOARD_ID.toString(),
          limit: options.limit?.toString() || '50',
          offset: options.offset?.toString() || '0',
          search: options.search,
          userId: userId
        },
        headers: {
          'x-user-id': userId
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        items: data?.items || [],
        totalCount: data?.totalCount || 0
      };
    } catch (error) {
      console.error('Error fetching JobAdder job board jobs:', error);
      throw error;
    }
  }

  /**
   * Import a JobAdder job to local database using Supabase edge function
   */
  async importJob(job: JobAdderJob): Promise<any> {
    try {
      // Check if user is authenticated with JobAdder
      const { default: oauth2Manager } = await import('./oauth2-manager');
      const isAuth = await oauth2Manager.isAuthenticated();
      
      if (!isAuth) {
        throw new Error('No JobAdder authentication. Please connect your JobAdder account first.');
      }

      // Get current user ID
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        throw new Error('Please sign in to the app first.');
      }

      const { data, error } = await supabase.functions.invoke('jobadder-api', {
        body: { 
          endpoint: 'import-job',
          job: job,
          userId: userId
        },
        headers: {
          'x-user-id': userId
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error importing JobAdder job:', error);
      throw error;
    }
  }

  // Legacy methods for backward compatibility - now use Supabase edge function
  async findJobBoardJobAds(params?: {
    offset?: number;
    limit?: number;
    search?: string;
  }): Promise<{ items: JobAdderJob[]; totalCount: number }> {
    return this.getJobBoardJobs(params);
  }

  async getJobBoardJobAd(adId: number): Promise<JobAdderJobDetail> {
    try {
      // Check if user is authenticated with JobAdder
      const { default: oauth2Manager } = await import('./oauth2-manager');
      const isAuth = await oauth2Manager.isAuthenticated();
      
      if (!isAuth) {
        throw new Error('No JobAdder authentication. Please connect your JobAdder account first.');
      }

      // Get current user ID
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        throw new Error('Please sign in to the app first.');
      }

      const { data, error } = await supabase.functions.invoke('jobadder-api', {
        body: { 
          endpoint: 'jobboard-ad',
          adId: adId.toString(),
          boardId: JOBBOARD_ID.toString(),
          userId: userId
        },
        headers: {
          'x-user-id': userId
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error fetching job ad details:', error);
      throw error;
    }
  }
}

export const jobAdderAPI = new JobAdderAPI();