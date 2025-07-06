import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CandidateData {
  candidateId: string;
  candidateData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    position?: string;
    company?: string;
    location?: string;
    skills?: string;
    notes?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateId, candidateData }: CandidateData = await req.json();

    console.log("Syncing candidate to systems:", { candidateId, candidateData });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Prepare candidate data for JobAdder API
    const jobAdderCandidate = {
      firstName: candidateData.firstName,
      lastName: candidateData.lastName,
      email: candidateData.email,
      phone: candidateData.phone || "",
      mobile: candidateData.phone || "",
      address: {
        street1: candidateData.location || "",
        city: candidateData.location ? candidateData.location.split(',')[0] : "",
        state: candidateData.location ? candidateData.location.split(',')[1]?.trim() : "",
        postalCode: "",
        country: "Netherlands"
      },
      employment: candidateData.position && candidateData.company ? [{
        position: candidateData.position,
        employer: candidateData.company,
        current: true,
        startDate: new Date().toISOString().split('T')[0]
      }] : [],
      skills: candidateData.skills ? candidateData.skills.split(',').map(s => s.trim()) : [],
      notes: candidateData.notes || "",
      source: "Manual Entry - Growth Accelerator Platform",
      status: "Available"
    };

    // Prepare candidate data for Workable
    const workableCandidate = {
      candidate: {
        name: `${candidateData.firstName} ${candidateData.lastName}`,
        firstname: candidateData.firstName,
        lastname: candidateData.lastName,
        email: candidateData.email,
        phone: candidateData.phone,
        address: candidateData.location,
        cover_letter: candidateData.notes || "",
        skills: candidateData.skills,
        experience_in_years: null,
        source_id: null,
        source_details: {
          source: "manual",
          details: "Added via Growth Accelerator Platform"
        }
      }
    };

    const results = {
      jobAdder: null as any,
      workable: null as any,
      errors: [] as string[]
    };

    // Sync to JobAdder using the existing jobadder-api edge function
    try {
      console.log("Calling JobAdder API to create candidate:", jobAdderCandidate);
      
      const { data: jobAdderResult, error: jobAdderError } = await supabase.functions.invoke('jobadder-api', {
        body: {
          endpoint: 'candidates',
          method: 'POST',
          data: jobAdderCandidate
        }
      });

      if (jobAdderError) {
        throw jobAdderError;
      }

      results.jobAdder = jobAdderResult;
      console.log("JobAdder sync successful:", results.jobAdder);
      
    } catch (error) {
      results.errors.push(`JobAdder sync error: ${error.message}`);
      console.error("JobAdder sync exception:", error);
    }

    // Sync to Workable (if configured)
    const workableApiToken = Deno.env.get('WORKABLE_API_TOKEN');
    const workableSubdomain = Deno.env.get('WORKABLE_SUBDOMAIN');

    if (workableApiToken && workableSubdomain) {
      try {
        console.log("Calling Workable API to create candidate:", workableCandidate);
        
        const workableResponse = await fetch(`https://${workableSubdomain}.workable.com/spi/v3/candidates`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${workableApiToken}`,
          },
          body: JSON.stringify(workableCandidate)
        });

        if (workableResponse.ok) {
          results.workable = await workableResponse.json();
          console.log("Workable sync successful:", results.workable);
        } else {
          const error = await workableResponse.text();
          results.errors.push(`Workable sync failed: ${error}`);
          console.error("Workable sync error:", error, workableResponse.status);
        }
      } catch (error) {
        results.errors.push(`Workable sync error: ${error.message}`);
        console.error("Workable sync exception:", error);
      }
    } else {
      console.log("Workable credentials not configured, skipping Workable sync");
      results.errors.push("Workable credentials not configured - skipping sync");
    }

    // Return results
    const response = {
      success: results.errors.length === 0,
      candidateId,
      syncResults: results,
      message: results.errors.length === 0 
        ? "Candidate successfully synced to all systems"
        : `Candidate synced with some errors: ${results.errors.join(', ')}`
    };

    console.log("Sync complete:", response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in sync-candidate-to-systems function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);