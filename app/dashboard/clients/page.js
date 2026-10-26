'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Users, Plus, Search, Filter, ExternalLink, Trash2,
  RefreshCw, CheckCircle2, XCircle, AlertTriangle, Wifi, WifiOff,
  MapPin, Phone, Globe, Star, Eye, Zap
} from 'lucide-react';

function getClientLogo(client) {
  if (client.logo_url) return client.logo_url;
  if (client.website) {
    try {
      const urlStr = client.website.startsWith('http') ? client.website : `https://${client.website}`;
      const host = new URL(urlStr).hostname.replace(/^www\./, '');
      if (host) {
        return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
      }
    } catch {}
  }
  return null;
}

// Wrapper to handle Suspense requirement for useSearchParams
function ClientsAlerts() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const error = searchParams.get('error');

  return (
    <>
      {success === 'connected' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '14px 18px', marginBottom: '20px', borderRadius: '12px',
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
          color: '#10B981', fontSize: '0.875rem', fontWeight: 500,
        }}>
          <CheckCircle2 size={18} />
          Perfil do Google conectado com sucesso!
        </div>
      )}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '14px 18px', marginBottom: '20px', borderRadius: '12px',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          color: '#EF4444', fontSize: '0.875rem', fontWeight: 500,
        }}>
          <XCircle size={18} />
          Erro ao conectar: {decodeURIComponent(error).replace(/_/g, ' ')}
        </div>
      )}
    </>
  );
}

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      setClients(data.clients || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function connectGoogle() {
    setConnecting(true);
    try {
      const res = await fetch('/api/auth/google');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Error:', err);
      setConnecting(false);
    }
  }

  async function deleteClient(id) {
    if (!confirm('Tem certeza que deseja remover este cliente?')) return;
    try {
      await fetch(`/api/clients?id=${id}`, { method: 'DELETE' });
      setClients(clients.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Error:', err);
    }
  }

  const filtered = clients.filter((c) => {
    const matchesSearch = c.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '120px' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Alerts */}
      <Suspense fallback={null}>
        <ClientsAlerts />
      </Suspense>

      {/* Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Clientes</h1>
          <p style={styles.pageSubtitle}>{clients.length} perfis gerenciados</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={loadClients}
            className="btn btn-secondary"
            title="Atualizar lista"
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
          <button
            onClick={connectGoogle}
            className="btn btn-primary"
            disabled={connecting}
          >
            {connecting ? <div className="spinner" /> : <Plus size={16} />}
            Conectar Google
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <div style={styles.searchWrapper}>
          <Search size={18} style={styles.searchIcon} />
          <input
            className="input"
            placeholder="Buscar clientes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <div className="tabs">
          {[
            { value: 'all', label: 'Todos' },
            { value: 'active', label: 'Ativos' },
            { value: 'paused', label: 'Pausados' },
            { value: 'disconnected', label: 'Desconectados' },
          ].map((f) => (
            <button
              key={f.value}
              className={`tab ${statusFilter === f.value ? 'active' : ''}`}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Client Grid */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <Users size={32} />
            </div>
            <div className="empty-state-title">
              {clients.length === 0 ? 'Nenhum cliente ainda' : 'Nenhum resultado'}
            </div>
            <div className="empty-state-text">
              {clients.length === 0
                ? 'Conecte seu primeiro perfil do Google Meu Negócio clicando no botão acima.'
                : 'Tente ajustar os filtros de busca.'}
            </div>
          </div>
        </div>
      ) : (
        <div style={styles.clientGrid}>
          {filtered.map((client) => {
            const logoUrl = getClientLogo(client);
            return (
              <a
                key={client.id}
                href={`/dashboard/clients/${client.id}`}
                className="card card-interactive"
                style={styles.clientCard}
              >
                <div style={styles.cardTop}>
                  <div style={styles.clientAvatarWrapper}>
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={client.business_name}
                        style={styles.clientLogoImg}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback');
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="avatar-fallback"
                      style={{
                        ...styles.clientAvatar,
                        display: logoUrl ? 'none' : 'flex',
                        background: client.status === 'active'
                          ? 'linear-gradient(135deg, #10B981, #06B6D4)'
                          : client.status === 'error'
                            ? 'linear-gradient(135deg, #EF4444, #F59E0B)'
                            : 'rgba(107,114,128,0.3)',
                      }}
                    >
                      {client.business_name?.[0]?.toUpperCase() || '?'}
                    </div>
                  </div>

                  <div style={styles.cardActions}>
                    <span className={`badge badge-${
                      client.status === 'active' ? 'green' :
                      client.status === 'error' ? 'red' :
                      client.status === 'paused' ? 'amber' : 'purple'
                    }`}>
                      {client.status === 'active' && <Wifi size={10} />}
                      {client.status === 'disconnected' && <WifiOff size={10} />}
                      {client.status === 'active' ? 'Conectado' :
                       client.status === 'error' ? 'Erro' :
                       client.status === 'paused' ? 'Pausado' : 'Desconectado'}
                    </span>
                  </div>
                </div>

                <h3 style={styles.clientName}>{client.business_name}</h3>
                <p style={styles.clientCategory}>
                  {client.category || 'Sem categoria'}
                </p>

                <div style={styles.clientMeta}>
                  {client.phone && (
                    <div style={styles.metaItem}>
                      <Phone size={12} />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.website && (
                    <div style={styles.metaItem}>
                      <Globe size={12} />
                      <span>{(() => {
                        try {
                          const u = client.website.startsWith('http') ? client.website : `https://${client.website}`;
                          return new URL(u).hostname.replace(/^www\./, '');
                        } catch {
                          return client.website;
                        }
                      })()}</span>
                    </div>
                  )}
                </div>

                {/* MÉTRICAS DOS ÚLTIMOS 30 DIAS */}
                <div style={styles.metricsBox}>
                  <div style={styles.metricsBoxHeader}>
                    <span style={styles.metricsPeriodTag}>Últimos 30 dias</span>
                  </div>
                  <div style={styles.metricsGrid30d}>
                    <div style={styles.metricItem} title="Visualizações no Google Busca e Maps nos últimos 30 dias">
                      <div style={styles.metricItemTop}>
                        <Eye size={12} style={{ color: '#06B6D4' }} />
                        <span style={styles.metricItemValue}>{Number(client.views_30d || 0).toLocaleString('pt-BR')}</span>
                      </div>
                      <span style={styles.metricItemLabel}>Visualizações</span>
                    </div>

                    <div style={styles.metricItem} title="Pesquisas diretas e por descoberta no Google nos últimos 30 dias">
                      <div style={styles.metricItemTop}>
                        <Search size={12} style={{ color: '#3B82F6' }} />
                        <span style={styles.metricItemValue}>{Number(client.searches_30d || 0).toLocaleString('pt-BR')}</span>
                      </div>
                      <span style={styles.metricItemLabel}>Pesquisas</span>
                    </div>

                    <div style={styles.metricItem} title="Interações: cliques no site, ligações e rotas nos últimos 30 dias">
                      <div style={styles.metricItemTop}>
                        <Zap size={12} style={{ color: '#10B981' }} />
                        <span style={styles.metricItemValue}>{Number(client.actions_30d || 0).toLocaleString('pt-BR')}</span>
                      </div>
                      <span style={styles.metricItemLabel}>Interações</span>
                    </div>
                  </div>
                </div>

                {/* ESTATÍSTICAS BASE: POSTS, REVIEWS, NOTA */}
                <div style={styles.clientStats}>
                  <div style={styles.miniStat}>
                    <span style={styles.miniStatValue}>{client.posts_count ?? client.scheduled_posts?.[0]?.count ?? 0}</span>
                    <span style={styles.miniStatLabel}>Posts</span>
                  </div>
                  <div style={styles.miniStat}>
                    <span style={styles.miniStatValue}>{client.reviews_count ?? client.reviews?.[0]?.count ?? client.total_reviews ?? 0}</span>
                    <span style={styles.miniStatLabel}>Reviews</span>
                  </div>
                  <div style={styles.miniStat}>
                    <span style={styles.miniStatValue}>
                      {client.average_rating ? Number(client.average_rating).toFixed(1) : '-'}
                    </span>
                    <span style={styles.miniStatLabel}>Nota</span>
                  </div>
                </div>

                <button
                  onClick={(e) => { e.preventDefault(); deleteClient(client.id); }}
                  style={styles.deleteBtn}
                  title="Remover cliente"
                >
                  <Trash2 size={14} />
                </button>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { animation: 'fadeIn 0.3s ease-out' },
  alertSuccess: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '14px 18px', marginBottom: '20px', borderRadius: '12px',
    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
    color: '#10B981', fontSize: '0.875rem', fontWeight: 500,
  },
  alertError: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '14px 18px', marginBottom: '20px', borderRadius: '12px',
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
    color: '#EF4444', fontSize: '0.875rem', fontWeight: 500,
  },
  pageHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '24px',
  },
  pageTitle: { fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' },
  pageSubtitle: { fontSize: '0.875rem', color: '#9CA3AF', marginTop: '4px' },
  filters: {
    display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px',
    flexWrap: 'wrap',
  },
  searchWrapper: { position: 'relative', flex: 1, minWidth: '200px' },
  searchIcon: { position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' },
  searchInput: { width: '100%', paddingLeft: '42px' },
  clientGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '16px',
  },
  clientCard: {
    position: 'relative', textDecoration: 'none', display: 'block',
  },
  cardTop: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: '16px',
  },
  clientAvatarWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    position: 'relative',
    overflow: 'hidden',
    flexShrink: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  },
  clientLogoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  clientAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: '13px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.125rem',
    fontWeight: 800,
    color: 'white',
  },
  metricsBox: {
    marginTop: '14px',
    marginBottom: '14px',
    padding: '10px 12px',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  metricsBoxHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  metricsPeriodTag: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: '#9CA3AF',
  },
  metricsGrid30d: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  metricItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '4px 2px',
    background: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '8px',
  },
  metricItemTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginBottom: '2px',
  },
  metricItemValue: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#F3F4F6',
  },
  metricItemLabel: {
    fontSize: '0.6875rem',
    color: '#9CA3AF',
    whiteSpace: 'nowrap',
  },
  cardActions: { display: 'flex', gap: '8px' },
  clientName: {
    fontSize: '1.0625rem', fontWeight: 700, marginBottom: '4px',
    color: '#F9FAFB',
  },
  clientCategory: { fontSize: '0.8125rem', color: '#6B7280', marginBottom: '14px' },
  clientMeta: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' },
  metaItem: {
    display: 'flex', alignItems: 'center', gap: '6px',
    fontSize: '0.75rem', color: '#9CA3AF',
  },
  clientStats: {
    display: 'flex', gap: '16px', paddingTop: '16px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  miniStat: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 },
  miniStatValue: { fontSize: '1.125rem', fontWeight: 700, color: '#F9FAFB' },
  miniStatLabel: { fontSize: '0.6875rem', color: '#6B7280', marginTop: '2px' },
  deleteBtn: {
    position: 'absolute', top: '24px', right: '24px',
    width: '28px', height: '28px', borderRadius: '8px',
    display: 'none', alignItems: 'center', justifyContent: 'center',
    color: '#EF4444', background: 'rgba(239,68,68,0.1)',
    border: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
  },
};
