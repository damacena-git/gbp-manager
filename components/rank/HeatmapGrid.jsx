'use client';

import { useEffect, useRef, useState } from 'react';
import { Trophy, Star, MapPin, Building2, Eye, Compass, Layers } from 'lucide-react';

// Color map for rank badges
export function getRankBadgeColor(rank) {
  if (rank === 1) return { bg: '#10B981', text: '#FFFFFF', border: '#34D399', label: '1º Lugar (Líder)' };
  if (rank <= 3) return { bg: '#059669', text: '#FFFFFF', border: '#10B981', label: 'Top 3 (Local Pack)' };
  if (rank <= 9) return { bg: '#D97706', text: '#FFFFFF', border: '#FBBF24', label: '1ª Página' };
  if (rank <= 19) return { bg: '#EA580C', text: '#FFFFFF', border: '#FB923C', label: '2ª Página' };
  return { bg: '#DC2626', text: '#FFFFFF', border: '#F87171', label: '20+ (Invisível)' };
}

export default function HeatmapGrid({ scan, selectedPoint, onSelectPoint }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [viewMode, setViewMode] = useState('pins'); // 'pins' | 'circles'

  // Initialize Leaflet Map
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isMounted = true;

    async function initMap() {
      // Dynamic import of Leaflet
      const L = (await import('leaflet')).default;

      // Ensure Leaflet CSS is present
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!mapContainerRef.current) return;

      // If map already exists, clean it up
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const centerLat = scan?.center?.lat || -15.7975;
      const centerLng = scan?.center?.lng || -47.8919;

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 13,
        zoomControl: true,
        attributionControl: false,
      });

      // CartoDB Dark Matter tiles for stunning dark mode integration
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      markersGroupRef.current = L.featureGroup().addTo(map);
      mapInstanceRef.current = map;

      if (isMounted) {
        setMapReady(true);
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers and Grid Points when scan or viewMode changes
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !scan?.points) return;

    import('leaflet').then((leafletModule) => {
      const L = leafletModule.default;
      const map = mapInstanceRef.current;
      const group = markersGroupRef.current;

      group.clearLayers();

      // 1. Center Marker (The Business Location)
      const centerLat = scan.center.lat;
      const centerLng = scan.center.lng;

      const businessIcon = L.divIcon({
        className: 'custom-center-marker',
        html: `
          <div style="
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: linear-gradient(135deg, #EC4899, #8B5CF6);
            border: 3px solid #FFFFFF;
            box-shadow: 0 0 15px rgba(236, 72, 153, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #FFFFFF;
            font-weight: 800;
            font-size: 16px;
            cursor: pointer;
          ">
            🏢
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      const centerMarker = L.marker([centerLat, centerLng], { icon: businessIcon, zIndexOffset: 1000 });
      centerMarker.bindPopup(`
        <div style="color: #111827; font-family: sans-serif; padding: 4px;">
          <strong style="font-size: 14px;">${scan.businessName || 'Sua Empresa'}</strong>
          <p style="margin: 4px 0 0; font-size: 12px; color: #4B5563;">Centro da Varredura (Local Físico)</p>
        </div>
      `);
      group.addLayer(centerMarker);

      // 2. Scan Boundary Circle
      if (scan.radiusKm) {
        const radiusCircle = L.circle([centerLat, centerLng], {
          radius: scan.radiusKm * 1000,
          color: 'rgba(59, 130, 246, 0.4)',
          fillColor: 'rgba(59, 130, 246, 0.04)',
          weight: 1,
          dashArray: '4, 4',
        });
        group.addLayer(radiusCircle);
      }

      // 3. Grid Points
      scan.points.forEach((pt) => {
        const rankColor = getRankBadgeColor(pt.rank);
        const isSelected = selectedPoint?.id === pt.id;

        if (viewMode === 'circles') {
          // Heat circles view
          const heatCircle = L.circle([pt.lat, pt.lng], {
            radius: (scan.stepKm * 1000) * 0.45,
            color: rankColor.border,
            fillColor: rankColor.bg,
            fillOpacity: isSelected ? 0.8 : 0.45,
            weight: isSelected ? 3 : 1,
          });

          heatCircle.on('click', () => {
            if (onSelectPoint) onSelectPoint(pt);
          });

          group.addLayer(heatCircle);
        }

        // Numerical Pin
        const pinIcon = L.divIcon({
          className: 'custom-rank-pin',
          html: `
            <div style="
              width: ${isSelected ? '36px' : '30px'};
              height: ${isSelected ? '36px' : '30px'};
              border-radius: 50%;
              background-color: ${rankColor.bg};
              border: ${isSelected ? '3px solid #FFFFFF' : `2px solid ${rankColor.border}`};
              box-shadow: ${isSelected ? '0 0 16px #FFFFFF' : '0 4px 10px rgba(0, 0, 0, 0.5)'};
              display: flex;
              align-items: center;
              justify-content: center;
              color: #FFFFFF;
              font-weight: 800;
              font-size: ${pt.rank > 9 ? '12px' : '13px'};
              font-family: sans-serif;
              cursor: pointer;
              transition: all 0.2s ease;
            ">
              ${pt.rank <= 20 ? pt.rank : '20+'}
            </div>
          `,
          iconSize: [isSelected ? 36 : 30, isSelected ? 36 : 30],
          iconAnchor: [isSelected ? 18 : 15, isSelected ? 18 : 15],
        });

        const marker = L.marker([pt.lat, pt.lng], { icon: pinIcon, zIndexOffset: isSelected ? 900 : 500 });

        marker.on('click', () => {
          if (onSelectPoint) onSelectPoint(pt);
        });

        group.addLayer(marker);
      });

      // Fit map view to grid bounds with padding
      map.fitBounds(group.getBounds(), { padding: [30, 30] });
    });
  }, [mapReady, scan, selectedPoint, viewMode]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '480px', borderRadius: '16px', overflow: 'hidden' }}>
      {/* Map Container */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '480px', backgroundColor: '#0B0F17' }} />

      {/* View Mode Toggle Overlay */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          zIndex: 1000,
          display: 'flex',
          gap: '6px',
          backgroundColor: 'rgba(17, 24, 39, 0.85)',
          backdropFilter: 'blur(8px)',
          padding: '4px',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        <button
          type="button"
          onClick={() => setViewMode('pins')}
          style={{
            padding: '6px 12px',
            fontSize: '0.75rem',
            fontWeight: 700,
            borderRadius: '7px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: viewMode === 'pins' ? '#3B82F6' : 'transparent',
            color: viewMode === 'pins' ? '#FFFFFF' : '#9CA3AF',
            transition: 'all 0.15s',
          }}
        >
          📍 Pinos Numéricos
        </button>
        <button
          type="button"
          onClick={() => setViewMode('circles')}
          style={{
            padding: '6px 12px',
            fontSize: '0.75rem',
            fontWeight: 700,
            borderRadius: '7px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: viewMode === 'circles' ? '#3B82F6' : 'transparent',
            color: viewMode === 'circles' ? '#FFFFFF' : '#9CA3AF',
            transition: 'all 0.15s',
          }}
        >
          🔥 Radar Térmico
        </button>
      </div>

      {/* Floating Legend Overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          zIndex: 1000,
          backgroundColor: 'rgba(17, 24, 39, 0.88)',
          backdropFilter: 'blur(8px)',
          padding: '10px 14px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          fontSize: '0.75rem',
          color: '#E5E7EB',
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: '2px', color: '#9CA3AF', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Legenda de Posições
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
          <span>#1 a #3 — Local 3-Pack (Dominância)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#D97706', display: 'inline-block' }} />
          <span>#4 a #9 — 1ª Página do Maps</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#EA580C', display: 'inline-block' }} />
          <span>#10 a #19 — 2ª Página</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#DC2626', display: 'inline-block' }} />
          <span>#20+ — Fora do radar / Invisível</span>
        </div>
      </div>
    </div>
  );
}
