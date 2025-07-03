// JobAdder API client
const JOBADDER_API_BASE = 'https://api.jobadder.com/v2';

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

      const url = `${JOBADDER_API_BASE}/jobboards/jobads${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
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
      const url = `${JOBADDER_API_BASE}/jobboards/jobads/${adId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
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