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
    const { type, jobTitle, jobDescription, companyId, city, jobFunction, employmentType, workplaceType, duration, budget, targetAudience, campaignName } = await req.json();

    console.log('Request body:', { type, jobTitle, companyId });

    // Get LinkedIn credentials from secrets
    const linkedinClientId = Deno.env.get('LINKEDIN_CLIENT_ID');
    const linkedinClientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET');
    const linkedinAccessToken = Deno.env.get('LINKEDIN_ACCESS_TOKEN');
    
    console.log('LinkedIn credentials check:', {
      hasClientId: !!linkedinClientId,
      hasClientSecret: !!linkedinClientSecret,
      hasAccessToken: !!linkedinAccessToken,
      tokenLength: linkedinAccessToken?.length || 0
    });
    
    if (!linkedinClientId || !linkedinClientSecret) {
      throw new Error('LinkedIn client credentials not configured');
    }

    if (!linkedinAccessToken) {
      throw new Error('LinkedIn access token not configured. Please authenticate first.');
    }

    if (type === 'job-posting') {
      // Test LinkedIn API authentication first
      console.log('Testing LinkedIn API authentication...');
      const testResponse = await fetch('https://api.linkedin.com/v2/people/~', {
        headers: {
          'Authorization': `Bearer ${linkedinAccessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('LinkedIn auth test response:', testResponse.status);
      
      if (!testResponse.ok) {
        const testError = await testResponse.text();
        console.error('LinkedIn authentication failed:', testError);
        
        return new Response(JSON.stringify({
          error: `LinkedIn authentication failed (${testResponse.status})`,
          details: 'Please check your LinkedIn access token. It may be expired or have insufficient permissions.',
          needsReauth: true
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create LinkedIn company post about the job opening
      const jobPostContent = `🚀 We're hiring! ${jobTitle}

${jobDescription}

📍 Location: ${city || 'Remote'}
💼 Employment Type: ${employmentType?.replace('_', '-') || 'Full-time'}
🏢 Workplace: ${workplaceType || 'Remote'}

Ready to join our team? Apply now: ${req.headers.get('origin')}/jobs

#hiring #jobs #${jobFunction || 'engineering'} #careers`;

      const shareData = {
        author: `urn:li:organization:${companyId}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: jobPostContent
            },
            shareMediaCategory: "NONE"
          }
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
      };

      console.log('Creating LinkedIn company post with data:', shareData);

      const shareResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${linkedinAccessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        },
        body: JSON.stringify(shareData)
      });

      console.log('LinkedIn share API response status:', shareResponse.status);

      if (!shareResponse.ok) {
        const errorText = await shareResponse.text();
        console.error('LinkedIn Share API error:', errorText);
        
        return new Response(JSON.stringify({
          error: `LinkedIn Share API Error (${shareResponse.status})`,
          details: errorText,
          apiEndpoint: 'LinkedIn UGC Posts API',
          suggestion: 'Make sure your LinkedIn token has w_member_social permission and the company ID is correct'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const sharePost = await shareResponse.json();

      // Also save the job to local database for the career page
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const jobData = {
        title: jobTitle,
        job_description: jobDescription,
        company_name: 'Growth Accelerator', // You can make this configurable
        location_name: city || 'Remote',
        work_type_name: employmentType?.replace('_', '-') || 'Full-time',
        source: 'LinkedIn Career Page',
        created_by: null // Will be handled by RLS
      };

      const { data: createdJob, error: jobError } = await supabase
        .from('jobs')
        .insert([jobData])
        .select()
        .single();

      if (jobError) {
        console.warn('Failed to save job to database:', jobError);
      }

      console.log('LinkedIn job post shared successfully:', {
        postId: sharePost.id,
        jobTitle,
        localJobId: createdJob?.id
      });

      return new Response(JSON.stringify({
        success: true,
        postId: sharePost.id,
        postUrl: `https://www.linkedin.com/feed/update/${sharePost.id}`,
        jobId: createdJob?.id,
        jobUrl: `${req.headers.get('origin')}/jobs/${createdJob?.id}`,
        message: 'Job shared on LinkedIn company page successfully!'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (type === 'sponsored-content') {
      // Create LinkedIn sponsored content campaign (paid)
      const campaignData = {
        name: campaignName || jobTitle,
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
            skills: targetAudience ? [targetAudience] : []
          }
        }
      };

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

      console.log('LinkedIn advertisement created:', {
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
    } else {
      throw new Error('Invalid type. Must be "job-posting" or "sponsored-content"');
    }

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