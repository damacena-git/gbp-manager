'use client';

import { useState } from 'react';
import {
  Tag, Search, Copy, Check, Sparkles, FolderTree,
  Filter, Layers, ArrowRight, ExternalLink
} from 'lucide-react';
import { POPULAR_NICHES, CATEGORIES_DATABASE } from '@/lib/data/google-categories';

export default function CategoriesExplorerPage() {
  const [search, setSearch] = useState('');
  const [selectedSector, setSelectedSector] = useState('Todos');
  const [copiedText, setCopiedText] = useState('');

  const sectors = [
    'Todos',
    'Saúde e Bem-Estar',
    'Alimentação e Bebidas',
    'Serviços Profissionais',
    'Beleza e Cuidados Pessoais',
    'Construção e Reformas',
    'Automotivo',
    'Comércio e Varejo',
    'Imobiliário e Logística',
  ];

  function copy(text) {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(''), 2000);
  }

  // Filter categories
  const filteredCategories = CATEGORIES_DATABASE.filter((c) => {
    const matchSector = selectedSector === 'Todos' || c.sector === selectedSector;
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.sector.toLowerCase().includes(search.toLowerCase());
    return matchSector && matchSearch;
  });

  // Filter popular niches
  const filteredNiches = POPULAR_NICHES.filter((n) => {
    const term = search.toLowerCase();
    return (
      n.niche.toLowerCase().includes(term) ||
      n.primary.toLowerCase().includes(term) ||
      n.secondaries.some((s) => s.toLowerCase().includes(term)) ||
      n.keywords.some((k) => k.toLowerCase().includes(term))
    );
  });

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.pageHeader}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={styles.pageTitle}>Explorador de Categorias Oficiais GBP</h1>
            <span className="badge badge-blue" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Tag size={12} /> Google Meu Negócio
            </span>
          </div>
          <p style={styles.pageSubtitle}>
            Consulte as categorias oficiais em português (pt-BR) e descubra as melhores categorias secundárias para subir no Google Maps
          </p>
        </div>
      </div>

      {/* Search Bar & Sector Filters */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }}
            />
            <input
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquise por nicho, categoria ou palavra-chave (ex: podologia, marketing, pizza, mecânica)..."
              style={{ paddingLeft: '38px', width: '100%' }}
            />
          </div>
        </div>

        {/* Sectors Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {sectors.map((sec) => (
            <button
              key={sec}
              onClick={() => setSelectedSector(sec)}
              className={`tab ${selectedSector === sec ? 'active' : ''}`}
              style={{ fontSize: '0.8125rem', padding: '6px 14px' }}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      {/* Section 1: Top Niches with Recommended Secondary Categories */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Sparkles size={20} style={{ color: '#8B5CF6' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC' }}>
            Nichos Populares & Combinação Ideal de Categorias
          </h2>
        </div>
        <p style={{ fontSize: '0.875rem', color: '#9CA3AF', marginBottom: '16px', marginTop: '-8px' }}>
          No Google Maps, ter a categoria principal correta + até 4 categorias secundárias relevantes é o fator número #1 para ranquear em buscas de múltiplos termos.
        </p>

        <div style={styles.nichesGrid}>
          {filteredNiches.map((n, i) => (
            <div key={i} className="card" style={styles.nicheCard}>
              <div style={styles.nicheHeader}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>{n.niche}</h3>
              </div>

              {/* Primary */}
              <div style={{ marginBottom: '14px' }}>
                <span style={styles.badgeTitle}>CATEGORIA PRIMÁRIA (FATOR #1 MAPS):</span>
                <div style={styles.primaryBadgeBox}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#3B82F6' }}>
                    ⭐ {n.primary}
                  </span>
                  <button
                    onClick={() => copy(n.primary)}
                    className="btn btn-ghost btn-sm"
                    title="Copiar Categoria"
                    style={{ padding: '4px 8px' }}
                  >
                    {copiedText === n.primary ? <Check size={14} style={{ color: '#10B981' }} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* Secondaries */}
              <div>
                <span style={styles.badgeTitle}>CATEGORIAS SECUNDÁRIAS RECOMENDADAS:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {n.secondaries.map((sec, j) => (
                    <span
                      key={j}
                      onClick={() => copy(sec)}
                      className="badge badge-purple"
                      style={{ cursor: 'pointer', padding: '4px 10px', fontSize: '0.75rem' }}
                      title="Clique para copiar"
                    >
                      {sec}
                      {copiedText === sec ? (
                        <Check size={10} style={{ marginLeft: '4px', color: '#10B981' }} />
                      ) : null}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Complete List by Sector */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderTree size={18} style={{ color: '#3B82F6' }} />
            <h3 className="card-title">Todas as Categorias Oficiais ({filteredCategories.length})</h3>
          </div>
          <span style={{ fontSize: '0.8125rem', color: '#9CA3AF' }}>
            Clique em qualquer categoria para copiar o nome exato
          </span>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nome Oficial no Google (pt-BR)</th>
                <th>Setor / Ramo</th>
                <th style={{ width: '100px', textAlign: 'right' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((cat, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600, color: '#F8FAFC' }}>
                    {cat.name}
                  </td>
                  <td>
                    <span className="badge badge-blue">{cat.sector}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => copy(cat.name)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      {copiedText === cat.name ? (
                        <>
                          <Check size={12} style={{ color: '#10B981' }} /> Copiado!
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> Copiar
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { animation: 'fadeIn 0.3s ease-out' },
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
  nichesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '18px',
  },
  nicheCard: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  nicheHeader: {
    borderBottom: '1px solid var(--border-primary)',
    paddingBottom: '12px',
    marginBottom: '14px',
  },
  badgeTitle: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    color: '#9CA3AF',
    display: 'block',
    marginBottom: '6px',
    letterSpacing: '0.05em',
  },
  primaryBadgeBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '8px',
    padding: '8px 12px',
  },
};
