// JobAdder API client for JobBoard ID 8734
const JOBADDER_API_BASE = 'https://api.jobadder.com/v2';
const JOBBOARD_ID = 8734;

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
  private headers: HeadersInit = {
    'Content-Type': 'application/json',
    // Note: In production, you would need proper authentication headers
    // 'Authorization': `Bearer ${API_KEY}`,
  };

  private async makeRequest(url: string, options: RequestInit, retryCount = 0): Promise<Response> {
    try {
      const response = await fetch(url, options);

      // Handle 429 Too Many Requests with retry logic
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, retryCount) * 1000; // Exponential backoff if no Retry-After
        
        console.warn(`Rate limited (429). Waiting ${waitTime / 1000} seconds before retry...`);
        
        // Only retry up to 3 times
        if (retryCount < 3) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return this.makeRequest(url, options, retryCount + 1);
        } else {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  async findJobBoardJobAds(params?: {
    offset?: number;
    limit?: number;
    search?: string;
  }): Promise<{ items: JobAdderJob[]; totalCount: number }> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.offset) searchParams.append('offset', params.offset.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.search) searchParams.append('search', params.search);

      const url = `${JOBADDER_API_BASE}/jobboards/${JOBBOARD_ID}/jobads${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      
      const response = await this.makeRequest(url, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching job ads:', error);
      throw error;
    }
  }

  async getJobBoardJobAd(adId: number): Promise<JobAdderJobDetail> {
    try {
      const url = `${JOBADDER_API_BASE}/jobboards/${JOBBOARD_ID}/jobads/${adId}`;
      
      const response = await this.makeRequest(url, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching job ad details:', error);
      throw error;
    }
  }
}

export const jobAdderAPI = new JobAdderAPI();