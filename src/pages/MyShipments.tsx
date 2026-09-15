import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { money, type Shipment } from '../lib/types';
import { StatusChip, UserChip, Countdown, Alert } from '../components/ui';
import { useAuth } from '../lib/useAuth';

export default function MyShipments() {
  const { userId, profile, signIn } = useAuth();
  const [rows, setRows] = useState<Shipment[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('shipments')
      .select('*, dispatcher:profiles!shipments_dispatcher_id_fkey(*)')
      .or(`dispatcher_id.eq.${userId},awarded_carrier_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => { if (error) setError(error.message); setRows(data || []); });
  }, [userId]);

  if (!userId) return <Alert><button onClick={signIn} className="font-semibold underline">Iniciá sesión</button> para ver tus fletes.</Alert>;

  const mine = rows.filter((r) => r.dispatcher_id === userId);
  const asCarrier = rows.filter((r) => r.awarded_carrier_id === userId);
  const asReceiver = rows.filter((r) => r.receiver_id === userId && r.dispatcher_id !== userId && r.awarded_carrier_id !== userId);

  const list = (items: Shipment[], empty: string) => (
    <div className="grid gap-3">
      {items.map((s) => (
        <Link key={s.id} to={`/flete/${s.id}`} className="bg-white rounded-xl border p-4 flex flex-wrap items-center gap-3 hover:border-amber-400">
          <div className="flex-1">
            <div className="flex items-center gap-2"><span className="font-semibold">{s.title}</span><StatusChip status={s.status} /></div>
            <div className="text-sm text-gray-600">📍 {s.origin?.label} → {s.destination?.label}</div>
            <UserChip name={s.dispatcher?.full_name || ''} />
          </div>
          <div className="text-right">
            <div className="font-bold">{money(s.total_value || s.start_price)}</div>
            {s.status === 'published' && <Countdown to={s.auction_ends_at} />}
          </div>
        </Link>
      ))}
      {items.length === 0 && <p className="text-sm text-gray-500">{empty}</p>}
    </div>
  );

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Mis fletes</h1>
      {error && <Alert kind="error">{error}</Alert>}
      <section>
        <h2 className="font-semibold mb-3">Publicados por mí ({mine.length})</h2>
        {list(mine, 'Todavía no publicaste fletes.')}
      </section>
      {profile?.is_carrier && (
        <section>
          <h2 className="font-semibold mb-3">Como transportista ({asCarrier.length})</h2>
          {list(asCarrier, 'Sin fletes adjudicados por ahora.')}
        </section>
      )}
      <section>
        <h2 className="font-semibold mb-3">Donde recibo ({asReceiver.length})</h2>
        {list(asReceiver, 'No eres receptor de ningún envío.')}
      </section>
    </div>
  );
}
