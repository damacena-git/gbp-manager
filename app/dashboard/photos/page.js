'use client';

import { useState, useEffect } from 'react';
import {
  Image as ImageIcon, Upload, Plus, Trash2, X, FolderOpen,
  CheckCircle2, AlertTriangle, Sparkles
} from 'lucide-react';

export default function PhotosPage() {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      setClients((data.clients || []).filter((c) => c.status === 'active'));
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  const categories = [
    { value: 'COVER', label: 'Capa' },
    { value: 'PROFILE', label: 'Perfil' },
    { value: 'LOGO', label: 'Logo' },
    { value: 'EXTERIOR', label: 'Exterior' },
    { value: 'INTERIOR', label: 'Interior' },
    { value: 'PRODUCT', label: 'Produtos' },
    { value: 'AT_WORK', label: 'Equipe' },
    { value: 'FOOD_AND_DRINK', label: 'Comida/Bebida' },
    { value: 'ADDITIONAL', label: 'Outras' },
  ];

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
          <h1 style={styles.pageTitle}>Fotos</h1>
          <p style={styles.pageSubtitle}>Gerencie as fotos dos perfis dos seus clientes</p>
        </div>
      </div>

      {/* Client selector */}
      <div style={styles.controls}>
        <select
          className="input select"
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          style={{ maxWidth: '300px' }}
        >
          <option value="">Selecione um cliente...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.business_name}</option>
          ))}
        </select>
      </div>

      {!selectedClient ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <ImageIcon size={32} />
            </div>
            <div className="empty-state-title">Selecione um cliente</div>
            <div className="empty-state-text">
              Escolha um cliente acima para gerenciar suas fotos no Google Meu Negócio.
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Upload Area */}
          <div className="card" style={styles.uploadArea}>
            <div style={styles.uploadContent}>
              <div style={styles.uploadIcon}>
                <Upload size={32} />
              </div>
              <div style={styles.uploadText}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '4px' }}>Upload de Fotos</h3>
                <p style={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                  Arraste imagens aqui ou clique para selecionar. Suporta JPG, PNG (máx. 5MB).
                </p>
              </div>
              <button className="btn btn-primary">
                <Plus size={16} /> Selecionar Fotos
              </button>
            </div>
          </div>

          {/* Categories */}
          <div style={styles.categoriesGrid}>
            {categories.map((cat) => (
              <div key={cat.value} className="card card-interactive" style={styles.categoryCard}>
                <div style={styles.categoryIcon}>
                  <FolderOpen size={20} />
                </div>
                <h3 style={styles.categoryTitle}>{cat.label}</h3>
                <p style={styles.categoryCount}>0 fotos</p>
              </div>
            ))}
          </div>

          {/* Info */}
          <div className="card" style={styles.infoCard}>
            <AlertTriangle size={18} style={{ color: '#F59E0B', flexShrink: 0 }} />
            <div>
              <strong style={{ fontSize: '0.875rem' }}>Dica de otimização</strong>
              <p style={{ fontSize: '0.8125rem', color: '#9CA3AF', marginTop: '4px' }}>
                Fotos com bom alt-text ajudam o Google a entender seu negócio e melhoram o ranking local.
                Use a IA para gerar descrições otimizadas automaticamente ao fazer upload.
              </p>
            </div>
          </div>
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
  controls: { marginBottom: '24px' },
  uploadArea: {
    border: '2px dashed rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.03)',
    cursor: 'pointer', marginBottom: '24px',
  },
  uploadContent: { display: 'flex', alignItems: 'center', gap: '20px' },
  uploadIcon: { width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(59,130,246,0.15)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  uploadText: { flex: 1 },
  categoriesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' },
  categoryCard: { textAlign: 'center', padding: '24px 16px' },
  categoryIcon: { width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(139,92,246,0.15)', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' },
  categoryTitle: { fontSize: '0.875rem', fontWeight: 600, marginBottom: '4px' },
  categoryCount: { fontSize: '0.75rem', color: '#6B7280' },
  infoCard: { display: 'flex', gap: '14px', padding: '18px', alignItems: 'flex-start', background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.15)' },
};
