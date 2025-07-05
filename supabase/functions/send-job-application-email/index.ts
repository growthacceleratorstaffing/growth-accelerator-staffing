import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface JobApplicationEmailRequest {
  applicantName: string;
  applicantEmail: string;
  jobTitle: string;
  companyName: string;
  applicationData: any;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { applicantName, applicantEmail, jobTitle, companyName, applicationData }: JobApplicationEmailRequest = await req.json();

    // Send email to you (the admin)
    const emailResponse = await resend.emails.send({
      from: "Job Applications <onboarding@resend.dev>",
      to: ["bart@startupaccelerator.nl"], // Your email
      subject: `New Job Application: ${jobTitle} at ${companyName}`,
      html: `
        <h1>New Job Application Received</h1>
        <h2>Position: ${jobTitle}</h2>
        <h3>Company: ${companyName}</h3>
        
        <h3>Applicant Details:</h3>
        <ul>
          <li><strong>Name:</strong> ${applicantName}</li>
          <li><strong>Email:</strong> ${applicantEmail}</li>
          <li><strong>Phone:</strong> ${applicationData.phone || 'Not provided'}</li>
          <li><strong>Mobile:</strong> ${applicationData.mobile || 'Not provided'}</li>
        </ul>
        
        ${applicationData.address ? `
        <h3>Address:</h3>
        <p>
          ${applicationData.address.street?.[0] || ''}<br>
          ${applicationData.address.city || ''}, ${applicationData.address.state || ''} ${applicationData.address.postalCode || ''}<br>
          ${applicationData.address.countryCode || ''}
        </p>
        ` : ''}
        
        ${applicationData.employment?.current ? `
        <h3>Current Employment:</h3>
        <ul>
          <li><strong>Employer:</strong> ${applicationData.employment.current.employer || 'Not provided'}</li>
          <li><strong>Position:</strong> ${applicationData.employment.current.position || 'Not provided'}</li>
        </ul>
        ` : ''}
        
        ${applicationData.education?.[0] ? `
        <h3>Education:</h3>
        <ul>
          <li><strong>Institution:</strong> ${applicationData.education[0].institution || 'Not provided'}</li>
          <li><strong>Course:</strong> ${applicationData.education[0].course || 'Not provided'}</li>
          <li><strong>Date:</strong> ${applicationData.education[0].date || 'Not provided'}</li>
        </ul>
        ` : ''}
        
        <p><strong>Application submitted at:</strong> ${new Date().toLocaleString()}</p>
      `,
    });

    console.log("Job application email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-job-application-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);