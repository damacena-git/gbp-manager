'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, MapPin, Phone, Globe, Star, FileText, Image as ImageIcon,
  BarChart3, Edit3, Save, RefreshCw, ExternalLink, Calendar, Sparkles,
  Clock, CheckCircle2, XCircle, TrendingUp, AlertTriangle, ArrowRight, Send,
  Mail, MessageCircle, Plus, Trash2, Tag, Building2,
  Briefcase, Camera, Upload, Lightbulb, Check, DollarSign, Wrench,
  Eye, Zap, Search, Target, Users, Trophy,
  Compass, Layers, Sliders, CheckCheck, FileCheck, ThumbsUp, X, Loader2,
  ShoppingBag, Package, Info
} from 'lucide-react';
import { POPULAR_NICHES, CATEGORIES_DATABASE } from '@/lib/data/google-categories';
import { getCoordinatesForCity, generateSeoFilename, generateSeoAltText, injectExifToDataUrl } from '@/lib/seo/photo-optimizer';
import GooglePostModal from '@/components/posts/GooglePostModal';
import ImageEditorModal from '@/components/media/ImageEditorModal';

function Instagram({ size = 16, style, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

function Facebook({ size = 16, style, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  );
}

function Linkedin({ size = 16, style, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
      <rect width="4" height="12" x="2" y="9"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  );
}

function Youtube({ size = 16, style, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/>
      <polygon points="10 15 15 12 10 9 10 15" fill="currentColor"/>
    </svg>
  );
}

const WEEKDAYS = [
  { id: 'segunda', label: 'Segunda-feira' },
  { id: 'terca', label: 'Terça-feira' },
  { id: 'quarta', label: 'Quarta-feira' },
  { id: 'quinta', label: 'Quinta-feira' },
  { id: 'sexta', label: 'Sexta-feira' },
  { id: 'sabado', label: 'Sábado' },
  { id: 'domingo', label: 'Domingo' },
];

function formatSocialUrl(val, domain) {
  if (!val) return '';
  if (val.startsWith('http://') || val.startsWith('https://')) return val;
  if (val.startsWith('@')) return `https://${domain}/${val.replace('@', '')}`;
  return `https://${domain}/${val}`;
}

function formatDisplayAddress(addr) {
  if (!addr) return '';
  if (typeof addr === 'string') {
    try {
      const p = JSON.parse(addr);
      return p.formattedAddress || [p.addressLines?.join(', '), p.locality, p.administrativeArea].filter(Boolean).join(' - ') || addr;
    } catch {
      return addr;
    }
  }
  return addr.formattedAddress || [addr.addressLines?.join(', '), addr.locality, addr.administrativeArea].filter(Boolean).join(' - ') || '';
}

function getClientLogo(client) {
  if (client?.logo_url) return client.logo_url;
  if (client?.website) {
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

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState(null);
  const [posts, setPosts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'edit' | 'seo' | 'posts' | 'reviews'
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Form edit data
  const [editData, setEditData] = useState({});
  const [savingFull, setSavingFull] = useState(false);
  const [saveResultMsg, setSaveResultMsg] = useState(null);
  const [newSecCat, setNewSecCat] = useState('');

  // SEO Audit states
  const [seoAudit, setSeoAudit] = useState(null);
  const [loadingSeo, setLoadingSeo] = useState(false);
  const [editedDesc, setEditedDesc] = useState('');
  const [applyingSeo, setApplyingSeo] = useState(false);
  const [seoApplyResult, setSeoApplyResult] = useState(null);

  // Services states
  const [services, setServices] = useState([]);
  const [servicesTargetNeighborhoods, setServicesTargetNeighborhoods] = useState('');
  const [rawBulkServicesText, setRawBulkServicesText] = useState('');
  const [parsingBulkServices, setParsingBulkServices] = useState(false);
  const [suggestedServiceDesc, setSuggestedServiceDesc] = useState({}); // { [serviceId]: string }
  const [generatingAiServiceId, setGeneratingAiServiceId] = useState(null);
  const [generatingBulkServices, setGeneratingBulkServices] = useState(false);
  const [suggestingServices, setSuggestingServices] = useState(false);
  const [savingServices, setSavingServices] = useState(false);
  const [servicesSaveMsg, setServicesSaveMsg] = useState(null);

  // Products states
  const [products, setProducts] = useState([]);
  const [savingProducts, setSavingProducts] = useState(false);
  const [productsSaveMsg, setProductsSaveMsg] = useState(null);
  const [prodModalOpen, setProdModalOpen] = useState(false);
  const [editingProd, setEditingProd] = useState(null);
  const [editingProdIndex, setEditingProdIndex] = useState(null);
  const [formProdName, setFormProdName] = useState('');
  const [formProdCategory, setFormProdCategory] = useState('');
  const [formProdPrice, setFormProdPrice] = useState('');
  const [formProdPromoPrice, setFormProdPromoPrice] = useState('');
  const [formProdDescription, setFormProdDescription] = useState('');
  const [formProdPhotoUrl, setFormProdPhotoUrl] = useState('');
  const [formProdButtonType, setFormProdButtonType] = useState('ORDER');
  const [formProdButtonUrl, setFormProdButtonUrl] = useState('');
  const [generatingProdAi, setGeneratingProdAi] = useState(false);
  const [prodSuggestModalOpen, setProdSuggestModalOpen] = useState(false);
  const [suggestingProdAi, setSuggestingProdAi] = useState(false);
  const [suggestedProdList, setSuggestedProdList] = useState([]);
  const [prodBulkModalOpen, setProdBulkModalOpen] = useState(false);
  const [prodBulkText, setProdBulkText] = useState('');
  const [parsingProdBulk, setParsingProdBulk] = useState(false);
  const [prodSearchTerm, setProdSearchTerm] = useState('');
  const [prodCategoryFilter, setProdCategoryFilter] = useState('ALL');
  const [importingServicesAsProds, setImportingServicesAsProds] = useState(false);
  const [extractUrlModalOpen, setExtractUrlModalOpen] = useState(false);
  const [extractUrlInput, setExtractUrlInput] = useState('');
  const [extractingUrlProds, setExtractingUrlProds] = useState(false);

  // Business Profile Description AI states
  const [generatingDescAi, setGeneratingDescAi] = useState(false);
  const [descAiTone, setDescAiTone] = useState('persuasivo');
  const [descAiDifferential, setDescAiDifferential] = useState('');
  const [showDescAiPanel, setShowDescAiPanel] = useState(false);
  const [descAiPreview, setDescAiPreview] = useState(null);
  const [descAiMsg, setDescAiMsg] = useState(null);

  // Photos states with Geo-tagging & EXIF
  const [photos, setPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingBulkPhotos, setUploadingBulkPhotos] = useState(false);
  const [bulkUploadProgress, setBulkUploadProgress] = useState(null);
  const [pendingUploadFiles, setPendingUploadFiles] = useState([]);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoCategory, setNewPhotoCategory] = useState('PRODUCT');
  const [newPhotoAlt, setNewPhotoAlt] = useState('');
  const [photoCategoryFilter, setPhotoCategoryFilter] = useState('ALL');
  const [geoLat, setGeoLat] = useState(-25.4284);
  const [geoLng, setGeoLng] = useState(-49.2733);
  const [geoCity, setGeoCity] = useState('');
  const [autoInjectExif, setAutoInjectExif] = useState(true);
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [isPhotoEditorOpen, setIsPhotoEditorOpen] = useState(false);
  const [savingEditedPhoto, setSavingEditedPhoto] = useState(false);

  // Searches & Keywords states
  const [searchesData, setSearchesData] = useState(null);
  const [loadingSearches, setLoadingSearches] = useState(false);
  const [searchesAiAnalysis, setSearchesAiAnalysis] = useState(null);
  const [analyzingSearchesAi, setAnalyzingSearchesAi] = useState(false);
  const [searchTermFilter, setSearchTermFilter] = useState('');
  const [searchTypeFilter, setSearchTypeFilter] = useState('all'); // 'all' | 'direct' | 'discovery' | 'local'

  // Competitor Analysis states
  const [competitorData, setCompetitorData] = useState(null);
  const [loadingCompetitors, setLoadingCompetitors] = useState(false);
  const [completedQuickWins, setCompletedQuickWins] = useState([]);

  // Bulk Posts states
  const [bulkPostsQueue, setBulkPostsQueue] = useState([]);
  const [showBulkPostCreator, setShowBulkPostCreator] = useState(false);
  const [bulkAiCount, setBulkAiCount] = useState(5);
  const [bulkAiFocus, setBulkAiFocus] = useState('');
  const [bulkAiInterval, setBulkAiInterval] = useState(3);
  const [bulkAiStartDate, setBulkAiStartDate] = useState('');
  const [generatingBulkPosts, setGeneratingBulkPosts] = useState(false);
  const [savingBulkPosts, setSavingBulkPosts] = useState(false);
  const [bulkPostsMsg, setBulkPostsMsg] = useState(null);
  const [publishingPostId, setPublishingPostId] = useState(null);
  const [postsFilter, setPostsFilter] = useState('all'); // 'all' | 'scheduled' | 'published' | 'draft'
  const [showGooglePostModal, setShowGooglePostModal] = useState(false);
  const [postToEdit, setPostToEdit] = useState(null);

  useEffect(() => {
    loadClientData();
  }, [params.id]);

  useEffect(() => {
    if (activeTab === 'searches' && !searchesData && !loadingSearches) {
      loadSearchesData();
    }
    if (activeTab === 'competitors' && !competitorData && !loadingCompetitors) {
      loadCompetitorAnalysis();
    }
    if (activeTab === 'seo' && !seoAudit && !loadingSeo) {
      loadSeoAudit(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (client) {
      let locality = '';
      let state = '';
      if (client.address) {
        try {
          const addr = typeof client.address === 'string' ? JSON.parse(client.address) : client.address;
          locality = addr.locality || '';
          state = addr.administrativeArea || '';
        } catch {}
      }
      const coords = getCoordinatesForCity(locality, state);
      setGeoLat(coords.lat);
      setGeoLng(coords.lng);
      setGeoCity(locality || coords.state || 'Brasil');
    }
  }, [client]);

  function normalizeClient(found) {
    if (!found) return null;
    const rawSocial = typeof found.social_links === 'string'
      ? JSON.parse(found.social_links)
      : (found.social_links || {});

    const normalizedSocials = {
      whatsapp: rawSocial?.whatsapp || '',
      instagram: rawSocial?.instagram || '',
      facebook: rawSocial?.facebook || '',
      linkedin: rawSocial?.linkedin || '',
      youtube: rawSocial?.youtube || '',
    };

    const secCats = Array.isArray(found.secondary_categories)
      ? found.secondary_categories
      : (typeof found.secondary_categories === 'string' ? JSON.parse(found.secondary_categories || '[]') : []);

    const rawHours = typeof found.opening_hours === 'string'
      ? JSON.parse(found.opening_hours)
      : (found.opening_hours || null);

    const rawProducts = typeof found.products === 'string'
      ? JSON.parse(found.products || '[]')
      : (found.products || []);

    const normalizedProducts = (Array.isArray(rawProducts) ? rawProducts : []).map((p, idx) => ({
      ...p,
      id: p.id ? String(p.id) : `prod_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      name: (p.name || '').trim().slice(0, 58),
      category: (p.category || 'Geral').trim(),
      price: (p.price || '').trim(),
      promo_price: (p.promo_price || '').trim(),
      description: (p.description || '').trim().slice(0, 1000),
      photo_url: (p.photo_url || '').trim(),
      button_type: p.button_type || 'ORDER',
      button_url: (p.button_url || '').trim(),
      is_active: p.is_active !== false,
    }));

    return {
      ...found,
      logo_url: found.logo_url || '',
      email: found.email || '',
      social_links: normalizedSocials,
      secondary_categories: secCats,
      products: normalizedProducts,
      opening_hours: rawHours || {
        segunda: { open: '08:00', close: '18:00', closed: false },
        terca: { open: '08:00', close: '18:00', closed: false },
        quarta: { open: '08:00', close: '18:00', closed: false },
        quinta: { open: '08:00', close: '18:00', closed: false },
        sexta: { open: '08:00', close: '18:00', closed: false },
        sabado: { open: '08:00', close: '12:00', closed: false },
        domingo: { open: '08:00', close: '12:00', closed: true },
      },
    };
  }

  async function syncGoogle() {
    setSyncing(true);
    try {
      const res = await fetch('/api/clients/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: params.id }),
      });
      const data = await res.json();
      if (data.success) {
        await loadClientData();
      } else {
        alert(data.error || 'Erro ao sincronizar');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao sincronizar');
    } finally {
      setSyncing(false);
    }
  }

  async function loadClientData() {
    setLoading(true);
    try {
      // 1. Fetch single client data FAST (<5ms)
      const res = await fetch(`/api/clients/${params.id}`);
      const data = await res.json();
      if (data.client) {
        const norm = normalizeClient(data.client);
        setClient(norm);
        setEditData(norm);
        if (norm.products && Array.isArray(norm.products) && norm.products.length > 0) {
          setProducts(norm.products);
        }
        if (norm.address?.sublocality) {
          setServicesTargetNeighborhoods((prev) => prev || norm.address.sublocality);
        }
      } else {
        // Fallback: try list if single route returned 404
        const fallbackRes = await fetch('/api/clients');
        const fallbackData = await fallbackRes.json();
        const found = (fallbackData.clients || []).find((c) => c.id === params.id);
        if (found) {
          const norm = normalizeClient(found);
          setClient(norm);
          setEditData(norm);
          if (norm.products && Array.isArray(norm.products) && norm.products.length > 0) {
            setProducts(norm.products);
          }
          if (norm.address?.sublocality) {
            setServicesTargetNeighborhoods((prev) => prev || norm.address.sublocality);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching client info:', err);
    } finally {
      // Unblock page immediately!
      setLoading(false);
    }

    // 2. Fetch secondary data asynchronously in background without blocking
    Promise.allSettled([
      fetch(`/api/posts?clientId=${params.id}`).then((r) => r.json()),
      fetch(`/api/reviews?clientId=${params.id}`).then((r) => r.json()),
      fetch(`/api/clients/${params.id}/services`).then((r) => r.json()),
      fetch(`/api/clients/${params.id}/photos`).then((r) => r.json()),
      fetch(`/api/clients/${params.id}/products`).then((r) => r.json()),
    ]).then(([postsRes, reviewsRes, servicesRes, photosRes, productsRes]) => {
      if (postsRes.status === 'fulfilled' && postsRes.value?.posts) {
        setPosts(postsRes.value.posts);
      }
      if (reviewsRes.status === 'fulfilled' && reviewsRes.value?.reviews) {
        setReviews(reviewsRes.value.reviews);
      }
      if (servicesRes.status === 'fulfilled' && servicesRes.value?.services) {
        setServices(servicesRes.value.services);
      }
      if (photosRes.status === 'fulfilled' && photosRes.value?.photos) {
        setPhotos(photosRes.value.photos);
      }
      if (productsRes.status === 'fulfilled' && Array.isArray(productsRes.value?.products)) {
        const fetchedProds = productsRes.value.products.map((p, idx) => ({
          ...p,
          id: p.id ? String(p.id) : `prod_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        }));
        setProducts(fetchedProds);
      }
    });
  }

  async function loadSearchesData(force = false) {
    if (searchesData && !force) return;
    setLoadingSearches(true);
    try {
      const res = await fetch(`/api/clients/${params.id}/searches`);
      const data = await res.json();
      if (data?.success) {
        setSearchesData(data);
        if (data.aiAnalysis) {
          setSearchesAiAnalysis(data.aiAnalysis);
        } else if (data.keywords && data.keywords.length > 0 && !searchesAiAnalysis) {
          // Trigger first analysis automatically so it gets saved to the database on first visit
          triggerInitialSearchesAi(data.keywords);
        }
      }
    } catch (err) {
      console.error('Error fetching searches:', err);
    } finally {
      setLoadingSearches(false);
    }
  }

  async function triggerInitialSearchesAi(keywordsList) {
    if (!keywordsList || keywordsList.length === 0 || analyzingSearchesAi) return;
    setAnalyzingSearchesAi(true);
    try {
      const res = await fetch(`/api/clients/${params.id}/searches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: keywordsList,
          businessName: client?.business_name,
          category: client?.category,
        }),
      });
      const data = await res.json();
      if (data.analysis) {
        setSearchesAiAnalysis(data.analysis);
      }
    } catch (err) {
      console.error('Error in triggerInitialSearchesAi:', err);
    } finally {
      setAnalyzingSearchesAi(false);
    }
  }

  async function loadCompetitorAnalysis(force = false) {
    if (competitorData && !force) return;
    setLoadingCompetitors(true);
    try {
      const url = force ? `/api/clients/${params.id}/competitors?refresh=true` : `/api/clients/${params.id}/competitors`;
      const res = await fetch(url);
      const data = await res.json();
      if (data?.success) {
        setCompetitorData(data);
      } else {
        alert(data?.error || 'Erro ao carregar análise de concorrentes');
      }
    } catch (err) {
      console.error('Error fetching competitor analysis:', err);
    } finally {
      setLoadingCompetitors(false);
    }
  }

  function toggleQuickWin(id) {
    setCompletedQuickWins((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function addSuggestedCategory(catName) {
    if (!catName) return;
    const current = editData.secondary_categories || [];
    if (!current.includes(catName)) {
      const updatedCats = [...current, catName];
      setEditData({ ...editData, secondary_categories: updatedCats });
      if (client) {
        setClient({ ...client, secondary_categories: updatedCats });
      }
      alert(`Categoria "${catName}" adicionada às categorias secundárias! Não se esqueça de clicar em "Salvar e Aplicar no Google" na aba "Editar Ficha Completa".`);
    } else {
      alert(`A categoria "${catName}" já está adicionada nesta ficha.`);
    }
  }

  async function saveClientFull(syncGoogle = true) {
    if (!client?.id) return;
    setSavingFull(true);
    setSaveResultMsg(null);

    try {
      const res = await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: client.id,
          business_name: editData.business_name,
          logo_url: editData.logo_url || '',
          category: editData.category,
          secondary_categories: editData.secondary_categories || [],
          description: editData.description || '',
          phone: editData.phone || '',
          email: editData.email || '',
          website: editData.website || '',
          address: editData.address || {},
          social_links: editData.social_links || {},
          opening_hours: editData.opening_hours || {},
          sync_google: syncGoogle,
        }),
      });

      const data = await res.json();
      if (data.client) {
        const rawSocial = typeof data.client.social_links === 'string'
          ? JSON.parse(data.client.social_links)
          : (data.client.social_links || {});
        const normalizedSocials = {
          whatsapp: rawSocial?.whatsapp || '',
          instagram: rawSocial?.instagram || '',
          facebook: rawSocial?.facebook || '',
          linkedin: rawSocial?.linkedin || '',
          youtube: rawSocial?.youtube || '',
        };
        const secCats = Array.isArray(data.client.secondary_categories)
          ? data.client.secondary_categories
          : (typeof data.client.secondary_categories === 'string' ? JSON.parse(data.client.secondary_categories || '[]') : []);
        const rawHours = typeof data.client.opening_hours === 'string'
          ? JSON.parse(data.client.opening_hours)
          : (data.client.opening_hours || editData.opening_hours);

        const updated = {
          ...data.client,
          email: data.client.email || '',
          social_links: normalizedSocials,
          secondary_categories: secCats,
          opening_hours: rawHours,
        };

        setClient(updated);
        setEditData(updated);

        if (data.googleUpdated) {
          setSaveResultMsg({
            type: 'success',
            text: 'Ficha e alterações atualizadas no Google Meu Negócio com sucesso! 🎉',
          });
        } else if (data.googleWarning) {
          setSaveResultMsg({
            type: 'warning',
            text: `Dados salvos localmente, mas o Google reportou: ${data.googleWarning}`,
          });
        } else {
          setSaveResultMsg({
            type: 'success',
            text: 'Dados da ficha salvos no sistema com sucesso!',
          });
        }
      } else {
        setSaveResultMsg({
          type: 'error',
          text: data.error || 'Falha ao salvar as alterações.',
        });
      }
    } catch (err) {
      console.error('Error saving full client:', err);
      setSaveResultMsg({
        type: 'error',
        text: 'Erro de conexão ao salvar ficha.',
      });
    } finally {
      setSavingFull(false);
    }
  }

  async function loadSeoAudit(force = false) {
    setLoadingSeo(true);
    if (force) setSeoAudit(null);
    setSeoApplyResult(null);
    try {
      const url = force ? `/api/clients/${params.id}/seo-audit?refresh=true` : `/api/clients/${params.id}/seo-audit`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.error && data.score !== undefined) {
        setSeoAudit(data);
        setEditedDesc(data.aiSuggestions?.optimizedDescription || data.client?.description || '');
      }
    } catch (err) {
      console.error('Error loading SEO audit:', err);
    } finally {
      setLoadingSeo(false);
    }
  }

  async function applySeoChanges() {
    if (!client?.id) return;
    setApplyingSeo(true);
    setSeoApplyResult(null);
    try {
      const res = await fetch(`/api/clients/${client.id}/apply-seo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: editedDesc }),
      });
      const data = await res.json();
      if (data.success) {
        setSeoApplyResult({ type: 'success', message: data.message });
        setClient({ ...client, description: editedDesc });
        setEditData({ ...editData, description: editedDesc });
      } else {
        setSeoApplyResult({ type: 'error', message: data.error || 'Erro ao aplicar' });
      }
    } catch (err) {
      console.error(err);
      setSeoApplyResult({ type: 'error', message: 'Erro na requisição ao aplicar alterações' });
    } finally {
      setApplyingSeo(false);
    }
  }

  // ==========================================
  // PROFILE DESCRIPTION AI GENERATION
  // ==========================================

  async function handleGenerateDescriptionAi(directApply = false) {
    if (!params.id) return;
    setGeneratingDescAi(true);
    setDescAiMsg(null);
    try {
      const res = await fetch(`/api/clients/${params.id}/description-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tone: descAiTone,
          differential: descAiDifferential,
          existingDescription: editData.description || client?.description || '',
        }),
      });
      const data = await res.json();
      if (data.success && data.description) {
        if (directApply) {
          setEditData((prev) => ({ ...prev, description: data.description }));
          setDescAiMsg({
            type: 'success',
            text: `Nova descrição (${data.charCount || data.description.length} caracteres) gerada e inserida no campo! Clique em "Salvar e Aplicar no Google" para publicar. 🚀`,
          });
          setShowDescAiPanel(false);
        } else {
          setDescAiPreview(data.description);
          setDescAiMsg({
            type: 'success',
            text: `Descrição gerada com sucesso (${data.charCount || data.description.length}/750 caracteres)! Confira o preview abaixo e aplique na ficha.`,
          });
        }
      } else {
        setDescAiMsg({
          type: 'error',
          text: data.error || 'Não foi possível gerar a descrição com IA.',
        });
      }
    } catch (err) {
      console.error('Error in handleGenerateDescriptionAi:', err);
      setDescAiMsg({
        type: 'error',
        text: 'Erro de conexão ao gerar descrição com IA.',
      });
    } finally {
      setGeneratingDescAi(false);
    }
  }

  function applyGeneratedDescription() {
    if (!descAiPreview) return;
    setEditData((prev) => ({ ...prev, description: descAiPreview }));
    setDescAiMsg({
      type: 'success',
      text: 'Descrição aplicada com sucesso no formulário! Lembre-se de clicar em "Salvar e Aplicar no Google". 🚀',
    });
    setDescAiPreview(null);
    setShowDescAiPanel(false);
  }

  async function analyzeSearchesWithAi() {
    if (!searchesData?.keywords) return;
    setAnalyzingSearchesAi(true);
    try {
      const res = await fetch(`/api/clients/${params.id}/searches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: searchesData.keywords,
          businessName: client?.business_name,
          category: client?.category,
        }),
      });
      const data = await res.json();
      if (data.analysis) {
        setSearchesAiAnalysis(data.analysis);
      }
    } catch (err) {
      console.error('Error analyzing searches with AI:', err);
    } finally {
      setAnalyzingSearchesAi(false);
    }
  }

  function addSecondaryCategory(catName) {
    if (!catName) return;
    const current = editData.secondary_categories || [];
    if (!current.includes(catName) && current.length < 5) {
      setEditData({ ...editData, secondary_categories: [...current, catName] });
      setNewSecCat('');
    }
  }

  function removeSecondaryCategory(catName) {
    const current = editData.secondary_categories || [];
    setEditData({
      ...editData,
      secondary_categories: current.filter((c) => c !== catName),
    });
  }

  function handleHoursChange(dayId, field, value) {
    const current = editData.opening_hours || {};
    const dayData = current[dayId] || { open: '08:00', close: '18:00', closed: false };
    setEditData({
      ...editData,
      opening_hours: {
        ...current,
        [dayId]: { ...dayData, [field]: value },
      },
    });
  }

  function addService() {
    const newSrv = {
      id: `srv_${Date.now()}`,
      name: '',
      category: client?.category || '',
      price: '',
      description: '',
      photo_url: '',
    };
    setServices([newSrv, ...services]);
  }

  function updateService(id, field, value) {
    setServices(services.map((s) => s.id === id ? { ...s, [field]: value } : s));
  }

  function removeService(id) {
    setServices(services.filter((s) => s.id !== id));
  }

  async function parseAndAddBulkServices() {
    if (!rawBulkServicesText.trim()) {
      alert('Por favor, digite ou cole a lista de serviços na caixa de texto.');
      return;
    }
    setParsingBulkServices(true);
    setServicesSaveMsg(null);
    try {
      const res = await fetch(`/api/clients/${params.id}/services/generate-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'parse-raw',
          rawText: rawBulkServicesText,
          neighborhoods: servicesTargetNeighborhoods,
        }),
      });
      const data = await res.json();
      if (data.services && data.services.length > 0) {
        const formatted = data.services.map((s, idx) => ({
          id: `srv_${Date.now()}_${idx}`,
          name: s.name,
          category: s.category || client?.category || '',
          price: s.price || '',
          description: s.description || '',
          photo_url: '',
        }));
        setServices((prev) => [...formatted, ...prev]);
        setRawBulkServicesText('');
        setServicesSaveMsg({
          type: 'success',
          text: `${formatted.length} serviços identificados e adicionados com descrições geradas por IA! 🎉 Revise abaixo e clique em "Salvar e Enviar Tudo ao Google".`,
        });
      } else {
        alert(data.error || 'Nenhum serviço identificado no texto informado.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao processar lista de serviços.');
    } finally {
      setParsingBulkServices(false);
    }
  }

  async function suggestDescriptionForService(service) {
    if (!service.name) {
      alert('Por favor, informe o nome do serviço primeiro.');
      return;
    }
    setGeneratingAiServiceId(service.id);
    try {
      const res = await fetch(`/api/clients/${params.id}/services/generate-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'single',
          service,
          neighborhoods: servicesTargetNeighborhoods,
        }),
      });
      const data = await res.json();
      if (data.description) {
        setSuggestedServiceDesc((prev) => ({
          ...prev,
          [service.id]: data.description,
        }));
      } else {
        alert(data.error || 'Erro ao sugerir descrição com IA');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão com a IA');
    } finally {
      setGeneratingAiServiceId(null);
    }
  }

  function approveSuggestedDescription(serviceId) {
    const suggestion = suggestedServiceDesc[serviceId];
    if (suggestion) {
      updateService(serviceId, 'description', suggestion);
      setSuggestedServiceDesc((prev) => {
        const next = { ...prev };
        delete next[serviceId];
        return next;
      });
    }
  }

  function discardSuggestedDescription(serviceId) {
    setSuggestedServiceDesc((prev) => {
      const next = { ...prev };
      delete next[serviceId];
      return next;
    });
  }

  async function generateMissingServicesDescriptions() {
    const missing = services.filter((s) => !s.description || s.description.trim().length < 15);
    if (missing.length === 0) {
      alert('Todos os serviços já possuem descrições cadastradas!');
      return;
    }
    setGeneratingBulkServices(true);
    setServicesSaveMsg(null);
    try {
      const res = await fetch(`/api/clients/${params.id}/services/generate-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'bulk',
          services: missing,
          neighborhoods: servicesTargetNeighborhoods,
        }),
      });
      const data = await res.json();
      if (data.services) {
        const descMap = {};
        data.services.forEach((s) => {
          if (s.id && s.description) descMap[s.id] = s.description;
        });
        setServices((prev) =>
          prev.map((s) => (descMap[s.id] ? { ...s, description: descMap[s.id] } : s))
        );
        setServicesSaveMsg({
          type: 'success',
          text: `Descrições geradas com IA para ${data.services.length} serviço(s) sem descrição! 🚀`,
        });
      } else {
        alert(data.error || 'Erro ao gerar descrições em lote');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao gerar descrições.');
    } finally {
      setGeneratingBulkServices(false);
    }
  }

  async function generateBulkServicesDescriptions() {
    if (services.length === 0) {
      alert('Adicione pelo menos um serviço antes de gerar as descrições.');
      return;
    }
    setGeneratingBulkServices(true);
    setServicesSaveMsg(null);
    try {
      const res = await fetch(`/api/clients/${params.id}/services/generate-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'bulk',
          services,
          neighborhoods: servicesTargetNeighborhoods,
        }),
      });
      const data = await res.json();
      if (data.services) {
        setServices(data.services);
        setServicesSaveMsg({
          type: 'success',
          text: `Descrições de todos os ${data.services.length} serviços geradas com IA com sucesso! 🎉`,
        });
      } else {
        alert(data.error || 'Erro ao gerar descrições em massa');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão com a IA');
    } finally {
      setGeneratingBulkServices(false);
    }
  }

  async function suggestNicheServices() {
    setSuggestingServices(true);
    setServicesSaveMsg(null);
    try {
      const res = await fetch(`/api/clients/${params.id}/services/generate-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'suggest',
          neighborhoods: servicesTargetNeighborhoods,
        }),
      });
      const data = await res.json();
      if (data.suggestions && data.suggestions.length > 0) {
        const formatted = data.suggestions.map((s, i) => ({
          id: `srv_${Date.now()}_${i}`,
          name: s.name,
          category: s.category || client?.category || '',
          price: s.price || '',
          description: s.description || '',
          photo_url: '',
        }));
        setServices([...formatted, ...services]);
        setServicesSaveMsg({
          type: 'success',
          text: `${formatted.length} serviços recomendados para ${client?.category || 'seu nicho'} foram adicionados! Revise e clique em Salvar. ✨`,
        });
      } else {
        alert(data.error || 'Não foi possível obter sugestões no momento');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão com a IA');
    } finally {
      setSuggestingServices(false);
    }
  }

  async function saveServices() {
    setSavingServices(true);
    setServicesSaveMsg(null);
    try {
      const res = await fetch(`/api/clients/${params.id}/services`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.googleUpdated || (data.googleSync && data.googleSync.synced)) {
          setServicesSaveMsg({
            type: 'success',
            text: 'Catálogo de serviços salvo e sincronizado no Google Meu Negócio com sucesso! 🚀',
          });
        } else if (data.googleSync && !data.googleSync.synced) {
          setServicesSaveMsg({
            type: 'warning',
            text: `Catálogo salvo no sistema, mas não foi sincronizado no Google: ${data.googleSync.error || 'Verifique as permissões da conta do Google.'}`,
          });
        } else {
          setServicesSaveMsg({
            type: 'success',
            text: 'Catálogo de serviços salvo com sucesso!',
          });
        }
      } else {
        setServicesSaveMsg({
          type: 'error',
          text: data.error || 'Falha ao salvar serviços.',
        });
      }
    } catch (err) {
      console.error(err);
      setServicesSaveMsg({
        type: 'error',
        text: 'Erro de conexão ao salvar serviços.',
      });
    } finally {
      setSavingServices(false);
    }
  }

  // ==========================================
  // PRODUCTS FUNCTIONS
  // ==========================================
  function openAddProductModal() {
    setEditingProd(null);
    setEditingProdIndex(null);
    setFormProdName('');
    setFormProdCategory(client?.category || 'Geral');
    setFormProdPrice('');
    setFormProdPromoPrice('');
    setFormProdDescription('');
    setFormProdPhotoUrl('');
    setFormProdButtonType('ORDER');
    setFormProdButtonUrl('');
    setProdModalOpen(true);
  }

  function openEditProductModal(prod, index) {
    const prodId = prod.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const normalizedProd = { ...prod, id: prodId };
    setEditingProd(normalizedProd);
    setEditingProdIndex(typeof index === 'number' ? index : null);
    setFormProdName(prod.name || '');
    setFormProdCategory(prod.category || 'Geral');
    setFormProdPrice(prod.price || '');
    setFormProdPromoPrice(prod.promo_price || '');
    setFormProdDescription(prod.description || '');
    setFormProdPhotoUrl(prod.photo_url || '');
    setFormProdButtonType(prod.button_type || 'ORDER');
    setFormProdButtonUrl(prod.button_url || '');
    setProdModalOpen(true);
  }

  function closeProductModal() {
    setProdModalOpen(false);
    setEditingProd(null);
    setEditingProdIndex(null);
  }

  function applyClientWhatsAppForProduct(productName) {
    const cleanPhone = (client?.phone || '').replace(/\D/g, '');
    if (!cleanPhone) {
      alert('Nenhum número de telefone/WhatsApp cadastrado na ficha deste cliente.');
      return;
    }
    const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(`Olá! Tenho interesse no produto "${productName || 'da sua loja'}" anunciado no Google.`);
    setFormProdButtonUrl(`https://wa.me/${fullPhone}?text=${msg}`);
    setFormProdButtonType('ORDER');
  }

  async function generateProductAiDescription() {
    if (!formProdName.trim()) {
      alert('Informe o nome do produto primeiro.');
      return;
    }
    setGeneratingProdAi(true);
    try {
      const res = await fetch(`/api/clients/${params.id}/products/generate-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'single',
          product: {
            name: formProdName,
            category: formProdCategory,
            price: formProdPrice,
            description: formProdDescription,
          },
        }),
      });
      const data = await res.json();
      if (data.description) {
        setFormProdDescription(data.description);
      } else {
        alert(data.error || 'Erro ao gerar descrição com IA.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão com a IA.');
    } finally {
      setGeneratingProdAi(false);
    }
  }

  function handleSaveProductFromForm(e) {
    e.preventDefault();
    if (!formProdName.trim()) {
      alert('Nome do produto é obrigatório.');
      return;
    }

    const targetId = editingProd?.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const item = {
      id: targetId,
      name: formProdName.trim().slice(0, 58),
      category: formProdCategory.trim() || 'Geral',
      price: formProdPrice.trim(),
      promo_price: formProdPromoPrice.trim(),
      description: formProdDescription.trim().slice(0, 1000),
      photo_url: formProdPhotoUrl.trim(),
      button_type: formProdButtonType,
      button_url: formProdButtonUrl.trim(),
      is_active: true,
    };

    let updated;
    // 1. If editing by index, update that exact index without duplicating
    if (editingProdIndex !== null && editingProdIndex >= 0 && editingProdIndex < products.length) {
      updated = products.map((p, idx) => (idx === editingProdIndex ? item : p));
    } else if (editingProd && editingProd.id) {
      // 2. If editing by ID, locate existing index
      const existsIndex = products.findIndex((p) => String(p.id) === String(editingProd.id));
      if (existsIndex >= 0) {
        updated = products.map((p, idx) => (idx === existsIndex ? item : p));
      } else {
        // Fallback: match by name to avoid accidental duplication
        const nameIndex = products.findIndex((p) => p.name?.trim().toLowerCase() === formProdName.trim().toLowerCase());
        if (nameIndex >= 0) {
          updated = products.map((p, idx) => (idx === nameIndex ? item : p));
        } else {
          updated = [item, ...products];
        }
      }
    } else {
      // 3. New item: if exact name already exists, update instead of duplicating
      const nameIndex = products.findIndex((p) => p.name?.trim().toLowerCase() === formProdName.trim().toLowerCase());
      if (nameIndex >= 0) {
        updated = products.map((p, idx) => (idx === nameIndex ? item : p));
      } else {
        updated = [item, ...products];
      }
    }

    setProducts(updated);
    closeProductModal();
    saveProductsToBackend(updated);
  }

  function handleDeleteProductItem(id) {
    if (!confirm('Deseja realmente excluir este produto?')) return;
    const updated = products.filter((p) => String(p.id) !== String(id));
    setProducts(updated);
    saveProductsToBackend(updated);
  }

  async function saveProductsToBackend(listToSave = products) {
    setSavingProducts(true);
    setProductsSaveMsg(null);
    try {
      const res = await fetch(`/api/clients/${params.id}/products`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: listToSave }),
      });
      const data = await res.json();
      if (data.success) {
        const savedList = data.products || listToSave;
        setProducts(savedList);
        setClient((prev) => (prev ? { ...prev, products: savedList } : prev));
        setProductsSaveMsg({ type: 'success', text: 'Catálogo de produtos salvo com sucesso!' });
        setTimeout(() => setProductsSaveMsg(null), 3500);
      } else {
        setProductsSaveMsg({ type: 'error', text: data.error || 'Erro ao salvar produtos.' });
      }
    } catch (err) {
      console.error(err);
      setProductsSaveMsg({ type: 'error', text: 'Erro de conexão ao salvar produtos.' });
    } finally {
      setSavingProducts(false);
    }
  }

  async function suggestNicheProductList() {
    setSuggestingProdAi(true);
    setProdSuggestModalOpen(true);
    try {
      const res = await fetch(`/api/clients/${params.id}/products/generate-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'suggest' }),
      });
      const data = await res.json();
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestedProdList(data.suggestions);
      } else {
        alert(data.error || 'Nenhuma sugestão encontrada.');
        setProdSuggestModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao buscar sugestões de produtos.');
      setProdSuggestModalOpen(false);
    } finally {
      setSuggestingProdAi(false);
    }
  }

  function acceptNicheProductSuggestions() {
    // Avoid duplicating products that already exist by name
    const existingNames = new Set(products.map((p) => (p.name || '').trim().toLowerCase()));
    const newItems = (suggestedProdList || []).filter((s) => !existingNames.has((s.name || '').trim().toLowerCase()));
    const updated = [...newItems, ...products];
    setProducts(updated);
    setProdSuggestModalOpen(false);
    saveProductsToBackend(updated);
  }

  async function parseBulkProductText() {
    if (!prodBulkText.trim()) {
      alert('Cole o texto dos produtos primeiro.');
      return;
    }
    setParsingProdBulk(true);
    try {
      const res = await fetch(`/api/clients/${params.id}/products/generate-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'parse-raw', rawText: prodBulkText }),
      });
      const data = await res.json();
      if (data.products && data.products.length > 0) {
        // Avoid duplicating products that already exist by name
        const existingNames = new Set(products.map((p) => (p.name || '').trim().toLowerCase()));
        const newItems = (data.products || []).filter((s) => !existingNames.has((s.name || '').trim().toLowerCase()));
        const updated = [...newItems, ...products];
        setProducts(updated);
        setProdBulkModalOpen(false);
        setProdBulkText('');
        saveProductsToBackend(updated);
      } else {
        alert(data.error || 'Nenhum produto identificado na lista.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao processar lista de produtos.');
    } finally {
      setParsingProdBulk(false);
    }
  }

  async function importServicesAsProducts() {
    if (!services || services.length === 0) {
      alert('Esta ficha não possui serviços cadastrados para importar.');
      return;
    }
    setImportingServicesAsProds(true);
    setProductsSaveMsg(null);
    try {
      const res = await fetch(`/api/clients/${params.id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import-services' }),
      });
      const data = await res.json();
      if (data.success && data.products) {
        setProducts(data.products);
        setClient((prev) => (prev ? { ...prev, products: data.products } : prev));
        setProductsSaveMsg({ type: 'success', text: data.message || `${data.count} serviço(s) importado(s) como produtos!` });
        setTimeout(() => setProductsSaveMsg(null), 4000);
      } else {
        alert(data.error || 'Erro ao importar serviços.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao importar serviços.');
    } finally {
      setImportingServicesAsProds(false);
    }
  }

  async function extractProductsFromWebsite() {
    const urlToUse = (extractUrlInput || client?.website || '').trim();
    if (!urlToUse) {
      alert('Informe a URL do site ou cardápio da empresa.');
      return;
    }
    setExtractingUrlProds(true);
    try {
      const res = await fetch(`/api/clients/${params.id}/products/generate-ai`, {
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
        saveProductsToBackend(updated);
        alert(`${newItems.length} produto(s) extraído(s) da página com sucesso!`);
      } else {
        alert(data.error || 'Nenhum produto identificado nesta URL.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao extrair produtos da URL.');
    } finally {
      setExtractingUrlProds(false);
    }
  }

  // ==========================================
  // BULK POSTS FUNCTIONS
  // ==========================================

  function addManualPostToQueue() {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + (bulkPostsQueue.length + 1) * 2);
    nextDate.setHours(10, 0, 0, 0);

    const newPost = {
      id: `queue_${Date.now()}_${bulkPostsQueue.length}`,
      content: '',
      topic: `Novo Post #${bulkPostsQueue.length + 1}`,
      topic_type: 'STANDARD',
      scheduled_for: nextDate.toISOString().slice(0, 16),
      publish_immediately: false,
      call_to_action: { type: 'LEARN_MORE', label: 'Saiba Mais' },
    };
    setBulkPostsQueue([...bulkPostsQueue, newPost]);
    setShowBulkPostCreator(true);
  }

  function updateQueuePost(id, field, value) {
    setBulkPostsQueue((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }

  function removeQueuePost(id) {
    setBulkPostsQueue((prev) => prev.filter((p) => p.id !== id));
  }

  function distributeQueueDates(intervalDays = 3) {
    const base = bulkAiStartDate ? new Date(bulkAiStartDate) : new Date();
    setBulkPostsQueue((prev) =>
      prev.map((p, idx) => {
        const d = new Date(base.getTime() + idx * intervalDays * 24 * 60 * 60 * 1000);
        d.setHours(10, 0, 0, 0);
        return {
          ...p,
          scheduled_for: d.toISOString().slice(0, 16),
        };
      })
    );
  }

  async function generateBulkPostsWithAi() {
    setGeneratingBulkPosts(true);
    setBulkPostsMsg(null);
    try {
      const res = await fetch('/api/posts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: params.id,
          topic: bulkAiFocus || 'Destaque dos diferenciais, novidades e serviços mais procurados',
          count: bulkAiCount,
          interval_days: bulkAiInterval,
          start_date: bulkAiStartDate || new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (data.success && data.posts) {
        const formatted = data.posts.map((p) => ({
          ...p,
          scheduled_for: p.scheduled_for ? p.scheduled_for.slice(0, 16) : new Date().toISOString().slice(0, 16),
        }));
        setBulkPostsQueue((prev) => [...prev, ...formatted]);
        setShowBulkPostCreator(true);
        setBulkPostsMsg({
          type: 'success',
          text: `${formatted.length} posts estratégicos gerados com IA! Revise o texto e as datas abaixo e clique em "Salvar e Agendar Todos no Google". 🚀`,
        });
      } else {
        alert(data.error || 'Erro ao gerar posts com IA');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão com a IA.');
    } finally {
      setGeneratingBulkPosts(false);
    }
  }

  async function saveAndScheduleAllBulkPosts() {
    if (bulkPostsQueue.length === 0) {
      alert('Nenhum post na fila para salvar.');
      return;
    }
    setSavingBulkPosts(true);
    setBulkPostsMsg(null);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: params.id,
          posts: bulkPostsQueue.map((p) => ({
            content: p.content,
            topic_type: p.topic_type || 'STANDARD',
            call_to_action: p.call_to_action,
            scheduled_for: p.publish_immediately ? null : (p.scheduled_for ? new Date(p.scheduled_for).toISOString() : null),
            publish_immediately: p.publish_immediately,
            publish_now: p.publish_immediately,
            ai_generated: Boolean(p.ai_generated || p.id?.startsWith('gen_')),
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBulkPostsMsg({
          type: 'success',
          text: `🎉 Sucesso! ${data.count} posts processados (${data.publishedCount || 0} publicados agora no Google e ${data.scheduledCount || 0} agendados na fila)!`,
        });
        setBulkPostsQueue([]);
        // Reload posts list
        const pRes = await fetch(`/api/posts?clientId=${params.id}`);
        const pData = await pRes.json();
        if (pData.posts) setPosts(pData.posts);
      } else {
        alert(data.error || 'Erro ao salvar e agendar posts.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar posts.');
    } finally {
      setSavingBulkPosts(false);
    }
  }

  async function publishExistingPostNow(postId) {
    setPublishingPostId(postId);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'publish_now',
          post_id: postId,
        }),
      });
      const data = await res.json();
      if (data.success && data.post) {
        setPosts((prev) => prev.map((p) => (p.id === postId ? data.post : p)));
        alert('Post publicado diretamente na ficha do Google Meu Negócio com sucesso! 🚀');
      } else {
        alert(data.error || 'Erro ao publicar no Google.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao publicar no Google.');
    } finally {
      setPublishingPostId(null);
    }
  }

  async function handleDeletePost(postId) {
    if (!confirm('Deseja realmente excluir este post?')) return;
    try {
      const res = await fetch(`/api/posts?id=${postId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      } else {
        alert(data.error || 'Erro ao excluir post.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir post.');
    }
  }

  function readFileAsDataUrl(file) {

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handlePhotoFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const staged = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const seoFilename = generateSeoFilename(
        client?.business_name || 'empresa',
        client?.category || 'servico',
        geoCity || 'brasil',
        i
      );
      const seoAlt = generateSeoAltText(
        client?.business_name || 'Empresa',
        client?.category || 'Serviços',
        geoCity || 'Brasil',
        i
      );

      const stagedItem = {
        id: `staged_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        file,
        name: seoFilename,
        category: newPhotoCategory || 'ADDITIONAL',
        alt_text: seoAlt,
        previewUrl: URL.createObjectURL(file),
        geo_lat: geoLat,
        geo_lng: geoLng,
        hasExif: autoInjectExif,
        sizeFormatted: (file.size / 1024).toFixed(0) + ' KB',
      };
      staged.push(stagedItem);
    }

    setPendingUploadFiles((prev) => [...prev, ...staged]);
    e.target.value = '';
  }

  function removePendingFile(stagedId) {
    setPendingUploadFiles((prev) => {
      const item = prev.find((f) => f.id === stagedId);
      if (item?.previewUrl) {
        try { URL.revokeObjectURL(item.previewUrl); } catch {}
      }
      return prev.filter((f) => f.id !== stagedId);
    });
  }

  function updatePendingFile(stagedId, field, value) {
    setPendingUploadFiles((prev) =>
      prev.map((f) => (f.id === stagedId ? { ...f, [field]: value } : f))
    );
  }

  async function uploadStagedPhotos() {
    if (pendingUploadFiles.length === 0) return;

    setUploadingBulkPhotos(true);
    setBulkUploadProgress({ current: 0, total: pendingUploadFiles.length });

    const processedPhotos = [];

    for (let i = 0; i < pendingUploadFiles.length; i++) {
      const item = pendingUploadFiles[i];
      setBulkUploadProgress({ current: i + 1, total: pendingUploadFiles.length, currentName: item.name });

      try {
        let finalDataUrl = await readFileAsDataUrl(item.file);

        if (item.hasExif && item.geo_lat && item.geo_lng) {
          try {
            finalDataUrl = injectExifToDataUrl(finalDataUrl, {
              lat: item.geo_lat,
              lng: item.geo_lng,
              artist: client?.business_name || '',
              description: item.alt_text || '',
              copyright: `${client?.business_name || ''} - Direitos Reservados`,
              keywords: `${client?.business_name || ''}, ${client?.category || ''}, ${geoCity || ''}`,
            });
          } catch (exifErr) {
            console.warn('Aviso: EXIF não pôde ser injetado (talvez formato PNG):', exifErr);
          }
        }

        processedPhotos.push({
          url: finalDataUrl,
          category: item.category,
          alt_text: item.alt_text,
          filename: item.name,
          geo_lat: item.geo_lat,
          geo_lng: item.geo_lng,
          metadata: {
            city: geoCity,
            business: client?.business_name,
            optimized_at: new Date().toISOString(),
          },
        });
      } catch (err) {
        console.error('Erro ao processar arquivo:', err);
      }
    }

    if (processedPhotos.length === 0) {
      alert('Nenhuma foto pôde ser processada.');
      setUploadingBulkPhotos(false);
      setBulkUploadProgress(null);
      return;
    }

    try {
      const res = await fetch(`/api/clients/${params.id}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: processedPhotos }),
      });
      const data = await res.json();
      if (data.photos) {
        setPhotos((prev) => [...data.photos, ...prev]);
        setPendingUploadFiles([]);
        alert(`${data.photos.length} foto(s) com metadados SEO e Geolocalização enviadas com sucesso! 🚀`);
      } else if (data.photo) {
        setPhotos((prev) => [data.photo, ...prev]);
        setPendingUploadFiles([]);
        alert('Foto com metadados SEO e Geolocalização enviada com sucesso! 🚀');
      } else {
        alert(data.error || 'Erro ao salvar fotos');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao enviar fotos');
    } finally {
      setUploadingBulkPhotos(false);
      setBulkUploadProgress(null);
    }
  }

  async function handleAddSinglePhotoDirect(url, category, alt) {
    if (!url) return;
    setUploadingPhoto(true);
    try {
      let finalDataUrl = url;
      if (autoInjectExif && geoLat && geoLng && url.startsWith('data:image/jpeg')) {
        try {
          finalDataUrl = injectExifToDataUrl(url, {
            lat: geoLat,
            lng: geoLng,
            artist: client?.business_name || '',
            description: alt || '',
          });
        } catch {}
      }

      const res = await fetch(`/api/clients/${params.id}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: finalDataUrl,
          category,
          alt_text: alt,
          geo_lat: geoLat,
          geo_lng: geoLng,
          filename: generateSeoFilename(client?.business_name || 'empresa', category, geoCity),
        }),
      });
      const data = await res.json();
      if (data.photo) {
        setPhotos([data.photo, ...photos]);
        setNewPhotoUrl('');
        setNewPhotoAlt('');
      } else {
        alert(data.error || 'Erro ao adicionar foto');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar foto');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleDeletePhoto(photoId) {
    if (!confirm('Deseja excluir esta foto?')) return;
    try {
      const res = await fetch(`/api/clients/${params.id}/photos?photoId=${photoId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setPhotos(photos.filter((p) => p.id !== photoId));
      }
    } catch (err) {
      console.error(err);
    }
  }

  function handleOpenPhotoEditor(photo) {
    setEditingPhoto(photo);
    setIsPhotoEditorOpen(true);
  }

  async function handleSaveEditedPhoto(updatedMediaItem) {
    if (!editingPhoto) return;
    setSavingEditedPhoto(true);
    try {
      let finalUrl = editingPhoto.url;
      let finalFilename = updatedMediaItem.filename || updatedMediaItem.name || editingPhoto.filename;

      // If a new edited image file blob was created
      if (updatedMediaItem.file && updatedMediaItem.isEdited) {
        const formData = new FormData();
        formData.append('file', updatedMediaItem.file);
        formData.append('folder', 'photos');

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.url) {
          finalUrl = uploadData.url;
        }
      }

      const res = await fetch(`/api/clients/${params.id}/photos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoId: editingPhoto.id,
          url: finalUrl,
          category: updatedMediaItem.category || editingPhoto.category,
          alt_text: updatedMediaItem.alt_text !== undefined ? updatedMediaItem.alt_text : editingPhoto.alt_text,
          filename: finalFilename,
        }),
      });

      const data = await res.json();
      if (data.success && data.photo) {
        setPhotos((prev) =>
          prev.map((p) => (p.id === editingPhoto.id ? { ...p, ...data.photo } : p))
        );
        alert('Foto atualizada com sucesso! ✨');
      } else {
        alert(data.error || 'Erro ao atualizar foto');
      }
    } catch (err) {
      console.error('Erro ao salvar foto editada:', err);
      alert('Erro ao salvar foto editada');
    } finally {
      setSavingEditedPhoto(false);
      setEditingPhoto(null);
      setIsPhotoEditorOpen(false);
    }
  }

  function handleFileInput(e, serviceId = null) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (serviceId) {
        updateService(serviceId, 'photo_url', dataUrl);
      } else {
        handleAddSinglePhotoDirect(dataUrl, newPhotoCategory, newPhotoAlt || file.name);
      }
    };
    reader.readAsDataURL(file);
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '120px' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="card empty-state">
        <div className="empty-state-title">Cliente não encontrado</div>
        <a href="/dashboard/clients" className="btn btn-primary">Voltar</a>
      </div>
    );
  }

  const displayAddress = formatDisplayAddress(client.address);
  const hasAnySocial = Boolean(
    client.social_links?.instagram ||
    client.social_links?.facebook ||
    client.social_links?.linkedin ||
    client.social_links?.youtube
  );

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
    { id: 'edit', label: 'Editar Ficha Completa', icon: Edit3 },
    { id: 'seo', label: 'Auditoria SEO', icon: Sparkles },
    { id: 'competitors', label: 'Concorrentes', icon: Target },
    { id: 'searches', label: 'Pesquisas', icon: Search, count: searchesData?.keywords?.length },
    { id: 'posts', label: 'Posts', icon: FileText, count: posts.length },
    { id: 'reviews', label: 'Reviews', icon: Star, count: reviews.length },
    { id: 'services', label: 'Serviços', icon: Briefcase, count: services.length },
    { id: 'products', label: 'Produtos', icon: ShoppingBag, count: products.length },
    { id: 'photos', label: 'Fotos & SEO Local', icon: Camera, count: photos.length },
  ];

  return (
    <div style={styles.page}>
      {/* Back button */}
      <button onClick={() => router.back()} className="btn btn-ghost btn-sm" style={{ marginBottom: '16px' }}>
        <ArrowLeft size={16} /> Voltar
      </button>

      {/* ENRICHED CLIENT HEADER */}
      <div className="card" style={styles.headerCard}>
        <div style={styles.headerTop}>
          <div style={styles.avatarWrapper}>
            {getClientLogo(client) ? (
              <img
                src={getClientLogo(client)}
                alt={client.business_name}
                style={styles.logoImg}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.detail-avatar-fallback');
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="detail-avatar-fallback"
              style={{
                ...styles.avatar,
                display: getClientLogo(client) ? 'none' : 'flex',
                background: client.status === 'active'
                  ? 'linear-gradient(135deg, #10B981, #06B6D4)'
                  : 'rgba(107,114,128,0.3)',
              }}
            >
              {client.business_name?.[0]?.toUpperCase() || '?'}
            </div>
          </div>

          <div style={styles.headerInfo}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={styles.clientName}>{client.business_name}</h1>
              <span className={`badge badge-${client.status === 'active' ? 'green' : 'amber'}`}>
                {client.status === 'active' ? 'Conectado ao Google' : client.status}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px', alignItems: 'center' }}>
              {client.category && (
                <span className="badge badge-blue">
                  🏷️ {client.category}
                </span>
              )}
              {(client.secondary_categories || []).map((sec, i) => (
                <span key={i} className="badge badge-purple" style={{ fontSize: '0.72rem' }}>
                  {sec}
                </span>
              ))}
              {(!client.secondary_categories || client.secondary_categories.length === 0) && (
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  style={{
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px dashed rgba(139, 92, 246, 0.4)',
                    borderRadius: '12px',
                    color: '#C4B5FD',
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Adicionar categorias secundárias para ranquear melhor no Google"
                >
                  <Plus size={11} /> + Categorias Secundárias
                </button>
              )}
            </div>
          </div>

          <div style={styles.headerActions}>
            <button
              onClick={syncGoogle}
              className="btn btn-secondary btn-sm"
              disabled={syncing}
              title="Sincronizar avaliações e posts com o Google"
            >
              {syncing ? <div className="spinner" /> : <RefreshCw size={14} />}
              Sincronizar Google
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Edit3 size={14} /> Editar Ficha
            </button>
          </div>
        </div>

        {/* FULL INFO DETAILS BAR */}
        <div style={styles.fullInfoBar}>
          {/* Phone */}
          {client.phone && (
            <a href={`tel:${client.phone}`} style={styles.infoLink} title="Ligar para o telefone">
              <Phone size={14} style={{ color: '#10B981' }} />
              <span>{client.phone}</span>
            </a>
          )}

          {/* WhatsApp */}
          {client.social_links?.whatsapp && (
            <a
              href={`https://wa.me/${client.social_links.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...styles.infoLink, color: '#10B981' }}
              title="Conversar no WhatsApp"
            >
              <MessageCircle size={14} />
              <span>{client.social_links.whatsapp}</span>
            </a>
          )}

          {/* Email */}
          {client.email && (
            <a href={`mailto:${client.email}`} style={styles.infoLink} title="Enviar e-mail">
              <Mail size={14} style={{ color: '#3B82F6' }} />
              <span>{client.email}</span>
            </a>
          )}

          {/* Website */}
          {client.website && (
            <a
              href={client.website}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...styles.infoLink, color: '#06B6D4' }}
              title="Acessar Website"
            >
              <Globe size={14} />
              <span>
                {(() => {
                  try {
                    return new URL(client.website).hostname.replace('www.', '');
                  } catch {
                    return client.website;
                  }
                })()}
              </span>
              <ExternalLink size={12} />
            </a>
          )}

          {/* Address */}
          {displayAddress && (
            <div style={styles.infoLink} title="Endereço cadastrado">
              <MapPin size={14} style={{ color: '#F59E0B' }} />
              <span style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayAddress}
              </span>
            </div>
          )}

          {/* Social Icons or Add Social Button */}
          {hasAnySocial ? (
            <div style={styles.socialIconsRow}>
              {client.social_links?.instagram && (
                <a
                  href={formatSocialUrl(client.social_links.instagram, 'instagram.com')}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.socialIconBtn}
                  title={`Instagram: ${client.social_links.instagram}`}
                >
                  <Instagram size={14} style={{ color: '#EC4899' }} />
                </a>
              )}

              {client.social_links?.facebook && (
                <a
                  href={formatSocialUrl(client.social_links.facebook, 'facebook.com')}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.socialIconBtn}
                  title={`Facebook: ${client.social_links.facebook}`}
                >
                  <Facebook size={14} style={{ color: '#3B82F6' }} />
                </a>
              )}

              {client.social_links?.linkedin && (
                <a
                  href={formatSocialUrl(client.social_links.linkedin, 'linkedin.com')}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.socialIconBtn}
                  title={`LinkedIn: ${client.social_links.linkedin}`}
                >
                  <Linkedin size={14} style={{ color: '#0A66C2' }} />
                </a>
              )}

              {client.social_links?.youtube && (
                <a
                  href={formatSocialUrl(client.social_links.youtube, 'youtube.com')}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.socialIconBtn}
                  title={`YouTube: ${client.social_links.youtube}`}
                >
                  <Youtube size={14} style={{ color: '#EF4444' }} />
                </a>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px dashed rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: 'var(--text-muted)',
                padding: '4px 10px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
              title="Cadastrar perfis de redes sociais"
            >
              <Plus size={12} /> + Redes Sociais
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: '20px' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={14} />
            {tab.label}
            {tab.count !== undefined && (
              <span style={styles.tabCount}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Métricas dos Últimos 30 Dias (Performance Google) */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={18} style={{ color: '#10B981' }} />
                  Desempenho no Google (Últimos 30 dias)
                </h3>
                <p style={{ fontSize: '0.8125rem', color: '#9CA3AF', marginTop: '2px' }}>
                  Dados de impressões, termos de busca e ações geradas na busca local e Google Maps.
                </p>
              </div>
              <span className="badge badge-blue">Google Performance</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="card stat-card" style={{ background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                <div style={{ ...styles.statIcon, background: 'rgba(6, 182, 212, 0.15)', color: '#06B6D4' }}>
                  <Eye size={20} />
                </div>
                <div className="stat-value">{Number(client.views_30d || 0).toLocaleString('pt-BR')}</div>
                <div className="stat-label">Visualizações (30d)</div>
              </div>

              <div className="card stat-card" style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <div style={{ ...styles.statIcon, background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}>
                  <Search size={20} />
                </div>
                <div className="stat-value">{Number(client.searches_30d || 0).toLocaleString('pt-BR')}</div>
                <div className="stat-label">Pesquisas (30d)</div>
              </div>

              <div className="card stat-card" style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ ...styles.statIcon, background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
                  <Zap size={20} />
                </div>
                <div className="stat-value">{Number(client.actions_30d || 0).toLocaleString('pt-BR')}</div>
                <div className="stat-label">Interações (30d)</div>
              </div>
            </div>
          </div>

          <div style={styles.overviewGrid}>
            <div className="card stat-card">
              <div style={{ ...styles.statIcon, background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>
                <FileText size={20} />
              </div>
              <div className="stat-value">{posts.length}</div>
              <div className="stat-label">Total de Posts</div>
            </div>
            <div className="card stat-card">
              <div style={{ ...styles.statIcon, background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                <Star size={20} />
              </div>
              <div className="stat-value">{Number(client.average_rating || 0).toFixed(1)}</div>
              <div className="stat-label">Nota Média</div>
            </div>
            <div className="card stat-card">
              <div style={{ ...styles.statIcon, background: 'rgba(139,92,246,0.15)', color: '#8B5CF6' }}>
                <Star size={20} />
              </div>
              <div className="stat-value">{reviews.length}</div>
              <div className="stat-label">Total de Avaliações</div>
            </div>
            <div className="card stat-card">
              <div style={{ ...styles.statIcon, background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
                <TrendingUp size={20} />
              </div>
              <div className="stat-value">{posts.filter((p) => p.status === 'published').length}</div>
              <div className="stat-label">Posts Publicados</div>
            </div>

            {client.description && (
              <div className="card" style={{ gridColumn: '1 / -1' }}>
                <h3 className="card-title" style={{ marginBottom: '12px' }}>Descrição da Empresa</h3>
                <p style={{ color: '#9CA3AF', lineHeight: 1.7, fontSize: '0.875rem' }}>
                  {client.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: EDIT FULL CLIENT PROFILE (NEW) */}
      {activeTab === 'edit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Result Alert */}
          {saveResultMsg && (
            <div style={{
              padding: '14px 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px',
              backgroundColor: saveResultMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${saveResultMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: '#F8FAFC', fontSize: '0.875rem',
            }}>
              {saveResultMsg.type === 'success' ? <CheckCircle2 size={20} style={{ color: '#10B981' }} /> : <XCircle size={20} style={{ color: '#EF4444' }} />}
              <span>{saveResultMsg.text}</span>
            </div>
          )}

          {/* Section 1: Identificação & Categorias */}
          <div className="card" style={{ padding: '24px' }}>
            <div className="card-header" style={{ marginBottom: '20px', padding: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building2 size={20} style={{ color: '#3B82F6' }} />
                <h3 className="card-title">Identificação & Categorias Oficiais</h3>
              </div>
            </div>

            {/* Logo field */}
            <div style={{ marginBottom: '20px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <label style={styles.formLabel}>Logotipo da Empresa:</label>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={styles.avatarWrapper}>
                  {getClientLogo(editData) ? (
                    <img
                      src={getClientLogo(editData)}
                      alt="Preview Logo"
                      style={styles.logoImg}
                    />
                  ) : (
                    <div style={{ ...styles.avatar, background: 'rgba(255,255,255,0.08)' }}>
                      {editData.business_name?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <input
                    className="input"
                    placeholder="URL do logotipo ou faça upload..."
                    value={editData.logo_url || ''}
                    onChange={(e) => setEditData({ ...editData, logo_url: e.target.value })}
                    style={{ width: '100%', marginBottom: '6px' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                    Se vazio, o sistema detecta automaticamente o ícone oficial a partir do website cadastrado.
                  </span>
                </div>
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                  <Upload size={14} /> Upload Logo
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        setEditData({ ...editData, logo_url: reader.result });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={styles.formLabel}>Nome da Empresa (Título da Ficha):</label>
                <input
                  className="input"
                  value={editData.business_name || ''}
                  onChange={(e) => setEditData({ ...editData, business_name: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={styles.formLabel}>Categoria Principal (Fator #1 Google Maps):</label>
                <input
                  className="input"
                  list="primary-categories-list"
                  value={editData.category || ''}
                  onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                  placeholder="Selecione ou digite a categoria oficial..."
                  style={{ width: '100%' }}
                />
                <datalist id="primary-categories-list">
                  {CATEGORIES_DATABASE.map((c, i) => (
                    <option key={i} value={c.name}>{c.sector}</option>
                  ))}
                </datalist>
              </div>
            </div>

            {/* Secondary categories */}
            <div style={{ marginBottom: '20px' }}>
              <label style={styles.formLabel}>Categorias Secundárias Oficiais (até 5 categorias):</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                {(editData.secondary_categories || []).map((sec, i) => (
                  <span
                    key={i}
                    className="badge badge-purple"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.8125rem' }}
                  >
                    {sec}
                    <button
                      type="button"
                      onClick={() => removeSecondaryCategory(sec)}
                      style={{ cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center' }}
                      title="Remover"
                    >
                      <XCircle size={14} />
                    </button>
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px', maxWidth: '400px' }}>
                <input
                  className="input"
                  list="secondary-categories-list"
                  value={newSecCat}
                  onChange={(e) => setNewSecCat(e.target.value)}
                  placeholder="Adicionar categoria secundária..."
                  style={{ flex: 1, fontSize: '0.8125rem' }}
                />
                <datalist id="secondary-categories-list">
                  {CATEGORIES_DATABASE.map((c, i) => (
                    <option key={i} value={c.name}>{c.sector}</option>
                  ))}
                </datalist>
                <button
                  type="button"
                  onClick={() => addSecondaryCategory(newSecCat)}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={14} /> Adicionar
                </button>
              </div>
            </div>

            {/* Description with AI Assistant */}
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ ...styles.formLabel, margin: 0, fontWeight: 700 }}>Descrição da Ficha (Google Meu Negócio):</label>
                  <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', color: '#818CF8', border: '1px solid rgba(99, 102, 241, 0.3)', fontWeight: 600 }}>
                    SEO Local Google
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: (editData.description || '').length > 745 ? '#EF4444' : ((editData.description || '').length >= 350 ? '#10B981' : '#F59E0B'),
                  }}>
                    {(editData.description || '').length} / 750 caracteres
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDescAiPanel(!showDescAiPanel)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 12px',
                      background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                      color: '#FFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                    }}
                  >
                    <Sparkles size={13} />
                    {showDescAiPanel ? 'Fechar Painel IA' : '✨ Ajustar Descrição com IA'}
                  </button>
                </div>
              </div>

              {/* AI Description Assistant Panel */}
              {showDescAiPanel && (
                <div style={{
                  padding: '16px',
                  marginBottom: '14px',
                  borderRadius: '12px',
                  background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
                  border: '1px solid rgba(99, 102, 241, 0.35)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={16} style={{ color: '#818CF8' }} />
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#F3F4F6' }}>
                        Gerador & Otimizador de Bio GBP com IA
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                      Cria texto persuasivo integrando nicho, cidade e serviços (limite de 750 caracteres)
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#D1D5DB', marginBottom: '4px', fontWeight: 500 }}>
                        Tom de Voz:
                      </label>
                      <select
                        className="input"
                        value={descAiTone}
                        onChange={(e) => setDescAiTone(e.target.value)}
                        style={{ width: '100%', fontSize: '0.8rem', padding: '6px 10px', height: '36px', background: '#111827', borderColor: '#374151' }}
                      >
                        <option value="persuasivo">🎯 Persuasivo (Foco em Conversão e Vendas)</option>
                        <option value="profissional">🏢 Profissional & Institucional</option>
                        <option value="acolhedor">🤝 Acolhedor, Empático & Humanizado</option>
                        <option value="autoridade">🏆 Autoridade, Especialista & Referência</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#D1D5DB', marginBottom: '4px', fontWeight: 500 }}>
                        Diferencial / Foco a Destacar:
                      </label>
                      <input
                        type="text"
                        className="input"
                        value={descAiDifferential}
                        onChange={(e) => setDescAiDifferential(e.target.value)}
                        placeholder="Ex: Materiais 100% esterilizados, atendimento rápido, equipe premiada..."
                        style={{ width: '100%', fontSize: '0.8rem', padding: '6px 10px', height: '36px', background: '#111827', borderColor: '#374151' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      type="button"
                      disabled={generatingDescAi}
                      onClick={() => handleGenerateDescriptionAi(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                        color: '#FFF',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: generatingDescAi ? 'not-allowed' : 'pointer',
                        opacity: generatingDescAi ? 0.7 : 1,
                      }}
                    >
                      {generatingDescAi ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      {generatingDescAi ? 'Gerando com IA...' : '✨ Gerar Proposta com Preview'}
                    </button>

                    <button
                      type="button"
                      disabled={generatingDescAi}
                      onClick={() => handleGenerateDescriptionAi(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10B981',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: generatingDescAi ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <Zap size={14} />
                      Gerar & Inserir Direto no Campo
                    </button>
                  </div>

                  {/* AI Feedback Message */}
                  {descAiMsg && (
                    <div style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      background: descAiMsg.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: descAiMsg.type === 'success' ? '#10B981' : '#EF4444',
                      border: `1px solid ${descAiMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    }}>
                      {descAiMsg.text}
                    </div>
                  )}

                  {/* Generated Preview Card */}
                  {descAiPreview && (
                    <div style={{
                      marginTop: '12px',
                      padding: '14px',
                      background: 'rgba(15, 23, 42, 0.98)',
                      borderRadius: '8px',
                      border: '1px solid rgba(129, 140, 248, 0.35)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A5B4FC' }}>
                          💡 Sugestão Gerada ({descAiPreview.length} / 750 caracteres):
                        </span>
                        <button
                          type="button"
                          onClick={applyGeneratedDescription}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '5px 12px',
                            background: '#10B981',
                            color: '#FFF',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                          }}
                        >
                          <CheckCircle2 size={13} />
                          Aplicar na Ficha Agora
                        </button>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: '#E5E7EB', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
                        {descAiPreview}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <textarea
                className="input textarea"
                value={editData.description || ''}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                maxLength={750}
                rows={4}
                style={{ width: '100%', fontSize: '0.875rem', lineHeight: '1.6' }}
                placeholder="Descreva detalhadamente os serviços, produtos e diferenciais do negócio..."
              />
            </div>
          </div>

          {/* Section 2: Contatos & Redes Sociais */}
          <div className="card" style={{ padding: '24px' }}>
            <div className="card-header" style={{ marginBottom: '20px', padding: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Phone size={20} style={{ color: '#10B981' }} />
                <h3 className="card-title">Canais de Contato & Redes Sociais</h3>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={styles.formLabel}>Telefone Principal / Fixo:</label>
                <input
                  className="input"
                  value={editData.phone || ''}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  placeholder="(00) 0000-0000"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={styles.formLabel}>WhatsApp / Celular de Atendimento:</label>
                <input
                  className="input"
                  value={editData.social_links?.whatsapp || ''}
                  onChange={(e) => setEditData({
                    ...editData,
                    social_links: { ...editData.social_links, whatsapp: e.target.value }
                  })}
                  placeholder="(00) 90000-0000"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={styles.formLabel}>E-mail Institucional de Contato:</label>
                <input
                  className="input"
                  type="email"
                  value={editData.email || ''}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  placeholder="contato@empresa.com.br"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={styles.formLabel}>Website Oficial:</label>
                <input
                  className="input"
                  value={editData.website || ''}
                  onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                  placeholder="https://www.empresa.com.br"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Social Links */}
            <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: '20px' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#F8FAFC', marginBottom: '14px' }}>
                Perfis nas Redes Sociais
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={styles.formLabel}>
                    <Instagram size={14} style={{ color: '#EC4899', display: 'inline', marginRight: '4px' }} />
                    Instagram:
                  </label>
                  <input
                    className="input"
                    value={editData.social_links?.instagram || ''}
                    onChange={(e) => setEditData({
                      ...editData,
                      social_links: { ...editData.social_links, instagram: e.target.value }
                    })}
                    placeholder="@perfil ou URL completo"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={styles.formLabel}>
                    <Facebook size={14} style={{ color: '#3B82F6', display: 'inline', marginRight: '4px' }} />
                    Facebook:
                  </label>
                  <input
                    className="input"
                    value={editData.social_links?.facebook || ''}
                    onChange={(e) => setEditData({
                      ...editData,
                      social_links: { ...editData.social_links, facebook: e.target.value }
                    })}
                    placeholder="facebook.com/suaempresa"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={styles.formLabel}>
                    <Linkedin size={14} style={{ color: '#0A66C2', display: 'inline', marginRight: '4px' }} />
                    LinkedIn:
                  </label>
                  <input
                    className="input"
                    value={editData.social_links?.linkedin || ''}
                    onChange={(e) => setEditData({
                      ...editData,
                      social_links: { ...editData.social_links, linkedin: e.target.value }
                    })}
                    placeholder="linkedin.com/company/suaempresa"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={styles.formLabel}>
                    <Youtube size={14} style={{ color: '#EF4444', display: 'inline', marginRight: '4px' }} />
                    YouTube:
                  </label>
                  <input
                    className="input"
                    value={editData.social_links?.youtube || ''}
                    onChange={(e) => setEditData({
                      ...editData,
                      social_links: { ...editData.social_links, youtube: e.target.value }
                    })}
                    placeholder="youtube.com/@suaempresa"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Endereço & Localização */}
          <div className="card" style={{ padding: '24px' }}>
            <div className="card-header" style={{ marginBottom: '20px', padding: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MapPin size={20} style={{ color: '#F59E0B' }} />
                <h3 className="card-title">Localização & Endereço Completo</h3>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '16px' }}>
              <div>
                <label style={styles.formLabel}>Endereço Completo / Logradouro:</label>
                <input
                  className="input"
                  value={
                    typeof editData.address === 'object'
                      ? editData.address?.formattedAddress || editData.address?.addressLines?.[0] || ''
                      : editData.address || ''
                  }
                  onChange={(e) => {
                    const current = typeof editData.address === 'object' ? editData.address : {};
                    setEditData({
                      ...editData,
                      address: {
                        ...current,
                        formattedAddress: e.target.value,
                        addressLines: [e.target.value],
                      },
                    });
                  }}
                  placeholder="Rua, Avenida, Número..."
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={styles.formLabel}>Cidade / Município:</label>
                <input
                  className="input"
                  value={typeof editData.address === 'object' ? editData.address?.locality || '' : ''}
                  onChange={(e) => {
                    const current = typeof editData.address === 'object' ? editData.address : {};
                    setEditData({
                      ...editData,
                      address: { ...current, locality: e.target.value },
                    });
                  }}
                  placeholder="Cidade"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Horário de Funcionamento */}
          <div className="card" style={{ padding: '24px' }}>
            <div className="card-header" style={{ marginBottom: '20px', padding: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={20} style={{ color: '#8B5CF6' }} />
                <h3 className="card-title">Horário de Funcionamento Regular</h3>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {WEEKDAYS.map((day) => {
                const dayHours = editData.opening_hours?.[day.id] || { open: '08:00', close: '18:00', closed: false };
                return (
                  <div
                    key={day.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-primary)',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <span style={{ fontWeight: 600, width: '130px', fontSize: '0.875rem' }}>
                      {day.label}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={!dayHours.closed}
                          onChange={(e) => handleHoursChange(day.id, 'closed', !e.target.checked)}
                        />
                        <span>{dayHours.closed ? 'Fechado' : 'Aberto'}</span>
                      </label>

                      {!dayHours.closed && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="time"
                            className="input"
                            value={dayHours.open || '08:00'}
                            onChange={(e) => handleHoursChange(day.id, 'open', e.target.value)}
                            style={{ padding: '4px 8px', fontSize: '0.8125rem' }}
                          />
                          <span style={{ color: '#6B7280' }}>às</span>
                          <input
                            type="time"
                            className="input"
                            value={dayHours.close || '18:00'}
                            onChange={(e) => handleHoursChange(day.id, 'close', e.target.value)}
                            style={{ padding: '4px 8px', fontSize: '0.8125rem' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Bar */}
          <div className="card" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#F8FAFC' }}>
                Pronto para aplicar as alterações?
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#9CA3AF', marginTop: '2px' }}>
                As modificações serão salvas no seu sistema e enviadas para o Google Meu Negócio via API.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => saveClientFull(false)}
                disabled={savingFull}
                className="btn btn-secondary"
              >
                Salvar Apenas Local
              </button>
              <button
                type="button"
                onClick={() => saveClientFull(true)}
                disabled={savingFull}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 22px' }}
              >
                {savingFull ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Sincronizando com Google...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Salvar e Aplicar no Google
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SEO AUDIT */}
      {activeTab === 'seo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Quick Switch to Competitor Analysis */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'rgba(255, 255, 255, 0.03)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} style={{ color: '#8B5CF6' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#E2E8F0' }}>Diagnóstico de SEO Local da Ficha</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab('competitors');
                if (!competitorData && !loadingCompetitors) loadCompetitorAnalysis();
              }}
              className="btn btn-sm"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                color: '#FFF', fontWeight: 600, border: 'none', borderRadius: '8px', padding: '6px 14px'
              }}
            >
              <Target size={14} /> Ver Análise de Concorrentes & Como Superá-los 🚀
            </button>
          </div>
          {loadingSeo ? (
            <div className="card" style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="spinner spinner-lg" style={{ marginBottom: '16px' }} />
              <p style={{ color: '#9CA3AF', fontSize: '1rem', fontWeight: 500 }}>
                Avaliando fatores de ranqueamento local e consultando Gemini IA...
              </p>
            </div>
          ) : !seoAudit ? (
            <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <Sparkles size={36} style={{ color: '#8B5CF6', marginBottom: '12px' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Auditoria de SEO Local</h3>
              <p style={{ color: '#9CA3AF', marginBottom: '20px', fontSize: '0.875rem' }}>
                Descubra a pontuação desta ficha no Google Maps e obtenha melhorias sugeridas por inteligência artificial.
              </p>
              <button onClick={loadSeoAudit} className="btn btn-primary">
                Executar Auditoria Agora
              </button>
            </div>
          ) : (
            <>
              {/* Score card */}
              <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px', flexWrap: 'wrap', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{
                    width: '80px', height: '80px', borderRadius: '50%',
                    border: `4px solid ${seoAudit.tierColor}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    boxShadow: `0 0 25px ${seoAudit.tierColor}33`,
                  }}>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: seoAudit.tierColor }}>
                      {seoAudit.score}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: '-4px' }}>/ 100</span>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: '999px',
                        fontSize: '0.75rem', fontWeight: 700,
                        backgroundColor: `${seoAudit.tierColor}22`, color: seoAudit.tierColor,
                      }}>
                        {seoAudit.tier}
                      </span>

                      {seoAudit.isSaved && (
                        <span
                          id="client-badge-saved-audit"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 9px',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: '#34D399',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                          }}
                        >
                          💾 Auditoria Salva {seoAudit.audited_at ? `(${new Date(seoAudit.audited_at).toLocaleDateString('pt-BR')})` : ''}
                        </span>
                      )}

                      {seoAudit.scoreDifference !== null && seoAudit.scoreDifference !== undefined && (
                        <span
                          id="client-badge-score-evolution"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 9px',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            backgroundColor: seoAudit.scoreDifference >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: seoAudit.scoreDifference >= 0 ? '#10B981' : '#EF4444',
                            border: `1px solid ${seoAudit.scoreDifference >= 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                          }}
                        >
                          <TrendingUp size={11} />
                          Evolução: {seoAudit.scoreDifference >= 0 ? `+${seoAudit.scoreDifference}` : seoAudit.scoreDifference} pts
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Saúde da Ficha no Google Maps</h3>
                    <p style={{ fontSize: '0.8125rem', color: '#9CA3AF', marginTop: '2px' }}>
                      Relevância: {seoAudit.breakdown?.relevance?.score}/30 • Reputação: {seoAudit.breakdown?.reputation?.score}/30 • Atividade: {seoAudit.breakdown?.activity?.score}/20 • NAP: {seoAudit.breakdown?.nap?.score}/20
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => loadSeoAudit(true)}
                  disabled={loadingSeo}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={14} className={loadingSeo ? 'animate-spin' : ''} />
                  {loadingSeo ? 'Reavaliando...' : 'Refazer Auditoria com IA'}
                </button>
              </div>

              {/* Historical Evolution Timeline if available */}
              {seoAudit.history && seoAudit.history.length > 0 && (
                <div
                  className="card"
                  style={{
                    padding: '16px 20px',
                    backgroundColor: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    borderRadius: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TrendingUp size={16} style={{ color: '#8B5CF6' }} />
                      <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, color: '#F8FAFC' }}>
                        Evolução Histórica da Ficha ({seoAudit.history.length + 1} auditorias)
                      </h4>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
                    <div style={{
                      minWidth: '150px', padding: '10px 12px', borderRadius: '8px',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)',
                      display: 'flex', flexDirection: 'column', gap: '4px'
                    }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase' }}>Atual</span>
                      <span style={{ fontSize: '1.4rem', fontWeight: 800, color: seoAudit.tierColor }}>{seoAudit.score} pts</span>
                      <span style={{ fontSize: '0.7rem', color: '#CBD5E1' }}>{seoAudit.tier}</span>
                      <span style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>{seoAudit.audited_at ? new Date(seoAudit.audited_at).toLocaleDateString('pt-BR') : 'Hoje'}</span>
                    </div>
                    {seoAudit.history.slice().reverse().map((h, idx) => {
                      const diff = seoAudit.score - h.score;
                      return (
                        <div key={idx} style={{
                          minWidth: '150px', padding: '10px 12px', borderRadius: '8px',
                          backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)',
                          display: 'flex', flexDirection: 'column', gap: '4px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>Anterior #{seoAudit.history.length - idx}</span>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: diff >= 0 ? '#10B981' : '#EF4444' }}>
                              {diff >= 0 ? `+${diff}` : diff} pts
                            </span>
                          </div>
                          <span style={{ fontSize: '1.3rem', fontWeight: 700, color: h.tierColor || '#E2E8F0' }}>{h.score} pts</span>
                          <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{h.tier}</span>
                          <span style={{ fontSize: '0.65rem', color: '#6B7280' }}>{h.audited_at ? new Date(h.audited_at).toLocaleDateString('pt-BR') : '—'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* AI Diagnostic */}
              <div className="card">
                <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} style={{ color: '#8B5CF6' }} />
                  <h3 className="card-title">Diagnóstico do Gemini IA</h3>
                </div>
                <div style={{ padding: '16px 20px', color: '#E2E8F0', lineHeight: 1.7, fontSize: '0.9375rem' }}>
                  {seoAudit.aiSuggestions?.seoDiagnostic}
                </div>

                {seoAudit.aiSuggestions?.localKeywords?.length > 0 && (
                  <div style={{ padding: '0 20px 16px' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>
                      Palavras-chave Locais Mais Relevantes:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {seoAudit.aiSuggestions.localKeywords.map((kw, i) => (
                        <span key={i} className="badge badge-blue">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* OTIMIZADOR DE DESCRIÇÃO E APLICAÇÃO */}
              <div className="card" style={{ border: '1px solid rgba(59, 130, 246, 0.4)' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Edit3 size={16} style={{ color: '#3B82F6' }} />
                    <h3 className="card-title">Otimizador de Descrição da Ficha</h3>
                  </div>
                  <button
                    onClick={applySeoChanges}
                    disabled={applyingSeo || !editedDesc}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    {applyingSeo ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Salvando no Google...
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        Aplicar Mudanças na Ficha
                      </>
                    )}
                  </button>
                </div>

                {seoApplyResult && (
                  <div style={{
                    margin: '12px 20px 0', padding: '10px 14px', borderRadius: '8px',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    backgroundColor: seoApplyResult.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    border: `1px solid ${seoApplyResult.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    fontSize: '0.875rem',
                  }}>
                    {seoApplyResult.type === 'success' ? (
                      <CheckCircle2 size={16} style={{ color: '#10B981' }} />
                    ) : (
                      <XCircle size={16} style={{ color: '#EF4444' }} />
                    )}
                    <span>{seoApplyResult.message}</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '16px', padding: '16px 20px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '260px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF' }}>ATUAL</span>
                      <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                        {client.description?.length || 0}/750
                      </span>
                    </div>
                    <div style={{
                      padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-primary)', minHeight: '140px', fontSize: '0.875rem', color: '#9CA3AF'
                    }}>
                      {client.description || 'Nenhuma descrição cadastrada.'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ArrowRight size={20} style={{ color: '#3B82F6' }} />
                  </div>

                  <div style={{ flex: 1, minWidth: '260px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8B5CF6' }}>SUGESTÃO IA (EDITÁVEL)</span>
                      <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                        {editedDesc.length}/750
                      </span>
                    </div>
                    <textarea
                      className="input textarea"
                      value={editedDesc}
                      onChange={(e) => setEditedDesc(e.target.value)}
                      maxLength={750}
                      rows={6}
                      style={{ width: '100%', fontSize: '0.875rem', lineHeight: 1.6 }}
                      placeholder="Descrição otimizada com palavras-chave locais..."
                    />
                  </div>
                </div>
              </div>

              {/* Checklist */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Checklist de Itens Avaliados</h3>
                </div>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px' }}>Status</th>
                        <th>Critério</th>
                        <th>Diagnóstico</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(seoAudit.checklist || []).map((item, i) => (
                        <tr key={i}>
                          <td>
                            {item.status === 'pass' && <CheckCircle2 size={16} style={{ color: '#10B981' }} />}
                            {item.status === 'warning' && <AlertTriangle size={16} style={{ color: '#F59E0B' }} />}
                            {item.status === 'fail' && <XCircle size={16} style={{ color: '#EF4444' }} />}
                          </td>
                          <td style={{ fontWeight: 600 }}>{item.item}</td>
                          <td style={{ fontSize: '0.8125rem', color: '#CBD5E1' }}>{item.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB: CONCORRENTES & SUPERAÇÃO NO GOOGLE MAPS */}
      {activeTab === 'competitors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Card */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target size={22} style={{ color: '#F59E0B' }} />
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                    Análise de Concorrentes & Estratégia de Superação
                  </h2>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#9CA3AF', marginTop: '6px', marginBottom: 0 }}>
                  Compare sua ficha com os líderes locais no Google Maps e veja as ações exatas para conquistar as primeiras posições.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => loadCompetitorAnalysis(true)}
                  disabled={loadingCompetitors}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={14} className={loadingCompetitors ? 'animate-spin' : ''} />
                  {loadingCompetitors ? 'Analisando...' : 'Reanalisar Concorrentes'}
                </button>
              </div>
            </div>
          </div>

          {loadingCompetitors ? (
            <div className="card" style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="spinner spinner-lg" style={{ marginBottom: '16px' }} />
              <p style={{ color: '#E2E8F0', fontSize: '1.1rem', fontWeight: 600 }}>
                Mapeando concorrência local com Gemini IA...
              </p>
              <p style={{ color: '#9CA3AF', fontSize: '0.875rem', marginTop: '4px' }}>
                Avaliando concorrentes do nicho, categorias secundárias dos líderes e brechas para ranquear acima no Google Maps.
              </p>
            </div>
          ) : !competitorData ? (
            <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Target size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
                Descubra Seus Concorrentes no Google Maps
              </h3>
              <p style={{ color: '#9CA3AF', maxWidth: '560px', margin: '0 auto 20px', fontSize: '0.875rem', lineHeight: 1.6 }}>
                Nossa IA analisa os melhores perfis no Google Maps na sua região, identifica os pontos fracos deles e traça um plano de ação para sua ficha ultrapassá-los.
              </p>
              <button
                type="button"
                onClick={() => loadCompetitorAnalysis(true)}
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', border: 'none', padding: '10px 24px', fontSize: '0.95rem' }}
              >
                <Sparkles size={16} /> Iniciar Análise de Concorrentes Agora
              </button>
            </div>
          ) : (
            <>
              {/* BENCHMARK & POSIÇÃO COMPETITIVA */}
              <div className="card" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span className="badge badge-amber" style={{ fontSize: '0.8125rem', fontWeight: 700, padding: '4px 12px' }}>
                        🏆 {competitorData.benchmarkSummary?.status || 'Desafiante no Top Local'}
                      </span>
                      <span className="badge badge-blue" style={{ fontSize: '0.75rem' }}>
                        Dificuldade do Nicho: {competitorData.benchmarkSummary?.marketDifficulty || 'Média'}
                      </span>
                      {competitorData.analyzed_at && (
                        <span
                          className="badge"
                          style={{
                            fontSize: '0.72rem',
                            padding: '3px 9px',
                            borderRadius: '999px',
                            fontWeight: 700,
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: '#34D399',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                          }}
                        >
                          💾 Análise Salva ({new Date(competitorData.analyzed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })})
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                      Cenário Competitivo em {competitorData.client?.city || 'sua região'}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => loadCompetitorAnalysis(true)}
                    disabled={loadingCompetitors}
                    className="btn btn-secondary btn-sm"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      color: '#FCD34D',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      padding: '8px 16px',
                    }}
                    title="Recalcula com Gemini IA a análise dos concorrentes locais e plano de superação"
                  >
                    <RefreshCw size={14} className={loadingCompetitors ? 'animate-spin' : ''} />
                    {loadingCompetitors ? 'Reavaliando com IA...' : 'Refazer Análise com IA'}
                  </button>
                </div>

                {/* Stat comparison grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '18px' }}>
                  <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600 }}>SUA NOTA MÉDIA</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10B981', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {Number(client?.average_rating || competitorData.client?.average_rating || 0).toFixed(1)} <Star size={16} fill="#10B981" color="#10B981" />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                      Média concorrência: {competitorData.benchmarkSummary?.avgCompetitorRating || '4.7'} ★
                    </span>
                  </div>

                  <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600 }}>SUAS AVALIAÇÕES</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38BDF8', marginTop: '4px' }}>
                      {client?.total_reviews || competitorData.client?.total_reviews || 0}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                      Média concorrência: {competitorData.benchmarkSummary?.avgCompetitorReviews || 0}
                    </span>
                  </div>

                  <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600 }}>LÍDER DA REGIÃO</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F59E0B', marginTop: '4px' }}>
                      {competitorData.benchmarkSummary?.leaderReviews || 0}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                      Avaliações do líder atual
                    </span>
                  </div>

                  <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 700 }}>META PARA SUPERAR</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>
                      +{competitorData.benchmarkSummary?.reviewsNeededToOutrank || 25}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#34D399' }}>
                      Avaliações para assumir ponta
                    </span>
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: '0.875rem', color: '#CBD5E1', lineHeight: 1.6, background: 'rgba(0, 0, 0, 0.25)', padding: '12px 16px', borderRadius: '8px', borderLeft: '3px solid #F59E0B' }}>
                  {competitorData.benchmarkSummary?.marketOverview}
                </p>
              </div>

              {/* O QUE FAZER PARA SUPERAR OS CONCORRENTES (DESTAQUE MÁXIMO) */}
              <div className="card" style={{ border: '1px solid rgba(16, 185, 129, 0.35)', background: 'rgba(16, 185, 129, 0.02)' }}>
                <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                      <Trophy size={18} />
                    </div>
                    <div>
                      <h3 className="card-title" style={{ fontSize: '1.1rem', margin: 0 }}>
                        {competitorData.strategyToOutrank?.title || 'Plano de Ação para Superar os Concorrentes no Google'}
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: '#9CA3AF', margin: '2px 0 0' }}>
                        Passo a passo estratégico baseado nas brechas e falhas identificadas nos líderes locais.
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* 1. Categorias que os concorrentes usam e você não tem */}
                  {competitorData.strategyToOutrank?.categoriesStrategy?.missingRecommendedCategories?.length > 0 && (
                    <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '10px', padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Tag size={16} style={{ color: '#3B82F6' }} />
                        <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#93C5FD', margin: 0 }}>
                          1. Categorias Secundárias dos Concorrentes (Adicione à Ficha)
                        </h4>
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: '#CBD5E1', marginBottom: '12px' }}>
                        {competitorData.strategyToOutrank.categoriesStrategy.explanation || 'Adicione estas categorias para capturar buscas que hoje vão diretamente para seus concorrentes:'}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {competitorData.strategyToOutrank.categoriesStrategy.missingRecommendedCategories.map((cat, idx) => {
                          const alreadyHas = (editData.secondary_categories || []).includes(cat);
                          return (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: alreadyHas ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.12)',
                                border: `1px solid ${alreadyHas ? 'rgba(16, 185, 129, 0.4)' : 'rgba(59, 130, 246, 0.3)'}`,
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '0.8125rem',
                              }}
                            >
                              <span style={{ color: alreadyHas ? '#10B981' : '#E2E8F0', fontWeight: 600 }}>
                                {cat}
                              </span>
                              {alreadyHas ? (
                                <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.72rem' }}>
                                  <Check size={12} /> Adicionada
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => addSuggestedCategory(cat)}
                                  className="btn btn-xs btn-primary"
                                  style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                                >
                                  + Adicionar
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2. Estratégia de Avaliações e Ritmo Semanal */}
                  {competitorData.strategyToOutrank?.reviewsStrategy && (
                    <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '10px', padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Star size={16} style={{ color: '#F59E0B' }} />
                        <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#FCD34D', margin: 0 }}>
                          2. Ritmo de Avaliações para Ultrapassar o Líder
                        </h4>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '8px' }}>
                          <span style={{ fontSize: '0.72rem', color: '#9CA3AF', display: 'block' }}>RITMO SEMANAL SUGERIDO</span>
                          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#F59E0B' }}>
                            {competitorData.strategyToOutrank.reviewsStrategy.weeklyPace}
                          </span>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '8px' }}>
                          <span style={{ fontSize: '0.72rem', color: '#9CA3AF', display: 'block' }}>TEMPO ESTIMADO PARA LIDERANÇA</span>
                          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#10B981' }}>
                            {competitorData.strategyToOutrank.reviewsStrategy.estimatedTimeToLead || '6 a 8 semanas'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {(competitorData.strategyToOutrank.reviewsStrategy.reviewTactics || []).map((tactic, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.8125rem', color: '#E2E8F0' }}>
                            <span style={{ color: '#F59E0B', fontWeight: 700 }}>•</span>
                            <span>{tactic}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Estratégia de Fotos e Conteúdo */}
                  {competitorData.strategyToOutrank?.contentAndPhotosStrategy && (
                    <div style={{ background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '10px', padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Camera size={16} style={{ color: '#8B5CF6' }} />
                        <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#C4B5FD', margin: 0 }}>
                          3. Conteúdo Visual & Frequência de Postagem
                        </h4>
                      </div>

                      <p style={{ fontSize: '0.8125rem', color: '#CBD5E1', marginBottom: '10px' }}>
                        {competitorData.strategyToOutrank.contentAndPhotosStrategy.postStrategyTip}
                      </p>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {(competitorData.strategyToOutrank.contentAndPhotosStrategy.recommendedPhotoTypes || []).map((type, i) => (
                          <span key={i} className="badge badge-purple" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                            📸 {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. Quick Wins Imediatos (Checklist Interativo) */}
                  {competitorData.strategyToOutrank?.quickWins?.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Zap size={16} style={{ color: '#10B981' }} />
                        Quick Wins Imediatos (Ações de Alto Impacto para Fazer Hoje)
                      </h4>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {competitorData.strategyToOutrank.quickWins.map((qw) => {
                          const isDone = completedQuickWins.includes(qw.id);
                          return (
                            <div
                              key={qw.id}
                              onClick={() => toggleQuickWin(qw.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                                padding: '12px 14px',
                                borderRadius: '8px',
                                background: isDone ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                                border: `1px solid ${isDone ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.07)'}`,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <div style={{
                                width: '20px', height: '20px', borderRadius: '5px',
                                border: `2px solid ${isDone ? '#10B981' : '#6B7280'}`,
                                background: isDone ? '#10B981' : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginTop: '2px', flexShrink: 0
                              }}>
                                {isDone && <Check size={14} color="#000" strokeWidth={3} />}
                              </div>

                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: isDone ? '#9CA3AF' : '#F8FAFC', textDecoration: isDone ? 'line-through' : 'none' }}>
                                    {qw.title}
                                  </span>
                                  <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>
                                    Impacto: {qw.impact}
                                  </span>
                                  <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>
                                    ⏱️ {qw.time}
                                  </span>
                                </div>
                                <p style={{ fontSize: '0.8125rem', color: isDone ? '#6B7280' : '#9CA3AF', margin: '4px 0 0', lineHeight: 1.5 }}>
                                  {qw.action}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* CARDS DOS CONCORRENTES MAPEADOS */}
              <div className="card">
                <div className="card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={18} style={{ color: '#3B82F6' }} />
                    <h3 className="card-title">Concorrentes Diretos Mapeados no Google Maps</h3>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>
                    {competitorData.competitors?.length || 0} competidores analisados
                  </span>
                </div>

                <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                  {(competitorData.competitors || []).map((comp, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.07)',
                        borderRadius: '10px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div>
                          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#F1F5F9', margin: '0 0 4px' }}>
                            {comp.name}
                          </h4>
                          <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
                            🏷️ {comp.primaryCategory}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', color: '#F59E0B', fontWeight: 700, fontSize: '0.95rem' }}>
                            <span>{comp.rating}</span>
                            <Star size={14} fill="#F59E0B" color="#F59E0B" />
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                            {comp.reviewCount} avaliações
                          </span>
                        </div>
                      </div>

                      {/* Secondary categories */}
                      {comp.secondaryCategories?.length > 0 && (
                        <div>
                          <span style={{ fontSize: '0.7rem', color: '#9CA3AF', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                            CATEGORIAS SECUNDÁRIAS USADAS:
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {comp.secondaryCategories.map((c, i) => (
                              <span key={i} className="badge badge-purple" style={{ fontSize: '0.6875rem' }}>
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Pontos fortes */}
                      {comp.strengths?.length > 0 && (
                        <div>
                          <span style={{ fontSize: '0.7rem', color: '#10B981', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                            PONTOS FORTES:
                          </span>
                          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.78125rem', color: '#CBD5E1' }}>
                            {comp.strengths.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Vulnerabilidades (Brechas) */}
                      {comp.vulnerabilities?.length > 0 && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '6px', padding: '8px 10px' }}>
                          <span style={{ fontSize: '0.7rem', color: '#F87171', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
                            ⚠️ BRECHAS PARA VOCÊ EXPLORAR:
                          </span>
                          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.78125rem', color: '#FECACA' }}>
                            {comp.vulnerabilities.map((v, i) => (
                              <li key={i}>{v}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB: PESQUISAS (TERMOS DE BUSCA E PERFORMANCE GOOGLE) */}
      {activeTab === 'searches' && (
        loadingSearches ? (
          <div className="card" style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="spinner spinner-lg" style={{ marginBottom: '16px' }} />
            <p style={{ color: '#E2E8F0', fontSize: '1rem', fontWeight: 600 }}>
              Buscando termos de pesquisa diretamente com a API do Google...
            </p>
            <p style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>
              Isso pode levar alguns segundos na primeira consulta.
            </p>
          </div>
        ) : !searchesData ? (
          <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
            <Search size={36} style={{ color: '#3B82F6', marginBottom: '12px' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
              Termos de Pesquisa do Google
            </h3>
            <p style={{ color: '#9CA3AF', maxWidth: '520px', margin: '0 auto 20px', fontSize: '0.875rem' }}>
              Carregue as palavras-chave reais que seus clientes utilizaram para encontrar sua empresa no Google Maps e na Busca.
            </p>
            <button onClick={() => loadSearchesData(true)} className="btn btn-primary">
              <Search size={16} /> Carregar Pesquisas do Google
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header Card */}
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Search size={20} style={{ color: '#3B82F6' }} />
                    Termos de Pesquisa e Consultas no Google
                  </h2>
                  <p style={{ fontSize: '0.875rem', color: '#9CA3AF', marginTop: '4px' }}>
                    Acompanhe exatamente as palavras e expressões digitadas pelos clientes no Google que exibiram o perfil da sua empresa.
                  </p>
                </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                {searchesAiAnalysis?.analyzed_at && (
                  <span
                    className="badge"
                    style={{
                      fontSize: '0.72rem',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontWeight: 700,
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#34D399',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                    }}
                  >
                    💾 Diagnóstico Salvo ({new Date(searchesAiAnalysis.analyzed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })})
                  </span>
                )}

                <button
                  type="button"
                  onClick={analyzeSearchesWithAi}
                  disabled={analyzingSearchesAi || !searchesData}
                  className="btn btn-primary btn-sm"
                  style={{
                    background: searchesAiAnalysis
                      ? 'rgba(139, 92, 246, 0.18)'
                      : 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
                    border: searchesAiAnalysis ? '1px solid rgba(139, 92, 246, 0.45)' : 'none',
                    color: searchesAiAnalysis ? '#C4B5FD' : '#FFF',
                    fontWeight: 600,
                  }}
                  title="A IA analisa os termos de busca para gerar recomendações de ranqueamento"
                >
                  {analyzingSearchesAi ? (
                    <>
                      <div className="spinner spinner-sm" /> Analisando Termos...
                    </>
                  ) : searchesAiAnalysis ? (
                    <>
                      <RefreshCw size={14} /> Refazer Diagnóstico com IA
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} /> Analisar Pesquisas com IA
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => loadSearchesData(true)}
                  disabled={loadingSearches}
                  className="btn btn-secondary btn-sm"
                  title="Atualizar dados de pesquisa com o Google"
                >
                  <RefreshCw size={14} className={loadingSearches ? 'animate-spin' : ''} />
                  Atualizar
                </button>
              </div>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="card stat-card" style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <div style={{ ...styles.statIcon, background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}>
                <Search size={20} />
              </div>
              <div className="stat-value">
                {Number(searchesData?.summary?.total_searches_30d || client?.searches_30d || 0).toLocaleString('pt-BR')}
              </div>
              <div className="stat-label">Pesquisas (30 dias)</div>
            </div>

            <div className="card stat-card" style={{ background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
              <div style={{ ...styles.statIcon, background: 'rgba(6, 182, 212, 0.15)', color: '#06B6D4' }}>
                <Eye size={20} />
              </div>
              <div className="stat-value">
                {Number(searchesData?.summary?.total_views_30d || client?.views_30d || 0).toLocaleString('pt-BR')}
              </div>
              <div className="stat-label">Visualizações de Perfil</div>
            </div>

            <div className="card stat-card" style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div style={{ ...styles.statIcon, background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
                <Zap size={20} />
              </div>
              <div className="stat-value">
                {searchesData?.summary?.conversion_rate || '0%'}
              </div>
              <div className="stat-label">Taxa de Conversão em Ações</div>
            </div>

            <div className="card stat-card" style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <div style={{ ...styles.statIcon, background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}>
                <TrendingUp size={20} />
              </div>
              <div className="stat-value">
                {searchesData?.summary?.avg_daily_searches || '0'}
              </div>
              <div className="stat-label">Média de Buscas / Dia</div>
            </div>
          </div>

          {/* AI Search Intelligence Panel (if generated) */}
          {searchesAiAnalysis && (
            <div className="card" style={{
              padding: '24px',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A78BFA' }}>
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#F3F4F6', margin: 0 }}>
                        Diagnóstico Estratégico de Buscas (Inteligência Artificial)
                      </h3>
                      {searchesAiAnalysis.analyzed_at && (
                        <span
                          className="badge"
                          style={{
                            fontSize: '0.72rem',
                            padding: '3px 8px',
                            borderRadius: '999px',
                            fontWeight: 700,
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: '#34D399',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                          }}
                        >
                          💾 Salvo ({new Date(searchesAiAnalysis.analyzed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })})
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: '#9CA3AF', margin: '2px 0 0' }}>
                      Análise dos termos pesquisados e oportunidades para ranquear acima da concorrência
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={analyzeSearchesWithAi}
                  disabled={analyzingSearchesAi}
                  className="btn btn-secondary btn-sm"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(139, 92, 246, 0.15)',
                    border: '1px solid rgba(139, 92, 246, 0.4)',
                    color: '#C4B5FD',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  <RefreshCw size={13} className={analyzingSearchesAi ? 'animate-spin' : ''} />
                  {analyzingSearchesAi ? 'Reavaliando com IA...' : 'Refazer Diagnóstico com IA'}
                </button>
              </div>

              <div style={{ padding: '14px 16px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', marginBottom: '20px' }}>
                <p style={{ fontSize: '0.875rem', color: '#E2E8F0', lineHeight: 1.6, margin: 0 }}>
                  {searchesAiAnalysis.summary}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                {/* Oportunidades de Palavras-Chave */}
                <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.04)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#60A5FA', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Search size={14} /> Termos com Maior Potencial
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(searchesAiAnalysis.topOpportunities || []).map((item, idx) => (
                      <div key={idx} style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#F3F4F6' }}>"{item.keyword}"</span>
                          <span className="badge badge-green" style={{ fontSize: '0.6875rem' }}>{item.potential}</span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: 0 }}>{item.action}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Termos Ausentes para Adicionar */}
                <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#34D399', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lightbulb size={14} /> Termos Faltantes no Nicho
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(searchesAiAnalysis.missingKeywords || []).map((term, idx) => (
                      <span
                        key={idx}
                        className="badge"
                        style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#6EE7B7', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '6px 12px', fontSize: '0.8125rem' }}
                      >
                        + {term}
                      </span>
                    ))}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '12px' }}>
                    Dica: use esses termos no título ou na descrição dos seus serviços cadastrados e posts semanais.
                  </p>
                </div>
              </div>

              {/* Ações Recomendadas */}
              {searchesAiAnalysis.recommendedActions?.length > 0 && (
                <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#F3F4F6', marginBottom: '10px' }}>
                    🚀 Recomendações Práticas para Dominar as Buscas:
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: '#D1D5DB', fontSize: '0.8125rem', lineHeight: 1.8 }}>
                    {searchesAiAnalysis.recommendedActions.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Keywords Table with Filters */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Termos de Pesquisa dos Clientes</span>
                  <span className="badge badge-purple">
                    {searchesData?.keywords?.length || 0} termos registrados
                  </span>
                </h3>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Filtrar palavra ou termo..."
                  value={searchTermFilter}
                  onChange={(e) => setSearchTermFilter(e.target.value)}
                  style={{ padding: '6px 12px', fontSize: '0.8125rem', width: '220px' }}
                />

                <div style={{ display: 'flex', gap: '4px', background: 'rgba(255, 255, 255, 0.05)', padding: '2px', borderRadius: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setSearchTypeFilter('all')}
                    className={`btn btn-sm ${searchTypeFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchTypeFilter('direct')}
                    className={`btn btn-sm ${searchTypeFilter === 'direct' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                  >
                    Marca
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchTypeFilter('discovery')}
                    className={`btn btn-sm ${searchTypeFilter === 'discovery' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                  >
                    Serviço/Nicho
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchTypeFilter('local')}
                    className={`btn btn-sm ${searchTypeFilter === 'local' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                  >
                    Local ("Perto de mim")
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            {(() => {
              const list = (searchesData?.keywords || []).filter((k) => {
                const matchQuery = !searchTermFilter || k.term.toLowerCase().includes(searchTermFilter.toLowerCase());
                const matchType = searchTypeFilter === 'all' || k.type === searchTypeFilter;
                return matchQuery && matchType;
              });

              if (list.length === 0) {
                return (
                  <div className="empty-state" style={{ padding: '32px 16px' }}>
                    <div className="empty-state-title" style={{ fontSize: '1rem' }}>
                      Nenhum termo encontrado com os filtros atuais
                    </div>
                    <div className="empty-state-text" style={{ fontSize: '0.8125rem' }}>
                      Tente alterar os filtros de busca ou aguarde novas buscas sincronizadas.
                    </div>
                  </div>
                );
              }

              return (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>#</th>
                        <th>Termo Pesquisado</th>
                        <th>Tipo de Busca</th>
                        <th style={{ textAlign: 'right' }}>Impressões / Volume</th>
                        <th>Intenção do Usuário</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ color: '#6B7280', fontSize: '0.75rem' }}>{idx + 1}</td>
                          <td style={{ fontWeight: 600, color: '#F3F4F6' }}>
                            "{item.term}"
                          </td>
                          <td>
                            {item.type === 'direct' ? (
                              <span className="badge badge-purple" style={{ fontSize: '0.6875rem' }}>
                                Busca Direta (Nome)
                              </span>
                            ) : item.type === 'local' ? (
                              <span className="badge badge-green" style={{ fontSize: '0.6875rem' }}>
                                Conveniência Local
                              </span>
                            ) : (
                              <span className="badge badge-blue" style={{ fontSize: '0.6875rem' }}>
                                Descoberta / Nicho
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#38BDF8' }}>
                            {item.isThreshold ? `≥ ${item.impressions}` : item.impressions}
                          </td>
                          <td style={{ fontSize: '0.8125rem', color: '#9CA3AF' }}>
                            {item.type === 'direct'
                              ? 'Cliente já conhece a empresa e procurou diretamente'
                              : item.type === 'local'
                                ? 'Busca imediata por atendimento na região'
                                : 'Pesquisa genérica pelo serviço no Google'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>

          {/* Daily History Table (last 30 days) */}
          {searchesData?.history?.length > 0 && (
            <div className="card" style={{ padding: '20px' }}>
              <h3 className="card-title" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} style={{ color: '#06B6D4' }} />
                Histórico Diário de Pesquisas (Últimos 30 Dias)
              </h3>
              <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th style={{ textAlign: 'center' }}>Pesquisas no Google</th>
                      <th style={{ textAlign: 'center' }}>Visualizações do Perfil</th>
                      <th style={{ textAlign: 'center' }}>Interações Geradas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchesData.history.map((row, i) => {
                      const isPeak = searchesData.summary?.peak_day?.date === row.metric_date;
                      return (
                        <tr key={i} style={{ background: isPeak ? 'rgba(59, 130, 246, 0.08)' : undefined }}>
                          <td style={{ fontWeight: isPeak ? 700 : 500 }}>
                            {new Date(row.metric_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            {isPeak && (
                              <span className="badge badge-blue" style={{ marginLeft: '8px', fontSize: '0.65rem' }}>
                                🏆 Pico
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: '#3B82F6' }}>
                            {row.searches || 0}
                          </td>
                          <td style={{ textAlign: 'center', color: '#06B6D4' }}>
                            {row.views || 0}
                          </td>
                          <td style={{ textAlign: 'center', color: '#10B981', fontWeight: 600 }}>
                            {row.actions || 0}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        )
      )}

      {/* TAB 4: POSTS & BULK SCHEDULER */}
      {activeTab === 'posts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top Header Card */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={24} style={{ color: '#3B82F6' }} />
                  Criação, Programação & Envio de Posts em Massa no Google
                </h2>
                <p style={{ fontSize: '0.875rem', color: '#9CA3AF', marginTop: '6px', maxWidth: '720px', lineHeight: 1.5 }}>
                  Crie campanhas completas de uma vez. Gere uma grade com múltiplos posts usando inteligência artificial, programe datas e horários, e salve tudo em lote para publicação direta no Google Meu Negócio.
                </p>
              </div>

              {/* Metrics Pill & Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    setPostToEdit(null);
                    setShowGooglePostModal(true);
                  }}
                  className="btn btn-primary btn-sm"
                  style={{
                    background: 'linear-gradient(135deg, #1A73E8, #0B57D0)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 700,
                    boxShadow: '0 2px 10px rgba(26, 115, 232, 0.35)',
                  }}
                >
                  <Plus size={15} strokeWidth={2.5} />
                  + Criar Postagem (Estilo Google)
                </button>

                <button
                  type="button"
                  onClick={() => setShowBulkPostCreator(!showBulkPostCreator)}
                  className="btn btn-primary btn-sm"
                  style={{
                    background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 700,
                  }}
                >
                  <Sparkles size={14} />
                  {showBulkPostCreator ? 'Fechar Gerador com IA' : '✨ Gerar Posts em Massa com IA'}
                </button>

                <button
                  type="button"
                  onClick={addManualPostToQueue}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={14} /> Adicionar Post Manual
                </button>
              </div>
            </div>

            {/* Metrics Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '20px' }}>
              <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600 }}>TOTAL DE POSTS</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#60A5FA', marginTop: '2px' }}>{posts.length}</div>
              </div>
              <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600 }}>PUBLICADOS NO GOOGLE</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34D399', marginTop: '2px' }}>
                  {posts.filter((p) => p.status === 'published').length}
                </div>
              </div>
              <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600 }}>AGENDADOS NA FILA</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FBBF24', marginTop: '2px' }}>
                  {posts.filter((p) => p.status === 'scheduled').length}
                </div>
              </div>
            </div>

            {/* Notification alert */}
            {bulkPostsMsg && (
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                borderRadius: '8px',
                background: bulkPostsMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${bulkPostsMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                color: '#F8FAFC',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                {bulkPostsMsg.type === 'success' ? <CheckCircle2 size={18} style={{ color: '#10B981' }} /> : <XCircle size={18} style={{ color: '#EF4444' }} />}
                <span>{bulkPostsMsg.text}</span>
              </div>
            )}
          </div>

          {/* PAINEL DO GERADOR EM LOTE COM IA */}
          {showBulkPostCreator && (
            <div className="card" style={{
              padding: '24px',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.04), rgba(0,0,0,0.2))',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Sparkles size={20} style={{ color: '#8B5CF6' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#E2E8F0' }}>
                  Gerador Automático de Lote de Posts com IA
                </h3>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#9CA3AF', margin: '0 0 16px', lineHeight: 1.5 }}>
                Selecione quantos posts você deseja planejar e o intervalo. A inteligência artificial criará conteúdos variados (dicas, destaques de serviços, chamadas para ação e prova social) já distribuídos nas datas corretas.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={styles.formLabel}>Quantidade de Posts:</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[3, 5, 7, 10, 15].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setBulkAiCount(cnt)}
                        className={`btn btn-sm ${bulkAiCount === cnt ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, fontWeight: 700 }}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={styles.formLabel}>Intervalo entre Posts:</label>
                  <select
                    className="input"
                    value={bulkAiInterval}
                    onChange={(e) => setBulkAiInterval(parseInt(e.target.value) || 3)}
                    style={{ width: '100%' }}
                  >
                    <option value={1}>Diário (todos os dias)</option>
                    <option value={2}>A cada 2 dias</option>
                    <option value={3}>A cada 3 dias (~2 por semana)</option>
                    <option value={5}>A cada 5 dias</option>
                    <option value={7}>Semanal (a cada 7 dias)</option>
                  </select>
                </div>

                <div>
                  <label style={styles.formLabel}>Data do 1º Post:</label>
                  <input
                    type="date"
                    className="input"
                    value={bulkAiStartDate}
                    onChange={(e) => setBulkAiStartDate(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={styles.formLabel}>Tema ou Foco da Campanha (Opcional):</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: Foco em captação de clientes, promoções do mês, serviços de tráfego pago..."
                  value={bulkAiFocus}
                  onChange={(e) => setBulkAiFocus(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowBulkPostCreator(false)}
                  className="btn btn-ghost btn-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={generateBulkPostsWithAi}
                  disabled={generatingBulkPosts}
                  className="btn btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 700,
                  }}
                >
                  {generatingBulkPosts ? <div className="spinner spinner-xs" /> : <Sparkles size={16} />}
                  {generatingBulkPosts ? 'Gerando Lote com IA...' : `Gerar ${bulkAiCount} Posts com IA`}
                </button>
              </div>
            </div>
          )}

          {/* FILA DE POSTS A SEREM SALVOS E AGENDADOS EM MASSA */}
          {bulkPostsQueue.length > 0 && (
            <div className="card" style={{
              padding: '24px',
              border: '2px solid rgba(59, 130, 246, 0.4)',
              background: 'rgba(59, 130, 246, 0.03)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
                    <Layers size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
                      Fila de Posts em Massa ({bulkPostsQueue.length})
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: '2px 0 0' }}>
                      Revise o conteúdo e as datas programadas abaixo antes de salvar e enviar ao Google.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={addManualPostToQueue}
                    className="btn btn-secondary btn-sm"
                  >
                    <Plus size={14} /> + Mais um post
                  </button>
                  <button
                    type="button"
                    onClick={() => distributeQueueDates(bulkAiInterval || 3)}
                    className="btn btn-secondary btn-sm"
                    title="Recalcula as datas sequencialmente a partir da data inicial"
                  >
                    <Calendar size={14} /> Redistribuir Datas
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkPostsQueue([])}
                    className="btn btn-ghost btn-sm"
                    style={{ color: '#EF4444' }}
                  >
                    Limpar Fila
                  </button>
                </div>
              </div>

              {/* LISTA DOS POSTS NA FILA */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                {bulkPostsQueue.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '16px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge badge-blue" style={{ fontWeight: 700 }}>
                          #{idx + 1}
                        </span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#E2E8F0' }}>
                          {item.topic || `Post #${idx + 1}`}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeQueuePost(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#EF4444',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.75rem',
                        }}
                      >
                        <Trash2 size={14} /> Remover
                      </button>
                    </div>

                    {/* Textarea de conteúdo */}
                    <div>
                      <textarea
                        className="input textarea"
                        rows={3}
                        value={item.content}
                        onChange={(e) => updateQueuePost(item.id, 'content', e.target.value)}
                        placeholder="Escreva a legenda ou texto da postagem para o Google..."
                        style={{ width: '100%', fontSize: '0.875rem', lineHeight: 1.5 }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.72rem', color: (item.content || '').length > 1500 ? '#EF4444' : '#9CA3AF' }}>
                          {(item.content || '').length} / 1500 caracteres
                        </span>
                      </div>
                    </div>

                    {/* Controles de Agendamento e Tipo */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'center' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '4px', fontWeight: 600 }}>
                          Tipo de Post:
                        </label>
                        <select
                          className="input"
                          value={item.topic_type || 'STANDARD'}
                          onChange={(e) => updateQueuePost(item.id, 'topic_type', e.target.value)}
                          style={{ width: '100%', fontSize: '0.8125rem' }}
                        >
                          <option value="STANDARD">Padrão (Novidade / Atualização)</option>
                          <option value="EVENT">Evento</option>
                          <option value="OFFER">Oferta / Promoção</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '4px', fontWeight: 600 }}>
                          Programado para (Data e Hora):
                        </label>
                        <input
                          type="datetime-local"
                          className="input"
                          disabled={item.publish_immediately}
                          value={item.scheduled_for || ''}
                          onChange={(e) => updateQueuePost(item.id, 'scheduled_for', e.target.value)}
                          style={{ width: '100%', fontSize: '0.8125rem', opacity: item.publish_immediately ? 0.5 : 1 }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '18px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: '#CBD5E1', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={Boolean(item.publish_immediately)}
                            onChange={(e) => updateQueuePost(item.id, 'publish_immediately', e.target.checked)}
                          />
                          <span>⚡ Publicar Imediatamente no Google</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* BARRA DE DISPARO EM MASSA */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                paddingTop: '16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                <span style={{ fontSize: '0.875rem', color: '#93C5FD', fontWeight: 600 }}>
                  Pronto para enviar: {bulkPostsQueue.length} post(s) configurados.
                </span>

                <button
                  type="button"
                  onClick={saveAndScheduleAllBulkPosts}
                  disabled={savingBulkPosts}
                  className="btn btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                    padding: '12px 24px',
                    fontSize: '0.9375rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                  }}
                >
                  {savingBulkPosts ? <div className="spinner spinner-xs" /> : <Send size={18} />}
                  {savingBulkPosts ? 'Salvando e Agendando no Google...' : '🚀 Salvar e Agendar Todos os Posts no Google'}
                </button>
              </div>
            </div>
          )}

          {/* HISTÓRICO E POSTS CADASTRADOS */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} style={{ color: '#3B82F6' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                  Posts do Perfil ({posts.length})
                </h3>
              </div>

              {/* Filtro de Posts */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'published', label: 'Publicados no Google' },
                  { id: 'scheduled', label: 'Agendados' },
                  { id: 'draft', label: 'Rascunhos' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPostsFilter(f.id)}
                    className={`btn btn-xs ${postsFilter === f.id ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: '0.72rem', borderRadius: '6px' }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {posts.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                  <FileText size={36} style={{ color: '#6B7280' }} />
                </div>
                <div className="empty-state-title" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                  Nenhum post registrado ainda
                </div>
                <div className="empty-state-text" style={{ fontSize: '0.875rem', color: '#9CA3AF', margin: '6px auto 16px', maxWidth: '440px' }}>
                  Fichas do Google com publicações frequentes recebem em média 2.7x mais visualizações nas buscas locais.
                </div>
                <button
                  type="button"
                  onClick={() => setShowBulkPostCreator(true)}
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #8B5CF6, #6366F1)' }}
                >
                  <Sparkles size={16} /> Gerar Lote de Posts com IA
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {posts
                  .filter((p) => postsFilter === 'all' || p.status === postsFilter)
                  .map((post) => (
                    <div
                      key={post.id}
                      style={{
                        padding: '16px 20px',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`badge badge-${post.status === 'published' ? 'green' : post.status === 'scheduled' ? 'blue' : post.status === 'failed' ? 'red' : 'amber'}`}>
                            {post.status === 'published'
                              ? 'Publicado no Google'
                              : post.status === 'scheduled'
                                ? 'Agendado'
                                : post.status === 'failed'
                                  ? 'Falhou'
                                  : 'Rascunho'}
                          </span>

                          <span style={{ fontSize: '0.75rem', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} />
                            {post.published_at
                              ? `Publicado em: ${new Date(post.published_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                              : post.scheduled_for
                                ? `Agendado para: ${new Date(post.scheduled_for).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                                : 'Sem data definida'}
                          </span>
                        </div>

                        {/* Ações individuais do post */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setPostToEdit(post);
                              setShowGooglePostModal(true);
                            }}
                            className="btn btn-xs btn-secondary"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '0.72rem',
                              padding: '5px 11px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              color: '#E5E7EB',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                            title="Editar postagem"
                          >
                            <Edit3 size={12} />
                            Editar
                          </button>

                          {post.status !== 'published' && (
                            <button
                              type="button"
                              onClick={() => publishExistingPostNow(post.id)}
                              disabled={publishingPostId === post.id}
                              className="btn btn-xs btn-primary"
                              style={{
                                background: 'linear-gradient(135deg, #10B981, #059669)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.72rem',
                                padding: '4px 10px',
                              }}
                              title="Publica este post agora na ficha do Google Meu Negócio"
                            >
                              {publishingPostId === post.id ? (
                                <div className="spinner spinner-xs" />
                              ) : (
                                <Zap size={12} />
                              )}
                              Publicar no Google Agora
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeletePost(post.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#9CA3AF',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              padding: '4px',
                            }}
                            title="Excluir post"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <p style={{ fontSize: '0.875rem', color: '#D1D5DB', lineHeight: 1.6, margin: 0 }}>
                        {post.content}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {post.ai_generated && (
                          <span className="badge badge-purple" style={{ fontSize: '0.6875rem' }}>
                            <Sparkles size={10} /> Gerado por IA
                          </span>
                        )}
                        {post.topic_type && post.topic_type !== 'STANDARD' && (
                          <span className="badge badge-blue" style={{ fontSize: '0.6875rem' }}>
                            {post.topic_type}
                          </span>
                        )}
                        {post.google_post_id && (
                          <span style={{ fontSize: '0.6875rem', color: '#10B981' }}>
                            ID Google: {post.google_post_id.split('/').pop()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}


      {/* TAB 5: REVIEWS */}
      {activeTab === 'reviews' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Avaliações</h2>
          </div>
          {reviews.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Star size={32} /></div>
              <div className="empty-state-title">Nenhuma avaliação</div>
              <div className="empty-state-text">As avaliações aparecerão aqui após a sincronização.</div>
            </div>
          ) : (
            <div style={styles.postList}>
              {reviews.map((review) => (
                <div key={review.id} style={styles.postItem}>
                  <div style={styles.postHeader}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{review.reviewer_name}</span>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s} size={14}
                          fill={s <= review.star_rating ? '#F59E0B' : 'transparent'}
                          color={s <= review.star_rating ? '#F59E0B' : '#4B5563'}
                        />
                      ))}
                    </div>
                  </div>
                  <p style={styles.postContent}>{review.comment || '(Sem comentário)'}</p>
                  {review.reply && (
                    <div style={styles.replyBox}>
                      <strong style={{ fontSize: '0.75rem', color: '#3B82F6' }}>Sua resposta:</strong>
                      <p style={{ fontSize: '0.8125rem', color: '#9CA3AF', marginTop: '4px' }}>{review.reply}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 8: SERVIÇOS & OTIMIZAÇÃO COM IA */}
      {activeTab === 'services' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top Header Card */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Briefcase size={24} style={{ color: '#3B82F6' }} />
                  Catálogo de Serviços & Otimização com IA
                </h2>
                <p style={{ fontSize: '0.875rem', color: '#9CA3AF', marginTop: '6px', maxWidth: '680px', lineHeight: 1.5 }}>
                  Gerencie os serviços da empresa, gere descrições persuasivas com Inteligência Artificial (máximo 300 caracteres segundo as diretrizes do Google) e envie tudo diretamente para a ficha do Google Meu Negócio.
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={addService}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={15} /> Novo Serviço Manual
                </button>
                <button
                  type="button"
                  onClick={generateMissingServicesDescriptions}
                  disabled={generatingBulkServices}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', borderColor: 'rgba(139, 92, 246, 0.4)', color: '#A78BFA' }}
                >
                  {generatingBulkServices ? <div className="spinner spinner-xs" /> : <Sparkles size={15} />}
                  IA para Pendentes
                </button>
                <button
                  type="button"
                  onClick={suggestNicheServices}
                  disabled={suggestingServices}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#FBBF24' }}
                >
                  {suggestingServices ? <div className="spinner spinner-xs" /> : <Lightbulb size={15} />}
                  Sugerir do Nicho
                </button>
                <button
                  type="button"
                  onClick={saveServices}
                  disabled={savingServices}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', padding: '8px 16px', fontWeight: 700 }}
                >
                  {savingServices ? <div className="spinner spinner-xs" /> : <Save size={15} />}
                  {savingServices ? 'Salvando...' : 'Salvar e Enviar ao Google'}
                </button>
              </div>
            </div>

            {/* SEO Local Context Configuration */}
            <div style={{
              marginTop: '18px',
              padding: '14px 18px',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.05)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={16} style={{ color: '#60A5FA' }} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#E5E7EB' }}>
                    Parâmetros de SEO Local para Geração das Descrições
                  </span>
                  <span style={{
                    fontSize: '0.6875rem',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#34D399',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    fontWeight: 600,
                  }}>
                    Benefício + Diferencial Técnico (3 termos) + CTA Curta
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                  Cidade: <strong style={{ color: '#F3F4F6' }}>{client?.address?.locality || client?.address?.administrativeArea || 'Ficha do Google'}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <input
                    type="text"
                    value={servicesTargetNeighborhoods}
                    onChange={(e) => setServicesTargetNeighborhoods(e.target.value)}
                    placeholder="Bairros de Atuação (Opcional) - Ex: Sudoeste, Octogonal, Cruzeiro"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#F3F4F6',
                      fontSize: '0.8125rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                  💡 Liste 2 ou 3 bairros para a IA incorporar de forma natural no Google Meu Negócio
                </span>
              </div>
            </div>

            {/* Metrics Bar */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-primary)',
            }}>
              <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-primary)' }}>
                <span style={{ fontSize: '0.75rem', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 600 }}>Total de Serviços</span>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: '4px 0 0', color: '#F3F4F6' }}>{services.length}</p>
              </div>
              <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <span style={{ fontSize: '0.75rem', color: '#10B981', textTransform: 'uppercase', fontWeight: 600 }}>Descrições Otimizadas</span>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: '4px 0 0', color: '#10B981' }}>
                  {services.filter((s) => s.description && s.description.trim().length >= 30).length}
                </p>
              </div>
              <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <span style={{ fontSize: '0.75rem', color: '#F59E0B', textTransform: 'uppercase', fontWeight: 600 }}>Pendentes / Sem Descrição</span>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: '4px 0 0', color: '#F59E0B' }}>
                  {services.filter((s) => !s.description || s.description.trim().length < 30).length}
                </p>
              </div>
            </div>

            {/* Status Alert */}
            {servicesSaveMsg && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: servicesSaveMsg.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${servicesSaveMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  color: servicesSaveMsg.type === 'success' ? '#10B981' : '#EF4444',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>{servicesSaveMsg.text}</span>
                <button
                  type="button"
                  onClick={() => setServicesSaveMsg(null)}
                  style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* BULK TEXT INPUT BOX (Conforme solicitado no áudio) */}
          <div className="card" style={{ padding: '24px', background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.04) 0%, rgba(0, 0, 0, 0) 100%)', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60A5FA' }}>
                <Layers size={18} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F3F4F6', margin: 0 }}>
                    Adicionar Serviços em Massa com Análise da IA
                  </h3>
                  <span
                    id="badge-services-seo-optimized"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      backgroundColor: 'rgba(139, 92, 246, 0.15)',
                      color: '#C4B5FD',
                      border: '1px solid rgba(139, 92, 246, 0.35)',
                    }}
                  >
                    <Sparkles size={11} /> Baseado no SEO Local & Concorrentes da Ficha
                  </span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#9CA3AF', margin: '2px 0 0' }}>
                  Cole ou digite todos os serviços. As descrições são geradas considerando o bairro, cidade, bio da empresa e termos estratégicos da auditoria de SEO salva.
                </p>
              </div>
            </div>

            <textarea
              value={rawBulkServicesText}
              onChange={(e) => setRawBulkServicesText(e.target.value)}
              placeholder={"Exemplo:\nCorte Masculino Degradê\nBarboterapia Completa com Toalha Quente\nDesign de Sobrancelha Masculina\nColoração e Camuflagem de Cabelos Brancos"}
              rows={4}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#F3F4F6',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                lineHeight: 1.6,
                resize: 'vertical',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                💡 Dica: Você pode copiar uma lista de preços, serviços do WhatsApp ou cardápio e colar aqui diretamente.
              </span>
              <button
                type="button"
                onClick={parseAndAddBulkServices}
                disabled={parsingBulkServices || !rawBulkServicesText.trim()}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                {parsingBulkServices ? (
                  <>
                    <div className="spinner spinner-xs" />
                    <span>Analisando e Gerando Descrições com IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Analisar Lista e Gerar Descrições com IA</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* LISTA DE SERVIÇOS & AUDITORIA */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileCheck size={18} style={{ color: '#10B981' }} />
                Serviços Cadastrados na Ficha ({services.length})
              </h3>
              {services.length > 0 && (
                <button
                  type="button"
                  onClick={addService}
                  className="btn btn-ghost btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={14} /> Adicionar outro
                </button>
              )}
            </div>

            {services.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                  <Briefcase size={40} style={{ color: '#6B7280' }} />
                </div>
                <div className="empty-state-title" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#E5E7EB' }}>
                  Nenhum serviço cadastrado ainda
                </div>
                <div className="empty-state-text" style={{ fontSize: '0.875rem', color: '#9CA3AF', maxWidth: '440px', margin: '6px auto 20px' }}>
                  Utilize a caixa de texto acima para colar sua lista de serviços ou clique abaixo para sugerir serviços com Inteligência Artificial para o seu nicho.
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button type="button" onClick={suggestNicheServices} className="btn btn-secondary">
                    <Lightbulb size={16} /> Sugerir Serviços do Nicho
                  </button>
                  <button type="button" onClick={addService} className="btn btn-primary">
                    <Plus size={16} /> Adicionar Manualmente
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {services.map((service, index) => {
                  const descLength = (service.description || '').trim().length;
                  const isDescriptionMissing = descLength === 0;
                  const isDescriptionShort = descLength > 0 && descLength < 30;
                  const hasSuggestion = Boolean(suggestedServiceDesc[service.id]);

                  return (
                    <div
                      key={service.id || index}
                      style={{
                        padding: '20px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        border: isDescriptionMissing
                          ? '1px solid rgba(239, 68, 68, 0.3)'
                          : isDescriptionShort
                          ? '1px solid rgba(245, 158, 11, 0.3)'
                          : '1px solid rgba(255, 255, 255, 0.07)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        transition: 'all 0.2s',
                      }}
                    >
                      {/* Top Row: Name, Category, Price, Remove */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) minmax(140px, 1.2fr) minmax(120px, 1fr) auto', gap: '12px', alignItems: 'center' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>
                            Nome do Serviço *
                          </label>
                          <input
                            type="text"
                            value={service.name || ''}
                            onChange={(e) => updateService(service.id, 'name', e.target.value)}
                            placeholder="Ex: Corte Masculino Degradê"
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              background: 'rgba(0, 0, 0, 0.3)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#F3F4F6',
                              fontSize: '0.9375rem',
                              fontWeight: 600,
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>
                            Categoria
                          </label>
                          <input
                            type="text"
                            value={service.category || ''}
                            onChange={(e) => updateService(service.id, 'category', e.target.value)}
                            placeholder="Ex: Barbeiro"
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              background: 'rgba(0, 0, 0, 0.3)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#D1D5DB',
                              fontSize: '0.875rem',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>
                            Preço (Opcional)
                          </label>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280', fontSize: '0.8125rem' }}>
                              R$
                            </span>
                            <input
                              type="text"
                              value={service.price || ''}
                              onChange={(e) => updateService(service.id, 'price', e.target.value)}
                              placeholder="50,00"
                              style={{
                                width: '100%',
                                padding: '10px 12px 10px 32px',
                                borderRadius: '8px',
                                background: 'rgba(0, 0, 0, 0.3)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#D1D5DB',
                                fontSize: '0.875rem',
                                boxSizing: 'border-box',
                              }}
                            />
                          </div>
                        </div>

                        <div style={{ paddingTop: '20px' }}>
                          <button
                            type="button"
                            onClick={() => removeService(service.id)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              color: '#EF4444',
                              borderRadius: '8px',
                              width: '36px',
                              height: '36px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                            title="Excluir serviço"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Middle Row: Description Status Header & AI Suggestion Button */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF' }}>
                            Descrição do Serviço (Google Meu Negócio)
                          </label>

                          {/* Status Badge */}
                          {isDescriptionMissing && (
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              backgroundColor: 'rgba(239, 68, 68, 0.15)',
                              color: '#EF4444',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                            }}>
                              ⚠️ Sem descrição
                            </span>
                          )}
                          {isDescriptionShort && (
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              backgroundColor: 'rgba(245, 158, 11, 0.15)',
                              color: '#F59E0B',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                            }}>
                              ⚠️ Descrição curta
                            </span>
                          )}
                          {!isDescriptionMissing && !isDescriptionShort && (
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              color: '#10B981',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                            }}>
                              ✅ Otimizada ({descLength}/300)
                            </span>
                          )}
                        </div>

                        {/* Botão de Sugerir com IA */}
                        <button
                          type="button"
                          onClick={() => suggestDescriptionForService(service)}
                          disabled={generatingAiServiceId === service.id}
                          className="btn btn-ghost btn-sm"
                          style={{
                            fontSize: '0.75rem',
                            color: '#A78BFA',
                            backgroundColor: 'rgba(139, 92, 246, 0.1)',
                            border: '1px solid rgba(139, 92, 246, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                          }}
                        >
                          {generatingAiServiceId === service.id ? (
                            <div className="spinner spinner-xs" />
                          ) : (
                            <Sparkles size={13} />
                          )}
                          <span>{hasSuggestion ? 'Gerar outra sugestão' : 'Sugerir descrição com IA'}</span>
                        </button>
                      </div>

                      {/* AI Suggestion Box (se houver sugestão pendente para aprovação) */}
                      {hasSuggestion && (
                        <div style={{
                          padding: '14px',
                          borderRadius: '10px',
                          backgroundColor: 'rgba(139, 92, 246, 0.08)',
                          border: '1px solid rgba(139, 92, 246, 0.35)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          animation: 'fadeIn 0.2s ease-out',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C4B5FD', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Sparkles size={13} color="#A78BFA" /> Sugestão da Inteligência Artificial:
                            </span>
                            <span style={{ fontSize: '0.6875rem', color: '#9CA3AF' }}>
                              {suggestedServiceDesc[service.id].length} / 300 caracteres
                            </span>
                          </div>

                          <p style={{ fontSize: '0.875rem', color: '#F3F4F6', margin: 0, lineHeight: 1.5 }}>
                            {suggestedServiceDesc[service.id]}
                          </p>

                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                            <button
                              type="button"
                              onClick={() => discardSuggestedDescription(service.id)}
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '0.75rem', padding: '4px 10px', color: '#9CA3AF' }}
                            >
                              ✕ Descartar
                            </button>
                            <button
                              type="button"
                              onClick={() => approveSuggestedDescription(service.id)}
                              className="btn btn-primary btn-sm"
                              style={{
                                fontSize: '0.75rem',
                                padding: '4px 14px',
                                background: 'linear-gradient(135deg, #10B981, #059669)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontWeight: 700,
                              }}
                            >
                              <Check size={14} /> Aprovar e Aplicar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Textarea da Descrição */}
                      <div>
                        <textarea
                          value={service.description || ''}
                          onChange={(e) => updateService(service.id, 'description', e.target.value.slice(0, 300))}
                          placeholder="Descrição detalhada do serviço com palavras-chave que seus clientes buscam (máximo 300 caracteres)..."
                          rows={2}
                          maxLength={300}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#F3F4F6',
                            fontSize: '0.875rem',
                            fontFamily: 'inherit',
                            lineHeight: 1.5,
                            resize: 'vertical',
                            boxSizing: 'border-box',
                          }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                          <span style={{ fontSize: '0.6875rem', color: '#6B7280' }}>
                            Diretriz Google: Até 300 caracteres focados em benefícios e palavras-chave locais.
                          </span>
                          <span style={{ fontSize: '0.6875rem', color: descLength > 280 ? '#EF4444' : '#6B7280' }}>
                            {descLength} / 300
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Final Save Bar */}
            {services.length > 0 && (
              <div style={{
                marginTop: '24px',
                paddingTop: '20px',
                borderTop: '1px solid var(--border-primary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}>
                <span style={{ fontSize: '0.8125rem', color: '#9CA3AF' }}>
                  {services.length} serviço(s) prontos para sincronização no Google Meu Negócio.
                </span>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={addService}
                    className="btn btn-secondary btn-sm"
                  >
                    <Plus size={14} /> Adicionar Mais
                  </button>
                  <button
                    type="button"
                    onClick={saveServices}
                    disabled={savingServices}
                    className="btn btn-primary"
                    style={{
                      background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                    }}
                  >
                    {savingServices ? <div className="spinner spinner-xs" /> : <Save size={16} />}
                    {savingServices ? 'Salvando no Google...' : 'Salvar e Enviar Tudo ao Google'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: PRODUTOS DO GOOGLE MEU NEGÓCIO */}
      {activeTab === 'products' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top Header Card */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShoppingBag size={24} style={{ color: '#EC4899' }} />
                  Catálogo de Produtos Google Meu Negócio
                </h2>
                <p style={{ fontSize: '0.875rem', color: '#9CA3AF', marginTop: '6px', maxWidth: '750px', lineHeight: 1.5 }}>
                  Gerencie os produtos cadastrados na ficha do Google. Produtos com foto, preço e botão de ação direta aumentam o CTR e geram conversões imediatas para o WhatsApp ou loja virtual da empresa.
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                {services && services.length > 0 && (
                  <button
                    type="button"
                    onClick={importServicesAsProducts}
                    disabled={importingServicesAsProds}
                    className="btn btn-outline btn-sm"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderColor: 'rgba(236, 72, 153, 0.5)',
                      color: '#F472B6',
                      backgroundColor: 'rgba(236, 72, 153, 0.08)',
                    }}
                    title="Importar os serviços já cadastrados nesta ficha para produtos com 1 clique"
                  >
                    <Zap size={14} className={importingServicesAsProds ? 'animate-spin' : ''} />
                    {importingServicesAsProds ? 'Importando...' : `Importar Serviços (${services.length})`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setExtractUrlInput(client?.website || '');
                    setExtractUrlModalOpen(true);
                  }}
                  className="btn btn-outline btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  title="Extrair catálogo/cardápio a partir do site da empresa via IA"
                >
                  <Globe size={14} />
                  Extrair do Site
                </button>
                <button
                  type="button"
                  onClick={suggestNicheProductList}
                  disabled={suggestingProdAi}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Sparkles size={15} style={{ color: '#F472B6' }} />
                  {suggestingProdAi ? 'Buscando Ideias...' : 'Sugerir com IA'}
                </button>
                <button
                  type="button"
                  onClick={() => setProdBulkModalOpen(true)}
                  className="btn btn-outline btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <FileText size={15} />
                  Importar em Massa
                </button>
                <button
                  type="button"
                  onClick={openAddProductModal}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#EC4899', border: '1px solid #EC4899' }}
                >
                  <Plus size={15} />
                  + Novo Produto
                </button>
                <button
                  type="button"
                  onClick={() => saveProductsToBackend(products)}
                  disabled={savingProducts}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Save size={15} />
                  {savingProducts ? 'Salvando...' : 'Salvar Catálogo'}
                </button>
              </div>
            </div>

            {/* Notification alert */}
            {productsSaveMsg && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: productsSaveMsg.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${productsSaveMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  color: productsSaveMsg.type === 'success' ? '#34D399' : '#F87171',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.875rem',
                }}
              >
                {productsSaveMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                {productsSaveMsg.text}
              </div>
            )}

            {/* Micro KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '20px' }}>
              <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-primary)' }}>
                <span style={{ fontSize: '0.75rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Cadastrado</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F3F4F6', marginTop: '4px' }}>{products.length}</div>
              </div>
              <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-primary)' }}>
                <span style={{ fontSize: '0.75rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categorias</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F472B6', marginTop: '4px' }}>
                  {Array.from(new Set(products.map(p => (p.category || 'Geral').trim()).filter(Boolean))).length}
                </div>
              </div>
              <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-primary)' }}>
                <span style={{ fontSize: '0.75rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Com Oferta/Promoção</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>
                  {products.filter(p => p.promo_price && p.promo_price.trim()).length}
                </div>
              </div>
              <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-primary)' }}>
                <span style={{ fontSize: '0.75rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Com Foto no Google</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#60A5FA', marginTop: '4px' }}>
                  {products.filter(p => p.photo_url && p.photo_url.trim()).length}
                </div>
              </div>
            </div>

            {/* Informational banner on Google Business Profile Products API */}
            <div
              style={{
                marginTop: '16px',
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
                <strong style={{ color: '#BFDBFE' }}>Por que os produtos não foram listados automaticamente do Google?</strong> A API oficial do Google Business Profile não disponibiliza endpoint público para leitura do "Editor de Produtos" (ao contrário de Serviços, Avaliações, Fotos e Posts). Para listar seus produtos existentes sem digitar do zero, use <strong>"Importar Serviços"</strong> (transforma seus serviços em produtos em 1 clique), <strong>"Extrair do Site"</strong> ou <strong>"Importar em Massa"</strong>.
              </div>
            </div>
          </div>

          {/* Highlight Callout: Import Existing Services */}
          {services && services.length > 0 && products.length === 0 && (
            <div
              style={{
                padding: '20px 24px',
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
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'rgba(236, 72, 153, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#F472B6',
                    flexShrink: 0,
                  }}
                >
                  <Zap size={24} />
                </div>
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FDF2F8' }}>
                    Encontramos {services.length} serviços cadastrados na ficha do Google!
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: '#F9A8D4', marginTop: '3px', maxWidth: '640px' }}>
                    Deseja transformar seus serviços existentes em produtos da vitrine? Importa nome, categoria, descrição persuasiva e botão de WhatsApp direto para todos com 1 clique!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={importServicesAsProducts}
                disabled={importingServicesAsProds}
                className="btn btn-primary"
                style={{
                  backgroundColor: '#EC4899',
                  border: '1px solid #EC4899',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(236, 72, 153, 0.4)',
                  padding: '10px 20px',
                }}
              >
                <RefreshCw size={16} className={importingServicesAsProds ? 'animate-spin' : ''} />
                {importingServicesAsProds ? 'Importando...' : `Importar ${services.length} Serviços como Produtos`}
              </button>
            </div>
          )}

          {/* Search & Category Filter */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 240px', position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
              <input
                type="text"
                placeholder="Buscar produto por nome, termo ou categoria..."
                value={prodSearchTerm}
                onChange={(e) => setProdSearchTerm(e.target.value)}
                className="input input-bordered w-full"
                style={{ paddingLeft: '36px', height: '40px', fontSize: '0.875rem' }}
              />
            </div>
            <select
              value={prodCategoryFilter}
              onChange={(e) => setProdCategoryFilter(e.target.value)}
              className="select select-bordered"
              style={{ height: '40px', minWidth: '180px', fontSize: '0.875rem' }}
            >
              <option value="ALL">Todas Categorias</option>
              {Array.from(new Set(products.map(p => (p.category || 'Geral').trim()).filter(Boolean))).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Products Grid */}
          {products.length === 0 ? (
            <div className="card" style={{ padding: '48px', textAlign: 'center', border: '1px dashed var(--border-primary)' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', backgroundColor: 'rgba(236, 72, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#EC4899' }}>
                <ShoppingBag size={32} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F3F4F6' }}>Nenhum produto cadastrado ainda</h3>
              <p style={{ fontSize: '0.875rem', color: '#9CA3AF', maxWidth: '520px', margin: '8px auto 20px', lineHeight: 1.5 }}>
                Adicione produtos com foto, faixa de preço e botão de WhatsApp para exibir vitrine no perfil do Google. Você também pode importar dos serviços existentes ou pedir ideias para a IA com 1 clique!
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {services && services.length > 0 && (
                  <button
                    type="button"
                    onClick={importServicesAsProducts}
                    disabled={importingServicesAsProds}
                    className="btn btn-outline btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', borderColor: 'rgba(236, 72, 153, 0.5)', color: '#F472B6' }}
                  >
                    <Zap size={15} />
                    Importar {services.length} Serviços da Ficha
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setExtractUrlInput(client?.website || '');
                    setExtractUrlModalOpen(true);
                  }}
                  className="btn btn-outline btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Globe size={15} />
                  Extrair do Site com IA
                </button>
                <button
                  type="button"
                  onClick={suggestNicheProductList}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Sparkles size={15} style={{ color: '#F472B6' }} />
                  Gerar Sugestões com IA
                </button>
                <button
                  type="button"
                  onClick={openAddProductModal}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#EC4899', border: '1px solid #EC4899' }}
                >
                  <Plus size={15} />
                  + Novo Produto
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '18px' }}>
              {products
                .filter((p) => {
                  const matchCat = prodCategoryFilter === 'ALL' || (p.category || 'Geral') === prodCategoryFilter;
                  const term = prodSearchTerm.toLowerCase();
                  const matchSearch = !term ||
                    (p.name && p.name.toLowerCase().includes(term)) ||
                    (p.description && p.description.toLowerCase().includes(term)) ||
                    (p.category && p.category.toLowerCase().includes(term));
                  return matchCat && matchSearch;
                })
                .map((prod) => (
                  <div
                    key={prod.id}
                    className="card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      border: '1px solid var(--border-primary)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                  >
                    {/* Product Photo Header */}
                    <div
                      style={{
                        height: '160px',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        borderBottom: '1px solid var(--border-primary)',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {prod.photo_url ? (
                        <img
                          src={prod.photo_url}
                          alt={prod.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#6B7280' }}>
                          <Package size={36} style={{ strokeWidth: 1.5, opacity: 0.6 }} />
                          <span style={{ fontSize: '0.75rem' }}>Sem foto adicionada</span>
                        </div>
                      )}

                      {/* Category Tag overlay */}
                      <span
                        style={{
                          position: 'absolute',
                          top: '10px',
                          left: '10px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          backgroundColor: 'rgba(0, 0, 0, 0.65)',
                          color: '#F472B6',
                          backdropFilter: 'blur(6px)',
                          border: '1px solid rgba(244, 114, 182, 0.3)',
                        }}
                      >
                        {prod.category || 'Geral'}
                      </span>
                    </div>

                    {/* Body */}
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#F3F4F6', lineHeight: 1.3 }}>
                          {prod.name}
                        </h4>
                      </div>

                      {/* Price Section */}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                        {prod.promo_price ? (
                          <>
                            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10B981' }}>
                              {prod.promo_price.startsWith('R$') ? prod.promo_price : `R$ ${prod.promo_price}`}
                            </span>
                            <span style={{ fontSize: '0.8125rem', color: '#9CA3AF', textDecoration: 'line-through' }}>
                              {prod.price?.startsWith('R$') ? prod.price : `R$ ${prod.price}`}
                            </span>
                          </>
                        ) : prod.price ? (
                          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F3F4F6' }}>
                            {prod.price.startsWith('R$') ? prod.price : `R$ ${prod.price}`}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8125rem', color: '#9CA3AF', fontStyle: 'italic' }}>
                            Preço sob consulta
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p
                        style={{
                          fontSize: '0.8125rem',
                          color: '#9CA3AF',
                          lineHeight: 1.45,
                          marginTop: '10px',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          flex: 1,
                        }}
                      >
                        {prod.description || 'Sem descrição cadastrada.'}
                      </p>

                      {/* Google Button Action Info */}
                      {prod.button_url && (
                        <div style={{ marginTop: '12px', padding: '8px 10px', borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.72rem', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Tag size={12} />
                            Botão: <strong>{prod.button_type === 'ORDER' ? 'Fazer Pedido' : prod.button_type === 'BUY' ? 'Comprar' : prod.button_type === 'GET_OFFER' ? 'Ver Oferta' : 'Saiba Mais'}</strong>
                          </span>
                          <a
                            href={prod.button_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#60A5FA', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                          >
                            Testar <ExternalLink size={11} />
                          </a>
                        </div>
                      )}

                      {/* Card Footer Actions */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-primary)' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const originalIndex = products.findIndex((p) => String(p.id) === String(prod.id));
                            openEditProductModal(prod, originalIndex >= 0 ? originalIndex : undefined);
                          }}
                          className="btn btn-ghost btn-xs"
                          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Edit3 size={13} />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProductItem(prod.id)}
                          className="btn btn-ghost btn-xs"
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#F87171' }}
                        >
                          <Trash2 size={13} />
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* MODAL 1: ADD / EDIT PRODUCT */}
          {prodModalOpen && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(5px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '16px',
              }}
            >
              <div
                className="card"
                style={{
                  width: '100%',
                  maxWidth: '680px',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  padding: '24px',
                  border: '1px solid var(--border-primary)',
                  backgroundColor: '#111827',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShoppingBag size={20} style={{ color: '#EC4899' }} />
                    {editingProd ? 'Editar Produto do Google' : 'Novo Produto para o Google Meu Negócio'}
                  </h3>
                  <button
                    type="button"
                    onClick={closeProductModal}
                    className="btn btn-ghost btn-sm btn-circle"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveProductFromForm} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Name + Category */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#D1D5DB' }}>Nome do Produto *</label>
                        <span style={{ fontSize: '0.72rem', color: formProdName.length > 58 ? '#EF4444' : '#9CA3AF' }}>
                          {formProdName.length}/58
                        </span>
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={58}
                        placeholder="Ex: Tênis Esportivo ProMax"
                        value={formProdName}
                        onChange={(e) => setFormProdName(e.target.value)}
                        style={{
                          display: 'block',
                          width: '100%',
                          height: '42px',
                          boxSizing: 'border-box',
                          padding: '0 12px',
                          borderRadius: '8px',
                          backgroundColor: '#1E293B',
                          border: '1px solid #334155',
                          color: '#F8FAFC',
                          fontSize: '0.875rem',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#D1D5DB', marginBottom: '6px' }}>
                        Categoria do Produto
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Calçados ou Nome do Nicho"
                        value={formProdCategory}
                        onChange={(e) => setFormProdCategory(e.target.value)}
                        style={{
                          display: 'block',
                          width: '100%',
                          height: '42px',
                          boxSizing: 'border-box',
                          padding: '0 12px',
                          borderRadius: '8px',
                          backgroundColor: '#1E293B',
                          border: '1px solid #334155',
                          color: '#F8FAFC',
                          fontSize: '0.875rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  {/* Prices */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#D1D5DB', marginBottom: '6px' }}>
                        Preço Regular (R$)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 149,90"
                        value={formProdPrice}
                        onChange={(e) => setFormProdPrice(e.target.value)}
                        style={{
                          display: 'block',
                          width: '100%',
                          height: '42px',
                          boxSizing: 'border-box',
                          padding: '0 12px',
                          borderRadius: '8px',
                          backgroundColor: '#1E293B',
                          border: '1px solid #334155',
                          color: '#F8FAFC',
                          fontSize: '0.875rem',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#D1D5DB', marginBottom: '6px' }}>
                        Preço Promocional (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 119,90 (Deixa o original riscado)"
                        value={formProdPromoPrice}
                        onChange={(e) => setFormProdPromoPrice(e.target.value)}
                        style={{
                          display: 'block',
                          width: '100%',
                          height: '42px',
                          boxSizing: 'border-box',
                          padding: '0 12px',
                          borderRadius: '8px',
                          backgroundColor: '#1E293B',
                          border: '1px solid #334155',
                          color: '#F8FAFC',
                          fontSize: '0.875rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  {/* Description with AI generation button */}
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#D1D5DB' }}>
                        Descrição do Produto (Regra GBP: Até 1000 caracteres)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.72rem', color: formProdDescription.length > 1000 ? '#EF4444' : '#9CA3AF' }}>
                          {formProdDescription.length}/1000
                        </span>
                        <button
                          type="button"
                          onClick={generateProductAiDescription}
                          disabled={generatingProdAi || !formProdName.trim()}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '5px 12px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(236, 72, 153, 0.15)',
                            border: '1px solid rgba(236, 72, 153, 0.45)',
                            color: '#F472B6',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: generatingProdAi || !formProdName.trim() ? 'not-allowed' : 'pointer',
                            opacity: generatingProdAi || !formProdName.trim() ? 0.6 : 1,
                            transition: 'all 0.2s',
                          }}
                        >
                          <Sparkles size={13} />
                          {generatingProdAi ? 'Gerando com IA...' : '✨ Gerar com IA'}
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={5}
                      maxLength={1000}
                      placeholder="Descreva os benefícios, composição, indicação de uso e diferenciais do produto para atrair clientes locais no Google Maps..."
                      value={formProdDescription}
                      onChange={(e) => setFormProdDescription(e.target.value)}
                      style={{
                        display: 'block',
                        width: '100%',
                        minWidth: '100%',
                        maxWidth: '100%',
                        minHeight: '120px',
                        boxSizing: 'border-box',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        backgroundColor: '#1E293B',
                        border: '1px solid #334155',
                        color: '#F8FAFC',
                        fontSize: '0.875rem',
                        lineHeight: 1.6,
                        resize: 'vertical',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', marginTop: '4px' }}>
                      Diretriz Google: Ideal entre 300 e 750 caracteres com alta persuasão e chamada para ação.
                    </span>
                  </div>

                  {/* Photo URL */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#D1D5DB', marginBottom: '6px' }}>
                      URL da Foto do Produto
                    </label>
                    <input
                      type="url"
                      placeholder="https://exemplo.com/fotos/produto.jpg"
                      value={formProdPhotoUrl}
                      onChange={(e) => setFormProdPhotoUrl(e.target.value)}
                      style={{
                        display: 'block',
                        width: '100%',
                        height: '42px',
                        boxSizing: 'border-box',
                        padding: '0 12px',
                        borderRadius: '8px',
                        backgroundColor: '#1E293B',
                        border: '1px solid #334155',
                        color: '#F8FAFC',
                        fontSize: '0.875rem',
                        outline: 'none',
                      }}
                    />
                    {formProdPhotoUrl && (
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={formProdPhotoUrl}
                          alt="Preview"
                          style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-primary)' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Pré-visualização da imagem</span>
                      </div>
                    )}
                  </div>

                  {/* Button Action & URL */}
                  <div
                    style={{
                      padding: '16px 18px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(30, 41, 59, 0.45)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#F1F5F9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Tag size={15} style={{ color: '#EC4899' }} />
                        Botão de Ação Google (Call to Action)
                      </label>
                      <button
                        type="button"
                        onClick={() => applyClientWhatsAppForProduct(formProdName)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(16, 185, 129, 0.12)',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          color: '#34D399',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <MessageCircle size={13} />
                        Preencher Link WhatsApp da Empresa
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
                      <div style={{ flex: '1 1 230px', minWidth: 0 }}>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', marginBottom: '6px' }}>
                          Tipo de Botão
                        </label>
                        <select
                          value={formProdButtonType}
                          onChange={(e) => setFormProdButtonType(e.target.value)}
                          style={{
                            display: 'block',
                            width: '100%',
                            height: '42px',
                            boxSizing: 'border-box',
                            padding: '0 12px',
                            borderRadius: '8px',
                            backgroundColor: '#1E293B',
                            border: '1px solid #334155',
                            color: '#F8FAFC',
                            fontSize: '0.84rem',
                            outline: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="ORDER">Fazer pedido (Recomendado WhatsApp)</option>
                          <option value="BUY">Comprar online</option>
                          <option value="LEARN_MORE">Saiba mais</option>
                          <option value="GET_OFFER">Ver oferta</option>
                        </select>
                      </div>

                      <div style={{ flex: '2 1 300px', minWidth: 0 }}>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', marginBottom: '6px' }}>
                          URL de Destino do Botão
                        </label>
                        <input
                          type="url"
                          placeholder="https://wa.me/55... ou link da loja"
                          value={formProdButtonUrl}
                          onChange={(e) => setFormProdButtonUrl(e.target.value)}
                          style={{
                            display: 'block',
                            width: '100%',
                            height: '42px',
                            boxSizing: 'border-box',
                            padding: '0 12px',
                            borderRadius: '8px',
                            backgroundColor: '#1E293B',
                            border: '1px solid #334155',
                            color: '#F8FAFC',
                            fontSize: '0.84rem',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={closeProductModal}
                      style={{
                        height: '40px',
                        padding: '0 18px',
                        borderRadius: '8px',
                        backgroundColor: 'transparent',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#94A3B8',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      style={{
                        height: '40px',
                        padding: '0 24px',
                        borderRadius: '8px',
                        backgroundColor: '#EC4899',
                        background: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
                        border: 'none',
                        color: '#FFFFFF',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(236, 72, 153, 0.35)',
                      }}
                    >
                      {editingProd ? 'Atualizar Produto' : 'Adicionar ao Catálogo'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL 2: SUGGEST PRODUCTS AI */}
          {prodSuggestModalOpen && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(5px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '16px',
              }}
            >
              <div
                className="card"
                style={{
                  width: '100%',
                  maxWidth: '720px',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  padding: '24px',
                  border: '1px solid var(--border-primary)',
                  backgroundColor: '#111827',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={20} style={{ color: '#F472B6' }} />
                    Sugestões de Produtos com IA para {client?.category || 'este Negócio'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setProdSuggestModalOpen(false)}
                    className="btn btn-ghost btn-sm btn-circle"
                  >
                    <X size={18} />
                  </button>
                </div>

                {suggestingProdAi ? (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 16px', color: '#EC4899' }} />
                    <p style={{ color: '#D1D5DB', fontWeight: 600 }}>A inteligência artificial está gerando um catálogo ideal para o nicho...</p>
                    <p style={{ color: '#9CA3AF', fontSize: '0.8125rem', marginTop: '4px' }}>Adaptando nomes, categorias e textos persuasivos de até 1.000 caracteres.</p>
                  </div>
                ) : suggestedProdList.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF' }}>
                    Nenhuma sugestão retornada no momento.
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#9CA3AF', marginBottom: '14px' }}>
                      Revisamos o nicho <strong>{client?.category || 'Geral'}</strong> e geramos as seguintes sugestões de produtos campeões de vendas para o Google:
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '50vh', overflowY: 'auto', paddingRight: '4px' }}>
                      {suggestedProdList.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '12px 16px',
                            borderRadius: '10px',
                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid var(--border-primary)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ color: '#F3F4F6', fontSize: '0.925rem' }}>{item.name}</strong>
                            <span style={{ fontSize: '0.75rem', color: '#F472B6', backgroundColor: 'rgba(244, 114, 182, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                              {item.category}
                            </span>
                          </div>
                          {item.price && (
                            <span style={{ fontSize: '0.8125rem', color: '#10B981', fontWeight: 600 }}>
                              {item.price.startsWith('R$') ? item.price : `R$ ${item.price}`}
                            </span>
                          )}
                          <p style={{ fontSize: '0.8125rem', color: '#9CA3AF', lineHeight: 1.4, marginTop: '4px' }}>
                            {item.description}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                      <button
                        type="button"
                        onClick={() => setProdSuggestModalOpen(false)}
                        className="btn btn-ghost btn-sm"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={acceptNicheProductSuggestions}
                        className="btn btn-primary btn-sm"
                        style={{ backgroundColor: '#EC4899', border: '1px solid #EC4899', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Check size={16} />
                        Adicionar Todos ({suggestedProdList.length}) ao Catálogo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODAL 3: BULK IMPORT RAW TEXT */}
          {prodBulkModalOpen && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(5px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '16px',
              }}
            >
              <div
                className="card"
                style={{
                  width: '100%',
                  maxWidth: '640px',
                  padding: '24px',
                  border: '1px solid var(--border-primary)',
                  backgroundColor: '#111827',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={20} style={{ color: '#60A5FA' }} />
                    Importar Produtos em Massa com IA
                  </h3>
                  <button
                    type="button"
                    onClick={() => setProdBulkModalOpen(false)}
                    className="btn btn-ghost btn-sm btn-circle"
                  >
                    <X size={18} />
                  </button>
                </div>

                <p style={{ fontSize: '0.85rem', color: '#9CA3AF', marginBottom: '12px', lineHeight: 1.5 }}>
                  Cole qualquer lista não estruturada de produtos (de cardápio, tabela, mensagem de WhatsApp ou e-commerce). A IA irá extrair nome, categoria, preço e formatar descrições profissionais para cada um:
                </p>

                <textarea
                  rows={8}
                  placeholder={`Exemplo:\n1. Tênis de Corrida Masculino R$ 199,00\n2. Camiseta Dry-Fit - R$ 49,90\n3. Mochila Esportiva Impermeável 30L R$ 120`}
                  value={prodBulkText}
                  onChange={(e) => setProdBulkText(e.target.value)}
                  className="textarea textarea-bordered w-full"
                  style={{ fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '16px' }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setProdBulkModalOpen(false)}
                    className="btn btn-ghost btn-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={parseBulkProductText}
                    disabled={parsingProdBulk || !prodBulkText.trim()}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {parsingProdBulk ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Processando com IA...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Processar e Importar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL 4: EXTRACT PRODUCTS FROM WEBSITE OR MENU URL */}
          {extractUrlModalOpen && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(5px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '16px',
              }}
            >
              <div
                className="card"
                style={{
                  width: '100%',
                  maxWidth: '580px',
                  padding: '24px',
                  border: '1px solid var(--border-primary)',
                  backgroundColor: '#111827',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Globe size={20} style={{ color: '#60A5FA' }} />
                    Extrair Produtos do Site com IA
                  </h3>
                  <button
                    type="button"
                    onClick={() => setExtractUrlModalOpen(false)}
                    className="btn btn-ghost btn-sm btn-circle"
                  >
                    <X size={18} />
                  </button>
                </div>

                <p style={{ fontSize: '0.85rem', color: '#9CA3AF', marginBottom: '16px', lineHeight: 1.5 }}>
                  Informe o link do site da empresa, loja virtual ou cardápio digital (ex: iFood, Anota AI, Goomer, site próprio). A IA irá acessar a página, identificar os produtos, preços e descrições para adicioná-los à sua vitrine:
                </p>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#D1D5DB', marginBottom: '6px' }}>
                    URL do Site ou Cardápio Digital
                  </label>
                  <input
                    type="url"
                    placeholder="https://suaempresa.com.br/cardapio-ou-produtos"
                    value={extractUrlInput}
                    onChange={(e) => setExtractUrlInput(e.target.value)}
                    className="input input-bordered w-full"
                    style={{ fontSize: '0.875rem' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setExtractUrlModalOpen(false)}
                    className="btn btn-ghost btn-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={extractProductsFromWebsite}
                    disabled={extractingUrlProds || !extractUrlInput.trim()}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {extractingUrlProds ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Acessando e Extraindo...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Extrair com IA
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 9: FOTOS & OTIMIZAÇÃO DE SEO LOCAL */}
      {activeTab === 'photos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top Header Card */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Camera size={24} style={{ color: '#06B6D4' }} />
                  Galeria de Fotos & SEO Local (Geo-tagging EXIF)
                </h2>
                <p style={{ fontSize: '0.875rem', color: '#9CA3AF', marginTop: '6px', maxWidth: '720px', lineHeight: 1.5 }}>
                  Carregue fotos individuais ou em massa para a ficha do Google. Nosso motor otimiza automaticamente as fotos injetando coordenadas GPS (EXIF), palavras-chave no nome do arquivo e descrições Alt Text para posicionar melhor sua ficha no Google Maps e nas pesquisas locais.
                </p>
              </div>

              {/* Metrics Pill */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ padding: '8px 14px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.25)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ImageIcon size={16} style={{ color: '#06B6D4' }} />
                  <span style={{ fontSize: '0.8125rem', color: '#E5E7EB', fontWeight: 600 }}>{photos.length} Fotos na Ficha</span>
                </div>
              </div>
            </div>

            {/* CARD DE GEOLOCALIZAÇÃO & DIRETRIZES DO GOOGLE */}
            <div style={{
              marginTop: '20px',
              padding: '16px 20px',
              borderRadius: '12px',
              backgroundColor: 'rgba(6, 182, 212, 0.05)',
              border: '1px solid rgba(6, 182, 212, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Compass size={18} style={{ color: '#06B6D4' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#E5E7EB' }}>
                  Metadados de Geolocalização (EXIF GPS) para Ranqueamento Local
                </span>
              </div>

              <p style={{ fontSize: '0.8125rem', color: '#9CA3AF', margin: 0, lineHeight: 1.5 }}>
                O algoritmo do Google analisa metadados das imagens. Fotos que contêm dados geográficos (latitude e longitude) correspondentes ao endereço da empresa ganham maior relevância nas buscas por bairros e cidades próximas.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>
                    Cidade / Região de Referência
                  </label>
                  <input
                    type="text"
                    value={geoCity}
                    onChange={(e) => {
                      const newCity = e.target.value;
                      setGeoCity(newCity);
                      const c = getCoordinatesForCity(newCity);
                      setGeoLat(c.lat);
                      setGeoLng(c.lng);
                    }}
                    placeholder="Ex: São Paulo, Curitiba..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#F3F4F6',
                      fontSize: '0.8125rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>
                    Latitude GPS
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={geoLat}
                    onChange={(e) => setGeoLat(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#F3F4F6',
                      fontSize: '0.8125rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '4px' }}>
                    Longitude GPS
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={geoLng}
                    onChange={(e) => setGeoLng(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#F3F4F6',
                      fontSize: '0.8125rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', height: '100%', paddingTop: '18px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8125rem', color: '#D1D5DB' }}>
                    <input
                      type="checkbox"
                      checked={autoInjectExif}
                      onChange={(e) => setAutoInjectExif(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#06B6D4' }}
                    />
                    <span>Injetar EXIF GPS automaticamente</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* ÁREA DE UPLOAD (INDIVIDUAL E EM MASSA) */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={18} style={{ color: '#3B82F6' }} />
              Carregar Novas Fotos (Individual ou em Massa)
            </h3>

            {/* Dropzone Container */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
              alignItems: 'stretch',
            }}>
              {/* File Upload Dropzone */}
              <div style={{
                border: '2px dashed rgba(6, 182, 212, 0.35)',
                borderRadius: '12px',
                padding: '30px 20px',
                textAlign: 'center',
                backgroundColor: 'rgba(6, 182, 212, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                cursor: 'pointer',
                position: 'relative',
              }}>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoFilesSelected}
                  style={{
                    position: 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%',
                    opacity: 0, cursor: 'pointer', zIndex: 10,
                  }}
                />
                <div style={{
                  width: '54px', height: '54px', borderRadius: '50%',
                  backgroundColor: 'rgba(6, 182, 212, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#06B6D4',
                }}>
                  <Camera size={26} />
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#F3F4F6', margin: '0 0 4px' }}>
                    Clique para selecionar ou arraste fotos aqui
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: 0 }}>
                    Suporta seleção múltipla de imagens (JPEG, PNG, WebP).
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.6875rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: '#9CA3AF' }}>
                    🏷️ Nome SEO Automático
                  </span>
                  <span style={{ fontSize: '0.6875rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: '#9CA3AF' }}>
                    📍 Geotagging GPS
                  </span>
                  <span style={{ fontSize: '0.6875rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: '#9CA3AF' }}>
                    📝 Alt Text Otimizado
                  </span>
                </div>
              </div>

              {/* Upload Controls / Categoria Padrão */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '20px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                gap: '16px',
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '6px' }}>
                    Categoria Google Meu Negócio para Novas Fotos
                  </label>
                  <select
                    value={newPhotoCategory}
                    onChange={(e) => setNewPhotoCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#F3F4F6',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="ADDITIONAL">Geral / Adicional (ADDITIONAL)</option>
                    <option value="EXTERIOR">Fachada / Exterior (EXTERIOR)</option>
                    <option value="INTERIOR">Interior do Estabelecimento (INTERIOR)</option>
                    <option value="PRODUCT">Produtos / Serviços (PRODUCT)</option>
                    <option value="AT_WORK">Equipe em Atendimento (AT_WORK)</option>
                    <option value="FOOD_AND_DRINK">Comida e Bebida / Menu (FOOD_AND_DRINK)</option>
                    <option value="COMMON_AREA">Área Comum (COMMON_AREA)</option>
                  </select>
                  <span style={{ fontSize: '0.75rem', color: '#6B7280', display: 'block', marginTop: '6px' }}>
                    Categorizar as fotos ajuda o Google a exibi-las nos momentos certos (ex: fotos de fachada quando o cliente pesquisa no Maps).
                  </span>
                </div>

                {/* Ou adicionar por URL */}
                <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border-primary)' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '6px' }}>
                    Ou adicione uma foto por URL direta:
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="url"
                      value={newPhotoUrl}
                      onChange={(e) => setNewPhotoUrl(e.target.value)}
                      placeholder="https://exemplo.com/imagem.jpg"
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#F3F4F6',
                        fontSize: '0.8125rem',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddSinglePhotoDirect(newPhotoUrl, newPhotoCategory, newPhotoAlt)}
                      disabled={!newPhotoUrl || uploadingPhoto}
                      className="btn btn-secondary btn-sm"
                    >
                      {uploadingPhoto ? <div className="spinner spinner-xs" /> : <Plus size={14} />} Adicionar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* FILA DE FOTOS EM MASSA PARA OTIMIZAÇÃO (STAGING QUEUE) */}
            {pendingUploadFiles.length > 0 && (
              <div style={{
                marginTop: '24px',
                padding: '20px',
                borderRadius: '12px',
                backgroundColor: 'rgba(6, 182, 212, 0.05)',
                border: '1px solid rgba(6, 182, 212, 0.25)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#E5E7EB', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileCheck size={18} style={{ color: '#06B6D4' }} />
                      Fila de Otimização & Envio ({pendingUploadFiles.length} foto(s))
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: '2px 0 0' }}>
                      Revise os nomes SEO, categorias e Alt Text antes de enviar ao Google Meu Negócio.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setPendingUploadFiles([])}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.75rem', color: '#9CA3AF' }}
                    >
                      Limpar Fila
                    </button>
                    <button
                      type="button"
                      onClick={uploadStagedPhotos}
                      disabled={uploadingBulkPhotos}
                      className="btn btn-primary btn-sm"
                      style={{
                        background: 'linear-gradient(135deg, #06B6D4, #0891B2)',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                      }}
                    >
                      {uploadingBulkPhotos ? <div className="spinner spinner-xs" /> : <Send size={15} />}
                      {uploadingBulkPhotos
                        ? `Enviando (${bulkUploadProgress?.current || 1}/${bulkUploadProgress?.total || pendingUploadFiles.length})...`
                        : `Otimizar e Enviar Todas as ${pendingUploadFiles.length} Fotos ao Google`}
                    </button>
                  </div>
                </div>

                {/* Grid dos itens na fila */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '14px',
                }}>
                  {pendingUploadFiles.map((staged) => (
                    <div
                      key={staged.id}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        gap: '12px',
                        position: 'relative',
                      }}
                    >
                      {/* Image Preview */}
                      <div style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                        <img
                          src={staged.previewUrl}
                          alt={staged.alt_text}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <span style={{
                          position: 'absolute', bottom: 2, left: 2,
                          background: 'rgba(0,0,0,0.7)', fontSize: '0.625rem',
                          color: '#06B6D4', padding: '1px 4px', borderRadius: '4px', fontWeight: 700,
                        }}>
                          {staged.sizeFormatted}
                        </span>
                      </div>

                      {/* Fields */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.6875rem', color: '#9CA3AF', fontWeight: 600 }}>
                            Nome do Arquivo (SEO):
                          </label>
                          <input
                            type="text"
                            value={staged.name}
                            onChange={(e) => updatePendingFile(staged.id, 'name', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#F3F4F6',
                              fontSize: '0.75rem',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.6875rem', color: '#9CA3AF', fontWeight: 600 }}>
                            Alt Text / Legenda:
                          </label>
                          <input
                            type="text"
                            value={staged.alt_text}
                            onChange={(e) => updatePendingFile(staged.id, 'alt_text', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#D1D5DB',
                              fontSize: '0.75rem',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                          <span style={{ fontSize: '0.6875rem', color: '#06B6D4', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={11} /> GPS: {geoLat.toFixed(2)}, {geoLng.toFixed(2)}
                          </span>
                          <span style={{ fontSize: '0.6875rem', color: '#9CA3AF' }}>
                            Cat: {staged.category}
                          </span>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removePendingFile(staged.id)}
                        style={{
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          background: 'rgba(239, 68, 68, 0.2)',
                          border: 'none',
                          color: '#EF4444',
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        title="Remover da fila"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* GALERIA DE FOTOS EXISTENTES */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <ImageIcon size={18} style={{ color: '#06B6D4' }} />
                Fotos Cadastradas no Perfil ({photos.length})
              </h3>

              {/* Filtro por Categoria */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['ALL', 'EXTERIOR', 'INTERIOR', 'PRODUCT', 'AT_WORK', 'ADDITIONAL'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setPhotoCategoryFilter(cat)}
                    className={`btn btn-xs ${photoCategoryFilter === cat ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ borderRadius: '6px', fontSize: '0.6875rem' }}
                  >
                    {cat === 'ALL' ? 'Todas' : cat}
                  </button>
                ))}
              </div>
            </div>

            {photos.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                  <ImageIcon size={40} style={{ color: '#6B7280' }} />
                </div>
                <div className="empty-state-title" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#E5E7EB' }}>
                  Nenhuma foto cadastrada
                </div>
                <div className="empty-state-text" style={{ fontSize: '0.875rem', color: '#9CA3AF', maxWidth: '440px', margin: '6px auto' }}>
                  Adicione fotos para aumentar em até 42% os pedidos de rotas e 35% mais cliques no site segundo dados oficiais do Google.
                </div>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '16px',
              }}>
                {photos
                  .filter((p) => photoCategoryFilter === 'ALL' || p.category === photoCategoryFilter)
                  .map((photo) => (
                    <div
                      key={photo.id}
                      style={{
                        borderRadius: '12px',
                        overflow: 'hidden',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        transition: 'transform 0.2s',
                      }}
                    >
                      <div style={{ position: 'relative', paddingTop: '75%', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <img
                          src={photo.url}
                          alt={photo.alt_text || 'Foto da empresa'}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />

                        {/* Ações da Foto: Editar e Excluir */}
                        <div
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            zIndex: 3,
                          }}
                        >
                          {/* Botão de Editar */}
                          <button
                            type="button"
                            onClick={() => handleOpenPhotoEditor(photo)}
                            style={{
                              background: 'rgba(0, 0, 0, 0.7)',
                              backdropFilter: 'blur(6px)',
                              color: '#60A5FA',
                              border: '1px solid rgba(59, 130, 246, 0.45)',
                              borderRadius: '8px',
                              width: '30px',
                              height: '30px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            title="Editar foto (Recortar, Cores, Filtros, Legenda e Categoria)"
                          >
                            <Edit3 size={14} />
                          </button>

                          {/* Botão de Excluir */}
                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(photo.id)}
                            style={{
                              background: 'rgba(0, 0, 0, 0.7)',
                              backdropFilter: 'blur(6px)',
                              color: '#EF4444',
                              border: '1px solid rgba(239, 68, 68, 0.45)',
                              borderRadius: '8px',
                              width: '30px',
                              height: '30px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            title="Excluir foto"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Category Badge */}
                        <span style={{
                          position: 'absolute',
                          bottom: 8,
                          left: 8,
                          background: 'rgba(0, 0, 0, 0.75)',
                          backdropFilter: 'blur(4px)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.6875rem',
                          color: '#E5E7EB',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                        }}>
                          {photo.category || 'Geral'}
                        </span>

                        {/* GPS Tagged Badge */}
                        {(photo.geo_lat || photo.metadata?.city) && (
                          <span style={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            background: 'rgba(6, 182, 212, 0.85)',
                            backdropFilter: 'blur(4px)',
                            padding: '2px 6px',
                            borderRadius: '5px',
                            fontSize: '0.625rem',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}>
                            <MapPin size={10} /> GPS Otimizado
                          </span>
                        )}
                      </div>

                      <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          {photo.filename && (
                            <span style={{ fontSize: '0.6875rem', color: '#06B6D4', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={photo.filename}>
                              📄 {photo.filename}
                            </span>
                          )}
                          <p style={{ fontSize: '0.8125rem', color: '#D1D5DB', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={photo.alt_text || photo.url}>
                            {photo.alt_text || 'Sem legenda'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                          <span style={{ fontSize: '0.6875rem', color: '#6B7280' }}>
                            {photo.created_at ? new Date(photo.created_at).toLocaleDateString('pt-BR') : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenPhotoEditor(photo)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#60A5FA',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                              padding: '2px 4px',
                            }}
                            title="Editar foto"
                          >
                            <Edit3 size={11} /> Editar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO/EDIÇÃO DE POST ESTILO GOOGLE MEU NEGÓCIO */}
      {showGooglePostModal && (
        <GooglePostModal
          isOpen={showGooglePostModal}
          onClose={() => {
            setShowGooglePostModal(false);
            setPostToEdit(null);
          }}
          client={client}
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

      {/* MODAL DE EDIÇÃO DE FOTO EXISTENTE DO PERFIL */}
      {isPhotoEditorOpen && editingPhoto && (
        <ImageEditorModal
          isOpen={isPhotoEditorOpen}
          onClose={() => {
            setIsPhotoEditorOpen(false);
            setEditingPhoto(null);
          }}
          mediaItem={{
            id: editingPhoto.id,
            url: editingPhoto.url,
            previewUrl: editingPhoto.url,
            filename: editingPhoto.filename || 'foto.jpg',
            name: editingPhoto.filename || 'foto.jpg',
            alt_text: editingPhoto.alt_text || '',
            category: editingPhoto.category || 'PRODUCT',
            format: 'PHOTO',
          }}
          onSave={handleSaveEditedPhoto}
          client={client}
        />
      )}
    </div>
  );
}

const styles = {
  page: { animation: 'fadeIn 0.3s ease-out' },
  headerCard: { marginBottom: '20px', padding: '24px' },
  headerTop: { display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap' },
  avatarWrapper: {
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    position: 'relative',
    overflow: 'hidden',
    flexShrink: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
  },
  logoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  avatar: {
    width: '64px', height: '64px', borderRadius: '16px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1.5rem', fontWeight: 800, color: 'white', flexShrink: 0,
  },
  headerInfo: { flex: 1, minWidth: '240px' },
  clientName: { fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' },
  headerActions: { display: 'flex', gap: '8px', flexShrink: 0 },
  fullInfoBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    alignItems: 'center',
    borderTop: '1px solid var(--border-primary)',
    paddingTop: '16px',
  },
  infoLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.8125rem',
    color: '#D1D5DB',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border-primary)',
    transition: 'all 0.2s',
  },
  socialIconsRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  socialIconBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  tabCount: { marginLeft: '6px', padding: '1px 6px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', fontSize: '0.6875rem' },
  overviewGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' },
  statIcon: { width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' },
  formLabel: { display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '6px' },
  postList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  postItem: { padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' },
  postHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  postDate: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#6B7280' },
  postContent: { fontSize: '0.875rem', color: '#D1D5DB', lineHeight: 1.6 },
  replyBox: { marginTop: '12px', padding: '12px', borderRadius: '8px', background: 'rgba(59,130,246,0.05)', borderLeft: '3px solid rgba(59,130,246,0.3)' },
};
