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