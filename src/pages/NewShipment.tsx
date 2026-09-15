import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createShipment, estimatePrice, getConfig, getProfileByUsername, routeKm, uploadPhoto } from '../lib/db';
import { FALLBACK_CONFIG, type AppConfig, type Category, type GeoPoint } from '../lib/types';
import { Field, inputCls, Alert } from '../components/ui';
import { MapView } from '../components/MapView';
import { useAuth } from '../lib/useAuth';
import { fetchProvinces, fetchLocalities, type Province, type Locality } from '../lib/geo';

const CATS = [
  ['paqueteria', 'Paquetería (sobre/bulto)', '5%'],
  ['pallets', 'Pallets', '7%'],
  ['maquinaria', 'Maquinaria y vehículos', '12%'],
] as const;

interface LocationPick {
  province_id: string;
  province: string;
  locality: string;
  localityId: string;
  address: string;
  lat: number;
  lng: number;
}

function emptyLoc(): LocationPick {
  return { province_id: '', province: '', locality: '', localityId: '', address: '', lat: 0, lng: 0 };
}

export default function NewShipment() {
  const { userId, profile, signIn } = useAuth();
  const nav = useNavigate();
  const [cfg, setCfg] = useState<AppConfig>(FALLBACK_CONFIG);
  const [category, setCategory] = useState<Category>('paqueteria');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState('');
  const [origin, setOrigin] = useState<LocationPick>(emptyLoc());
  const [dest, setDest] = useState<LocationPick>(emptyLoc());
  const [photos, setPhotos] = useState<string[]>([]);
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [originLocalities, setOriginLocalities] = useState<Locality[]>([]);
  const [destLocalities, setDestLocalities] = useState<Locality[]>([]);
  const [pickMode, setPickMode] = useState<'origin' | 'dest'>('origin');
  const [receiverAlias, setReceiverAlias] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [receiverError, setReceiverError] = useState('');

  useEffect(() => { getConfig().then(setCfg); fetchProvinces().then(setProvinces); }, []);

  const geoOrigin = useMemo(() => ({ label: `${origin.locality}, ${origin.province}`, lat: origin.lat, lng: origin.lng }), [origin]);
  const geoDest = useMemo(() => ({ label: `${dest.locality}, ${dest.province}`, lat: dest.lat, lng: dest.lng }), [dest]);
  const km = routeKm(geoOrigin, geoDest);
  const suggested = estimatePrice(km, cfg.categories[category].tariff_per_km);

  async function loadLocalities(side: 'origin' | 'dest', provinceName: string) {
    try {
      const locs = await fetchLocalities(provinceName);
      if (side === 'origin') setOriginLocalities(locs); else setDestLocalities(locs);
    } catch (e: any) { setError(e.message); }
  }

  function updateProvince(side: 'origin' | 'dest', provinceId: string) {
    const name = provinces.find((p) => p.id === provinceId)?.name || '';
    const setter = side === 'origin' ? setOrigin : setDest;
    setter(() => ({ province_id: provinceId, province: name, locality: '', localityId: '', address: '', lat: 0, lng: 0 }));
    if (name) loadLocalities(side, name);
  }

  function updateLocality(side: 'origin' | 'dest', localityName: string, locs: Locality[]) {
    const l = locs.find((x) => x.name === localityName);
    if (!l) return;
    const setter = side === 'origin' ? setOrigin : setDest;
    setter((prev) => ({
      ...prev,
      locality: l.name,
      localityId: l.id,
      lat: l.lat,
      lng: l.lng,
    }));
  }

  function pickMap(lat: number, lng: number) {
    if (pickMode === 'origin') setOrigin((o) => ({ ...o, lat, lng }));
    else setDest((d) => ({ ...d, lat, lng }));
  }

  async function onUpload(files: FileList | null) {
    if (!files || !userId) return;
    for (const f of Array.from(files).slice(0, 5)) {
      try { const url = await uploadPhoto('shipment-photos', userId, f); setPhotos((p) => [...p, url]); }
      catch (e: any) { setError(e.message); }
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return signIn();
    if (!title || !origin.province || !origin.locality || !origin.lat || !dest.province || !dest.locality || !dest.lat || !price) {
      return setError('Completá provincia, localidad, dirección y precio inicial de origen y destino.');
    }
    if (!receiverAlias.trim()) return setError('Tenés que indicar el alias del usuario que recibe el flete.');
    if (receiverAlias.toLowerCase() === profile?.username?.toLowerCase()) return setError('No podés ser vos mismo el receptor.');
    setSaving(true); setError('');
    try {
      const receiver = await getProfileByUsername(receiverAlias);
      if (!receiver) { setReceiverError('No existe un usuario con ese alias.'); setSaving(false); return; }
      setReceiverId(receiver.id);
      const ends = new Date(Date.now() + cfg.auction_minutes * 60000).toISOString();
      const originGeo: GeoPoint = { label: `${origin.locality}, ${origin.province}`, lat: origin.lat, lng: origin.lng };
      const destGeo: GeoPoint = { label: `${dest.locality}, ${dest.province}`, lat: dest.lat, lng: dest.lng };
      const { data, error } = await createShipment({
        dispatcher_id: userId,
        receiver_id: receiver.id,
        category,
        title,
        description,
        weight_kg: weight ? Number(weight) : null,
        photos,
        origin: originGeo,
        destination: destGeo,
        origin_province: origin.province,
        origin_locality: origin.locality,
        origin_address: origin.address,
        destination_province: dest.province,
        destination_locality: dest.locality,
        destination_address: dest.address,
        origin_exact: `${origin.address}, ${origin.locality}, ${origin.province}`,
        destination_exact: `${dest.address}, ${dest.locality}, ${dest.province}`,
        vehicle_required: cfg.categories[category].vehicle_required,
        start_price: Number(price),
        suggested_price: suggested,
        commission_pct: cfg.categories[category].commission_pct,
        auction_ends_at: ends,
      });
      if (error) throw error;
      nav(`/flete/${data.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally { setSaving(false); }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Publicar un flete</h1>
      {!userId && <Alert>Iniciá sesión para publicar. <button onClick={signIn} className="font-semibold underline">Ingresar</button></Alert>}

      <form onSubmit={submit} className="space-y-5">
        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">Tipo de flete (define comisión y vehículo)</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {CATS.map(([k, label, comm]) => (
              <button type="button" key={k} onClick={() => setCategory(k as Category)}
                className={`border rounded-xl p-3 text-left transition ${category === k ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-400' : 'border-gray-200 bg-white hover:border-gray-300'}`}
              >
                <div className="font-semibold text-sm">{label}</div>
                <div className="text-xs text-gray-500 mt-1">Comisión {comm} · ref. ${cfg.categories[k as Category].tariff_per_km}/km</div>
              </button>
            ))}
          </div>
        </div>

        <Field label="Título"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Caja de repuestos a Rafaela" /></Field>
        <Field label="Descripción"><textarea className={inputCls} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalles de la carga, embalaje, instrucciones de entrega…" /></Field>
        <Field label="Peso (kg, opcional)"><input className={inputCls} type="number" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} /></Field>
        <Field label="Fotos de la carga (hasta 5)">
          <input type="file" accept="image/*" multiple onChange={(e) => onUpload(e.target.files)} className="text-sm" />
        </Field>
        {photos.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {photos.map((p) => <img key={p} src={p} className="h-20 w-20 object-cover rounded-lg border" />)}
          </div>
        )}

        <AddressBlock side="origin" value={origin} localities={originLocalities} provinces={provinces}
          onProvince={(id) => updateProvince('origin', id)} onLocality={(name) => updateLocality('origin', name, originLocalities)}
          onAddress={(addr) => setOrigin((o) => ({ ...o, address: addr }))} />
        <AddressBlock side="dest" value={dest} localities={destLocalities} provinces={provinces}
          onProvince={(id) => updateProvince('dest', id)} onLocality={(name) => updateLocality('dest', name, destLocalities)}
          onAddress={(addr) => setDest((d) => ({ ...d, address: addr }))} />

        <div className="bg-white rounded-xl border p-4 space-y-3">
          <h3 className="font-semibold">¿Quién recibe?</h3>
          <Field label="Alias del receptor (@usuario)" hint="Obligatorio. El receptor debe tener un alias único en CARG-AR."
          >
            <div className="flex items-center gap-2">
              <span className="bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg px-3 py-2 text-sm text-gray-600">@</span>
              <input
                className={inputCls + ' rounded-l-none'}
                value={receiverAlias}
                onChange={(e) => { setReceiverAlias(e.target.value); setReceiverError(''); }}
                placeholder="alias del receptor"
              />
            </div>
          </Field>
          {receiverError && <p className="text-xs text-red-600">{receiverError}</p>}
        </div>

        <Alert kind="info">
          Hacé click en el mapa para ajustar los puntos.
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={() => setPickMode('origin')} className={`text-xs px-2 py-1 rounded border ${pickMode === 'origin' ? 'bg-amber-200 border-amber-400' : 'bg-white'}`}>Marcar origen</button>
            <button type="button" onClick={() => setPickMode('dest')} className={`text-xs px-2 py-1 rounded border ${pickMode === 'dest' ? 'bg-red-200 border-red-400' : 'bg-white'}`}>Marcar destino</button>
          </div>
        </Alert>
        <MapView
          markers={[{ ...geoOrigin, color: '#f59e0b', label: 'Origen' }, { ...geoDest, color: '#ef4444', label: 'Destino' }]}
          height={320}
          onPick={pickMap}
        />
        <div className="bg-white border rounded-xl p-4 text-sm">
          Distancia estimada: <b>{km} km</b> · Precio referencial sugerido: <b>${suggested.toLocaleString('es-AR')}</b>
        </div>

        <Field label="Precio inicial que podés pagar (los transportistas pujan)" hint={`Comisión de la plataforma: ${cfg.categories[category].commission_pct}% sobre el valor total`}>
          <input className={inputCls} type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={String(suggested)} />
        </Field>

        {error && <Alert kind="error">{error}</Alert>}
        <button disabled={saving} className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-gray-900 font-bold px-6 py-3 rounded-xl w-full sm:w-auto">
          {saving ? 'Publicando…' : `Publicar y abrir subasta (${cfg.auction_minutes} min)`}
        </button>
      </form>
    </div>
  );
}

function AddressBlock({ side, value, provinces, localities, onProvince, onLocality, onAddress }: {
  side: 'origin' | 'dest';
  value: LocationPick;
  provinces: Province[];
  localities: Locality[];
  onProvince: (id: string) => void;
  onLocality: (name: string) => void;
  onAddress: (addr: string) => void;
}) {
  const title = side === 'origin' ? 'Origen' : 'Destino';
  return (
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <h3 className="font-semibold">{title}</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Provincia">
          <select className={inputCls} value={value.province_id} onChange={(e) => onProvince(e.target.value)}>
            <option value="">Seleccionar provincia</option>
            {provinces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Localidad">
          <select className={inputCls} value={value.locality} onChange={(e) => onLocality(e.target.value)} disabled={!value.province}>
            <option value="">{value.province ? 'Seleccionar localidad' : 'Primero la provincia'}</option>
            {localities.map((l) => <option key={l.id} value={l.name}>{l.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Dirección (calle y altura)" hint="Ej: 9 de Julio 150">
        <input className={inputCls} value={value.address} onChange={(e) => onAddress(e.target.value)} placeholder="Ej: 9 de Julio 150" />
      </Field>
      {value.lat && value.lng && <p className="text-xs text-gray-500">Coordenadas: {value.lat.toFixed(4)}, {value.lng.toFixed(4)}</p>}
    </div>
  );
}
