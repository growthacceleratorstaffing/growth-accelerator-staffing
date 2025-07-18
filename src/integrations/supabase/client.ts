// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://doulsumepjfihqowzheq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdWxzdW1lcGpmaWhxb3d6aGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4Nzk3ODgsImV4cCI6MjA2NDQ1NTc4OH0.IewqiemFwcu74Y8Gla-XJUMiQp-ym8J-i0niylIVK2A";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});