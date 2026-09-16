import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listShipments } from '../lib/db';
import { money, type Shipment } from '../lib/types';
import { StatusChip, UserChip, Countdown, inputCls, Alert } from '../components/ui';
import { MapView, categoryColor, type MapMarker } from '../components/MapView';
import { useAuth } from '../lib/useAuth';
import { fetchProvinces, fetchLocalities, type Province, type Locality } from '../lib/geo';
import LandingPage from './LandingPage';

const CATS = [
  ['paqueteria', 'Paquetería (sobre/bulto)'],
  ['pallets', 'Pallets'],
  ['maquinaria', 'Maquinaria y vehículos'],
] as const;

export default function Feed() {
  const { userId } = useAuth();
  const [rows, setRows] = useState<Shipment[]>([]);
  const [error, setError] = useState('');
  const [view, setView] = useState<'lista' | 'mapa'>('lista');
  const [cat, setCat] = useState('');
  const [provFilter, setProvFilter] = useState('');
  const [locFilter, setLocFilter] = useState('');
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);

  async function load() {
    try {
      setRows(await listShipments({ category: cat || undefined }));
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => { load(); }, [cat]);

  useEffect(() => {
    fetchProvinces().then(setProvinces).catch(() => setError('No se pudieron cargar provincias'));
  }, []);

  useEffect(() => {
    if (!provFilter) { setLocalities([]); setLocFilter(''); return; }
    const name = provinces.find((p) => p.id === provFilter)?.name;
    if (!name) return;
    fetchLocalities(name).then(setLocalities).catch(() => setError('No se pudieron cargar localidades'));
  }, [provFilter, provinces]);

  const filtered = useMemo(() => {
    let r = rows;
    if (provFilter) r = r.filter((s) => s.origin_province === provinces.find((p) => p.id === provFilter)?.name);
    if (locFilter) r = r.filter((s) => s.origin_locality === locFilter);
    return r;
  }, [rows, provFilter, locFilter, provinces]);

  const markers: MapMarker[] = filtered
    .filter((s) => s.origin?.lat != null)
    .map((s) => ({
      lat: s.origin.lat, lng: s.origin.lng,
      color: categoryColor[s.category],
      label: `<b>${s.title}</b><br/>Desde: ${s.origin_locality}, ${s.origin_province}<br/>${money(s.start_price)} · <a href="/flete/${s.id}">Ver flete</a>`,
    }));

  if (!userId) return <LandingPage />;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold mr-auto">Fletes en subasta</h1>
        <Link to="/nuevo" className="bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-700">
          + Publicar flete
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex rounded-lg border border-gray-300 overflow-hidden bg-white">
          {(['lista', 'mapa'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-2 text-sm font-medium ${view === v ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'}`}>
              {v === 'lista' ? '☰ Lista' : '🗺 Mapa'}
            </button>
          ))}
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={`${inputCls} max-w-[220px]`}>
          <option value="">Todas las categorías</option>
          {CATS.map(([k, c]) => <option key={k} value={k}>{c}</option>)}
        </select>
        <select value={provFilter} onChange={(e) => setProvFilter(e.target.value)} className={`${inputCls} max-w-[220px]`}>
          <option value="">Todas las provincias</option>
          {provinces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={locFilter} onChange={(e) => setLocFilter(e.target.value)} className={`${inputCls} max-w-[220px]`}>
          <option value="">Todas las localidades</option>
          {localities.map((l) => <option key={l.id} value={l.name}>{l.name}</option>)}
        </select>
      </div>

      {error && <Alert kind="error">{error}</Alert>}

      {view === 'lista' ? (
        <div className="grid gap-3">
          {filtered.map((s) => (
            <Link key={s.id} to={`/flete/${s.id}`}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:border-amber-400 hover:shadow-sm transition flex flex-wrap items-center gap-4"
            >
              <div className={`w-1.5 self-stretch rounded ${s.category === 'paqueteria' ? 'bg-amber-400' : s.category === 'pallets' ? 'bg-blue-500' : 'bg-red-500'}`} />
              <div className="min-w-[240px] flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{s.title}</span>
                  <StatusChip status={s.status} />
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  📍 {s.origin_locality}, {s.origin_province} → {s.destination_locality}, {s.destination_province}
                  {s.weight_kg ? ` · ${s.weight_kg} kg` : ''}
                </div>
                <div className="mt-1">
                  <UserChip name={s.dispatcher?.username || s.dispatcher?.full_name || ''} reputation={s.reputation} />
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">{money(s.start_price)}</div>
                {s.status === 'published' && <Countdown to={s.auction_ends_at} />}
              </div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              No hay fletes que coincidan.
            </div>
          )}
        </div>
      ) : (
        <MapView markers={markers} height={560} />
      )}

      <p className="text-xs text-gray-400 mt-4">
        Los pines marcan la zona de origen; la dirección exacta se desbloquea al aceptar la oferta. Comisiones: paquetería 5%, pallets 7%, maquinaria 12%.
      </p>
    </div>
  );
}
