import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobTitle, jobDescription, budget, duration, targetAudience, campaignName } = await req.json();

    // Get LinkedIn access token from secrets
    const linkedinAccessToken = Deno.env.get('LINKEDIN_ACCESS_TOKEN');
    if (!linkedinAccessToken) {
      throw new Error('LinkedIn access token not configured');
    }

    // Create LinkedIn campaign
    const campaignData = {
      name: campaignName,
      type: "SPONSORED_CONTENT",
      status: "DRAFT",
      costType: "CPM",
      dailyBudget: {
        amount: (budget / duration).toFixed(2),
        currencyCode: "USD"
      },
      totalBudget: {
        amount: budget.toString(),
        currencyCode: "USD"
      },
      runSchedule: {
        start: new Date().getTime(),
        end: new Date(Date.now() + duration * 24 * 60 * 60 * 1000).getTime()
      },
      targeting: {
        includedTargetingFacets: {
          industries: [],
          locations: [],
          skills: []
        }
      }
    };

    // Create the campaign
    const campaignResponse = await fetch('https://api.linkedin.com/v2/adCampaignsV2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${linkedinAccessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(campaignData)
    });

    if (!campaignResponse.ok) {
      const errorText = await campaignResponse.text();
      console.error('LinkedIn Campaign API error:', errorText);
      throw new Error(`Failed to create LinkedIn campaign: ${campaignResponse.status}`);
    }

    const campaign = await campaignResponse.json();

    // Create job ad creative
    const creativeData = {
      campaign: campaign.id,
      status: "ACTIVE",
      type: "SPONSORED_CONTENT",
      content: {
        title: jobTitle,
        description: jobDescription || `Join our team as a ${jobTitle}. Apply now!`,
        callToAction: {
          type: "APPLY_NOW",
          url: `${req.headers.get('origin')}/jobs`
        }
      }
    };

    const creativeResponse = await fetch('https://api.linkedin.com/v2/adCreativesV2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${linkedinAccessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(creativeData)
    });

    if (!creativeResponse.ok) {
      const errorText = await creativeResponse.text();
      console.error('LinkedIn Creative API error:', errorText);
      throw new Error(`Failed to create LinkedIn creative: ${creativeResponse.status}`);
    }

    const creative = await creativeResponse.json();

    // Log the successful creation
    console.log('LinkedIn job advertisement created:', {
      campaignId: campaign.id,
      creativeId: creative.id,
      jobTitle,
      budget,
      duration
    });

    return new Response(JSON.stringify({
      success: true,
      campaignId: campaign.id,
      creativeId: creative.id,
      message: 'LinkedIn job advertisement created successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('LinkedIn job advertisement error:', error);
    
    return new Response(JSON.stringify({
      error: error.message || 'Failed to create LinkedIn job advertisement',
      details: 'Please check your LinkedIn API credentials and try again'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});