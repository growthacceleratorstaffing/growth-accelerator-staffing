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
      
      case 'getLeadForms':
        return await getLeadForms(linkedinAccessToken);
      
      case 'downloadLeads':
        return await downloadLeads(linkedinAccessToken, params.formId, params.dateRange);
      
      case 'getAdAccounts':
        return await getAdAccounts(linkedinAccessToken);
      
      case 'getCampaigns':
        return await getCampaigns(linkedinAccessToken, params.accountId);
      
      case 'getLeadsFromForm':
        return await getLeadsFromForm(linkedinAccessToken, params.formId, params.dateRange);
      
      case 'syncLeads':
        return await syncLinkedInLeads(linkedinAccessToken, user.id, supabase, params);
      
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

// LinkedIn Lead Gen API Functions based on Microsoft Documentation
// https://learn.microsoft.com/en-us/linkedin/marketing/lead-sync/leadsync

async function getLeadForms(accessToken: string) {
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
    console.log('Fetching LinkedIn Lead Gen Forms...');
    
    // Get Lead Forms using the Lead Gen API
    const response = await fetch('https://api.linkedin.com/rest/leadGenForms?q=owner', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-RestLi-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202401'
      }
    });

    console.log('LinkedIn Lead Forms API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LinkedIn Lead Forms API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'LinkedIn API error', details: errorText }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    console.log('Lead Forms data received:', data);

    return new Response(
      JSON.stringify({ success: true, data: data.elements || [] }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error fetching lead forms:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch lead forms', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function getLeadsFromForm(accessToken: string, formId: string, dateRange?: { start: string, end: string }) {
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
    console.log('Fetching leads from LinkedIn form:', formId);
    
    // Build query parameters for date range if provided
    let queryParams = `q=formUrn&formUrn=urn:li:leadGenForm:${formId}`;
    
    if (dateRange) {
      queryParams += `&createdTimeRange.start=${new Date(dateRange.start).getTime()}`;
      queryParams += `&createdTimeRange.end=${new Date(dateRange.end).getTime()}`;
    }

    // Get form responses using the Lead Gen API
    const response = await fetch(`https://api.linkedin.com/rest/leadGenFormResponses?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-RestLi-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202401'
      }
    });

    console.log('LinkedIn Form Responses API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LinkedIn Form Responses API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'LinkedIn API error', details: errorText }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    console.log('Form responses data received:', data);

    // Transform the responses into a more usable format
    const leads = data.elements?.map((response: any) => ({
      id: response.id,
      formId: formId,
      submittedAt: new Date(response.submittedAt).toISOString(),
      leadDetails: response.leadDetails || {},
      raw: response
    })) || [];

    return new Response(
      JSON.stringify({ success: true, data: leads, total: data.paging?.total || 0 }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error fetching leads from form:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch leads from form', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function downloadLeads(accessToken: string, formId: string, dateRange?: { start: string, end: string }) {
  // This function combines getting leads and formatting them for download
  const leadsResponse = await getLeadsFromForm(accessToken, formId, dateRange);
  const leadsData = await leadsResponse.json();
  
  if (!leadsData.success) {
    return leadsResponse;
  }

  // Format leads for download (CSV format)
  const leads = leadsData.data;
  const csvHeaders = ['ID', 'Form ID', 'Submitted At', 'Lead Details'];
  const csvRows = leads.map((lead: any) => [
    lead.id,
    lead.formId,
    lead.submittedAt,
    JSON.stringify(lead.leadDetails)
  ]);

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: {
        format: 'csv',
        headers: csvHeaders,
        rows: csvRows,
        leads: leads
      },
      total: leads.length
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

async function syncLinkedInLeads(accessToken: string, userId: string, supabase: any, params: any = {}) {
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
    console.log('Syncing LinkedIn leads for user:', userId);
    
    // First get all lead forms
    const formsResponse = await getLeadForms(accessToken);
    const formsData = await formsResponse.json();
    
    if (!formsData.success) {
      return formsResponse;
    }

    const forms = formsData.data;
    let totalSyncedLeads = 0;
    const syncResults = [];

    // Sync leads from each form
    for (const form of forms) {
      try {
        const leadsResponse = await getLeadsFromForm(accessToken, form.id, params.dateRange);
        const leadsData = await leadsResponse.json();
        
        if (leadsData.success) {
          const leads = leadsData.data;
          
          // Store leads in database
          for (const lead of leads) {
            const leadData = {
              user_id: userId,
              linkedin_lead_id: lead.id,
              form_name: form.name || `Form ${form.id}`,
              first_name: lead.leadDetails?.firstName || '',
              last_name: lead.leadDetails?.lastName || '',
              email: lead.leadDetails?.email || '',
              phone: lead.leadDetails?.phone || '',
              company: lead.leadDetails?.company || '',
              job_title: lead.leadDetails?.jobTitle || '',
              linkedin_campaign_id: form.associatedCampaignUrn || null,
              submitted_at: lead.submittedAt,
              lead_data: lead.raw
            };

            const { error } = await supabase
              .from('linkedin_leads')
              .upsert(leadData, {
                onConflict: 'user_id,linkedin_lead_id'
              });

            if (!error) {
              totalSyncedLeads++;
            } else {
              console.error('Error storing lead:', error);
            }
          }
          
          syncResults.push({
            formId: form.id,
            formName: form.name,
            leadsCount: leads.length,
            success: true
          });
        } else {
          syncResults.push({
            formId: form.id,
            formName: form.name,
            leadsCount: 0,
            success: false,
            error: leadsData.error
          });
        }
      } catch (formError) {
        console.error(`Error syncing leads from form ${form.id}:`, formError);
        syncResults.push({
          formId: form.id,
          formName: form.name,
          leadsCount: 0,
          success: false,
          error: formError.message
        });
      }
    }

    // Update integration record
    await updateLinkedInIntegration(supabase, userId);

    console.log(`Synced ${totalSyncedLeads} leads from ${forms.length} forms`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          totalLeads: totalSyncedLeads,
          formsProcessed: forms.length,
          syncResults: syncResults
        },
        message: `Successfully synced ${totalSyncedLeads} leads from ${forms.length} forms`
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error syncing LinkedIn leads:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to sync LinkedIn leads', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

// LinkedIn Ads API Functions
async function getAdAccounts(accessToken: string) {
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
    console.log('Fetching LinkedIn ad accounts...');
    
    const response = await fetch('https://api.linkedin.com/rest/adAccounts?q=search&search=(status:(values:List(ACTIVE,DRAFT)))&pageSize=100', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-RestLi-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202401'
      }
    });

    console.log('LinkedIn Ad Accounts API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LinkedIn Ad Accounts API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'LinkedIn API error', details: errorText }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    console.log('Ad Accounts data received:', data);

    const accounts = data.elements?.map((account: any) => ({
      id: account.id,
      name: account.name,
      status: account.status,
      type: account.type,
      currency: account.currency || 'USD',
      account_data: account
    })) || [];

    return new Response(
      JSON.stringify({ success: true, data: accounts }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error fetching ad accounts:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch ad accounts', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function getCampaigns(accessToken: string, accountId?: string) {
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
    console.log('Fetching LinkedIn campaigns...', { accountId });
    
    let url = 'https://api.linkedin.com/rest/campaigns?q=search&pageSize=100';
    
    if (accountId) {
      url += `&search=(account:(values:List(urn:li:sponsoredAccount:${accountId})))`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-RestLi-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202401'
      }
    });

    console.log('LinkedIn Campaigns API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LinkedIn Campaigns API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'LinkedIn API error', details: errorText }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    console.log('Campaigns data received:', data);

    const campaigns = data.elements?.map((campaign: any) => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.runSchedule?.status || campaign.status || 'UNKNOWN',
      budget: parseFloat(campaign.dailyBudget?.amount || campaign.totalBudget?.amount || '0'),
      currency: campaign.dailyBudget?.currencyCode || campaign.totalBudget?.currencyCode || 'USD',
      created_at: new Date(campaign.createdTime || Date.now()).toISOString(),
      updated_at: new Date(campaign.lastModifiedTime || Date.now()).toISOString(),
      campaign_data: campaign
    })) || [];

    return new Response(
      JSON.stringify({ success: true, data: campaigns }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch campaigns', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }