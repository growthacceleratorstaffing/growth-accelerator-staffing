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
        scope: 'read write'
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint');
    const limit = url.searchParams.get('limit') || '50';
    const offset = url.searchParams.get('offset') || '0';
    const search = url.searchParams.get('search');

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'Endpoint parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`JobAdder API request: ${endpoint}`);

    let data;
    const params: Record<string, string> = { limit, offset };
    if (search) params.search = search;

    switch (endpoint) {
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
        const jobboardId = url.searchParams.get('jobboardId') || '8734';
        data = await makeJobAdderRequest(`/jobboards/${jobboardId}/jobads`, params);
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