import { useEffect, useState } from 'react';
import { getCarrierProfile, getReputation, getReviewsFor, updateProfile } from '../lib/db';
import { useAuth } from '../lib/useAuth';
import { Alert, Field, inputCls, Stars, UserChip } from '../components/ui';
import { badgeFor, type CarrierProfile, type Reputation, type Review } from '../lib/types';

export default function ProfilePage() {
  const { userId, profile, signIn, refreshProfile } = useAuth();
  const [rep, setRep] = useState<Reputation | null>(null);
  const [reviews, setReviews] = useState<(Review & { reviewer?: any })[]>([]);
  const [cp, setCp] = useState<CarrierProfile | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [dni, setDni] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId || !profile) return;
    setName(profile.full_name || '');
    setUsername(profile.username || '');
    setPhone(profile.phone || '');
    setDni(profile.dni || '');
    getReputation(userId).then(setRep);
    getReviewsFor(userId).then(setReviews);
    getCarrierProfile(userId).then(setCp);
  }, [userId, profile]);

  if (!userId) return <Alert><button onClick={signIn} className="font-semibold underline">Iniciá sesión</button> para ver tu perfil.</Alert>;
  if (!profile) return <div className="text-gray-500">Cargando…</div>;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9_\-]/g, '');
    if (!cleanUser || cleanUser.length < 3) return setError('El alias debe tener al menos 3 caracteres (letras, números, guiones).');
    setError('');
    const { error } = await updateProfile(userId!, { full_name: name, username: cleanUser, phone, dni });
    if (error?.message?.includes('duplicate') || error?.code === '23505') {
      return setError('Ese alias ya está en uso. Probá con otro.');
    }
    if (error) return setError(error.message);
    await refreshProfile();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const badge = badgeFor(rep);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-center gap-3">
          <div className="bg-gray-900 text-white font-black text-2xl px-3 py-1.5 rounded-lg">
            {(profile.username || profile.full_name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{profile.full_name}</h1>
            {profile.username && <p className="text-sm text-amber-600 font-semibold">@{profile.username}</p>}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <UserChip name="" reputation={rep} />
          {badge && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>}
          {profile.is_carrier && <span className="text-xs bg-gray-900 text-white px-2 py-0.5 rounded-full">Transportista</span>}
          {cp && <span className="text-xs text-gray-500">Verificación: {cp.status}</span>}
        </div>
        <div className="text-sm text-gray-600 mt-2">
          Viajes completados: <b>{rep?.trips_completed ?? 0}</b> · Calificaciones recibidas: <b>{rep?.rating_count ?? 0}</b>
        </div>
      </div>

      <form onSubmit={save} className="bg-white rounded-xl border p-5 space-y-3">
        <h2 className="font-semibold">Mis datos</h2>
        <Field label="Alias único (@usuario)" hint={profile.username ? 'El alias no se puede cambiar una vez elegido.' : 'Fácil de recordar. No se puede repetir. Ej: cargar.'}
        >
          {profile.username ? (
            <div className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700">
              @{profile.username}
            </div>
          ) : (
            <div className="flex items-center">
              <span className="bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg px-3 py-2 text-sm text-gray-600">@</span>
              <input className={inputCls + ' rounded-l-none'} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="cargar" />
            </div>
          )}
        </Field>
        <Field label="Nombre completo"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Teléfono" hint="Visible para la contraparte cuando se cierra un trato."><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <Field label="DNI"><input className={inputCls} value={dni} onChange={(e) => setDni(e.target.value)} /></Field>
        {saved && <Alert kind="ok">Datos guardados.</Alert>}
        {error && <Alert kind="error">{error}</Alert>}
        <button className="bg-gray-900 text-white font-semibold px-5 py-2.5 rounded-lg">Guardar</button>
      </form>

      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold mb-3">Reseñas recibidas ({reviews.length})</h2>
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="border-b pb-3 last:border-0">
              <div className="flex items-center gap-2 text-sm">
                <Stars value={r.stars} />
                <span className="font-medium">{r.reviewer?.username ? `@${r.reviewer.username}` : r.reviewer?.full_name || 'Usuario'}</span>
                <span className="text-xs text-gray-400">como {r.reviewer_role}</span>
              </div>
              {r.comment && <p className="text-sm text-gray-600 mt-1">{r.comment}</p>}
            </div>
          ))}
          {reviews.length === 0 && <p className="text-sm text-gray-500">Sin reseñas todavía. Se acumulan al cerrar operaciones.</p>}
        </div>
      </div>
    </div>
  );
}
