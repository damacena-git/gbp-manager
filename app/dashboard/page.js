'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Users, FileText, Star, Eye, Phone, Globe, TrendingUp,
  TrendingDown, AlertTriangle, Clock, CheckCircle2, XCircle,
  ArrowRight, Sparkles, Calendar, BarChart3, MapPin
} from 'lucide-react';

export default function DashboardPage() {
  const [clients, setClients] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      const [clientsRes, postsRes, reviewsRes] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/posts?status=published'),
        fetch('/api/reviews?replyStatus=pending'),
      ]);

      const clientsData = await clientsRes.json();
      const postsData = await postsRes.json();
      const reviewsData = await reviewsRes.json();

      setClients(clientsData.clients || []);
      setRecentPosts((postsData.posts || []).slice(0, 5));
      setPendingReviews((reviewsData.reviews || []).slice(0, 5));
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  const activeClients = clients.filter((c) => c.status === 'active').length;
  const totalPosts = clients.reduce((sum, c) => sum + (c.scheduled_posts?.[0]?.count || 0), 0);
  const totalReviews = clients.reduce((sum, c) => sum + (c.reviews?.[0]?.count || 0), 0);
  const avgRating = clients.length > 0
    ? (clients.reduce((sum, c) => sum + (c.average_rating || 0), 0) / clients.length).toFixed(1)
    : '0.0';

  const stats = [
    { label: 'Clientes Ativos', value: activeClients, icon: Users, color: '#3B82F6', bgColor: 'rgba(59,130,246,0.15)' },
    { label: 'Posts Publicados', value: totalPosts, icon: FileText, color: '#8B5CF6', bgColor: 'rgba(139,92,246,0.15)' },
    { label: 'Avaliações', value: totalReviews, icon: Star, color: '#F59E0B', bgColor: 'rgba(245,158,11,0.15)' },
    { label: 'Nota Média', value: avgRating, icon: TrendingUp, color: '#10B981', bgColor: 'rgba(16,185,129,0.15)' },
  ];

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div className="spinner spinner-lg" />
        <p style={{ color: '#6B7280', marginTop: '16px' }}>Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Page Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Dashboard</h1>
          <p style={styles.pageSubtitle}>Visão geral de todos os seus perfis GBP</p>
        </div>
        <div style={styles.headerActions}>
          <a href="/dashboard/posts" className="btn btn-primary">
            <Sparkles size={16} />
            Criar Post
          </a>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        {stats.map((stat, i) => (
          <div key={i} className="card stat-card" style={styles.statCard}>
            <div style={styles.statHeader}>
              <div style={{ ...styles.statIcon, background: stat.bgColor, color: stat.color }}>
                <stat.icon size={20} />
              </div>
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div style={styles.contentGrid}>
        {/* Clients Overview */}
        <div className="card" style={styles.sectionCard}>
          <div className="card-header">
            <div>
              <h2 className="card-title">Clientes</h2>
              <p className="card-subtitle">{clients.length} perfis conectados</p>
            </div>
            <a href="/dashboard/clients" className="btn btn-ghost btn-sm">
              Ver todos <ArrowRight size={14} />
            </a>
          </div>

          {clients.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <MapPin size={32} />
              </div>
              <div className="empty-state-title">Nenhum cliente conectado</div>
              <div className="empty-state-text">
                Conecte seu primeiro perfil do Google Meu Negócio para começar.
              </div>
              <a href="/dashboard/clients" className="btn btn-primary">
                <Users size={16} />
                Conectar Cliente
              </a>
            </div>
          ) : (
            <div style={styles.clientList}>
              {clients.slice(0, 5).map((client) => (
                <a
                  key={client.id}
                  href={`/dashboard/clients/${client.id}`}
                  style={styles.clientItem}
                >
                  <div style={{
                    ...styles.clientAvatar,
                    background: client.status === 'active'
                      ? 'linear-gradient(135deg, #10B981, #06B6D4)'
                      : 'rgba(107,114,128,0.3)',
                  }}>
                    {client.business_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div style={styles.clientInfo}>
                    <div style={styles.clientName}>{client.business_name}</div>
                    <div style={styles.clientCategory}>{client.category || 'Sem categoria'}</div>
                  </div>
                  <span className={`badge badge-${client.status === 'active' ? 'green' : client.status === 'error' ? 'red' : 'amber'}`}>
                    {client.status === 'active' ? 'Ativo' : client.status === 'error' ? 'Erro' : 'Pausado'}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Pending Reviews */}
        <div className="card" style={styles.sectionCard}>
          <div className="card-header">
            <div>
              <h2 className="card-title">Avaliações Pendentes</h2>
              <p className="card-subtitle">{pendingReviews.length} aguardando resposta</p>
            </div>
            <a href="/dashboard/reviews" className="btn btn-ghost btn-sm">
              Ver todas <ArrowRight size={14} />
            </a>
          </div>

          {pendingReviews.length === 0 ? (
            <div style={styles.emptyMini}>
              <CheckCircle2 size={24} style={{ color: '#10B981' }} />
              <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>Todas as avaliações respondidas! 🎉</p>
            </div>
          ) : (
            <div style={styles.reviewList}>
              {pendingReviews.map((review) => (
                <div key={review.id} style={styles.reviewItem}>
                  <div style={styles.reviewHeader}>
                    <span style={styles.reviewerName}>{review.reviewer_name}</span>
                    <div style={styles.stars}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={14}
                          fill={s <= review.star_rating ? '#F59E0B' : 'transparent'}
                          color={s <= review.star_rating ? '#F59E0B' : '#4B5563'}
                        />
                      ))}
                    </div>
                  </div>
                  <p style={styles.reviewComment}>
                    {review.comment?.slice(0, 100) || '(Sem comentário)'}
                    {review.comment?.length > 100 ? '...' : ''}
                  </p>
                  <span style={styles.reviewBusiness}>{review.clients?.business_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Posts */}
      <div className="card" style={{ ...styles.sectionCard, marginTop: '20px' }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">Posts Recentes</h2>
            <p className="card-subtitle">Últimas publicações</p>
          </div>
          <a href="/dashboard/posts" className="btn btn-ghost btn-sm">
            Ver todos <ArrowRight size={14} />
          </a>
        </div>

        {recentPosts.length === 0 ? (
          <div style={styles.emptyMini}>
            <Calendar size={24} style={{ color: '#6B7280' }} />
            <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>Nenhum post publicado ainda</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Conteúdo</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {recentPosts.map((post) => (
                  <tr key={post.id}>
                    <td style={{ fontWeight: 500 }}>{post.clients?.business_name}</td>
                    <td style={{ color: '#9CA3AF', maxWidth: '300px' }}>
                      {post.content?.slice(0, 60)}{post.content?.length > 60 ? '...' : ''}
                    </td>
                    <td>
                      <span className={`badge badge-${post.topic_type === 'OFFER' ? 'amber' : post.topic_type === 'EVENT' ? 'purple' : 'blue'}`}>
                        {post.topic_type}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${post.status === 'published' ? 'green' : post.status === 'failed' ? 'red' : 'cyan'}`}>
                        {post.status === 'published' ? 'Publicado' : post.status === 'failed' ? 'Falhou' : post.status}
                      </span>
                    </td>
                    <td style={{ color: '#6B7280', fontSize: '0.8125rem' }}>
                      {post.published_at ? new Date(post.published_at).toLocaleDateString('pt-BR') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    animation: 'fadeIn 0.3s ease-out',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60vh',
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '28px',
  },
  pageTitle: {
    fontSize: '1.75rem',
    fontWeight: 800,
    letterSpacing: '-0.02em',
  },
  pageSubtitle: {
    fontSize: '0.875rem',
    color: '#9CA3AF',
    marginTop: '4px',
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    position: 'relative',
    overflow: 'hidden',
  },
  statHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  statIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  sectionCard: {
    overflow: 'hidden',
  },
  clientList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  clientItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '10px',
    transition: 'background 0.15s ease',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  clientAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.875rem',
    fontWeight: 700,
    color: 'white',
    flexShrink: 0,
  },
  clientInfo: {
    flex: 1,
    minWidth: 0,
  },
  clientName: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#F9FAFB',
  },
  clientCategory: {
    fontSize: '0.75rem',
    color: '#6B7280',
  },
  reviewList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  reviewItem: {
    padding: '14px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  reviewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  reviewerName: {
    fontSize: '0.8125rem',
    fontWeight: 600,
  },
  stars: {
    display: 'flex',
    gap: '2px',
  },
  reviewComment: {
    fontSize: '0.8125rem',
    color: '#9CA3AF',
    lineHeight: 1.5,
    marginBottom: '8px',
  },
  reviewBusiness: {
    fontSize: '0.6875rem',
    color: '#6B7280',
    fontWeight: 500,
  },
  emptyMini: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '32px',
  },
};
