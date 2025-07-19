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

    // Use the provided API key directly
    const apiKey = '9JAD4FtvL1Bk9CmBzucOdzfWLdQTAzNs'
    
    console.log('Using JazzHR API key:', apiKey.substring(0, 8) + '...')

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
        throw new Error(`Unknown action: ${action}`)
    }
  } catch (error) {
    console.error('Error in jazzhr-api function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    // First test if the API key is valid by making a simple request
    // According to JazzHR documentation, let's try /jobs endpoint without filters
    const url = 'https://www.resumatorapi.com/v1/jobs'
    console.log(`Testing connection with: ${url}`)
    console.log(`API Key (first 8 chars): ${apiKey.substring(0, 8)}...`)
    
    // Make a simple request to test API key validity
    const requestUrl = `${url}?apikey=${apiKey}`
    console.log(`Full request URL: ${requestUrl}`)
    
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    
    console.log(`Response status: ${response.status}`)
    console.log(`Response headers:`, Object.fromEntries(response.headers.entries()))
    
    const responseText = await response.text()
    console.log(`Response body: ${responseText}`)
    
    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `JazzHR API returned ${response.status}: ${response.statusText}`,
          details: responseText,
          apiKeyPreview: `${apiKey.substring(0, 8)}...`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error('Failed to parse response as JSON')
      data = { raw: responseText }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'JazzHR API connection successful!',
        statusCode: response.status,
        dataType: typeof data,
        dataLength: Array.isArray(data) ? data.length : Object.keys(data || {}).length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Connection test failed with error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Connection test failed',
        error: error.message,
        errorType: error.constructor.name
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleGetJobs(apiKey: string, params: any) {
  // According to JazzHR API docs, the correct endpoint is /jobs
  let url = 'https://www.resumatorapi.com/v1/jobs'
  
  // Add query parameters if provided
  const queryParams = new URLSearchParams()
  if (params?.title) queryParams.append('title', params.title)
  if (params?.department) queryParams.append('department', params.department)
  if (params?.status) queryParams.append('status', params.status)
  if (params?.city) queryParams.append('city', params.city)
  if (params?.state) queryParams.append('state', params.state)
  
  if (queryParams.toString()) {
    url += `?${queryParams.toString()}`
  }
  
  console.log(`Fetching jobs from: ${url}`)
  
  const data = await makeJazzHRRequest(url, apiKey, 'GET')
  
  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
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
  const baseUrl = 'https://www.resumatorapi.com/v1/applicants'
  let url = baseUrl
  
  // Add query parameters if provided
  const queryParams = new URLSearchParams()
  if (params?.name) queryParams.append('name', params.name)
  if (params?.job_id) queryParams.append('job_id', params.job_id)
  if (params?.city) queryParams.append('city', params.city)
  if (params?.status) queryParams.append('status', params.status)
  if (params?.rating) queryParams.append('rating', params.rating)
  if (params?.from_apply_date) queryParams.append('from_apply_date', params.from_apply_date)
  if (params?.to_apply_date) queryParams.append('to_apply_date', params.to_apply_date)
  
  if (queryParams.toString()) {
    url += `?${queryParams.toString()}`
  }
  
  const data = await makeJazzHRRequest(url, apiKey, 'GET')
  
  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
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