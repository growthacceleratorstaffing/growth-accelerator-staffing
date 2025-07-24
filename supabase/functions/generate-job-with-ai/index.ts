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

    const systemPrompt = `Create structured job posting with: Title, Company, Location, Work type, Salary, Description, Skills, Category. Be concise.`;

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
        temperature: 0.5,
        max_tokens: 1000,
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
    const generatedContent = data.choices[0].message.content;

    // Parse the response into structured data
    const jobData = {
      jobTitle: extractField(generatedContent, 'title') || "Data Engineer",
      company: extractField(generatedContent, 'company') || "Your Company",
      location: extractField(generatedContent, 'location') || "Remote",
      workType: extractField(generatedContent, 'type') || "Full-time",
      salaryLow: 80000,
      salaryHigh: 120000,
      jobDescription: generatedContent, // Use full content instead of truncating
      skillTags: extractField(generatedContent, 'skills') || "Data Engineering, SQL, Python",
      category: extractField(generatedContent, 'category') || "Technology"
    };

    return new Response(JSON.stringify({ jobData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-job-with-ai function:', error);
    return new Response(JSON.stringify({ 
      error: `Function error: ${error.message}`
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to extract fields from text response
function extractField(text: string, field: string): string {
  const patterns = {
    'title': /(?:job title|title|position):\s*([^\n]+)/i,
    'company': /(?:company):\s*([^\n]+)/i,
    'location': /(?:location):\s*([^\n]+)/i,
    'type': /(?:work type|type):\s*([^\n]+)/i,
    'skills': /(?:skills|requirements):\s*([^\n]+)/i,
    'category': /(?:category):\s*([^\n]+)/i
  };
  
  const match = text.match(patterns[field]);
  return match ? match[1].trim() : '';
}