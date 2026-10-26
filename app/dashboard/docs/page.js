'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen, Layers, Sparkles, Terminal, Database, CheckCircle2,
  AlertTriangle, Copy, Check, Search, ExternalLink, Cpu, RefreshCw,
  Zap, ArrowRight, ShieldCheck, FileText, Star, Clock, Globe,
  Building2, Hash, Tag, Server, CheckSquare, Info, ChevronDown, ChevronRight
} from 'lucide-react';
import {
  PROJECT_METADATA,
  ARCHITECTURE_COMPONENTS,
  AI_PROMPT_RULES,
  API_CATALOG,
  DATABASE_SCHEMA,
  OPERATIONAL_CHECKLIST,
  LIVING_CHANGELOG,
} from '@/lib/docs/project-docs';

export default function InteractiveDocsPage() {
  const [activeTab, setActiveTab] = useState('architecture');
  const [searchQuery, setSearchQuery] = useState('');
  const [liveData, setLiveData] = useState(null);
  const [loadingLive, setLoadingLive] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  // Interactive Character Playground State
  const [playgroundType, setPlaygroundType] = useState('post'); // 'post' | 'service' | 'profile' | 'review'
  const [playgroundText, setPlaygroundText] = useState('');

  // API Filter
  const [apiModuleFilter, setApiModuleFilter] = useState('ALL');
  const [expandedEndpoints, setExpandedEndpoints] = useState({ '/api/posts/generate': true, '/api/clients/[id]/services/generate-ai': true });

  // Database active table
  const [activeDbTable, setActiveDbTable] = useState('clients');

  // Checklist interactive state
  const [checkedSteps, setCheckedSteps] = useState({});

  useEffect(() => {
    fetchLiveDocs();
  }, []);

  async function fetchLiveDocs() {
    setLoadingLive(true);
    try {
      const res = await fetch('/api/docs');
      const data = await res.json();
      if (data.success) {
        setLiveData(data);
      }
    } catch (err) {
      console.warn('Erro ao carregar dados vivos da documentação:', err);
    } finally {
      setLoadingLive(false);
    }
  }

  function handleCopy(id, text) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function toggleEndpoint(ep) {
    setExpandedEndpoints((prev) => ({ ...prev, [ep]: !prev[ep] }));
  }

  function toggleChecklistStep(idx) {
    setCheckedSteps((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }

  // Simulator limits configuration
  const playgroundLimits = {
    post: {
      name: 'Postagem no Google Meu Negócio',
      min: 700,
      target: 1300,
      max: 1500,
      hardMax: 1500,
      desc: 'Ideal entre 700 e 1.300 caracteres. Máximo aceito pelo Google: 1.500.',
      example: 'Você sente incômodo ao caminhar ou ver seus calcanhares ásperos em Brasília? Muitas pessoas usam lixas grossas ativando o efeito rebote... Na Lincoln Podologia, localizada para atender moradores do Sudoeste e Asa Sul, realizamos o desbastamento laminar e hidratação oclusiva para renovar sua pisada com segurança e conforto imediato. Agende seu horário pelo WhatsApp!',
    },
    service: {
      name: 'Item de Serviço no Catálogo GBP',
      min: 200,
      target: 280,
      max: 300,
      hardMax: 300,
      desc: 'Máximo RIGOROSO de 300 caracteres da API do Google (rejeita se ultrapassar). Ideal: 220-280.',
      example: 'Livre-se da dor da unha encravada com espiculotomia precisa e assepsia rigorosa em Brasília. Atendimento especializado no Sudoeste focado no seu alívio imediato e conforto. Agende sua avaliação!',
    },
    profile: {
      name: 'Descrição do Perfil da Empresa',
      min: 450,
      target: 740,
      max: 750,
      hardMax: 750,
      desc: 'Máximo de 750 caracteres no Google Maps. Proibido colocar URLs ou números de telefone no texto.',
      example: 'A Lincoln Podologia & Saúde dos Pés é referência em podologia clínica no Sudoeste e Asa Sul em Brasília. Com mais de 10 anos de experiência, somos especializados no tratamento de unhas encravadas, calosidades, correção com órteses e cuidados especiais para pés diabéticos. Oferecemos biossegurança rigorosa com instrumentais esterilizados em autoclave e protocolos personalizados. Venha renovar a saúde dos seus pés e agende sua avaliação!',
    },
    review: {
      name: 'Resposta a Avaliação (Review)',
      min: 50,
      target: 180,
      max: 400,
      hardMax: 1000,
      desc: 'Ideal de 50 a 200 caracteres. Tom acolhedor e personalizado com o nome do cliente.',
      example: 'Muito obrigado pela confiança, Maria! É uma imensa alegria saber que seus pés estão sem dor e bem cuidados. Estaremos sempre de portas abertas para você aqui no Sudoeste!',
    },
  };

  const currentLimit = playgroundLimits[playgroundType];
  const charCount = playgroundText.length;

  const complianceStatus = useMemo(() => {
    if (!playgroundText) return { text: 'Aguardando texto...', color: '#9CA3AF', badge: 'Vazio' };
    if (charCount > currentLimit.hardMax) {
      return {
        text: `REJEITADO PELO GOOGLE: Ultrapassou o limite máximo de ${currentLimit.hardMax} caracteres (${charCount - currentLimit.hardMax} a mais)!`,
        color: '#EF4444',
        badge: 'Excesso / Inválido ❌',
      };
    }
    if (charCount > currentLimit.max) {
      return {
        text: `Atenção: Próximo ao limite máximo (${charCount}/${currentLimit.max}). Risco de corte.`,
        color: '#F59E0B',
        badge: 'Alerta ⚠️',
      };
    }
    if (charCount < currentLimit.min) {
      return {
        text: `Texto curto ou superficial (${charCount} chars). O Google favorece conteúdos aprofundados acima de ${currentLimit.min} chars.`,
        color: '#F59E0B',
        badge: 'Superficial ⚠️',
      };
    }
    return {
      text: `Excelente! Texto perfeitamente calibrado (${charCount} chars) com alta densidade de SEO e dentro das diretrizes do Google.`,
      color: '#10B981',
      badge: '100% Válido & Otimizado ✅',
    };
  }, [playgroundText, charCount, currentLimit]);

  // Filtered APIs
  const filteredApis = useMemo(() => {
    return API_CATALOG.filter((api) => {
      const matchesModule = apiModuleFilter === 'ALL' || api.module === apiModuleFilter;
      const matchesSearch = !searchQuery ||
        api.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
        api.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        api.module.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesModule && matchesSearch;
    });
  }, [apiModuleFilter, searchQuery]);

  return (
    <div style={styles.container}>
      {/* HEADER WITH LIVE METADATA */}
      <div style={styles.headerCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={styles.headerIconBox}>
                <BookOpen size={24} color="#3B82F6" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h1 style={styles.headerTitle}>{PROJECT_METADATA.name}</h1>
                  <span style={styles.versionBadge}>v{PROJECT_METADATA.version}</span>
                  <span style={styles.livePulseBadge}>
                    <span style={styles.pulseDot} />
                    Documentação Viva
                  </span>
                </div>
                <p style={styles.headerSubtitle}>{PROJECT_METADATA.tagline}</p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={fetchLiveDocs}
              disabled={loadingLive}
              style={styles.refreshBtn}
              title="Atualizar dados do sistema em tempo real"
            >
              <RefreshCw size={14} className={loadingLive ? 'animate-spin' : ''} />
              {loadingLive ? 'Sincronizando...' : 'Atualizar Status'}
            </button>
            <Link href="/dashboard" style={styles.backBtn}>
              Ir ao Painel <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* LIVE METRICS CARDS */}
        <div style={styles.metricsGrid}>
          <div style={styles.metricItem}>
            <span style={styles.metricLabel}>Modelo Ativo de IA</span>
            <span style={styles.metricValue}>
              <Cpu size={14} color="#A78BFA" />
              {liveData?.liveStats?.activeAiModel || 'gemini-flash-lite-latest'}
            </span>
          </div>
          <div style={styles.metricItem}>
            <span style={styles.metricLabel}>Clientes Conectados</span>
            <span style={styles.metricValue}>
              <Building2 size={14} color="#60A5FA" />
              {liveData?.liveStats?.totalClients ?? '...'} fichas
            </span>
          </div>
          <div style={styles.metricItem}>
            <span style={styles.metricLabel}>Posts Gerados/Agendados</span>
            <span style={styles.metricValue}>
              <FileText size={14} color="#34D399" />
              {liveData?.liveStats?.totalPosts ?? '...'} posts
            </span>
          </div>
          <div style={styles.metricItem}>
            <span style={styles.metricLabel}>Avaliações Registradas</span>
            <span style={styles.metricValue}>
              <Star size={14} color="#FBBF24" />
              {liveData?.liveStats?.totalReviews ?? '...'} reviews
            </span>
          </div>
          <div style={styles.metricItem}>
            <span style={styles.metricLabel}>Framework & Engine</span>
            <span style={styles.metricValue}>
              <Zap size={14} color="#F472B6" />
              Next.js 16 (Turbopack)
            </span>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div style={styles.tabsContainer}>
        {[
          { id: 'architecture', label: 'Arquitetura & Fluxo', icon: Layers },
          { id: 'ai-rules', label: 'Regras de IA & Validador', icon: Sparkles },
          { id: 'api-catalog', label: 'Catálogo de APIs', icon: Terminal },
          { id: 'database', label: 'Dicionário de Dados', icon: Database },
          { id: 'checklist', label: 'Checklist Operacional', icon: CheckSquare },
          { id: 'changelog', label: 'Changelog Vivo', icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tabBtn,
                ...(isActive ? styles.tabBtnActive : {}),
              }}
            >
              <Icon size={16} color={isActive ? '#3B82F6' : '#9CA3AF'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: ARQUITETURA & FLUXO DO SISTEMA */}
      {activeTab === 'architecture' && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Arquitetura e Fluxo do GBP Manager</h2>
              <p style={styles.sectionSubtitle}>
                Visão detalhada de como os componentes de front-end, banco de dados, motor de IA e APIs oficiais do Google se comunicam.
              </p>
            </div>
          </div>

          <div style={styles.archGrid}>
            {ARCHITECTURE_COMPONENTS.map((comp) => (
              <div key={comp.id} style={styles.archCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={styles.archCardTitle}>{comp.title}</h3>
                  <span style={styles.archBadge}>{comp.badge}</span>
                </div>
                <p style={styles.archCardDesc}>{comp.description}</p>
                <div style={styles.featuresList}>
                  {comp.features.map((feat, i) => (
                    <div key={i} style={styles.featureItem}>
                      <CheckCircle2 size={14} color="#10B981" style={{ flexShrink: 0, marginTop: '3px' }} />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* VISUAL PIPELINE FLOW */}
          <div style={styles.pipelineBox}>
            <h3 style={styles.pipelineTitle}>Fluxo de Vida de uma Ação (Ex: Geração de Post ou Serviço)</h3>
            <div style={styles.flowSteps}>
              <div style={styles.flowStep}>
                <div style={styles.flowStepNumber}>1</div>
                <div style={styles.flowStepContent}>
                  <strong>Interface / Requisição</strong>
                  <p>Usuário aciona "Escrever com IA" na UI ou o Cron agendado dispara.</p>
                </div>
              </div>
              <div style={styles.flowArrow}><ArrowRight size={18} /></div>
              <div style={styles.flowStep}>
                <div style={styles.flowStepNumber}>2</div>
                <div style={styles.flowStepContent}>
                  <strong>Backend & Contexto</strong>
                  <p>Next.js busca ficha no Supabase: cidade, bairros, categoria e auditoria SEO.</p>
                </div>
              </div>
              <div style={styles.flowArrow}><ArrowRight size={18} /></div>
              <div style={styles.flowStep}>
                <div style={styles.flowStepNumber}>3</div>
                <div style={styles.flowStepContent}>
                  <strong>Motor Gemini AI</strong>
                  <p>Aplica regras estritas (300 chars para serviços, 700-1300 para posts com 3 termos técnicos).</p>
                </div>
              </div>
              <div style={styles.flowArrow}><ArrowRight size={18} /></div>
              <div style={styles.flowStep}>
                <div style={styles.flowStepNumber}>4</div>
                <div style={styles.flowStepContent}>
                  <strong>Validação & Google API</strong>
                  <p>Trava de segurança corta excessos; patch enviado com refresh token seguro ao Google GBP.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REGRAS DE IA & VALIDADOR INTERATIVO */}
      {activeTab === 'ai-rules' && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Regras de Copywriting, SEO Semântico e Limites de Caracteres</h2>
              <p style={styles.sectionSubtitle}>
                Especificações detalhadas para cada tipo de conteúdo gerado pela IA no ecossistema do Google Meu Negócio.
              </p>
            </div>
          </div>

          {/* INTERACTIVE PLAYGROUND / CHARACTER VALIDATOR */}
          <div style={styles.playgroundContainer}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#A78BFA" />
                <strong style={{ fontSize: '1rem', color: '#F9FAFB' }}>Validador Interativo de Conformidade Google</strong>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { id: 'post', label: 'Postagem (1.500 máx)' },
                  { id: 'service', label: 'Serviço (300 máx)' },
                  { id: 'profile', label: 'Perfil (750 máx)' },
                  { id: 'review', label: 'Review (200 ideal)' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setPlaygroundType(t.id);
                      setPlaygroundText(playgroundLimits[t.id].example);
                    }}
                    style={{
                      ...styles.typeBtn,
                      ...(playgroundType === t.id ? styles.typeBtnActive : {}),
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <p style={{ fontSize: '0.8125rem', color: '#9CA3AF', marginBottom: '12px' }}>
              {currentLimit.desc}
            </p>

            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <textarea
                value={playgroundText}
                onChange={(e) => setPlaygroundText(e.target.value)}
                placeholder="Digite ou cole um texto aqui para verificar a conformidade em tempo real com as regras do Google..."
                rows={5}
                style={styles.playgroundTextarea}
              />
              <button
                onClick={() => setPlaygroundText(currentLimit.example)}
                style={styles.loadExampleBtn}
                title="Carregar exemplo pré-aprovado"
              >
                Carregar Exemplo Válido
              </button>
            </div>

            {/* PROGRESS BAR & FEEDBACK */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: complianceStatus.color }}>
                {complianceStatus.badge} — {complianceStatus.text}
              </span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: charCount > currentLimit.hardMax ? '#EF4444' : '#F9FAFB' }}>
                {charCount} / {currentLimit.hardMax} caracteres
              </span>
            </div>

            <div style={styles.progressBarTrack}>
              <div
                style={{
                  ...styles.progressBarFill,
                  width: `${Math.min(100, (charCount / currentLimit.hardMax) * 100)}%`,
                  backgroundColor: charCount > currentLimit.hardMax ? '#EF4444' : charCount > currentLimit.max ? '#F59E0B' : '#10B981',
                }}
              />
            </div>
          </div>

          {/* RULES CARDS */}
          <div style={styles.rulesGrid}>
            {AI_PROMPT_RULES.map((rule, idx) => (
              <div key={idx} style={styles.ruleCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={styles.ruleCategory}>{rule.category}</h3>
                    <span style={styles.ruleApiField}>Campo Google: <code>{rule.apiField}</code></span>
                  </div>
                  <span style={styles.rulePriorityBadge}>{rule.priority}</span>
                </div>

                <div style={styles.limitStatsRow}>
                  <div style={styles.limitStat}>
                    <span>Alvo Ideal:</span>
                    <strong>{rule.targetLength}</strong>
                  </div>
                  <div style={styles.limitStat}>
                    <span>Limite da API:</span>
                    <strong style={{ color: '#F87171' }}>{rule.maxLength}</strong>
                  </div>
                </div>

                <ul style={styles.ruleList}>
                  {rule.rules.map((r, ri) => (
                    <li key={ri} style={styles.ruleListItem}>
                      <span style={{ color: '#3B82F6', marginRight: '6px' }}>•</span>
                      {r}
                    </li>
                  ))}
                </ul>

                <div style={styles.ruleExampleBox}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#C4B5FD' }}>Exemplo em Produção:</span>
                    <button
                      onClick={() => handleCopy(`rule_${idx}`, rule.example)}
                      style={styles.miniCopyBtn}
                    >
                      {copiedId === `rule_${idx}` ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                      {copiedId === `rule_${idx}` ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  <p style={styles.ruleExampleText}>"{rule.example}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CATÁLOGO DE APIS */}
      {activeTab === 'api-catalog' && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Catálogo de APIs & Endpoints</h2>
              <p style={styles.sectionSubtitle}>
                Todas as rotas HTTP implementadas no GBP Manager com documentação de parâmetros, respostas e exemplos de requisição.
              </p>
            </div>
          </div>

          {/* FILTER AND SEARCH */}
          <div style={styles.apiFilterRow}>
            <div style={styles.searchBox}>
              <Search size={16} color="#9CA3AF" />
              <input
                type="text"
                placeholder="Buscar por endpoint, descrição ou módulo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['ALL', 'Posts', 'Serviços', 'SEO Local', 'Concorrentes', 'Avaliações', 'Configurações', 'Documentação', 'Automação'].map((mod) => (
                <button
                  key={mod}
                  onClick={() => setApiModuleFilter(mod)}
                  style={{
                    ...styles.modFilterBtn,
                    ...(apiModuleFilter === mod ? styles.modFilterBtnActive : {}),
                  }}
                >
                  {mod === 'ALL' ? 'Todos os Módulos' : mod}
                </button>
              ))}
            </div>
          </div>

          {/* API LIST */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredApis.map((api, idx) => {
              const isExpanded = Boolean(expandedEndpoints[api.endpoint]);
              const isPost = api.method.includes('POST');
              const isGet = api.method.includes('GET');

              return (
                <div key={idx} style={styles.apiCard}>
                  <div
                    onClick={() => toggleEndpoint(api.endpoint)}
                    style={styles.apiCardHeader}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span
                        style={{
                          ...styles.methodBadge,
                          backgroundColor: isPost ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: isPost ? '#60A5FA' : '#34D399',
                          border: isPost ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                        }}
                      >
                        {api.method}
                      </span>
                      <code style={styles.endpointPath}>{api.endpoint}</code>
                      <span style={styles.moduleTag}>{api.module}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {api.authRequired && (
                        <span style={styles.authBadge} title="Requer autenticação JWT do Supabase">
                          <ShieldCheck size={12} /> Auth Obrigatória
                        </span>
                      )}
                      {isExpanded ? <ChevronDown size={18} color="#9CA3AF" /> : <ChevronRight size={18} color="#9CA3AF" />}
                    </div>
                  </div>

                  <p style={{ padding: '0 20px 14px 20px', margin: 0, fontSize: '0.875rem', color: '#9CA3AF' }}>
                    {api.description}
                  </p>

                  {isExpanded && (
                    <div style={styles.apiCardBody}>
                      {api.requestBody && (
                        <div style={{ marginBottom: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <strong style={{ fontSize: '0.8125rem', color: '#E5E7EB' }}>Parâmetros da Requisição (Body JSON):</strong>
                            <button
                              onClick={() => handleCopy(`req_${api.endpoint}`, JSON.stringify(api.requestBody, null, 2))}
                              style={styles.miniCopyBtn}
                            >
                              {copiedId === `req_${api.endpoint}` ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                              Copiar Payload
                            </button>
                          </div>
                          <pre style={styles.codeBlock}>
                            {JSON.stringify(api.requestBody, null, 2)}
                          </pre>
                        </div>
                      )}

                      {api.responseExample && (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <strong style={{ fontSize: '0.8125rem', color: '#E5E7EB' }}>Exemplo de Resposta (Status 200 OK):</strong>
                            <button
                              onClick={() => handleCopy(`res_${api.endpoint}`, JSON.stringify(api.responseExample, null, 2))}
                              style={styles.miniCopyBtn}
                            >
                              {copiedId === `res_${api.endpoint}` ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                              Copiar Resposta
                            </button>
                          </div>
                          <pre style={styles.codeBlock}>
                            {JSON.stringify(api.responseExample, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: DICIONÁRIO DE DADOS */}
      {activeTab === 'database' && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Dicionário de Dados do Supabase</h2>
              <p style={styles.sectionSubtitle}>
                Esquema das tabelas relacionais do PostgreSQL com colunas, tipos de dados e propósitos operacionais.
              </p>
            </div>
          </div>

          {/* TABLE SELECTOR */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {DATABASE_SCHEMA.map((tbl) => (
              <button
                key={tbl.table}
                onClick={() => setActiveDbTable(tbl.table)}
                style={{
                  ...styles.dbTableBtn,
                  ...(activeDbTable === tbl.table ? styles.dbTableBtnActive : {}),
                }}
              >
                <Database size={14} />
                public.{tbl.table}
              </button>
            ))}
          </div>

          {/* TABLE DETAILS */}
          {(() => {
            const table = DATABASE_SCHEMA.find((t) => t.table === activeDbTable) || DATABASE_SCHEMA[0];
            return (
              <div style={styles.tableCard}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <h3 style={{ margin: 0, fontSize: '1.125rem', color: '#F9FAFB' }}>Tabela: <code>public.{table.table}</code></h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8125rem', color: '#9CA3AF' }}>{table.description}</p>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.dbTable}>
                    <thead>
                      <tr>
                        <th style={styles.dbTh}>Coluna</th>
                        <th style={styles.dbTh}>Tipo de Dado</th>
                        <th style={styles.dbTh}>Descrição & Propósito</th>
                      </tr>
                    </thead>
                    <tbody>
                      {table.columns.map((col, ci) => (
                        <tr key={ci} style={styles.dbTr}>
                          <td style={styles.dbTdName}>
                            <code>{col.name}</code>
                          </td>
                          <td style={styles.dbTdType}>
                            <span style={styles.typeTag}>{col.type}</span>
                          </td>
                          <td style={styles.dbTdDesc}>{col.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 5: CHECKLIST OPERACIONAL */}
      {activeTab === 'checklist' && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Checklist Operacional & Onboarding</h2>
              <p style={styles.sectionSubtitle}>
                Roteiro sequencial para configurar um novo cliente e colocá-lo no topo do Google Maps com o GBP Manager.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {OPERATIONAL_CHECKLIST.map((item, idx) => {
              const isDone = Boolean(checkedSteps[idx]);
              return (
                <div
                  key={idx}
                  onClick={() => toggleChecklistStep(idx)}
                  style={{
                    ...styles.checkCard,
                    ...(isDone ? styles.checkCardDone : {}),
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        ...styles.checkboxBox,
                        backgroundColor: isDone ? '#10B981' : 'transparent',
                        border: isDone ? '1px solid #10B981' : '1px solid rgba(255, 255, 255, 0.2)',
                      }}
                    >
                      {isDone && <Check size={14} color="#fff" strokeWidth={3} />}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={styles.stepNumBadge}>Passo {item.step}</span>
                        <strong style={{ fontSize: '0.9375rem', color: isDone ? '#9CA3AF' : '#F9FAFB', textDecoration: isDone ? 'line-through' : 'none' }}>
                          {item.title}
                        </strong>
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.8125rem', color: isDone ? '#6B7280' : '#9CA3AF' }}>
                        {item.action}
                      </p>
                    </div>
                  </div>

                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: item.status === 'Essencial' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                      color: item.status === 'Essencial' ? '#F87171' : '#60A5FA',
                    }}
                  >
                    {item.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 6: CHANGELOG VIVO */}
      {activeTab === 'changelog' && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Changelog Vivo da Plataforma</h2>
              <p style={styles.sectionSubtitle}>
                Histórico contínuo de atualizações, novas features de IA e otimizações de conformidade com o Google.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {LIVING_CHANGELOG.map((log, idx) => (
              <div key={idx} style={styles.changelogCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={styles.versionTag}>v{log.version}</span>
                    <strong style={{ fontSize: '1rem', color: '#F9FAFB' }}>{log.title}</strong>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{log.date}</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#9CA3AF', fontSize: '0.875rem', lineHeight: 1.6 }}>
                  {log.changes.map((ch, ci) => (
                    <li key={ci}>{ch}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1280px',
    margin: '0 auto',
  },
  headerCard: {
    backgroundColor: '#111827',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '20px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
  },
  headerIconBox: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    border: '1px solid rgba(59, 130, 246, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: '1.5rem',
    fontWeight: 800,
    color: '#F9FAFB',
    margin: 0,
  },
  headerSubtitle: {
    fontSize: '0.875rem',
    color: '#9CA3AF',
    margin: '2px 0 0 0',
  },
  versionBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#60A5FA',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    fontSize: '0.75rem',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '6px',
  },
  livePulseBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: '#34D399',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    fontSize: '0.6875rem',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '999px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  pulseDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#10B981',
    boxShadow: '0 0 8px #10B981',
  },
  refreshBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#E5E7EB',
    padding: '8px 14px',
    borderRadius: '10px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#2563EB',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '10px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    textDecoration: 'none',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  },
  metricItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '10px',
    padding: '12px 14px',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  metricLabel: {
    fontSize: '0.6875rem',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: 600,
  },
  metricValue: {
    fontSize: '0.875rem',
    color: '#F9FAFB',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  tabsContainer: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    marginBottom: '20px',
    paddingBottom: '4px',
  },
  tabBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    borderRadius: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#9CA3AF',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    border: '1px solid #3B82F6',
    color: '#60A5FA',
    boxShadow: '0 0 16px rgba(59, 130, 246, 0.25)',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  sectionHeader: {
    marginBottom: '4px',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#F9FAFB',
    margin: 0,
  },
  sectionSubtitle: {
    fontSize: '0.875rem',
    color: '#9CA3AF',
    margin: '4px 0 0 0',
  },
  archGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: '16px',
  },
  archCard: {
    backgroundColor: '#111827',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    padding: '20px',
  },
  archCardTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#F9FAFB',
    margin: 0,
  },
  archBadge: {
    fontSize: '0.6875rem',
    padding: '2px 8px',
    borderRadius: '6px',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#60A5FA',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    fontWeight: 600,
  },
  archCardDesc: {
    fontSize: '0.8125rem',
    color: '#9CA3AF',
    margin: '0 0 14px 0',
    lineHeight: 1.5,
  },
  featuresList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  featureItem: {
    display: 'flex',
    gap: '8px',
    fontSize: '0.8125rem',
    color: '#E5E7EB',
    lineHeight: 1.4,
  },
  pipelineBox: {
    backgroundColor: '#111827',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    padding: '20px',
  },
  pipelineTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#F9FAFB',
    margin: '0 0 16px 0',
  },
  flowSteps: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  flowStep: {
    flex: '1 1 200px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '14px',
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
  },
  flowStepNumber: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    backgroundColor: '#3B82F6',
    color: '#fff',
    fontSize: '0.8125rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  flowStepContent: {
    fontSize: '0.8125rem',
    color: '#9CA3AF',
  },
  flowArrow: {
    color: '#4B5563',
  },
  playgroundContainer: {
    backgroundColor: '#111827',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 4px 20px rgba(139, 92, 246, 0.1)',
  },
  typeBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#9CA3AF',
    padding: '4px 10px',
    borderRadius: '8px',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  typeBtnActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    border: '1px solid #8B5CF6',
    color: '#DDD6FE',
  },
  playgroundTextarea: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#F9FAFB',
    fontSize: '0.875rem',
    fontFamily: 'inherit',
    lineHeight: 1.5,
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  loadExampleBtn: {
    position: 'absolute',
    right: '10px',
    bottom: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#C4B5FD',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '0.6875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  progressBarTrack: {
    width: '100%',
    height: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: '999px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '999px',
    transition: 'all 0.2s ease',
  },
  rulesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: '16px',
  },
  ruleCard: {
    backgroundColor: '#111827',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    padding: '20px',
  },
  ruleCategory: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#F9FAFB',
    margin: '0 0 2px 0',
  },
  ruleApiField: {
    fontSize: '0.75rem',
    color: '#9CA3AF',
  },
  rulePriorityBadge: {
    fontSize: '0.6875rem',
    padding: '2px 8px',
    borderRadius: '6px',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: '#34D399',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    fontWeight: 600,
  },
  limitStatsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    margin: '14px 0',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  limitStat: {
    display: 'flex',
    flexDirection: 'column',
    fontSize: '0.75rem',
    color: '#9CA3AF',
  },
  ruleList: {
    margin: '0 0 14px 0',
    padding: 0,
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  ruleListItem: {
    fontSize: '0.8125rem',
    color: '#D1D5DB',
    lineHeight: 1.4,
  },
  ruleExampleBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '10px',
    padding: '12px',
  },
  ruleExampleText: {
    fontSize: '0.75rem',
    color: '#9CA3AF',
    fontStyle: 'italic',
    margin: 0,
    lineHeight: 1.5,
  },
  miniCopyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    border: 'none',
    color: '#C4B5FD',
    fontSize: '0.6875rem',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  apiFilterRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '16px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#111827',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '10px',
    padding: '10px 14px',
  },
  searchInput: {
    background: 'none',
    border: 'none',
    color: '#F9FAFB',
    fontSize: '0.875rem',
    width: '100%',
    outline: 'none',
  },
  modFilterBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#9CA3AF',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  modFilterBtnActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    border: '1px solid #3B82F6',
    color: '#60A5FA',
  },
  apiCard: {
    backgroundColor: '#111827',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  apiCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 20px',
    cursor: 'pointer',
    flexWrap: 'wrap',
    gap: '10px',
  },
  methodBadge: {
    fontSize: '0.75rem',
    fontWeight: 800,
    padding: '3px 8px',
    borderRadius: '6px',
  },
  endpointPath: {
    fontSize: '0.875rem',
    color: '#F9FAFB',
    fontWeight: 600,
  },
  moduleTag: {
    fontSize: '0.6875rem',
    padding: '2px 8px',
    borderRadius: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    color: '#9CA3AF',
  },
  authBadge: {
    fontSize: '0.6875rem',
    color: '#FCD34D',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  apiCardBody: {
    padding: '16px 20px',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  },
  codeBlock: {
    margin: 0,
    padding: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#A78BFA',
    fontSize: '0.75rem',
    fontFamily: 'monospace',
    overflowX: 'auto',
  },
  dbTableBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#9CA3AF',
    padding: '8px 14px',
    borderRadius: '8px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  dbTableBtnActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    border: '1px solid #3B82F6',
    color: '#60A5FA',
  },
  tableCard: {
    backgroundColor: '#111827',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    overflow: 'hidden',
  },
  dbTable: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '0.8125rem',
  },
  dbTh: {
    padding: '12px 16px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#9CA3AF',
    fontWeight: 600,
  },
  dbTr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
  },
  dbTdName: {
    padding: '12px 16px',
    color: '#60A5FA',
  },
  dbTdType: {
    padding: '12px 16px',
  },
  typeTag: {
    fontSize: '0.6875rem',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    padding: '2px 6px',
    borderRadius: '4px',
    color: '#DDD6FE',
  },
  dbTdDesc: {
    padding: '12px 16px',
    color: '#9CA3AF',
  },
  checkCard: {
    backgroundColor: '#111827',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  checkCardDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
  },
  checkboxBox: {
    width: '20px',
    height: '20px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumBadge: {
    fontSize: '0.6875rem',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: '#E5E7EB',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 600,
  },
  statusBadge: {
    fontSize: '0.75rem',
    padding: '4px 10px',
    borderRadius: '8px',
    fontWeight: 600,
  },
  changelogCard: {
    backgroundColor: '#111827',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '18px 20px',
  },
  versionTag: {
    fontSize: '0.75rem',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    color: '#60A5FA',
    padding: '2px 8px',
    borderRadius: '6px',
    fontWeight: 700,
  },
};
