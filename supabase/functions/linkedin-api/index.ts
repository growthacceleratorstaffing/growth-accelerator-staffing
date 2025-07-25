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

    const { action, ...params } = await req.json();

    // Get LinkedIn credentials from secrets
    const clientId = Deno.env.get('LINKEDIN_CLIENT_ID')?.trim();
    const clientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET')?.trim();
    const accessToken = Deno.env.get('LINKEDIN_ACCESS_TOKEN')?.trim();

    console.log('LinkedIn credentials check:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasAccessToken: !!accessToken,
      clientIdLength: clientId?.length || 0,
      action
    });

    switch (action) {
      case 'getProfile': {
        if (!accessToken) {
          throw new Error('LinkedIn access token not configured');
        }

        // Updated to use LinkedIn API v2 according to documentation
        const response = await fetch(
          'https://api.linkedin.com/v2/people/~?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))',
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'LinkedIn-Version': '202301'
            }
          }
        );

        console.log('LinkedIn API response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('LinkedIn API error:', errorText);
          throw new Error(`LinkedIn API error: ${response.status} ${response.statusText}`);
        }

        const profileData = await response.json();
        console.log('Profile data received:', !!profileData.id);
        
        return new Response(
          JSON.stringify({ success: true, data: profileData }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'testConnection': {
        if (!accessToken) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              status: 401,
              message: 'Access token not configured'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Test connection with basic profile endpoint
        const response = await fetch(
          'https://api.linkedin.com/v2/people/~',
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'LinkedIn-Version': '202301'
            }
          }
        );

        console.log('Test connection response status:', response.status);

        const isSuccess = response.ok;
        const message = isSuccess ? 'Connection successful' : `Connection failed: ${response.status} ${response.statusText}`;

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
        // Return credentials status (without exposing actual secret values)
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