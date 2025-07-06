import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// JobAdder API configuration
const JOBADDER_API_URL = 'https://api.jobadder.com/v2';

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

    // Extract user access token
    const userAccessToken = getUserAccessToken(req, requestBody);
    if (!userAccessToken) {
      console.error('No access token provided');
      return new Response(
        JSON.stringify({ 
          error: 'Access token required. Please authenticate with JobAdder first.',
          authUrl: '/jobadder-auth' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing JobAdder API request: ${endpoint} (${req.method}) with user token`);

    let data;
    const params: Record<string, string> = { limit, offset };

    switch (endpoint) {
      case 'health':
        // Simple health check endpoint with token validation
        try {
          await makeJobAdderRequest('/users/current', userAccessToken);
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

      case 'current-user':
        data = await makeJobAdderRequest('/users/current', userAccessToken);
        break;

      case 'jobs':
        data = await makeJobAdderRequest('/jobs', userAccessToken, params);
        break;
      
      case 'candidates':
        data = await makeJobAdderRequest('/candidates', userAccessToken, params);
        break;
      
      case 'placements':
        data = await makeJobAdderRequest('/placements', userAccessToken, params);
        break;
      
      case 'jobboards':
        const jobboardId = url.searchParams.get('jobboardId') || url.searchParams.get('boardId') || requestBody?.boardId || '8734';
        console.log(`Fetching jobboard ${jobboardId} job ads`);
        data = await makeJobAdderRequest(`/jobboards/${jobboardId}/jobads`, userAccessToken, params);
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
        data = await makeJobAdderRequest(`/jobboards/${boardId}/jobads/${adId}`, userAccessToken);
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