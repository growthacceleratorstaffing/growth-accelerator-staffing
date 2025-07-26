import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('LinkedIn OAuth API called');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user authentication
    const authHeader = req.headers.get('authorization')!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { action, ...params } = await req.json();
    console.log('LinkedIn OAuth action requested:', action);

    // Get LinkedIn credentials
    const linkedinClientId = Deno.env.get('LINKEDIN_CLIENT_ID');
    const linkedinClientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET');

    if (!linkedinClientId || !linkedinClientSecret) {
      return new Response(
        JSON.stringify({ error: 'LinkedIn credentials not configured' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    switch (action) {
      case 'exchangeToken':
        return await exchangeAuthorizationCode(
          user.id,
          params.code,
          params.redirectUri,
          linkedinClientId,
          linkedinClientSecret,
          supabase
        );
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }

  } catch (error) {
    console.error('LinkedIn OAuth API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function exchangeAuthorizationCode(
  userId: string,
  authCode: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
  supabase: any
) {
  try {
    console.log('Exchanging authorization code for access token...');
    
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: authCode,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    console.log('LinkedIn token exchange response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('LinkedIn token exchange error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Token exchange failed', 
          details: errorText 
        }),
        { 
          status: tokenResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('LinkedIn token data received:', { 
      hasAccessToken: !!tokenData.access_token,
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in 
    });

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

    // Store the token in the database
    const { error: insertError } = await supabase
      .from('linkedin_user_tokens')
      .upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        token_expires_at: expiresAt.toISOString(),
        scope: tokenData.scope || 'default'
      }, {
        onConflict: 'user_id'
      });

    if (insertError) {
      console.error('Error storing LinkedIn token:', insertError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to store token', 
          details: insertError.message 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('LinkedIn token stored successfully for user:', userId);

    // Test the token by getting user profile
    try {
      const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'X-RestLi-Protocol-Version': '2.0.0'
        }
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        console.log('LinkedIn profile retrieved successfully:', {
          id: profileData.id,
          firstName: profileData.localizedFirstName,
          lastName: profileData.localizedLastName
        });
      }
    } catch (profileError) {
      console.warn('Could not fetch LinkedIn profile:', profileError.message);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'LinkedIn account connected successfully',
        expiresAt: expiresAt.toISOString()
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in token exchange:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Token exchange failed', 
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}