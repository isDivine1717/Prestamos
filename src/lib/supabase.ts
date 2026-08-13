import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl.trim() && supabasePublishableKey.trim()
);

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase client initialized without environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY). Using local storage fallback mode.'
  );
}

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabasePublishableKey : 'placeholder'
);

