'use client';

import { useState, useEffect } from 'react';
import {
  Star, MessageSquare, Sparkles, Send, Filter, Search,
  CheckCircle2, Clock, XCircle, Wand2, ChevronDown, X, RefreshCw
} from 'lucide-react';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRating, setFilterRating] = useState('all');
  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [generatingReply, setGeneratingReply] = useState(null);
  const [sendingReply, setSendingReply] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [reviewsRes, clientsRes] = await Promise.all([
        fetch('/api/reviews'),
        fetch('/api/clients'),
      ]);
      const reviewsData = await reviewsRes.json();
      const clientsData = await clientsRes.json();
      setReviews(reviewsData.reviews || []);
      setClients(clientsData.clients || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function suggestReply(reviewId) {
    setGeneratingReply(reviewId);
    try {
      const res = await fetch('/api/reviews/suggest-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: reviewId }),
      });
      const data = await res.json();
      if (data.suggestedReply) {
        setReplyText(data.suggestedReply);
        setReplyingId(reviewId);

        // Update local state
        setReviews(reviews.map((r) =>
          r.id === reviewId ? { ...r, ai_suggested_reply: data.suggestedReply } : r
        ));
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setGeneratingReply(null);
    }
  }

  async function sendReply(reviewId) {
    if (!replyText.trim()) return;
    setSendingReply(reviewId);
    try {
      await fetch('/api/reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reviewId,
          reply: replyText,
          reply_status: 'sent',
        }),
      });

      setReviews(reviews.map((r) =>
        r.id === reviewId
          ? { ...r, reply: replyText, reply_status: 'sent', replied_at: new Date().toISOString() }
          : r
      ));
      setReplyingId(null);
      setReplyText('');
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setSendingReply(null);
    }
  }

  const filtered = reviews.filter((r) => {
    if (filterClient && r.client_id !== filterClient) return false;
    if (filterStatus === 'pending' && r.reply_status !== 'pending') return false;
    if (filterStatus === 'sent' && r.reply_status !== 'sent') return false;
    if (filterRating !== 'all' && r.star_rating !== parseInt(filterRating)) return false;
    return true;
  });

  const pendingCount = reviews.filter((r) => r.reply_status === 'pending').length;
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + (r.star_rating || 0), 0) / reviews.length).toFixed(1)
    : '0.0';

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '120px' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Avaliações</h1>
          <p style={styles.pageSubtitle}>Gerencie e responda avaliações de todos os clientes</p>
        </div>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        <div className="card stat-card" style={styles.miniStat}>
          <div className="stat-value" style={{ fontSize: '1.5rem' }}>{reviews.length}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="card stat-card" style={styles.miniStat}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F59E0B' }}>{avgRating}</div>
          <div className="stat-label">Nota Média</div>
        </div>
        <div className="card stat-card" style={styles.miniStat}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: pendingCount > 0 ? '#EF4444' : '#10B981' }}>
            {pendingCount}
          </div>
          <div className="stat-label">Pendentes</div>
        </div>
        <div className="card stat-card" style={styles.miniStat}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10B981' }}>
            {reviews.filter((r) => r.reply_status === 'sent').length}
          </div>
          <div className="stat-label">Respondidas</div>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <select className="input select" value={filterClient} onChange={(e) => setFilterClient(e.target.value)} style={{ maxWidth: '200px' }}>
          <option value="">Todos os clientes</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.business_name}</option>)}
        </select>
        <div className="tabs">
          {[
            { value: 'all', label: 'Todas' },
            { value: 'pending', label: `Pendentes (${pendingCount})` },
            { value: 'sent', label: 'Respondidas' },
          ].map((f) => (
            <button key={f.value} className={`tab ${filterStatus === f.value ? 'active' : ''}`} onClick={() => setFilterStatus(f.value)}>
              {f.label}
            </button>
          ))}
        </div>
        <select className="input select" value={filterRating} onChange={(e) => setFilterRating(e.target.value)} style={{ maxWidth: '140px' }}>
          <option value="all">Todas notas</option>
          {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} ⭐</option>)}
        </select>
      </div>

      {/* Reviews List */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Star size={32} /></div>
            <div className="empty-state-title">Nenhuma avaliação encontrada</div>
            <div className="empty-state-text">Sincronize as avaliações dos seus clientes para vê-las aqui.</div>
          </div>
        </div>
      ) : (
        <div style={styles.reviewList}>
          {filtered.map((review) => (
            <div key={review.id} className="card" style={styles.reviewCard}>
              <div style={styles.reviewTop}>
                <div style={styles.reviewerInfo}>
                  <div style={{
                    ...styles.reviewerAvatar,
                    background: review.star_rating >= 4 ? 'linear-gradient(135deg, #10B981, #06B6D4)' :
                      review.star_rating >= 3 ? 'linear-gradient(135deg, #F59E0B, #EF4444)' :
                        'linear-gradient(135deg, #EF4444, #EC4899)',
                  }}>
                    {review.reviewer_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div style={styles.reviewerName}>{review.reviewer_name}</div>
                    <div style={styles.reviewBusiness}>{review.clients?.business_name}</div>
                  </div>
                </div>
                <div style={styles.reviewRight}>
                  <div style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={16} fill={s <= review.star_rating ? '#F59E0B' : 'transparent'} color={s <= review.star_rating ? '#F59E0B' : '#4B5563'} />
                    ))}
                  </div>
                  <span className={`badge badge-${review.reply_status === 'sent' ? 'green' : review.reply_status === 'pending' ? 'amber' : 'red'}`}>
                    {review.reply_status === 'sent' ? '✓ Respondida' : review.reply_status === 'pending' ? '⏳ Pendente' : '✗ Falhou'}
                  </span>
                </div>
              </div>

              <p style={styles.reviewComment}>
                {review.comment || '(Avaliação sem comentário — apenas nota)'}
              </p>

              {review.reviewed_at && (
                <span style={styles.reviewDate}>
                  <Clock size={12} />
                  {new Date(review.reviewed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              )}

              {/* Reply section */}
              {review.reply && review.reply_status === 'sent' ? (
                <div style={styles.replyBox}>
                  <strong style={{ fontSize: '0.75rem', color: '#3B82F6' }}>✓ Sua resposta:</strong>
                  <p style={{ fontSize: '0.8125rem', color: '#D1D5DB', marginTop: '6px', lineHeight: 1.6 }}>
                    {review.reply}
                  </p>
                </div>
              ) : (
                <div style={styles.replyActions}>
                  {replyingId === review.id ? (
                    <div style={styles.replyEditor}>
                      <textarea
                        className="input textarea"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Escreva sua resposta..."
                        style={{ minHeight: '80px' }}
                      />
                      <div style={styles.replyBtns}>
                        <button onClick={() => { setReplyingId(null); setReplyText(''); }} className="btn btn-ghost btn-sm">
                          Cancelar
                        </button>
                        <button
                          onClick={() => sendReply(review.id)}
                          className="btn btn-primary btn-sm"
                          disabled={sendingReply === review.id || !replyText.trim()}
                        >
                          {sendingReply === review.id ? <div className="spinner" /> : <Send size={14} />}
                          Enviar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => suggestReply(review.id)}
                        className="btn btn-secondary btn-sm"
                        disabled={generatingReply === review.id}
                        style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.1))', borderColor: 'rgba(139,92,246,0.2)' }}
                      >
                        {generatingReply === review.id ? <div className="spinner" /> : <Wand2 size={14} />}
                        {generatingReply === review.id ? 'Gerando...' : 'Sugerir com IA'}
                      </button>
                      <button
                        onClick={() => {
                          setReplyingId(review.id);
                          setReplyText(review.ai_suggested_reply || '');
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        <MessageSquare size={14} /> Responder
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { animation: 'fadeIn 0.3s ease-out' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  pageTitle: { fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' },
  pageSubtitle: { fontSize: '0.875rem', color: '#9CA3AF', marginTop: '4px' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' },
  miniStat: { textAlign: 'center', padding: '18px' },
  filters: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' },
  reviewList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  reviewCard: { },
  reviewTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' },
  reviewerInfo: { display: 'flex', gap: '12px', alignItems: 'center' },
  reviewerAvatar: { width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, color: 'white', flexShrink: 0 },
  reviewerName: { fontSize: '0.9375rem', fontWeight: 600 },
  reviewBusiness: { fontSize: '0.75rem', color: '#6B7280' },
  reviewRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' },
  starsRow: { display: 'flex', gap: '2px' },
  reviewComment: { fontSize: '0.875rem', color: '#D1D5DB', lineHeight: 1.7, marginBottom: '10px' },
  reviewDate: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#6B7280', marginBottom: '14px' },
  replyBox: { padding: '14px', borderRadius: '10px', background: 'rgba(59,130,246,0.05)', borderLeft: '3px solid rgba(59,130,246,0.3)', marginTop: '12px' },
  replyActions: { display: 'flex', gap: '8px', marginTop: '12px' },
  replyEditor: { display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '10px' },
  replyBtns: { display: 'flex', gap: '8px', justifyContent: 'flex-end' },
};
