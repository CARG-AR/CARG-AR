import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const CATEGORY_COLOR: Record<string, string> = {
  paqueteria: '#f59e0b',
  pallets: '#3b82f6',
  maquinaria: '#ef4444',
};

function pinIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

export interface MapMarker {
  lat: number;
  lng: number;
  color?: string;
  label?: string;
}

export function MapView({ markers, height = 420, onPick }: { markers: MapMarker[]; height?: number; onPick?: (lat: number, lng: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current).setView([-34.6, -58.45], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    if (onPick) {
      map.on('click', (e: L.LeafletMouseEvent) => onPick(e.latlng.lat, e.latlng.lng));
      map.getContainer().style.cursor = 'crosshair';
    }
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current, layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const pts: L.LatLngExpression[] = [];
    for (const m of markers) {
      if (m.lat == null || m.lng == null) continue;
      L.marker([m.lat, m.lng], { icon: pinIcon(m.color || '#ef4444') })
        .addTo(layer)
        .bindPopup(m.label || '');
      pts.push([m.lat, m.lng]);
    }
    if (pts.length === 1) map.setView(pts[0], 12);
    else if (pts.length > 1) map.fitBounds(L.latLngBounds(pts).pad(0.35));
  }, [markers]);

  return <div ref={ref} style={{ height }} className="w-full rounded-xl overflow-hidden border border-gray-200" />;
}

export const categoryColor = CATEGORY_COLOR;
