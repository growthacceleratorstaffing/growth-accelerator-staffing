import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting configuration
const RATE_LIMITS = {
  api_key_operations: {
    requests: 10,
    window: 60000 // 1 minute
  },
  api_calls: {
    requests: 100,
    window: 60000 // 1 minute
  },
  auth_attempts: {
    requests: 5,
    window: 300000 // 5 minutes
  }
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, RateLimitEntry>();

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Rate Limiter called');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, limit_type, identifier } = await req.json();
    console.log('Rate limit check:', { action, limit_type, identifier });

    if (!limit_type || !identifier) {
      return new Response(
        JSON.stringify({ error: 'Limit type and identifier are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const limitConfig = RATE_LIMITS[limit_type as keyof typeof RATE_LIMITS];
    if (!limitConfig) {
      return new Response(
        JSON.stringify({ error: 'Invalid limit type' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const key = `${limit_type}:${identifier}`;
    const now = Date.now();

    switch (action) {
      case 'check':
        return checkRateLimit(key, limitConfig, now);
      
      case 'increment':
        return incrementRateLimit(key, limitConfig, now);
      
      case 'reset':
        return resetRateLimit(key);
      
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
    console.error('Rate Limiter error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function checkRateLimit(key: string, limitConfig: any, now: number) {
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    // No entry or window has expired - limit not exceeded
    return new Response(
      JSON.stringify({ 
        allowed: true,
        count: 0,
        limit: limitConfig.requests,
        resetTime: now + limitConfig.window
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  const allowed = entry.count < limitConfig.requests;
  
  return new Response(
    JSON.stringify({ 
      allowed,
      count: entry.count,
      limit: limitConfig.requests,
      resetTime: entry.resetTime
    }),
    { 
      status: allowed ? 200 : 429,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': limitConfig.requests.toString(),
        'X-RateLimit-Remaining': Math.max(0, limitConfig.requests - entry.count).toString(),
        'X-RateLimit-Reset': Math.ceil(entry.resetTime / 1000).toString()
      }
    }
  );
}

function incrementRateLimit(key: string, limitConfig: any, now: number) {
  let entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    // Create new entry or reset expired one
    entry = {
      count: 1,
      resetTime: now + limitConfig.window
    };
  } else {
    // Increment existing entry
    entry.count++;
  }
  
  rateLimitStore.set(key, entry);
  
  const allowed = entry.count <= limitConfig.requests;
  
  return new Response(
    JSON.stringify({ 
      allowed,
      count: entry.count,
      limit: limitConfig.requests,
      resetTime: entry.resetTime
    }),
    { 
      status: allowed ? 200 : 429,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': limitConfig.requests.toString(),
        'X-RateLimit-Remaining': Math.max(0, limitConfig.requests - entry.count).toString(),
        'X-RateLimit-Reset': Math.ceil(entry.resetTime / 1000).toString()
      }
    }
  );
}

function resetRateLimit(key: string) {
  rateLimitStore.delete(key);
  
  return new Response(
    JSON.stringify({ 
      success: true,
      message: 'Rate limit reset successfully'
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute