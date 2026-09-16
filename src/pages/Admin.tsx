import { useEffect, useState } from 'react';
import { getAdminMetrics, getCarrierQueue, getDisputes, getLoadRules, saveLoadRule, setCarrierStatus } from '../lib/db';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/useAuth';
import { Alert } from '../components/ui';
import { LOAD_GROUP_LABELS, type Dispute, type LoadGroup, type LoadRule } from '../lib/types';

export default function Admin() {
  const { userId, profile, signIn } = useAuth();
  const [queue, setQueue] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [rules, setRules] = useState<LoadRule[]>([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      const [carrierQueue, disputeRows, ruleRows, metricRows] = await Promise.all([
        getCarrierQueue(),
        getDisputes(),
        getLoadRules(),
        getAdminMetrics(),
      ]);
      setQueue(carrierQueue);
      setDisputes(disputeRows);
      setRules(ruleRows);
      setMetrics(metricRows);
      const { data } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
      setReports(data || []);
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => { if (userId) load(); }, [userId]);

  if (!userId) return <Alert><button onClick={signIn} className="font-semibold underline">Iniciá sesión</button> con una cuenta administradora.</Alert>;
  if (!profile?.is_admin) return <Alert kind="error">Esta sección es solo para administradores.</Alert>;

  async function verify(uid: string, status: string) {
    const { error } = await setCarrierStatus(uid, status as any);
    if (error) setError(error.message);
    load();
  }

  async function resolveDispute(d: Dispute, release: boolean) {
    const { error } = await supabase.from('disputes').update({
      status: release ? 'resolved_release' : 'resolved_refund',
      resolved_at: new Date().toISOString(),
    }).eq('id', d.id);
    if (error) return setError(error.message);
    await supabase.from('shipments').update({ status: release ? 'released' : 'cancelled' }).eq('id', d.shipment_id);
    if (release) await supabase.from('transactions').update({ status: 'released', released_at: new Date().toISOString() }).eq('shipment_id', d.shipment_id);
    else await supabase.from('transactions').update({ status: 'refunded' }).eq('shipment_id', d.shipment_id);
    load();
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Panel de administración</h1>
      {error && <Alert kind="error">{error}</Alert>}

      {metrics && (
        <section className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            ['Usuarios', metrics.users],
            ['Transportistas', metrics.carriers],
            ['Verificados', metrics.verifiedCarriers],
            ['Pendientes', metrics.pendingCarriers],
            ['Publicaciones hoy', metrics.publicationsToday],
            ['Publicaciones históricas', metrics.publicationsTotal],
          ].map(([label, value]) => (
            <div key={label as string} className="bg-white rounded-xl border p-4">
              <div className="text-2xl font-black text-gray-900">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </section>
      )}

      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold mb-3">Publicaciones por tipo de carga</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {(['small', 'medium', 'large'] as LoadGroup[]).map((group) => (
            <div key={group} className="rounded-lg bg-gray-50 p-3">
              <div className="text-sm text-gray-500">{LOAD_GROUP_LABELS[group]}</div>
              <div className="text-xl font-bold">{metrics?.publicationsByGroup[group] || 0}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold mb-3">Reglas de cargas y tarifas</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b"><th className="py-2">Tipo</th><th>Opción</th><th>0–30 km</th><th>30–100 km</th><th>100–250 km</th><th>Comisión</th><th /></tr></thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-b last:border-0">
                  <td className="py-2">{LOAD_GROUP_LABELS[rule.group]}</td>
                  <td>{rule.label}</td>
                  {(['tariff_0_30', 'tariff_30_100', 'tariff_100_250', 'commission_pct'] as const).map((field) => (
                    <td key={field}>
                      <input
                        className="w-24 border rounded px-2 py-1"
                        type="number"
                        value={rule[field] ?? ''}
                        disabled={rule.manual && field.startsWith('tariff')}
                        onChange={(e) => setRules((current) => current.map((item) => item.id === rule.id ? { ...item, [field]: e.target.value === '' ? null : Number(e.target.value) } : item))}
                      />
                      {field === 'commission_pct' ? '%' : ''}
                    </td>
                  ))}
                  <td><button onClick={async () => { const { error: saveError } = await saveLoadRule({ ...rule, group_code: rule.group } as any); if (saveError) setError(saveError.message); }} className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg">Guardar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-3">Las opciones manuales se resaltan en amarillo en el formulario de publicación y permiten ingresar el precio directamente.</p>
      </section>

      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold mb-3">Verificación de transportistas</h2>
        <div className="space-y-2">
          {queue.map((c) => (
            <div key={c.user_id} className="flex flex-wrap items-center gap-3 border rounded-lg p-3 text-sm">
              <div className="flex-1">
                <b>{c.profile?.full_name}</b> · {c.rubro} ·
                <span className={`ml-2 font-semibold ${c.status === 'verified' ? 'text-green-700' : 'text-amber-600'}`}>{c.status}</span>
                <span className={`ml-2 ${c.mp_connected ? 'text-green-700' : 'text-gray-400'}`}>MP: {c.mp_connected ? '✓' : '—'}</span>
              </div>
              <button onClick={() => verify(c.user_id, 'verified')} className="bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">Verificar</button>
              <button onClick={() => verify(c.user_id, 'rejected')} className="bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">Rechazar</button>
            </div>
          ))}
          {queue.length === 0 && <p className="text-sm text-gray-500">Sin solicitudes.</p>}
        </div>
      </section>

      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold mb-3">Disputas ({disputes.filter((d) => d.status === 'open').length} abiertas)</h2>
        <div className="space-y-2">
          {disputes.map((d) => (
            <div key={d.id} className="border rounded-lg p-3 text-sm space-y-2">
              <div className="flex items-center gap-2">
                <b>{d.status}</b>
                <span className="text-gray-500">flete {d.shipment_id.slice(0, 8)}…</span>
              </div>
              <p className="text-gray-700">{d.reason}</p>
              {d.status === 'open' && (
                <div className="flex gap-2">
                  <button onClick={() => resolveDispute(d, true)} className="bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">Liberar pago al transportista</button>
                  <button onClick={() => resolveDispute(d, false)} className="bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">Reembolsar al cliente</button>
                </div>
              )}
            </div>
          ))}
          {disputes.length === 0 && <p className="text-sm text-gray-500">Sin disputas.</p>}
        </div>
      </section>

      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold mb-3">Denuncias por carga mal declarada</h2>
        <div className="space-y-2">
          {reports.map((r) => (
            <div key={r.id} className="border rounded-lg p-3 text-sm flex items-center gap-3">
              <div className="flex-1">{r.reason} · <span className="text-gray-500">{r.status}</span></div>
              <button
                onClick={async () => { await supabase.from('reports').update({ status: 'resolved' }).eq('id', r.id); load(); }}
                className="bg-gray-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                Marcar resuelta
              </button>
            </div>
          ))}
          {reports.length === 0 && <p className="text-sm text-gray-500">Sin denuncias.</p>}
        </div>
      </section>
    </div>
  );
}
