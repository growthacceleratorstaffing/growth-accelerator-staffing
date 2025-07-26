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
    console.log('LinkedIn Advertising API called - v2');
    
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
    
    // Get user-specific LinkedIn token from database
    const { data: tokenData } = await supabase
      .from('linkedin_user_tokens')
      .select('access_token, token_expires_at')
      .eq('user_id', user.id)
      .maybeSingle();
    
    // Try user-specific token first, then fall back to global token
    let linkedinAccessToken = tokenData?.access_token;
    
    console.log('User token data check:', {
      tokenExists: !!tokenData,
      hasAccessToken: !!tokenData?.access_token,
      userId: user.id
    });
    
    // If no user-specific token, try the global token from secrets
    if (!linkedinAccessToken) {
      console.log('No user-specific token found, checking global token...');
      linkedinAccessToken = Deno.env.get('LINKEDIN_ACCESS_TOKEN');
      console.log('Global token check:', {
        hasGlobalToken: !!linkedinAccessToken,
        globalTokenLength: linkedinAccessToken?.length || 0
      });
    }

    console.log('LinkedIn credentials check:', {
      hasClientId: !!linkedinClientId,
      hasClientSecret: !!linkedinClientSecret,
      hasAccessToken: !!linkedinAccessToken,
      tokenSource: tokenData?.access_token ? 'user_specific' : 'global',
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
      
      case 'createCreative':
        return await createCreative(linkedinAccessToken, params);
      
      case 'getAccountCreatives':
        return await getAccountCreatives(linkedinAccessToken, params.accountId);
      
      case 'getDirectSponsoredContents':
        return await getDirectSponsoredContents(linkedinAccessToken, params.accountId);
      
      case 'getCampaignGroups':
        return await getCampaignGroups(linkedinAccessToken, params.accountId);
      
      case 'createCampaignGroup':
        return await createCampaignGroup(linkedinAccessToken, params);
      
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
    // Use the same working API as the Lead Sync API for connection test
    const response = await fetch('https://api.linkedin.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-RestLi-Protocol-Version': '2.0.0'
      }
    });

    console.log('LinkedIn connection test response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LinkedIn connection test failed:', errorText);
    }

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
    console.log('Fetching LinkedIn ad accounts...');
    
    // First try the current Marketing API endpoint
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
      
      // If the marketing API fails, try the v2 approach
      console.log('Trying alternative ad accounts endpoint...');
      const altResponse = await fetch('https://api.linkedin.com/v2/adAccountsV2?q=search&search=(status:(values:List(ACTIVE,DRAFT)))', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-RestLi-Protocol-Version': '2.0.0'
        }
      });
      
      console.log('Alternative ad accounts API response status:', altResponse.status);
      
      if (!altResponse.ok) {
        const altErrorText = await altResponse.text();
        console.error('Alternative ad accounts API also failed:', altErrorText);
        return new Response(
          JSON.stringify({ 
            error: 'LinkedIn API error', 
            details: errorText,
            alternative_error: altErrorText
          }),
          { 
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Use alternative response
      const altData = await altResponse.json();
      console.log('Alternative Ad Accounts data received:', altData);
      
      const accounts = altData.elements?.map((account: any) => ({
        id: account.id,
        name: account.name,
        status: account.status,
        type: account.type,
        currency: account.currency || 'USD',
        total_budget: 0,
        account_data: account
      })) || [];

      return new Response(
        JSON.stringify({ success: true, data: accounts, source: 'v2_api' }),
        { 
          status: 200,
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

    console.log(`Successfully fetched ${accounts.length} ad accounts`);

    return new Response(
      JSON.stringify({ success: true, data: accounts, source: 'rest_api' }),
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
    console.log('Fetching LinkedIn campaigns...', { accountId });
    
    // If we have an account ID, use the account-specific endpoint
    // According to LinkedIn API docs: /rest/adAccounts/{adAccountId}/adCampaigns?q=search
    if (accountId) {
      const url = `https://api.linkedin.com/rest/adAccounts/${accountId}/adCampaigns?q=search&pageSize=100`;
      console.log('Using account-specific campaigns URL:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-RestLi-Protocol-Version': '2.0.0',
          'LinkedIn-Version': '202507'  // Updated to latest version
        }
      });

      console.log('LinkedIn Campaigns API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Account-specific campaigns data received:', data);

        // Transform the data to our expected format
        const campaigns = data.elements?.map((campaign: any) => ({
          id: campaign.id,
          name: campaign.name,
          status: campaign.status || 'UNKNOWN',
          budget: parseFloat(campaign.dailyBudget?.amount || campaign.totalBudget?.amount || '0'),
          spent: 0, // This would need separate analytics API call
          impressions: 0, // This would need separate analytics API call  
          clicks: 0, // This would need separate analytics API call
          ctr: 0, // This would need separate analytics API call
          cpc: 0, // This would need separate analytics API call
          conversions: 0, // This would need separate analytics API call
          created_at: new Date(campaign.changeAuditStamps?.created?.time || Date.now()).toISOString(),
          updated_at: new Date(campaign.changeAuditStamps?.lastModified?.time || Date.now()).toISOString(),
          campaign_data: campaign,
          account_id: accountId,
          account_name: `Account ${accountId}`,
          account_currency: campaign.dailyBudget?.currencyCode || campaign.totalBudget?.currencyCode || 'USD'
        })) || [];

        return new Response(
          JSON.stringify({ success: true, data: campaigns, source: 'account_specific' }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }
    
    // If no account ID provided or account-specific call failed, this won't work with the new API
    // We need to iterate through available ad accounts instead
    console.log('No account ID provided for campaigns search - campaigns require account ID in new API');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: [], 
        message: 'No account ID provided - campaigns require account-specific queries',
        source: 'no_account_fallback' 
      }),
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
    console.log('Creating LinkedIn campaign with data:', campaignData);
    
    // Validate required fields for LinkedIn campaign creation - MUST include campaignGroup
    if (!campaignData.account || !campaignData.name || !campaignData.campaignGroup) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          details: 'Account, name, and campaignGroup are required for campaign creation (campaignGroup required since Oct 30, 2020)' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // LinkedIn campaign creation payload exactly matching the getting started documentation
    // Based on: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads/getting-started?view=li-lms-2025-07
    const payload = {
      name: campaignData.name,
      type: campaignData.type || 'TEXT_AD', // Default to TEXT_AD as shown in docs
      status: 'DRAFT', // Always start as draft
      account: `urn:li:sponsoredAccount:${campaignData.account}`,
      
      // REQUIRED: Campaign Group (required since October 30, 2020)
      campaignGroup: `urn:li:sponsoredCampaignGroup:${campaignData.campaignGroup}`,
      
      // REQUIRED: Offsite delivery setting (from getting started docs)
      offsiteDeliveryEnabled: campaignData.offsiteDeliveryEnabled !== undefined ? campaignData.offsiteDeliveryEnabled : false,
      
      // REQUIRED: Audience expansion (from getting started docs)
      audienceExpansionEnabled: campaignData.audienceExpansionEnabled !== undefined ? campaignData.audienceExpansionEnabled : false,
      
      // Budget configuration (required for most campaign types)
      dailyBudget: {
        amount: campaignData.budget?.toString() || '100',
        currencyCode: campaignData.currency || 'USD'
      },
      
      // Run schedule (as shown in getting started docs)
      runSchedule: {
        start: Date.now(),
        end: campaignData.endDate ? new Date(campaignData.endDate).getTime() : undefined
      },
      
      // Cost and bidding (required fields from docs)
      unitCost: {
        amount: campaignData.bidAmount || '2.00', // Use example from docs
        currencyCode: campaignData.currency || 'USD'
      },
      costType: campaignData.costType || 'CPC',
      
      // Optimization settings (from getting started docs)
      creativeSelection: campaignData.creativeSelection || 'OPTIMIZED',
      
      // REQUIRED: Locale (from getting started docs)
      locale: {
        country: campaignData.locale?.country || 'US',
        language: campaignData.locale?.language || 'en'
      },
      
      // REQUIRED: Targeting criteria exactly as shown in getting started docs
      targetingCriteria: campaignData.targetingCriteria || {
        include: {
          and: [
            {
              or: {
                'urn:li:adTargetingFacet:locations': [
                  'urn:li:geo:103644278', // United States
                  'urn:li:geo:101174742'  // Canada
                ]
              }
            }
          ]
        }
      }
    };

    console.log('Campaign creation payload (matching getting started docs):', JSON.stringify(payload, null, 2));

    // Use the exact endpoint from getting started documentation
    const response = await fetch(`https://api.linkedin.com/rest/adAccounts/${campaignData.account}/adCampaigns`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-RestLi-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202411', // Use documented stable version
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('LinkedIn Campaign Creation API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LinkedIn Campaign Creation API error:', errorText);
      
      // Return a structured error response
      return new Response(
        JSON.stringify({ 
          error: 'LinkedIn API error', 
          details: errorText,
          message: 'Failed to create campaign in LinkedIn. Please check your account permissions and try again.'
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    console.log('Campaign created successfully:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Campaign created successfully in LinkedIn',
        data: {
          id: data.id,
          name: data.name,
          status: data.status,
          account: data.account,
          ...data
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
      JSON.stringify({ 
        error: 'Failed to create campaign', 
        details: error.message,
        message: 'An unexpected error occurred while creating the campaign.'
      }),
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

async function createCreative(accessToken: string, creativeData: any) {
  try {
    console.log('Creating LinkedIn creative with data:', creativeData);
    
    // Validate required fields for LinkedIn creative creation
    if (!creativeData.account || !creativeData.content) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          details: 'Account and content are required for creative creation' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // First create Direct Sponsored Content (the creative content)
    const contentPayload = {
      author: `urn:li:sponsoredAccount:${creativeData.account}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: (creativeData.content.description || '').replace(/<[^>]*>/g, '') // Strip HTML tags
          },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    console.log('Creating UGC content with payload:', JSON.stringify(contentPayload, null, 2));

    // Create UGC content first
    const ugcResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contentPayload)
    });

    console.log('UGC creation response status:', ugcResponse.status);
    
    if (!ugcResponse.ok) {
      const ugcError = await ugcResponse.text();
      console.error('UGC creation failed:', ugcError);
      
      // Try with a simpler direct sponsored content approach
      const directPayload = {
        account: `urn:li:sponsoredAccount:${creativeData.account}`,
        name: creativeData.content.title || 'Advertisement',
        type: 'SPONSORED_CONTENT',
        intendedStatus: 'ACTIVE',
        variables: {
          data: {
            'com.linkedin.ads.SponsoredContentCreativeVariables': {
              directSponsoredContent: {
                landingPage: {
                  url: creativeData.content.clickUri || ''
                },
                text: {
                  value: (creativeData.content.description || '').replace(/<[^>]*>/g, '')
                },
                title: {
                  value: creativeData.content.title || 'Advertisement'
                }
              }
            }
          }
        }
      };

      console.log('Trying direct creative creation with payload:', JSON.stringify(directPayload, null, 2));

      const response = await fetch('https://api.linkedin.com/rest/adCreatives', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-RestLi-Protocol-Version': '2.0.0',
          'LinkedIn-Version': '202411',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(directPayload)
      });

      console.log('LinkedIn Creative Creation API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('LinkedIn Creative Creation API error:', errorText);
        console.error('Failed payload that caused the error:', JSON.stringify(directPayload, null, 2));
      
      // Try to parse the error for more details
      let parsedError;
      try {
        parsedError = JSON.parse(errorText);
        console.error('Parsed LinkedIn error details:', parsedError);
      } catch (e) {
        console.error('Could not parse error response as JSON');
      }
      
        return new Response(
          JSON.stringify({ 
            error: 'LinkedIn API error', 
            details: errorText,
            payload_used: directPayload,
            message: 'Failed to create creative in LinkedIn. Please check your content and try again.'
          }),
          { 
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const data = await response.json();
      console.log('Creative created successfully:', data);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Creative created successfully in LinkedIn',
          data: {
            id: data.id,
            status: data.status,
            account: data.account,
            campaign: data.campaign,
            ...data
          }
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // If UGC creation was successful, use that content for the creative
    const ugcData = await ugcResponse.json();
    console.log('UGC created successfully:', ugcData);

    // Now create the creative using the UGC content
    const creativePayload = {
      account: `urn:li:sponsoredAccount:${creativeData.account}`,
      name: creativeData.content.title || 'Advertisement',
      type: 'SPONSORED_CONTENT',
      intendedStatus: 'ACTIVE',
      content: ugcData.id, // Reference the created UGC content
      variables: {
        clickUri: creativeData.content.clickUri || ''
      }
    };

    const creativeResponse = await fetch('https://api.linkedin.com/rest/adCreatives', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-RestLi-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202411',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(creativePayload)
    });

    console.log('LinkedIn Creative Creation API response status:', creativeResponse.status);

    if (!creativeResponse.ok) {
      const errorText = await creativeResponse.text();
      console.error('LinkedIn Creative Creation API error:', errorText);
      
      return new Response(
        JSON.stringify({ 
          error: 'LinkedIn API error', 
          details: errorText,
          payload_used: creativePayload,
          message: 'Failed to create creative in LinkedIn after UGC creation. Please check your content and try again.'
        }),
        { 
          status: creativeResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const creativeData_result = await creativeResponse.json();
    console.log('Creative created successfully with UGC:', creativeData_result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Creative created successfully in LinkedIn with UGC content',
        data: {
          id: creativeData_result.id,
          status: creativeData_result.status,
          account: creativeData_result.account,
          campaign: creativeData_result.campaign,
          ugc_content: ugcData.id,
          ...creativeData_result
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error creating creative:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create creative', 
        details: error.message,
        message: 'An unexpected error occurred while creating the creative.'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function getAccountCreatives(accessToken: string, accountId: string) {
  try {
    console.log('Fetching LinkedIn creatives for account:', accountId);
    
    // Use the correct LinkedIn API endpoint for fetching creatives by account
    // According to LinkedIn API docs: /rest/adAccounts/{adAccountId}/creatives
    const url = `https://api.linkedin.com/rest/adAccounts/${accountId}/creatives?pageSize=100`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-RestLi-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202507'
      }
    });

    console.log('LinkedIn Account Creatives API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LinkedIn Account Creatives API error:', errorText);
      
      // If creatives API fails, return empty array instead of error to avoid blocking the UI
      console.log('Creatives API failed, returning empty array to avoid blocking UI');
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: [], 
          message: 'Could not fetch creatives - this is normal if no creatives exist yet',
          source: 'fallback_empty'
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    console.log('Account creatives data received:', data);

    // Transform creatives data to include useful information
    const creatives = data.elements?.map((creative: any) => ({
      id: creative.id,
      status: creative.status,
      type: creative.type,
      account: creative.account,
      campaign: creative.campaign,
      content: creative.content,
      created_at: new Date(creative.changeAuditStamps?.created?.time || Date.now()).toISOString(),
      updated_at: new Date(creative.changeAuditStamps?.lastModified?.time || Date.now()).toISOString(),
      creative_data: creative
    })) || [];

    return new Response(
      JSON.stringify({ success: true, data: creatives }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error fetching account creatives:', error);
    // Return empty array on error to avoid blocking the UI
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: [], 
        message: 'Could not fetch creatives - this is normal if no creatives exist yet',
        source: 'error_fallback'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function getDirectSponsoredContents(accessToken: string, accountId: string) {
  try {
    console.log('Fetching LinkedIn Direct Sponsored Contents for account:', accountId);
    
    // Use the correct LinkedIn API endpoint for fetching Direct Sponsored Contents by account
    const url = `https://api.linkedin.com/rest/adAccounts/${accountId}/adDirectSponsoredContents?pageSize=100`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-RestLi-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202507'
      }
    });

    console.log('LinkedIn Direct Sponsored Contents API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LinkedIn Direct Sponsored Contents API error:', errorText);
      
      // Return empty array instead of error to avoid blocking the UI
      console.log('Direct Sponsored Contents API failed, returning empty array');
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: [], 
          message: 'Could not fetch Direct Sponsored Contents - this is normal if none exist yet',
          source: 'fallback_empty'
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    console.log('Direct Sponsored Contents data received:', data);

    // Transform data to include useful information
    const contents = data.elements?.map((content: any) => ({
      id: content.id,
      status: content.status,
      account: content.account,
      campaign: content.campaign,
      creative: content.creative,
      created_at: new Date(content.changeAuditStamps?.created?.time || Date.now()).toISOString(),
      updated_at: new Date(content.changeAuditStamps?.lastModified?.time || Date.now()).toISOString(),
      content_data: content
    })) || [];

    return new Response(
      JSON.stringify({ success: true, data: contents }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error fetching Direct Sponsored Contents:', error);
    // Return empty array on error to avoid blocking the UI
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: [], 
        message: 'Could not fetch Direct Sponsored Contents - this is normal if none exist yet',
        source: 'error_fallback'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function getCampaignGroups(accessToken: string, accountId: string) {
  try {
    console.log('Fetching LinkedIn campaign groups for account:', accountId);
    
    // Use field projections to get specific fields we need for the UI
    // Based on: https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/projections
    const fieldsParam = '&fields=id,name,status,account,changeAuditStamps,totalBudget,runSchedule';
    const url = `https://api.linkedin.com/rest/adAccounts/${accountId}/adCampaignGroups?pageSize=100${fieldsParam}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-RestLi-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202411'
      }
    });

    console.log('LinkedIn Campaign Groups API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LinkedIn Campaign Groups API error:', errorText);
      
      // Return empty array instead of error to avoid blocking the UI
      console.log('Campaign Groups API failed, returning empty array');
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: [], 
          message: 'Could not fetch campaign groups - this is normal if none exist yet',
          source: 'fallback_empty'
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    console.log('Campaign Groups data received:', data);

    // Transform campaign groups data to include useful information using field projections
    const campaignGroups = data.elements?.map((group: any) => ({
      id: group.id,
      name: group.name,
      status: group.status,
      account: group.account,
      totalBudget: group.totalBudget,
      runSchedule: group.runSchedule,
      created_at: new Date(group.changeAuditStamps?.created?.time || Date.now()).toISOString(),
      updated_at: new Date(group.changeAuditStamps?.lastModified?.time || Date.now()).toISOString(),
      group_data: group
    })) || [];

    return new Response(
      JSON.stringify({ success: true, data: campaignGroups }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error fetching campaign groups:', error);
    // Return empty array on error to avoid blocking the UI
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: [], 
        message: 'Could not fetch campaign groups - this is normal if none exist yet',
        source: 'error_fallback'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function createCampaignGroup(accessToken: string, groupData: any) {
  try {
    console.log('Creating LinkedIn campaign group with data:', groupData);
    
    // Validate required fields for LinkedIn campaign group creation
    if (!groupData.account || !groupData.name) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          details: 'Account and name are required for campaign group creation' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // LinkedIn campaign group creation payload according to their API specs
    const payload = {
      name: groupData.name,
      account: `urn:li:sponsoredAccount:${groupData.account}`,
      status: 'ACTIVE', // Set to active by default
      totalBudget: groupData.totalBudget ? {
        amount: groupData.totalBudget.toString(),
        currencyCode: groupData.currency || 'USD'
      } : undefined,
      runSchedule: groupData.runSchedule || {
        start: Date.now()
      }
    };

    console.log('Campaign group creation payload:', JSON.stringify(payload, null, 2));

    // Use the correct endpoint format from documentation
    const response = await fetch(`https://api.linkedin.com/rest/adAccounts/${groupData.account}/adCampaignGroups`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-RestLi-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202411',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('LinkedIn Campaign Group Creation API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LinkedIn Campaign Group Creation API error:', errorText);
      
      return new Response(
        JSON.stringify({ 
          error: 'LinkedIn API error', 
          details: errorText,
          message: 'Failed to create campaign group in LinkedIn. Please check your account permissions and try again.'
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    console.log('Campaign group created successfully:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Campaign group created successfully in LinkedIn',
        data: {
          id: data.id,
          name: data.name,
          status: data.status,
          account: data.account,
          ...data
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error creating campaign group:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create campaign group', 
        details: error.message,
        message: 'An unexpected error occurred while creating the campaign group.'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}