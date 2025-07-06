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
    const { jobTitle, jobDescription, companyId, city, jobFunction, employmentType, workplaceType, duration } = await req.json();

    // Get LinkedIn credentials from secrets
    const linkedinClientId = Deno.env.get('LINKEDIN_CLIENT_ID');
    const linkedinClientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET');
    const linkedinAccessToken = Deno.env.get('LINKEDIN_ACCESS_TOKEN');
    
    if (!linkedinClientId || !linkedinClientSecret) {
      throw new Error('LinkedIn client credentials not configured');
    }

    if (!linkedinAccessToken) {
      throw new Error('LinkedIn access token not configured. Please authenticate first.');
    }

    // Create LinkedIn job posting (not sponsored content)
    const jobPostingData = {
      companyId: `urn:li:organization:${companyId}`,
      title: jobTitle,
      description: jobDescription,
      location: {
        countryCode: "US", // Should be configurable
        city: city || "Remote"
      },
      jobFunction: {
        code: jobFunction || "eng" // Engineering default
      },
      employmentType: employmentType || "FULL_TIME",
      workplaceType: workplaceType || "REMOTE",
      listedAt: Date.now(),
      expireAt: Date.now() + ((duration || 30) * 24 * 60 * 60 * 1000)
    };

    // Create the job posting using LinkedIn Jobs API
    const jobResponse = await fetch('https://api.linkedin.com/v2/jobs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${linkedinAccessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(jobPostingData)
    });

    if (!jobResponse.ok) {
      const errorText = await jobResponse.text();
      console.error('LinkedIn Jobs API error:', errorText);
      throw new Error(`Failed to create LinkedIn job posting: ${jobResponse.status}`);
    }

    const jobPosting = await jobResponse.json();

    // Log the successful creation
    console.log('LinkedIn job posting created:', {
      jobId: jobPosting.id,
      jobTitle,
      duration
    });

    return new Response(JSON.stringify({
      success: true,
      jobId: jobPosting.id,
      jobUrl: `https://www.linkedin.com/jobs/view/${jobPosting.id}`,
      message: 'LinkedIn job posting created successfully'
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