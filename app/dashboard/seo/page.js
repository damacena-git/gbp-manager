'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles, CheckCircle2, AlertTriangle, XCircle, ArrowRight,
  TrendingUp, RefreshCw, Send, ShieldCheck, Tag, Search,
  Edit3, ExternalLink, HelpCircle, Building2, MapPin, Copy, Plus, Check, Compass
} from 'lucide-react';

export default function SeoAuditPage() {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [auditMode, setAuditMode] = useState('client'); // 'client' | 'url'
  const [mapsUrl, setMapsUrl] = useState('');
  const [auditData, setAuditData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [applyResult, setApplyResult] = useState(null);
  const [copiedDesc, setCopiedDesc] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      const list = data.clients || [];
      setClients(list);
    } catch (err) {
      console.error('Error loading clients:', err);
    }
  }

  async function runAudit(clientId, force = false, onlySaved = false) {
    const id = clientId || selectedClientId;
    if (!id) return;

    setLoading(true);
    if (force) {
      setAuditData(null);
    }
    setApplyResult(null);

    try {
      const params = new URLSearchParams();
      if (force) params.set('refresh', 'true');
      if (onlySaved) params.set('only_saved', 'true');

      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/clients/${id}/seo-audit${queryStr}`);
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else if (data.hasSavedAudit === false) {
        // No saved audit exists yet for this profile; keep auditData null so empty state renders
        setAuditData(null);
      } else {
        setAuditData(data);
        setEditedDescription(data.aiSuggestions?.optimizedDescription || data.client?.description || '');
      }
    } catch (err) {
      console.error('Audit Error:', err);
      alert('Erro ao executar auditoria de SEO');
    } finally {
      setLoading(false);
    }
  }

  async function runUrlAudit() {
    if (!mapsUrl.trim()) {
      alert('Por favor, cole o link da ficha no Google Maps.');
      return;
    }

    setLoading(true);
    setAuditData(null);
    setApplyResult(null);

    try {
      const res = await fetch('/api/seo-audit/analyze-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: mapsUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || 'Erro ao auditar o link do Google Maps');
      } else {
        setAuditData(data);
        setEditedDescription(data.aiSuggestions?.optimizedDescription || data.client?.description || '');
      }
    } catch (err) {
      console.error('Audit Error:', err);
      alert('Erro ao conectar ao servidor para auditar o link.');
    } finally {
      setLoading(false);
    }
  }

  async function applyChanges() {
    if (!auditData?.client?.id) return;
    setApplying(true);
    setApplyResult(null);

    try {
      const res = await fetch(`/api/clients/${auditData.client.id}/apply-seo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editedDescription,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setApplyResult({
          type: 'success',
          message: result.message,
          googleUpdated: result.googleUpdated,
        });
        // refresh client description locally
        setAuditData((prev) => ({
          ...prev,
          client: { ...prev.client, description: editedDescription },
        }));
      } else {
        setApplyResult({
          type: 'error',
          message: result.error || 'Falha ao aplicar alterações',
        });
      }
    } catch (err) {
      console.error('Apply error:', err);
      setApplyResult({
        type: 'error',
        message: 'Erro na requisição ao aplicar mudanças.',
      });
    } finally {
      setApplying(false);
    }
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.pageHeader}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={styles.pageTitle}>Auditoria de SEO Local da Ficha</h1>
            <span className="badge badge-purple" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} /> Gemini IA
            </span>
          </div>
          <p style={styles.pageSubtitle}>
            Diagnóstico completo dos fatores de ranqueamento no Google Maps, palavras-chave locais e otimização instantânea
          </p>
        </div>
      </div>

      {/* Selector de Modo: Fichas da Conta vs Link do Google Maps */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          padding: '5px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          width: 'fit-content',
        }}
      >
        <button
          type="button"
          id="tab-audit-client"
          onClick={() => {
            setAuditMode('client');
            setAuditData(null);
            setApplyResult(null);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: '9px',
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backgroundColor: auditMode === 'client' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            color: auditMode === 'client' ? '#60A5FA' : '#9CA3AF',
            border: auditMode === 'client' ? '1px solid #3B82F6' : '1px solid transparent',
            boxShadow: auditMode === 'client' ? '0 0 14px rgba(59, 130, 246, 0.25)' : 'none',
          }}
        >
          <Building2 size={16} />
          Fichas da Conta (Acesso Direto)
        </button>

        <button
          type="button"
          id="tab-audit-url"
          onClick={() => {
            setAuditMode('url');
            setAuditData(null);
            setApplyResult(null);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: '9px',
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backgroundColor: auditMode === 'url' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
            color: auditMode === 'url' ? '#A78BFA' : '#9CA3AF',
            border: auditMode === 'url' ? '1px solid #8B5CF6' : '1px solid transparent',
            boxShadow: auditMode === 'url' ? '0 0 14px rgba(139, 92, 246, 0.25)' : 'none',
          }}
        >
          <MapPin size={16} />
          Analisar por Link do Google Maps
        </button>

        <Link
          href="/dashboard/rank-tracker"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: '9px',
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            color: '#60A5FA',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            textDecoration: 'none',
            marginLeft: 'auto',
            transition: 'all 0.2s ease',
          }}
        >
          <Compass size={16} />
          Abrir Rank Tracker (Mapa de Calor) →
        </Link>
      </div>

      {/* Painel de Controle de Entrada de acordo com o modo selecionado */}
      <div
        className="card"
        style={{
          marginBottom: '28px',
          padding: '20px 24px',
          backgroundColor: 'rgba(17, 24, 39, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {auditMode === 'client' ? (
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>
              Selecione a empresa cadastrada na conta:
            </label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                id="select-client-audit"
                className="input select"
                value={selectedClientId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedClientId(newId);
                  setAuditData(null);
                  setApplyResult(null);
                  if (newId) {
                    runAudit(newId, false, true); // Auto-load saved audit if one exists
                  }
                }}
                style={{ minWidth: '320px', flex: 1 }}
              >
                <option value="">Selecione uma empresa...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.business_name} {c.category ? `(${c.category})` : ''}
                  </option>
                ))}
              </select>

              <button
                id="btn-run-client-audit"
                onClick={() => runAudit(selectedClientId, auditData ? true : false, false)}
                disabled={loading || !selectedClientId}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '11px 24px',
                  background: auditData ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                }}
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                {loading ? 'Analisando...' : auditData ? 'Refazer Auditoria com IA' : 'Executar Auditoria'}
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '8px' }}>
              Analisa os dados oficiais da ficha conectada, histórico de avaliações, fotos e frequência de postagens.
            </p>
          </div>
        ) : (
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>
              Cole o link da ficha no Google Maps (concorrente ou prospecto):
            </label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '320px' }}>
                <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B5CF6' }}>
                  <MapPin size={18} />
                </div>
                <input
                  id="input-maps-url"
                  type="url"
                  className="input"
                  value={mapsUrl}
                  onChange={(e) => setMapsUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runUrlAudit()}
                  placeholder="Ex: https://maps.app.goo.gl/XYZ... ou https://www.google.com/maps/place/..."
                  style={{ width: '100%', paddingLeft: '42px' }}
                />
              </div>

              <button
                id="btn-run-url-audit"
                onClick={runUrlAudit}
                disabled={loading || !mapsUrl.trim()}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '11px 24px',
                  background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                  boxShadow: '0 0 16px rgba(139, 92, 246, 0.35)',
                }}
              >
                <Search size={15} className={loading ? 'animate-spin' : ''} />
                {loading ? 'Auditorando Ficha...' : 'Auditar Ficha do Google'}
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '8px' }}>
              💡 <strong>Como obter o link:</strong> Abra o local no Google Maps, clique em <strong>Compartilhar</strong> e selecione <strong>Copiar link</strong>. Funciona com links curtos <code>maps.app.goo.gl</code> ou URLs completas.
            </p>
          </div>
        )}
      </div>

      {loading ? (
        <div style={styles.loadingContainer}>
          <div className="spinner spinner-lg" style={{ marginBottom: '16px' }} />
          <p style={{ color: '#9CA3AF', fontSize: '1rem', fontWeight: 500 }}>
            Analisando parâmetros no Google Meu Negócio e gerando diagnóstico com IA...
          </p>
          <span style={{ color: '#6B7280', fontSize: '0.8125rem', marginTop: '6px' }}>
            Calculando relevância, histórico de reviews, frequência de postagens e dados NAP.
          </span>
        </div>
      ) : auditData ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top Score Banner */}
          <div className="card" style={styles.scoreBanner}>
            <div style={styles.scoreLeft}>
              <div
                style={{
                  ...styles.scoreCircle,
                  borderColor: auditData.tierColor,
                  boxShadow: `0 0 30px ${auditData.tierColor}33`,
                }}
              >
                <span style={{ fontSize: '2.5rem', fontWeight: 800, color: auditData.tierColor }}>
                  {auditData.score}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '-4px' }}>/ 100</span>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '999px',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      backgroundColor: `${auditData.tierColor}22`,
                      color: auditData.tierColor,
                    }}
                  >
                    {auditData.tier}
                  </span>

                  {auditData.isSaved && (
                    <span
                      id="badge-saved-audit"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        color: '#34D399',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                      }}
                      title="Esta auditoria foi carregada instantaneamente do banco de dados"
                    >
                      💾 Auditoria Salva {auditData.audited_at ? `(${new Date(auditData.audited_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })})` : ''}
                    </span>
                  )}

                  {auditData.scoreDifference !== null && auditData.scoreDifference !== undefined && (
                    <span
                      id="badge-score-evolution"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 11px',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        backgroundColor: auditData.scoreDifference >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: auditData.scoreDifference >= 0 ? '#10B981' : '#EF4444',
                        border: `1px solid ${auditData.scoreDifference >= 0 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
                        boxShadow: `0 0 10px ${auditData.scoreDifference >= 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                      }}
                    >
                      <TrendingUp size={13} />
                      Evolução: {auditData.scoreDifference >= 0 ? `+${auditData.scoreDifference}` : auditData.scoreDifference} pts
                      {auditData.previousScore !== undefined && ` (anterior: ${auditData.previousScore} pts)`}
                    </span>
                  )}

                  {auditData.client?.isExternal ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        color: '#F87171',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                      }}
                    >
                      <MapPin size={12} /> Ficha Externa (Google Maps)
                    </span>
                  ) : (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        color: '#60A5FA',
                        border: '1px solid rgba(59, 130, 246, 0.35)',
                      }}
                    >
                      <Building2 size={12} /> Ficha Conectada na Conta
                    </span>
                  )}

                  {auditData.client?.sourceUrl && (
                    <a
                      href={auditData.client.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.75rem',
                        color: '#9CA3AF',
                        textDecoration: 'none',
                        marginLeft: '4px',
                      }}
                    >
                      <ExternalLink size={12} /> Ver no Google Maps
                    </a>
                  )}
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  {auditData.client?.business_name}
                </h2>
                <p style={{ fontSize: '0.875rem', color: '#9CA3AF', marginTop: '4px' }}>
                  {auditData.client?.category || 'Sem categoria'} • {auditData.client?.address || 'Localização não especificada'}
                </p>
              </div>
            </div>

            {/* 4 Pillars Mini-Cards */}
            <div style={styles.pillarsGrid}>
              <div style={styles.pillarItem}>
                <span style={styles.pillarLabel}>📌 Relevância</span>
                <div style={styles.pillarProgress}>
                  <div
                    style={{
                      ...styles.pillarBar,
                      width: `${(auditData.breakdown.relevance.score / auditData.breakdown.relevance.max) * 100}%`,
                      backgroundColor: '#3B82F6',
                    }}
                  />
                </div>
                <span style={styles.pillarScore}>
                  {auditData.breakdown.relevance.score} / {auditData.breakdown.relevance.max} pts
                </span>
              </div>

              <div style={styles.pillarItem}>
                <span style={styles.pillarLabel}>⭐ Reputação</span>
                <div style={styles.pillarProgress}>
                  <div
                    style={{
                      ...styles.pillarBar,
                      width: `${(auditData.breakdown.reputation.score / auditData.breakdown.reputation.max) * 100}%`,
                      backgroundColor: '#10B981',
                    }}
                  />
                </div>
                <span style={styles.pillarScore}>
                  {auditData.breakdown.reputation.score} / {auditData.breakdown.reputation.max} pts
                </span>
              </div>

              <div style={styles.pillarItem}>
                <span style={styles.pillarLabel}>📈 Atividade</span>
                <div style={styles.pillarProgress}>
                  <div
                    style={{
                      ...styles.pillarBar,
                      width: `${(auditData.breakdown.activity.score / auditData.breakdown.activity.max) * 100}%`,
                      backgroundColor: '#8B5CF6',
                    }}
                  />
                </div>
                <span style={styles.pillarScore}>
                  {auditData.breakdown.activity.score} / {auditData.breakdown.activity.max} pts
                </span>
              </div>

              <div style={styles.pillarItem}>
                <span style={styles.pillarLabel}>📍 Dados NAP</span>
                <div style={styles.pillarProgress}>
                  <div
                    style={{
                      ...styles.pillarBar,
                      width: `${(auditData.breakdown.nap.score / auditData.breakdown.nap.max) * 100}%`,
                      backgroundColor: '#F59E0B',
                    }}
                  />
                </div>
                <span style={styles.pillarScore}>
                  {auditData.breakdown.nap.score} / {auditData.breakdown.nap.max} pts
                </span>
              </div>
            </div>
          </div>

          {/* Historical Evolution Timeline if available */}
          {auditData.history && auditData.history.length > 0 && (
            <div
              id="card-seo-history"
              className="card"
              style={{
                padding: '20px 24px',
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                borderRadius: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <TrendingUp size={20} style={{ color: '#8B5CF6' }} />
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#F8FAFC' }}>
                      Evolução da Ficha & Histórico de Auditorias
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: '#9CA3AF', margin: '2px 0 0' }}>
                      Acompanhe o ganho de autoridade e a evolução da pontuação ao longo das otimizações realizadas.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>
                    {auditData.history.length + 1} diagnósticos registrados
                  </span>
                  {!auditData.client?.isExternal && (
                    <button
                      type="button"
                      onClick={() => runAudit(selectedClientId, true, false)}
                      disabled={loading}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                      Refazer Auditoria
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '6px' }}>
                {/* Current Audit */}
                <div
                  style={{
                    minWidth: '180px',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(59, 130, 246, 0.12)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase' }}>
                      Auditoria Atual
                    </span>
                    <span className="badge badge-blue" style={{ fontSize: '0.625rem', padding: '1px 5px' }}>
                      Ativa
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '1.75rem', fontWeight: 800, color: auditData.tierColor }}>
                      {auditData.score}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>/ 100 pts</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#CBD5E1', fontWeight: 600 }}>
                    {auditData.tier}
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: '#9CA3AF', marginTop: '2px' }}>
                    {auditData.audited_at ? new Date(auditData.audited_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Hoje'}
                  </span>
                </div>

                {/* History list */}
                {auditData.history.slice().reverse().map((hist, idx) => {
                  const diffWithCurrent = auditData.score - hist.score;
                  return (
                    <div
                      key={idx}
                      style={{
                        minWidth: '180px',
                        padding: '14px 16px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>
                          Histórico #{auditData.history.length - idx}
                        </span>
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            color: diffWithCurrent >= 0 ? '#10B981' : '#EF4444',
                          }}
                        >
                          {diffWithCurrent >= 0 ? `+${diffWithCurrent}` : diffWithCurrent} pts
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 700, color: hist.tierColor || '#E2E8F0' }}>
                          {hist.score}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>/ 100 pts</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                        {hist.tier}
                      </span>
                      <span style={{ fontSize: '0.6875rem', color: '#6B7280', marginTop: '2px' }}>
                        {hist.audited_at ? new Date(hist.audited_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Diagnostic & Action Plan */}
          <div style={styles.twoColumn}>
            {/* AI Diagnostic Narrative */}
            <div className="card" style={{ flex: 1 }}>
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} style={{ color: '#8B5CF6' }} />
                <h3 className="card-title">Diagnóstico Especialista (Gemini IA)</h3>
              </div>
              <div style={{ padding: '16px 20px', color: '#E2E8F0', lineHeight: '1.7', fontSize: '0.9375rem' }}>
                {auditData.aiSuggestions?.seoDiagnostic}
              </div>

              {/* Local Keywords */}
              {auditData.aiSuggestions?.localKeywords?.length > 0 && (
                <div style={{ padding: '0 20px 20px' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>
                    🔍 Palavras-chave Locais Mais Buscadas:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {auditData.aiSuggestions.localKeywords.map((kw, i) => (
                      <span key={i} className="badge badge-blue" style={{ fontSize: '0.75rem' }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Categories */}
              {auditData.aiSuggestions?.recommendedSecondaryCategories?.length > 0 && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border-primary)', paddingTop: '16px' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>
                    🏷️ Categorias Secundárias Recomendadas:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {auditData.aiSuggestions.recommendedSecondaryCategories.map((cat, i) => (
                      <span key={i} className="badge badge-purple" style={{ fontSize: '0.75rem' }}>
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Plan */}
            <div className="card" style={{ flex: 1 }}>
              <div className="card-header">
                <h3 className="card-title">Plano de Ação Prioritário</h3>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(auditData.aiSuggestions?.actionPlan || []).map((step, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-primary)',
                      display: 'flex',
                      gap: '12px',
                    }}
                  >
                    <span
                      style={{
                        alignSelf: 'flex-start',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        backgroundColor:
                          step.priority === 'Alta'
                            ? 'rgba(239, 68, 68, 0.2)'
                            : step.priority === 'Média'
                            ? 'rgba(245, 158, 11, 0.2)'
                            : 'rgba(59, 130, 246, 0.2)',
                        color:
                          step.priority === 'Alta'
                            ? '#EF4444'
                            : step.priority === 'Média'
                            ? '#F59E0B'
                            : '#3B82F6',
                      }}
                    >
                      {step.priority}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#F8FAFC' }}>
                        {step.action}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#9CA3AF', marginTop: '4px' }}>
                        {step.impact}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* OTIMIZADOR DE DESCRIÇÃO E APLICAÇÃO DIRETA NO GOOGLE */}
          <div className="card" style={{ border: '1px solid rgba(59, 130, 246, 0.4)' }}>
            <div
              className="card-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={18} style={{ color: '#3B82F6' }} />
                <div>
                  <h3 className="card-title">Otimizador de Ficha com 1-Clique</h3>
                  <p style={{ fontSize: '0.8125rem', color: '#9CA3AF', marginTop: '2px' }}>
                    Revise a nova descrição sugerida com palavras-chave locais e envie direto para o Google Meu Negócio
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  id="btn-copy-description"
                  onClick={() => {
                    navigator.clipboard.writeText(editedDescription);
                    setCopiedDesc(true);
                    setTimeout(() => setCopiedDesc(false), 2500);
                  }}
                  className="btn btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 18px',
                    fontSize: '0.875rem',
                  }}
                  title="Copiar descrição otimizada para a área de transferência"
                >
                  {copiedDesc ? <CheckCircle2 size={16} style={{ color: '#10B981' }} /> : <Copy size={16} />}
                  {copiedDesc ? 'Copiado com Sucesso!' : 'Copiar Descrição'}
                </button>

                {!auditData.client?.isExternal ? (
                  <button
                    id="btn-apply-google"
                    onClick={applyChanges}
                    disabled={applying || !editedDescription}
                    className="btn btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 22px',
                      boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)',
                    }}
                  >
                    {applying ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Aplicando no Google...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Aplicar Mudanças na Ficha
                      </>
                    )}
                  </button>
                ) : (
                  <Link
                    href={`/dashboard/clients?new=true&name=${encodeURIComponent(auditData.client?.business_name || '')}&category=${encodeURIComponent(auditData.client?.category || '')}&address=${encodeURIComponent(auditData.client?.address || '')}`}
                    className="btn btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 18px',
                      textDecoration: 'none',
                      background: 'linear-gradient(135deg, #10B981, #059669)',
                    }}
                  >
                    <Plus size={16} /> Cadastrar como Cliente
                  </Link>
                )}
              </div>
            </div>

            {/* Notification alert on apply */}
            {applyResult && (
              <div
                style={{
                  margin: '16px 20px 0',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  backgroundColor:
                    applyResult.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${
                    applyResult.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                  }`,
                }}
              >
                {applyResult.type === 'success' ? (
                  <CheckCircle2 size={20} style={{ color: '#10B981', flexShrink: 0 }} />
                ) : (
                  <XCircle size={20} style={{ color: '#EF4444', flexShrink: 0 }} />
                )}
                <div style={{ fontSize: '0.875rem', color: '#F9FAFB' }}>
                  {applyResult.message}
                </div>
              </div>
            )}

            <div style={styles.descriptionComparison}>
              {/* Current Description */}
              <div style={styles.descBox}>
                <div style={styles.descBoxHeader}>
                  <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#9CA3AF' }}>
                    DESCRIÇÃO ATUAL NO GOOGLE
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                    {auditData.client?.description ? auditData.client.description.length : 0}/750 chars
                  </span>
                </div>
                <div style={styles.currentDescContent}>
                  {auditData.client?.description || (
                    <span style={{ color: '#6B7280', fontStyle: 'italic' }}>
                      Nenhuma descrição cadastrada na ficha.
                    </span>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <div style={styles.arrowDivider}>
                <ArrowRight size={24} style={{ color: '#3B82F6' }} />
              </div>

              {/* Optimized Description (Editable) */}
              <div style={styles.descBox}>
                <div style={styles.descBoxHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#8B5CF6' }}>
                      SUGESTÃO OTIMIZADA PARA SEO (GEMINI)
                    </span>
                    <span className="badge badge-purple" style={{ fontSize: '0.625rem', padding: '1px 6px' }}>
                      Recomendado
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: editedDescription.length > 750 ? '#EF4444' : '#9CA3AF',
                      fontWeight: 600,
                    }}
                  >
                    {editedDescription.length}/750 chars
                  </span>
                </div>
                <textarea
                  className="input textarea"
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  maxLength={750}
                  rows={7}
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    borderColor: 'rgba(139, 92, 246, 0.4)',
                    fontSize: '0.875rem',
                    lineHeight: '1.6',
                    padding: '12px',
                  }}
                  placeholder="Descrição otimizada com palavras-chave locais e chamada para ação..."
                />
              </div>
            </div>
          </div>

          {/* Detailed Audit Checklist */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Checklist Detalhado de Ranqueamento</h3>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '120px' }}>Pilar</th>
                    <th style={{ width: '60px' }}>Status</th>
                    <th>Critério Avaliado</th>
                    <th>Diagnóstico & Impacto</th>
                  </tr>
                </thead>
                <tbody>
                  {auditData.checklist.map((item, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#9CA3AF' }}>
                        {item.pillar}
                      </td>
                      <td>
                        {item.status === 'pass' && (
                          <CheckCircle2 size={18} style={{ color: '#10B981' }} title="Conforme" />
                        )}
                        {item.status === 'warning' && (
                          <AlertTriangle size={18} style={{ color: '#F59E0B' }} title="Oportunidade de Melhoria" />
                        )}
                        {item.status === 'fail' && (
                          <XCircle size={18} style={{ color: '#EF4444' }} title="Crítico / Ausente" />
                        )}
                      </td>
                      <td style={{ fontWeight: 600, color: '#F8FAFC' }}>
                        {item.item}
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: '#CBD5E1' }}>
                        {item.detail}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={styles.emptyStateContainer}>
          <div style={styles.emptyIconCircle}>
            {auditMode === 'client' ? (
              <Building2 size={38} style={{ color: '#3B82F6' }} />
            ) : (
              <MapPin size={38} style={{ color: '#8B5CF6' }} />
            )}
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px', color: '#F8FAFC' }}>
            {auditMode === 'client'
              ? 'Selecione uma ficha da sua conta e clique em Executar Auditoria'
              : 'Cole o link de uma ficha do Google Maps para auditar'}
          </h2>
          <p style={{ color: '#9CA3AF', maxWidth: '540px', margin: '0 auto 24px', fontSize: '0.875rem', lineHeight: '1.6' }}>
            {auditMode === 'client'
              ? 'Escolha a empresa no menu acima para avaliar os fatores de ranqueamento, reputação de reviews, frequência de postagens e aplicar otimizações com 1-clique.'
              : 'Analise qualquer ficha pública do Google Maps (seus concorrentes locais ou clientes em potencial). O sistema analisa o perfil e gera diagnóstico, palavras-chave e cópia otimizada com IA.'}
          </p>
          {auditMode === 'client' ? (
            selectedClientId ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <p style={{ color: '#E2E8F0', fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>
                  Nenhuma auditoria salva encontrada para esta ficha.
                </p>
                <button
                  id="btn-run-first-audit"
                  onClick={() => runAudit(selectedClientId, false, false)}
                  className="btn btn-primary btn-lg"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}
                >
                  <Sparkles size={18} />
                  Executar Auditoria de SEO com IA
                </button>
              </div>
            ) : (
              <div style={{ color: '#6B7280', fontSize: '0.8125rem' }}>
                👆 Selecione uma empresa no campo de seleção acima
              </div>
            )
          ) : mapsUrl.trim() ? (
            <button
              onClick={runUrlAudit}
              className="btn btn-primary btn-lg"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
              }}
            >
              <Search size={18} />
              Auditar Ficha do Google Maps
            </button>
          ) : (
            <div style={{ color: '#6B7280', fontSize: '0.8125rem' }}>
              👆 Cole o link do Google Maps no campo de busca acima
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { animation: 'fadeIn 0.3s ease-out' },
  emptyStateContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 24px',
    textAlign: 'center',
  },
  emptyIconCircle: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  pageTitle: { fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' },
  pageSubtitle: { fontSize: '0.875rem', color: '#9CA3AF', marginTop: '4px' },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
    textAlign: 'center',
  },
  scoreBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '24px',
    padding: '24px 28px',
  },
  scoreLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  scoreCircle: {
    width: '90px',
    height: '90px',
    borderRadius: '50%',
    border: '4px solid',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  pillarsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '16px',
    minWidth: '320px',
    flex: 1,
    maxWidth: '560px',
  },
  pillarItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  pillarLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#9CA3AF',
  },
  pillarProgress: {
    width: '100%',
    height: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '999px',
    overflow: 'hidden',
  },
  pillarBar: {
    height: '100%',
    borderRadius: '999px',
    transition: 'width 0.5s ease',
  },
  pillarScore: {
    fontSize: '0.6875rem',
    color: '#6B7280',
    fontWeight: 600,
  },
  twoColumn: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
  },
  descriptionComparison: {
    display: 'flex',
    gap: '20px',
    padding: '20px',
    alignItems: 'stretch',
    flexWrap: 'wrap',
  },
  descBox: {
    flex: 1,
    minWidth: '280px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  descBoxHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentDescContent: {
    padding: '12px 14px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-primary)',
    minHeight: '160px',
    fontSize: '0.875rem',
    color: '#CBD5E1',
    lineHeight: '1.6',
  },
  arrowDivider: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 8px',
  },
};
