import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id',
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token: string;
  api: string;
  instance?: string;
  account?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, endpoint, ...params } = await req.json()
    const requestAction = endpoint || action
    const userId = req.headers.get('x-user-id')

    console.log('JobAdder API request:', { 
      action: requestAction, 
      userId: userId ? 'present' : 'missing',
      params,
      headers: Object.fromEntries(req.headers.entries())
    })

    

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get JobAdder credentials from secrets based on environment
    const environment = params.environment || 'production' // Default to production for safety
    console.log('=== ENVIRONMENT DETECTION ===')
    console.log('Requested environment:', environment)
    console.log('Origin header:', req.headers.get('origin'))
    
    let clientId: string | undefined
    let clientSecret: string | undefined
    
    if (environment === 'development') {
      // Development environment (localhost, previews, etc.)
      clientId = Deno.env.get('JOBADDER_DEV_CLIENT_ID') || Deno.env.get('JOBADDER_CLIENT_ID')
      clientSecret = Deno.env.get('JOBADDER_DEV_CLIENT_SECRET') || Deno.env.get('JOBADDER_CLIENT_SECRET')
      console.log('Using development credentials')
    } else {
      // Production environment
      clientId = Deno.env.get('JOBADDER_CLIENT_ID')
      clientSecret = Deno.env.get('JOBADDER_CLIENT_SECRET')
      console.log('Using production credentials')
    }

    console.log('=== JOBADDER CREDENTIALS DEBUG ===')
    console.log('Environment:', environment)
    console.log('Client ID available:', !!clientId)
    console.log('Client Secret available:', !!clientSecret)
    console.log('Client ID (first 10 chars):', clientId ? clientId.substring(0, 10) + '...' : 'MISSING')
    console.log('=== END CREDENTIALS DEBUG ===')

    if (!clientId || !clientSecret) {
      console.error(`JobAdder credentials not configured for ${environment} environment`)
      throw new Error(`JobAdder credentials not configured for ${environment} environment`)
    }

    switch (requestAction) {
      case 'get-client-id': {
        // Return the client ID for frontend OAuth URL generation
        console.log('=== GET CLIENT ID REQUEST ===')
        console.log('User ID:', userId)
        console.log('Client ID available:', !!clientId)
        console.log('Client ID value:', clientId ? clientId.substring(0, 10) + '...' : 'MISSING')
        
        if (!clientId) {
          console.error('JobAdder Client ID not configured in secrets')
          throw new Error('JobAdder Client ID not configured')
        }
        
        return new Response(JSON.stringify({
          success: true,
          client_id: clientId
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'exchange-token': {
        // Step 3: Exchange authorization code for access tokens
        const { code, redirect_uri, grant_type } = params
        
        console.log('=== JobAdder OAuth Step 3: Token Exchange ===')
        console.log('Grant type:', grant_type)
        console.log('Redirect URI received:', redirect_uri)
        console.log('Code received (first 10 chars):', code?.substring(0, 10))
        console.log('User ID:', userId)
        console.log('Client ID available:', !!clientId)
        console.log('Client Secret available:', !!clientSecret)
        console.log('Request origin:', req.headers.get('origin'))
        console.log('Request hostname from origin:', req.headers.get('origin')?.replace(/https?:\/\//, ''))
        
        if (!code || !userId || !redirect_uri) {
          console.error('❌ Missing required parameters:', { 
            hasCode: !!code, 
            hasUserId: !!userId, 
            hasRedirectUri: !!redirect_uri 
          })
          throw new Error('Missing required parameters: code, userId, or redirect_uri')
        }

        if (!clientId || !clientSecret) {
          console.error('❌ Missing JobAdder credentials')
          throw new Error('JobAdder client credentials not configured')
        }

        // Prepare token exchange request exactly per JobAdder spec
        const tokenRequestBody = {
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirect_uri,
          client_id: clientId,
          client_secret: clientSecret
        }

        console.log('=== JOBADDER TOKEN EXCHANGE DEBUG ===')
        console.log('Token exchange request body:', {
          grant_type: tokenRequestBody.grant_type,
          client_id: tokenRequestBody.client_id,
          redirect_uri: tokenRequestBody.redirect_uri,
          code: tokenRequestBody.code.substring(0, 10) + '...',
          full_redirect_uri: tokenRequestBody.redirect_uri
        })
        console.log('Expected JobAdder app redirect URI:', redirect_uri)
        console.log('=== END DEBUG ===')

        // Call JobAdder token endpoint
        const tokenResponse = await fetch('https://id.jobadder.com/connect/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: new URLSearchParams(tokenRequestBody)
        })

        console.log('JobAdder token response status:', tokenResponse.status)
        console.log('JobAdder token response headers:', Object.fromEntries(tokenResponse.headers.entries()))

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text()
          let errorDetails;
          try {
            errorDetails = JSON.parse(errorText);
          } catch {
            errorDetails = { raw_error: errorText };
          }
          
          console.error('JobAdder token exchange failed:', {
            status: tokenResponse.status,
            statusText: tokenResponse.statusText,
            headers: Object.fromEntries(tokenResponse.headers.entries()),
            errorDetails,
            requestBody: {
              grant_type: tokenRequestBody.grant_type,
              client_id: tokenRequestBody.client_id,
              redirect_uri: tokenRequestBody.redirect_uri,
              code: tokenRequestBody.code.substring(0, 10) + '...'
            }
          })
          
          // Return detailed error response with specific JobAdder error
          let userFriendlyError = `JobAdder token exchange failed: ${tokenResponse.status}`;
          if (errorDetails.error) {
            userFriendlyError += ` - ${errorDetails.error}`;
            if (errorDetails.error_description) {
              userFriendlyError += `: ${errorDetails.error_description}`;
            }
          }
          
          // Add specific guidance for common errors
          if (errorDetails.error === 'invalid_grant' || tokenResponse.status === 400) {
            userFriendlyError += '\n\nThis usually means:\n1. The redirect URI in JobAdder app config doesn\'t match: ' + tokenRequestBody.redirect_uri + '\n2. The authorization code has expired or been used already\n3. Client ID/Secret mismatch';
          }
          
          return new Response(JSON.stringify({
            success: false,
            error: userFriendlyError,
            details: {
              status: tokenResponse.status,
              statusText: tokenResponse.statusText,
              jobadder_error: errorDetails,
              expected_redirect_uri: tokenRequestBody.redirect_uri
            }
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const tokens: TokenResponse = await tokenResponse.json()
        console.log('Token exchange successful, received tokens')

        // Store tokens in database
        const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString()
        
        const { error: dbError } = await supabase
          .from('jobadder_tokens')
          .upsert({
            user_id: userId,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_type: tokens.token_type,
            expires_at: expiresAt,
            api_base_url: tokens.api,
            scopes: ['read', 'write', 'offline_access']
          })

        if (dbError) {
          console.error('Error storing tokens in database:', dbError)
          throw new Error('Failed to store authentication tokens')
        }

        console.log('Step 3 completed successfully - tokens stored')

        return new Response(JSON.stringify({
          success: true,
          access_token: tokens.access_token,
          expires_in: tokens.expires_in,
          token_type: tokens.token_type,
          refresh_token: tokens.refresh_token,
          api: tokens.api,
          instance: tokens.instance,
          account: tokens.account
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'refresh-token': {
        // Step 4: Refresh access token using refresh token
        if (!userId) {
          throw new Error('User ID required for token refresh')
        }

        console.log('Step 4: Refreshing access token...')

        // Get current refresh token from database
        const { data: tokenData, error: fetchError } = await supabase
          .from('jobadder_tokens')
          .select('refresh_token')
          .eq('user_id', userId)
          .single()

        if (fetchError || !tokenData) {
          throw new Error('No refresh token found')
        }

        // Call JobAdder token endpoint with refresh token
        const refreshResponse = await fetch('https://id.jobadder.com/connect/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'refresh_token',
            refresh_token: tokenData.refresh_token
          })
        })

        if (!refreshResponse.ok) {
          const errorText = await refreshResponse.text()
          console.error('JobAdder token refresh failed:', errorText)
          throw new Error(`Token refresh failed: ${refreshResponse.status} ${errorText}`)
        }

        const newTokens: TokenResponse = await refreshResponse.json()
        console.log('Token refresh successful')

        // Update tokens in database
        const expiresAt = new Date(Date.now() + (newTokens.expires_in * 1000)).toISOString()
        
        const { error: updateError } = await supabase
          .from('jobadder_tokens')
          .update({
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token,
            expires_at: expiresAt,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (updateError) {
          console.error('Error updating tokens:', updateError)
          throw new Error('Failed to update authentication tokens')
        }

        return new Response(JSON.stringify({
          success: true,
          access_token: newTokens.access_token,
          expires_in: newTokens.expires_in,
          token_type: newTokens.token_type,
          refresh_token: newTokens.refresh_token,
          api: newTokens.api
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'api-call': {
        // Handle JobAdder API calls with automatic token management
        const { endpoint, method = 'GET', body: requestBody } = params
        
        if (!userId) {
          throw new Error('User ID required for API calls')
        }

        // Get current access token
        const { data: tokenData, error: fetchError } = await supabase
          .from('jobadder_tokens')
          .select('access_token, expires_at, refresh_token, api_base_url')
          .eq('user_id', userId)
          .single()

        if (fetchError || !tokenData) {
          throw new Error('No authentication tokens found')
        }

        let accessToken = tokenData.access_token
        
        // Check if token is expired and refresh if needed
        const expiresAt = new Date(tokenData.expires_at)
        const now = new Date()
        
        if (expiresAt <= now) {
          console.log('Access token expired, refreshing...')
          
          // Refresh the token
          const refreshResponse = await fetch('https://id.jobadder.com/connect/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              grant_type: 'refresh_token',
              refresh_token: tokenData.refresh_token
            })
          })

          if (!refreshResponse.ok) {
            throw new Error('Failed to refresh access token')
          }

          const newTokens: TokenResponse = await refreshResponse.json()
          accessToken = newTokens.access_token
          
          // Update tokens in database
          const newExpiresAt = new Date(Date.now() + (newTokens.expires_in * 1000)).toISOString()
          
          await supabase
            .from('jobadder_tokens')
            .update({
              access_token: newTokens.access_token,
              refresh_token: newTokens.refresh_token,
              expires_at: newExpiresAt,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
        }

        // Make the API call
        const apiUrl = `${tokenData.api_base_url}${endpoint}`
        console.log(`Making JobAdder API call: ${method} ${apiUrl}`)

        const apiResponse = await fetch(apiUrl, {
          method,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: requestBody ? JSON.stringify(requestBody) : undefined
        })

        const responseData = await apiResponse.json()

        return new Response(JSON.stringify({
          success: apiResponse.ok,
          status: apiResponse.status,
          data: responseData
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'jobboards': {
        // Get job boards - requires authentication
        if (!userId) {
          throw new Error('User ID required for job board access')
        }

        const { data: tokenData, error: fetchError } = await supabase
          .from('jobadder_tokens')
          .select('access_token, expires_at, api_base_url, refresh_token')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (fetchError) {
          console.error('Error fetching tokens:', fetchError)
          throw new Error('Failed to fetch authentication tokens')
        }

        if (!tokenData) {
          throw new Error('No authentication tokens found - please reconnect to JobAdder')
        }


        // Check if token is expired and refresh if needed
        let currentToken = tokenData.access_token
        if (new Date(tokenData.expires_at) <= new Date()) {
          console.log('Token expired, attempting refresh...')
          
          if (!tokenData.refresh_token) {
            throw new Error('Token expired and no refresh token available - please reconnect to JobAdder')
          }

          try {
            // Refresh the token
            const refreshResponse = await fetch('https://id.jobadder.com/connect/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: tokenData.refresh_token,
                client_id: clientId,
                client_secret: clientSecret
              })
            })

            if (!refreshResponse.ok) {
              throw new Error('Token refresh failed')
            }

            const refreshData = await refreshResponse.json()
            
            // Update tokens in database
            await supabase
              .from('jobadder_tokens')
              .update({
                access_token: refreshData.access_token,
                expires_at: new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString(),
                refresh_token: refreshData.refresh_token || tokenData.refresh_token
              })
              .eq('user_id', userId)

            currentToken = refreshData.access_token
            console.log('Token refreshed successfully')
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError)
            throw new Error('Token expired and refresh failed - please reconnect to JobAdder')
          }
        }


        // Make API call to get job boards for real tokens
        const apiUrl = `${tokenData.api_base_url}/jobboards`
        
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch job boards: ${response.status}`)
        }

        const data = await response.json()

        return new Response(JSON.stringify({
          success: true,
          data
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'jobboard-jobads': {
        // Get job ads for a specific job board
        const { jobboardId = '8734', limit = 20, offset = 0, search } = params
        
        if (!userId) {
          throw new Error('User ID required for job ad access')
        }

        const { data: tokenData, error: fetchError } = await supabase
          .from('jobadder_tokens')
          .select('access_token, expires_at, api_base_url, refresh_token')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (fetchError) {
          console.error('Error fetching tokens:', fetchError)
          throw new Error('Failed to fetch authentication tokens')
        }

        if (!tokenData) {
          throw new Error('No authentication tokens found - please reconnect to JobAdder')
        }


        // Check if token is expired and refresh if needed
        let currentToken = tokenData.access_token
        if (new Date(tokenData.expires_at) <= new Date()) {
          console.log('Token expired, attempting refresh...')
          
          if (!tokenData.refresh_token) {
            throw new Error('Token expired and no refresh token available - please reconnect to JobAdder')
          }

          try {
            // Refresh the token
            const refreshResponse = await fetch('https://id.jobadder.com/connect/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: tokenData.refresh_token,
                client_id: clientId,
                client_secret: clientSecret
              })
            })

            if (!refreshResponse.ok) {
              throw new Error('Token refresh failed')
            }

            const refreshData = await refreshResponse.json()
            
            // Update tokens in database
            await supabase
              .from('jobadder_tokens')
              .update({
                access_token: refreshData.access_token,
                expires_at: new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString(),
                refresh_token: refreshData.refresh_token || tokenData.refresh_token
              })
              .eq('user_id', userId)

            currentToken = refreshData.access_token
            console.log('Token refreshed successfully')
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError)
            throw new Error('Token expired and refresh failed - please reconnect to JobAdder')
          }
        }

        // Build query parameters for real API call
        const queryParams = new URLSearchParams({
          limit: limit.toString(),
          offset: offset.toString()
        })
        
        if (search) {
          queryParams.append('search', search)
        }

        // Make API call to get job ads for the board
        const apiUrl = `${tokenData.api_base_url}/jobboards/${jobboardId}/jobads?${queryParams}`
        
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch job ads: ${response.status}`)
        }

        const data = await response.json()

        return new Response(JSON.stringify({
          success: true,
          data
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'jobs': {
        // Get regular JobAdder jobs
        const { limit = 20, offset = 0, search } = params
        
        if (!userId) {
          throw new Error('User ID required for job access')
        }

        const { data: tokenData, error: fetchError } = await supabase
          .from('jobadder_tokens')
          .select('access_token, expires_at, api_base_url, refresh_token')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (fetchError || !tokenData) {
          throw new Error('No authentication tokens found - please reconnect to JobAdder')
        }


        // Check if token is expired and refresh if needed
        let currentToken = tokenData.access_token
        if (new Date(tokenData.expires_at) <= new Date()) {
          // Token refresh logic (same as above)
          if (!tokenData.refresh_token) {
            throw new Error('Token expired and no refresh token available')
          }

          const refreshResponse = await fetch('https://id.jobadder.com/connect/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              refresh_token: tokenData.refresh_token,
              client_id: clientId,
              client_secret: clientSecret
            })
          })

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json()
            await supabase
              .from('jobadder_tokens')
              .update({
                access_token: refreshData.access_token,
                expires_at: new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString(),
                refresh_token: refreshData.refresh_token || tokenData.refresh_token
              })
              .eq('user_id', userId)
            currentToken = refreshData.access_token
          }
        }

        // Build query parameters
        const queryParams = new URLSearchParams({
          limit: limit.toString(),
          offset: offset.toString()
        })
        
        if (search) {
          queryParams.append('search', search)
        }

        // Make API call to get jobs - try multiple possible endpoints
        let apiUrl = `${tokenData.api_base_url}/jobs?${queryParams}`
        let response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          }
        })

        // If the first endpoint fails, try alternative endpoints
        if (!response.ok) {
          console.log(`Jobs endpoint failed: ${response.status}. Trying alternative endpoints...`)
          
          // Try /jobads
          apiUrl = `${tokenData.api_base_url}/jobads?${queryParams}`
          response = await fetch(apiUrl, {
            headers: {
              'Authorization': `Bearer ${currentToken}`,
              'Content-Type': 'application/json',
            }
          })
        }

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Failed to fetch jobs from ${apiUrl}: ${response.status} - ${errorText}`)
          throw new Error(`Failed to fetch jobs: ${response.status} - ${errorText}`)
        }

        const data = await response.json()

        return new Response(JSON.stringify({
          success: true,
          data
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'candidates': {
        // Get job applicants (candidates who have applied) - JobAdder /jobapplications endpoint
        const { limit = 50, offset = 0, search } = params
        
        if (!userId) {
          throw new Error('User ID required for job applications access')
        }

        const { data: tokenData, error: fetchError } = await supabase
          .from('jobadder_tokens')
          .select('access_token, expires_at, api_base_url, refresh_token')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (fetchError || !tokenData) {
          throw new Error('No authentication tokens found - please reconnect to JobAdder')
        }

        // Check if token is expired and refresh if needed
        let currentToken = tokenData.access_token
        if (new Date(tokenData.expires_at) <= new Date()) {
          if (!tokenData.refresh_token) {
            throw new Error('Token expired and no refresh token available')
          }

          const refreshResponse = await fetch('https://id.jobadder.com/connect/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              refresh_token: tokenData.refresh_token,
              client_id: clientId,
              client_secret: clientSecret
            })
          })

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json()
            await supabase
              .from('jobadder_tokens')
              .update({
                access_token: refreshData.access_token,
                expires_at: new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString(),
                refresh_token: refreshData.refresh_token || tokenData.refresh_token
              })
              .eq('user_id', userId)
            currentToken = refreshData.access_token
          }
        }

        // Build query parameters for job applications endpoint
        const queryParams = new URLSearchParams()
        
        // Core pagination parameters
        queryParams.append('limit', Math.min(limit, 100).toString()) // JobAdder max is 100
        queryParams.append('offset', offset.toString())
        
        // Search parameter for applicant names/emails
        if (search && search.trim()) {
          queryParams.append('search', search.trim())
        }

        // Make API call to get job applications (applicants) - try multiple possible endpoints
        let apiUrl = `${tokenData.api_base_url}/jobapplications?${queryParams.toString()}`
        
        console.log('Job Applications (Candidates) API call:', apiUrl)
        
        let response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })

        // If the first endpoint fails, try alternative endpoints
        if (!response.ok) {
          console.log(`JobApplications endpoint failed: ${response.status}. Trying alternative endpoints...`)
          
          // Try /candidates endpoint
          apiUrl = `${tokenData.api_base_url}/candidates?${queryParams.toString()}`
          response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${currentToken}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          })
        }

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Failed to fetch job applications from ${apiUrl}: ${response.status} - ${errorText}`)
          throw new Error(`Failed to fetch job applications: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        console.log('Job Applications response:', JSON.stringify(data, null, 2))

        return new Response(JSON.stringify({
          success: true,
          data: {
            items: data.items || [],
            totalCount: data.totalCount || 0,
            limit: data.limit || limit,
            offset: data.offset || offset
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'job-applications': {
        // Get job applications for a specific job
        const { jobId, limit = 20, offset = 0 } = params
        
        if (!userId) {
          throw new Error('User ID required for job applications access')
        }

        if (!jobId) {
          throw new Error('Job ID is required')
        }

        const { data: tokenData, error: fetchError } = await supabase
          .from('jobadder_tokens')
          .select('access_token, expires_at, api_base_url, refresh_token')
          .eq('user_id', userId)
          .maybeSingle()

        if (fetchError || !tokenData) {
          throw new Error('No authentication tokens found - please reconnect to JobAdder')
        }

        // Check if token is expired and refresh if needed
        let currentToken = tokenData.access_token
        if (new Date(tokenData.expires_at) <= new Date()) {
          if (!tokenData.refresh_token) {
            throw new Error('Token expired and no refresh token available')
          }

          const refreshResponse = await fetch('https://id.jobadder.com/connect/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              refresh_token: tokenData.refresh_token,
              client_id: clientId,
              client_secret: clientSecret
            })
          })

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json()
            await supabase
              .from('jobadder_tokens')
              .update({
                access_token: refreshData.access_token,
                expires_at: new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString(),
                refresh_token: refreshData.refresh_token || tokenData.refresh_token
              })
              .eq('user_id', userId)
            currentToken = refreshData.access_token
          }
        }

        // Build query parameters
        const queryParams = new URLSearchParams({
          limit: limit.toString(),
          offset: offset.toString()
        })

        // Make API call to get job applications
        const apiUrl = `${tokenData.api_base_url}/jobs/${jobId}/applications?${queryParams}`
        
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch job applications: ${response.status}`)
        }

        const data = await response.json()

        return new Response(JSON.stringify({
          success: true,
          data
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'applications': {
        // Get all job applications across all jobs
        const { limit = 100, offset = 0, activeOnly = false } = params
        
        if (!userId) {
          throw new Error('User ID required for applications access')
        }

        const { data: tokenData, error: fetchError } = await supabase
          .from('jobadder_tokens')
          .select('access_token, expires_at, api_base_url, refresh_token')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (fetchError || !tokenData) {
          throw new Error('No authentication tokens found - please reconnect to JobAdder')
        }


        // Check if token is expired and refresh if needed
        let currentToken = tokenData.access_token
        if (new Date(tokenData.expires_at) <= new Date()) {
          if (!tokenData.refresh_token) {
            throw new Error('Token expired and no refresh token available')
          }

          const refreshResponse = await fetch('https://id.jobadder.com/connect/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              refresh_token: tokenData.refresh_token,
              client_id: clientId,
              client_secret: clientSecret
            })
          })

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json()
            await supabase
              .from('jobadder_tokens')
              .update({
                access_token: refreshData.access_token,
                expires_at: new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString(),
                refresh_token: refreshData.refresh_token || tokenData.refresh_token
              })
              .eq('user_id', userId)
            currentToken = refreshData.access_token
          }
        }

        // Build query parameters
        const queryParams = new URLSearchParams({
          limit: limit.toString(),
          offset: offset.toString()
        })

        if (activeOnly) {
          queryParams.append('active', 'true')
        }

        // Make API call to get all applications - correct JobAdder endpoint
        const apiUrl = `${tokenData.api_base_url}/jobapplications?${queryParams}`
        
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          }
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Failed to fetch applications: ${response.status} - ${errorText}`)
          throw new Error(`Failed to fetch applications: ${response.status} - ${errorText}`)
        }

        const data = await response.json()

        return new Response(JSON.stringify({
          success: true,
          data
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'current-user': {
        // Get current user information from JobAdder
        if (!userId) {
          throw new Error('User ID required for current user access')
        }

        const { data: tokenData, error: fetchError } = await supabase
          .from('jobadder_tokens')
          .select('access_token, expires_at, api_base_url, refresh_token')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (fetchError || !tokenData) {
          throw new Error('No authentication tokens found - please reconnect to JobAdder')
        }


        // Check if token is expired and refresh if needed
        let currentToken = tokenData.access_token
        if (new Date(tokenData.expires_at) <= new Date()) {
          if (!tokenData.refresh_token) {
            throw new Error('Token expired and no refresh token available')
          }

          const refreshResponse = await fetch('https://id.jobadder.com/connect/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              refresh_token: tokenData.refresh_token,
              client_id: clientId,
              client_secret: clientSecret
            })
          })

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json()
            await supabase
              .from('jobadder_tokens')
              .update({
                access_token: refreshData.access_token,
                expires_at: new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString(),
                refresh_token: refreshData.refresh_token || tokenData.refresh_token
              })
              .eq('user_id', userId)
            currentToken = refreshData.access_token
          }
        }

        // Make API call to get current user - try multiple possible endpoints
        let apiUrl = `${tokenData.api_base_url}/users/current`
        let response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          }
        })

        // If the first endpoint fails, try alternative endpoints
        if (!response.ok) {
          console.log(`First attempt failed: ${response.status}. Trying alternative endpoints...`)
          
          // Try /user/current 
          apiUrl = `${tokenData.api_base_url}/user/current`
          response = await fetch(apiUrl, {
            headers: {
              'Authorization': `Bearer ${currentToken}`,
              'Content-Type': 'application/json',
            }
          })
          
          // If still fails, try /user
          if (!response.ok) {
            console.log(`Second attempt failed: ${response.status}. Trying /user...`)
            apiUrl = `${tokenData.api_base_url}/user`
            response = await fetch(apiUrl, {
              headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json',
              }
            })
          }
        }

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Failed to fetch current user from ${apiUrl}: ${response.status} - ${errorText}`)
          throw new Error(`Failed to fetch current user: ${response.status} - ${errorText}`)
        }

        const data = await response.json()

        return new Response(JSON.stringify({
          success: true,
          data
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'test-connection': {
        // Test JobAdder API connection with current token
        if (!userId) {
          throw new Error('User ID required for connection test')
        }

        const { data: tokenData, error: fetchError } = await supabase
          .from('jobadder_tokens')
          .select('access_token, expires_at, api_base_url, refresh_token')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (fetchError || !tokenData) {
          throw new Error('No authentication tokens found - please reconnect to JobAdder')
        }

        console.log('Token data found:', { 
          hasToken: !!tokenData.access_token, 
          expiresAt: tokenData.expires_at,
          apiBaseUrl: tokenData.api_base_url
        });

        // Check if token is expired and refresh if needed
        let currentToken = tokenData.access_token
        if (new Date(tokenData.expires_at) <= new Date()) {
          console.log('Token expired during test, attempting refresh...')
          
          if (!tokenData.refresh_token) {
            throw new Error('Token expired and no refresh token available - please reconnect to JobAdder')
          }

          try {
            const refreshResponse = await fetch('https://id.jobadder.com/connect/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: tokenData.refresh_token,
                client_id: clientId,
                client_secret: clientSecret
              })
            })

            if (!refreshResponse.ok) {
              throw new Error('Token refresh failed - please reconnect to JobAdder')
            }

            const refreshData = await refreshResponse.json()
            await supabase
              .from('jobadder_tokens')
              .update({
                access_token: refreshData.access_token,
                expires_at: new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString(),
                refresh_token: refreshData.refresh_token || tokenData.refresh_token
              })
              .eq('user_id', userId)
            currentToken = refreshData.access_token
            console.log('Token refreshed successfully during test')
          } catch (refreshError) {
            console.error('Token refresh failed during test:', refreshError)
            throw new Error('Token expired and refresh failed - please reconnect to JobAdder')
          }
        }

        // Test the connection by calling the current user endpoint
        const apiUrl = `${tokenData.api_base_url}/users/current`
        console.log(`Testing connection to: ${apiUrl}`)
        
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          }
        })

        if (!response.ok) {
          console.error(`Connection test failed: ${response.status} ${response.statusText}`)
          throw new Error(`Connection test failed: ${response.status} - ${response.statusText}`)
        }

        const data = await response.json()
        console.log('Connection test successful')

        return new Response(JSON.stringify({
          success: true,
          message: 'JobAdder API connection test successful',
          user: data
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      default:
        throw new Error(`Unknown action: ${requestAction}`)
    }

  } catch (error) {
    console.error('JobAdder API error:', error)
    
    // For authentication/token issues, return 401
    const isAuthError = error.message.includes('authentication') || 
                       error.message.includes('token') || 
                       error.message.includes('reconnect to JobAdder')
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: isAuthError ? 401 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})