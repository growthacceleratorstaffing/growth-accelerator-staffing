import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Comprehensive hook for all JobAdder API operations
export function useJobAdderAPI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const callAPI = async (endpoint: string, params?: Record<string, any>, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET') => {
    setLoading(true);
    setError(null);

    try {
      let body;
      if (method === 'GET') {
        const queryParams = new URLSearchParams({ endpoint, ...params });
        const { data, error: supabaseError } = await supabase.functions.invoke(`jobadder-api?${queryParams.toString()}`);
        
        if (supabaseError) {
          throw new Error(supabaseError.message);
        }
        return data;
      } else {
        // For POST, PUT, DELETE
        const { data, error: supabaseError } = await supabase.functions.invoke('jobadder-api', {
          body: { endpoint, ...params }
        });
        
        if (supabaseError) {
          throw new Error(supabaseError.message);
        }
        return data;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast({
        title: "API Error",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ===== CORE ENTITY OPERATIONS =====
  
  // Jobs
  const getJobs = (params?: { limit?: number; offset?: number; search?: string }) => 
    callAPI('jobs', params);
  
  const getJob = (jobId: string) => 
    callAPI('job', { jobId });
  
  const createJob = (jobData: any) => 
    callAPI('create-job', jobData, 'POST');
  
  const updateJob = (jobId: string, jobData: any) => 
    callAPI('update-job', { jobId, ...jobData }, 'PUT');
  
  const deleteJob = (jobId: string) => 
    callAPI('delete-job', { jobId }, 'DELETE');

  // Candidates
  const getCandidates = (params?: { limit?: number; offset?: number; search?: string }) => 
    callAPI('candidates', params);
  
  const getCandidate = (candidateId: string) => 
    callAPI('candidate', { candidateId });
  
  const createCandidate = (candidateData: any) => 
    callAPI('create-candidate', candidateData, 'POST');
  
  const updateCandidate = (candidateId: string, candidateData: any) => 
    callAPI('update-candidate', { candidateId, ...candidateData }, 'PUT');
  
  const deleteCandidate = (candidateId: string) => 
    callAPI('delete-candidate', { candidateId }, 'DELETE');

  // Placements
  const getPlacements = (params?: { limit?: number; offset?: number; search?: string }) => 
    callAPI('placements', params);
  
  const getPlacement = (placementId: string) => 
    callAPI('placement', { placementId });
  
  const createPlacement = (placementData: any) => 
    callAPI('create-placement', placementData, 'POST');
  
  const updatePlacement = (placementId: string, placementData: any) => 
    callAPI('update-placement', { placementId, ...placementData }, 'PUT');

  // Companies
  const getCompanies = (params?: { limit?: number; offset?: number; search?: string }) => 
    callAPI('companies', params);
  
  const getCompany = (companyId: string) => 
    callAPI('company', { companyId });
  
  const createCompany = (companyData: any) => 
    callAPI('create-company', companyData, 'POST');
  
  const updateCompany = (companyId: string, companyData: any) => 
    callAPI('update-company', { companyId, ...companyData }, 'PUT');

  const getCompanyContacts = (companyId: string) => 
    callAPI('company-contacts', { companyId });

  const getCompanyJobs = (companyId: string) => 
    callAPI('company-jobs', { companyId });

  // Contacts
  const getContacts = (params?: { limit?: number; offset?: number; search?: string }) => 
    callAPI('contacts', params);
  
  const getContact = (contactId: string) => 
    callAPI('contact', { contactId });
  
  const createContact = (contactData: any) => 
    callAPI('create-contact', contactData, 'POST');
  
  const updateContact = (contactId: string, contactData: any) => 
    callAPI('update-contact', { contactId, ...contactData }, 'PUT');

  // ===== OPPORTUNITIES =====
  const getOpportunities = (params?: { limit?: number; offset?: number; search?: string }) => 
    callAPI('opportunities', params);
  
  const getOpportunity = (opportunityId: string) => 
    callAPI('opportunity', { opportunityId });
  
  const createOpportunity = (opportunityData: any) => 
    callAPI('create-opportunity', opportunityData, 'POST');

  const getOpportunityStages = () => 
    callAPI('opportunity-stages');

  // ===== REQUISITIONS =====
  const getRequisitions = (params?: { limit?: number; offset?: number; search?: string }) => 
    callAPI('requisitions', params);
  
  const getRequisition = (requisitionId: string) => 
    callAPI('requisition', { requisitionId });
  
  const createRequisition = (requisitionData: any) => 
    callAPI('create-requisition', requisitionData, 'POST');

  const getRequisitionApprovalHistory = (requisitionId: string) => 
    callAPI('requisition-approval-history', { requisitionId });

  // ===== JOB ADS =====
  const getJobAds = (params?: { limit?: number; offset?: number; search?: string }) => 
    callAPI('jobads', params);
  
  const getJobAd = (jobadId: string) => 
    callAPI('jobad', { jobadId });
  
  const createJobAd = (jobadData: any) => 
    callAPI('create-jobad', jobadData, 'POST');

  const getJobAdApplications = (jobadId: string) => 
    callAPI('jobad-applications', { jobadId });

  // ===== JOB APPLICATIONS =====
  const getJobApplications = (jobId: string, params?: { limit?: number; offset?: number }) => 
    callAPI('job-applications', { jobId, ...params });
  
  const getJobApplication = (applicationId: string) => 
    callAPI('job-application', { applicationId });

  // ===== ATTACHMENTS =====
  const getAttachments = (entityType: string, entityId: string) => 
    callAPI('attachments', { entityType, entityId });
  
  const getAttachment = (entityType: string, entityId: string, attachmentId: string) => 
    callAPI('attachment', { entityType, entityId, attachmentId });
  
  const addAttachment = (entityType: string, entityId: string, attachmentData: any) => 
    callAPI('add-attachment', { entityType, entityId, ...attachmentData }, 'POST');
  
  const deleteAttachment = (entityType: string, entityId: string, attachmentId: string) => 
    callAPI('delete-attachment', { entityType, entityId, attachmentId }, 'DELETE');

  // ===== NOTES =====
  const getNotes = (entityType: string, entityId: string) => 
    callAPI('notes', { entityType, entityId });
  
  const addNote = (entityType: string, entityId: string, noteData: any) => 
    callAPI('add-note', { entityType, entityId, ...noteData }, 'POST');

  const getNoteTypes = () => 
    callAPI('note-types');

  // ===== ACTIVITIES =====
  const getActivities = (entityType: string, entityId: string) => 
    callAPI('activities', { entityType, entityId });
  
  const getActivity = (entityType: string, entityId: string, activityId: string) => 
    callAPI('activity', { entityType, entityId, activityId });
  
  const addActivity = (entityType: string, entityId: string, activityData: any) => 
    callAPI('add-activity', { entityType, entityId, ...activityData }, 'POST');

  // ===== INTERVIEWS =====
  const getInterviews = (entityType: string, entityId: string) => 
    callAPI('interviews', { entityType, entityId });
  
  const getInterview = (interviewId: string) => 
    callAPI('interview', { interviewId });

  // ===== USERS =====
  const getUsers = (params?: { limit?: number; offset?: number }) => 
    callAPI('users', params);
  
  const getUser = (userId: string) => 
    callAPI('user', { userId });
  
  const getCurrentUser = () => 
    callAPI('current-user');

  // ===== FOLDERS =====
  const getFolders = (params?: { limit?: number; offset?: number }) => 
    callAPI('folders', params);
  
  const getFolder = (folderId: string) => 
    callAPI('folder', { folderId });

  // ===== SEARCH =====
  const searchByEmail = (email: string) => 
    callAPI('search-email', { email });
  
  const searchByPhone = (phone: string) => 
    callAPI('search-phone', { phone });

  // ===== REFERENCE DATA =====
  const getCategories = () => callAPI('categories');
  const getLocations = () => callAPI('locations');
  const getCountries = () => callAPI('countries');
  const getWorkTypes = () => callAPI('work-types');
  const getJobSources = () => callAPI('job-sources');
  const getJobStatuses = () => callAPI('job-statuses');
  const getCandidateSources = () => callAPI('candidate-sources');
  const getCandidateStatuses = () => callAPI('candidate-statuses');

  // ===== JOB BOARDS =====
  const getJobBoardAds = (jobboardId?: string, params?: { limit?: number; offset?: number; search?: string }) => 
    callAPI('jobboards', { jobboardId, ...params });

  return {
    loading,
    error,
    
    // Core entities
    getJobs,
    getJob,
    createJob,
    updateJob,
    deleteJob,
    
    getCandidates,
    getCandidate,
    createCandidate,
    updateCandidate,
    deleteCandidate,
    
    getPlacements,
    getPlacement,
    createPlacement,
    updatePlacement,
    
    getCompanies,
    getCompany,
    createCompany,
    updateCompany,
    getCompanyContacts,
    getCompanyJobs,
    
    getContacts,
    getContact,
    createContact,
    updateContact,
    
    // Opportunities
    getOpportunities,
    getOpportunity,
    createOpportunity,
    getOpportunityStages,
    
    // Requisitions
    getRequisitions,
    getRequisition,
    createRequisition,
    getRequisitionApprovalHistory,
    
    // Job Ads
    getJobAds,
    getJobAd,
    createJobAd,
    getJobAdApplications,
    
    // Job Applications
    getJobApplications,
    getJobApplication,
    
    // Attachments
    getAttachments,
    getAttachment,
    addAttachment,
    deleteAttachment,
    
    // Notes
    getNotes,
    addNote,
    getNoteTypes,
    
    // Activities
    getActivities,
    getActivity,
    addActivity,
    
    // Interviews
    getInterviews,
    getInterview,
    
    // Users
    getUsers,
    getUser,
    getCurrentUser,
    
    // Folders
    getFolders,
    getFolder,
    
    // Search
    searchByEmail,
    searchByPhone,
    
    // Reference data
    getCategories,
    getLocations,
    getCountries,
    getWorkTypes,
    getJobSources,
    getJobStatuses,
    getCandidateSources,
    getCandidateStatuses,
    
    // Job boards
    getJobBoardAds,
  };
}