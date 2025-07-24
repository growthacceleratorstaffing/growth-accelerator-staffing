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
    const { message, conversation = [] } = await req.json();

    console.log('Received message:', message);
    console.log('Azure API Key present:', !!azureApiKey);

    if (!azureApiKey) {
      console.error('Azure OpenAI API key is missing');
      return new Response(
        JSON.stringify({ error: 'Azure OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Help users navigate Growth Accelerator platform features: Jobs (/jobs), Candidates (/candidates), Applications (/applications). Be concise.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversation,
      { role: 'user', content: message }
    ];

    const response = await fetch(`${azureEndpoint}/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-15-preview`, {
      method: 'POST',
      headers: {
        'api-key': azureApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages,
        temperature: 0.5,
        max_tokens: 200,
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