import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

    // Prepare candidate data for JobAdder
    const jobAdderCandidate = {
      firstName: candidateData.firstName,
      lastName: candidateData.lastName,
      email: candidateData.email,
      phone: candidateData.phone,
      address: {
        street: candidateData.location ? [candidateData.location] : [],
      },
      employment: candidateData.position ? {
        current: {
          position: candidateData.position,
          employer: candidateData.company || "Unknown",
        }
      } : undefined,
      skills: candidateData.skills ? candidateData.skills.split(',').map(s => s.trim()) : [],
      notes: candidateData.notes ? [{ 
        text: candidateData.notes,
        type: "general",
        createdAt: new Date().toISOString()
      }] : [],
      source: "Manual Entry - Growth Accelerator Platform"
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

    // Sync to JobAdder
    try {
      const jobAdderResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/jobadder-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({
          endpoint: 'candidates',
          method: 'POST',
          data: jobAdderCandidate
        })
      });

      if (jobAdderResponse.ok) {
        results.jobAdder = await jobAdderResponse.json();
        console.log("JobAdder sync successful:", results.jobAdder);
      } else {
        const error = await jobAdderResponse.text();
        results.errors.push(`JobAdder sync failed: ${error}`);
        console.error("JobAdder sync error:", error);
      }
    } catch (error) {
      results.errors.push(`JobAdder sync error: ${error.message}`);
      console.error("JobAdder sync exception:", error);
    }

    // Sync to Workable (if configured)
    const workableApiToken = Deno.env.get('WORKABLE_API_TOKEN');
    const workableSubdomain = Deno.env.get('WORKABLE_SUBDOMAIN');

    if (workableApiToken && workableSubdomain) {
      try {
        const workableResponse = await fetch(`https://${workableSubdomain}.workablehr.com/spi/v3/candidates`, {
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
          console.error("Workable sync error:", error);
        }
      } catch (error) {
        results.errors.push(`Workable sync error: ${error.message}`);
        console.error("Workable sync exception:", error);
      }
    } else {
      results.errors.push("Workable credentials not configured");
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