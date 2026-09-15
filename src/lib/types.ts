export type Category = 'paqueteria' | 'pallets' | 'maquinaria';

export interface Profile {
  id: string;
  full_name: string;
  username: string | null;
  phone: string;
  dni: string;
  is_carrier: boolean;
  is_admin: boolean;
}

export interface CarrierProfile {
  user_id: string;
  status: 'pending' | 'in_review' | 'verified' | 'rejected';
  rubro: string;
  mp_connected: boolean;
  mp_user_id: string | null;
}

export interface Vehicle {
  id: string;
  carrier_id: string;
  type: string;
  plate: string;
  insurance: string;
  insurance_expiry: string | null;
  vtv_expiry: string | null;
  permit: string;
  license: string;
  photos: string[];
}

export interface GeoPoint {
  label: string;
  lat: number;
  lng: number;
  zone?: string;
}

export type ShipmentStatus =
  | 'published' | 'awarded' | 'paid' | 'in_transit'
  | 'delivered' | 'released' | 'disputed' | 'cancelled' | 'expired';

export interface Shipment {
  id: string;
  dispatcher_id: string;
  receiver_id: string | null;
  category: Category;
  title: string;
  description: string;
  weight_kg: number | null;
  volume_m3: number | null;
  photos: string[];
  origin: GeoPoint;
  destination: GeoPoint;
  origin_province: string;
  origin_locality: string;
  origin_address: string;
  destination_province: string;
  destination_locality: string;
  destination_address: string;
  origin_exact: string;
  destination_exact: string;
  vehicle_required: string;
  start_price: number;
  suggested_price: number | null;
  commission_pct: number;
  status: ShipmentStatus;
  auction_ends_at: string;
  awarded_bid_id: string | null;
  awarded_carrier_id: string | null;
  total_value: number | null;
  cash_advance: number;
  gps_track: GeoPoint[] | null;
  created_at: string;
  dispatcher?: Profile;
  reputation?: Reputation;
}

export interface Bid {
  id: string;
  shipment_id: string;
  carrier_id: string;
  amount: number;
  message: string;
  status: 'active' | 'accepted' | 'rejected' | 'withdrawn';
  created_at: string;
  carrier?: Profile;
  reputation?: Reputation;
}

export interface Transaction {
  id: string;
  shipment_id: string;
  payment_id: string;
  amount_total: number;
  commission_amount: number;
  carrier_net: number;
  status: 'pending' | 'held' | 'released' | 'refunded' | 'failed';
  mode: string;
  released_at: string | null;
}

export interface Delivery {
  id: string;
  shipment_id: string;
  origin_photo: string | null;
  arrival_photos: string[];
  receiver_dni: string;
  coords: { lat: number; lng: number } | null;
  declared_at: string | null;
  auto_release_at: string | null;
}

export interface Review {
  id: string;
  shipment_id: string;
  reviewer_id: string;
  reviewer_role: string;
  reviewee_id: string;
  reviewee_role: string;
  stars: number;
  comment: string;
  created_at: string;
}

export interface Reputation {
  id: string;
  rating_avg: number;
  rating_count: number;
  trips_completed: number;
}

export interface Dispute {
  id: string;
  shipment_id: string;
  opened_by: string;
  reason: string;
  status: 'open' | 'resolved_release' | 'resolved_refund';
  resolution_note: string;
}

export interface CategoryConfig {
  label: string;
  commission_pct: number;
  tariff_per_km: number;
  vehicle_required: string;
}

export interface AppConfig {
  currency: string;
  categories: Record<Category, CategoryConfig>;
  release_hours: number;
  auction_minutes: number;
}

export const FALLBACK_CONFIG: AppConfig = {
  currency: 'ARS',
  categories: {
    paqueteria: { label: 'Paquetería (sobre/bulto)', commission_pct: 5, tariff_per_km: 45, vehicle_required: 'moto_o_utilitario' },
    pallets: { label: 'Pallets', commission_pct: 7, tariff_per_km: 110, vehicle_required: 'camioneta_o_camion' },
    maquinaria: { label: 'Maquinaria y vehículos', commission_pct: 12, tariff_per_km: 260, vehicle_required: 'camion_grande' },
  },
  release_hours: 48,
  auction_minutes: 120,
};

export const VEHICLE_TYPES: Record<string, string> = {
  moto: 'Moto',
  auto: 'Auto',
  utilitario: 'Utilitario / Furgón',
  camioneta: 'Camioneta',
  camion: 'Camión',
  camion_grande: 'Camión de gran porte',
};

export const STATUS_LABEL: Record<ShipmentStatus, string> = {
  published: 'En subasta',
  awarded: 'Adjudicado',
  paid: 'Pago retenido',
  in_transit: 'En tránsito',
  delivered: 'Entrega declarada',
  released: 'Liberado',
  disputed: 'En disputa',
  cancelled: 'Cancelado',
  expired: 'Expirado',
};

export const STATUS_COLOR: Record<ShipmentStatus, string> = {
  published: 'bg-amber-100 text-amber-800',
  awarded: 'bg-blue-100 text-blue-800',
  paid: 'bg-violet-100 text-violet-800',
  in_transit: 'bg-cyan-100 text-cyan-800',
  delivered: 'bg-teal-100 text-teal-800',
  released: 'bg-green-100 text-green-800',
  disputed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-600',
  expired: 'bg-gray-100 text-gray-600',
};

export function badgeFor(rep?: Reputation | null): { label: string; cls: string } | null {
  if (!rep) return { label: 'Es nuevo', cls: 'bg-gray-100 text-gray-600' };
  const t = rep.trips_completed;
  if (t >= 300) return { label: '+300 viajes', cls: 'bg-purple-100 text-purple-800' };
  if (t >= 100) return { label: '+100 viajes', cls: 'bg-blue-100 text-blue-800' };
  if (t >= 10) return { label: '+10 viajes', cls: 'bg-green-100 text-green-800' };
  return { label: 'Es nuevo', cls: 'bg-gray-100 text-gray-600' };
}

export const money = (n: number) =>
  '$' + Math.round(n).toLocaleString('es-AR');
