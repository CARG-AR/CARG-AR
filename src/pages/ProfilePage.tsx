import { useEffect, useState } from 'react';
import { getCarrierFullProfile, getReputation, getReviewsFor, updateProfile } from '../lib/db';
import { useAuth } from '../lib/useAuth';
import { Alert, Field, inputCls, Stars, UserChip } from '../components/ui';
import { anyVehicleBlocked, badgeFor, expiryBadge, formatDate, type CarrierProfile, type Reputation, type Review, type Vehicle, VEHICLE_TYPES } from '../lib/types';
import { Link } from 'react-router-dom';

export default function ProfilePage() {
  const { userId, profile, signIn, refreshProfile } = useAuth();
  const [rep, setRep] = useState<Reputation | null>(null);
  const [reviews, setReviews] = useState<(Review & { reviewer?: any })[]>([]);
  const [cp, setCp] = useState<(CarrierProfile & { vehicles: Vehicle[] }) | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [dni, setDni] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId || !profile) return;
    const names = (profile.full_name || '').split(' ');
    setFirstName(names[0] || '');
    setLastName(names.slice(1).join(' ') || '');
    setUsername(profile.username || '');
    setPhone(profile.phone || '');
    setDni(profile.dni || '');
    getReputation(userId).then(setRep);
    getReviewsFor(userId).then(setReviews);
    getCarrierFullProfile(userId).then(setCp);
  }, [userId, profile]);

  if (!userId) return <Alert><button onClick={signIn} className="font-semibold underline">Iniciá sesión</button> para ver tu perfil.</Alert>;
  if (!profile) return <div className="text-gray-500">Cargando…</div>;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9_\-]/g, '');
    if (!cleanUser || cleanUser.length < 3) return setError('El alias debe tener al menos 3 caracteres (letras, números, guiones).');
    setError('');
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const { error } = await updateProfile(userId!, { full_name: fullName, username: cleanUser, phone, dni });
    if (error?.message?.includes('duplicate') || error?.code === '23505') {
      return setError('Ese alias ya está en uso. Probá con otro.');
    }
    if (error) return setError(error.message);
    await refreshProfile();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const badge = badgeFor(rep);
  const blockedByExpiry = cp ? anyVehicleBlocked(cp.vehicles || []) : false;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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
          {profile.is_carrier && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${cp?.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {cp?.status === 'verified' ? 'Transportista verificado' : 'Transportista pendiente'}
            </span>
          )}
        </div>
      </div>

      <form onSubmit={save} className="bg-white rounded-xl border p-5 space-y-3">
        <h2 className="font-semibold">Mis datos</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Nombre"><input className={inputCls} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Walter" /></Field>
          <Field label="Apellido"><input className={inputCls} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Casilli" /></Field>
        </div>
        <Field label="Alias único (@usuario)" hint={profile.username ? 'El alias no se puede cambiar una vez elegido.' : 'Fácil de recordar. No se puede repetir. Ej: cargar.'}>
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
        <Field label="DNI"><input className={inputCls} value={dni} onChange={(e) => setDni(e.target.value)} placeholder="12345678" /></Field>
        <Field label="Teléfono" hint="Visible para la contraparte cuando se cierra un trato."><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+54 9 351 …" /></Field>
        {saved && <Alert kind="ok">Datos guardados.</Alert>}
        {error && <Alert kind="error">{error}</Alert>}
        <button className="bg-gray-900 text-white font-semibold px-5 py-2.5 rounded-lg">Guardar</button>
      </form>

      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold mb-3">Valoración y trayectoria</h2>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div><span className="text-gray-500">Estrellas:</span> <Stars value={rep?.rating_avg || 0} /></div>
          <div><span className="text-gray-500">Calificaciones:</span> <b>{rep?.rating_count ?? 0}</b></div>
          <div><span className="text-gray-500">Viajes completados:</span> <b>{rep?.trips_completed ?? 0}</b></div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold mb-3">Datos de transportista</h2>
        {!profile.is_carrier ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Todavía no declaraste ser transportista. Si tenés vehículo y querés ofertar cargas, completá tu documentación.</p>
            <Link to="/perfil/transportista" className="inline-block bg-amber-400 hover:bg-amber-300 text-gray-900 font-semibold px-5 py-2.5 rounded-lg">
              Declararme transportista
            </Link>
          </div>
        ) : !cp ? (
          <p className="text-sm text-gray-500">Cargando datos de transportista…</p>
        ) : (
          <div className="space-y-4">
            {blockedByExpiry && (
              <Alert kind="error">
                Tenés documentación vencida o a punto de vencer. No podés ofertar en fletes hasta que actualices los vencimientos.
              </Alert>
            )}
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Rubro:</span> <b>{cp.rubro}</b></div>
              <div><span className="text-gray-500">Estado:</span> <b>{cp.status}</b></div>
              <div><span className="text-gray-500">MercadoPago:</span> {cp.mp_connected ? <span className="text-green-700 font-semibold">Conectado ✓</span> : <span className="text-gray-400">Pendiente</span>}</div>
            </div>

            <h3 className="font-semibold text-sm pt-2 border-t">Vehículos vinculados ({cp.vehicles?.length || 0})</h3>
            <div className="space-y-3">
              {cp.vehicles?.map((veh) => {
                const seguroBadge = expiryBadge(veh.insurance_expiry);
                const vtvBadge = expiryBadge(veh.vtv_expiry);
                const carnetBadge = expiryBadge(veh.license_expiry);
                return (
                  <div key={veh.id} className="border rounded-lg p-3 text-sm">
                    <div className="grid sm:grid-cols-2 gap-2">
                      <div><span className="text-gray-500">Tipo:</span> {VEHICLE_TYPES[veh.type] || veh.type}</div>
                      <div><span className="text-gray-500">Patente:</span> {veh.plate}</div>
                      <div>
                        <span className="text-gray-500">Seguro:</span> {veh.insurance || '—'}
                        {seguroBadge && <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${seguroBadge.cls}`}>{seguroBadge.label}</span>}
                      </div>
                      <div>
                        <span className="text-gray-500">VTV:</span> {formatDate(veh.vtv_expiry)}
                        {vtvBadge && <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${vtvBadge.cls}`}>{vtvBadge.label}</span>}
                      </div>
                      <div>
                        <span className="text-gray-500">Carnet:</span> {formatDate(veh.license_expiry)}
                        {carnetBadge && <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${carnetBadge.cls}`}>{carnetBadge.label}</span>}
                      </div>
                    </div>
                    {veh.photos?.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {veh.photos.map((url, idx) => (
                          <a key={idx} href={url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">Ver foto {idx + 1}</a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {(!cp.vehicles || cp.vehicles.length === 0) && <p className="text-sm text-gray-500">Sin vehículos cargados.</p>}
            </div>

            <Link to="/perfil/transportista" className="inline-block bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
              Gestionar documentación
            </Link>
          </div>
        )}
      </div>

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
