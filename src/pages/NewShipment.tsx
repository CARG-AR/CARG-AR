import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createShipment, getConfig, getLoadRules, getProfileByUsername, routeKm, uploadPhoto } from '../lib/db';
import { FALLBACK_CONFIG, FALLBACK_LOAD_RULES, LOAD_GROUP_LABELS, type AppConfig, type Category, type GeoPoint, type LoadGroup, type LoadRule } from '../lib/types';
import { Field, inputCls, Alert } from '../components/ui';
import { MapView } from '../components/MapView';
import { useAuth } from '../lib/useAuth';
import { fetchProvinces, fetchLocalities, type Province, type Locality } from '../lib/geo';

const CATS = [
  ['paqueteria', 'Paquetería (sobre/bulto)'],
  ['pallets', 'Pallets'],
  ['maquinaria', 'Maquinaria y vehículos'],
] as const;
const GROUPS: LoadGroup[] = ['small', 'medium', 'large'];

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
  const [rules, setRules] = useState<LoadRule[]>(FALLBACK_LOAD_RULES);
  const [loadGroup, setLoadGroup] = useState<LoadGroup>('small');
  const [loadOption, setLoadOption] = useState('sobre');
  const [category, setCategory] = useState<Category>('paqueteria');
  const [lengthCm, setLengthCm] = useState('');
  const [widthCm, setWidthCm] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [declaredValue, setDeclaredValue] = useState('');
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

  useEffect(() => {
    getConfig().then(setCfg);
    getLoadRules().then(setRules);
    fetchProvinces().then(setProvinces);
  }, []);

  const groupRules = rules.filter((rule) => rule.group === loadGroup);
  const selectedRule = groupRules.find((rule) => rule.code === loadOption) || groupRules[0];

  useEffect(() => {
    if (selectedRule && selectedRule.code !== loadOption) setLoadOption(selectedRule.code);
  }, [loadGroup, selectedRule, loadOption]);

  useEffect(() => {
    if (loadGroup === 'medium') {
      setLoadOption('pallet');
      setCategory('pallets');
      if (!lengthCm) setLengthCm('1200');
      if (!widthCm) setWidthCm('1000');
      if (!heightCm) setHeightCm('1000');
    } else if (loadGroup === 'large') {
      setLoadOption('manual');
      setCategory('maquinaria');
    } else {
      setCategory('paqueteria');
    }
  }, [loadGroup]);

  const geoOrigin = useMemo(() => ({ label: `${origin.locality}, ${origin.province}`, lat: origin.lat, lng: origin.lng }), [origin]);
  const geoDest = useMemo(() => ({ label: `${dest.locality}, ${dest.province}`, lat: dest.lat, lng: dest.lng }), [dest]);
  const km = routeKm(geoOrigin, geoDest);

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
    setter((prev) => ({ ...prev, locality: l.name, localityId: l.id, lat: l.lat, lng: l.lng }));
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
    if (!receiverAlias.trim()) return setError('Tenés que indicar el alias del usuario que recibe la carga.');
    if (!selectedRule) return setError('Elegí una opción de carga.');
    if (selectedRule.requires_declared_value && !declaredValue) return setError('Indicá el valor declarado de la carga.');
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
        load_group: loadGroup,
        load_option: selectedRule.code,
        pricing_mode: selectedRule.manual ? 'manual' : 'automatic',
        title,
        description,
        weight_kg: weight ? Number(weight) : null,
        photos,
        length_cm: lengthCm ? Number(lengthCm) : null,
        width_cm: widthCm ? Number(widthCm) : null,
        height_cm: heightCm ? Number(heightCm) : null,
        declared_value: declaredValue ? Number(declaredValue) : null,
        distance_km: km,
        pricing_rule_id: selectedRule.id.startsWith('fallback-') ? null : selectedRule.id,
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
        suggested_price: null,
        commission_pct: selectedRule.commission_pct,
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
      <h1 className="text-2xl font-bold mb-4">Publicar carga</h1>
      {!userId && <Alert>Iniciá sesión para publicar. <button onClick={signIn} className="font-semibold underline">Ingresar</button></Alert>}

      <form onSubmit={submit} className="space-y-5">
        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">¿Qué tipo de carga querés enviar?</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {GROUPS.map((group) => (
              <button type="button" key={group} onClick={() => setLoadGroup(group)}
                className={`aspect-square border rounded-xl p-4 flex flex-col items-center justify-center text-center transition ${loadGroup === group ? 'border-amber-500 ring-2 ring-amber-400 bg-white' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <div className="text-2xl mb-2">{group === 'small' ? '📦' : group === 'medium' ? '🛻' : '🏗️'}</div>
                <div className="font-semibold text-sm">{LOAD_GROUP_LABELS[group]}</div>
              </button>
            ))}
          </div>
        </div>

        {loadGroup === 'small' && (
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-2">Elegí una opción</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {groupRules.map((rule) => (
                <button type="button" key={rule.code} onClick={() => setLoadOption(rule.code)}
                  className={`aspect-square border rounded-xl p-3 flex flex-col items-center justify-center text-center transition ${loadOption === rule.code ? 'border-amber-500 ring-2 ring-amber-400 bg-white' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <div className="text-2xl mb-1">{rule.code === 'sobre' ? '✉️' : rule.code === 'manual' ? '⚖️' : '📦'}</div>
                  <div className="font-semibold text-xs leading-tight">{rule.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {loadGroup === 'medium' && (
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-2">Medidas de la carga (en cm)</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="aspect-square border rounded-xl p-4 bg-white flex flex-col justify-center">
                <label className="text-xs text-gray-500 mb-1">Largo</label>
                <input className="w-full border rounded-lg px-3 py-2 text-center font-semibold" type="number" min="0" value={lengthCm} onChange={(e) => setLengthCm(e.target.value)} placeholder="1200" />
                <span className="text-xs text-gray-400 text-center mt-1">cm</span>
              </div>
              <div className="aspect-square border rounded-xl p-4 bg-white flex flex-col justify-center">
                <label className="text-xs text-gray-500 mb-1">Ancho</label>
                <input className="w-full border rounded-lg px-3 py-2 text-center font-semibold" type="number" min="0" value={widthCm} onChange={(e) => setWidthCm(e.target.value)} placeholder="1000" />
                <span className="text-xs text-gray-400 text-center mt-1">cm</span>
              </div>
              <div className="aspect-square border rounded-xl p-4 bg-white flex flex-col justify-center">
                <label className="text-xs text-gray-500 mb-1">Alto</label>
                <input className="w-full border rounded-lg px-3 py-2 text-center font-semibold" type="number" min="0" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="1000" />
                <span className="text-xs text-gray-400 text-center mt-1">cm</span>
              </div>
            </div>
          </div>
        )}

        {loadGroup === 'large' && (
          <Field label="Descripción de la carga grande" hint="Indicá peso aproximado, medidas, tipo de máquina/vehículo, etc.">
            <textarea className={inputCls} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Tractor agrícola de 3 toneladas, 4m de largo, 2m de ancho…" />
          </Field>
        )}

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">Tipo de vehículo que necesitás</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {CATS.map(([k, label]) => (
              <button type="button" key={k} onClick={() => setCategory(k as Category)}
                className={`border rounded-xl p-3 text-left transition ${category === k ? 'border-amber-500 bg-white ring-2 ring-amber-400' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <div className="font-semibold text-sm">{label}</div>
              </button>
            ))}
          </div>
        </div>

        <Field label="Título"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Caja de repuestos a Rafaela" /></Field>
        {loadGroup !== 'large' && (
          <Field label="Descripción"><textarea className={inputCls} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalles de la carga, embalaje, instrucciones de entrega…" /></Field>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Peso (kg)"><input className={inputCls} type="number" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Ej. 25" /></Field>
          <Field label="Valor declarado (ARS)" hint="Obligatorio para seguro de la carga."><input className={inputCls} type="number" min="0" value={declaredValue} onChange={(e) => setDeclaredValue(e.target.value)} placeholder="Ej. 150000" /></Field>
        </div>
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
          <Field label="Alias del receptor (@usuario)" hint="Obligatorio. El receptor debe tener un alias único en CARG-AR.">
            <div className="flex items-center gap-2">
              <span className="bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg px-3 py-2 text-sm text-gray-600">@</span>
              <input className={inputCls + ' rounded-l-none'} value={receiverAlias} onChange={(e) => { setReceiverAlias(e.target.value); setReceiverError(''); }} placeholder="alias del receptor" />
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

        <Field label="Precio inicial que podés pagar">
          <input className={inputCls} type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Ingresá tu precio" />
        </Field>

        {error && <Alert kind="error">{error}</Alert>}
        <button disabled={saving} className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-gray-900 font-bold px-6 py-3 rounded-xl w-full sm:w-auto">
          {saving ? 'Publicando…' : `Publicar carga`}
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
