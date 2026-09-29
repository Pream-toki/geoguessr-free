import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapMarker {
  lat: number;
  lng: number;
  color: string;
  /** "pin" renders the classic teardrop, "dot" a round marker. */
  shape?: "pin" | "dot";
  label?: string;
}

interface Props {
  markers?: MapMarker[];
  /** [guess, truth] — dashed line drawn between the two. */
  line?: [[number, number], [number, number]] | null;
  onMapClick?: (lat: number, lng: number) => void;
  /** Change this number to re-fit bounds to the markers. */
  fitKey?: number;
  className?: string;
}

function pinIcon(color: string, label?: string): L.DivIcon {
  const text = label
    ? `<span class="gg-pin-label" style="background:${color}">${label}</span>`
    : "";
  return L.divIcon({
    className: "gg-pin",
    html:
      `<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
         <path d="M15 1C7.3 1 1 7.3 1 15c0 10.5 14 26 14 26s14-15.5 14-26C29 7.3 22.7 1 15 1z"
               fill="${color}" stroke="#fff" stroke-width="2"/>
         <circle cx="15" cy="15" r="5.5" fill="#fff"/>
       </svg>${text}`,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
  });
}

export default function MapView({ markers = [], line = null, onMapClick, fitKey = 0, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);
  const clickRef = useRef<Props["onMapClick"]>(onMapClick);
  clickRef.current = onMapClick;

  // Create map once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;
    const map = L.map(el, {
      worldCopyJump: true,
      zoomControl: true,
      attributionControl: true,
    }).setView([25, 0], 1);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    map.on("click", (e: L.LeafletMouseEvent) => {
      clickRef.current?.(e.latlng.lat, e.latlng.wrap().lng);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Render markers.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (const m of markers) {
      const marker =
        m.shape === "dot"
          ? L.circleMarker([m.lat, m.lng], {
              radius: 8,
              color: "#fff",
              weight: 2.5,
              fillColor: m.color,
              fillOpacity: 1,
            })
          : L.marker([m.lat, m.lng], { icon: pinIcon(m.color, m.label) });
      marker.addTo(layer);
    }
  }, [markers]);

  // Render the guess→truth line.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (lineRef.current) {
      map.removeLayer(lineRef.current);
      lineRef.current = null;
    }
    if (line) {
      lineRef.current = L.polyline(line, {
        color: "#ffffff",
        weight: 2,
        dashArray: "6 8",
        opacity: 0.9,
      }).addTo(map);
    }
  }, [line]);

  // Fit bounds on demand.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || markers.length === 0) return;
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]));
    if (line) {
      for (const p of line) bounds.extend(p as [number, number]);
    }
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: markers.length === 1 ? 4 : 10 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  // Leaflet needs a nudge when its container changes size.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current!);
    return () => ro.disconnect();
  }, []);

  return <div ref={containerRef} className={className ?? "map-view"} />;
}
