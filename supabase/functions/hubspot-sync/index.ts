import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { action, integrationId } = await req.json()
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the integration details
    const { data: integration, error: integrationError } = await supabaseClient
      .from('crm_integrations')
      .select('*')
      .eq('id', integrationId)
      .single()

    if (integrationError || !integration) {
      throw new Error('Integration not found')
    }

    if (action === 'sync_contacts') {
      // Fetch contacts from HubSpot
      const contactsResponse = await fetch(
        'https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=firstname,lastname,email,phone,company,jobtitle',
        {
          headers: {
            'Authorization': `Bearer ${integration.api_key_encrypted}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!contactsResponse.ok) {
        throw new Error(`HubSpot API error: ${contactsResponse.statusText}`)
      }

      const contactsData = await contactsResponse.json()
      
      // Process and insert contacts
      const contacts = contactsData.results?.map((contact: any) => ({
        user_id: integration.user_id,
        external_id: contact.id,
        crm_source: 'hubspot',
        name: `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim() || 'Unknown',
        email: contact.properties.email || null,
        phone: contact.properties.phone || null,
        company: contact.properties.company || null,
        position: contact.properties.jobtitle || null,
        status: 'lead',
        contact_data: contact.properties,
        last_synced_at: new Date().toISOString()
      })) || []

      // Insert contacts (upsert to avoid duplicates)
      if (contacts.length > 0) {
        const { error: contactsError } = await supabaseClient
          .from('crm_contacts')
          .upsert(contacts, { 
            onConflict: 'user_id,external_id,crm_source',
            ignoreDuplicates: false 
          })

        if (contactsError) {
          console.error('Error inserting contacts:', contactsError)
          throw contactsError
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Synced ${contacts.length} contacts from HubSpot` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'sync_companies') {
      // Fetch companies from HubSpot
      const companiesResponse = await fetch(
        'https://api.hubapi.com/crm/v3/objects/companies?limit=100&properties=name,domain,industry,numberofemployees,city,state,country',
        {
          headers: {
            'Authorization': `Bearer ${integration.api_key_encrypted}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!companiesResponse.ok) {
        throw new Error(`HubSpot API error: ${companiesResponse.statusText}`)
      }

      const companiesData = await companiesResponse.json()
      
      // Process and insert companies
      const companies = companiesData.results?.map((company: any) => ({
        user_id: integration.user_id,
        external_id: company.id,
        crm_source: 'hubspot',
        name: company.properties.name || 'Unknown Company',
        website: company.properties.domain || null,
        industry: company.properties.industry || null,
        company_size: company.properties.numberofemployees || null,
        location: [company.properties.city, company.properties.state, company.properties.country]
          .filter(Boolean).join(', ') || null,
        company_data: company.properties,
        last_synced_at: new Date().toISOString()
      })) || []

      // Insert companies (upsert to avoid duplicates)
      if (companies.length > 0) {
        const { error: companiesError } = await supabaseClient
          .from('crm_companies')
          .upsert(companies, { 
            onConflict: 'user_id,external_id,crm_source',
            ignoreDuplicates: false 
          })

        if (companiesError) {
          console.error('Error inserting companies:', companiesError)
          throw companiesError
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Synced ${companies.length} companies from HubSpot` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update last sync time
    await supabaseClient
      .from('crm_integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', integrationId)

    return new Response(
      JSON.stringify({ success: true, message: 'Sync completed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in hubspot-sync function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred during sync' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})