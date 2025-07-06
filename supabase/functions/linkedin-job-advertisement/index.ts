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
      console.log('Creating job for career page and LinkedIn...');

      // Save the job directly to local database for the career page
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
        category_name: jobFunction || 'Engineering',
        source: 'Career Page',
        created_by: null // Will be handled by RLS
      };

      console.log('Saving job to database:', jobData);

      const { data: createdJob, error: jobError } = await supabase
        .from('jobs')
        .insert([jobData])
        .select()
        .single();

      if (jobError) {
        console.error('Failed to save job to database:', jobError);
        throw new Error('Failed to create job posting');
      }

      const jobUrl = `${req.headers.get('origin')}/jobs/${createdJob.id}`;
      console.log('Job created successfully:', {
        jobId: createdJob.id,
        jobTitle,
        jobUrl
      });

      // Also post to LinkedIn
      let linkedinMessage = 'Job posted to career page successfully!';
      let linkedinError = null;

      try {
        console.log('Creating LinkedIn post about the job...');
        
        // Create LinkedIn share post about the job opening
        const shareContent = {
          author: 'urn:li:organization:company-id', // You may need to configure this
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: `🚀 We're hiring! New ${jobTitle} position available at Growth Accelerator.${jobDescription ? `\n\n${jobDescription.substring(0, 200)}${jobDescription.length > 200 ? '...' : ''}` : ''}\n\n👉 Apply now: ${jobUrl}`
              },
              shareMediaCategory: 'NONE'
            }
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'CONNECTIONS'
          }
        };

        const linkedinResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${linkedinAccessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          },
          body: JSON.stringify(shareContent)
        });

        if (!linkedinResponse.ok) {
          const errorText = await linkedinResponse.text();
          console.error('LinkedIn posting error:', errorText);
          linkedinError = `LinkedIn posting failed: ${linkedinResponse.status}`;
          linkedinMessage = 'Job posted to career page successfully! LinkedIn posting failed - please check your LinkedIn credentials.';
        } else {
          const linkedinResult = await linkedinResponse.json();
          console.log('LinkedIn post created successfully:', linkedinResult.id);
          linkedinMessage = 'Job posted to career page and LinkedIn successfully!';
        }
      } catch (error) {
        console.error('LinkedIn posting error:', error);
        linkedinError = error.message;
        linkedinMessage = 'Job posted to career page successfully! LinkedIn posting failed - please check your LinkedIn credentials.';
      }

      return new Response(JSON.stringify({
        success: true,
        jobId: createdJob.id,
        jobUrl,
        careerPageUrl: `${req.headers.get('origin')}/jobs`,
        message: linkedinMessage,
        linkedinError
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