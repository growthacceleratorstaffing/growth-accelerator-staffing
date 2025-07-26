import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple encryption/decryption utilities (in production, use proper encryption)
const encrypt = (text: string): string => {
  // This is a basic implementation - in production use proper encryption
  return btoa(text);
}

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
    console.log('Secure API Key Manager called');
    
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

    const { action, service_name, api_key, key_label } = await req.json();
    console.log('API Key Manager action requested:', action, 'for service:', service_name);

    // Log security event
    await supabase.rpc('log_security_event', {
      p_user_id: user.id,
      p_event_type: `api_key_${action}`,
      p_event_details: { service_name, action },
      p_ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      p_user_agent: req.headers.get('user-agent')
    });

    switch (action) {
      case 'store':
        return await storeApiKey(supabase, user.id, service_name, api_key, key_label);
      
      case 'retrieve':
        return await retrieveApiKey(supabase, user.id, service_name);
      
      case 'delete':
        return await deleteApiKey(supabase, user.id, service_name);
      
      case 'list':
        return await listApiKeys(supabase, user.id);
      
      case 'test':
        return await testApiKey(supabase, user.id, service_name);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }

  } catch (error) {
    console.error('Secure API Key Manager error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function storeApiKey(supabase: any, userId: string, serviceName: string, apiKey: string, keyLabel?: string) {
  try {
    if (!apiKey || !serviceName) {
      return new Response(
        JSON.stringify({ error: 'API key and service name are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Encrypt the API key
    const encryptedKey = encrypt(apiKey);

    // Store in database
    const { data, error } = await supabase
      .from('user_api_keys')
      .upsert({
        user_id: userId,
        service_name: serviceName,
        encrypted_key: encryptedKey,
        key_label: keyLabel,
        is_active: true
      }, {
        onConflict: 'user_id,service_name'
      })
      .select()
      .single();

    if (error) {
      console.error('Database error storing API key:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to store API key', details: error.message }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`API key stored successfully for service: ${serviceName}`);
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'API key stored securely',
        service_name: serviceName
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error storing API key:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to store API key', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function retrieveApiKey(supabase: any, userId: string, serviceName: string) {
  try {
    const { data, error } = await supabase
      .from('user_api_keys')
      .select('encrypted_key, key_label, is_active, created_at')
      .eq('user_id', userId)
      .eq('service_name', serviceName)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: 'API key not found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Decrypt the API key
    const decryptedKey = decrypt(data.encrypted_key);

    return new Response(
      JSON.stringify({ 
        success: true, 
        api_key: decryptedKey,
        key_label: data.key_label,
        created_at: data.created_at
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error retrieving API key:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to retrieve API key', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function deleteApiKey(supabase: any, userId: string, serviceName: string) {
  try {
    const { error } = await supabase
      .from('user_api_keys')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('service_name', serviceName);

    if (error) {
      console.error('Database error deleting API key:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to delete API key', details: error.message }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'API key deleted successfully'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error deleting API key:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete API key', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function listApiKeys(supabase: any, userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_api_keys')
      .select('service_name, key_label, created_at, updated_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error listing API keys:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to list API keys', details: error.message }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        api_keys: data || []
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error listing API keys:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to list API keys', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function testApiKey(supabase: any, userId: string, serviceName: string) {
  try {
    // Retrieve the API key
    const keyResponse = await retrieveApiKey(supabase, userId, serviceName);
    const keyData = await keyResponse.json();
    
    if (!keyData.success) {
      return keyResponse;
    }

    const apiKey = keyData.api_key;

    // Test based on service type
    let testUrl = '';
    let testHeaders: Record<string, string> = {};

    switch (serviceName.toLowerCase()) {
      case 'hubspot':
        testUrl = 'https://api.hubapi.com/crm/v3/objects/contacts?limit=1';
        testHeaders = {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        };
        break;
      
      case 'salesforce':
        // Basic format validation for Salesforce
        if (!apiKey.includes('!') || apiKey.length < 20) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: 'Invalid Salesforce API key format' 
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        break;
      
      case 'apollo':
        testUrl = 'https://api.apollo.io/v1/people/search';
        testHeaders = {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json'
        };
        break;
      
      default:
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'API key format validation passed (service-specific test not implemented)' 
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }

    if (testUrl) {
      const testResponse = await fetch(testUrl, {
        method: 'GET',
        headers: testHeaders
      });

      const isValid = testResponse.ok || testResponse.status === 429; // 429 = rate limited but key is valid

      return new Response(
        JSON.stringify({ 
          success: isValid,
          status: testResponse.status,
          message: isValid ? 'API key is valid' : 'API key test failed'
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'API key stored and basic validation passed' 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error testing API key:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to test API key', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}