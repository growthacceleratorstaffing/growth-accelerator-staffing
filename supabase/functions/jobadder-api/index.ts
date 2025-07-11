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
    const { action, ...params } = await req.json()
    const userId = req.headers.get('x-user-id')

    console.log('JobAdder API request:', { action, userId: userId ? 'present' : 'missing' })

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get JobAdder credentials from secrets
    const clientId = Deno.env.get('JOBADDER_CLIENT_ID')
    const clientSecret = Deno.env.get('JOBADDER_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      throw new Error('JobAdder credentials not configured')
    }

    switch (action) {
      case 'get-client-id': {
        // Return the client ID for frontend OAuth URL generation
        if (!clientId) {
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
        // Step 3: Exchange authorization code for access token
        const { code, redirect_uri, grant_type } = params
        
        if (!code || !userId) {
          throw new Error('Missing required parameters for token exchange')
        }

        console.log('Step 3: Exchanging authorization code for tokens...')

        // Call JobAdder token endpoint
        const tokenResponse = await fetch('https://id.jobadder.com/connect/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirect_uri
          })
        })

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text()
          console.error('JobAdder token exchange failed:', errorText)
          throw new Error(`Token exchange failed: ${tokenResponse.status} ${errorText}`)
        }

        const tokens: TokenResponse = await tokenResponse.json()
        console.log('Token exchange successful')

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
          console.error('Error storing tokens:', dbError)
          throw new Error('Failed to store authentication tokens')
        }

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
          .select('access_token, expires_at, api_base_url')
          .eq('user_id', userId)
          .single()

        if (fetchError || !tokenData) {
          throw new Error('No authentication tokens found')
        }

        // Make API call to get job boards
        const apiUrl = `${tokenData.api_base_url}/jobboards`
        
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
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
          .select('access_token, expires_at, api_base_url')
          .eq('user_id', userId)
          .single()

        if (fetchError || !tokenData) {
          throw new Error('No authentication tokens found')
        }

        // Build query parameters
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
            'Authorization': `Bearer ${tokenData.access_token}`,
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

      default:
        throw new Error(`Unknown action: ${action}`)
    }

  } catch (error) {
    console.error('JobAdder API error:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})