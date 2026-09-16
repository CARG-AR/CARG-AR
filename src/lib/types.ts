export type Category = 'paqueteria' | 'pallets' | 'maquinaria';
export type LoadGroup = 'small' | 'medium' | 'large';
export type PricingMode = 'automatic' | 'manual';

export interface LoadRule {
  id: string;
  group: LoadGroup;
  code: string;
  label: string;
  weight_min_kg: number | null;
  weight_max_kg: number | null;
  dimension_min_cm: number | null;
  dimension_max_cm: number | null;
  requires_declared_value: boolean;
  tariff_0_30: number | null;
  tariff_30_100: number | null;
  tariff_100_250: number | null;
  commission_pct: number;
  manual: boolean;
  active: boolean;
  sort_order: number;
}

export interface LoadRuleDraft extends Omit<LoadRule, 'id'> {
  id?: string;
  group_code?: LoadGroup;
}

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
  license_expiry: string | null;
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
  load_group: LoadGroup | null;
  load_option: string | null;
  pricing_mode: PricingMode | null;
  title: string;
  description: string;
  weight_kg: number | null;
  volume_m3: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  declared_value: number | null;
  distance_km: number | null;
  pricing_rule_id: string | null;
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

export interface AdminMetrics {
  users: number;
  carriers: number;
  verifiedCarriers: number;
  pendingCarriers: number;
  publicationsToday: number;
  publicationsTotal: number;
  publicationsByGroup: Record<string, number>;
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

export const FALLBACK_LOAD_RULES: LoadRule[] = [
  { id: 'fallback-sobre', group: 'small', code: 'sobre', label: 'Sobre', weight_min_kg: 0, weight_max_kg: 1, dimension_min_cm: 0, dimension_max_cm: 30, requires_declared_value: false, tariff_0_30: 18000, tariff_30_100: 20000, tariff_100_250: 25000, commission_pct: 6, manual: false, active: true, sort_order: 1 },
  { id: 'fallback-bulto-1', group: 'small', code: 'bulto_1', label: 'Bulto pequeño', weight_min_kg: 1, weight_max_kg: 25, dimension_min_cm: 30, dimension_max_cm: 32, requires_declared_value: true, tariff_0_30: 20000, tariff_30_100: 23000, tariff_100_250: 30000, commission_pct: 6, manual: false, active: true, sort_order: 2 },
  { id: 'fallback-bulto-2', group: 'small', code: 'bulto_2', label: 'Bulto mediano', weight_min_kg: 25, weight_max_kg: 50, dimension_min_cm: 30, dimension_max_cm: 50, requires_declared_value: true, tariff_0_30: 22000, tariff_30_100: 25000, tariff_100_250: 32000, commission_pct: 6, manual: false, active: true, sort_order: 3 },
  { id: 'fallback-bulto-manual', group: 'small', code: 'manual', label: 'Bulto manual', weight_min_kg: null, weight_max_kg: null, dimension_min_cm: null, dimension_max_cm: null, requires_declared_value: true, tariff_0_30: null, tariff_30_100: null, tariff_100_250: null, commission_pct: 7, manual: true, active: true, sort_order: 4 },
  { id: 'fallback-pallet', group: 'medium', code: 'pallet', label: 'Pallets, peso y medidas', weight_min_kg: null, weight_max_kg: null, dimension_min_cm: 100, dimension_max_cm: 120, requires_declared_value: true, tariff_0_30: 75000, tariff_30_100: 120000, tariff_100_250: 150000, commission_pct: 9, manual: false, active: true, sort_order: 1 },
  { id: 'fallback-medium-manual', group: 'medium', code: 'manual', label: 'Carga manual', weight_min_kg: null, weight_max_kg: null, dimension_min_cm: null, dimension_max_cm: null, requires_declared_value: true, tariff_0_30: null, tariff_30_100: null, tariff_100_250: null, commission_pct: 11, manual: true, active: true, sort_order: 2 },
  { id: 'fallback-large-manual', group: 'large', code: 'manual', label: 'Descripción por el cliente', weight_min_kg: null, weight_max_kg: null, dimension_min_cm: null, dimension_max_cm: null, requires_declared_value: true, tariff_0_30: null, tariff_30_100: null, tariff_100_250: null, commission_pct: 9, manual: true, active: true, sort_order: 1 },
];

export const LOAD_GROUP_LABELS: Record<LoadGroup, string> = {
  small: 'Cargas pequeñas',
  medium: 'Cargas medianas',
  large: 'Cargas grandes',
};

export function tariffForDistance(rule: LoadRule, km: number): number | null {
  if (rule.manual) return null;
  if (km <= 30) return rule.tariff_0_30;
  if (km <= 100) return rule.tariff_30_100;
  if (km <= 250) return rule.tariff_100_250;
  return null;
}

export function selectLoadRule(rules: LoadRule[], group: LoadGroup, option: string): LoadRule | undefined {
  return rules.find((rule) => rule.active && rule.group === group && rule.code === option);
}

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

export function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function expiryBadge(date: string | null): { label: string; cls: string; blocked: boolean } | null {
  const days = daysUntil(date);
  if (days === null) return null;
  if (days < 0) return { label: 'Vencido', cls: 'bg-red-100 text-red-700', blocked: true };
  if (days <= 15) return { label: `Vence en ${days} días`, cls: 'bg-red-100 text-red-700', blocked: true };
  if (days <= 30) return { label: `Vence en ${days} días`, cls: 'bg-amber-100 text-amber-700', blocked: false };
  return { label: `Vence en ${days} días`, cls: 'bg-green-100 text-green-700', blocked: false };
}

export function anyVehicleBlocked(vehicles: Vehicle[]): boolean {
  return vehicles.some((veh) =>
    expiryBadge(veh.insurance_expiry)?.blocked ||
    expiryBadge(veh.vtv_expiry)?.blocked ||
    expiryBadge(veh.license_expiry)?.blocked
  );
}

export function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('es-AR');
}

export const money = (n: number) =>
  '$' + Math.round(n).toLocaleString('es-AR');

