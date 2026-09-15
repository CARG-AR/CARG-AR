import { createClient } from '@supabase/supabase-js';
import { createVerdentAuth } from '@verdent/auth-js';

const env = (import.meta as any).env || {};

// En preview/publicación de Verdent se usa el proxy same-origin para que Supabase esté autenticado.
// En local se pueden proveer VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.
const url = env.VITE_SUPABASE_URL || window.location.origin;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || 'verdent-baas-proxy';

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const auth = createVerdentAuth({ supabase });
