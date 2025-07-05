import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY');
const azureEndpoint = 'https://aistudioaiservices773784968662.openai.azure.com';

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
    const { prompt } = await req.json();

    console.log('Received prompt:', prompt);
    console.log('Azure API Key present:', !!azureApiKey);

    if (!azureApiKey) {
      console.error('Azure OpenAI API key is missing');
      return new Response(
        JSON.stringify({ error: 'Azure OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are a professional job posting generator. Based on the user's description, generate a complete job posting with the following structure as a valid JSON object only (no other text):

{
  "jobTitle": "clear, specific job title",
  "company": "suggest a relevant company name or use 'Your Company'",
  "location": "suggest appropriate location based on context or use 'Remote'",
  "workType": "Full-time, Part-time, Contract, Freelance, or Internship",
  "salaryLow": 50000,
  "salaryHigh": 80000,
  "jobDescription": "comprehensive job description including responsibilities, requirements, and benefits (minimum 200 words)",
  "skillTags": "comma-separated list of required skills",
  "category": "job category like Technology, Marketing, Finance, etc."
}

Make the salary estimates realistic for the role and location. Keep descriptions professional and comprehensive. Only return the JSON object, nothing else.`;

    const response = await fetch(`${azureEndpoint}/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-15-preview`, {
      method: 'POST',
      headers: {
        'api-key': azureApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Azure OpenAI API error:', response.status, response.statusText, errorData);
      return new Response(
        JSON.stringify({ error: `Azure OpenAI API error: ${response.status} ${response.statusText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content.trim();
    
    console.log('AI Response:', generatedContent);

    // Try to parse the JSON response with better error handling
    let jobData;
    try {
      // Remove any markdown code blocks if present
      const cleanContent = generatedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      jobData = JSON.parse(cleanContent);
      
      // Validate required fields
      if (!jobData.jobTitle || !jobData.jobDescription) {
        throw new Error('Missing required fields in AI response');
      }
      
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', generatedContent);
      console.error('Parse error:', parseError.message);
      
      // Fallback: try to extract data manually or return error
      return new Response(
        JSON.stringify({ 
          error: 'AI response was not in valid JSON format',
          details: 'The AI response could not be parsed. Please try again.',
          rawResponse: generatedContent
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ jobData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-job-with-ai function:', error);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({ 
      error: `Function error: ${error.message}`,
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});