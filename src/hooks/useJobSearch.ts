import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  type: "full-time" | "part-time" | "contract" | "remote";
  postedDate: string;
  url: string;
  source: string;
}

export interface SearchFilters {
  location: string;
  jobType: string;
  salaryMin: string;
  remote: boolean;
  datePosted: string;
}

interface CrawledJob {
  id: string;
  title: string;
  company: string;
  location: string | null;
  salary: string | null;
  description: string | null;
  job_type: string | null;
  posted_date: string | null;
  url: string;
  source: string;
  crawled_at: string;
}

export const useJobSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({
    location: "",
    jobType: "",
    salaryMin: "",
    remote: false,
    datePosted: "",
  });

  const { data: jobs = [], isLoading, error, refetch } = useQuery({
    queryKey: ['jobs', searchQuery, filters],
    queryFn: async (): Promise<JobListing[]> => {
      let query = supabase
        .from('crawled_jobs')
        .select('*')
        .eq('is_active', true)
        .order('posted_date', { ascending: false });

      // Apply search query filter
      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,company.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      // Apply location filter
      if (filters.location.trim()) {
        query = query.ilike('location', `%${filters.location}%`);
      }

      // Apply job type filter
      if (filters.jobType && filters.jobType !== '') {
        query = query.eq('job_type', filters.jobType);
      }

      // Apply remote filter
      if (filters.remote) {
        query = query.or('job_type.eq.remote,location.ilike.%remote%');
      }

      // Apply date filter
      if (filters.datePosted) {
        const daysAgo = parseInt(filters.datePosted);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
        query = query.gte('posted_date', cutoffDate.toISOString());
      }

      const { data, error } = await query.limit(100);

      if (error) {
        console.error('Error fetching jobs:', error);
        throw error;
      }

      // Transform crawled jobs to JobListing format
      const transformedJobs = (data as CrawledJob[]).map(job => ({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location || 'Unknown',
        salary: job.salary,
        description: job.description || '',
        type: (job.job_type as JobListing['type']) || 'full-time',
        postedDate: job.posted_date || job.crawled_at,
        url: job.url,
        source: job.source,
      }));

      // Filter out unwanted job listings by title
      const unwantedTitles = [
        'bart@growthaccelerator.nl',
        'midden-nederland',
        'zuid-holland',
        'zuid-nederland',
        'noord-holland',
        'oost-nederland',
        'vacatures',
        'data & ai vacatures',
        'data ai vacature overzicht',
        'github platform engineer'
      ];

      const filteredJobs = transformedJobs.filter(job => {
        const titleLower = job.title.toLowerCase().trim();
        
        // Check if the title contains any of the unwanted terms
        return !unwantedTitles.some(unwantedTitle => 
          titleLower.includes(unwantedTitle.toLowerCase())
        );
      });

      return filteredJobs;
    },
    enabled: true,
  });

  const crawlJobs = async () => {
    try {
      console.log('Starting job crawl...');
      const { data, error } = await supabase.functions.invoke('crawl-jobs');
      
      if (error) {
        console.error('Error crawling jobs:', error);
        throw error;
      }
      
      console.log('Crawl completed:', data);
      
      // Refetch the jobs after crawling
      await refetch();
      
      return data;
    } catch (error) {
      console.error('Failed to crawl jobs:', error);
      throw error;
    }
  };

  return {
    jobs,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    crawlJobs,
    totalResults: jobs.length,
  };
};