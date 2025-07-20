import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { apiKey } = await req.json()
    
    if (!apiKey) {
      throw new Error('API key is required')
    }

    console.log('Validating HubSpot API key...')

    // Test the API key by making a simple request to HubSpot
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('HubSpot API response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('HubSpot API error:', errorText)
      
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your HubSpot private app token.')
      } else if (response.status === 403) {
        throw new Error('API key does not have required permissions. Please ensure your private app has contacts read access.')
      } else {
        throw new Error(`HubSpot API error: ${response.statusText}`)
      }
    }

    const data = await response.json()
    console.log('API validation successful, contact count:', data.results?.length || 0)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'API key is valid',
        contactCount: data.total || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error validating HubSpot API key:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to validate API key' 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})