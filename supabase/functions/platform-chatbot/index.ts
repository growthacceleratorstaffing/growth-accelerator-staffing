import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    const { message, conversation = [] } = await req.json();

    console.log('Received message:', message);
    console.log('OpenAI API Key present:', !!openAIApiKey);

    if (!openAIApiKey) {
      console.error('OpenAI API key is missing');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are a helpful assistant for the Growth Accelerator staffing platform. You help users navigate and understand the platform's features:

PLATFORM FEATURES:
- Job Management: Users can view, create, and manage job postings
- AI Job Generation: Create job postings using AI with natural language descriptions
- Manual Job Creation: Fill out detailed forms to create job postings manually
- Candidate Management: View and manage job applicants
- Applications: Track job applications and candidate responses
- Authentication: Secure login and user management

NAVIGATION:
- /jobs - Job listings and creation
- /candidates - Candidate management
- /applications - Application tracking
- /auth - Login/signup

HELP TOPICS:
- How to create a job posting (AI or manual)
- How to manage candidates
- How to track applications
- Platform navigation
- Account management

Be helpful, concise, and guide users to the right features. If they ask about technical issues, suggest they contact support.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversation,
      { role: 'user', content: message }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, response.statusText, errorData);
      return new Response(
        JSON.stringify({ error: `OpenAI API error: ${response.status} ${response.statusText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const botResponse = data.choices[0].message.content;

    return new Response(JSON.stringify({ response: botResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in platform-chatbot function:', error);
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