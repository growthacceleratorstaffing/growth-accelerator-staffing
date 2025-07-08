import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// JobAdder OAuth2 and API Configuration
const JOBADDER_CLIENT_ID = Deno.env.get('JOBADDER_CLIENT_ID');
const JOBADDER_CLIENT_SECRET = Deno.env.get('JOBADDER_CLIENT_SECRET');
const JOBADDER_TOKEN_URL = 'https://id.jobadder.com/connect/token';
const JOBADDER_API_URL = 'https://api.jobadder.com/v2';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface StoredTokens {
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
  api_base_url: string;
  user_id: string;
}

// Get valid access token for user (refresh if needed)
async function getValidAccessToken(userId: string): Promise<string | null> {
  try {
    // Get current tokens from database
    const { data: tokenData, error } = await supabase
      .from('jobadder_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !tokenData) {
      console.log('No tokens found for user:', userId);
      return null;
    }

    // Check if token is expired or will expire in next 5 minutes
    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();
    const fiveMinutes = 5 * 60 * 1000;

    if (now.getTime() >= (expiresAt.getTime() - fiveMinutes)) {
      console.log('Access token expired or expiring soon, refreshing...');
      
      if (!tokenData.refresh_token) {
        console.error('No refresh token available');
        return null;
      }

      // Refresh the token
      const refreshResponse = await fetch(JOBADDER_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: JOBADDER_CLIENT_ID!,
          client_secret: JOBADDER_CLIENT_SECRET!,
          refresh_token: tokenData.refresh_token
        })
      });

      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text();
        console.error('Token refresh failed:', refreshResponse.status, errorText);
        
        // If refresh token is invalid, delete the stored tokens
        if (refreshResponse.status === 400) {
          await supabase
            .from('jobadder_tokens')
            .delete()
            .eq('user_id', userId);
        }
        return null;
      }

      const tokenResponse = await refreshResponse.json();
      
      // Update stored tokens
      const newExpiresAt = new Date(Date.now() + (tokenResponse.expires_in * 1000));
      
      const { error: updateError } = await supabase
        .from('jobadder_tokens')
        .update({
          access_token: tokenResponse.access_token,
          refresh_token: tokenResponse.refresh_token || tokenData.refresh_token,
          expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Failed to update tokens:', updateError);
        return null;
      }

      console.log('Access token refreshed successfully');
      return tokenResponse.access_token;
    }

    return tokenData.access_token;
  } catch (error) {
    console.error('Error getting valid access token:', error);
    return null;
  }
}

// Extract user access token from request headers or body
function getUserAccessToken(req: Request, requestBody?: any): string | null {
  // Check Authorization header first
  const authHeader = req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check request body for token
  if (requestBody?.accessToken) {
    return requestBody.accessToken;
  }
  
  return null;
}

async function makeJobAdderRequest(endpoint: string, accessToken: string, params?: Record<string, string>): Promise<any> {
  const url = new URL(`${JOBADDER_API_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });
  }

  console.log('Making JobAdder request to:', url.toString());

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('JobAdder API request failed:', response.status, errorText);
    
    // Handle specific auth errors
    if (response.status === 401) {
      throw new Error('JobAdder authentication failed. Please re-authenticate.');
    }
    if (response.status === 403) {
      throw new Error('Access forbidden. Check your JobAdder permissions.');
    }
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new Error(`Rate limited. Retry after ${retryAfter || '60'} seconds.`);
    }
    
    throw new Error(`JobAdder API request failed: ${response.status} ${errorText}`);
  }

  return await response.json();
}

async function makeJobAdderPostRequest(endpoint: string, accessToken: string, body: any): Promise<any> {
  const url = `${JOBADDER_API_URL}${endpoint}`;
  console.log('Making JobAdder POST request to:', url);

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
    console.error('JobAdder API POST request failed:', response.status, errorText);
    
    // Handle specific auth errors
    if (response.status === 401) {
      throw new Error('JobAdder authentication failed. Please re-authenticate.');
    }
    if (response.status === 403) {
      throw new Error('Access forbidden. Check your JobAdder permissions.');
    }
    
    throw new Error(`JobAdder API POST request failed: ${response.status} ${errorText}`);
  }

  return await response.json();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('JobAdder API function called:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  try {

    const url = new URL(req.url);
    let endpoint = url.searchParams.get('endpoint');
    const limit = url.searchParams.get('limit') || '50';
    const offset = url.searchParams.get('offset') || '0';

    // For POST requests, check if endpoint is in the request body
    let requestBody = null;
    if (req.method === 'POST') {
      try {
        requestBody = await req.json();
        if (requestBody.endpoint) {
          endpoint = requestBody.endpoint;
        }
      } catch (error) {
        console.error('Error parsing request body:', error);
        return new Response(
          JSON.stringify({ error: 'Invalid JSON in request body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!endpoint) {
      console.error('No endpoint specified');
      return new Response(
        JSON.stringify({ error: 'Endpoint parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user ID from request (assuming it's passed in headers or body)
    const userId = req.headers.get('x-user-id') || requestBody?.userId;
    
    // For some endpoints, we can proceed without authentication (using mock data)
    const publicEndpoints = ['find-jobboards', 'jobboard-jobads', 'get-jobboard', 'get-client-id'];
    const canProceedWithoutAuth = publicEndpoints.includes(endpoint);
    
    if (!userId && !canProceedWithoutAuth) {
      console.error('No user ID provided for authenticated endpoint');
      return new Response(
        JSON.stringify({ 
          error: 'User authentication required. Please sign in first.',
          authUrl: '/auth/login' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get valid access token from database for authenticated endpoints
    let accessToken = null;
    if (userId && !canProceedWithoutAuth) {
      accessToken = await getValidAccessToken(userId);
      
      if (!accessToken) {
        return new Response(
          JSON.stringify({ 
            error: 'JobAdder authentication required. Please connect your JobAdder account first.',
            authUrl: '/auth/login' 
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`Processing JobAdder API request: ${endpoint} (${req.method}) ${accessToken ? 'with user token' : 'without token'}`);

    let data;
    const params: Record<string, string> = { limit, offset };

    switch (endpoint) {
      case 'get-client-id':
        // Return the client ID for OAuth URL generation
        return new Response(JSON.stringify({ 
          clientId: JOBADDER_CLIENT_ID 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'health':
        // Simple health check endpoint with token validation
        try {
          await makeJobAdderRequest('/users/current', accessToken);
          return new Response(JSON.stringify({ 
            status: 'ok', 
            timestamp: new Date().toISOString(),
            authenticated: true
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (error) {
          return new Response(JSON.stringify({ 
            status: 'error',
            authenticated: false,
            error: error.message
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

      case 'oauth-exchange':
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: 'oauth-exchange requires POST method' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const { code, userId: exchangeUserId } = requestBody;
        if (!code || !exchangeUserId) {
          return new Response(
            JSON.stringify({ error: 'code and userId are required for oauth-exchange' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log('Exchanging OAuth code for tokens for user:', exchangeUserId);
        
        // Exchange authorization code for tokens
        const tokenResponse = await fetch(JOBADDER_TOKEN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: `${req.headers.get('origin') || 'http://localhost:8080'}/auth/callback`,
            client_id: JOBADDER_CLIENT_ID!,
            client_secret: JOBADDER_CLIENT_SECRET!
          })
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error('Token exchange failed:', tokenResponse.status, errorText);
          throw new Error(`Token exchange failed: ${tokenResponse.status} ${errorText}`);
        }

        const tokens = await tokenResponse.json();
        const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

        // Store tokens in database
        const { error: storeError } = await supabase
          .from('jobadder_tokens')
          .upsert({
            user_id: exchangeUserId,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_type: tokens.token_type || 'Bearer',
            expires_at: expiresAt.toISOString(),
            api_base_url: tokens.api || JOBADDER_API_URL,
            scopes: tokens.scope ? tokens.scope.split(' ') : ['read', 'write', 'offline_access'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (storeError) {
          console.error('Failed to store tokens:', storeError);
          throw new Error('Failed to store authentication tokens');
        }

        console.log('Tokens stored successfully for user:', exchangeUserId);
        data = {
          success: true,
          message: 'JobAdder authentication successful',
          account: tokens.account,
          instance: tokens.instance
        };
        break;

      case 'current-user':
        data = await makeJobAdderRequest('/users/current', accessToken);
        break;

      case 'jobs':
        data = await makeJobAdderRequest('/jobs', accessToken, params);
        break;
      
      case 'candidates':
        data = await makeJobAdderRequest('/candidates', accessToken, params);
        break;

      case 'applications':
        data = await makeJobAdderRequest('/jobapplications', accessToken, params);
        break;
      
      case 'job-applications':
        const jobId = requestBody?.jobId || url.searchParams.get('jobId');
        if (!jobId) {
          return new Response(
            JSON.stringify({ error: 'jobId parameter is required for job-applications endpoint' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderRequest(`/jobs/${jobId}/applications`, accessToken, params);
        break;

      case 'job-applications-active':
        const activeJobId = requestBody?.jobId || url.searchParams.get('jobId');
        if (!activeJobId) {
          return new Response(
            JSON.stringify({ error: 'jobId parameter is required for job-applications-active endpoint' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderRequest(`/jobs/${activeJobId}/applications/active`, accessToken, params);
        break;
      
      case 'placements':
        data = await makeJobAdderRequest('/placements', accessToken, params);
        break;
      
      case 'jobboards':
        const jobboardId = url.searchParams.get('jobboardId') || url.searchParams.get('boardId') || requestBody?.boardId || '8734';
        console.log(`Fetching jobboard ${jobboardId} job ads`);
        data = await makeJobAdderRequest(`/jobboards/${jobboardId}/ads`, accessToken, params);
        break;

      case 'find-jobboards':
        // Get list of all job boards - return mock data if no token
        console.log('Fetching available job boards');
        if (accessToken) {
          data = await makeJobAdderRequest('/jobboards', accessToken);
        } else {
          // Return mock job board data
          data = {
            items: [
              {
                boardId: 8734,
                name: "Startup Accelerator Website API",
                reference: "startup-accelerator-api"
              }
            ]
          };
        }
        break;

      case 'get-jobboard':
        const boardIdToGet = url.searchParams.get('boardId') || requestBody?.boardId || '8734';
        console.log(`Fetching job board details for ${boardIdToGet}`);
        data = await makeJobAdderRequest(`/jobboards/${boardIdToGet}`, accessToken);
        break;

      case 'jobboard-jobads':
        const boardIdForAds = url.searchParams.get('boardId') || requestBody?.boardId || '8734';
        console.log(`Fetching job ads from board ${boardIdForAds}`);
        
        if (accessToken) {
          // Build query parameters for job ads
          const jobAdParams: Record<string, string> = { ...params };
          
          // Add job board specific filters
          const adIds = url.searchParams.getAll('AdId') || requestBody?.adIds || [];
          const references = url.searchParams.getAll('Reference') || requestBody?.references || [];
          const hotJob = url.searchParams.get('Portal.HotJob') || requestBody?.hotJob;
          const fields = url.searchParams.getAll('Fields') || requestBody?.fields || [];
          
          if (adIds.length > 0) {
            adIds.forEach(id => jobAdParams['AdId'] = id);
          }
          if (references.length > 0) {
            references.forEach(ref => jobAdParams['Reference'] = ref);
          }
          if (hotJob) {
            jobAdParams['Portal.HotJob'] = hotJob;
          }
          if (fields.length > 0) {
            fields.forEach(field => jobAdParams['Fields'] = field);
          }
          
          data = await makeJobAdderRequest(`/jobboards/${boardIdForAds}/ads`, accessToken, jobAdParams);
        } else {
          // Return mock job ad data
          const mockJobs = Array.from({ length: 85 }, (_, i) => ({
            adId: 1000 + i,
            title: `Software Engineer ${i + 1}`,
            reference: `REF-${1000 + i}`,
            summary: `Exciting opportunity for a software engineer to join our growing team. Position ${i + 1} of 85 available roles.`,
            bulletPoints: ["React", "TypeScript", "Node.js", "AWS"],
            portal: {
              hotJob: i < 5,
              salary: {
                rateLow: 80000 + (i * 1000),
                rateHigh: 120000 + (i * 1000),
                ratePer: "Year"
              }
            },
            postedAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(),
            expiresAt: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString()
          }));
          
          data = { items: mockJobs };
        }
        break;

      case 'jobboard-ad':
        const adId = url.searchParams.get('adId') || requestBody?.adId;
        const boardId = url.searchParams.get('boardId') || requestBody?.boardId || '8734';
        if (!adId) {
          return new Response(
            JSON.stringify({ error: 'adId parameter is required for jobboard-ad endpoint' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        data = await makeJobAdderRequest(`/jobboards/${boardId}/ads/${adId}`, accessToken);
        break;

      case 'submit-job-application':
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: 'submit-job-application requires POST method' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const submitAdId = requestBody?.adId;
        const submitBoardId = requestBody?.boardId || '8734';
        const applicationData = requestBody?.application;
        
        if (!submitAdId || !applicationData) {
          return new Response(
            JSON.stringify({ error: 'adId and application data are required for submit-job-application endpoint' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log(`Submitting job application to board ${submitBoardId}, ad ${submitAdId}`);
        data = await makeJobAdderPostRequest(`/jobboards/${submitBoardId}/ads/${submitAdId}/applications`, accessToken, applicationData);
        break;

      case 'import-candidate':
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: 'import-candidate requires POST method' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const candidateToImport = requestBody?.candidate;
        if (!candidateToImport) {
          return new Response(
            JSON.stringify({ error: 'candidate data is required for import-candidate endpoint' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log('Importing JobAdder candidate:', candidateToImport.candidateId);
        
        // Transform JobAdder candidate to local database format
        const localCandidateData = {
          name: `${candidateToImport.firstName || ''} ${candidateToImport.lastName || ''}`.trim(),
          email: candidateToImport.email || candidateToImport.emailAddress || '',
          phone: candidateToImport.phone || candidateToImport.mobile || candidateToImport.phoneNumber || null,
          current_position: candidateToImport.currentPosition || candidateToImport.jobTitle || null,
          company: candidateToImport.company || candidateToImport.currentCompany || null,
          location: candidateToImport.address ? 
            `${candidateToImport.address.city || ''}, ${candidateToImport.address.state || ''}`.replace(/^,\s*|,\s*$/, '') || null :
            candidateToImport.location || null,
          linkedin_profile_url: candidateToImport.linkedinUrl || candidateToImport.linkedInProfile || null,
          profile_picture_url: candidateToImport.photoUrl || candidateToImport.profilePictureUrl || null,
          skills: candidateToImport.skills || candidateToImport.skillSet || [],
          education: candidateToImport.education || candidateToImport.educationHistory || [],
          experience_years: candidateToImport.experience || candidateToImport.yearsOfExperience || null,
          source_platform: 'JobAdder',
          profile_completeness_score: candidateToImport.profileCompleteness || 0,
          workable_candidate_id: candidateToImport.candidateId?.toString() || null,
          last_synced_at: new Date().toISOString()
        };
        
        // Insert candidate into Supabase database
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const { data: insertedCandidate, error: insertError } = await supabase
          .from('candidates')
          .insert([localCandidateData])
          .select()
          .single();
        
        if (insertError) {
          console.error('Error inserting candidate:', insertError);
          throw new Error(`Failed to import candidate: ${insertError.message}`);
        }
        
        console.log('Candidate imported successfully:', insertedCandidate.id);
        data = { 
          success: true, 
          candidateId: insertedCandidate.id, 
          message: 'Candidate imported successfully',
          importedCandidate: insertedCandidate
        };
        break;

      case 'import-job':
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: 'import-job requires POST method' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const jobToImport = requestBody?.job;
        if (!jobToImport) {
          return new Response(
            JSON.stringify({ error: 'job data is required for import-job endpoint' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log('Importing JobAdder job:', jobToImport.adId);
        
        // Transform JobAdder job to local database format
        const localJobData = {
          title: jobToImport.title,
          job_description: jobToImport.summary || jobToImport.description || '',
          company_id: jobToImport.company?.companyId?.toString() || null,
          company_name: jobToImport.company?.name || 'Unknown Company',
          location_id: jobToImport.location?.locationId?.toString() || null,
          location_name: jobToImport.location?.name || 'Unknown Location',
          area_id: jobToImport.location?.area?.areaId?.toString() || null,
          work_type_id: jobToImport.workType?.workTypeId?.toString() || '1',
          work_type_name: jobToImport.workType?.name || 'Full-time',
          category_id: jobToImport.category?.categoryId?.toString() || null,
          category_name: jobToImport.category?.name || null,
          sub_category_id: jobToImport.category?.subCategory?.subCategoryId?.toString() || null,
          salary_rate_low: jobToImport.salary?.rateLow || jobToImport.portal?.salary?.rateLow || null,
          salary_rate_high: jobToImport.salary?.rateHigh || jobToImport.portal?.salary?.rateHigh || null,
          salary_rate_per: jobToImport.salary?.ratePer || jobToImport.portal?.salary?.ratePer || 'Year',
          salary_currency: jobToImport.salary?.currency || 'USD',
          skill_tags: jobToImport.bulletPoints || [],
          source: 'JobAdder',
          jobadder_job_id: jobToImport.adId.toString(),
          synced_to_jobadder: true
        };
        
        // Insert job into Supabase database
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const { data: insertedJob, error: insertError } = await supabase
          .from('jobs')
          .insert([localJobData])
          .select()
          .single();
        
        if (insertError) {
          console.error('Error inserting job:', insertError);
          throw new Error(`Failed to import job: ${insertError.message}`);
        }
        
        console.log('Job imported successfully:', insertedJob.id);
        data = { 
          success: true, 
          jobId: insertedJob.id, 
          message: 'Job imported successfully',
          importedJob: insertedJob
        };
        break;

      case 'create-job':
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: 'create-job requires POST method' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log('Creating job with data:', requestBody);
        
        // Map form data to JobAdder API format
        const jobPayload = {
          title: requestBody.jobTitle,
          companyId: requestBody.companyId,
          contactId: requestBody.contactId || null,
          description: requestBody.jobDescription,
          location: {
            locationId: requestBody.location?.locationId || requestBody.locationId,
            areaId: requestBody.location?.areaId || requestBody.areaId || null
          },
          workTypeId: requestBody.workTypeId,
          category: requestBody.categoryId ? {
            categoryId: requestBody.categoryId,
            subCategoryId: requestBody.subCategoryId || null
          } : null,
          salary: requestBody.salary ? {
            ratePer: requestBody.salary.ratePer || 'Year',
            rateLow: requestBody.salary.rateLow,
            rateHigh: requestBody.salary.rateHigh,
            currency: requestBody.salary.currency || 'USD'
          } : null,
          skillTags: requestBody.skillTags?.tags || (typeof requestBody.skillTags === 'string' ? requestBody.skillTags.split(',').map(t => t.trim()) : []),
          source: requestBody.source || 'Website',
          numberOfJobs: requestBody.numberOfJobs || 1
        };
        
        console.log('Mapped job payload:', jobPayload);
        data = await makeJobAdderPostRequest('/jobs', userAccessToken, jobPayload);
        break;
      
      default:
        return new Response(
          JSON.stringify({ error: `Unknown endpoint: ${endpoint}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log('JobAdder API request successful');
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('JobAdder API function error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString(),
        service: 'JobAdder API Proxy'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});