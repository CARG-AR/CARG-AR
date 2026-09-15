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

export default function CarrierOnboarding() {
  const { userId, profile, signIn, refreshProfile } = useAuth();
  const [cp, setCp] = useState<CarrierProfile | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [rubro, setRubro] = useState('');
  const [v, setV] = useState({ type: 'utilitario', plate: '', insurance: '', insurance_expiry: '', vtv_expiry: '', permit: '', license: '' });
  const [error, setError] = useState('');

  async function load() {
    if (!userId) return;
    setCp(await getCarrierProfile(userId));
    setVehicles(await getVehicles(userId));
  }
  useEffect(() => { load(); }, [userId]);

  if (!userId) return <Alert><button onClick={signIn} className="font-semibold underline">Iniciá sesión</button> para registrarte como transportista.</Alert>;

  async function declare() {
    if (!userId || !rubro.trim()) return setError('Indicá tu rubro principal.');
    const { error } = await declareCarrier(userId, rubro.trim());
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
    const { error } = await addVehicle({
      carrier_id: userId, ...v,
      insurance_expiry: v.insurance_expiry || null,
      vtv_expiry: v.vtv_expiry || null,
      photos: [],
    } as any);
    if (error) return setError(error.message);
    setV({ type: 'utilitario', plate: '', insurance: '', insurance_expiry: '', vtv_expiry: '', permit: '', license: '' });
    load();
  }

  async function uploadDocs(vehicleId: string, files: FileList | null) {
    if (!files || !userId) return;
    for (const f of Array.from(files)) {
      try { await uploadPhoto('vehicle-docs', userId, f); } catch (e: any) { setError(e.message); }
    }
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
          <Field label="Rubro principal"><input className={inputCls} value={rubro} onChange={(e) => setRubro(e.target.value)} placeholder="Ej: paquetería, hacienda, maquinaria…" /></Field>
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
            <p className="text-sm text-gray-600">Rubro: {cp.rubro}</p>
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
                <b>{VEHICLE_TYPES[veh.type] || veh.type}</b> · Patente {veh.plate} · Seguro: {veh.insurance || '—'} · VTV: {veh.vtv_expiry || '—'}
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
                <Field label="Vencimiento VTV"><input className={inputCls} type="date" value={v.vtv_expiry} onChange={(e) => setV({ ...v, vtv_expiry: e.target.value })} /></Field>
                <Field label="Habilitación municipal"><input className={inputCls} value={v.permit} onChange={(e) => setV({ ...v, permit: e.target.value })} /></Field>
                <Field label="N° de licencia de conducir"><input className={inputCls} value={v.license} onChange={(e) => setV({ ...v, license: e.target.value })} /></Field>
              </div>
              <Field label="Fotos de la documentación (seguro, VTV, habilitación)">
                <input type="file" accept="image/*" multiple onChange={(e) => uploadDocs('new', e.target.files)} className="text-sm" />
              </Field>
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
