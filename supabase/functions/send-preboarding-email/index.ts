import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PreboardingEmailRequest {
  candidateName: string;
  candidateEmail: string;
  position?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateName, candidateEmail, position }: PreboardingEmailRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "Growth Accelerator <onboarding@resend.dev>",
      to: [candidateEmail],
      subject: "Welcome to Growth Accelerator - Preboarding Process",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; font-size: 28px; margin-bottom: 10px;">Welcome to Growth Accelerator!</h1>
            <p style="color: #666; font-size: 16px;">We're excited to begin your preboarding journey</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; color: white; margin-bottom: 30px;">
            <h2 style="margin: 0 0 10px 0;">Hello ${candidateName}!</h2>
            <p style="margin: 0; opacity: 0.9;">
              ${position ? `Congratulations on your new position as ${position}!` : 'Congratulations on joining our team!'} 
              We're thrilled to have you aboard.
            </p>
          </div>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
            <h3 style="color: #333; margin-top: 0;">Your Preboarding Journey</h3>
            <p style="color: #666; line-height: 1.6;">
              Over the next few days, we'll guide you through our 4-step preboarding process to ensure you're fully prepared for your first day:
            </p>
            
            <div style="display: grid; gap: 15px; margin-top: 20px;">
              <div style="display: flex; align-items: center; padding: 10px; background: white; border-radius: 8px;">
                <div style="background: #667eea; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">1</div>
                <div>
                  <strong>Welcome Email</strong><br>
                  <small style="color: #666;">Complete - You're receiving this email!</small>
                </div>
              </div>
              
              <div style="display: flex; align-items: center; padding: 10px; background: white; border-radius: 8px;">
                <div style="background: #667eea; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">2</div>
                <div>
                  <strong>Create Account</strong><br>
                  <small style="color: #666;">Set up your company accounts and access credentials</small>
                </div>
              </div>
              
              <div style="display: flex; align-items: center; padding: 10px; background: white; border-radius: 8px;">
                <div style="background: #667eea; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">3</div>
                <div>
                  <strong>Sign Contract</strong><br>
                  <small style="color: #666;">Complete your employment contract signing</small>
                </div>
              </div>
              
              <div style="display: flex; align-items: center; padding: 10px; background: white; border-radius: 8px;">
                <div style="background: #667eea; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">4</div>
                <div>
                  <strong>Team Introduction</strong><br>
                  <small style="color: #666;">Meet your team members and schedule initial meetings</small>
                </div>
              </div>
            </div>
          </div>

          <div style="background: white; border: 2px solid #e9ecef; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
            <h3 style="color: #333; margin-top: 0;">What's Next?</h3>
            <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">
              Our HR team will be in touch within the next 24 hours to guide you through steps 2-4. In the meantime, please:
            </p>
            <ul style="color: #666; line-height: 1.6;">
              <li>Keep an eye on your email for further instructions</li>
              <li>Prepare any documents you might need for the contract signing</li>
              <li>Think of any questions you'd like to ask during your team introduction</li>
            </ul>
          </div>

          <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e9ecef;">
            <p style="color: #666; margin: 0; font-size: 14px;">
              If you have any questions, please don't hesitate to reach out to us.<br>
              We're here to make your transition as smooth as possible!
            </p>
            <div style="margin-top: 15px;">
              <strong style="color: #333;">Growth Accelerator Team</strong><br>
              <a href="mailto:bart@growthaccelerator.nl" style="color: #667eea; text-decoration: none;">bart@growthaccelerator.nl</a>
            </div>
          </div>
        </div>
      `,
    });

    console.log("Preboarding email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-preboarding-email function:", error);
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