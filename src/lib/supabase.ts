import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://example.supabase.co';
const supabaseKey =
	import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
	import.meta.env.VITE_SUPABASE_ANON_KEY ||
	'public-anon-key-placeholder';

if (!import.meta.env.VITE_SUPABASE_URL || !supabaseKey) {
	console.warn('Supabase env vars are missing. Check .env values.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
export default supabase;