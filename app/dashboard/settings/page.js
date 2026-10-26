'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Cpu, Sparkles, Key, CheckCircle2, AlertTriangle, RefreshCw,
  ExternalLink, Eye, EyeOff, ShieldCheck, Zap, Globe, Building2,
  Check, Save, Clock, ArrowRight, HelpCircle, Layers, Server, Filter,
  Info, Sliders, CheckCheck
} from 'lucide-react';

export default function SettingsPage() {
  // State for AI Settings
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);

  // Model & Key state
  const [activeModel, setActiveModel] = useState('gemini-flash-lite-latest');
  const [customApiKey, setCustomApiKey] = useState('');
  const [hasCustomKey, setHasCustomKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [supportedModels, setSupportedModels] = useState([]);
  const [modelCategoryFilter, setModelCategoryFilter] = useState('all'); // 'all' | 'recommended' | 'advanced' | 'gemma' | 'custom'
  const [customModelInput, setCustomModelInput] = useState('');
  const [isCustomModelActive, setIsCustomModelActive] = useState(false);

  // Google Connection state
  const [googleConnected, setGoogleConnected] = useState(false);
  const [connectedCount, setConnectedCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [locations, setLocations] = useState([]);
  const [connectingGoogle, setConnectingGoogle] = useState(false);

  // Active section tab
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' | 'google'

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();

      if (data.success) {
        if (data.ai) {
          const current = data.ai.activeModel || 'gemini-flash-lite-latest';
          setActiveModel(current);
          setHasCustomKey(data.ai.hasCustomKey || false);
          setCustomApiKey(data.ai.maskedKey || '');
          const modelsList = data.ai.supportedModels || [];
          setSupportedModels(modelsList);
          
          const isStandard = modelsList.some((m) => m.id === current);
          if (!isStandard) {
            setIsCustomModelActive(true);
            setCustomModelInput(current);
          }
        }
        if (data.google) {
          setGoogleConnected(data.google.isConnected || false);
          setConnectedCount(data.google.connectedCount || 0);
          setLastSyncAt(data.google.lastSyncAt || null);
          setLocations(data.google.locations || []);
        }
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function testAiConnection() {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/settings/test-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: activeModel,
          apiKey: customApiKey,
        }),
      });

      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({
        success: false,
        error: 'Erro de conexão com o servidor ao testar a IA.',
      });
    } finally {
      setTesting(false);
    }
  }

  async function saveAiSettings() {
    setSaving(true);
    setSaveSuccessMsg(null);

    try {
      const isMasked = customApiKey.includes('••••');
      const body = {
        gemini_model: activeModel,
        ...(isMasked ? {} : { gemini_api_key: customApiKey }),
      };

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccessMsg('Configurações de IA salvas com sucesso!');
        setTimeout(() => setSaveSuccessMsg(null), 4000);
        loadSettings();
      } else {
        alert(data.error || 'Erro ao salvar configurações.');
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function restoreDefaultKey() {
    if (!confirm('Deseja remover sua chave de API personalizada e voltar a utilizar a chave padrão do sistema?')) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gemini_model: activeModel,
          removeApiKey: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCustomApiKey('');
        setHasCustomKey(false);
        setSaveSuccessMsg('Chave padrão do sistema restaurada com sucesso!');
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error('Error removing key:', err);
    } finally {
      setSaving(false);
    }
  }

  async function connectGoogle() {
    setConnectingGoogle(true);
    try {
      const res = await fetch('/api/auth/google');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Error connecting Google:', err);
      alert('Erro ao iniciar conexão com o Google.');
      setConnectingGoogle(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <RefreshCw size={36} className="animate-spin" style={{ color: '#3B82F6' }} />
        <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>Carregando configurações do sistema...</span>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Page Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Configurações do Sistema</h1>
          <p style={styles.subtitle}>
            Gerencie o modelo da Inteligência Artificial (Gemini), chaves de cota e a integração oficial com o Google Meu Negócio
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={styles.tabContainer}>
        <button
          type="button"
          id="tab-settings-ai"
          onClick={() => setActiveTab('ai')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'ai' ? styles.tabBtnActiveAi : {}),
          }}
        >
          <Sparkles size={18} />
          Inteligência Artificial (Gemini)
        </button>

        <button
          type="button"
          id="tab-settings-google"
          onClick={() => setActiveTab('google')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'google' ? styles.tabBtnActiveGoogle : {}),
          }}
        >
          <Globe size={18} />
          Conexão Google Meu Negócio
          {googleConnected ? (
            <span style={styles.badgeSuccessSmall}>Conectado</span>
          ) : (
            <span style={styles.badgeWarningSmall}>Pendente</span>
          )}
        </button>
      </div>

      {/* TAB 1: AI SETTINGS (GOOGLE GEMINI) */}
      {activeTab === 'ai' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Models Selector Card */}
          <div className="card" style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Cpu size={20} style={{ color: '#8B5CF6' }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h2 style={styles.cardTitle}>Modelos de Inteligência Artificial Disponíveis</h2>
                    <span style={styles.badgeModelCount}>{supportedModels.length} modelos</span>
                  </div>
                  <p style={styles.cardSubtitle}>
                    Selecione o modelo do Google Gemini ideal para sua operação. O sistema possui proteção ativa contra erro de cota (429).
                  </p>
                </div>
              </div>

              <div style={styles.activeModelPill}>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Ativo no Sistema:</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#A78BFA', fontFamily: 'monospace' }}>
                  {activeModel}
                </span>
              </div>
            </div>

            {/* Model Filter Pills */}
            <div style={styles.filterPillsContainer}>
              <button
                type="button"
                id="filter-all-models"
                onClick={() => setModelCategoryFilter('all')}
                style={{
                  ...styles.filterPillBtn,
                  ...(modelCategoryFilter === 'all' ? styles.filterPillBtnActive : {}),
                }}
              >
                Todos ({supportedModels.length})
              </button>
              <button
                type="button"
                id="filter-rec-models"
                onClick={() => setModelCategoryFilter('recommended')}
                style={{
                  ...styles.filterPillBtn,
                  ...(modelCategoryFilter === 'recommended' ? styles.filterPillBtnActive : {}),
                }}
              >
                ⚡ Rápidos / Cota Ativa ({supportedModels.filter((m) => m.category === 'recommended').length})
              </button>
              <button
                type="button"
                id="filter-adv-models"
                onClick={() => setModelCategoryFilter('advanced')}
                style={{
                  ...styles.filterPillBtn,
                  ...(modelCategoryFilter === 'advanced' ? styles.filterPillBtnActive : {}),
                }}
              >
                🧠 Avançados / Pro ({supportedModels.filter((m) => m.category === 'advanced').length})
              </button>
              <button
                type="button"
                id="filter-gemma-models"
                onClick={() => setModelCategoryFilter('gemma')}
                style={{
                  ...styles.filterPillBtn,
                  ...(modelCategoryFilter === 'gemma' ? styles.filterPillBtnActive : {}),
                }}
              >
                🌐 Gemma Open Source ({supportedModels.filter((m) => m.category === 'gemma').length})
              </button>
            </div>

            {/* Models Grid */}
            <div style={styles.modelsGrid}>
              {supportedModels
                .filter((m) => {
                  if (modelCategoryFilter === 'all') return true;
                  return m.category === modelCategoryFilter;
                })
                .map((m) => {
                  const isSelected = activeModel === m.id;
                  return (
                    <div
                      key={m.id}
                      id={`model-card-${m.id}`}
                      onClick={() => {
                        setActiveModel(m.id);
                        setIsCustomModelActive(false);
                      }}
                      style={{
                        ...styles.modelCard,
                        ...(isSelected ? styles.modelCardSelected : {}),
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '8px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={styles.modelName}>{m.name}</span>
                              <span style={styles.badgeModel}>{m.badge}</span>
                            </div>
                            <div>
                              {m.isHealthy ? (
                                <span style={styles.healthyBadge}>
                                  <span style={styles.healthyDot} /> Cota Ativa & Saudável
                                </span>
                              ) : (
                                <span style={styles.quotaLimitedBadge}>
                                  <span style={styles.quotaLimitedDot} /> Cota Limitada (Free Tier)
                                </span>
                              )}
                            </div>
                          </div>
                          <div
                            style={{
                              ...styles.radioCircle,
                              ...(isSelected ? styles.radioCircleSelected : {}),
                            }}
                          >
                            {isSelected && <div style={styles.radioInner} />}
                          </div>
                        </div>

                        <p style={styles.modelDesc}>{m.description}</p>
                      </div>

                      <div style={styles.modelSpecs}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={styles.specItem}>⚡ Velocidade: <strong>{m.speed}</strong></span>
                          <span style={styles.specItem}>📊 Cota: <strong>{m.quota}</strong></span>
                        </div>
                        <div style={{ marginTop: '4px', fontSize: '0.7rem', color: '#64748B', fontFamily: 'monospace' }}>
                          ID da API: {m.id}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Custom Model Input Row */}
            <div style={styles.customModelBox}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Sliders size={16} style={{ color: '#8B5CF6' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#F8FAFC' }}>
                  Precisa utilizar outro modelo ou versão específica do Google Gemini?
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input
                  id="input-custom-model-id"
                  type="text"
                  placeholder="ex: gemini-3.5-flash-lite ou gemini-1.5-pro"
                  value={customModelInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomModelInput(val);
                    if (val.trim()) {
                      setActiveModel(val.trim());
                      setIsCustomModelActive(true);
                    }
                  }}
                  className="input"
                  style={{ flex: 1, minWidth: '240px', fontFamily: 'monospace' }}
                />
                <button
                  type="button"
                  id="btn-apply-custom-model"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    if (customModelInput.trim()) {
                      setActiveModel(customModelInput.trim());
                      setIsCustomModelActive(true);
                    }
                  }}
                  style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Check size={14} /> Aplicar Modelo Customizado
                </button>
              </div>
            </div>

            {/* Fallback Protection Banner */}
            <div style={styles.fallbackNoticeBox}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <ShieldCheck size={18} style={{ color: '#10B981', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.8125rem', color: '#94A3B8', lineHeight: '1.5' }}>
                  <strong style={{ color: '#F1F5F9' }}>Proteção Anti-Queda de Cota Ativa:</strong> Caso o modelo selecionado (ex: <code>gemini-3.7-flash</code> ou <code>gemini-flash-latest</code>) atinja o limite de requisições do Google (erro 429), o sistema faz fallback silencioso e automático para os modelos rápidos com cota ativa (<code>gemini-flash-lite-latest</code>, <code>gemini-3.5-flash-lite</code>, <code>gemini-3.6-flash</code>), sem travar suas postagens, auditorias ou serviços!
                </div>
              </div>
            </div>
          </div>

          {/* API Key Card */}
          <div className="card" style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Key size={20} style={{ color: '#3B82F6' }} />
                <div>
                  <h2 style={styles.cardTitle}>Chave de API do Google Gemini (Opcional / Cota Própria)</h2>
                  <p style={styles.cardSubtitle}>
                    Use uma chave gratuita do Google AI Studio para ter cota exclusiva e evitar erros de limite excedido
                  </p>
                </div>
              </div>

              {hasCustomKey && (
                <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={14} /> Chave Própria Ativa
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={styles.label}>
                  Chave de API (Google AI Studio API Key):
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="input-gemini-key"
                    type={showKey ? 'text' : 'password'}
                    className="input"
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    placeholder={hasCustomKey ? 'Chave personalizada configurada' : 'Cole sua chave AIzaSy... ou deixe em branco para chave padrão'}
                    style={{ width: '100%', paddingRight: '120px', fontFamily: 'monospace' }}
                  />
                  <div style={{ position: 'absolute', right: '10px', display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="btn btn-ghost btn-sm"
                      title={showKey ? 'Ocultar chave' : 'Exibir chave'}
                      style={{ padding: '4px 8px' }}
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    {hasCustomKey && (
                      <button
                        type="button"
                        onClick={restoreDefaultKey}
                        className="btn btn-ghost btn-sm"
                        title="Restaurar padrão do sistema"
                        style={{ color: '#EF4444', fontSize: '0.75rem', padding: '4px 8px' }}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div style={styles.keyHintContainer}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <HelpCircle size={16} style={{ color: '#60A5FA', flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '0.8125rem', color: '#9CA3AF', lineHeight: '1.5' }}>
                    <strong>Como obter sua chave gratuita:</strong> Acesse o portal oficial do Google AI Studio em{' '}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#60A5FA', textDecoration: 'underline', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      Google AI Studio <ExternalLink size={12} />
                    </a>
                    , faça login com sua conta Google, clique em <em>Create API Key</em> e cole aqui. O plano gratuito oferece requisições sem custo mensal.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action and Test Card */}
          <div
            className="card"
            style={{
              ...styles.card,
              backgroundColor: 'rgba(17, 24, 39, 0.6)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  id="btn-save-ai-settings"
                  type="button"
                  onClick={saveAiSettings}
                  disabled={saving}
                  className="btn btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    boxShadow: '0 0 18px rgba(59, 130, 246, 0.35)',
                  }}
                >
                  <Save size={16} />
                  {saving ? 'Salvando...' : 'Salvar Configurações de IA'}
                </button>

                <button
                  id="btn-test-ai-connection"
                  type="button"
                  onClick={testAiConnection}
                  disabled={testing}
                  className="btn btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                  }}
                >
                  <RefreshCw size={16} className={testing ? 'animate-spin' : ''} />
                  {testing ? 'Testando Modelo...' : 'Testar Conexão com a IA'}
                </button>
              </div>

              {saveSuccessMsg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981', fontWeight: 600, fontSize: '0.875rem' }}>
                  <CheckCircle2 size={18} />
                  {saveSuccessMsg}
                </div>
              )}
            </div>

            {/* Test Connection Results Box */}
            {testResult && (
              <div
                id="test-result-box"
                style={{
                  marginTop: '20px',
                  padding: '16px',
                  borderRadius: '10px',
                  backgroundColor: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${testResult.success ? '#10B981' : '#EF4444'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  {testResult.success ? (
                    <CheckCircle2 size={20} style={{ color: '#10B981' }} />
                  ) : (
                    <AlertTriangle size={20} style={{ color: '#EF4444' }} />
                  )}
                  <strong style={{ color: testResult.success ? '#10B981' : '#EF4444', fontSize: '0.9375rem' }}>
                    {testResult.success ? 'Conexão Realizada com Sucesso!' : 'Falha na Validação da IA'}
                  </strong>
                </div>

                {testResult.success ? (
                  <div style={{ fontSize: '0.875rem', color: '#E2E8F0', marginTop: '6px', lineHeight: '1.6' }}>
                    O modelo <strong>{testResult.model}</strong> respondeu normalmente com latência de <strong>{testResult.latencyMs}ms</strong>. A cota está saudável e pronta para uso em postagens, auditorias de SEO e serviços.
                  </div>
                ) : (
                  <div style={{ fontSize: '0.875rem', color: '#FCA5A5', marginTop: '6px', lineHeight: '1.6' }}>
                    {testResult.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GOOGLE MEU NEGÓCIO INTEGRATION */}
      {activeTab === 'google' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Status Banner */}
          <div
            className="card"
            style={{
              ...styles.card,
              border: `1px solid ${googleConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    backgroundColor: googleConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: googleConnected ? '#10B981' : '#F59E0B',
                  }}
                >
                  <Globe size={26} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={styles.cardTitle}>Status da Integração com o Google</h2>
                    {googleConnected ? (
                      <span className="badge badge-green">Conectado Oficialmente</span>
                    ) : (
                      <span className="badge badge-yellow">Desconectado</span>
                    )}
                  </div>
                  <p style={styles.cardSubtitle}>
                    {googleConnected
                      ? `Conta Google autenticada via OAuth2 com ${connectedCount} ${connectedCount === 1 ? 'ficha sincronizada' : 'fichas sincronizadas'}.`
                      : 'Conecte sua conta Google para gerenciar postagens, avaliações e serviços diretamente no Google Maps.'}
                  </p>
                </div>
              </div>

              <button
                id="btn-connect-google"
                type="button"
                onClick={connectGoogle}
                disabled={connectingGoogle}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  background: googleConnected
                    ? 'linear-gradient(135deg, #2563EB, #1D4ED8)'
                    : 'linear-gradient(135deg, #10B981, #059669)',
                  boxShadow: googleConnected
                    ? '0 0 16px rgba(37, 99, 235, 0.3)'
                    : '0 0 16px rgba(16, 185, 129, 0.3)',
                }}
              >
                <Globe size={18} />
                {connectingGoogle
                  ? 'Redirecionando ao Google...'
                  : googleConnected
                  ? 'Reconectar / Adicionar Outra Conta Google'
                  : 'Conectar com o Google Meu Negócio'}
              </button>
            </div>

            {googleConnected && lastSyncAt && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: '#9CA3AF' }}>
                <Clock size={15} style={{ color: '#60A5FA' }} />
                Última sincronização registrada com o Google:{' '}
                <strong style={{ color: '#F8FAFC' }}>{new Date(lastSyncAt).toLocaleString('pt-BR')}</strong>
              </div>
            )}
          </div>

          {/* Connected Profiles List */}
          <div className="card" style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building2 size={20} style={{ color: '#3B82F6' }} />
                <div>
                  <h3 style={styles.cardTitle}>Fichas do Google Meu Negócio Conectadas</h3>
                  <p style={styles.cardSubtitle}>
                    Locais que possuem credenciais ativas para publicação e edição no Google
                  </p>
                </div>
              </div>
            </div>

            {locations.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: '#9CA3AF' }}>
                <Building2 size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#E2E8F0' }}>Nenhuma ficha sincronizada</p>
                <p style={{ fontSize: '0.8125rem', marginTop: '4px' }}>
                  Clique no botão &quot;Conectar com o Google Meu Negócio&quot; acima para importar os locais da sua conta.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {locations.map((loc) => (
                  <div
                    key={loc.id}
                    style={{
                      padding: '14px 18px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#F8FAFC' }}>
                          {loc.name}
                        </span>
                        <span className="badge badge-blue" style={{ fontSize: '0.6875rem' }}>
                          ID: {loc.locationId || 'Principal'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '4px' }}>
                        Sincronizado: {loc.lastSync ? new Date(loc.lastSync).toLocaleDateString('pt-BR') : 'Ativo'}
                      </div>
                    </div>

                    <Link
                      href={`/dashboard/clients/${loc.id}`}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      Acessar Ficha <ArrowRight size={14} />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    animation: 'fadeIn 0.25s ease-out',
    maxWidth: '1200px',
    margin: '0 auto',
    paddingBottom: '60px',
  },
  header: {
    marginBottom: '28px',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 800,
    letterSpacing: '-0.025em',
    color: '#F8FAFC',
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: '0.9375rem',
    marginTop: '6px',
  },
  tabContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: '5px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    width: 'fit-content',
    flexWrap: 'wrap',
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    borderRadius: '9px',
    fontSize: '0.875rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: 'transparent',
    color: '#9CA3AF',
    border: '1px solid transparent',
  },
  tabBtnActiveAi: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    color: '#A78BFA',
    border: '1px solid #8B5CF6',
    boxShadow: '0 0 14px rgba(139, 92, 246, 0.25)',
  },
  tabBtnActiveGoogle: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#60A5FA',
    border: '1px solid #3B82F6',
    boxShadow: '0 0 14px rgba(59, 130, 246, 0.25)',
  },
  badgeSuccessSmall: {
    fontSize: '0.6875rem',
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    color: '#10B981',
    fontWeight: 700,
  },
  badgeWarningSmall: {
    fontSize: '0.6875rem',
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    color: '#F59E0B',
    fontWeight: 700,
  },
  card: {
    padding: '24px',
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  cardTitle: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#F8FAFC',
    margin: 0,
  },
  cardSubtitle: {
    fontSize: '0.8125rem',
    color: '#9CA3AF',
    marginTop: '3px',
    margin: 0,
  },
  modelsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '14px',
  },
  modelCard: {
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  modelCardSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    border: '1px solid #8B5CF6',
    boxShadow: '0 0 16px rgba(139, 92, 246, 0.2)',
  },
  modelName: {
    fontWeight: 700,
    fontSize: '0.9375rem',
    color: '#F8FAFC',
  },
  badgeModel: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '6px',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    color: '#C4B5FD',
  },
  radioCircle: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    border: '2px solid #4B5563',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioCircleSelected: {
    border: '2px solid #8B5CF6',
  },
  radioInner: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#8B5CF6',
  },
  modelDesc: {
    fontSize: '0.8125rem',
    color: '#9CA3AF',
    lineHeight: '1.5',
    margin: '8px 0 12px',
  },
  modelSpecs: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '10px',
  },
  specItem: {
    fontSize: '0.75rem',
    color: '#CBD5E1',
  },
  label: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#9CA3AF',
    display: 'block',
    marginBottom: '8px',
  },
  badgeModelCount: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '12px',
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
    color: '#C4B5FD',
    border: '1px solid rgba(139, 92, 246, 0.3)',
  },
  activeModelPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
    borderRadius: '20px',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    border: '1px solid rgba(139, 92, 246, 0.25)',
  },
  filterPillsContainer: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '16px',
  },
  filterPillBtn: {
    padding: '7px 14px',
    borderRadius: '20px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#94A3B8',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  filterPillBtnActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    border: '1px solid #8B5CF6',
    color: '#F8FAFC',
    boxShadow: '0 0 12px rgba(139, 92, 246, 0.2)',
  },
  healthyBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: '2px 8px',
    borderRadius: '10px',
    border: '1px solid rgba(16, 185, 129, 0.25)',
  },
  healthyDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#10B981',
    boxShadow: '0 0 6px #10B981',
  },
  quotaLimitedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: '2px 8px',
    borderRadius: '10px',
    border: '1px solid rgba(245, 158, 11, 0.25)',
  },
  quotaLimitedDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#F59E0B',
  },
  customModelBox: {
    marginTop: '20px',
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px dashed rgba(139, 92, 246, 0.35)',
  },
  fallbackNoticeBox: {
    marginTop: '16px',
    padding: '14px 16px',
    borderRadius: '10px',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
  },
  keyHintContainer: {
    padding: '12px 16px',
    borderRadius: '8px',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
  },
};
