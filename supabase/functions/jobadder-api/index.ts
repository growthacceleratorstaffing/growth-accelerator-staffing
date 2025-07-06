import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// JobAdder API credentials from Supabase secrets
const JOBADDER_CLIENT_ID = Deno.env.get('JOBADDER_CLIENT_ID');
const JOBADDER_CLIENT_SECRET = Deno.env.get('JOBADDER_CLIENT_SECRET');
const JOBADDER_API_URL = 'https://api.jobadder.com/v2';

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
    console.log('Using cached JobAdder token');
    return cachedToken;
  }

  if (!JOBADDER_CLIENT_ID || !JOBADDER_CLIENT_SECRET) {
    console.error('JobAdder credentials missing');
    throw new Error('JobAdder API credentials not configured');
  }

  console.log('Requesting new JobAdder access token...');

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
      console.error('Token request failed:', response.status, errorText);
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
    throw new Error(`JobAdder API request failed: ${response.status} ${errorText}`);
  }

  return await response.json();
}

async function makeJobAdderPostRequest(endpoint: string, body: any): Promise<any> {
  const accessToken = await getAccessToken();
  
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
    // Log environment variables status (without exposing values)
    console.log('Environment check:', {
      hasClientId: !!JOBADDER_CLIENT_ID,
      hasClientSecret: !!JOBADDER_CLIENT_SECRET,
      apiUrl: JOBADDER_API_URL
    });

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

    console.log(`Processing JobAdder API request: ${endpoint} (${req.method})`);

    let data;
    const params: Record<string, string> = { limit, offset };

    switch (endpoint) {
      case 'health':
        // Simple health check endpoint
        return new Response(JSON.stringify({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          credentials: {
            hasClientId: !!JOBADDER_CLIENT_ID,
            hasClientSecret: !!JOBADDER_CLIENT_SECRET,
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

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
        console.log(`Fetching jobboard ${jobboardId} ads`);
        data = await makeJobAdderRequest(`/jobboards/${jobboardId}/ads`, params);
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
        data = await makeJobAdderPostRequest('/jobs', jobPayload);
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