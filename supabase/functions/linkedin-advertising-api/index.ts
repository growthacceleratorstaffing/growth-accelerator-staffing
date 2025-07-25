import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LinkedInAdAccount {
  id: string;
  name: string;
  status: string;
  type: string;
  currency: string;
  reference?: string;
}

interface LinkedInCampaign {
  id: string;
  name: string;
  status: string;
  type: string;
  costType: string;
  dailyBudget?: {
    amount: string;
    currencyCode: string;
  };
  totalBudget?: {
    amount: string;
    currencyCode: string;
  };
  runSchedule?: {
    start: number;
    end?: number;
  };
  targetingCriteria?: any;
  creativeSelection?: any;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('LinkedIn Advertising API called');
    
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
    console.log('LinkedIn Advertising API action requested:', action);

    // Get LinkedIn credentials
    const linkedinClientId = Deno.env.get('LINKEDIN_CLIENT_ID');
    const linkedinClientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET');
    const linkedinAccessToken = Deno.env.get('LINKEDIN_ACCESS_TOKEN');

    console.log('LinkedIn credentials check:', {
      hasClientId: !!linkedinClientId,
      hasClientSecret: !!linkedinClientSecret,
      hasAccessToken: !!linkedinAccessToken,
      action
    });

    if (!linkedinAccessToken) {
      return new Response(
        JSON.stringify({ error: 'LinkedIn access token not configured' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    switch (action) {
      case 'testConnection':
        return await testLinkedInConnection(linkedinAccessToken);
      
      case 'getAdAccounts':
        return await getAdAccounts(linkedinAccessToken);
      
      case 'getCampaigns':
        return await getCampaigns(linkedinAccessToken, params.accountId);
      
      case 'createCampaign':
        return await createCampaign(linkedinAccessToken, params);
      
      case 'updateCampaign':
        return await updateCampaign(linkedinAccessToken, params.campaignId, params);
      
      case 'getCampaignStats':
        return await getCampaignStats(linkedinAccessToken, params.campaignId, params.dateRange);
      
      case 'getCreatives':
        return await getCreatives(linkedinAccessToken, params.campaignId);
      
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
    console.error('LinkedIn Advertising API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function testLinkedInConnection(accessToken: string) {
  try {
    console.log('Testing LinkedIn connection with access token...');
    // Use the same API endpoint as the working LinkedIn Lead Sync API
    const response = await fetch('https://api.linkedin.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-RestLi-Protocol-Version': '2.0.0'
      }
    });

    console.log('LinkedIn connection test response status:', response.status);

    const isValid = response.ok;
    return new Response(
      JSON.stringify({ 
        success: isValid,
        status: response.status,
        message: isValid ? 'LinkedIn Advertising API connection is valid' : 'LinkedIn connection failed'
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

async function getAdAccounts(accessToken: string) {
  try {
    // Use the correct LinkedIn Marketing API endpoint
    const response = await fetch('https://api.linkedin.com/rest/adAccounts?q=search&search=(status:(values:List(ACTIVE,DRAFT)))&pageSize=100', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-RestLi-Protocol-Version': '2.0.0'
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

    // Transform the data to our expected format using the new API structure
    const accounts = data.elements?.map((account: any) => ({
      id: account.id,
      name: account.name,
      status: account.status,
      type: account.type,
      currency: account.currency || 'USD',
      total_budget: 0, // This would need separate API call to get budget info
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
  try {
    // Use the correct LinkedIn Marketing API endpoint for campaigns
    let url = 'https://api.linkedin.com/rest/campaigns?q=search&pageSize=100';
    if (accountId) {
      url += `&search=(account:(values:List(urn:li:sponsoredAccount:${accountId})))`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-RestLi-Protocol-Version': '2.0.0'
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

    // Transform the data to our expected format
    const campaigns = data.elements?.map((campaign: any) => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.runSchedule?.status || campaign.status || 'UNKNOWN',
      budget: parseFloat(campaign.dailyBudget?.amount || campaign.totalBudget?.amount || '0'),
      spent: 0, // This would need separate analytics API call
      impressions: 0, // This would need separate analytics API call  
      clicks: 0, // This would need separate analytics API call
      ctr: 0, // This would need separate analytics API call
      cpc: 0, // This would need separate analytics API call
      conversions: 0, // This would need separate analytics API call
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
}

async function createCampaign(accessToken: string, campaignData: any) {
  try {
    // Note: Creating campaigns requires additional setup and specific account permissions
    // This is a simplified example structure
    const payload = {
      name: campaignData.name,
      type: campaignData.type || 'SPONSORED_CONTENT',
      status: 'DRAFT',
      dailyBudget: {
        amount: campaignData.budget?.toString() || '100',
        currencyCode: 'USD'
      },
      runSchedule: {
        start: Date.now()
      }
    };

    console.log('Creating campaign with payload:', payload);

    // For now, return a mock successful response as actual campaign creation 
    // requires complex setup with targeting, creatives, etc.
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Campaign creation initiated (mock response)',
        data: {
          id: `mock_campaign_${Date.now()}`,
          ...payload
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error creating campaign:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create campaign', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function updateCampaign(accessToken: string, campaignId: string, updateData: any) {
  try {
    const url = `https://api.linkedin.com/rest/campaigns/${campaignId}`;
    
    const payload: any = {};
    if (updateData.status) {
      payload.runSchedule = { status: updateData.status };
    }
    if (updateData.name) {
      payload.name = updateData.name;
    }
    if (updateData.budget) {
      payload.dailyBudget = {
        amount: updateData.budget.toString(),
        currencyCode: 'USD'
      };
    }

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-RestLi-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202401',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('LinkedIn Update Campaign API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LinkedIn Update Campaign API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'LinkedIn API error', details: errorText }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Campaign updated successfully' }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error updating campaign:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update campaign', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function getCampaignStats(accessToken: string, campaignId: string, dateRange?: any) {
  try {
    // LinkedIn Analytics API endpoint for campaign statistics
    const url = `https://api.linkedin.com/rest/analyticsFinderResults?q=analytics&pivot=CAMPAIGN&dateRange=(start:(year:2024,month:1,day:1),end:(year:2024,month:12,day:31))&campaigns=List(urn:li:sponsoredCampaign:${campaignId})&fields=impressions,clicks,costInUsd,externalWebsiteConversions`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-RestLi-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202401'
      }
    });

    console.log('LinkedIn Campaign Stats API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LinkedIn Campaign Stats API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'LinkedIn API error', details: errorText }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    console.log('Campaign stats data received:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error fetching campaign stats:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch campaign stats', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function getCreatives(accessToken: string, campaignId: string) {
  try {
    const url = `https://api.linkedin.com/rest/creatives?q=search&search=(campaign:(values:List(urn:li:sponsoredCampaign:${campaignId})))`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-RestLi-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202401'
      }
    });

    console.log('LinkedIn Creatives API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LinkedIn Creatives API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'LinkedIn API error', details: errorText }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    console.log('Creatives data received:', data);

    return new Response(
      JSON.stringify({ success: true, data: data.elements || [] }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error fetching creatives:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch creatives', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}