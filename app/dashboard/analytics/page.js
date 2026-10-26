'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, Eye, Phone, Globe, Navigation,
  Calendar, ArrowUpRight, ArrowDownRight, Minus, RefreshCw
} from 'lucide-react';

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState([]);
  const [totals, setTotals] = useState({});
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [selectedClient, days]);

  async function loadClients() {
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      setClients(data.clients || []);
    } catch (err) {
      console.error('Error:', err);
    }
  }

  async function loadMetrics() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ days: days.toString() });
      if (selectedClient) params.set('clientId', selectedClient);

      const res = await fetch(`/api/metrics?${params}`);
      const data = await res.json();
      setMetrics(data.metrics || []);
      setTotals(data.totals || {});
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function syncMetrics() {
    setSyncing(true);
    try {
      const res = await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClient || null }),
      });
      const data = await res.json();
      if (data.success) {
        await loadMetrics();
      } else {
        alert(data.error || 'Erro ao sincronizar métricas');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao sincronizar métricas');
    } finally {
      setSyncing(false);
    }
  }

  const kpis = [
    { label: 'Visualizações', value: totals.views || 0, icon: Eye, color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
    { label: 'Buscas', value: totals.searches || 0, icon: BarChart3, color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)' },
    { label: 'Ligações', value: totals.phone_calls || 0, icon: Phone, color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
    { label: 'Cliques no Site', value: totals.website_clicks || 0, icon: Globe, color: '#06B6D4', bg: 'rgba(6,182,212,0.15)' },
    { label: 'Rotas Solicitadas', value: totals.direction_requests || 0, icon: Navigation, color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  ];

  // Group metrics by date for chart
  const chartData = {};
  metrics.forEach((m) => {
    const date = m.metric_date;
    if (!chartData[date]) {
      chartData[date] = { views: 0, searches: 0, phone_calls: 0, website_clicks: 0, direction_requests: 0 };
    }
    chartData[date].views += m.views || 0;
    chartData[date].searches += m.searches || 0;
    chartData[date].phone_calls += m.phone_calls || 0;
    chartData[date].website_clicks += m.website_clicks || 0;
    chartData[date].direction_requests += m.direction_requests || 0;
  });

  const chartEntries = Object.entries(chartData).sort(([a], [b]) => a.localeCompare(b));
  const maxViews = Math.max(...chartEntries.map(([, d]) => d.views), 1);

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Analytics</h1>
          <p style={styles.pageSubtitle}>Métricas de performance dos seus perfis GBP sincronizados com o Google</p>
        </div>
        <button
          onClick={syncMetrics}
          className="btn btn-secondary btn-sm"
          disabled={syncing}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Sincronizando...' : 'Sincronizar Métricas'}
        </button>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <select
          className="input select"
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          style={{ maxWidth: '250px' }}
        >
          <option value="">Todos os clientes</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.business_name}</option>)}
        </select>
        <div className="tabs">
          {[
            { value: 7, label: '7 dias' },
            { value: 30, label: '30 dias' },
            { value: 90, label: '90 dias' },
          ].map((f) => (
            <button
              key={f.value}
              className={`tab ${days === f.value ? 'active' : ''}`}
              onClick={() => setDays(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '80px' }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div style={styles.kpiGrid}>
            {kpis.map((kpi, i) => (
              <div key={i} className="card stat-card">
                <div style={{ ...styles.kpiIcon, background: kpi.bg, color: kpi.color }}>
                  <kpi.icon size={20} />
                </div>
                <div className="stat-value">{kpi.value.toLocaleString('pt-BR')}</div>
                <div className="stat-label">{kpi.label}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <h2 className="card-title">Visualizações ao Longo do Tempo</h2>
            </div>

            {chartEntries.length === 0 ? (
              <div style={styles.emptyChart}>
                <BarChart3 size={32} style={{ color: '#4B5563' }} />
                <p style={{ color: '#6B7280', fontSize: '0.875rem', marginTop: '12px' }}>
                  Nenhum dado disponível para o período selecionado.
                </p>
                <p style={{ color: '#4B5563', fontSize: '0.8125rem' }}>
                  Os dados de métricas são sincronizados automaticamente todos os dias.
                </p>
              </div>
            ) : (
              <div style={styles.chart}>
                {chartEntries.map(([date, data], i) => {
                  const height = Math.max((data.views / maxViews) * 200, 4);
                  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                  return (
                    <div key={date} style={styles.chartBar} title={`${formattedDate}: ${data.views} views`}>
                      <div style={{
                        ...styles.bar,
                        height: `${height}px`,
                        background: `linear-gradient(180deg, #3B82F6, #8B5CF6)`,
                        opacity: 0.6 + (data.views / maxViews) * 0.4,
                        animationDelay: `${i * 30}ms`,
                      }} />
                      {i % Math.ceil(chartEntries.length / 10) === 0 && (
                        <span style={styles.chartLabel}>{formattedDate}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Breakdown table */}
          {metrics.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Detalhamento por Cliente</h2>
              </div>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Views</th>
                      <th>Buscas</th>
                      <th>Ligações</th>
                      <th>Site</th>
                      <th>Rotas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => {
                      const clientMetrics = metrics.filter((m) => m.client_id === client.id);
                      const sum = clientMetrics.reduce((acc, m) => ({
                        views: acc.views + (m.views || 0),
                        searches: acc.searches + (m.searches || 0),
                        phone_calls: acc.phone_calls + (m.phone_calls || 0),
                        website_clicks: acc.website_clicks + (m.website_clicks || 0),
                        direction_requests: acc.direction_requests + (m.direction_requests || 0),
                      }), { views: 0, searches: 0, phone_calls: 0, website_clicks: 0, direction_requests: 0 });

                      if (selectedClient && client.id !== selectedClient) return null;
                      if (sum.views === 0 && sum.searches === 0) return null;

                      return (
                        <tr key={client.id}>
                          <td style={{ fontWeight: 600 }}>{client.business_name}</td>
                          <td>{sum.views.toLocaleString('pt-BR')}</td>
                          <td>{sum.searches.toLocaleString('pt-BR')}</td>
                          <td>{sum.phone_calls.toLocaleString('pt-BR')}</td>
                          <td>{sum.website_clicks.toLocaleString('pt-BR')}</td>
                          <td>{sum.direction_requests.toLocaleString('pt-BR')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  page: { animation: 'fadeIn 0.3s ease-out' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  pageTitle: { fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' },
  pageSubtitle: { fontSize: '0.875rem', color: '#9CA3AF', marginTop: '4px' },
  filters: { display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' },
  kpiIcon: { width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' },
  chart: { display: 'flex', alignItems: 'flex-end', gap: '3px', height: '220px', padding: '0 0 30px' },
  chartBar: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', position: 'relative', minWidth: '4px' },
  bar: { width: '100%', borderRadius: '3px 3px 0 0', transition: 'height 0.5s ease', animation: 'fadeIn 0.5s ease-out' },
  chartLabel: { position: 'absolute', bottom: '-24px', fontSize: '0.625rem', color: '#6B7280', whiteSpace: 'nowrap' },
  emptyChart: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' },
};
