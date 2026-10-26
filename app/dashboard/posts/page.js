'use client';

import { useState, useEffect } from 'react';
import {
  FileText, Plus, Sparkles, Send, Calendar, Clock, Edit3,
  Trash2, Eye, X, ChevronDown, Wand2, RefreshCw, Save
} from 'lucide-react';
import GooglePostModal from '@/components/posts/GooglePostModal';

export default function PostsPage() {
  const [posts, setPosts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [postToEdit, setPostToEdit] = useState(null);
  const [showAI, setShowAI] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [content, setContent] = useState('');
  const [topicType, setTopicType] = useState('STANDARD');
  const [scheduledFor, setScheduledFor] = useState('');
  const [aiTopic, setAiTopic] = useState('');
  const [aiTone, setAiTone] = useState('profissional');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [postsRes, clientsRes] = await Promise.all([
        fetch('/api/posts'),
        fetch('/api/clients'),
      ]);
      const postsData = await postsRes.json();
      const clientsData = await clientsRes.json();
      setPosts(postsData.posts || []);
      setClients((clientsData.clients || []).filter((c) => c.status === 'active'));
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function generateWithAI() {
    if (!selectedClient || !aiTopic) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/posts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: selectedClient,
          topic: aiTopic,
          tone: aiTone,
          type: topicType,
        }),
      });
      const data = await res.json();
      if (data.generated) {
        setContent(data.generated.content || data.generated);
        setShowAI(false);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setGenerating(false);
    }
  }

  async function savePost(status = 'draft') {
    if (!selectedClient || !content) return;
    setSaving(true);
    try {
      const finalStatus = scheduledFor ? 'scheduled' : status;
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: selectedClient,
          content,
          topic_type: topicType,
          scheduled_for: scheduledFor || null,
          status: finalStatus,
          ai_generated: generating,
          ai_prompt: aiTopic || null,
        }),
      });
      const data = await res.json();
      if (data.post) {
        setPosts([data.post, ...posts]);
        resetEditor();
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setSaving(false);
    }
  }

  async function deletePost(id) {
    if (!confirm('Excluir este post?')) return;
    try {
      await fetch(`/api/posts?id=${id}`, { method: 'DELETE' });
      setPosts(posts.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Error:', err);
    }
  }

  function resetEditor() {
    setShowEditor(false);
    setContent('');
    setSelectedClient('');
    setScheduledFor('');
    setAiTopic('');
    setTopicType('STANDARD');
  }

  const filtered = filter === 'all' ? posts : posts.filter((p) => p.status === filter);

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
          <h1 style={styles.pageTitle}>Posts</h1>
          <p style={styles.pageSubtitle}>Crie, agende e publique posts para seus clientes</p>
        </div>
        <button
          onClick={() => {
            setPostToEdit(null);
            setShowEditor(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={16} /> Novo Post
        </button>
      </div>

      {/* Filters */}
      <div className="tabs" style={{ marginBottom: '24px', width: 'fit-content' }}>
        {[
          { value: 'all', label: 'Todos' },
          { value: 'draft', label: 'Rascunhos' },
          { value: 'scheduled', label: 'Agendados' },
          { value: 'published', label: 'Publicados' },
          { value: 'failed', label: 'Falhas' },
        ].map((f) => (
          <button
            key={f.value}
            className={`tab ${filter === f.value ? 'active' : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Posts List */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><FileText size={32} /></div>
            <div className="empty-state-title">Nenhum post encontrado</div>
            <div className="empty-state-text">Crie um novo post ou ajuste os filtros.</div>
          </div>
        </div>
      ) : (
        <div style={styles.postGrid}>
          {filtered.map((post) => (
            <div key={post.id} className="card" style={styles.postCard}>
              <div style={styles.postTop}>
                <span className={`badge badge-${
                  post.status === 'published' ? 'green' :
                  post.status === 'scheduled' ? 'blue' :
                  post.status === 'failed' ? 'red' :
                  post.status === 'draft' ? 'amber' : 'purple'
                }`}>
                  {post.status === 'published' ? '✓ Publicado' :
                   post.status === 'scheduled' ? '⏰ Agendado' :
                   post.status === 'failed' ? '✗ Falhou' :
                   post.status === 'draft' ? '✎ Rascunho' : post.status}
                </span>
                <span className={`badge badge-${post.topic_type === 'OFFER' ? 'amber' : post.topic_type === 'EVENT' ? 'purple' : 'cyan'}`}>
                  {post.topic_type}
                </span>
              </div>

              <div style={styles.postClient}>
                {post.clients?.business_name || 'Cliente'}
              </div>

              <p style={styles.postContent}>{post.content}</p>

              {post.ai_generated && (
                <span className="badge badge-purple" style={{ marginTop: '8px' }}>
                  <Sparkles size={10} /> IA
                </span>
              )}

              <div style={styles.postFooter}>
                <span style={styles.postDate}>
                  <Calendar size={12} />
                  {post.published_at
                    ? new Date(post.published_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                    : post.scheduled_for
                      ? new Date(post.scheduled_for).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : 'Sem data'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    onClick={() => {
                      setPostToEdit(post);
                      setShowEditor(true);
                    }}
                    className="btn btn-ghost btn-icon btn-sm"
                    title="Editar postagem"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => deletePost(post.id)}
                    className="btn btn-ghost btn-icon btn-sm"
                    title="Excluir postagem"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Google Style Post Creation & Edit Modal */}
      {showEditor && (
        <GooglePostModal
          isOpen={showEditor}
          onClose={() => {
            setShowEditor(false);
            setPostToEdit(null);
          }}
          clients={clients}
          postToEdit={postToEdit}
          onPostCreated={(newPost) => {
            if (newPost) {
              setPosts((prev) => [newPost, ...prev]);
            }
          }}
          onPostUpdated={(updatedPost) => {
            if (updatedPost) {
              setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? { ...p, ...updatedPost } : p)));
            }
          }}
        />
      )}
    </div>
  );
}

const styles = {
  page: { animation: 'fadeIn 0.3s ease-out' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  pageTitle: { fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' },
  pageSubtitle: { fontSize: '0.875rem', color: '#9CA3AF', marginTop: '4px' },
  postGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' },
  postCard: { display: 'flex', flexDirection: 'column' },
  postTop: { display: 'flex', gap: '8px', marginBottom: '14px' },
  postClient: { fontSize: '0.8125rem', fontWeight: 600, color: '#D1D5DB', marginBottom: '8px' },
  postContent: { fontSize: '0.875rem', color: '#9CA3AF', lineHeight: 1.7, flex: 1 },
  postFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)' },
  postDate: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#6B7280' },
  aiPanel: { padding: '18px', borderRadius: '12px', background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', display: 'flex', flexDirection: 'column', gap: '14px' },
};
