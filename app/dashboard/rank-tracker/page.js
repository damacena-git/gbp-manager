'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  MapPin, Search, Compass, Trophy, Star, TrendingUp, RefreshCw,
  Building2, Users, AlertCircle, ArrowRight, ShieldCheck, Sparkles,
  Layers, Sliders, CheckCircle2, ChevronRight, Eye, Info, Clock
} from 'lucide-react';
import { getRankBadgeColor } from '@/components/rank/HeatmapGrid';

// Dynamic import for Leaflet map to avoid Next.js SSR issues
const HeatmapGrid = dynamic(() => import('@/components/rank/HeatmapGrid'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: '100%',
      height: '520px',
      borderRadius: '16px',
      backgroundColor: '#0B0F17',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      gap: '12px',
      color: '#9CA3AF'
    }}>
      <RefreshCw size={28} className="animate-spin" style={{ color: '#3B82F6' }} />
      <span style={{ fontSize: '0.875rem' }}>Carregando mapa interativo e camadas de satélite...</span>
    </div>
  ),
});

export default function RankTrackerPage() {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [loadingClients, setLoadingClients] = useState(true);

  // Scan Controls
  const [keyword, setKeyword] = useState('');
  const [gridSize, setGridSize] = useState(5); // 3, 5, 7
  const [radiusKm, setRadiusKm] = useState(3); // 1, 2, 3, 5, 10
  const [scanning, setScanning] = useState(false);

  // Scan Results
  const [currentScan, setCurrentScan] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    setLoadingClients(true);
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      const list = (data.clients || []).filter((c) => c.status === 'active' || !c.status);
      setClients(list);
      if (list.length > 0) {
        setSelectedClientId(list[0].id);
        setupDefaultKeyword(list[0]);
        loadHistoryForClient(list[0].id);
      }
    } catch (err) {
      console.error('Error loading clients:', err);
    } finally {
      setLoadingClients(false);
    }
  }

  function setupDefaultKeyword(client) {
    if (!client) return;
    const cat = client.category || 'Serviços';
    const city = client.city || '';
    setKeyword(`${cat}${city ? ` ${city}` : ''}`.trim());
  }

  function handleClientChange(clientId) {
    setSelectedClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
    if (client) setupDefaultKeyword(client);
    loadHistoryForClient(clientId);
  }

  async function loadHistoryForClient(clientId) {
    if (!clientId) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/rank-tracker/history`);
      const data = await res.json();
      if (data.scans && data.scans.length > 0) {
        setHistory(data.scans);
        // Load the most recent scan automatically if none active
        setCurrentScan(data.scans[0]);
        if (data.scans[0].points?.length > 0) {
          const centerPt = data.scans[0].points.find((p) => p.isCenter) || data.scans[0].points[0];
          setSelectedPoint(centerPt);
        }
      } else {
        setHistory([]);
        setCurrentScan(null);
        setSelectedPoint(null);
      }
    } catch (err) {
      console.error('Error loading history:', err);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function runScan() {
    if (!selectedClientId) {
      alert('Selecione um cliente para iniciar a varredura.');
      return;
    }
    if (!keyword.trim()) {
      alert('Digite uma palavra-chave para rastrear.');
      return;
    }

    setScanning(true);
    setSelectedPoint(null);

    try {
      const res = await fetch(`/api/clients/${selectedClientId}/rank-tracker/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: keyword.trim(),
          gridSize,
          radiusKm,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || 'Erro ao executar varredura.');
      } else {
        setCurrentScan(data.scan);
        setHistory((prev) => [data.scan, ...prev.filter((s) => s.id !== data.scan.id)].slice(0, 20));
        if (data.scan.points?.length > 0) {
          const centerPt = data.scan.points.find((p) => p.isCenter) || data.scan.points[0];
          setSelectedPoint(centerPt);
        }
      }
    } catch (err) {
      console.error('Scan Error:', err);
      alert('Erro de conexão ao processar a varredura.');
    } finally {
      setScanning(false);
    }
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={styles.badge}>
              <Compass size={14} style={{ color: '#3B82F6' }} />
              <span>Geo-Grid Local SEO</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>•</span>
            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Radar de Posições Google Maps</span>
          </div>
          <h1 style={styles.title}>Rank Tracker com Mapa de Calor</h1>
          <p style={styles.subtitle}>
            Descubra a posição real da sua empresa no Google Meu Negócio em diferentes raios e quadrantes da cidade.
          </p>
        </div>

        {/* Client Selector */}
        <div style={styles.clientSelectorBox}>
          <Building2 size={18} style={{ color: '#3B82F6', flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.7rem', color: '#9CA3AF', fontWeight: 600 }}>CLIENTE ATIVO</label>
            <select
              value={selectedClientId}
              onChange={(e) => handleClientChange(e.target.value)}
              disabled={loadingClients || scanning}
              style={styles.clientSelect}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.business_name} {c.city ? `(${c.city})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* CONTROLS CARD */}
      <div style={styles.card}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
          {/* Keyword Input */}
          <div style={{ flex: '2 1 280px', minWidth: 0 }}>
            <label style={styles.controlLabel}>
              Palavra-Chave para Rastrear no Maps
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#6B7280' }} />
              <input
                type="text"
                placeholder="Ex: podologia sudoeste, hamburgueria artesanal..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                disabled={scanning}
                style={{ ...styles.input, paddingLeft: '38px' }}
                onKeyDown={(e) => { if (e.key === 'Enter') runScan(); }}
              />
            </div>
          </div>

          {/* Grid Size Selector */}
          <div style={{ flex: '1 1 180px', minWidth: 0 }}>
            <label style={styles.controlLabel}>Densidade da Grade</label>
            <div style={styles.toggleGroup}>
              {[
                { size: 3, label: '3x3 (9 pts)' },
                { size: 5, label: '5x5 (25 pts)' },
                { size: 7, label: '7x7 (49 pts)' },
              ].map((item) => (
                <button
                  key={item.size}
                  type="button"
                  onClick={() => setGridSize(item.size)}
                  disabled={scanning}
                  style={{
                    ...styles.toggleBtn,
                    backgroundColor: gridSize === item.size ? '#3B82F6' : 'transparent',
                    color: gridSize === item.size ? '#FFFFFF' : '#9CA3AF',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Radius Selector */}
          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
            <label style={styles.controlLabel}>Raio de Varredura</label>
            <div style={styles.toggleGroup}>
              {[1, 2, 3, 5, 10].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRadiusKm(r)}
                  disabled={scanning}
                  style={{
                    ...styles.toggleBtn,
                    backgroundColor: radiusKm === r ? '#3B82F6' : 'transparent',
                    color: radiusKm === r ? '#FFFFFF' : '#9CA3AF',
                  }}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>

          {/* Scan Action Button */}
          <div style={{ flex: '0 0 auto' }}>
            <button
              type="button"
              onClick={runScan}
              disabled={scanning || !selectedClientId}
              style={{
                ...styles.scanBtn,
                opacity: scanning ? 0.7 : 1,
                cursor: scanning ? 'not-allowed' : 'pointer',
              }}
            >
              {scanning ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Escanear {gridSize * gridSize} Pontos...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Escanear Geo-Grid
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Keyword Pills */}
        {selectedClient?.category && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>Sugestões rápidas:</span>
            {[
              selectedClient.category,
              `${selectedClient.category} ${selectedClient.city || ''}`.trim(),
              `melhor ${selectedClient.category}`,
              `${selectedClient.category} perto de mim`,
            ].map((sug, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setKeyword(sug)}
                style={styles.suggestionPill}
              >
                {sug}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* METRICS ROW (When scan exists) */}
      {currentScan && (
        <div style={styles.metricsGrid}>
          {/* Card 1: ARP */}
          <div style={styles.metricCard}>
            <div style={styles.metricHeader}>
              <span style={styles.metricLabel}>Posição Média (ARP)</span>
              <Trophy size={18} style={{ color: currentScan.metrics.arp <= 3 ? '#10B981' : currentScan.metrics.arp <= 9 ? '#F59E0B' : '#EF4444' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span style={styles.metricValue}>#{currentScan.metrics.arp}</span>
              <span style={{ fontSize: '0.78rem', color: currentScan.metrics.arp <= 3 ? '#10B981' : '#F59E0B', fontWeight: 600 }}>
                {currentScan.metrics.arp <= 3 ? 'Dominância Alta' : currentScan.metrics.arp <= 9 ? 'Boa Visibilidade' : 'Oportunidade'}
              </span>
            </div>
            <span style={styles.metricDesc}>Média em todos os {currentScan.totalPoints} pontos no raio de {currentScan.radiusKm} km</span>
          </div>

          {/* Card 2: SoLV (Share of Local Voice) */}
          <div style={styles.metricCard}>
            <div style={styles.metricHeader}>
              <span style={styles.metricLabel}>Share of Local Voice (Top 3)</span>
              <Star size={18} style={{ color: '#3B82F6' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span style={{ ...styles.metricValue, color: '#3B82F6' }}>{currentScan.metrics.solv}%</span>
              <span style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>({currentScan.metrics.top3Count} de {currentScan.totalPoints} pts)</span>
            </div>
            <span style={styles.metricDesc}>Presença direta no cobiçado Local 3-Pack</span>
          </div>

          {/* Card 3: Best Point */}
          <div style={styles.metricCard}>
            <div style={styles.metricHeader}>
              <span style={styles.metricLabel}>Melhor Ponto da Grade</span>
              <CheckCircle2 size={18} style={{ color: '#10B981' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span style={{ ...styles.metricValue, color: '#10B981' }}>#{currentScan.metrics.bestPoint.rank}</span>
              <span style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>{currentScan.metrics.bestPoint.direction}</span>
            </div>
            <span style={styles.metricDesc}>A {currentScan.metrics.bestPoint.distanceKm} km de distância do estabelecimento</span>
          </div>

          {/* Card 4: Worst Point */}
          <div style={styles.metricCard}>
            <div style={styles.metricHeader}>
              <span style={styles.metricLabel}>Ponto com Menor Rank</span>
              <AlertCircle size={18} style={{ color: '#EF4444' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span style={{ ...styles.metricValue, color: currentScan.metrics.worstPoint.rank > 20 ? '#EF4444' : '#F97316' }}>
                {currentScan.metrics.worstPoint.rank <= 20 ? `#${currentScan.metrics.worstPoint.rank}` : '20+'}
              </span>
              <span style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>{currentScan.metrics.worstPoint.direction}</span>
            </div>
            <span style={styles.metricDesc}>A {currentScan.metrics.worstPoint.distanceKm} km de distância (foco de expansão)</span>
          </div>
        </div>
      )}

      {/* MAIN VIEW: HEATMAP + INSPECTION PANEL */}
      <div style={styles.mainLayout}>
        {/* Left: Map Container */}
        <div style={styles.mapCard}>
          <div style={styles.mapHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={18} style={{ color: '#3B82F6' }} />
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#F9FAFB' }}>
                Visualização Geo-Espacial do Google Maps
              </h2>
            </div>
            {currentScan && (
              <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                Termo: <strong style={{ color: '#F3F4F6' }}>"{currentScan.keyword}"</strong> • {currentScan.gridSize}x{currentScan.gridSize} ({currentScan.radiusKm} km)
              </span>
            )}
          </div>

          {currentScan ? (
            <HeatmapGrid
              scan={currentScan}
              selectedPoint={selectedPoint}
              onSelectPoint={(pt) => setSelectedPoint(pt)}
            />
          ) : (
            <div style={styles.emptyMapBox}>
              <Compass size={48} style={{ color: '#4B5563', marginBottom: '14px' }} />
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.125rem', color: '#E5E7EB', fontWeight: 700 }}>
                Nenhuma varredura ativa para este cliente
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#9CA3AF', maxWidth: '440px', textAlign: 'center' }}>
                Selecione uma palavra-chave acima e clique em <strong>"Escanear Geo-Grid"</strong> para gerar o mapa de calor com as posições da ficha no Google Maps.
              </p>
            </div>
          )}
        </div>

        {/* Right: Point Details / Competitors at Selected Point */}
        <div style={styles.sideCard}>
          <div style={styles.sideHeader}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#F9FAFB', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye size={16} style={{ color: '#3B82F6' }} />
              Detalhes do Ponto Selecionado
            </h3>
          </div>

          {selectedPoint ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Point Status Badge */}
              {(() => {
                const badge = getRankBadgeColor(selectedPoint.rank);
                return (
                  <div
                    style={{
                      padding: '14px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${badge.border}40`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 600 }}>
                        Posição no Ponto
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: badge.bg }}>
                          #{selectedPoint.rank <= 20 ? selectedPoint.rank : '20+'}
                        </span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: badge.bg }}>
                          {badge.label}
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>Quadrante</span>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#E5E7EB', marginTop: '2px' }}>
                        {selectedPoint.direction}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                        {selectedPoint.distanceKm === 0 ? 'Local Físico' : `a ${selectedPoint.distanceKm} km`}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Coordinates Info */}
              <div style={{ fontSize: '0.75rem', color: '#9CA3AF', backgroundColor: '#1E293B', padding: '8px 12px', borderRadius: '8px' }}>
                Coordenadas: <code>{selectedPoint.lat}, {selectedPoint.lng}</code>
              </div>

              {/* Competitors List at this point */}
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#E5E7EB', display: 'block', marginBottom: '10px' }}>
                  Líderes Locais neste Quadrante
                </span>

                {selectedPoint.competitors && selectedPoint.competitors.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedPoint.competitors.map((comp, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1, paddingRight: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: idx === 0 ? '#10B981' : '#F59E0B' }}>
                              #{comp.position}
                            </span>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#F3F4F6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {comp.name}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', fontSize: '0.72rem', color: '#9CA3AF' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#FBBF24' }}>
                              <Star size={11} fill="#FBBF24" /> {comp.rating}
                            </span>
                            <span>•</span>
                            <span>{comp.reviews} avaliações</span>
                          </div>
                        </div>

                        <span style={{ fontSize: '0.7rem', color: '#6B7280', flexShrink: 0 }}>
                          ~{comp.distanceKm} km
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: 0 }}>
                    Nenhum concorrente identificado diretamente neste ponto.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: '#6B7280', fontSize: '0.85rem' }}>
              Clique em qualquer pino ou ponto térmico no mapa para inspecionar os concorrentes e a posição exata naquele quadrante.
            </div>
          )}
        </div>
      </div>

      {/* HISTORY TABLE */}
      {history.length > 0 && (
        <div style={{ ...styles.card, marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#F9FAFB', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} style={{ color: '#3B82F6' }} />
              Histórico de Varreduras ({history.length})
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
              Clique para recarregar o mapa de qualquer data anterior
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#9CA3AF', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Data & Hora</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Palavra-Chave</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Grade & Raio</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Posição Média (ARP)</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Top 3 (SoLV)</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {history.map((scanItem) => {
                  const isCurrent = currentScan?.id === scanItem.id;
                  return (
                    <tr
                      key={scanItem.id}
                      onClick={() => {
                        setCurrentScan(scanItem);
                        const centerPt = scanItem.points?.find((p) => p.isCenter) || scanItem.points?.[0];
                        setSelectedPoint(centerPt);
                      }}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        backgroundColor: isCurrent ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      <td style={{ padding: '12px 14px', color: '#E5E7EB' }}>
                        {new Date(scanItem.scannedAt).toLocaleDateString('pt-BR')} às {new Date(scanItem.scannedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#F3F4F6' }}>
                        "{scanItem.keyword}"
                      </td>
                      <td style={{ padding: '12px 14px', color: '#9CA3AF' }}>
                        {scanItem.gridSize}x{scanItem.gridSize} • {scanItem.radiusKm} km
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          backgroundColor: scanItem.metrics?.arp <= 3 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: scanItem.metrics?.arp <= 3 ? '#10B981' : '#F59E0B',
                        }}>
                          #{scanItem.metrics?.arp}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#3B82F6' }}>
                        {scanItem.metrics?.solv}%
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <span style={{ fontSize: '0.75rem', color: isCurrent ? '#3B82F6' : '#9CA3AF', fontWeight: 600 }}>
                          {isCurrent ? '● Ativo no Mapa' : 'Visualizar →'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1380px',
    margin: '0 auto',
    padding: '24px 20px 48px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '20px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '20px',
    padding: '4px 10px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#93C5FD',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#F9FAFB',
    margin: '0 0 6px 0',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#9CA3AF',
    margin: 0,
    maxWidth: '650px',
    lineHeight: 1.5,
  },
  clientSelectorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#111827',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '10px 16px',
    minWidth: '240px',
  },
  clientSelect: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#F9FAFB',
    fontSize: '0.875rem',
    fontWeight: 700,
    outline: 'none',
    cursor: 'pointer',
    marginTop: '2px',
  },
  card: {
    backgroundColor: '#111827',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '20px 22px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
  },
  controlLabel: {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: 600,
    color: '#D1D5DB',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    height: '42px',
    borderRadius: '10px',
    backgroundColor: '#1E293B',
    border: '1px solid #334155',
    color: '#F8FAFC',
    fontSize: '0.875rem',
    padding: '0 14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  toggleGroup: {
    display: 'flex',
    backgroundColor: '#1E293B',
    border: '1px solid #334155',
    borderRadius: '10px',
    padding: '3px',
    height: '42px',
    boxSizing: 'border-box',
  },
  toggleBtn: {
    flex: 1,
    border: 'none',
    borderRadius: '7px',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  scanBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '10px',
    padding: '0 22px',
    height: '42px',
    fontSize: '0.875rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
    transition: 'all 0.2s',
  },
  suggestionPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#D1D5DB',
    borderRadius: '6px',
    padding: '3px 8px',
    fontSize: '0.72rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginTop: '20px',
  },
  metricCard: {
    backgroundColor: '#111827',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    padding: '16px 18px',
    display: 'flex',
    flexDirection: 'column',
  },
  metricHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  metricValue: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#F9FAFB',
    letterSpacing: '-0.02em',
  },
  metricDesc: {
    fontSize: '0.72rem',
    color: '#6B7280',
    marginTop: '6px',
  },
  mainLayout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 340px',
    gap: '20px',
    marginTop: '20px',
  },
  mapCard: {
    backgroundColor: '#111827',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  mapHeader: {
    padding: '14px 18px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
  },
  emptyMapBox: {
    height: '520px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    backgroundColor: '#0B0F17',
  },
  sideCard: {
    backgroundColor: '#111827',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
  },
  sideHeader: {
    paddingBottom: '14px',
    marginBottom: '14px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  },
};
