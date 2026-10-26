'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag, Plus, Sparkles, Edit3, Trash2, Tag, DollarSign,
  Search, Filter, ExternalLink, Image as ImageIcon, Check, Save,
  RefreshCw, Building2, Wand2, X, AlertCircle, MessageCircle,
  TrendingDown, Package, Layers, ArrowRight, Loader2, Link2, Eye,
  Zap, Globe, Info
} from 'lucide-react';

export default function ProductsPage() {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [loadingClients, setLoadingClients] = useState(true);

  // Products state
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [savingProducts, setSavingProducts] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);
  const [clientServicesCount, setClientServicesCount] = useState(0);
  const [importingServices, setImportingServices] = useState(false);
  const [extractUrlModalOpen, setExtractUrlModalOpen] = useState(false);
  const [extractUrlInput, setExtractUrlInput] = useState('');
  const [extractingUrl, setExtractingUrl] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modal State for Add / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingProductIndex, setEditingProductIndex] = useState(null);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodPromoPrice, setProdPromoPrice] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodPhotoUrl, setProdPhotoUrl] = useState('');
  const [prodButtonType, setProdButtonType] = useState('ORDER');
  const [prodButtonUrl, setProdButtonUrl] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);

  // Suggest Modal
  const [suggestModalOpen, setSuggestModalOpen] = useState(false);
  const [suggestingAI, setSuggestingAI] = useState(false);
  const [suggestedProducts, setSuggestedProducts] = useState([]);

  // Bulk Import Modal
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [parsingBulk, setParsingBulk] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    setLoadingClients(true);
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      const list = (data.clients || []).filter((c) => c.status === 'active' || !c.status);
      setClients(list);
      if (list.length > 0) {
        setSelectedClientId(list[0].id);
        loadProductsForClient(list[0].id);
      }
    } catch (err) {
      console.error('Error loading clients:', err);
    } finally {
      setLoadingClients(false);
    }
  }

  async function loadProductsForClient(clientId) {
    if (!clientId) return;
    setLoadingProducts(true);
    setSaveSuccessMsg(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/products`);
      const data = await res.json();
      setClientServicesCount(data.services_count || 0);
      if (data.products && Array.isArray(data.products)) {
        const prods = data.products.map((p, idx) => ({
          ...p,
          id: p.id ? String(p.id) : `prod_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        }));
        setProducts(prods);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('Error loading products:', err);
      setProducts([]);
      setClientServicesCount(0);
    } finally {
      setLoadingProducts(false);
    }
  }

  function handleSelectClient(id) {
    setSelectedClientId(id);
    loadProductsForClient(id);
  }

  const activeClient = useMemo(() => {
    return clients.find((c) => c.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  // Categories list
  const categoriesList = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.category && p.category.trim()) set.add(p.category.trim());
    });
    return Array.from(set);
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
      const matchesSearch = !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [products, categoryFilter, searchQuery]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const total = products.length;
    const withPromo = products.filter((p) => p.promo_price && p.promo_price.trim()).length;
    const catsCount = categoriesList.length;

    let sum = 0;
    let validCount = 0;
    products.forEach((p) => {
      if (p.price) {
        const num = parseFloat(p.price.replace(/[^\d.,]/g, '').replace(',', '.'));
        if (!isNaN(num) && num > 0) {
          sum += num;
          validCount++;
        }
      }
    });
    const avgPrice = validCount > 0 ? (sum / validCount).toFixed(2).replace('.', ',') : '0,00';

    return { total, withPromo, catsCount, avgPrice };
  }, [products, categoriesList]);

  // Open Modal for Add
  function openAddModal() {
    setEditingProduct(null);
    setEditingProductIndex(null);
    setProdName('');
    setProdCategory(categoriesList[0] || activeClient?.category || 'Geral');
    setProdPrice('');
    setProdPromoPrice('');
    setProdDescription('');
    setProdPhotoUrl('');
    setProdButtonType('ORDER');
    setProdButtonUrl('');
    setModalOpen(true);
  }

  // Open Modal for Edit
  function openEditModal(prod, index) {
    const prodId = prod.id ? String(prod.id) : `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const norm = { ...prod, id: prodId };
    setEditingProduct(norm);
    setEditingProductIndex(typeof index === 'number' ? index : null);
    setProdName(prod.name || '');
    setProdCategory(prod.category || 'Geral');
    setProdPrice(prod.price || '');
    setProdPromoPrice(prod.promo_price || '');
    setProdDescription(prod.description || '');
    setProdPhotoUrl(prod.photo_url || '');
    setProdButtonType(prod.button_type || 'ORDER');
    setProdButtonUrl(prod.button_url || '');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingProduct(null);
    setEditingProductIndex(null);
  }

  // Generate WhatsApp Link helper
  function applyWhatsAppLinkForProduct(productName) {
    if (!activeClient) return;
    const cleanPhone = (activeClient.phone || '').replace(/\D/g, '');
    if (!cleanPhone) {
      alert('Nenhum número de telefone/WhatsApp cadastrado na ficha deste cliente.');
      return;
    }
    const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(`Olá! Tenho interesse no produto "${productName || 'da sua loja'}" anunciado no Google.`);
    setProdButtonUrl(`https://wa.me/${fullPhone}?text=${msg}`);
    setProdButtonType('ORDER');
  }

  // AI Description Generator
  async function generateDescriptionWithAI() {
    if (!prodName.trim()) {
      alert('Informe o nome do produto primeiro.');
      return;
    }
    if (!selectedClientId) {
      alert('Selecione um cliente primeiro.');
      return;
    }
    setGeneratingAI(true);
    try {
      const res = await fetch(`/api/clients/${selectedClientId}/products/generate-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'single',
          product: {
            name: prodName,
            category: prodCategory,
            price: prodPrice,
            description: prodDescription,
          },
        }),
      });
      const data = await res.json();
      if (data.description) {
        setProdDescription(data.description);
      } else {
        alert(data.error || 'Erro ao gerar descrição com IA.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao gerar descrição.');
    } finally {
      setGeneratingAI(false);
    }
  }

  // Save Modal Product (Local State & DB)
  function handleSaveProductFromModal(e) {
    e.preventDefault();
    if (!prodName.trim()) {
      alert('Nome do produto é obrigatório.');
      return;
    }

    const targetId = editingProduct?.id ? String(editingProduct.id) : `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const newProd = {
      id: targetId,
      name: prodName.trim().slice(0, 58),
      category: prodCategory.trim() || 'Geral',
      price: prodPrice.trim(),
      promo_price: prodPromoPrice.trim(),
      description: prodDescription.trim().slice(0, 1000),
      photo_url: prodPhotoUrl.trim(),
      button_type: prodButtonType,
      button_url: prodButtonUrl.trim(),
      is_active: true,
    };

    let updatedList;
    // 1. If editing by index, update that exact index without duplicating
    if (editingProductIndex !== null && editingProductIndex >= 0 && editingProductIndex < products.length) {
      updatedList = products.map((p, idx) => (idx === editingProductIndex ? newProd : p));
    } else if (editingProduct && editingProduct.id) {
      // 2. If editing by ID, locate existing index
      const existsIndex = products.findIndex((p) => String(p.id) === String(editingProduct.id));
      if (existsIndex >= 0) {
        updatedList = products.map((p, idx) => (idx === existsIndex ? newProd : p));
      } else {
        // Fallback: match by name to avoid accidental duplication
        const nameIndex = products.findIndex((p) => p.name?.trim().toLowerCase() === prodName.trim().toLowerCase());
        if (nameIndex >= 0) {
          updatedList = products.map((p, idx) => (idx === nameIndex ? newProd : p));
        } else {
          updatedList = [newProd, ...products];
        }
      }
    } else {
      // 3. New item: if exact name already exists, update instead of duplicating
      const nameIndex = products.findIndex((p) => p.name?.trim().toLowerCase() === prodName.trim().toLowerCase());
      if (nameIndex >= 0) {
        updatedList = products.map((p, idx) => (idx === nameIndex ? newProd : p));
      } else {
        updatedList = [newProd, ...products];
      }
    }

    setProducts(updatedList);
    closeModal();
    // Auto-save to database
    saveProductsToDatabase(updatedList);
  }

  // Delete Product
  function handleDeleteProduct(id) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    const updated = products.filter((p) => String(p.id) !== String(id));
    setProducts(updated);
    saveProductsToDatabase(updated);
  }

  // Save to DB
  async function saveProductsToDatabase(listToSave = products) {
    if (!selectedClientId) return;
    setSavingProducts(true);
    setSaveSuccessMsg(null);
    try {
      const res = await fetch(`/api/clients/${selectedClientId}/products`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: listToSave }),
      });
      const data = await res.json();
      if (data.success) {
        const savedList = data.products || listToSave;
        setProducts(savedList);
        setSaveSuccessMsg('Produtos sincronizados com sucesso!');
        setTimeout(() => setSaveSuccessMsg(null), 3000);
      } else {
        alert(data.error || 'Erro ao salvar produtos no banco.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao salvar produtos.');
    } finally {
      setSavingProducts(false);
    }
  }

  // Suggest Products for Niche
  async function handleSuggestNicheProducts() {
    if (!selectedClientId) return;
    setSuggestingAI(true);
    setSuggestModalOpen(true);
    try {
      const res = await fetch(`/api/clients/${selectedClientId}/products/generate-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'suggest' }),
      });
      const data = await res.json();
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestedProducts(data.suggestions);
      } else {
        alert(data.error || 'Nenhuma sugestão encontrada.');
        setSuggestModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao buscar sugestões de produtos.');
      setSuggestModalOpen(false);
    } finally {
      setSuggestingAI(false);
    }
  }

  function handleAcceptSuggestions() {
    // Avoid duplicating products that already exist by name
    const existingNames = new Set(products.map((p) => (p.name || '').trim().toLowerCase()));
    const newItems = (suggestedProducts || []).filter((s) => !existingNames.has((s.name || '').trim().toLowerCase()));
    const updated = [...newItems, ...products];
    setProducts(updated);
    setSuggestModalOpen(false);
    saveProductsToDatabase(updated);
  }

  // Parse Bulk Text
  async function handleParseBulkText() {
    if (!bulkText.trim()) {
      alert('Cole o texto da lista de produtos primeiro.');
      return;
    }
    setParsingBulk(true);
    try {
      const res = await fetch(`/api/clients/${selectedClientId}/products/generate-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'parse-raw', rawText: bulkText }),
      });
      const data = await res.json();
      if (data.products && data.products.length > 0) {
        // Avoid duplicating products that already exist by name
        const existingNames = new Set(products.map((p) => (p.name || '').trim().toLowerCase()));
        const newItems = (data.products || []).filter((s) => !existingNames.has((s.name || '').trim().toLowerCase()));
        const updated = [...newItems, ...products];
        setProducts(updated);
        setBulkModalOpen(false);
        setBulkText('');
        saveProductsToDatabase(updated);
      } else {
        alert(data.error || 'Nenhum produto identificado na lista.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao processar lista com IA.');
    } finally {
      setParsingBulk(false);
    }
  }

  // Import existing services as products
  async function handleImportServicesAsProducts() {
    if (!selectedClientId) return;
    setImportingServices(true);
    setSaveSuccessMsg(null);
    try {
      const res = await fetch(`/api/clients/${selectedClientId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import-services' }),
      });
      const data = await res.json();
      if (data.success && data.products) {
        setProducts(data.products);
        setSaveSuccessMsg(data.message || `${data.count} serviço(s) importado(s) como produtos!`);
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      } else {
        alert(data.error || 'Erro ao importar serviços');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao importar serviços');
    } finally {
      setImportingServices(false);
    }
  }

  // Extract products from digital catalog or website URL
  async function handleExtractFromUrl() {
    const urlToUse = (extractUrlInput || activeClient?.website || '').trim();
    if (!urlToUse) {
      alert('Informe uma URL válida do site ou cardápio.');
      return;
    }
    setExtractingUrl(true);
    try {
      const res = await fetch(`/api/clients/${selectedClientId}/products/generate-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'extract-url', url: urlToUse }),
      });
      const data = await res.json();
      if (data.products && data.products.length > 0) {
        const existingNames = new Set(products.map((p) => (p.name || '').trim().toLowerCase()));
        const newItems = (data.products || []).filter((s) => !existingNames.has((s.name || '').trim().toLowerCase()));
        const updated = [...newItems, ...products];
        setProducts(updated);
        setExtractUrlModalOpen(false);
        saveProductsToDatabase(updated);
        setSaveSuccessMsg(`${newItems.length} produto(s) extraído(s) da página com sucesso!`);
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      } else {
        alert(data.error || 'Nenhum produto identificado nesta URL.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao extrair produtos da URL.');
    } finally {
      setExtractingUrl(false);
    }
  }

  return (
    <div style={styles.container}>
      {/* HEADER WITH CLIENT SELECTOR */}
      <div style={styles.headerCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={styles.headerIconBox}>
              <ShoppingBag size={24} color="#3B82F6" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={styles.headerTitle}>Catálogo de Produtos</h1>
                <span style={styles.gbpBadge}>Google Meu Negócio</span>
              </div>
              <p style={styles.headerSubtitle}>
                Gerencie e promova produtos no Google Maps com fotos, preços e descrições persuasivas geradas por Inteligência Artificial.
              </p>
            </div>
          </div>

          {/* CLIENT SELECTOR DROPDOWN */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={styles.clientSelectorBox}>
              <Building2 size={16} color="#9CA3AF" />
              <select
                value={selectedClientId}
                onChange={(e) => handleSelectClient(e.target.value)}
                style={styles.clientSelect}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.business_name} ({c.category || 'Empresa'})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => loadProductsForClient(selectedClientId)}
              disabled={loadingProducts}
              style={styles.refreshBtn}
              title="Recarregar produtos"
            >
              <RefreshCw size={14} className={loadingProducts ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* SUMMARY KPIS */}
        <div style={styles.kpiGrid}>
          <div style={styles.kpiCard}>
            <span style={styles.kpiLabel}>Total de Produtos</span>
            <span style={styles.kpiValue}>
              <Package size={16} color="#3B82F6" />
              {kpis.total}
            </span>
          </div>
          <div style={styles.kpiCard}>
            <span style={styles.kpiLabel}>Categorias Ativas</span>
            <span style={styles.kpiValue}>
              <Layers size={16} color="#A78BFA" />
              {kpis.catsCount}
            </span>
          </div>
          <div style={styles.kpiCard}>
            <span style={styles.kpiLabel}>Com Preço Promocional</span>
            <span style={styles.kpiValue}>
              <TrendingDown size={16} color="#34D399" />
              {kpis.withPromo}
            </span>
          </div>
          <div style={styles.kpiCard}>
            <span style={styles.kpiLabel}>Preço Médio Estimado</span>
            <span style={styles.kpiValue}>
              <DollarSign size={16} color="#FBBF24" />
              R$ {kpis.avgPrice}
            </span>
          </div>
        </div>
      </div>

      {/* ACTION BAR: SEARCH, FILTER & CTA BUTTONS */}
      <div style={styles.actionRow}>
        <div style={{ display: 'flex', gap: '10px', flex: '1 1 320px' }}>
          <div style={styles.searchBox}>
            <Search size={16} color="#9CA3AF" />
            <input
              type="text"
              placeholder="Buscar produtos por nome ou descrição..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <div style={styles.categorySelectBox}>
            <Tag size={15} color="#9CA3AF" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={styles.categorySelect}
            >
              <option value="ALL">Todas as Categorias</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {clientServicesCount > 0 && (
            <button
              onClick={handleImportServicesAsProducts}
              disabled={importingServices}
              style={{
                ...styles.secondaryBtn,
                borderColor: 'rgba(236, 72, 153, 0.45)',
                color: '#F472B6',
                backgroundColor: 'rgba(236, 72, 153, 0.08)',
              }}
              title="Transforma os serviços já cadastrados no Google em produtos com 1 clique"
            >
              <Zap size={14} className={importingServices ? 'animate-spin' : ''} />
              {importingServices ? 'Importando...' : `Importar Serviços (${clientServicesCount})`}
            </button>
          )}

          <button
            onClick={() => {
              setExtractUrlInput(activeClient?.website || '');
              setExtractUrlModalOpen(true);
            }}
            style={styles.secondaryBtn}
            title="Extrair catálogo ou cardápio a partir de uma URL de site com IA"
          >
            <Globe size={14} color="#60A5FA" /> Extrair do Site
          </button>

          <button
            onClick={() => setBulkModalOpen(true)}
            style={styles.secondaryBtn}
            title="Importar lista de produtos colada em texto"
          >
            <Wand2 size={15} color="#A78BFA" /> Importar Lista
          </button>

          <button
            onClick={handleSuggestNicheProducts}
            disabled={suggestingAI}
            style={styles.aiSuggestBtn}
            title="Sugerir produtos de alta demanda para o nicho da empresa"
          >
            <Sparkles size={15} />
            {suggestingAI ? 'Analisando Nicho...' : 'Sugerir com IA'}
          </button>

          <button
            onClick={openAddModal}
            style={styles.primaryBtn}
          >
            <Plus size={16} /> Novo Produto
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {saveSuccessMsg && (
        <div style={styles.successBanner}>
          <Check size={16} /> {saveSuccessMsg}
        </div>
      )}

      {/* EXPLANATORY BANNER ABOUT GBP PRODUCTS API */}
      <div
        style={{
          marginBottom: '20px',
          padding: '12px 16px',
          borderRadius: '10px',
          backgroundColor: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.22)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          fontSize: '0.84rem',
          color: '#93C5FD',
          lineHeight: 1.5,
        }}
      >
        <Info size={18} style={{ color: '#60A5FA', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong style={{ color: '#BFDBFE' }}>Por que os produtos cadastrados no Google não sincronizam automaticamente?</strong> A API oficial do Google Business Profile não disponibiliza endpoint público para o catálogo de "Produtos" (diferente de Serviços, Avaliações, Fotos e Posts). Para listar seus produtos existentes sem digitar do zero, você pode <strong>"Importar Serviços"</strong> (seus serviços viram produtos com 1 clique), <strong>"Extrair do Site com IA"</strong> ou <strong>"Importar Lista"</strong>.
        </div>
      </div>

      {/* HIGHLIGHT BANNER: IMPORT EXISTING SERVICES */}
      {clientServicesCount > 0 && products.length === 0 && (
        <div
          style={{
            marginBottom: '20px',
            padding: '18px 22px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.12) 0%, rgba(139, 92, 246, 0.1) 100%)',
            border: '1px solid rgba(236, 72, 153, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(236, 72, 153, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F472B6',
                flexShrink: 0,
              }}
            >
              <Zap size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: '1.02rem', fontWeight: 700, color: '#FDF2F8', margin: 0 }}>
                Encontramos {clientServicesCount} serviços cadastrados na ficha deste cliente!
              </h4>
              <p style={{ fontSize: '0.84rem', color: '#F9A8D4', marginTop: '3px', margin: 0 }}>
                Importe os serviços existentes diretamente para o catálogo de produtos com nome, descrição, categoria e botão de WhatsApp com 1 clique.
              </p>
            </div>
          </div>
          <button
            onClick={handleImportServicesAsProducts}
            disabled={importingServices}
            style={{
              ...styles.primaryBtn,
              backgroundColor: '#EC4899',
              borderColor: '#EC4899',
            }}
          >
            <RefreshCw size={15} className={importingServices ? 'animate-spin' : ''} />
            {importingServices ? 'Importando...' : `Importar ${clientServicesCount} Serviços como Produtos`}
          </button>
        </div>
      )}

      {/* PRODUCTS CONTENT GRID */}
      {loadingProducts ? (
        <div style={styles.loadingBox}>
          <Loader2 size={32} color="#3B82F6" className="animate-spin" />
          <p style={{ marginTop: '12px', color: '#9CA3AF', fontSize: '0.875rem' }}>Carregando catálogo de produtos...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div style={styles.emptyBox}>
          <ShoppingBag size={48} color="#4B5563" />
          <h3 style={{ margin: '14px 0 6px 0', color: '#F9FAFB', fontSize: '1.125rem' }}>Nenhum produto cadastrado ainda</h3>
          <p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.875rem', maxWidth: '480px', lineHeight: 1.5 }}>
            {searchQuery || categoryFilter !== 'ALL'
              ? 'Nenhum produto corresponde aos filtros aplicados. Tente limpar a busca.'
              : 'Cadastre produtos ou traga seus itens existentes do Google através dos serviços ou extração de site com IA.'}
          </p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '18px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {clientServicesCount > 0 && (
              <button
                onClick={handleImportServicesAsProducts}
                disabled={importingServices}
                style={{
                  ...styles.secondaryBtn,
                  borderColor: 'rgba(236, 72, 153, 0.45)',
                  color: '#F472B6',
                  backgroundColor: 'rgba(236, 72, 153, 0.08)',
                }}
              >
                <Zap size={14} /> Importar {clientServicesCount} Serviços
              </button>
            )}
            <button
              onClick={() => {
                setExtractUrlInput(activeClient?.website || '');
                setExtractUrlModalOpen(true);
              }}
              style={styles.secondaryBtn}
            >
              <Globe size={14} color="#60A5FA" /> Extrair do Site com IA
            </button>
            <button onClick={handleSuggestNicheProducts} style={styles.aiSuggestBtn}>
              <Sparkles size={15} /> Sugerir com IA
            </button>
            <button onClick={openAddModal} style={styles.primaryBtn}>
              <Plus size={15} /> Novo Produto Manual
            </button>
          </div>
        </div>
      ) : (
        <div style={styles.productGrid}>
          {filteredProducts.map((prod) => (
            <div key={prod.id} style={styles.productCard}>
              {/* Product Image / Placeholder */}
              <div style={styles.productImageContainer}>
                {prod.photo_url ? (
                  <img
                    src={prod.photo_url}
                    alt={prod.name}
                    style={styles.productImg}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div style={styles.productPlaceholder}>
                    <Package size={36} color="#6B7280" />
                  </div>
                )}
                <span style={styles.categoryBadge}>{prod.category || 'Geral'}</span>
                {prod.promo_price && (
                  <span style={styles.promoBadge}>Promoção</span>
                )}
              </div>

              {/* Product Body */}
              <div style={styles.productBody}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <h3 style={styles.productTitle} title={prod.name}>{prod.name}</h3>
                  <div style={styles.priceContainer}>
                    {prod.promo_price ? (
                      <>
                        <span style={styles.originalPrice}>R$ {prod.price}</span>
                        <span style={styles.currentPrice}>R$ {prod.promo_price}</span>
                      </>
                    ) : (
                      <span style={styles.currentPrice}>
                        {prod.price ? (prod.price.includes('R$') ? prod.price : `R$ ${prod.price}`) : 'Sob consulta'}
                      </span>
                    )}
                  </div>
                </div>

                <p style={styles.productDesc}>
                  {prod.description || 'Sem descrição cadastrada. Adicione uma descrição comercial para converter mais clientes no Google Meu Negócio.'}
                </p>

                {/* Card Footer with CTA & Actions */}
                <div style={styles.cardFooter}>
                  {prod.button_url ? (
                    <a
                      href={prod.button_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.ctaButton}
                    >
                      <MessageCircle size={14} />
                      {prod.button_type === 'BUY' ? 'Comprar Agora' : prod.button_type === 'LEARN_MORE' ? 'Saiba Mais' : 'Pedir no WhatsApp'}
                      <ExternalLink size={12} style={{ marginLeft: '4px' }} />
                    </a>
                  ) : (
                    <button
                      onClick={() => {
                        const originalIndex = products.findIndex((p) => String(p.id) === String(prod.id));
                        openEditModal(prod, originalIndex >= 0 ? originalIndex : undefined);
                      }}
                      style={styles.addCtaBtn}
                    >
                      <Link2 size={13} /> Adicionar Link/WhatsApp
                    </button>
                  )}

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => {
                        const originalIndex = products.findIndex((p) => String(p.id) === String(prod.id));
                        openEditModal(prod, originalIndex >= 0 ? originalIndex : undefined);
                      }}
                      style={styles.iconBtn}
                      title="Editar produto"
                    >
                      <Edit3 size={15} color="#9CA3AF" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(prod.id)}
                      style={styles.iconBtnDanger}
                      title="Excluir produto"
                    >
                      <Trash2 size={15} color="#EF4444" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: ADD / EDIT PRODUCT */}
      {modalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ ...styles.headerIconBox, width: '36px', height: '36px' }}>
                  <ShoppingBag size={18} color="#3B82F6" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.125rem', color: '#F9FAFB', fontWeight: 700 }}>
                  {editingProduct ? 'Editar Produto' : 'Novo Produto para o Google Meu Negócio'}
                </h3>
              </div>
              <button onClick={closeModal} style={styles.closeBtn}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProductFromModal} style={styles.modalForm}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={styles.inputLabel}>Nome do Produto * (até 58 chars)</label>
                  <input
                    type="text"
                    required
                    maxLength={58}
                    placeholder="Ex: Creme Hidratante com 10% Ureia"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    style={styles.formInput}
                  />
                  <span style={{ fontSize: '0.6875rem', color: '#6B7280', display: 'block', marginTop: '3px' }}>
                    {prodName.length}/58 caracteres
                  </span>
                </div>

                <div>
                  <label style={styles.inputLabel}>Categoria do Produto</label>
                  <input
                    type="text"
                    placeholder="Ex: Cuidados com os Pés, Acessórios, Órteses"
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    style={styles.formInput}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={styles.inputLabel}>Preço Regular (R$)</label>
                  <input
                    type="text"
                    placeholder="Ex: 59,90"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    style={styles.formInput}
                  />
                </div>
                <div>
                  <label style={styles.inputLabel}>Preço Promocional (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: 49,90"
                    value={prodPromoPrice}
                    onChange={(e) => setProdPromoPrice(e.target.value)}
                    style={styles.formInput}
                  />
                </div>
              </div>

              <div>
                <label style={styles.inputLabel}>URL da Foto do Produto</label>
                <input
                  type="url"
                  placeholder="https://exemplo.com/fotos/produto.jpg"
                  value={prodPhotoUrl}
                  onChange={(e) => setProdPhotoUrl(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              {/* Action Button & WhatsApp generator */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={styles.inputLabel}>Tipo de Botão (CTA)</label>
                  <select
                    value={prodButtonType}
                    onChange={(e) => setProdButtonType(e.target.value)}
                    style={styles.formInput}
                  >
                    <option value="ORDER">Fazer Pedido / WhatsApp</option>
                    <option value="BUY">Comprar Online</option>
                    <option value="LEARN_MORE">Saiba Mais</option>
                    <option value="GET_OFFER">Ver Oferta</option>
                  </select>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ ...styles.inputLabel, margin: 0 }}>Link de Destino / Pedido</label>
                    <button
                      type="button"
                      onClick={() => applyWhatsAppLinkForProduct(prodName)}
                      style={styles.linkShortcutBtn}
                    >
                      <MessageCircle size={12} /> Gerar WhatsApp
                    </button>
                  </div>
                  <input
                    type="url"
                    placeholder="https://wa.me/... ou https://loja.com/..."
                    value={prodButtonUrl}
                    onChange={(e) => setProdButtonUrl(e.target.value)}
                    style={styles.formInput}
                  />
                </div>
              </div>

              {/* Description with AI generation */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={styles.inputLabel}>
                    Descrição do Produto (até 1.000 caracteres no Google)
                  </label>
                  <button
                    type="button"
                    onClick={generateDescriptionWithAI}
                    disabled={generatingAI}
                    style={styles.aiWriteBtn}
                  >
                    {generatingAI ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    {generatingAI ? 'Gerando...' : '✨ Escrever com IA (Gemini)'}
                  </button>
                </div>
                <textarea
                  rows={4}
                  maxLength={1000}
                  placeholder="Destaque os benefícios, modo de usar, ativos e chamada para compra do produto..."
                  value={prodDescription}
                  onChange={(e) => setProdDescription(e.target.value)}
                  style={styles.formTextarea}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.6875rem', color: '#6B7280' }}>
                    Diretriz Google: Ideal entre 350 e 750 caracteres com alta persuasão.
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: prodDescription.length > 950 ? '#EF4444' : '#9CA3AF' }}>
                    {prodDescription.length}/1.000
                  </span>
                </div>
              </div>

              {/* Modal Actions */}
              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={styles.cancelBtn}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingProducts}
                  style={styles.submitBtn}
                >
                  <Check size={16} /> {editingProduct ? 'Salvar Alterações' : 'Adicionar ao Catálogo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUGGEST PRODUCTS */}
      {suggestModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalCard, maxWidth: '640px' }}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={20} color="#A78BFA" />
                <h3 style={{ margin: 0, fontSize: '1.125rem', color: '#F9FAFB', fontWeight: 700 }}>
                  Sugestões de Produtos para {activeClient?.category || 'seu Nicho'}
                </h3>
              </div>
              <button onClick={() => setSuggestModalOpen(false)} style={styles.closeBtn}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: '0.875rem', color: '#9CA3AF', margin: '0 0 16px 0' }}>
                A IA analisou os produtos físicos mais buscados e de maior margem de lucro para estabelecimentos do nicho no Google Maps:
              </p>

              {suggestingAI ? (
                <div style={{ textAlign: 'center', padding: '30px' }}>
                  <Loader2 size={32} color="#A78BFA" className="animate-spin" />
                  <p style={{ marginTop: '12px', color: '#C4B5FD', fontSize: '0.875rem' }}>Identificando produtos recomendados...</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto' }}>
                  {suggestedProducts.map((p, idx) => (
                    <div key={idx} style={styles.suggestItemCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '0.9375rem', color: '#F9FAFB' }}>{p.name}</strong>
                          <span style={styles.miniCategoryBadge}>{p.category}</span>
                        </div>
                        <span style={styles.suggestPriceBadge}>R$ {p.price}</span>
                      </div>
                      <p style={{ margin: '6px 0 0 0', fontSize: '0.8125rem', color: '#9CA3AF', lineHeight: 1.4 }}>
                        {p.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button onClick={() => setSuggestModalOpen(false)} style={styles.cancelBtn}>
                  Fechar
                </button>
                <button
                  onClick={handleAcceptSuggestions}
                  disabled={suggestingAI || suggestedProducts.length === 0}
                  style={styles.primaryBtn}
                >
                  <Check size={16} /> Adicionar Todos ao Catálogo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BULK IMPORT RAW TEXT */}
      {bulkModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalCard, maxWidth: '600px' }}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Wand2 size={20} color="#A78BFA" />
                <h3 style={{ margin: 0, fontSize: '1.125rem', color: '#F9FAFB', fontWeight: 700 }}>
                  Importação Rápida de Produtos com IA
                </h3>
              </div>
              <button onClick={() => setBulkModalOpen(false)} style={styles.closeBtn}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: '0.875rem', color: '#9CA3AF', margin: '0 0 12px 0' }}>
                Cole uma lista com os nomes e preços dos seus produtos (um por linha). A Inteligência Artificial irá identificar cada item, categorizar e gerar a descrição comercial otimizada automaticamente:
              </p>

              <textarea
                rows={6}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Exemplo:&#10;Creme de Ureia 10% - R$ 49,90&#10;Palmilha Ortopédica Silicone - R$ 89,90&#10;Spray Antifúngico Higienizador - R$ 35,00"
                style={styles.formTextarea}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button onClick={() => setBulkModalOpen(false)} style={styles.cancelBtn}>
                  Cancelar
                </button>
                <button
                  onClick={handleParseBulkText}
                  disabled={parsingBulk || !bulkText.trim()}
                  style={styles.primaryBtn}
                >
                  {parsingBulk ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {parsingBulk ? 'Processando com IA...' : 'Processar e Adicionar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: EXTRACT PRODUCTS FROM URL */}
      {extractUrlModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalCard, maxWidth: '580px' }}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Globe size={20} color="#60A5FA" />
                <h3 style={{ margin: 0, fontSize: '1.125rem', color: '#F9FAFB', fontWeight: 700 }}>
                  Extrair Produtos do Site com IA
                </h3>
              </div>
              <button onClick={() => setExtractUrlModalOpen(false)} style={styles.closeBtn}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: '0.875rem', color: '#9CA3AF', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                Informe a URL do site da empresa, loja online ou cardápio digital (ex: iFood, Anota AI, Goomer, e-commerce próprio). A IA irá acessar a página e extrair nomes, descrições e preços para a sua vitrine:
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label style={styles.inputLabel}>URL do Site ou Cardápio</label>
                <input
                  type="url"
                  placeholder="https://suaempresa.com.br/cardapio-ou-catalogo"
                  value={extractUrlInput}
                  onChange={(e) => setExtractUrlInput(e.target.value)}
                  style={styles.textInput}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button onClick={() => setExtractUrlModalOpen(false)} style={styles.cancelBtn}>
                  Cancelar
                </button>
                <button
                  onClick={handleExtractFromUrl}
                  disabled={extractingUrl || !extractUrlInput.trim()}
                  style={styles.primaryBtn}
                >
                  {extractingUrl ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {extractingUrl ? 'Acessando e Extraindo...' : 'Extrair com IA'}
                </button>
              </div>
            </div>
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
    margin: '4px 0 0 0',
  },
  gbpBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#60A5FA',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    fontSize: '0.6875rem',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '6px',
  },
  clientSelectorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '10px',
    padding: '6px 12px',
  },
  clientSelect: {
    background: 'none',
    border: 'none',
    color: '#F9FAFB',
    fontSize: '0.875rem',
    fontWeight: 600,
    outline: 'none',
    cursor: 'pointer',
  },
  refreshBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#E5E7EB',
    padding: '8px 12px',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  },
  kpiCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '10px',
    padding: '12px 14px',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  kpiLabel: {
    fontSize: '0.6875rem',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: 600,
  },
  kpiValue: {
    fontSize: '1.125rem',
    color: '#F9FAFB',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '20px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#111827',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '10px',
    padding: '8px 14px',
    flex: '1 1 200px',
  },
  searchInput: {
    background: 'none',
    border: 'none',
    color: '#F9FAFB',
    fontSize: '0.875rem',
    width: '100%',
    outline: 'none',
  },
  categorySelectBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#111827',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '10px',
    padding: '8px 12px',
  },
  categorySelect: {
    background: 'none',
    border: 'none',
    color: '#F9FAFB',
    fontSize: '0.8125rem',
    outline: 'none',
    cursor: 'pointer',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#2563EB',
    color: '#fff',
    border: 'none',
    padding: '9px 16px',
    borderRadius: '10px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  aiSuggestBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    border: '1px solid rgba(139, 92, 246, 0.35)',
    color: '#DDD6FE',
    padding: '9px 16px',
    borderRadius: '10px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#E5E7EB',
    padding: '9px 14px',
    borderRadius: '10px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  successBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#34D399',
    padding: '10px 16px',
    borderRadius: '10px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
  },
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  productCard: {
    backgroundColor: '#111827',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.15s ease',
  },
  productImageContainer: {
    width: '100%',
    height: '160px',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    position: 'relative',
    overflow: 'hidden',
  },
  productImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  productPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  categoryBadge: {
    position: 'absolute',
    top: '10px',
    left: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(6px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#E5E7EB',
    fontSize: '0.6875rem',
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: '6px',
  },
  promoBadge: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    backgroundColor: '#EF4444',
    color: '#fff',
    fontSize: '0.6875rem',
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: '6px',
    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
  },
  productBody: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    gap: '10px',
  },
  productTitle: {
    margin: 0,
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: '#F9FAFB',
    lineHeight: 1.3,
  },
  priceContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  originalPrice: {
    fontSize: '0.6875rem',
    color: '#9CA3AF',
    textDecoration: 'line-through',
  },
  currentPrice: {
    fontSize: '0.9375rem',
    fontWeight: 800,
    color: '#10B981',
  },
  productDesc: {
    fontSize: '0.8125rem',
    color: '#9CA3AF',
    margin: 0,
    lineHeight: 1.4,
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    flex: 1,
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    gap: '8px',
  },
  ctaButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#34D399',
    fontSize: '0.75rem',
    fontWeight: 700,
    padding: '6px 10px',
    borderRadius: '8px',
    textDecoration: 'none',
    transition: 'all 0.15s ease',
  },
  addCtaBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px dashed rgba(255, 255, 255, 0.15)',
    color: '#9CA3AF',
    fontSize: '0.6875rem',
    padding: '6px 8px',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  iconBtn: {
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  iconBtnDanger: {
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  loadingBox: {
    padding: '60px 20px',
    textAlign: 'center',
  },
  emptyBox: {
    padding: '60px 20px',
    textAlign: 'center',
    backgroundColor: '#111827',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px',
  },
  modalCard: {
    backgroundColor: '#111827',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '560px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
  },
  modalHeader: {
    padding: '18px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#9CA3AF',
    cursor: 'pointer',
  },
  modalForm: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  inputLabel: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#D1D5DB',
    marginBottom: '6px',
  },
  formInput: {
    width: '100%',
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    color: '#F9FAFB',
    fontSize: '0.8125rem',
    boxSizing: 'border-box',
    outline: 'none',
  },
  formTextarea: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    color: '#F9FAFB',
    fontSize: '0.8125rem',
    fontFamily: 'inherit',
    lineHeight: 1.4,
    resize: 'vertical',
    boxSizing: 'border-box',
    outline: 'none',
  },
  linkShortcutBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#34D399',
    fontSize: '0.6875rem',
    padding: '2px 8px',
    borderRadius: '6px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  aiWriteBtn: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    color: '#DDD6FE',
    fontSize: '0.6875rem',
    padding: '2px 8px',
    borderRadius: '6px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    paddingTop: '10px',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  },
  cancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#D1D5DB',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  submitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#2563EB',
    color: '#fff',
    border: 'none',
    padding: '8px 18px',
    borderRadius: '8px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  suggestItemCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    padding: '12px 14px',
  },
  miniCategoryBadge: {
    marginLeft: '8px',
    fontSize: '0.6875rem',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    color: '#9CA3AF',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  suggestPriceBadge: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#10B981',
  },
};
