'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Search,
  Navigation,
  MapPin,
  Loader2,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Info,
  Sparkles,
  Compass
} from 'lucide-react';
import { BRAZIL_CITIES_COORDS } from '@/lib/seo/photo-optimizer';

/**
 * GpsMapPicker - Interactive Leaflet Map for pinpointing photo GPS coordinates
 * Features:
 * - Search address / city via Nominatim (OpenStreetMap) with fallback to Brazil preset cities
 * - Real-time editable Latitude & Longitude inputs side-by-side
 * - Draggable marker with real-time coordinate updates
 * - Map click to place marker at exact spot
 * - "Usar minha localização atual" button (Browser Geolocation API)
 * - "Como usar para otimização do GBP" guide card matching Google Business Profile best practices
 */
export default function GpsMapPicker({
  lat,
  lng,
  onChangeCoords,
  client = null,
  cityName = '',
  height = '240px',
  isExpanded = false,
  onToggleExpand = null,
  showGuide = true,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Local input states to allow smooth manual typing
  const [inputLat, setInputLat] = useState(lat !== undefined && lat !== null ? String(lat) : '-23.5505000');
  const [inputLng, setInputLng] = useState(lng !== undefined && lng !== null ? String(lng) : '-46.6333000');

  // Sync internal inputs when prop lat/lng change from outside (e.g., presets or initial load)
  useEffect(() => {
    if (lat !== undefined && lat !== null && String(lat) !== inputLat) {
      setInputLat(String(lat));
    }
  }, [lat]);

  useEffect(() => {
    if (lng !== undefined && lng !== null && String(lng) !== inputLng) {
      setInputLng(String(lng));
    }
  }, [lng]);

  const parsedLat = parseFloat(inputLat) || -23.5505;
  const parsedLng = parseFloat(inputLng) || -46.6333;

  // Initialize Leaflet Map safely in Next.js (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isMounted = true;

    async function initLeaflet() {
      try {
        const L = (await import('leaflet')).default;

        // Ensure Leaflet CSS is loaded in document head
        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        if (!mapContainerRef.current || !isMounted) return;

        // If map instance already exists, remove it before re-creating
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        // Create Leaflet map instance
        const map = L.map(mapContainerRef.current, {
          center: [parsedLat, parsedLng],
          zoom: 15,
          zoomControl: true,
          attributionControl: true,
        });

        // OpenStreetMap Tile Layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);

        // Custom crisp SVG Pin Icon (pointing exactly at the tip)
        const pinIcon = L.divIcon({
          className: 'custom-gps-pin',
          html: `
            <div style="position: relative; width: 34px; height: 44px; transform: translate(-17px, -44px); cursor: grab;">
              <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));">
                <path d="M17 0C7.61116 0 0 7.61116 0 17C0 30 17 44 17 44C17 44 34 30 34 17C34 7.61116 26.3888 0 17 0Z" fill="#3B82F6"/>
                <circle cx="17" cy="17" r="7" fill="white"/>
                <circle cx="17" cy="17" r="3.5" fill="#1D4ED8"/>
              </svg>
            </div>
          `,
          iconSize: [34, 44],
          iconAnchor: [17, 44],
        });

        // Create Draggable Marker
        const marker = L.marker([parsedLat, parsedLng], {
          icon: pinIcon,
          draggable: true,
          autoPan: true,
        }).addTo(map);

        markerRef.current = marker;
        mapInstanceRef.current = map;

        // Drag events for real-time coordinate updates
        marker.on('drag', (e) => {
          const pos = e.target.getLatLng();
          const latStr = pos.lat.toFixed(7);
          const lngStr = pos.lng.toFixed(7);
          setInputLat(latStr);
          setInputLng(lngStr);
          if (onChangeCoords) {
            onChangeCoords(latStr, lngStr);
          }
        });

        marker.on('dragend', (e) => {
          const pos = e.target.getLatLng();
          const latStr = pos.lat.toFixed(7);
          const lngStr = pos.lng.toFixed(7);
          setInputLat(latStr);
          setInputLng(lngStr);
          if (onChangeCoords) {
            onChangeCoords(latStr, lngStr);
          }
        });

        // Map Click: place marker directly at clicked point
        map.on('click', (e) => {
          const latStr = e.latlng.lat.toFixed(7);
          const lngStr = e.latlng.lng.toFixed(7);
          marker.setLatLng(e.latlng);
          setInputLat(latStr);
          setInputLng(lngStr);
          if (onChangeCoords) {
            onChangeCoords(latStr, lngStr);
          }
        });

        // Invalidate size after layout stabilization to prevent gray tile cuts
        setTimeout(() => {
          if (isMounted && map) {
            map.invalidateSize();
            setMapLoaded(true);
          }
        }, 150);
      } catch (err) {
        console.warn('[GpsMapPicker] Error initializing map:', err);
      }
    }

    initLeaflet();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map and marker when lat/lng change from external inputs
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return;

    const currentMarkerPos = markerRef.current.getLatLng();
    const diffLat = Math.abs(currentMarkerPos.lat - parsedLat);
    const diffLng = Math.abs(currentMarkerPos.lng - parsedLng);

    // Only update if difference is meaningful to prevent drag glitch
    if (diffLat > 0.00001 || diffLng > 0.00001) {
      markerRef.current.setLatLng([parsedLat, parsedLng]);
      mapInstanceRef.current.panTo([parsedLat, parsedLng], { animate: true });
    }
  }, [parsedLat, parsedLng]);

  // Handle address search via Nominatim OpenStreetMap with fallback to Brazil preset cities
  async function handleSearch(e) {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`
      );
      const data = await res.json();

      if (data && data.length > 0) {
        const item = data[0];
        const newLat = parseFloat(item.lat).toFixed(7);
        const newLng = parseFloat(item.lon).toFixed(7);

        const city = item.address?.city || item.address?.town || item.address?.municipality || item.address?.village || '';
        const state = item.address?.state || '';
        const neighborhood = item.address?.suburb || item.address?.neighbourhood || item.address?.quarter || '';

        setInputLat(newLat);
        setInputLng(newLng);

        if (onChangeCoords) {
          onChangeCoords(newLat, newLng, { city, state, neighborhood, displayName: item.display_name });
        }

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([parseFloat(newLat), parseFloat(newLng)], 16);
          markerRef.current.setLatLng([parseFloat(newLat), parseFloat(newLng)]);
        }
      } else {
        // Fallback: Check local Brazil cities dictionary
        const cleanQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const matchedCityKey = Object.keys(BRAZIL_CITIES_COORDS).find(k => cleanQuery.includes(k) || k.includes(cleanQuery));

        if (matchedCityKey) {
          const match = BRAZIL_CITIES_COORDS[matchedCityKey];
          const newLat = match.lat.toFixed(7);
          const newLng = match.lng.toFixed(7);

          setInputLat(newLat);
          setInputLng(newLng);

          if (onChangeCoords) {
            onChangeCoords(newLat, newLng, { city: matchedCityKey, state: match.state });
          }

          if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.setView([parseFloat(newLat), parseFloat(newLng)], 14);
            markerRef.current.setLatLng([parseFloat(newLat), parseFloat(newLng)]);
          }
        } else {
          alert('Endereço não localizado. Tente digitar o nome da rua, número e cidade.');
        }
      }
    } catch (err) {
      console.error('Erro na busca de endereço:', err);
      alert('Não foi possível buscar o endereço no momento. Digite as coordenadas ou selecione diretamente no mapa.');
    } finally {
      setIsSearching(false);
    }
  }

  // Use browser GPS current location
  function handleUseCurrentLocation() {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('Geolocalização não é suportada pelo seu navegador.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const newLat = pos.coords.latitude.toFixed(7);
        const newLng = pos.coords.longitude.toFixed(7);

        setInputLat(newLat);
        setInputLng(newLng);

        if (onChangeCoords) {
          onChangeCoords(newLat, newLng);
        }

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([parseFloat(newLat), parseFloat(newLng)], 16);
          markerRef.current.setLatLng([parseFloat(newLat), parseFloat(newLng)]);
        }
      },
      (err) => {
        setIsLocating(false);
        alert('Não foi possível obter a sua localização atual: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Manual Latitude input change
  function handleLatChange(e) {
    const val = e.target.value;
    setInputLat(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= -90 && parsed <= 90) {
      if (onChangeCoords) {
        onChangeCoords(val, inputLng);
      }
      if (markerRef.current && mapInstanceRef.current) {
        markerRef.current.setLatLng([parsed, parsedLng]);
        mapInstanceRef.current.panTo([parsed, parsedLng]);
      }
    }
  }

  // Manual Longitude input change
  function handleLngChange(e) {
    const val = e.target.value;
    setInputLng(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= -180 && parsed <= 180) {
      if (onChangeCoords) {
        onChangeCoords(inputLat, val);
      }
      if (markerRef.current && mapInstanceRef.current) {
        markerRef.current.setLatLng([parsedLat, parsed]);
        mapInstanceRef.current.panTo([parsedLat, parsed]);
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      {/* 1. Search Input Bar */}
      <form onSubmit={handleSearch} style={{ position: 'relative', width: '100%' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar cidade ou endereço do cliente..."
          style={{
            width: '100%',
            padding: '9px 38px 9px 34px',
            borderRadius: '9px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: '#F9FAFB',
            fontSize: '0.8125rem',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <Search
          size={15}
          color="#9CA3AF"
          style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }}
        />
        <button
          type="submit"
          disabled={isSearching}
          style={{
            position: 'absolute',
            right: '6px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(59, 130, 246, 0.25)',
            border: '1px solid rgba(59, 130, 246, 0.45)',
            color: '#60A5FA',
            borderRadius: '6px',
            padding: '4px 9px',
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {isSearching ? <Loader2 size={12} className="animate-spin" /> : 'Buscar'}
        </button>
      </form>

      {/* 2. Side-by-side Latitude & Longitude inputs matching reference design */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600, marginBottom: '4px' }}>
            Latitude
          </label>
          <input
            type="text"
            value={inputLat}
            onChange={handleLatChange}
            placeholder="-23.5505000"
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              color: '#F9FAFB',
              fontSize: '0.8125rem',
              fontFamily: 'monospace',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600, marginBottom: '4px' }}>
            Longitude
          </label>
          <input
            type="text"
            value={inputLng}
            onChange={handleLngChange}
            placeholder="-46.6333000"
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              color: '#F9FAFB',
              fontSize: '0.8125rem',
              fontFamily: 'monospace',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* 3. Action Button: "Usar minha localização atual" */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          style={{
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '7px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(139, 92, 246, 0.35)',
            backgroundColor: 'rgba(139, 92, 246, 0.12)',
            color: '#C4B5FD',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {isLocating ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
          Usar minha localização atual
        </button>

        {onToggleExpand && (
          <button
            type="button"
            onClick={onToggleExpand}
            title={isExpanded ? 'Visualização padrão' : 'Expandir mapa'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '7px 10px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: '#D1D5DB',
              cursor: 'pointer',
            }}
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        )}
      </div>

      {/* 4. Subtitle / Helper notice */}
      <div style={{ fontSize: '0.73rem', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <MapPin size={12} color="#60A5FA" />
        <span>Clique no mapa ou arraste o marcador para definir as coordenadas exatas do negócio.</span>
      </div>

      {/* 5. Leaflet Map Container with draggable blue pin */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: height,
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          backgroundColor: '#1E293B',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {!mapLoaded && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
              color: '#94A3B8',
              fontSize: '0.75rem',
              gap: '6px',
            }}
          >
            <Loader2 size={16} className="animate-spin" />
            Carregando mapa...
          </div>
        )}
      </div>

      {/* 6. "Como usar para otimização do GBP" Guide Card matching user reference image */}
      {showGuide && (
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '12px',
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FBBF24', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} color="#FBBF24" />
            Como usar para otimização do GBP
          </div>

          <ol
            style={{
              margin: 0,
              paddingLeft: '16px',
              fontSize: '0.72rem',
              color: '#FDE68A',
              lineHeight: '1.5',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
            }}
          >
            <li>Adicione as fotos do negócio (JPEG, PNG, WebP...)</li>
            <li>Defina as coordenadas exatas do estabelecimento no mapa</li>
            <li>Adicione título e descrição com palavras-chave do seu nicho</li>
            <li>Clique em <strong>Salvar Alterações</strong> e as coordenadas serão gravadas no EXIF</li>
            <li>Faça upload das fotos geotagged no Google Meu Negócio</li>
          </ol>

          <p
            style={{
              margin: '4px 0 0',
              fontSize: '0.69rem',
              color: '#FCD34D',
              lineHeight: '1.4',
              opacity: 0.9,
              borderTop: '1px solid rgba(245, 158, 11, 0.15)',
              paddingTop: '6px',
            }}
          >
            O Google usa dados EXIF (incluindo GPS) como sinal de relevância geográfica. Fotos com geotag correto tendem a fortalecer o ranqueamento local do perfil.
          </p>
        </div>
      )}
    </div>
  );
}
