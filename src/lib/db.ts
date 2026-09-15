import { supabase } from './supabase';
import { FALLBACK_CONFIG, type AppConfig, type Bid, type Delivery, type Dispute, type Profile, type Review, type Shipment, type Transaction, type Vehicle, type CarrierProfile, type Reputation, type GeoPoint } from './types';

export async function getConfig(): Promise<AppConfig> {
  const { data } = await supabase.from('settings').select('data').eq('id', 1).maybeSingle();
  return (data?.data as AppConfig) || FALLBACK_CONFIG;
}

export async function getProfile(id: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  return data;
}

export async function updateProfile(id: string, patch: Partial<Profile>) {
  return supabase.from('profiles').update(patch).eq('id', id);
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('username', username.toLowerCase()).maybeSingle();
  return data;
}

export async function getCarrierProfile(id: string): Promise<CarrierProfile | null> {
  const { data } = await supabase.from('carrier_profiles').select('*').eq('user_id', id).maybeSingle();
  return data;
}

export async function declareCarrier(userId: string, rubro: string) {
  return supabase.from('carrier_profiles').upsert({ user_id: userId, rubro, status: 'in_review' });
}

export async function setCarrierStatus(userId: string, status: CarrierProfile['status']) {
  return supabase.from('carrier_profiles').update({ status, reviewed_at: new Date().toISOString() }).eq('user_id', userId);
}

export async function setCarrierMp(userId: string, connected: boolean, mpUserId?: string) {
  return supabase.from('carrier_profiles').update({ mp_connected: connected, mp_user_id: mpUserId ?? null }).eq('user_id', userId);
}

export async function setCarrierFlag(userId: string, isCarrier: boolean) {
  return supabase.from('profiles').update({ is_carrier: isCarrier }).eq('id', userId);
}

export async function getVehicles(carrierId: string): Promise<Vehicle[]> {
  const { data } = await supabase.from('vehicles').select('*').eq('carrier_id', carrierId).order('created_at');
  return data || [];
}

export async function addVehicle(v: Omit<Vehicle, 'id'>) {
  return supabase.from('vehicles').insert(v);
}

// Distancia haversine x factor de ruta (MVP sin API de peajes/rutas)
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function routeKm(a: GeoPoint, b: GeoPoint): number {
  return Math.max(1, Math.round(haversineKm(a, b) * 1.25));
}

export function estimatePrice(km: number, tariffPerKm: number): number {
  const base = 8000; // carga y descarga base
  return Math.round((base + km * tariffPerKm) / 100) * 100;
}

export async function uploadPhoto(bucket: string, userId: string, file: File): Promise<string> {
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export interface ShipmentRow extends Shipment { }

export async function listShipments(filters?: { category?: string; status?: string[]; near?: { lat: number; lng: number; radiusKm: number } }): Promise<Shipment[]> {
  let q = supabase.from('shipments').select('*, dispatcher:profiles!shipments_dispatcher_id_fkey(*)');
  if (filters?.status) q = q.in('status', filters.status);
  else q = q.in('status', ['published', 'awarded', 'paid', 'in_transit', 'delivered', 'disputed']);
  if (filters?.category) q = q.eq('category', filters.category);
  q = q.order('created_at', { ascending: false }).limit(100);
  const { data, error } = await q;
  if (error) throw error;
  let rows = data as any[];
  if (filters?.near) {
    const { lat, lng, radiusKm } = filters.near;
    rows = rows.filter((r) => r.origin?.lat && haversineKm({ lat, lng, label: '' }, r.origin) <= radiusKm);
  }
  const withRep = await attachReputation(rows, (r) => r.dispatcher_id);
  return withRep;
}

async function attachReputation<T extends Record<string, any>>(rows: T[], getId: (r: T) => string): Promise<(T & { reputation?: Reputation })[]> {
  if (!rows.length) return rows;
  const ids = [...new Set(rows.map(getId).filter(Boolean))];
  const { data } = await supabase.from('v_reputation').select('*').in('id', ids);
  const map = new Map((data || []).map((d: any) => [d.id, d]));
  return rows.map((r) => ({ ...r, reputation: map.get(getId(r)) }));
}

export async function getShipment(id: string): Promise<Shipment | null> {
  const { data, error } = await supabase
    .from('shipments')
    .select('*, dispatcher:profiles!shipments_dispatcher_id_fkey(*), receiver:profiles!shipments_receiver_id_fkey(*), carrier:profiles!shipments_awarded_carrier_id_fkey(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const rows = await attachReputation([data as any], (r) => r.awarded_carrier_id || r.dispatcher_id);
  return rows[0] as unknown as Shipment;
}

export async function createShipment(s: Partial<Shipment> & { dispatcher_id: string; category: string; title: string; origin: GeoPoint; destination: GeoPoint; start_price: number; commission_pct: number; auction_ends_at: string }) {
  return supabase.from('shipments').insert(s).select('id').single();
}

export async function updateShipment(id: string, patch: Partial<Shipment>) {
  return supabase.from('shipments').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
}

export async function getBids(shipmentId: string): Promise<Bid[]> {
  const { data, error } = await supabase
    .from('bids')
    .select('*, carrier:profiles!bids_carrier_id_fkey(*)')
    .eq('shipment_id', shipmentId)
    .order('amount', { ascending: true });
  if (error) throw error;
  return attachReputation(data as any[], (r) => r.carrier_id) as Promise<Bid[]>;
}

export async function placeBid(shipmentId: string, carrierId: string, amount: number, message: string) {
  return supabase.from('bids').upsert(
    { shipment_id: shipmentId, carrier_id: carrierId, amount, message, status: 'active' },
    { onConflict: 'shipment_id,carrier_id' },
  );
}

export async function acceptBid(bid: Bid, shipment: Shipment) {
  const { error } = await supabase.from('bids').update({ status: 'accepted' }).eq('id', bid.id);
  if (error) return { error };
  return updateShipment(shipment.id, {
    status: 'awarded',
    awarded_bid_id: bid.id,
    awarded_carrier_id: bid.carrier_id,
    total_value: bid.amount,
  });
}

export async function getMyBid(shipmentId: string, carrierId: string): Promise<Bid | null> {
  const { data } = await supabase.from('bids').select('*').eq('shipment_id', shipmentId).eq('carrier_id', carrierId).maybeSingle();
  return data;
}

export async function getTransaction(shipmentId: string): Promise<Transaction | null> {
  const { data } = await supabase.from('transactions').select('*').eq('shipment_id', shipmentId).maybeSingle();
  return data;
}

// DEMO: simula la retención del pago en el PSP. En producción esto lo dispara
// el webhook de MercadoPago (payment approved) desde un servidor con MP_ACCESS_TOKEN.
export async function demoPay(shipment: Shipment, total: number): Promise<{ error: string | null }> {
  const commission = Math.round((total * shipment.commission_pct) / 100);
  const { error } = await supabase.from('transactions').insert({
    shipment_id: shipment.id,
    payment_id: `DEMO-${Date.now()}`,
    amount_total: total,
    commission_amount: commission,
    carrier_net: total - commission,
    status: 'held',
    mode: 'demo',
  });
  if (error) return { error: error.message };
  const r2 = await updateShipment(shipment.id, { status: 'paid' });
  return { error: r2.error?.message ?? null };
}

export async function releasePayment(shipmentId: string) {
  const now = new Date().toISOString();
  await supabase.from('transactions').update({ status: 'released', released_at: now }).eq('shipment_id', shipmentId);
  return updateShipment(shipmentId, { status: 'released' });
}

export async function getDelivery(shipmentId: string): Promise<Delivery | null> {
  const { data } = await supabase.from('deliveries').select('*').eq('shipment_id', shipmentId).maybeSingle();
  return data;
}

export async function saveDelivery(d: Partial<Delivery> & { shipment_id: string }) {
  const { data } = await supabase.from('deliveries').upsert(d, { onConflict: 'shipment_id' }).select('*').single();
  return data as Delivery;
}

export async function openDispute(shipmentId: string, openedBy: string, reason: string) {
  const { error } = await supabase.from('disputes').insert({ shipment_id: shipmentId, opened_by: openedBy, reason });
  if (error) return { error };
  return updateShipment(shipmentId, { status: 'disputed' });
}

export async function getDisputes(): Promise<Dispute[]> {
  const { data } = await supabase.from('disputes').select('*').order('created_at', { ascending: false });
  return data || [];
}

export async function getReviewsFor(userId: string): Promise<(Review & { reviewer?: Profile })[]> {
  const { data } = await supabase
    .from('reviews')
    .select('*, reviewer:profiles!reviews_reviewer_id_fkey(*)')
    .eq('reviewee_id', userId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function getMyReviewsPending(userId: string, shipmentIds: string[]): Promise<Review[]> {
  if (!shipmentIds.length) return [];
  const { data } = await supabase.from('reviews').select('*').eq('reviewer_id', userId).in('shipment_id', shipmentIds);
  return data || [];
}

export async function saveReview(r: Omit<Review, 'id' | 'created_at'>) {
  return supabase.from('reviews').upsert(r, { onConflict: 'shipment_id,reviewer_id,reviewee_id' });
}

export async function getReputation(userId: string): Promise<Reputation | null> {
  const { data } = await supabase.from('v_reputation').select('*').eq('id', userId).maybeSingle();
  return data;
}

export async function getCarrierQueue(): Promise<(CarrierProfile & { profile: Profile })[]> {
  const { data } = await supabase.from('carrier_profiles').select('*, profile:profiles!carrier_profiles_user_id_fkey(*)').order('declared_at', { ascending: false });
  return data || [];
}
