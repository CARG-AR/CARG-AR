import { supabase } from './supabase';

export interface Province { id: string; name: string; }
export interface Locality { id: string; name: string; province_id: string; lat: number; lng: number; }

const GEOREF_BASE = 'https://apis.datos.gob.ar/georef/api';

export async function fetchProvinces(): Promise<Province[]> {
  const { data } = await supabase.from('provinces').select('*').order('name');
  if (data) return data as Province[];
  const res = await fetch(`${GEOREF_BASE}/provincias?orden=nombre&campos=id,nombre`);
  const json = await res.json();
  return (json.provincias || []).map((p: any) => ({ id: String(p.id), name: p.nombre }));
}

export async function fetchLocalities(provinceName: string, q = ''): Promise<Locality[]> {
  const params = new URLSearchParams({ provincia: provinceName, orden: 'nombre', max: '2000', campos: 'id,nombre,centroide,provincia' });
  if (q) params.set('nombre', q);
  const res = await fetch(`${GEOREF_BASE}/localidades?${params.toString()}`);
  const json = await res.json();
  return (json.localidades || []).map((l: any) => ({
    id: String(l.id),
    name: l.nombre,
    province_id: String(l.provincia?.id),
    lat: l.centroide?.lat,
    lng: l.centroide?.lon,
  })).filter((l: Locality) => l.lat != null && l.lng != null);
}
