import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// JobAdder API credentials from Supabase secrets
const JOBADDER_CLIENT_ID = Deno.env.get('JOBADDER_CLIENT_ID');
const JOBADDER_CLIENT_SECRET = Deno.env.get('JOBADDER_CLIENT_SECRET');
const JOBADDER_API_URL = Deno.env.get('JOBADDER_API_URL') || 'https://api.jobadder.com/v2';

// Token management
interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token?: string;
}

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  if (!JOBADDER_CLIENT_ID || !JOBADDER_CLIENT_SECRET) {
    throw new Error('JobAdder API credentials not configured');
  }

  try {
    const response = await fetch('https://id.jobadder.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: JOBADDER_CLIENT_ID,
        client_secret: JOBADDER_CLIENT_SECRET,
        scope: 'read write offline_access'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token request failed: ${response.status} ${errorText}`);
    }

    const tokenData: TokenResponse = await response.json();
    
    // Cache the token (subtract 5 minutes for safety)
    cachedToken = tokenData.access_token;
    tokenExpiry = Date.now() + ((tokenData.expires_in - 300) * 1000);
    
    console.log('JobAdder access token obtained successfully');
    return cachedToken;
  } catch (error) {
    console.error('Error getting JobAdder access token:', error);
    throw error;
  }
}

async function makeJobAdderRequest(endpoint: string, params?: Record<string, string>): Promise<any> {
  const accessToken = await getAccessToken();
  
  const url = new URL(`${JOBADDER_API_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`JobAdder API request failed: ${response.status} ${errorText}`);
  }

  return await response.json();
}

async function makeJobAdderPostRequest(endpoint: string, body: any): Promise<any> {
  const accessToken = await getAccessToken();
  
  const url = `${JOBADDER_API_URL}${endpoint}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`JobAdder API POST request failed: ${response.status} ${errorText}`);
  }

  return await response.json();
}

async function makeJobAdderPutRequest(endpoint: string, body: any): Promise<any> {
  const accessToken = await getAccessToken();
  
  const url = `${JOBADDER_API_URL}${endpoint}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`JobAdder API PUT request failed: ${response.status} ${errorText}`);
  }

  return await response.json();
}

async function makeJobAdderDeleteRequest(endpoint: string): Promise<any> {
  const accessToken = await getAccessToken();
  
  const url = `${JOBADDER_API_URL}${endpoint}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`JobAdder API DELETE request failed: ${response.status} ${errorText}`);
  }

  return response.status === 204 ? { success: true } : await response.json();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let endpoint = url.searchParams.get('endpoint');
    const limit = url.searchParams.get('limit') || '50';
    const offset = url.searchParams.get('offset') || '0';
    const search = url.searchParams.get('search');

    // For POST requests, check if endpoint is in the request body
    let requestBody = null;
    if (req.method === 'POST' && !endpoint) {
      try {
        requestBody = await req.json();
        if (requestBody.endpoint) {
          endpoint = requestBody.endpoint;
        }
      } catch (error) {
        console.error('Error parsing request body:', error);
      }
    }

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'Endpoint parameter is required (in URL params or request body)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`JobAdder API request: ${endpoint} (${req.method})`);

    let data;
    const params: Record<string, string> = { limit, offset };
    if (search) params.search = search;

    switch (endpoint) {
      case 'jobApplications':
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: 'jobApplications requires POST method' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const appData = requestBody;
        const boardId = url.searchParams.get('boardId') || appData.boardId || '8734';
        const adId = url.searchParams.get('adId') || appData.adId;
        if (!adId) {
          return new Response(
            JSON.stringify({ error: 'adId parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderPostRequest(`/jobboards/${boardId}/ads/${adId}/applications`, appData.applicationData);
        break;
        
      // ===== EXISTING ENDPOINTS =====
      case 'jobs':
        data = await makeJobAdderRequest('/jobs', params);
        break;
      
      case 'candidates':
        data = await makeJobAdderRequest('/candidates', params);
        break;
      
      case 'placements':
        data = await makeJobAdderRequest('/placements', params);
        break;
      
      case 'jobboards':
        const jobboardId = url.searchParams.get('jobboardId') || url.searchParams.get('boardId') || requestBody?.boardId || '8734';
        console.log(`Fetching jobboard ${jobboardId} ads with params:`, params);
        data = await makeJobAdderRequest(`/jobboards/${jobboardId}/ads`, params);
        break;
        
      case 'current-user':
        data = await makeJobAdderRequest('/users/current');
        break;
      
      case 'job':
        const jobId = url.searchParams.get('jobId');
        if (!jobId) {
          return new Response(
            JSON.stringify({ error: 'jobId parameter is required for job endpoint' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderRequest(`/jobs/${jobId}`);
        break;
      
      case 'candidate':
        const candidateId = url.searchParams.get('candidateId');
        if (!candidateId) {
          return new Response(
            JSON.stringify({ error: 'candidateId parameter is required for candidate endpoint' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderRequest(`/candidates/${candidateId}`);
        break;
      
      case 'placement':
        const placementId = url.searchParams.get('placementId');
        if (!placementId) {
          return new Response(
            JSON.stringify({ error: 'placementId parameter is required for placement endpoint' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderRequest(`/placements/${placementId}`);
        break;

      // ===== OPPORTUNITY API =====
      case 'opportunities':
        data = await makeJobAdderRequest('/opportunities', params);
        break;
      
      case 'opportunity':
        const opportunityId = url.searchParams.get('opportunityId');
        if (!opportunityId) {
          return new Response(
            JSON.stringify({ error: 'opportunityId parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderRequest(`/opportunities/${opportunityId}`);
        break;

      case 'opportunity-stages':
        data = await makeJobAdderRequest('/opportunities/stages');
        break;

      // ===== REQUISITION API =====
      case 'requisitions':
        data = await makeJobAdderRequest('/requisitions', params);
        break;
      
      case 'requisition':
        const requisitionId = url.searchParams.get('requisitionId');
        if (!requisitionId) {
          return new Response(
            JSON.stringify({ error: 'requisitionId parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderRequest(`/requisitions/${requisitionId}`);
        break;

      case 'requisition-approval-history':
        const reqId = url.searchParams.get('requisitionId');
        if (!reqId) {
          return new Response(
            JSON.stringify({ error: 'requisitionId parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderRequest(`/requisitions/${reqId}/approval`);
        break;

      // ===== JOB ADS API =====
      case 'jobads':
        data = await makeJobAdderRequest('/jobads', params);
        break;
      
      case 'jobad':
        const jobadId = url.searchParams.get('jobadId');
        if (!jobadId) {
          return new Response(
            JSON.stringify({ error: 'jobadId parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderRequest(`/jobads/${jobadId}`);
        break;

      case 'jobad-applications':
        const jadId = url.searchParams.get('jobadId');
        if (!jadId) {
          return new Response(
            JSON.stringify({ error: 'jobadId parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderRequest(`/jobads/${jadId}/applications`);
        break;

      // ===== JOB APPLICATIONS API =====
      case 'job-applications':
        const jId = url.searchParams.get('jobId');
        if (!jId) {
          return new Response(
            JSON.stringify({ error: 'jobId parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderRequest(`/jobs/${jId}/applications`, params);
        break;

      case 'job-application':
        const applicationId = url.searchParams.get('applicationId');
        if (!applicationId) {
          return new Response(
            JSON.stringify({ error: 'applicationId parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderRequest(`/jobapplications/${applicationId}`);
        break;

      // ===== COMPANIES API =====
      case 'companies':
        data = await makeJobAdderRequest('/companies', params);
        break;
      
      case 'company':
        const companyId = url.searchParams.get('companyId');
        if (!companyId) {
          return new Response(
            JSON.stringify({ error: 'companyId parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderRequest(`/companies/${companyId}`);
        break;

      case 'company-contacts':
        const cId = url.searchParams.get('companyId');
        if (!cId) {
          return new Response(
            JSON.stringify({ error: 'companyId parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderRequest(`/companies/${cId}/contacts`);
        break;

      case 'company-jobs':
        const cjId = url.searchParams.get('companyId');
        if (!cjId) {
          return new Response(
            JSON.stringify({ error: 'companyId parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderRequest(`/companies/${cjId}/jobs`);
        break;

      // ===== CONTACTS API =====
      case 'contacts':
        data = await makeJobAdderRequest('/contacts', params);
        break;
      
      case 'contact':
        const contactId = url.searchParams.get('contactId');
        if (!contactId) {
          return new Response(
            JSON.stringify({ error: 'contactId parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderRequest(`/contacts/${contactId}`);
        break;

      // ===== ATTACHMENTS API =====
      case 'attachments':
        const entityType = url.searchParams.get('entityType'); // job, candidate, etc.
        const entityId = url.searchParams.get('entityId');
        if (!entityType || !entityId) {
          return new Response(
            JSON.stringify({ error: 'entityType and entityId parameters are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderRequest(`/${entityType}s/${entityId}/attachments`);
        break;

      case 'attachment':
        const attEntityType = url.searchParams.get('entityType');
        const attEntityId = url.searchParams.get('entityId');
        const attachmentId = url.searchParams.get('attachmentId');
        if (!attEntityType || !attEntityId || !attachmentId) {
          return new Response(
            JSON.stringify({ error: 'entityType, entityId, and attachmentId parameters are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderRequest(`/${attEntityType}s/${attEntityId}/attachments/${attachmentId}`);
        break;

      // ===== NOTES API =====
      case 'notes':
        const noteEntityType = url.searchParams.get('entityType');
        const noteEntityId = url.searchParams.get('entityId');
        if (!noteEntityType || !noteEntityId) {
          return new Response(
            JSON.stringify({ error: 'entityType and entityId parameters are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderRequest(`/${noteEntityType}s/${noteEntityId}/notes`);
        break;

      case 'note-types':
        data = await makeJobAdderRequest('/notes/types');
        break;

      // ===== ACTIVITIES API =====
      case 'activities':
        const actEntityType = url.searchParams.get('entityType');
        const actEntityId = url.searchParams.get('entityId');
        if (!actEntityType || !actEntityId) {
          return new Response(
            JSON.stringify({ error: 'entityType and entityId parameters are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderRequest(`/${actEntityType}s/${actEntityId}/activities`);
        break;

      case 'activity':
        const aEntityType = url.searchParams.get('entityType');
        const aEntityId = url.searchParams.get('entityId');
        const activityId = url.searchParams.get('activityId');
        if (!aEntityType || !aEntityId || !activityId) {
          return new Response(
            JSON.stringify({ error: 'entityType, entityId, and activityId parameters are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderRequest(`/${aEntityType}s/${aEntityId}/activities/${activityId}`);
        break;

      // ===== INTERVIEWS API =====
      case 'interviews':
        const intEntityType = url.searchParams.get('entityType');
        const intEntityId = url.searchParams.get('entityId');
        if (!intEntityType || !intEntityId) {
          return new Response(
            JSON.stringify({ error: 'entityType and entityId parameters are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderRequest(`/${intEntityType}s/${intEntityId}/interviews`);
        break;

      case 'interview':
        const interviewId = url.searchParams.get('interviewId');
        if (!interviewId) {
          return new Response(
            JSON.stringify({ error: 'interviewId parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderRequest(`/interviews/${interviewId}`);
        break;

      // ===== USERS API =====
      case 'users':
        data = await makeJobAdderRequest('/users', params);
        break;
      
      case 'user':
        const userId = url.searchParams.get('userId');
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderRequest(`/users/${userId}`);
        break;

      // ===== FOLDERS API =====
      case 'folders':
        data = await makeJobAdderRequest('/folders', params);
        break;
      
      case 'folder':
        const folderId = url.searchParams.get('folderId');
        if (!folderId) {
          return new Response(
            JSON.stringify({ error: 'folderId parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderRequest(`/folders/${folderId}`);
        break;

      // ===== SEARCH API =====
      case 'search-email':
        const email = url.searchParams.get('email');
        if (!email) {
          return new Response(
            JSON.stringify({ error: 'email parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderRequest(`/search/email/${encodeURIComponent(email)}`);
        break;

      case 'search-phone':
        const phone = url.searchParams.get('phone');
        if (!phone) {
          return new Response(
            JSON.stringify({ error: 'phone parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderRequest(`/search/phone/${encodeURIComponent(phone)}`);
        break;

      // ===== REFERENCE DATA APIs =====
      case 'categories':
        data = await makeJobAdderRequest('/categories');
        break;

      case 'locations':
        data = await makeJobAdderRequest('/locations');
        break;

      case 'countries':
        data = await makeJobAdderRequest('/countries');
        break;

      case 'work-types':
        data = await makeJobAdderRequest('/worktypes');
        break;

      case 'job-sources':
        data = await makeJobAdderRequest('/jobs/sources');
        break;

      case 'job-statuses':
        data = await makeJobAdderRequest('/jobs/statuses');
        break;

      case 'candidate-sources':
        data = await makeJobAdderRequest('/candidates/sources');
        break;

      case 'candidate-statuses':
        data = await makeJobAdderRequest('/candidates/statuses');
        break;

      // ===== CREATE/UPDATE ENDPOINTS =====
      case 'create-job':
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: 'create-job requires POST method' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        // Use the already parsed request body if available
        const jobData = requestBody || await req.json();
        
        // Remove the endpoint field from the job data before sending to JobAdder
        const { endpoint: _, ...cleanJobData } = jobData;
        
        console.log('Creating job with data:', cleanJobData);
        data = await makeJobAdderPostRequest('/jobs', cleanJobData);
        break;

      case 'create-candidate':
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: 'create-candidate requires POST method' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const candidateData = await req.json();
        data = await makeJobAdderPostRequest('/candidates', candidateData);
        break;

      case 'create-placement':
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: 'create-placement requires POST method' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const placementData = await req.json();
        data = await makeJobAdderPostRequest('/placements', placementData);
        break;

      case 'create-company':
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: 'create-company requires POST method' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const companyData = await req.json();
        data = await makeJobAdderPostRequest('/companies', companyData);
        break;

      case 'create-contact':
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: 'create-contact requires POST method' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const contactData = await req.json();
        data = await makeJobAdderPostRequest('/contacts', contactData);
        break;

      case 'create-opportunity':
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: 'create-opportunity requires POST method' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const opportunityData = await req.json();
        data = await makeJobAdderPostRequest('/opportunities', opportunityData);
        break;

      case 'create-requisition':
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: 'create-requisition requires POST method' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const requisitionData = await req.json();
        data = await makeJobAdderPostRequest('/requisitions', requisitionData);
        break;

      case 'create-jobad':
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: 'create-jobad requires POST method' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const jobadData = await req.json();
        data = await makeJobAdderPostRequest('/jobads', jobadData);
        break;

      case 'add-note':
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: 'add-note requires POST method' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const noteData = await req.json();
        const nEntityType = url.searchParams.get('entityType');
        const nEntityId = url.searchParams.get('entityId');
        if (!nEntityType || !nEntityId) {
          return new Response(
            JSON.stringify({ error: 'entityType and entityId parameters are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderPostRequest(`/${nEntityType}s/${nEntityId}/notes`, noteData);
        break;

      case 'add-activity':
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: 'add-activity requires POST method' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const activityData = await req.json();
        const aentityType = url.searchParams.get('entityType');
        const aentityId = url.searchParams.get('entityId');
        if (!aentityType || !aentityId) {
          return new Response(
            JSON.stringify({ error: 'entityType and entityId parameters are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderPostRequest(`/${aentityType}s/${aentityId}/activities`, activityData);
        break;

      case 'add-attachment':
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: 'add-attachment requires POST method' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const attachmentData = await req.json();
        const attentityType = url.searchParams.get('entityType');
        const attentityId = url.searchParams.get('entityId');
        if (!attentityType || !attentityId) {
          return new Response(
            JSON.stringify({ error: 'entityType and entityId parameters are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderPostRequest(`/${attentityType}s/${attentityId}/attachments`, attachmentData);
        break;

      // ===== UPDATE ENDPOINTS =====
      case 'update-job':
        if (req.method !== 'PUT') {
          return new Response(
            JSON.stringify({ error: 'update-job requires PUT method' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const updateJobData = await req.json();
        const ujobId = url.searchParams.get('jobId');
        if (!ujobId) {
          return new Response(
            JSON.stringify({ error: 'jobId parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderPutRequest(`/jobs/${ujobId}`, updateJobData);
        break;

      case 'update-candidate':
        if (req.method !== 'PUT') {
          return new Response(
            JSON.stringify({ error: 'update-candidate requires PUT method' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const updateCandidateData = await req.json();
        const ucandidateId = url.searchParams.get('candidateId');
        if (!ucandidateId) {
          return new Response(
            JSON.stringify({ error: 'candidateId parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderPutRequest(`/candidates/${ucandidateId}`, updateCandidateData);
        break;

      case 'update-placement':
        if (req.method !== 'PUT') {
          return new Response(
            JSON.stringify({ error: 'update-placement requires PUT method' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const updatePlacementData = await req.json();
        const uplacementId = url.searchParams.get('placementId');
        if (!uplacementId) {
          return new Response(
            JSON.stringify({ error: 'placementId parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderPutRequest(`/placements/${uplacementId}`, updatePlacementData);
        break;

      case 'update-company':
        if (req.method !== 'PUT') {
          return new Response(
            JSON.stringify({ error: 'update-company requires PUT method' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const updateCompanyData = await req.json();
        const ucompanyId = url.searchParams.get('companyId');
        if (!ucompanyId) {
          return new Response(
            JSON.stringify({ error: 'companyId parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderPutRequest(`/companies/${ucompanyId}`, updateCompanyData);
        break;

      case 'update-contact':
        if (req.method !== 'PUT') {
          return new Response(
            JSON.stringify({ error: 'update-contact requires PUT method' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const updateContactData = await req.json();
        const ucontactId = url.searchParams.get('contactId');
        if (!ucontactId) {
          return new Response(
            JSON.stringify({ error: 'contactId parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderPutRequest(`/contacts/${ucontactId}`, updateContactData);
        break;

      // ===== DELETE ENDPOINTS =====
      case 'delete-job':
        if (req.method !== 'DELETE') {
          return new Response(
            JSON.stringify({ error: 'delete-job requires DELETE method' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const djobId = url.searchParams.get('jobId');
        if (!djobId) {
          return new Response(
            JSON.stringify({ error: 'jobId parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderDeleteRequest(`/jobs/${djobId}`);
        break;

      case 'delete-candidate':
        if (req.method !== 'DELETE') {
          return new Response(
            JSON.stringify({ error: 'delete-candidate requires DELETE method' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const dcandidateId = url.searchParams.get('candidateId');
        if (!dcandidateId) {
          return new Response(
            JSON.stringify({ error: 'candidateId parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderDeleteRequest(`/candidates/${dcandidateId}`);
        break;

      case 'delete-attachment':
        if (req.method !== 'DELETE') {
          return new Response(
            JSON.stringify({ error: 'delete-attachment requires DELETE method' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const dentityType = url.searchParams.get('entityType');
        const dentityId = url.searchParams.get('entityId');
        const dattachmentId = url.searchParams.get('attachmentId');
        if (!dentityType || !dentityId || !dattachmentId) {
          return new Response(
            JSON.stringify({ error: 'entityType, entityId, and attachmentId parameters are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderDeleteRequest(`/${dentityType}s/${dentityId}/attachments/${dattachmentId}`);
        break;
      
      default:
        return new Response(
          JSON.stringify({ error: `Unknown endpoint: ${endpoint}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('JobAdder API function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.stack 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});