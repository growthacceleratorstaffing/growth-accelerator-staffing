import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const azureOpenAIKey = Deno.env.get('AZURE_OPENAI_API_KEY');
const azureOpenAIEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');

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
    console.log('=== AZURE OPENAI DEBUG START ===');
    console.log('Azure OpenAI Key available:', !!azureOpenAIKey);
    console.log('Azure OpenAI Endpoint available:', !!azureOpenAIEndpoint);
    console.log('Azure OpenAI Endpoint:', azureOpenAIEndpoint);
    
    const { prompt } = await req.json();
    console.log('Received prompt:', prompt);

    if (!prompt) {
      console.log('ERROR: No prompt provided');
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!azureOpenAIKey || !azureOpenAIEndpoint) {
      console.log('ERROR: Missing Azure OpenAI credentials');
      return new Response(
        JSON.stringify({ error: 'Azure OpenAI credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(`${azureOpenAIEndpoint}/openai/deployments/gpt-4o/chat/completions?api-version=2024-08-01-preview`, {
      method: 'POST',
      headers: {
        'api-key': azureOpenAIKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { 
            role: 'system', 
            content: `You are a professional job posting generator. Based on the user's description, generate a complete job posting with the following structure as JSON:

{
  "jobTitle": "string - clear, specific job title",
  "company": "string - suggest a relevant company name or use 'Your Company'",
  "location": "string - suggest appropriate location based on context or use 'Remote'",
  "workType": "string - one of: Full-time, Part-time, Contract, Freelance, Internship",
  "salaryLow": "number - minimum salary estimate",
  "salaryHigh": "number - maximum salary estimate",
  "jobDescription": "string - comprehensive job description including responsibilities, requirements, and benefits",
  "skillTags": "string - comma-separated list of required skills",
  "category": "string - job category like 'Technology', 'Marketing', etc."
}

Make the salary estimates realistic for the role and location. Keep descriptions professional and comprehensive.`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      return new Response(
        JSON.stringify({ error: 'AI service unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    // Try to parse the JSON response
    let jobData;
    try {
      jobData = JSON.parse(generatedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', generatedContent);
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ jobData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-job-with-ai function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});