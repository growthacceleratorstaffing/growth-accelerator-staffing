import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LinkedInProfile {
  id: string;
  localizedFirstName: string;
  localizedLastName: string;
  localizedHeadline?: string;
  vanityName?: string;
  profilePicture?: {
    displayImage: string;
  };
  firstName: {
    localized: { [key: string]: string };
    preferredLocale: { country: string; language: string };
  };
  lastName: {
    localized: { [key: string]: string };
    preferredLocale: { country: string; language: string };
  };
  headline?: {
    localized: { [key: string]: string };
    preferredLocale: { country: string; language: string };
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('LinkedIn Lead Sync API called');
    
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
    console.log('Action requested:', action);

    // Get LinkedIn credentials
    const linkedinClientId = Deno.env.get('LINKEDIN_CLIENT_ID');
    const linkedinClientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET');
    
    // Get user-specific LinkedIn token from database
    const { data: tokenData } = await supabase
      .from('linkedin_user_tokens')
      .select('access_token, token_expires_at')
      .eq('user_id', user.id)
      .single();
    
    const linkedinAccessToken = tokenData?.access_token;

    console.log('LinkedIn credentials check:', {
      hasClientId: !!linkedinClientId,
      hasClientSecret: !!linkedinClientSecret,
      hasAccessToken: !!linkedinAccessToken,
      action
    });

    switch (action) {
      case 'syncProfile':
        return await syncLinkedInProfile(supabase, user.id, linkedinAccessToken);
      
      case 'syncConnections':
        return await syncLinkedInConnections(supabase, user.id, linkedinAccessToken, params.limit || 50);
      
      case 'getProfile':
        return await getLinkedInProfile(linkedinAccessToken);
      
      case 'testConnection':
        return await testLinkedInConnection(linkedinAccessToken);
      
      case 'updateIntegration':
        return await updateLinkedInIntegration(supabase, user.id);
      
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
    console.error('LinkedIn Lead Sync API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function getLinkedInProfile(accessToken: string | undefined) {
  if (!accessToken) {
    return new Response(
      JSON.stringify({ error: 'LinkedIn access token not configured' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const response = await fetch('https://api.linkedin.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-RestLi-Protocol-Version': '2.0.0'
      }
    });

    console.log('LinkedIn Profile API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LinkedIn API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'LinkedIn API error', details: errorText }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const profileData: LinkedInProfile = await response.json();
    console.log('Profile data received:', profileData);

    return new Response(
      JSON.stringify({ success: true, data: profileData }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error fetching LinkedIn profile:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch LinkedIn profile', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function syncLinkedInProfile(supabase: any, userId: string, accessToken: string | undefined) {
  if (!accessToken) {
    return new Response(
      JSON.stringify({ error: 'LinkedIn access token not configured' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Get LinkedIn profile data
    const profileResponse = await getLinkedInProfile(accessToken);
    const profileResult = await profileResponse.json();

    if (!profileResult.success) {
      return profileResponse;
    }

    const profileData = profileResult.data;

    // Check if LinkedIn contact already exists
    const { data: existingContact } = await supabase
      .from('crm_contacts')
      .select('id')
      .eq('user_id', userId)
      .eq('crm_source', 'linkedin')
      .eq('external_id', 'linkedin_profile')
      .single();

    const contactData = {
      user_id: userId,
      name: `${profileData.localizedFirstName} ${profileData.localizedLastName}`,
      company: profileData.localizedHeadline || 'LinkedIn User',
      position: profileData.localizedHeadline || '',
      crm_source: 'linkedin',
      status: 'prospect',
      external_id: 'linkedin_profile',
      contact_data: {
        source: 'LinkedIn Lead Sync API',
        profile_type: 'self',
        linkedin_profile: profileData,
        synced_at: new Date().toISOString(),
        profile_id: profileData.id,
        vanity_name: profileData.vanityName
      },
      last_synced_at: new Date().toISOString()
    };

    let result;
    if (existingContact) {
      // Update existing contact
      const { data, error } = await supabase
        .from('crm_contacts')
        .update(contactData)
        .eq('id', existingContact.id)
        .select()
        .single();
      
      result = { data, error, action: 'updated' };
    } else {
      // Create new contact
      const { data, error } = await supabase
        .from('crm_contacts')
        .insert(contactData)
        .select()
        .single();
      
      result = { data, error, action: 'created' };
    }

    if (result.error) {
      console.error('Database error:', result.error);
      return new Response(
        JSON.stringify({ error: 'Database error', details: result.error.message }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Update LinkedIn integration record
    await updateLinkedInIntegration(supabase, userId);

    console.log(`LinkedIn profile ${result.action} successfully`);
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: result.data,
        action: result.action,
        message: `LinkedIn profile ${result.action} successfully`
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error syncing LinkedIn profile:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to sync LinkedIn profile', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function syncLinkedInConnections(supabase: any, userId: string, accessToken: string | undefined, limit: number = 50) {
  // Note: LinkedIn's People Search API requires specific permissions and is limited
  // This is a placeholder for future implementation when proper permissions are available
  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'LinkedIn connections sync requires additional API permissions',
      data: { synced_count: 0, limit }
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

async function testLinkedInConnection(accessToken: string | undefined) {
  if (!accessToken) {
    return new Response(
      JSON.stringify({ success: false, error: 'No access token configured' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const response = await fetch('https://api.linkedin.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-RestLi-Protocol-Version': '2.0.0'
      }
    });

    const isValid = response.ok;
    console.log('LinkedIn connection test result:', isValid);

    return new Response(
      JSON.stringify({ 
        success: isValid,
        status: response.status,
        message: isValid ? 'LinkedIn connection is valid' : 'LinkedIn connection failed'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('LinkedIn connection test error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Connection test failed',
        details: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function updateLinkedInIntegration(supabase: any, userId: string) {
  try {
    // Update or create LinkedIn integration record
    const { error } = await supabase
      .from('crm_integrations')
      .upsert({
        user_id: userId,
        crm_type: 'linkedin',
        crm_name: 'LinkedIn Lead Sync',
        is_active: true,
        last_sync_at: new Date().toISOString(),
        settings: {
          source: 'LinkedIn Lead Sync API',
          type: 'profile',
          sync_type: 'automated'
        }
      }, {
        onConflict: 'user_id,crm_type'
      });

    if (error) {
      console.error('Error updating LinkedIn integration:', error);
    } else {
      console.log('LinkedIn integration updated successfully');
    }

    return !error;
  } catch (error) {
    console.error('Error in updateLinkedInIntegration:', error);
    return false;
  }
}