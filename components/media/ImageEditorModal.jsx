'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, Crop, RotateCw, RotateCcw, FlipHorizontal, Sun, Contrast,
  Sparkles, SlidersHorizontal, Check, Undo2, Maximize2, Minimize2, MapPin, Tag, FileText,
  Navigation, Compass, Crosshair, Globe, Info, CheckCircle2, ShieldCheck
} from 'lucide-react';
import GpsMapPicker from './GpsMapPicker';
import {
  injectExifToDataUrl,
  getCoordinatesForCity,
  generateSeoFilename,
  parseClientAddress,
  BRAZIL_CITIES_COORDS
} from '@/lib/seo/photo-optimizer';

const ASPECT_RATIOS = [
  { id: '4:3', label: '4:3 (Google Recomendado)', ratio: 4 / 3, badge: 'Ideal para Posts e Perfil' },
  { id: '1:1', label: '1:1 (Quadrado)', ratio: 1 / 1, badge: 'Feed / Mobile' },
  { id: '16:9', label: '16:9 (Widescreen)', ratio: 16 / 9, badge: 'Paisagem' },
  { id: 'original', label: 'Original', ratio: null, badge: 'Sem corte' },
];

const PRESET_FILTERS = [
  { id: 'normal', name: 'Original', brightness: 100, contrast: 100, saturation: 100 },
  { id: 'vivid', name: 'Vívido', brightness: 105, contrast: 115, saturation: 130 },
  { id: 'bright', name: 'Clarear', brightness: 120, contrast: 105, saturation: 105 },
  { id: 'punch', name: 'Destaque', brightness: 100, contrast: 125, saturation: 120 },
  { id: 'bw', name: 'P&B Elegante', brightness: 105, contrast: 120, saturation: 0 },
];

const GOOGLE_PHOTO_CATEGORIES = [
  { id: 'PRODUCT', label: 'Produto', desc: 'Produtos ou serviços oferecidos' },
  { id: 'EXTERIOR', label: 'Exterior', desc: 'Fachada, letreiro, entrada da empresa' },
  { id: 'INTERIOR', label: 'Interior', desc: 'Ambiente interno, recepção, espaço' },
  { id: 'AT_WORK', label: 'No Trabalho', desc: 'Equipe prestando serviços ou trabalhando' },
  { id: 'ADDITIONAL', label: 'Adicional', desc: 'Fotos institucionais e gerais' },
  { id: 'COVER', label: 'Capa', desc: 'Foto de capa principal do Google' },
  { id: 'PROFILE', label: 'Perfil / Logo', desc: 'Logo oficial ou foto de perfil' },
];

export default function ImageEditorModal({
  isOpen,
  onClose,
  mediaItem,
  onSave,
  client = null
}) {
  const [imageSrc, setImageSrc] = useState(null);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('4:3'); // '4:3' | '1:1' | '16:9' | 'original'
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [applySeoGeotag, setApplySeoGeotag] = useState(true);
  const [activeTab, setActiveTab] = useState('crop'); // 'crop' | 'adjust' | 'filters' | 'gps' | 'details'
  const [fileName, setFileName] = useState('');
  const [altText, setAltText] = useState('');
  const [category, setCategory] = useState('PRODUCT');
  const [processing, setProcessing] = useState(false);

  // GPS & Geo-tagging state
  const [gpsLat, setGpsLat] = useState('');
  const [gpsLng, setGpsLng] = useState('');
  const [gpsCity, setGpsCity] = useState('');
  const [gpsState, setGpsState] = useState('');
  const [gpsNeighborhood, setGpsNeighborhood] = useState('');
  const [includeExifTags, setIncludeExifTags] = useState(true);
  const [expandGpsMap, setExpandGpsMap] = useState(false);

  const canvasRef = useRef(null);
  const imageObjRef = useRef(null);

  // Load image when opened
  useEffect(() => {
    if (!isOpen || !mediaItem) return;

    // Reset settings
    setRotation(0);
    setFlipH(false);
    setAspectRatio('4:3');
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setActiveTab('crop');
    setFileName(mediaItem.filename || mediaItem.name || 'foto.jpg');
    setAltText(mediaItem.alt_text || mediaItem.caption || '');
    setCategory(mediaItem.category || 'PRODUCT');

    // Parse and initialize GPS Geotag data from client if available
    const parsedAddr = parseClientAddress(client?.address);
    const initialCity = parsedAddr.city || (typeof client?.address === 'string' ? client.address : '') || '';
    const initialCoords = getCoordinatesForCity(initialCity, parsedAddr.state);

    setGpsCity(initialCity || 'São Paulo');
    setGpsState(parsedAddr.state || initialCoords.state || 'SP');
    setGpsNeighborhood(parsedAddr.neighborhood || '');
    setGpsLat(initialCoords.lat !== undefined ? String(initialCoords.lat) : '-23.5505');
    setGpsLng(initialCoords.lng !== undefined ? String(initialCoords.lng) : '-46.6333');
    setApplySeoGeotag(true);

    const rawSrc = mediaItem.previewUrl || mediaItem.url;
    if (!rawSrc) return;

    // Use proxy for external HTTP/HTTPS images to prevent tainted canvas / CORS issues
    const src = (rawSrc.startsWith('http://') || rawSrc.startsWith('https://'))
      ? `/api/proxy-image?url=${encodeURIComponent(rawSrc)}`
      : rawSrc;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageObjRef.current = img;
      setImageSrc(src);
    };
    img.onerror = () => {
      // Fallback directly to rawSrc if proxy fails
      if (src !== rawSrc) {
        const fallbackImg = new Image();
        fallbackImg.crossOrigin = 'anonymous';
        fallbackImg.onload = () => {
          imageObjRef.current = fallbackImg;
          setImageSrc(rawSrc);
        };
        fallbackImg.src = rawSrc;
      }
    };
    img.src = src;
  }, [isOpen, mediaItem]);

  // Redraw canvas whenever adjustments change
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Determine target dimensions based on aspect ratio
    let srcX = 0;
    let srcY = 0;
    let srcW = img.naturalWidth;
    let srcH = img.naturalHeight;

    const selectedRatioObj = ASPECT_RATIOS.find((r) => r.id === aspectRatio);
    if (selectedRatioObj && selectedRatioObj.ratio) {
      const targetRatio = selectedRatioObj.ratio;
      const currentRatio = srcW / srcH;

      if (currentRatio > targetRatio) {
        // Image is wider than desired ratio -> crop width from center
        const newW = srcH * targetRatio;
        srcX = (srcW - newW) / 2;
        srcW = newW;
      } else {
        // Image is taller than desired ratio -> crop height from center
        const newH = srcW / targetRatio;
        srcY = (srcH - newH) / 2;
        srcH = newH;
      }
    }

    // Determine canvas dimensions considering rotation
    const isRotated90or270 = rotation === 90 || rotation === 270;
    canvas.width = isRotated90or270 ? srcH : srcW;
    canvas.height = isRotated90or270 ? srcW : srcH;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply color filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

    // Transformation matrix (Translate to center, rotate, flip, translate back)
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);

    if (rotation !== 0) {
      ctx.rotate((rotation * Math.PI) / 180);
    }
    if (flipH) {
      ctx.scale(-1, 1);
    }

    // Draw cropped portion of image
    ctx.drawImage(
      img,
      srcX, srcY, srcW, srcH,
      -srcW / 2, -srcH / 2, srcW, srcH
    );

    ctx.restore();
  }, [rotation, flipH, aspectRatio, brightness, contrast, saturation]);

  useEffect(() => {
    if (imageSrc) {
      renderCanvas();
    }
  }, [imageSrc, renderCanvas]);

  function handleRotateCw() {
    setRotation((prev) => (prev + 90) % 360);
  }

  function handleRotateCcw() {
    setRotation((prev) => (prev - 90 + 360) % 360);
  }

  function handleFlipH() {
    setFlipH((prev) => !prev);
  }

  function handleApplyPreset(preset) {
    setBrightness(preset.brightness);
    setContrast(preset.contrast);
    setSaturation(preset.saturation);
  }

  function handleReset() {
    setRotation(0);
    setFlipH(false);
    setAspectRatio('4:3');
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
  }

  function handleDetectClientCoordinates() {
    const parsedAddr = parseClientAddress(client?.address);
    const initialCity = parsedAddr.city || (typeof client?.address === 'string' ? client.address : '') || '';
    const initialCoords = getCoordinatesForCity(initialCity, parsedAddr.state);

    if (initialCity) setGpsCity(initialCity);
    if (parsedAddr.state || initialCoords.state) setGpsState(parsedAddr.state || initialCoords.state);
    if (parsedAddr.neighborhood) setGpsNeighborhood(parsedAddr.neighborhood);
    if (initialCoords.lat !== undefined) setGpsLat(String(initialCoords.lat));
    if (initialCoords.lng !== undefined) setGpsLng(String(initialCoords.lng));
  }

  function handleSelectCityPreset(cityName) {
    const coords = getCoordinatesForCity(cityName);
    setGpsCity(cityName.charAt(0).toUpperCase() + cityName.slice(1));
    setGpsState(coords.state || 'SP');
    setGpsLat(String(coords.lat));
    setGpsLng(String(coords.lng));
  }

  const handleMapCoordsChange = useCallback((newLat, newLng, addressDetails = null) => {
    setGpsLat(newLat);
    setGpsLng(newLng);
    if (addressDetails) {
      if (addressDetails.city) setGpsCity(addressDetails.city);
      if (addressDetails.state) setGpsState(addressDetails.state);
      if (addressDetails.neighborhood) setGpsNeighborhood(addressDetails.neighborhood);
    }
  }, []);

  async function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setProcessing(true);
    try {
      // 1. Get image as JPEG Data URL at high quality (0.92)
      let dataUrl = canvas.toDataURL('image/jpeg', 0.92);

      // 2. Inject Local SEO EXIF Metadata (GPS & Tags)
      if (applySeoGeotag) {
        const parsedLat = parseFloat(gpsLat);
        const parsedLng = parseFloat(gpsLng);
        const hasValidCoords = !isNaN(parsedLat) && !isNaN(parsedLng);

        dataUrl = injectExifToDataUrl(dataUrl, {
          lat: hasValidCoords ? parsedLat : undefined,
          lng: hasValidCoords ? parsedLng : undefined,
          businessName: includeExifTags ? (client?.business_name || '') : '',
          city: gpsCity,
          category: category || client?.category || '',
          altText: altText || `${client?.business_name || 'Empresa'} - ${category} em ${gpsCity || 'Brasil'}`,
        });
      }

      // 3. Convert Data URL to a real File Blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      let chosenName = (fileName || '').trim() || mediaItem.file?.name || mediaItem.name || mediaItem.filename || 'foto-editada.jpg';
      if (!chosenName.match(/\.(jpg|jpeg|png|webp)$/i)) {
        chosenName = `${chosenName}.jpg`;
      }
      const cleanFileName = chosenName;
      const editedFile = new File([blob], cleanFileName, { type: 'image/jpeg' });
      const newPreviewUrl = URL.createObjectURL(editedFile);

      const updatedMediaItem = {
        ...mediaItem,
        file: editedFile,
        previewUrl: newPreviewUrl,
        dataUrl,
        name: cleanFileName,
        filename: cleanFileName,
        format: 'PHOTO',
        isEdited: true,
        alt_text: altText,
        category: category,
        geotagged: applySeoGeotag,
        gps: applySeoGeotag ? {
          lat: parseFloat(gpsLat),
          lng: parseFloat(gpsLng),
          city: gpsCity,
          state: gpsState,
          neighborhood: gpsNeighborhood,
        } : null,
      };

      await onSave(updatedMediaItem);
      onClose();
    } catch (err) {
      console.error('Erro ao salvar imagem editada:', err);
      alert('Erro ao processar imagem editada: ' + err.message);
    } finally {
      setProcessing(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 16, 0.88)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1140px',
          maxHeight: '92vh',
          backgroundColor: '#0D1322',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '20px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F9FAFB', margin: 0 }}>
                Editar Imagem para o Google
              </h2>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                  color: '#60A5FA',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                }}
              >
                Otimizador Visual
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#9CA3AF', margin: '4px 0 0' }}>
              Ajuste o enquadramento, proporção e cores para destaque no perfil Google Meu Negócio
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#9CA3AF',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Main Content Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 430px',
            flex: 1,
            overflow: 'hidden',
          }}
        >
          {/* Canvas Area (Left/Center) */}
          <div
            style={{
              padding: '24px',
              backgroundColor: '#080C16',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              minHeight: '440px',
            }}
          >
            {activeTab === 'gps' && expandGpsMap ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={16} color="#60A5FA" />
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#F9FAFB' }}>
                      Modo Mapa de Precisão (Expandido)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandGpsMap(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      color: '#E2E8F0',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Minimize2 size={13} /> Voltar à Prévia da Foto
                  </button>
                </div>
                <div style={{ flex: 1, minHeight: '440px' }}>
                  <GpsMapPicker
                    lat={gpsLat}
                    lng={gpsLng}
                    onChangeCoords={handleMapCoordsChange}
                    client={client}
                    cityName={gpsCity}
                    height="450px"
                    isExpanded={true}
                    onToggleExpand={() => setExpandGpsMap(false)}
                    showGuide={false}
                  />
                </div>
              </div>
            ) : (
              <>
                {/* Guide overlay */}
                <div
                  style={{
                    position: 'relative',
                    maxWidth: '100%',
                    maxHeight: '480px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <canvas
                    ref={canvasRef}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '480px',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  />
                  {/* Floating GPS Badge when geotagging is enabled */}
                  {applySeoGeotag && gpsLat && gpsLng && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '12px',
                        left: '12px',
                        padding: '5px 12px',
                        borderRadius: '20px',
                        backgroundColor: 'rgba(15, 23, 42, 0.88)',
                        backdropFilter: 'blur(6px)',
                        border: '1px solid rgba(52, 211, 153, 0.4)',
                        color: '#34D399',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                        pointerEvents: 'none',
                      }}
                    >
                      <MapPin size={12} color="#34D399" />
                      <span>EXIF GPS: {parseFloat(gpsLat).toFixed(4)}, {parseFloat(gpsLng).toFixed(4)} ({gpsCity || 'Local'})</span>
                    </div>
                  )}
                </div>

                {/* Quick Canvas Toolbar below */}
                <div
                  style={{
                    marginTop: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    padding: '6px 12px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <button
                    type="button"
                    onClick={handleRotateCcw}
                    title="Girar 90° à esquerda"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#D1D5DB',
                      cursor: 'pointer',
                      padding: '6px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                    }}
                  >
                    <RotateCcw size={15} /> 90°
                  </button>

                  <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255,255,255,0.1)' }} />

                  <button
                    type="button"
                    onClick={handleRotateCw}
                    title="Girar 90° à direita"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#D1D5DB',
                      cursor: 'pointer',
                      padding: '6px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                    }}
                  >
                    <RotateCw size={15} /> 90°
                  </button>

                  <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255,255,255,0.1)' }} />

                  <button
                    type="button"
                    onClick={handleFlipH}
                    title="Espelhar Horizontalmente"
                    style={{
                      background: flipH ? 'rgba(59, 130, 246, 0.2)' : 'none',
                      border: 'none',
                      color: flipH ? '#60A5FA' : '#D1D5DB',
                      cursor: 'pointer',
                      padding: '6px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                    }}
                  >
                    <FlipHorizontal size={15} /> Espelhar
                  </button>

                  <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255,255,255,0.1)' }} />

                  <button
                    type="button"
                    onClick={handleReset}
                    title="Restaurar imagem original"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#9CA3AF',
                      cursor: 'pointer',
                      padding: '6px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                    }}
                  >
                    <Undo2 size={15} /> Resetar
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Controls Panel (Right Column) */}
          <div
            style={{
              padding: '20px',
              backgroundColor: '#0D1322',
              borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              overflowY: 'auto',
              maxHeight: 'calc(92vh - 140px)',
            }}
          >
            {/* Tabs */}
            <div
              style={{
                display: 'flex',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                borderRadius: '10px',
                padding: '3px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                gap: '2px',
              }}
            >
              {[
                { id: 'crop', label: 'Corte', icon: Crop },
                { id: 'adjust', label: 'Cores', icon: SlidersHorizontal },
                { id: 'filters', label: 'Filtros', icon: Sparkles },
                { id: 'gps', label: 'GPS', icon: MapPin },
                { id: 'details', label: 'SEO', icon: Tag },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '7px 6px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: isActive ? '#3B82F6' : 'transparent',
                      color: isActive ? '#FFFFFF' : '#9CA3AF',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Icon size={13} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENT: PROPORÇÃO & CORTE */}
            {activeTab === 'crop' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Formato de Enquadramento
                </span>

                {ASPECT_RATIOS.map((item) => {
                  const isSelected = aspectRatio === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setAspectRatio(item.id)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: isSelected ? '1.5px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.08)',
                        backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isSelected ? '#60A5FA' : '#E2E8F0' }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '2px' }}>
                          {item.badge}
                        </div>
                      </div>
                      {isSelected && <Check size={16} color="#60A5FA" />}
                    </button>
                  );
                })}

                <div
                  style={{
                    marginTop: '8px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    fontSize: '0.75rem',
                    color: '#93C5FD',
                    lineHeight: 1.4,
                  }}
                >
                  💡 <strong>Dica Google:</strong> A proporção <strong>4:3</strong> (ex: 1200x900) é a ideal para posts, pois é exibida por inteiro nas buscas do Google e Google Maps sem cortes indesejados.
                </div>
              </div>
            )}

            {/* TAB CONTENT: AJUSTES DE CORES E LUZ */}
            {activeTab === 'adjust' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Ajustes Manuais
                </span>

                {/* Brilho */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#E2E8F0', marginBottom: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sun size={14} color="#FBBF24" /> Brilho
                    </span>
                    <span style={{ fontWeight: 600, color: '#9CA3AF' }}>{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#3B82F6', cursor: 'pointer' }}
                  />
                </div>

                {/* Contraste */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#E2E8F0', marginBottom: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Contrast size={14} color="#60A5FA" /> Contraste
                    </span>
                    <span style={{ fontWeight: 600, color: '#9CA3AF' }}>{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#3B82F6', cursor: 'pointer' }}
                  />
                </div>

                {/* Saturação */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#E2E8F0', marginBottom: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={14} color="#A78BFA" /> Saturação (Cores)
                    </span>
                    <span style={{ fontWeight: 600, color: '#9CA3AF' }}>{saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="180"
                    value={saturation}
                    onChange={(e) => setSaturation(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#3B82F6', cursor: 'pointer' }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setBrightness(100);
                    setContrast(100);
                    setSaturation(100);
                  }}
                  className="btn btn-ghost btn-sm"
                  style={{ alignSelf: 'flex-start', fontSize: '0.75rem' }}
                >
                  Restaurar valores padrão (100%)
                </button>
              </div>
            )}

            {/* TAB CONTENT: FILTROS PRONTOS */}
            {activeTab === 'filters' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Filtros Rápidos
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {PRESET_FILTERS.map((preset) => {
                    const isCurrent =
                      brightness === preset.brightness &&
                      contrast === preset.contrast &&
                      saturation === preset.saturation;

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        style={{
                          padding: '12px 10px',
                          borderRadius: '10px',
                          border: isCurrent ? '1.5px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.08)',
                          backgroundColor: isCurrent ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                          color: isCurrent ? '#60A5FA' : '#D1D5DB',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Sparkles size={16} />
                        {preset.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT: OTIMIZAÇÃO GPS & GEO-TAGGING COM MAPA INTERATIVO */}
            {activeTab === 'gps' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Header matching user reference image */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={16} color="#8B5CF6" />
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F9FAFB' }}>
                        Geolocalização
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#9CA3AF', marginLeft: '6px' }}>
                        — será gravada no EXIF de todas as fotos
                      </span>
                    </div>
                  </div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.75rem', color: applySeoGeotag ? '#34D399' : '#9CA3AF', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={applySeoGeotag}
                      onChange={(e) => setApplySeoGeotag(e.target.checked)}
                      style={{ accentColor: '#10B981', width: '15px', height: '15px', cursor: 'pointer' }}
                    />
                    {applySeoGeotag ? 'EXIF Ativado' : 'EXIF Desativado'}
                  </label>
                </div>

                {/* Interactive Leaflet Map Picker Component */}
                <GpsMapPicker
                  lat={gpsLat}
                  lng={gpsLng}
                  onChangeCoords={handleMapCoordsChange}
                  client={client}
                  cityName={gpsCity}
                  height="240px"
                  isExpanded={expandGpsMap}
                  onToggleExpand={() => setExpandGpsMap(!expandGpsMap)}
                  showGuide={true}
                />

                {/* Additional Client & Regional SEO Details */}
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Dados do Negócio & Região
                    </span>
                    {client?.address && (
                      <button
                        type="button"
                        onClick={handleDetectClientCoordinates}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#60A5FA',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: 0,
                        }}
                      >
                        <Navigation size={11} /> Puxar do Perfil
                      </button>
                    )}
                  </div>

                  {/* City & State Fields */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', color: '#E2E8F0', fontWeight: 600, marginBottom: '4px' }}>
                        Cidade / Município:
                      </label>
                      <input
                        type="text"
                        value={gpsCity}
                        onChange={(e) => setGpsCity(e.target.value)}
                        placeholder="Ex: Sorocaba"
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          color: '#F9FAFB',
                          fontSize: '0.78rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', color: '#E2E8F0', fontWeight: 600, marginBottom: '4px' }}>
                        Estado (UF):
                      </label>
                      <input
                        type="text"
                        value={gpsState}
                        onChange={(e) => setGpsState(e.target.value.toUpperCase())}
                        placeholder="SP"
                        maxLength={2}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          color: '#F9FAFB',
                          fontSize: '0.78rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  {/* Bairro / Região */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#E2E8F0', fontWeight: 600, marginBottom: '4px' }}>
                      Bairro / Região de Atendimento:
                    </label>
                    <input
                      type="text"
                      value={gpsNeighborhood}
                      onChange={(e) => setGpsNeighborhood(e.target.value)}
                      placeholder="Ex: Centro / Região Metropolitana"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        color: '#F9FAFB',
                        fontSize: '0.78rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Quick City Presets */}
                  <div>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#9CA3AF', marginBottom: '5px', fontWeight: 600 }}>
                      Cidades Frequentes:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {['Votorantim', 'Sorocaba', 'São Paulo', 'Campinas', 'Curitiba', 'Passo Fundo', 'Rio de Janeiro', 'Brasília'].map((cName) => (
                        <button
                          key={cName}
                          type="button"
                          onClick={() => handleSelectCityPreset(cName)}
                          style={{
                            fontSize: '0.69rem',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            color: '#D1D5DB',
                            cursor: 'pointer',
                          }}
                        >
                          {cName}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Additional EXIF Artist & Copyright toggle */}
                  <div style={{ marginTop: '2px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '0.74rem', color: '#E2E8F0' }}>
                      <input
                        type="checkbox"
                        checked={includeExifTags}
                        onChange={(e) => setIncludeExifTags(e.target.checked)}
                        style={{ accentColor: '#10B981', marginTop: '2px', cursor: 'pointer' }}
                      />
                      <span>
                        Injetar dados da empresa (<strong>{client?.business_name || 'Empresa'}</strong>), nicho e palavras-chave de SEO Local nos campos EXIF Artist e Copyright.
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: LEGENDA & CATEGORIA (SEO) */}
            {activeTab === 'details' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Classificação no Google Perfil
                </span>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#E2E8F0', marginBottom: '6px', fontWeight: 600 }}>
                    Categoria da Foto no Google
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                    {GOOGLE_PHOTO_CATEGORIES.map((cat) => {
                      const isSelected = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: isSelected ? '1.5px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.08)',
                            backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                            color: isSelected ? '#60A5FA' : '#D1D5DB',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Nome do Arquivo / Foto */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.78rem', color: '#E2E8F0', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <FileText size={13} style={{ color: '#06B6D4' }} /> Nome do Arquivo / Foto
                    </label>
                    {client && (
                      <button
                        type="button"
                        onClick={() => {
                          const city = client.address?.locality || client.address?.city || '';
                          setFileName(generateSeoFilename(client.business_name || 'empresa', category, city));
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#06B6D4',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                        title="Gerar nome de arquivo otimizado para SEO local"
                      >
                        Sugerir Nome SEO
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="Ex: zara-engenharia-curitiba-reforma.jpg"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      color: '#F9FAFB',
                      fontSize: '0.8rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: '4px', display: 'block' }}>
                    Nome do arquivo salvo e indexado pelo Google Meu Negócio e Google Imagens.
                  </span>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.78rem', color: '#E2E8F0', fontWeight: 600, margin: 0 }}>
                      Legenda & Texto Alt (SEO)
                    </label>
                    {client && (
                      <button
                        type="button"
                        onClick={() => {
                          const city = client.address?.locality || client.address?.city || 'Brasil';
                          setAltText(`${client.business_name || 'Empresa'} - Serviços especializados com localização em ${city}`);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#38BDF8',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        Sugerir Legenda
                      </button>
                    )}
                  </div>
                  <textarea
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    placeholder="Ex: Fachada moderna da Zara Engenharia em Curitiba..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      color: '#F9FAFB',
                      fontSize: '0.8rem',
                      lineHeight: '1.4',
                      resize: 'vertical',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: '4px', display: 'block' }}>
                    O Google Maps utiliza este texto alternativo para identificar a relevância da imagem em buscas locais.
                  </span>
                </div>
              </div>
            )}

            {/* Quick GPS Status Pill / Shortcut to GPS Tab */}
            <div
              onClick={() => setActiveTab('gps')}
              style={{
                marginTop: 'auto',
                padding: '10px 12px',
                borderRadius: '10px',
                backgroundColor: applySeoGeotag ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${applySeoGeotag ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.08)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Clique para configurar o GPS da foto"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <MapPin size={15} color={applySeoGeotag ? '#34D399' : '#9CA3AF'} style={{ flexShrink: 0 }} />
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: applySeoGeotag ? '#34D399' : '#9CA3AF' }}>
                    {applySeoGeotag ? 'GPS & Geo-tagging Ativo' : 'GPS Desativado'}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#6B7280', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {gpsCity || 'Local'} ({gpsLat ? parseFloat(gpsLat).toFixed(3) : '0'}, {gpsLng ? parseFloat(gpsLng).toFixed(3) : '0'})
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#60A5FA', fontWeight: 600 }}>Ajustar GPS</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="btn btn-secondary"
            style={{ padding: '8px 18px', fontSize: '0.85rem' }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={processing}
            className="btn btn-primary"
            style={{
              padding: '8px 22px',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {processing ? (
              <>Processando imagem...</>
            ) : (
              <>
                <Check size={16} /> Salvar e Aplicar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
