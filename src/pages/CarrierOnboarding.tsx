import { useEffect, useState } from 'react';
import { addVehicle, declareCarrier, getCarrierProfile, getVehicles, setCarrierFlag, setCarrierMp, uploadPhoto } from '../lib/db';
import { useAuth } from '../lib/useAuth';
import { Alert, Field, inputCls } from '../components/ui';
import { VEHICLE_TYPES, type CarrierProfile, type Vehicle } from '../lib/types';

const STATUS_TXT: Record<string, string> = {
  pending: 'Pendiente de revisión',
  in_review: 'En revisión por el equipo',
  verified: 'Verificado ✓',
  rejected: 'Rechazado',
};

const CATEGORIES = [
  { id: 'paqueteria', label: 'Paquetería', desc: 'Sobre, bultos chicos, encomiendas' },
  { id: 'cargas_medianas', label: 'Cargas medianas', desc: 'Pallets, electrodomésticos, mudanzas chicas' },
  { id: 'cargas_generales', label: 'Cargas en general', desc: 'Cargas variadas, hacienda, granel' },
  { id: 'cargas_pesadas', label: 'Cargas pesadas', desc: 'Maquinaria agrícola, vehículos, lotes completos' },
] as const;

export default function CarrierOnboarding() {
  const { userId, profile, signIn, refreshProfile } = useAuth();
  const [cp, setCp] = useState<CarrierProfile | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [rubro, setRubro] = useState('');
  const [v, setV] = useState({ type: 'utilitario', plate: '', insurance: '', insurance_expiry: '', vtv_expiry: '', license: '', license_expiry: '' });
  const [vPhotos, setVPhotos] = useState<{ carnet?: string; vtv?: string }>({});
  const [error, setError] = useState('');

  async function load() {
    if (!userId) return;
    setCp(await getCarrierProfile(userId));
    setVehicles(await getVehicles(userId));
  }
  useEffect(() => { load(); }, [userId]);

  if (!userId) return <Alert><button onClick={signIn} className="font-semibold underline">Iniciá sesión</button> para registrarte como transportista.</Alert>;

  async function declare() {
    if (!userId || !rubro) return setError('Elegí tu categoría.');
    const { error } = await declareCarrier(userId, rubro);
    if (error) return setError(error.message);
    await setCarrierFlag(userId, true);
    await refreshProfile();
    load();
  }

  async function connectMp() {
    // MVP: modo demo. En producción esto inicia el OAuth de MercadoPago
    // (autorización de la cuenta vendedor) gestionado desde el backend.
    if (!userId) return;
    await setCarrierMp(userId, true, `MP-DEMO-${userId.slice(0, 8)}`);
    load();
  }

  async function saveVehicle(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !v.plate.trim()) return setError('Ingresá la patente del vehículo.');
    if (!vPhotos.carnet) return setError('Subí la foto del carnet de conducir.');
    if (!vPhotos.vtv) return setError('Subí la foto de la VTV.');
    const { error } = await addVehicle({
      carrier_id: userId, ...v,
      insurance_expiry: v.insurance_expiry || null,
      vtv_expiry: v.vtv_expiry || null,
      license_expiry: v.license_expiry || null,
      photos: vPhotos,
    } as any);
    if (error) return setError(error.message);
    setV({ type: 'utilitario', plate: '', insurance: '', insurance_expiry: '', vtv_expiry: '', license: '', license_expiry: '' });
    setVPhotos({});
    load();
  }

  async function uploadDoc(kind: 'carnet' | 'vtv', files: FileList | null) {
    if (!files?.[0] || !userId) return;
    try {
      const url = await uploadPhoto('vehicle-docs', userId, files[0]);
      setVPhotos((p) => ({ ...p, [kind]: url }));
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Soy transportista</h1>

      {!cp ? (
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <p className="text-sm text-gray-600">
            Para transportar cargas es <b>obligatorio</b> declararte transportista, presentar los papeles del vehículo
            vinculado y conectar tu cuenta de MercadoPago (ahí recibís el pago con garantía).
          </p>
          <Field label="Categoría de transportista" hint="Define qué tipo de cargas podés llevar. La revisa el equipo al verificar tu documentación.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CATEGORIES.map((c) => (
                <button type="button" key={c.id} onClick={() => setRubro(c.id)}
                  className={`border rounded-xl p-3 text-left transition ${rubro === c.id ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-400' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <div className="font-semibold text-sm">{c.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{c.desc}</div>
                </button>
              ))}
            </div>
          </Field>
          {error && <Alert kind="error">{error}</Alert>}
          <button onClick={declare} className="bg-gray-900 text-white font-semibold px-5 py-2.5 rounded-lg">Declararme transportista</button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Estado de verificación</span>
              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${cp.status === 'verified' ? 'bg-green-100 text-green-700' : cp.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                {STATUS_TXT[cp.status]}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Categoría: <b>{CATEGORIES.find((c) => c.id === cp.rubro)?.label || cp.rubro}</b>
            </p>
            <div className="flex items-center gap-3 pt-2 border-t">
              <span className="text-sm">MercadoPago (cuenta vendedor):</span>
              {cp.mp_connected
                ? <span className="text-green-700 font-semibold text-sm">Conectada ✓</span>
                : <button onClick={connectMp} className="bg-blue-600 text-white text-sm font-semibold px-4 py-1.5 rounded-lg">Conectar cuenta MP</button>}
            </div>
            <p className="text-xs text-gray-400">
              En producción, este botón inicia el OAuth real de MercadoPago; la plataforma nunca ve tu clave.
            </p>
          </div>

          <div className="bg-white rounded-xl border p-5 space-y-4">
            <h2 className="font-semibold">Vehículos vinculados ({vehicles.length})</h2>
            {vehicles.map((veh) => (
              <div key={veh.id} className="border rounded-lg p-3 text-sm">
                <b>{VEHICLE_TYPES[veh.type] || veh.type}</b> · Patente {veh.plate} · Seguro: {veh.insurance || '—'}{veh.insurance_expiry ? ` (vence ${veh.insurance_expiry})` : ''}
                <div className="text-xs text-gray-500 mt-1">
                  Carnet vence: {veh.license_expiry || '—'} · VTV vence: {veh.vtv_expiry || '—'}
                </div>
              </div>
            ))}
            <form onSubmit={saveVehicle} className="space-y-3 pt-2 border-t">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Tipo">
                  <select className={inputCls} value={v.type} onChange={(e) => setV({ ...v, type: e.target.value })}>
                    {Object.entries(VEHICLE_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Patente"><input className={inputCls} value={v.plate} onChange={(e) => setV({ ...v, plate: e.target.value.toUpperCase() })} /></Field>
                <Field label="Compañía de seguro"><input className={inputCls} value={v.insurance} onChange={(e) => setV({ ...v, insurance: e.target.value })} /></Field>
                <Field label="Vencimiento del seguro"><input className={inputCls} type="date" value={v.insurance_expiry} onChange={(e) => setV({ ...v, insurance_expiry: e.target.value })} /></Field>
              </div>

              <div className="border-t pt-3 space-y-3">
                <h3 className="font-semibold text-sm">Carnet de conducir</h3>
                <div className="grid sm:grid-cols-2 gap-3 items-end">
                  <Field label="Foto del carnet" hint={vPhotos.carnet ? 'Foto cargada ✓' : 'Obligatoria'}>
                    <input type="file" accept="image/*" onChange={(e) => uploadDoc('carnet', e.target.files)} className="text-sm" />
                  </Field>
                  <Field label="Fecha de vencimiento del carnet">
                    <input className={inputCls} type="date" value={v.license_expiry} onChange={(e) => setV({ ...v, license_expiry: e.target.value })} />
                  </Field>
                </div>
                {vPhotos.carnet && <img src={vPhotos.carnet} className="h-20 w-28 object-cover rounded border" />}
              </div>

              <div className="border-t pt-3 space-y-3">
                <h3 className="font-semibold text-sm">VTV (verificación técnica vehicular)</h3>
                <div className="grid sm:grid-cols-2 gap-3 items-end">
                  <Field label="Foto de la VTV" hint={vPhotos.vtv ? 'Foto cargada ✓' : 'Obligatoria'}>
                    <input type="file" accept="image/*" onChange={(e) => uploadDoc('vtv', e.target.files)} className="text-sm" />
                  </Field>
                  <Field label="Fecha de vencimiento de la VTV">
                    <input className={inputCls} type="date" value={v.vtv_expiry} onChange={(e) => setV({ ...v, vtv_expiry: e.target.value })} />
                  </Field>
                </div>
                {vPhotos.vtv && <img src={vPhotos.vtv} className="h-20 w-28 object-cover rounded border" />}
              </div>

              {error && <Alert kind="error">{error}</Alert>}
              <button className="bg-gray-900 text-white text-sm font-semibold px-5 py-2 rounded-lg">Agregar vehículo</button>
            </form>
          </div>
          <p className="text-xs text-gray-400">
            Tu documentación permanece <b>oculta</b> para los clientes hasta que acepten una de tus ofertas.
          </p>
        </>
      )}
    </div>
  );
}
