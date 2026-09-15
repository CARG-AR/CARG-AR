import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  acceptBid, demoPay, getBids, getDelivery, getReputation, getShipment, getTransaction,
  openDispute, placeBid, releasePayment, saveDelivery, saveReview, updateShipment, uploadPhoto,
} from '../lib/db';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/useAuth';
import {
  money, VEHICLE_TYPES, type Bid, type Delivery, type Profile,
  type Review, type Shipment, type Transaction,
} from '../lib/types';
import { Alert, Countdown, Field, inputCls, StatusChip, UserChip } from '../components/ui';
import { MapView } from '../components/MapView';
import { getCarrierProfile } from '../lib/db';

export default function ShipmentDetail() {
  const { id } = useParams();
  const { userId, profile, signIn } = useAuth();
  const [s, setS] = useState<Shipment | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [tx, setTx] = useState<Transaction | null>(null);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [myBidAmount, setMyBidAmount] = useState('');
  const [myBidMsg, setMyBidMsg] = useState('');
  const [error, setError] = useState('');
  const [dni, setDni] = useState('');
  const [arrival, setArrival] = useState<string[]>([]);
  const [receiverSearch, setReceiverSearch] = useState('');
  const [receiverResults, setReceiverResults] = useState<Profile[]>([]);
  const [reviewsGiven, setReviewsGiven] = useState<Review[]>([]);
  const [dispute, setDispute] = useState('');
  const [gpsActive, setGpsActive] = useState(false);

  const isDispatcher = !!s && userId === s.dispatcher_id;
  const isCarrier = !!s && userId === s.awarded_carrier_id;
  const isReceiver = !!s && !!s.receiver_id && userId === s.receiver_id;
  const isParticipant = isDispatcher || isCarrier || isReceiver;

  const reload = useCallback(async () => {
    if (!id) return;
    try {
      const sh = await getShipment(id);
      setS(sh);
      if (sh) {
        if (['published'].includes(sh.status)) setBids(await getBids(sh.id));
        setTx(await getTransaction(sh.id));
        setDelivery(await getDelivery(sh.id));
      }
    } catch (e: any) {
      setError(e.message || 'No se pudo cargar el flete.');
    }
  }, [id]);

  useEffect(() => { reload(); }, [reload, userId]);

  // Realtime: pujas y cambios de estado
  useEffect(() => {
    if (!id) return;
    const ch = supabase.channel(`shipment-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bids', filter: `shipment_id=eq.${id}` }, () => reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments', filter: `id=eq.${id}` }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, reload]);

  // Auto-liberación: si pasó el plazo sin reclamo, cualquiera de las partes dispara la liberación
  useEffect(() => {
    if (s?.status === 'delivered' && delivery?.auto_release_at) {
      const ms = new Date(delivery.auto_release_at).getTime() - Date.now();
      if (ms <= 0 && isParticipant) { releasePayment(s.id).then(reload); return; }
      const t = setTimeout(() => releasePayment(s.id).then(reload), Math.min(ms, 2 ** 31 - 1));
      return () => clearTimeout(t);
    }
  }, [s?.status, delivery?.auto_release_at, isParticipant]);

  // Reseñas ya dadas por mí
  useEffect(() => {
    if (userId && s && s.status === 'released') {
      supabase.from('reviews').select('*').eq('shipment_id', s.id).eq('reviewer_id', userId)
        .then(({ data }) => setReviewsGiven(data || []));
    }
  }, [userId, s?.status, s?.id]);

  async function bid() {
    if (!s || !userId) return;
    const cp = await getCarrierProfile(userId);
    if (!cp || cp.status !== 'verified') return setError('Para pujar necesitás perfil de transportista verificado (papeles del vehículo).');
    if (!cp.mp_connected) return setError('Para pujar debés conectar tu cuenta de MercadoPago (recibirás el pago por ahí).');
    const { error } = await placeBid(s.id, userId, Number(myBidAmount), myBidMsg);
    if (error) setError(error.message); else { setMyBidAmount(''); reload(); }
  }

  async function accept(b: Bid) {
    if (!s) return;
    const { error } = await acceptBid(b, s) as any;
    if (error) setError(error.message || String(error));
    reload();
  }

  async function pay() {
    if (!s) return;
    const total = s.total_value || s.start_price;
    const { error } = await demoPay(s, total);
    if (error) setError(error);
    reload();
  }

  async function startTransit() {
    if (!s) return;
    if (!delivery?.origin_photo) return setError('La foto de carga en origen es obligatoria para despachar.');
    const { error } = await updateShipment(s.id, { status: 'in_transit' });
    if (error) setError(error.message);
    reload();
  }

  async function uploadOrigin(files: FileList | null) {
    if (!files?.[0] || !userId || !s) return;
    try {
      const url = await uploadPhoto('shipment-photos', userId, files[0]);
      await saveDelivery({ shipment_id: s.id, origin_photo: url });
      reload();
    } catch (e: any) { setError(e.message); }
  }

  async function uploadArrival(files: FileList | null) {
    if (!files || !userId || !s) return;
    for (const f of Array.from(files).slice(0, 4)) {
      try { const url = await uploadPhoto('shipment-photos', userId, f); setArrival((a) => [...a, url]); }
      catch (e: any) { setError(e.message); }
    }
  }

  async function declareDelivery() {
    if (!s || !userId) return;
    if (arrival.length === 0) return setError('Adjuntá al menos una foto de cómo llegó / dónde quedó el producto.');
    if (!dni.trim()) return setError('Ingresá el número de DNI de quien recibió (sin foto del documento).');
    const autoRelease = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    try {
      await saveDelivery({
        shipment_id: s.id,
        arrival_photos: arrival,
        receiver_dni: dni.trim(),
        coords: lastGps ? { lat: lastGps.lat, lng: lastGps.lng } : null,
        declared_at: new Date().toISOString(),
        auto_release_at: autoRelease,
      });
      await updateShipment(s.id, { status: 'delivered' });
      reload();
    } catch (e: any) { setError(e.message); }
  }

  async function disputeNow() {
    if (!s || !userId || !dispute.trim()) return;
    const { error } = await openDispute(s.id, userId, dispute.trim()) as any;
    if (error) setError(error.message || String(error));
    reload();
  }

  async function searchReceiver(v: string) {
    setReceiverSearch(v);
    if (v.length < 3) return setReceiverResults([]);
    const { data } = await supabase.from('profiles').select('*').ilike('full_name', `%${v}%`).limit(5);
    setReceiverResults(data || []);
  }

  // GPS del transportista en tránsito
  let lastGps: { lat: number; lng: number } | null = null;
  useEffect(() => {
    if (s?.status === 'in_transit' && isCarrier && navigator.geolocation) {
      const wid = navigator.geolocation.watchPosition(
        (p) => { lastGps = { lat: p.coords.latitude, lng: p.coords.longitude }; setGpsActive(true); },
        () => setGpsActive(false),
        { enableHighAccuracy: true },
      );
      return () => navigator.geolocation.clearWatch(wid);
    }
    setGpsActive(false);
  }, [s?.status, isCarrier]);

  const myRole = isDispatcher ? 'Despacho' : isCarrier ? 'Transportista' : isReceiver ? 'Receptor' : null;
  const pendingRatees = useMemo(() => {
    if (!s || s.status !== 'released' || !userId) return [];
    const all: { id: string; name: string; role: string }[] = [];
    if (s.awarded_carrier_id && s.awarded_carrier_id !== userId)
      all.push({ id: s.awarded_carrier_id, name: (s as any).carrier?.full_name || 'Transportista', role: 'transportista' });
    if (s.dispatcher_id !== userId)
      all.push({ id: s.dispatcher_id, name: s.dispatcher?.full_name || 'Despachante', role: 'despacho' });
    if (s.receiver_id && s.receiver_id !== userId)
      all.push({ id: s.receiver_id, name: (s as any).receiver?.full_name || 'Receptor', role: 'receptor' });
    return all.filter((a) => !reviewsGiven.some((r) => r.reviewee_id === a.id));
  }, [s, userId, reviewsGiven]);

  if (!s) return <div className="text-gray-500">Cargando…</div>;

  const unlockContacts = isParticipant && s.status !== 'published';

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="bg-white rounded-xl border p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold mr-auto">{s.title}</h1>
          <StatusChip status={s.status} />
        </div>
        <p className="text-sm text-gray-600 mt-2">{s.description}</p>
        <div className="grid sm:grid-cols-4 gap-3 mt-4 text-sm">
          <div><div className="text-gray-500 text-xs">Origen</div>{s.origin?.label}</div>
          <div><div className="text-gray-500 text-xs">Destino</div>{s.destination?.label}</div>
          <div><div className="text-gray-500 text-xs">Peso</div>{s.weight_kg ? `${s.weight_kg} kg` : '—'}</div>
          <div><div className="text-gray-500 text-xs">Categoría / vehículo</div>{s.category} · {VEHICLE_TYPES[s.vehicle_required] || s.vehicle_required}</div>
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <span className="text-2xl font-bold">{money(s.total_value || s.start_price)}</span>
          <span className="text-xs text-gray-500">Comisión plataforma: {s.commission_pct}%</span>
          {s.status === 'published' && <Countdown to={s.auction_ends_at} />}
        </div>
        {s.photos?.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {s.photos.map((p) => <img key={p} src={p} className="h-24 w-24 object-cover rounded-lg border" />)}
          </div>
        )}
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {!userId && <Alert><button onClick={signIn} className="font-semibold underline">Iniciá sesión</button> para ver contactos, pujar y seguir el flete.</Alert>}

      {/* Puja del transportista */}
      {userId && s.status === 'published' && !isDispatcher && profile?.is_carrier && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold mb-2">Pujar por este flete</h2>
          <p className="text-sm text-gray-600 mb-3">Aceptá el precio o ofrecé el tuyo. Al ser elegido se desbloquean los contactos y cobrás con la garantía de la plataforma.</p>
          <div className="flex flex-wrap gap-3 items-end">
            <Field label="Tu oferta ($)"><input className={inputCls + ' w-40'} type="number" min="1" value={myBidAmount} onChange={(e) => setMyBidAmount(e.target.value)} /></Field>
            <Field label="Mensaje"><input className={inputCls + ' w-64'} value={myBidMsg} onChange={(e) => setMyBidMsg(e.target.value)} placeholder="Ej: paso mañana temprano" /></Field>
            <button onClick={bid} className="bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold px-5 py-2.5 rounded-lg">Pujar</button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {/* Acciones según rol y estado */}
        {isDispatcher && s.status === 'published' && (
          <div className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold mb-3">Ofertas recibidas ({bids.length})</h2>
            <div className="space-y-3">
              {bids.map((b) => (
                <div key={b.id} className="flex items-center gap-3 border rounded-lg p-3">
                  <div className="flex-1">
                    <UserChip name={b.carrier?.full_name || ''} reputation={b.reputation} />
                    <div className="text-xs text-gray-500">{b.message}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{money(b.amount)}</div>
                    <button onClick={() => accept(b)} className="text-xs bg-amber-400 hover:bg-amber-300 font-semibold px-3 py-1.5 rounded-lg mt-1">
                      Aceptar
                    </button>
                  </div>
                </div>
              ))}
              {bids.length === 0 && <p className="text-sm text-gray-500">Todavía no hay pujas. Esperá a los transportistas de la zona.</p>}
            </div>
            <div className="mt-4 pt-3 border-t">
              <Field label="Designar receptor (usuario registrado)" hint="Necesario para la reputación triangular: el receptor también califica y es calificado.">
                <input className={inputCls} value={receiverSearch} onChange={(e) => searchReceiver(e.target.value)} placeholder="Buscar por nombre…" />
              </Field>
              {receiverResults.map((r) => (
                <button key={r.id}
                  onClick={async () => { await updateShipment(s.id, { receiver_id: r.id }); setReceiverResults([]); setReceiverSearch(r.full_name); reload(); }}
                  className="block w-full text-left text-sm px-3 py-2 hover:bg-gray-100 rounded">
                  {r.full_name}
                </button>
              ))}
              {s.receiver_id && <p className="text-xs text-green-700 mt-1">Receptor asignado: {(s as any).receiver?.full_name}</p>}
            </div>
          </div>
        )}

        {isDispatcher && s.status === 'awarded' && (
          <div className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold mb-2">Pagar con garantía</h2>
            <p className="text-sm text-gray-600">
              El valor queda <b>retenido</b> y solo se libera al transportista cuando se confirma la entrega
              (foto + DNI del receptor) y pasan 48 h sin reclamos.
            </p>
            <button onClick={pay} className="mt-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-5 py-2.5 rounded-lg">
              Pagar {money(s.total_value || s.start_price)} (retención demo)
            </button>
            <p className="text-xs text-gray-400 mt-2">
              MVP en modo demo: simula el split de MercadoPago. En producción lo confirma el webhook del PSP.
            </p>
          </div>
        )}

        {isCarrier && s.status === 'paid' && (
          <div className="bg-white rounded-xl border p-5 space-y-3">
            <h2 className="font-semibold">Despacho: foto de carga en origen (obligatoria)</h2>
            {delivery?.origin_photo
              ? <img src={delivery.origin_photo} className="h-28 w-28 object-cover rounded-lg border" />
              : <input type="file" accept="image/*" onChange={(e) => uploadOrigin(e.target.files)} className="text-sm" />}
            <button onClick={startTransit} className="block bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-5 py-2.5 rounded-lg">
              Iniciar viaje
            </button>
          </div>
        )}

        {isCarrier && (s.status === 'in_transit' || s.status === 'paid') && (
          <div className="bg-white rounded-xl border p-5 space-y-3">
            <h2 className="font-semibold">GPS obligatorio</h2>
            <p className="text-sm">
              Estado: {gpsActive
                ? <span className="text-green-700 font-semibold">activo — reloj de liberación corriendo</span>
                : <span className="text-red-600 font-semibold">apagado — el reloj de liberación está pausado</span>}
            </p>
            {isCarrier && s.status === 'in_transit' && (
              <>
                <h3 className="font-semibold pt-2">Declarar entrega</h3>
                <Field label="Fotos de cómo llega / dónde queda el producto" hint="Puerta, patio, lugar escondido: evidencia de dónde quedó.">
                  <input type="file" accept="image/*" multiple onChange={(e) => uploadArrival(e.target.files)} className="text-sm" />
                </Field>
                {arrival.length > 0 && (
                  <div className="flex gap-2 flex-wrap">{arrival.map((a) => <img key={a} src={a} className="h-20 w-20 object-cover rounded border" />)}</div>
                )}
                <Field label="DNI de quien recibió (solo el número)">
                  <input className={inputCls} value={dni} onChange={(e) => setDni(e.target.value)} placeholder="Ej: 30123456" />
                </Field>
                <button onClick={declareDelivery} className="bg-teal-600 hover:bg-teal-500 text-white font-semibold px-5 py-2.5 rounded-lg">
                  Confirmar entrega
                </button>
              </>
            )}
          </div>
        )}

        {(s.status === 'delivered' || s.status === 'disputed') && (
          <div className="bg-white rounded-xl border p-5 space-y-3">
            <h2 className="font-semibold">Evidencia de entrega</h2>
            <div className="flex gap-2 flex-wrap">
              {delivery?.arrival_photos?.map((a) => <img key={a} src={a} className="h-24 w-24 object-cover rounded border" />)}
            </div>
            <p className="text-sm">DNI receptor: <b>{delivery?.receiver_dni}</b></p>
            {s.status === 'delivered' && delivery?.auto_release_at && isParticipant && (
              <p className="text-sm">
                Liberación automática en <Countdown to={delivery.auto_release_at} /> si no hay reclamo.
              </p>
            )}
            {s.status === 'delivered' && isDispatcher && (
              <div className="space-y-2 pt-2 border-t">
                <Field label="Abrir disputa (congela los fondos)">
                  <input className={inputCls} value={dispute} onChange={(e) => setDispute(e.target.value)} placeholder="Contá qué pasó con la entrega…" />
                </Field>
                <button onClick={disputeNow} className="bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-4 py-2 rounded-lg">
                  Disputar entrega
                </button>
              </div>
            )}
          </div>
        )}

        {s.status === 'released' && (
          <div className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold text-green-700">Operación cerrada</h2>
            <p className="text-sm text-gray-600 mt-1">
              {tx && <>Total {money(tx.amount_total)} · Comisión plataforma {money(tx.commission_amount)} · Transportista cobra {money(tx.carrier_net)}</>}
            </p>
          </div>
        )}

        {tx && tx.status === 'held' && isParticipant && (
          <div className="bg-white rounded-xl border p-5 text-sm">
            <h2 className="font-semibold mb-1">Garantía</h2>
            Pago <b>retenido</b>: {money(tx.amount_total)} · Liberación al transportista: {money(tx.carrier_net)} · Comisión: {money(tx.commission_amount)}
          </div>
        )}

        {/* Contactos desbloqueados */}
        {unlockContacts && (
          <div className="bg-white rounded-xl border p-5 text-sm space-y-2">
            <h2 className="font-semibold">Contactos y datos (desbloqueados)</h2>
            {isDispatcher || isReceiver ? (
              <p>Transportista: <b>{(s as any).carrier?.full_name}</b> · Vehículo requerido: {VEHICLE_TYPES[s.vehicle_required] || s.vehicle_required}</p>
            ) : (
              <p>Receptor: <b>{(s as any).receiver?.full_name}</b> · Destino exacto: <b>{s.destination_exact || s.destination?.label}</b></p>
            )}
            <p className="text-xs text-gray-500">Los datos completos del vehículo y teléfonos se comparten una vez confirmado el pago.</p>
          </div>
        )}

        {/* Reseñas triangulares */}
        {s.status === 'released' && userId && myRole && pendingRatees.length > 0 && (
          <div className="bg-white rounded-xl border p-5 space-y-4 md:col-span-2">
            <h2 className="font-semibold">Calificá a los participantes (como {myRole})</h2>
            {pendingRatees.map((r) => (
              <RateForm key={r.id} target={r} shipmentId={s.id} onDone={reload} />
            ))}
          </div>
        )}
        {s.status === 'released' && pendingRatees.length === 0 && (
          <div className="bg-white rounded-xl border p-5 text-sm text-gray-600 md:col-span-2">
            Ya calificaste a todos los participantes. ¡Gracias!
          </div>
        )}

        {/* Ruta */}
        <div className="md:col-span-2">
          <MapView
            markers={[
              { ...s.origin, color: '#f59e0b', label: 'Origen' },
              { ...s.destination, color: '#ef4444', label: 'Destino' },
            ]}
            height={300}
          />
        </div>
      </div>
    </div>
  );
}

function RateForm({ target, shipmentId, onDone }: { target: { id: string; name: string; role: string }; shipmentId: string; onDone: () => void }) {
  const { userId } = useAuth();
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);

  async function save() {
    if (!userId) return;
    const rep = await getReputation(target.id); // asegura existencia (no obligatoria)
    void rep;
    await saveReview({
      shipment_id: shipmentId, reviewer_id: userId, reviewer_role: 'usuario',
      reviewee_id: target.id, reviewee_role: target.role, stars, comment,
    });
    setDone(true); onDone();
  }

  if (done) return <p className="text-sm text-green-700">Calificación registrada para {target.name}.</p>;
  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-medium text-sm">{target.name}</span>
        <span className="text-xs text-gray-500">({target.role})</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-2xl text-amber-500 cursor-pointer select-none">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} onClick={() => setStars(n)} className={n <= stars ? '' : 'text-gray-300'}>★</span>
          ))}
        </div>
        <input className={inputCls + ' flex-1'} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Reseña (opcional)" />
        <button onClick={save} className="bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-lg">Calificar</button>
      </div>
    </div>
  );
}
