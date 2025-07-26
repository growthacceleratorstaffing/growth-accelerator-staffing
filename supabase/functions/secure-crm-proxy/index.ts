import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple decryption utility (matches the one in secure-api-key-manager)
const decrypt = (encryptedText: string): string => {
  try {
    return atob(encryptedText);
  } catch {
    return '';
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Secure CRM Proxy called');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user authentication
    const authHeader = req.headers.get('authorization')!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { service_name, endpoint, method = 'GET', body: requestBody, headers: customHeaders = {} } = await req.json();
    console.log('CRM Proxy request:', { service_name, endpoint, method });

    if (!service_name || !endpoint) {
      return new Response(
        JSON.stringify({ error: 'Service name and endpoint are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Retrieve API key for the service
    const { data: keyData, error: keyError } = await supabase
      .from('user_api_keys')
      .select('encrypted_key')
      .eq('user_id', user.id)
      .eq('service_name', service_name)
      .eq('is_active', true)
      .single();

    if (keyError || !keyData) {
      return new Response(
        JSON.stringify({ error: `API key not found for ${service_name}` }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const apiKey = decrypt(keyData.encrypted_key);
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Failed to decrypt API key' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Log the API request for security auditing
    await supabase.rpc('log_security_event', {
      p_user_id: user.id,
      p_event_type: 'api_request',
      p_event_details: { 
        service_name, 
        endpoint: endpoint.split('?')[0], // Log endpoint without query params for privacy
        method 
      },
      p_ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      p_user_agent: req.headers.get('user-agent')
    });

    // Prepare headers based on service type
    let requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders
    };

    switch (service_name.toLowerCase()) {
      case 'hubspot':
        requestHeaders['Authorization'] = `Bearer ${apiKey}`;
        break;
      
      case 'salesforce':
        requestHeaders['Authorization'] = `Bearer ${apiKey}`;
        break;
      
      case 'apollo':
        requestHeaders['X-Api-Key'] = apiKey;
        break;
      
      case 'pipedrive':
        // Pipedrive uses api_token in URL or header
        requestHeaders['Authorization'] = `Bearer ${apiKey}`;
        break;
      
      case 'zoho':
        requestHeaders['Authorization'] = `Zoho-oauthtoken ${apiKey}`;
        break;
      
      case 'monday':
        requestHeaders['Authorization'] = apiKey;
        break;
      
      case 'airtable':
        requestHeaders['Authorization'] = `Bearer ${apiKey}`;
        break;
      
      default:
        requestHeaders['Authorization'] = `Bearer ${apiKey}`;
    }

    // Make the API request
    const apiResponse = await fetch(endpoint, {
      method,
      headers: requestHeaders,
      body: requestBody ? JSON.stringify(requestBody) : undefined
    });

    const responseData = await apiResponse.json().catch(() => ({}));

    // Rate limiting handling
    if (apiResponse.status === 429) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded', 
          retry_after: apiResponse.headers.get('retry-after'),
          message: 'Please wait before making another request'
        }),
        { 
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!apiResponse.ok) {
      console.error(`${service_name} API error:`, apiResponse.status, responseData);
      return new Response(
        JSON.stringify({ 
          error: `${service_name} API error`,
          status: apiResponse.status,
          details: responseData
        }),
        { 
          status: apiResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        data: responseData,
        status: apiResponse.status
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Secure CRM Proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});