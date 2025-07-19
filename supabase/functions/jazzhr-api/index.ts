import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, params } = await req.json()
    console.log('JazzHR API request:', { action, params })

    // Get API key from Supabase secrets
    const apiKey = Deno.env.get('JAZZHR_API_KEY')
    
    if (!apiKey) {
      console.error('JAZZHR_API_KEY not found in environment variables')
      console.log('Available environment variables:', Object.keys(Deno.env.toObject()))
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'JAZZHR_API_KEY not configured in Supabase secrets',
          error: 'Missing API key configuration'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('Using JazzHR API key from Supabase secrets:', apiKey.substring(0, 8) + '...')

    const baseUrl = 'https://www.resumatorapi.com/v1'
    
    switch (action) {
      case 'testConnection':
        return await handleTestConnection(apiKey)
      case 'getJobs':
        return await handleGetJobs(apiKey, params)
      case 'getJob':
        return await handleGetJob(apiKey, params)
      case 'createJob':
        return await handleCreateJob(apiKey, params)
      case 'getApplicants':
        return await handleGetApplicants(apiKey, params)
      case 'getApplicant':
        return await handleGetApplicant(apiKey, params)
      case 'createApplicant':
        return await handleCreateApplicant(apiKey, params)
      case 'getUsers':
        return await handleGetUsers(apiKey, params)
      case 'getActivities':
        return await handleGetActivities(apiKey, params)
      case 'createNote':
        return await handleCreateNote(apiKey, params)
      default:
        console.error('Unknown action received:', action)
        return new Response(
          JSON.stringify({ 
            success: false,
            message: `Unknown action: ${action}`,
            error: 'Invalid action parameter'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Error in jazzhr-api function:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        message: 'Internal server error',
        error: error.message 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function makeJazzHRRequest(url: string, apiKey: string, method = 'GET', body?: any) {
  // JazzHR API expects the API key as a query parameter
  const separator = url.includes('?') ? '&' : '?'
  const requestUrl = `${url}${separator}apikey=${apiKey}`
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  }
  
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body)
  }
  
  console.log(`Making JazzHR API call: ${method} ${requestUrl}`)
  
  const response = await fetch(requestUrl, options)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error(`JazzHR API error: ${response.status} - ${errorText}`)
    throw new Error(`JazzHR API error: ${response.status} - ${errorText}`)
  }
  
  const responseText = await response.text()
  console.log(`JazzHR API response: ${responseText}`)
  
  try {
    return JSON.parse(responseText)
  } catch (e) {
    console.error('Failed to parse JSON response:', responseText)
    throw new Error('Invalid JSON response from JazzHR API')
  }
}

async function handleTestConnection(apiKey: string) {
  try {
    console.log(`Testing JazzHR API with key: ${apiKey.substring(0, 8)}...`);
    
    // Try different potential API endpoints and URL structures
    const testEndpoints = [
      // Original endpoint structure
      `https://www.resumatorapi.com/v1/jobs?apikey=${apiKey}`,
      // Alternative endpoint structures that might work
      `https://app.jazz.co/api/jobs?apikey=${apiKey}`,
      `https://api.jazz.co/v1/jobs?apikey=${apiKey}`,
      `https://www.resumatorapi.com/v1/users?apikey=${apiKey}`,
      // Test with different parameter names
      `https://www.resumatorapi.com/v1/jobs?api_key=${apiKey}`,
      `https://www.resumatorapi.com/v1/jobs?key=${apiKey}`,
    ];
    
    for (const requestUrl of testEndpoints) {
      try {
        const cleanUrl = requestUrl.replace(apiKey, 'API_KEY_HIDDEN');
        console.log(`Testing endpoint: ${cleanUrl}`);
        
        const response = await fetch(requestUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Lovable-JazzHR-Integration/1.0',
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`Response status for ${cleanUrl}: ${response.status}`);
        
        const responseText = await response.text();
        console.log(`Response body (first 300 chars): ${responseText.substring(0, 300)}`);
        
        if (response.ok) {
          let data;
          try {
            data = JSON.parse(responseText);
          } catch (e) {
            data = { raw: responseText };
          }
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: `JazzHR API connection successful! Working endpoint found.`,
              endpoint: requestUrl.replace(apiKey, 'API_KEY_HIDDEN'),
              statusCode: response.status,
              dataType: typeof data,
              jobCount: Array.isArray(data) ? data.length : (data ? Object.keys(data).length : 0)
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Log specific error types but continue testing other endpoints
        if (response.status === 401) {
          console.log(`401 Unauthorized for ${cleanUrl} - API key might be invalid`);
        } else if (response.status === 403) {
          console.log(`403 Forbidden for ${cleanUrl} - Account might not have API access`);
        } else if (response.status === 404) {
          console.log(`404 Not Found for ${cleanUrl} - Endpoint doesn't exist`);
        }
        
      } catch (endpointError) {
        console.error(`Error testing endpoint:`, endpointError.message);
        continue;
      }
    }
    
    // If all endpoints failed, provide comprehensive error info
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Unable to connect to JazzHR API with any known endpoint',
        details: 'All tested endpoints returned errors. This could indicate:\n1. Invalid API key\n2. Account does not have API access enabled\n3. JazzHR API structure has changed\n4. Network connectivity issues',
        suggestions: [
          'Verify your API key is correct at: https://app.jazz.co/app/settings/integrations',
          'Ensure your JazzHR subscription includes API access',
          'Contact JazzHR support if the issue persists',
          'Check if your account has the necessary permissions'
        ],
        apiKeyPreview: `${apiKey.substring(0, 8)}...`,
        testedEndpoints: testEndpoints.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Connection test failed with error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Connection test failed with network error',
        error: error.message,
        errorType: error.constructor.name,
        suggestion: 'Check network connectivity and try again'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleGetJobs(apiKey: string, params: any) {
  try {
    console.log('handleGetJobs called with params:', params);
    
    // According to JazzHR docs, the correct endpoint is /jobs
    let url = 'https://www.resumatorapi.com/v1/jobs';
    
    // Add query parameters if provided
    const queryParams = new URLSearchParams();
    queryParams.append('apikey', apiKey);
    
    if (params?.title) queryParams.append('title', params.title);
    if (params?.department) queryParams.append('department', params.department);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.city) queryParams.append('city', params.city);
    if (params?.state) queryParams.append('state', params.state);
    
    const requestUrl = `${url}?${queryParams.toString()}`;
    console.log(`Fetching jobs from: ${requestUrl.replace(apiKey, 'API_KEY_HIDDEN')}`);
    
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Lovable-JazzHR-Integration/1.0'
      }
    });
    
    console.log(`Jobs API response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Jobs API error: ${response.status} - ${errorText}`);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          message: `Failed to fetch jobs: ${response.status} ${response.statusText}`,
          error: errorText
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const responseText = await response.text();
    console.log(`Jobs API response (first 300 chars): ${responseText.substring(0, 300)}`);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse jobs response as JSON');
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Invalid JSON response from JazzHR jobs API',
          error: 'Parse error'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Successfully fetched ${Array.isArray(data) ? data.length : 1} jobs`);
    
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('handleGetJobs error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        message: 'Failed to fetch jobs',
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleGetJob(apiKey: string, params: any) {
  if (!params?.job_id) {
    throw new Error('job_id is required')
  }
  
  const url = `https://www.resumatorapi.com/v1/jobs/${params.job_id}`
  const data = await makeJazzHRRequest(url, apiKey)
  
  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleCreateJob(apiKey: string, params: any) {
  if (!params?.title || !params?.hiring_lead_id || !params?.description || !params?.workflow_id) {
    throw new Error('title, hiring_lead_id, description, and workflow_id are required')
  }
  
  const url = 'https://www.resumatorapi.com/v1/jobs'
  const data = await makeJazzHRRequest(url, apiKey, 'POST', params)
  
  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleGetApplicants(apiKey: string, params: any) {
  try {
    console.log('handleGetApplicants called with params:', params);
    
    const baseUrl = 'https://www.resumatorapi.com/v1/applicants';
    
    // Add query parameters if provided
    const queryParams = new URLSearchParams();
    queryParams.append('apikey', apiKey);
    
    if (params?.name) queryParams.append('name', params.name);
    if (params?.job_id) queryParams.append('job_id', params.job_id);
    if (params?.city) queryParams.append('city', params.city);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.rating) queryParams.append('rating', params.rating);
    if (params?.from_apply_date) queryParams.append('from_apply_date', params.from_apply_date);
    if (params?.to_apply_date) queryParams.append('to_apply_date', params.to_apply_date);
    
    const requestUrl = `${baseUrl}?${queryParams.toString()}`;
    console.log(`Fetching applicants from: ${requestUrl.replace(apiKey, 'API_KEY_HIDDEN')}`);
    
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Lovable-JazzHR-Integration/1.0'
      }
    });
    
    console.log(`Applicants API response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Applicants API error: ${response.status} - ${errorText}`);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          message: `Failed to fetch applicants: ${response.status} ${response.statusText}`,
          error: errorText
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const responseText = await response.text();
    console.log(`Applicants API response (first 300 chars): ${responseText.substring(0, 300)}`);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse applicants response as JSON');
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Invalid JSON response from JazzHR applicants API',
          error: 'Parse error'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Successfully fetched ${Array.isArray(data) ? data.length : 1} applicants`);
    
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('handleGetApplicants error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        message: 'Failed to fetch applicants',
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleGetApplicant(apiKey: string, params: any) {
  if (!params?.applicant_id) {
    throw new Error('applicant_id is required')
  }
  
  const url = `https://www.resumatorapi.com/v1/applicants/${params.applicant_id}`
  const data = await makeJazzHRRequest(url, apiKey)
  
  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleCreateApplicant(apiKey: string, params: any) {
  if (!params?.first_name || !params?.last_name || !params?.email) {
    throw new Error('first_name, last_name, and email are required')
  }
  
  const url = 'https://www.resumatorapi.com/v1/applicants'
  const data = await makeJazzHRRequest(url, apiKey, 'POST', params)
  
  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleGetUsers(apiKey: string, params: any) {
  const url = 'https://www.resumatorapi.com/v1/users'
  const data = await makeJazzHRRequest(url, apiKey)
  
  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleGetActivities(apiKey: string, params: any) {
  const baseUrl = 'https://www.resumatorapi.com/v1/activities'
  let url = baseUrl
  
  // Add query parameters if provided
  const queryParams = new URLSearchParams()
  if (params?.user_id) queryParams.append('user_id', params.user_id)
  if (params?.object_id) queryParams.append('object_id', params.object_id)
  if (params?.category) queryParams.append('category', params.category)
  
  if (queryParams.toString()) {
    url += `?${queryParams.toString()}`
  }
  
  const data = await makeJazzHRRequest(url, apiKey, 'GET')
  
  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleCreateNote(apiKey: string, params: any) {
  if (!params?.applicant_id || !params?.contents) {
    throw new Error('applicant_id and contents are required')
  }
  
  const url = 'https://www.resumatorapi.com/v1/notes'
  const data = await makeJazzHRRequest(url, apiKey, 'POST', params)
  
  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}