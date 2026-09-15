// Exporta el registro de usuarios a database/registros/usuarios.csv
// 1 línea = 1 usuario. Fuente de verdad: la base (public.profiles + carrier_profiles).
// Uso: npm run export-usuarios
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const envFile = (() => {
  try { return readFileSync('.env', 'utf8'); } catch { return ''; }
})();
const envVar = (k) => process.env[k] ?? envFile.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1];

const URL = envVar('VITE_SUPABASE_URL') || 'https://supabase-api-prod.verdent.ai/p/p46fa3d4d0e305b621cf5';
const KEY = envVar('SUPABASE_SERVICE_KEY') || envVar('VITE_SUPABASE_PUBLISHABLE_KEY');
if (!KEY) { console.error('Falta SUPABASE_SERVICE_KEY (o VITE_SUPABASE_PUBLISHABLE_KEY)'); process.exit(1); }

const sb = createClient(URL, KEY);

const { data: profiles, error } = await sb
  .from('profiles')
  .select('id, email, username, full_name, phone, dni, is_carrier, created_at, carrier_profiles(status)')
  .order('created_at');
if (error) { console.error(error.message); process.exit(1); }

const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
const header = 'fecha_registro,id,email,email_validado,alias,nombre,telefono,dni,es_transportista,verificacion_transportista';
// email_validado: el email viene de auth (siempre validado para operar); se marca "si" si existe.
const lines = (profiles || []).map((p) => [
  p.created_at, p.id, p.email, p.email ? 'si' : 'no', p.username ?? '', p.full_name ?? '',
  p.phone ?? '', p.dni ?? '', p.is_carrier ? 'si' : 'no', p.carrier_profiles?.status ?? '',
].map(esc).join(','));

mkdirSync('database/registros', { recursive: true });
writeFileSync('database/registros/usuarios.csv', [header, ...lines].join('\n') + '\n');
console.log(`OK: ${lines.length} usuarios exportados a database/registros/usuarios.csv`);
