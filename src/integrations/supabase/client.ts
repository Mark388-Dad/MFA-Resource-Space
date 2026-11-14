import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { safeAuthStorage } from '@/lib/safeStorage';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://tufkrzabktzduqjagfuc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1ZmtyemFia3R6ZHVxamFnZnVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM2OTAsImV4cCI6MjA4NDg2OTY5MH0.sgIccA2yxUSTGM-oLwkJnaTnw3nlgV8mo60OaAGx22k';

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: safeAuthStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});