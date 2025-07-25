import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, code, state, ...params } = await req.json();

    // Get LinkedIn credentials from secrets
    const clientId = Deno.env.get('LINKEDIN_CLIENT_ID')?.trim();
    const clientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET')?.trim();
    const accessToken = Deno.env.get('LINKEDIN_ACCESS_TOKEN')?.trim();

    console.log('LinkedIn credentials check:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasAccessToken: !!accessToken,
      action
    });

    switch (action) {
      case 'exchangeCodeForToken': {
        if (!clientId || !clientSecret) {
          throw new Error('LinkedIn Client ID and Secret required for token exchange');
        }

        if (!code) {
          throw new Error('Authorization code is required');
        }

        // Exchange authorization code for access token - use dynamic redirect URI
        const redirectUri = params.redirect_uri || 'https://webapp.growthaccelerator.nl/auth/linkedin/callback';
        
        const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
            client_id: clientId,
            client_secret: clientSecret,
          }),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error('Token exchange error:', errorText);
          throw new Error(`Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
        }

        const tokenData = await tokenResponse.json();
        console.log('Token exchange successful, expires_in:', tokenData.expires_in);

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: {
              access_token: tokenData.access_token,
              expires_in: tokenData.expires_in,
              scope: tokenData.scope
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'getProfile': {
        if (!accessToken) {
          throw new Error('LinkedIn access token not configured');
        }

        // Use LinkedIn Profile API v2 with new base URL and versioning
        const response = await fetch(
          'https://api.linkedin.com/rest/people?q=finder&finder=CURRENT_USER&projection=(id,localizedFirstName,localizedLastName)',
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'LinkedIn-Version': '202507'
            }
          }
        );

        console.log('LinkedIn Profile API response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('LinkedIn Profile API error:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          
          let errorMessage = `LinkedIn API error: ${response.status} ${response.statusText}`;
          
          if (response.status === 403) {
            errorMessage = 'Access token expired or insufficient permissions. Please generate a new access token.';
          } else if (response.status === 401) {
            errorMessage = 'Invalid access token. Please check your LinkedIn credentials.';
          }
          
          throw new Error(errorMessage);
        }

        const profileData = await response.json();
        console.log('Profile data received:', profileData);
        
        // Handle the new API response format
        const user = profileData.elements?.[0] || profileData;
        
        return new Response(
          JSON.stringify({ success: true, data: user }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'testConnection': {
        if (!accessToken) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              status: 401,
              message: 'Access token not configured in Supabase secrets'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Test connection with LinkedIn Profile API using new base URL and versioning
        const response = await fetch(
          'https://api.linkedin.com/rest/people?q=finder&finder=CURRENT_USER&projection=(id)',
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'LinkedIn-Version': '202507'
            }
          }
        );

        console.log('Test connection response:', {
          status: response.status,
          statusText: response.statusText
        });

        let message = 'Connection successful';
        const isSuccess = response.ok;

        if (!isSuccess) {
          const errorBody = await response.text();
          console.error('LinkedIn test connection error:', errorBody);
          
          if (response.status === 403) {
            message = 'Access token expired or insufficient permissions. Generate a new token.';
          } else if (response.status === 401) {
            message = 'Invalid access token. Please verify your LinkedIn credentials.';
          } else {
            message = `Connection failed: ${response.status} ${response.statusText}`;
          }
        }

        return new Response(
          JSON.stringify({ 
            success: isSuccess, 
            status: response.status,
            message: message
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'getCredentials': {
        const result = {
          success: true,
          data: {
            client_id: clientId || '',
            has_client_secret: !!clientSecret,
            has_access_token: !!accessToken
          }
        };
        
        console.log('Returning credentials status:', result.data);
        
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error: any) {
    console.error('LinkedIn API Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});