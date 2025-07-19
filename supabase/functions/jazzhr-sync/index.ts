import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, jobData } = await req.json()
    console.log('JazzHR Sync request:', { action })

    // Get API key from Supabase secrets
    const apiKey = Deno.env.get('JAZZHR_API_KEY')
    
    if (!apiKey) {
      console.error('JAZZHR_API_KEY not found in environment variables')
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'JAZZHR_API_KEY not configured in Supabase secrets',
          error: 'Missing API key configuration'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    switch (action) {
      case 'syncToJazzHR':
        return await syncLocalJobToJazzHR(apiKey, supabase, jobData)
      case 'syncFromJazzHR':
        return await syncJazzHRJobsToLocal(apiKey, supabase)
      case 'bidirectionalSync':
        return await performBidirectionalSync(apiKey, supabase)
      default:
        return new Response(
          JSON.stringify({ 
            success: false,
            message: `Unknown action: ${action}`,
            error: 'Invalid action parameter'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Error in jazzhr-sync function:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        message: 'Internal server error',
        error: error.message 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function makeJazzHRRequest(url: string, apiKey: string, method = 'GET', body?: any) {
  const urlObj = new URL(url);
  urlObj.searchParams.set('apikey', apiKey);
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Lovable-JazzHR-Integration/1.0'
    }
  }
  
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body)
  }
  
  console.log(`Making JazzHR API call: ${method} ${urlObj.toString().replace(apiKey, 'API_KEY_HIDDEN')}`)
  
  const response = await fetch(urlObj.toString(), options)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error(`JazzHR API error: ${response.status} - ${errorText}`)
    throw new Error(`JazzHR API error: ${response.status} - ${errorText}`)
  }
  
  const responseText = await response.text()
  console.log(`JazzHR API response (first 500 chars): ${responseText.substring(0, 500)}`)
  
  try {
    return JSON.parse(responseText)
  } catch (e) {
    console.error('Failed to parse JSON response:', responseText)
    throw new Error('Invalid JSON response from JazzHR API')
  }
}

async function syncLocalJobToJazzHR(apiKey: string, supabase: any, jobData: any) {
  try {
    console.log('Syncing local job to JazzHR:', jobData.title)

    // Prepare JazzHR job data
    const jazzHRJobData = {
      title: jobData.title,
      hiring_lead_id: 'usr_20250716133911_07UCQOAM1SBJ7IIC', // Default hiring lead
      description: jobData.description,
      workflow_id: '1', // Default workflow
      employment_type: jobData.employment_type || 'Full Time',
      department: jobData.department || 'Growth Accelerator',
      city: jobData.city || 'Amsterdam',
      state: jobData.state || 'Noord-Holland',
      job_status: 'Open'
    }

    console.log('JazzHR job data to be sent:', jazzHRJobData)

    // Create job in JazzHR
    const jazzHRJob = await makeJazzHRRequest(
      'https://api.resumatorapi.com/v1/jobs',
      apiKey,
      'POST',
      jazzHRJobData
    )

    console.log('JazzHR job created successfully:', jazzHRJob.id)

    // Update local job with JazzHR ID
    const { error: updateError } = await supabase
      .from('jobs')
      .update({ 
        synced_to_jobadder: true,
        jobadder_job_id: jazzHRJob.id
      })
      .eq('id', jobData.id)

    if (updateError) {
      console.error('Failed to update local job:', updateError)
      throw new Error('Failed to update local job after JazzHR sync')
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Job synced to JazzHR successfully',
        jazzhr_job_id: jazzHRJob.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Failed to sync job to JazzHR:', error)
    
    // Mark job as failed to sync
    await supabase
      .from('jobs')
      .update({ 
        synced_to_jobadder: false,
        jobadder_job_id: null
      })
      .eq('id', jobData.id)

    return new Response(
      JSON.stringify({ 
        success: false,
        message: 'Failed to sync job to JazzHR',
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function syncJazzHRJobsToLocal(apiKey: string, supabase: any) {
  try {
    console.log('Syncing JazzHR jobs to local database')

    // Get all JazzHR jobs
    const jazzHRJobs = await makeJazzHRRequest(
      'https://api.resumatorapi.com/v1/jobs',
      apiKey
    )

    console.log(`Found ${jazzHRJobs.length} jobs in JazzHR`)

    let syncedCount = 0
    let errorCount = 0

    for (const jazzHRJob of jazzHRJobs) {
      try {
        // Check if job already exists locally
        const { data: existingJob } = await supabase
          .from('jobs')
          .select('id')
          .eq('jobadder_job_id', jazzHRJob.id)
          .single()

        if (existingJob) {
          console.log(`Job ${jazzHRJob.title} already exists locally, skipping`)
          continue
        }

        // Convert JazzHR job to local format
        const localJobData = {
          title: jazzHRJob.title,
          job_description: jazzHRJob.description || '',
          company_name: jazzHRJob.department || 'Growth Accelerator',
          location_name: jazzHRJob.city && jazzHRJob.state ? `${jazzHRJob.city}, ${jazzHRJob.state}` : 'Remote',
          work_type_name: jazzHRJob.employment_type || 'Full Time',
          source: 'JazzHR',
          synced_to_jobadder: true,
          jobadder_job_id: jazzHRJob.id,
          salary_currency: 'EUR',
          created_at: jazzHRJob.original_open_date ? new Date(jazzHRJob.original_open_date).toISOString() : new Date().toISOString()
        }

        const { error: insertError } = await supabase
          .from('jobs')
          .insert(localJobData)

        if (insertError) {
          console.error(`Failed to insert JazzHR job ${jazzHRJob.title}:`, insertError)
          errorCount++
        } else {
          console.log(`Successfully synced JazzHR job: ${jazzHRJob.title}`)
          syncedCount++
        }
      } catch (jobError) {
        console.error(`Error processing JazzHR job ${jazzHRJob.title}:`, jobError)
        errorCount++
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `JazzHR sync completed`,
        total_jobs: jazzHRJobs.length,
        synced_count: syncedCount,
        error_count: errorCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Failed to sync JazzHR jobs to local:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        message: 'Failed to sync JazzHR jobs to local database',
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function performBidirectionalSync(apiKey: string, supabase: any) {
  try {
    console.log('Performing bidirectional sync between local and JazzHR')

    // First, sync any unsynced local jobs to JazzHR
    const { data: unsyncedJobs } = await supabase
      .from('jobs')
      .select('*')
      .eq('synced_to_jobadder', false)
      .is('jobadder_job_id', null)

    console.log(`Found ${unsyncedJobs?.length || 0} unsynced local jobs`)

    let localToJazzHRCount = 0
    if (unsyncedJobs && unsyncedJobs.length > 0) {
      for (const job of unsyncedJobs) {
        try {
          await syncLocalJobToJazzHR(apiKey, supabase, {
            id: job.id,
            title: job.title,
            description: job.job_description,
            department: job.company_name,
            city: job.location_name?.split(',')[0],
            state: job.location_name?.split(',')[1]?.trim(),
            employment_type: job.work_type_name
          })
          localToJazzHRCount++
        } catch (error) {
          console.error(`Failed to sync local job ${job.title} to JazzHR:`, error)
        }
      }
    }

    // Then, sync JazzHR jobs to local
    const jazzHRSyncResult = await syncJazzHRJobsToLocal(apiKey, supabase)
    const jazzHRSyncData = await jazzHRSyncResult.json()

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Bidirectional sync completed',
        local_to_jazzhr: localToJazzHRCount,
        jazzhr_to_local: jazzHRSyncData.synced_count || 0,
        total_jazzhr_jobs: jazzHRSyncData.total_jobs || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Bidirectional sync failed:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        message: 'Bidirectional sync failed',
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}