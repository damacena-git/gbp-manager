'use client';

import { useState, useEffect } from 'react';
import {
  FileText, Printer, Download, Eye, Phone, Globe,
  Navigation, Star, TrendingUp, Calendar, CheckCircle2,
  Building2, Sparkles, Share2
} from 'lucide-react';

export default function ReportsPage() {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [agencyName, setAgencyName] = useState('Agência de Marketing');
  const [days, setDays] = useState(30);
  const [metricsData, setMetricsData] = useState(null);
  const [reviewsList, setReviewsList] = useState([]);
  const [postsList, setPostsList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      const list = data.clients || [];
      setClients(list);
      if (list.length > 0) {
        setSelectedClientId(list[0].id);
        loadReportData(list[0].id, list[0]);
      }
    } catch (err) {
      console.error('Error loading clients:', err);
    }
  }

  async function loadReportData(clientId, clientObj) {
    setLoading(true);
    const client = clientObj || clients.find((c) => c.id === clientId);
    setSelectedClient(client || null);

    try {
      const [metricsRes, reviewsRes, postsRes] = await Promise.all([
        fetch(`/api/metrics?clientId=${clientId}&days=${days}`),
        fetch(`/api/reviews?clientId=${clientId}`),
        fetch(`/api/posts?clientId=${clientId}`),
      ]);

      const metricsJson = await metricsRes.json();
      const reviewsJson = await reviewsRes.json();
      const postsJson = await postsRes.json();

      setMetricsData(metricsJson);
      setReviewsList(reviewsJson.reviews || []);
      setPostsList(postsJson.posts || []);
    } catch (err) {
      console.error('Error loading report data:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleClientChange(id) {
    setSelectedClientId(id);
    const client = clients.find((c) => c.id === id);
    loadReportData(id, client);
  }

  function handlePrint() {
    window.print();
  }

  const totals = metricsData?.totals || {
    views: 0,
    searches: 0,
    phone_calls: 0,
    website_clicks: 0,
    direction_requests: 0,
  };

  const totalActions = totals.phone_calls + totals.website_clicks + totals.direction_requests;

  return (
    <div style={styles.page}>
      {/* Non-Printable Configuration Header */}
      <div className="no-print" style={styles.controlHeader}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={styles.pageTitle}>Relatório de Performance Executivo</h1>
            <span className="badge badge-green">Para Enviar ao Cliente</span>
          </div>
          <p style={styles.pageSubtitle}>
            Gere relatórios mensais claros e profissionais para comprovar o retorno do investimento do seu cliente
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={styles.label}>Cliente:</label>
            <select
              className="input select"
              value={selectedClientId}
              onChange={(e) => handleClientChange(e.target.value)}
              style={{ minWidth: '220px' }}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.business_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={styles.label}>Período:</label>
            <select
              className="input select"
              value={days}
              onChange={(e) => {
                const newDays = parseInt(e.target.value, 10);
                setDays(newDays);
                loadReportData(selectedClientId, selectedClient);
              }}
              style={{ width: '130px' }}
            >
              <option value={7}>7 dias</option>
              <option value={30}>30 dias</option>
              <option value={90}>90 dias</option>
            </select>
          </div>

          <div>
            <label style={styles.label}>Nome da sua Agência:</label>
            <input
              className="input"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              style={{ width: '180px' }}
            />
          </div>

          <div style={{ alignSelf: 'flex-end' }}>
            <button onClick={handlePrint} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Printer size={16} /> Imprimir / Salvar PDF
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 20px' }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : selectedClient ? (
        /* Printable Report Document */
        <div className="report-paper" style={styles.reportSheet}>
          {/* Report Top Header */}
          <div style={styles.reportHeader}>
            <div>
              <div style={styles.agencyBrand}>{agencyName}</div>
              <h2 style={styles.reportMainTitle}>Relatório de Desempenho no Google</h2>
              <span style={styles.reportPeriodText}>
                Período avaliado: Últimos {days} dias • Gerado em {new Date().toLocaleDateString('pt-BR')}
              </span>
            </div>

            <div style={styles.clientBadgeBox}>
              <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                CLIENTE AUDITADO
              </span>
              <div style={{ fontWeight: 800, fontSize: '1.125rem', color: '#0F172A', marginTop: '2px' }}>
                {selectedClient.business_name}
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#3B82F6', fontWeight: 600 }}>
                {selectedClient.category || 'Negócio Local'}
              </div>
            </div>
          </div>

          {/* Executive Intro */}
          <div style={styles.executiveIntro}>
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              Apresentamos os resultados de visibilidade orgânica, atração de clientes e ações geradas na sua ficha do
              <strong> Google Meu Negócio</strong>. Este trabalho contínuo de gestão visa posicionar a sua empresa em
              destaque nas buscas do Google Maps em sua região.
            </p>
          </div>

          {/* KPI Highlights Grid */}
          <div style={styles.kpiGrid}>
            <div style={styles.kpiCard}>
              <div style={{ ...styles.kpiIconBox, backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#2563EB' }}>
                <Eye size={20} />
              </div>
              <div style={styles.kpiValue}>{totals.views.toLocaleString('pt-BR')}</div>
              <div style={styles.kpiLabel}>Visualizações na Ficha</div>
              <span style={styles.kpiSub}>No Google Maps e Pesquisa</span>
            </div>

            <div style={styles.kpiCard}>
              <div style={{ ...styles.kpiIconBox, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#059669' }}>
                <Phone size={20} />
              </div>
              <div style={styles.kpiValue}>{totals.phone_calls.toLocaleString('pt-BR')}</div>
              <div style={styles.kpiLabel}>Ligações Telefônicas</div>
              <span style={styles.kpiSub}>Chamadas diretas de clientes</span>
            </div>

            <div style={styles.kpiCard}>
              <div style={{ ...styles.kpiIconBox, backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#D97706' }}>
                <Navigation size={20} />
              </div>
              <div style={styles.kpiValue}>{totals.direction_requests.toLocaleString('pt-BR')}</div>
              <div style={styles.kpiLabel}>Rotas Solicitadas</div>
              <span style={styles.kpiSub}>Clientes indo ao local físico</span>
            </div>

            <div style={styles.kpiCard}>
              <div style={{ ...styles.kpiIconBox, backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#0891B2' }}>
                <Globe size={20} />
              </div>
              <div style={styles.kpiValue}>{totals.website_clicks.toLocaleString('pt-BR')}</div>
              <div style={styles.kpiLabel}>Cliques no Site / WhatsApp</div>
              <span style={styles.kpiSub}>Acessos aos canais online</span>
            </div>
          </div>

          {/* Total Conversion Banner */}
          <div style={styles.conversionBanner}>
            <div>
              <div style={{ fontSize: '0.8125rem', color: '#1E3A8A', fontWeight: 700, textTransform: 'uppercase' }}>
                Total de Interações Comerciais Geradas
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1E40AF', marginTop: '2px' }}>
                {totalActions.toLocaleString('pt-BR')} potenciais clientes
              </div>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#3B82F6', maxWidth: '340px', textAlign: 'right' }}>
              Pessoas que ligaram, pediram rotas no mapa ou clicaram no seu site durante este período.
            </div>
          </div>

          {/* Reputation & Posts Summary Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', margin: '24px 0' }}>
            {/* Reviews Section */}
            <div style={styles.reportSubBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={styles.subBoxTitle}>⭐ Reputação & Avaliações</h4>
                <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#D97706' }}>
                  Nota {Number(selectedClient.average_rating || 5).toFixed(1)} / 5.0
                </span>
              </div>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={18} fill="#F59E0B" color="#F59E0B" />
                ))}
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#64748B', lineHeight: '1.5' }}>
                Total de <strong>{reviewsList.length || selectedClient.total_reviews || 0} avaliações</strong> no perfil. Manter as avaliações respondidas e a nota acima de 4.5 assegura a confiança dos consumidores e melhora o posicionamento local.
              </p>
            </div>

            {/* Posts Section */}
            <div style={styles.reportSubBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={styles.subBoxTitle}>📝 Conteúdo & Postagens</h4>
                <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#059669' }}>
                  {postsList.length} Posts
                </span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#64748B', lineHeight: '1.5' }}>
                Fichas ativas que publicam novidades, fotos e promoções semanalmente recebem maior distribuição no feed de novidades do Google Maps e engajam potenciais compradores.
              </p>
            </div>
          </div>

          {/* Footer Signature */}
          <div style={styles.reportFooter}>
            <div style={{ fontSize: '0.8125rem', color: '#64748B' }}>
              Relatório elaborado por <strong>{agencyName}</strong> • Especialista em Google Meu Negócio
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
              Página 1 de 1
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  page: { animation: 'fadeIn 0.3s ease-out' },
  controlHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
    backgroundColor: 'var(--bg-card)',
    padding: '20px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-primary)',
  },
  pageTitle: { fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' },
  pageSubtitle: { fontSize: '0.875rem', color: '#9CA3AF', marginTop: '4px' },
  label: { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' },
  reportSheet: {
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    borderRadius: '16px',
    padding: '40px 48px',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
    maxWidth: '900px',
    margin: '0 auto',
    fontFamily: "'Inter', sans-serif",
  },
  reportHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '2px solid #F1F5F9',
    paddingBottom: '20px',
  },
  agencyBrand: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#2563EB',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  reportMainTitle: {
    fontSize: '1.625rem',
    fontWeight: 900,
    color: '#0F172A',
    marginTop: '4px',
  },
  reportPeriodText: {
    fontSize: '0.8125rem',
    color: '#64748B',
    display: 'block',
    marginTop: '4px',
  },
  clientBadgeBox: {
    textAlign: 'right',
    padding: '12px 18px',
    backgroundColor: '#F8FAFC',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
  },
  executiveIntro: {
    backgroundColor: '#F8FAFC',
    borderLeft: '4px solid #2563EB',
    padding: '14px 18px',
    borderRadius: '4px 8px 8px 4px',
    margin: '20px 0',
    fontSize: '0.875rem',
    color: '#334155',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '14px',
    margin: '24px 0',
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    padding: '18px 14px',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
  },
  kpiIconBox: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 10px',
  },
  kpiValue: {
    fontSize: '1.5rem',
    fontWeight: 900,
    color: '#0F172A',
  },
  kpiLabel: {
    fontSize: '0.8125rem',
    fontWeight: 700,
    color: '#334155',
    marginTop: '2px',
  },
  kpiSub: {
    fontSize: '0.6875rem',
    color: '#94A3B8',
    display: 'block',
    marginTop: '2px',
  },
  conversionBanner: {
    backgroundColor: '#EFF6FF',
    border: '1px solid #BFDBFE',
    borderRadius: '12px',
    padding: '18px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: '20px 0',
  },
  reportSubBox: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    padding: '20px',
  },
  subBoxTitle: {
    fontSize: '0.9375rem',
    fontWeight: 800,
    color: '#0F172A',
    margin: 0,
  },
  reportFooter: {
    borderTop: '1px solid #E2E8F0',
    paddingTop: '16px',
    marginTop: '32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
};
