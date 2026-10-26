'use client';

import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  QrCode, Star, Copy, Check, Download, Printer,
  Share2, MessageCircle, ExternalLink, Sparkles, Building2,
  Image as ImageIcon, Loader2, CheckCircle2, RefreshCw
} from 'lucide-react';

export default function ReviewCardsPage() {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [reviewUrl, setReviewUrl] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState('table'); // 'table' | 'dark' | 'delivery'
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const cardRef = useRef(null);

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
        selectClient(list[0]);
      }
    } catch (err) {
      console.error('Error loading clients:', err);
    }
  }

  function selectClient(client) {
    setSelectedClient(client);
    setSyncSuccess(false);
    // Build direct Google review URL:
    // 1. Best: use the newReviewUri directly from Google API metadata
    // 2. Fallback: use google_place_id (the actual Place ID, e.g. ChIJ...)
    // 3. Fallback: use google_maps_uri if available
    // 4. Last resort: construct from location id
    let url;
    if (client.google_new_review_uri) {
      url = client.google_new_review_uri;
    } else if (client.google_place_id) {
      url = `https://search.google.com/local/writereview?placeid=${client.google_place_id}`;
    } else if (client.google_maps_uri) {
      url = client.google_maps_uri;
    } else {
      const locId = client.google_location_id || client.id;
      url = `https://search.google.com/local/writereview?placeid=${locId}`;
    }
    setReviewUrl(url);
    generateQr(url);
  }

  async function syncClientReviewLink() {
    if (!selectedClient) return;
    setSyncing(true);
    setSyncSuccess(false);
    try {
      const res = await fetch('/api/clients/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClient.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao sincronizar');

      // Fetch refreshed client data
      const cRes = await fetch(`/api/clients/${selectedClient.id}`);
      const cData = await cRes.json();
      if (cData.client) {
        const updated = cData.client;
        setSelectedClient(updated);
        setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        selectClient(updated);
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 4000);
      }
    } catch (err) {
      console.error('Erro ao sincronizar dados com Google:', err);
      alert('Não foi possível obter os dados oficiais do Google: ' + err.message);
    } finally {
      setSyncing(false);
    }
  }

  async function generateQr(url) {
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 360,
        margin: 2,
        color: {
          dark: '#0A0F1D',
          light: '#FFFFFF',
        },
      });
      setQrCodeDataUrl(dataUrl);
    } catch (err) {
      console.error('Error generating QR:', err);
    }
  }

  function handleUrlChange(newUrl) {
    setReviewUrl(newUrl);
    generateQr(newUrl);
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Download entire rendered card as high-res PNG image
  async function downloadCardAsImage() {
    if (!cardRef.current) return;
    setDownloadingImage(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 3, // 3x high resolution for retina & crisp printing
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const cleanName = selectedClient?.business_name
        ? selectedClient.business_name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '-')
        : 'google';
      link.download = `cartao-avaliacao-${cleanName}-${activeTemplate}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Erro ao baixar imagem do cartão:', err);
      alert('Erro ao gerar imagem do cartão para download.');
    } finally {
      setDownloadingImage(false);
    }
  }

  // Download only the raw QR Code PNG
  function downloadQrOnly() {
    if (!qrCodeDataUrl) return;
    const link = document.createElement('a');
    link.download = `qrcode-${selectedClient?.business_name || 'google'}.png`;
    link.href = qrCodeDataUrl;
    link.click();
  }

  function handlePrint() {
    window.print();
  }

  const whatsappMessage = selectedClient
    ? `Olá! Foi um prazer atender você na *${selectedClient.business_name}*! 😊\n\nSua opinião é muito importante para nós. Poderia nos dedicar 30 segundos para deixar sua avaliação de 5 estrelas no Google? ⭐⭐⭐⭐⭐\n\nBasta clicar no link abaixo:\n${reviewUrl}\n\nMuito obrigado pelo carinho e preferência!`
    : '';

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.pageHeader}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={styles.pageTitle}>Cards de Avaliação & QR Code</h1>
            <span className="badge badge-purple" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Star size={12} fill="#F59E0B" color="#F59E0B" /> 5 Estrelas
            </span>
          </div>
          <p style={styles.pageSubtitle}>
            Gere cartões profissionais para balcão, totens e embalagens para acelerar a captação de avaliações no Google Meu Negócio.
          </p>
        </div>

        {/* Client Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '0.8125rem', color: '#9CA3AF', fontWeight: 600 }}>Cliente:</label>
          <select
            className="input select"
            value={selectedClient?.id || ''}
            onChange={(e) => {
              const found = clients.find((c) => c.id === e.target.value);
              if (found) selectClient(found);
            }}
            style={{ minWidth: '260px' }}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.business_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedClient && (
        <div style={styles.mainGrid}>
          {/* Left Column: Settings, Templates & Download Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Link Box */}
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="card-title">Link Direto de Avaliação no Google</h3>
                {selectedClient?.google_new_review_uri || selectedClient?.google_place_id ? (
                  <span style={{ fontSize: '0.72rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                    <CheckCircle2 size={12} /> Oficial Verificado
                  </span>
                ) : null}
              </div>
              <div style={{ padding: '16px 20px' }}>
                {!(selectedClient?.google_new_review_uri || selectedClient?.google_place_id) ? (
                  <div style={{ marginBottom: '12px', padding: '10px 12px', borderRadius: '8px', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#FBBF24' }}>
                      ⚠️ Perfil ainda sem Place ID oficial do Google sincronizado.
                    </span>
                    <button
                      type="button"
                      onClick={syncClientReviewLink}
                      disabled={syncing}
                      className="btn btn-sm"
                      style={{
                        backgroundColor: '#F59E0B',
                        color: '#000',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        padding: '4px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        whiteSpace: 'nowrap',
                        cursor: syncing ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
                      {syncing ? 'Sincronizando...' : 'Sincronizar Oficial'}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <p style={{ fontSize: '0.8125rem', color: '#9CA3AF', margin: 0 }}>
                      Este link direciona o cliente diretamente para a janela de avaliação com as 5 estrelas ativadas.
                    </p>
                    <button
                      type="button"
                      onClick={syncClientReviewLink}
                      disabled={syncing}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#60A5FA',
                        fontSize: '0.75rem',
                        cursor: syncing ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 6px',
                        whiteSpace: 'nowrap'
                      }}
                      title="Atualizar link diretamente com o Google"
                    >
                      <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
                      {syncing ? 'Atualizando...' : 'Recarregar do Google'}
                    </button>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="input"
                    value={reviewUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    style={{ flex: 1, fontSize: '0.8125rem' }}
                  />
                  <button
                    onClick={() => copyToClipboard(reviewUrl)}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {copied ? <Check size={14} style={{ color: '#10B981' }} /> : <Copy size={14} />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                  <a
                    href={reviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm"
                    title="Testar Link no Google"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
                {syncSuccess && (
                  <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} /> Link oficial atualizado diretamente do perfil Google!
                  </div>
                )}
              </div>
            </div>

            {/* Template Selector (3 Visual Templates) */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Escolha o Modelo do Cartão (3 Templates)</h3>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Template 1: Classic White */}
                <button
                  type="button"
                  onClick={() => setActiveTemplate('table')}
                  style={{
                    ...styles.templateOption,
                    borderColor: activeTemplate === 'table' ? '#3B82F6' : 'rgba(255, 255, 255, 0.08)',
                    backgroundColor: activeTemplate === 'table' ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ ...styles.templateIcon, backgroundColor: '#FFFFFF', color: '#0F172A', fontWeight: 800 }}>
                      G
                    </div>
                    <div style={{ textAlign: 'left', flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        1. Display Clássico Google (Balcão / Mesa)
                        {activeTemplate === 'table' && <Check size={14} style={{ color: '#3B82F6' }} />}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                        Fundo branco limpo com logotipo oficial Google, ideal para acrílico, totem ou balcão
                      </div>
                    </div>
                  </div>
                </button>

                {/* Template 2: Dark Premium */}
                <button
                  type="button"
                  onClick={() => setActiveTemplate('dark')}
                  style={{
                    ...styles.templateOption,
                    borderColor: activeTemplate === 'dark' ? '#8B5CF6' : 'rgba(255, 255, 255, 0.08)',
                    backgroundColor: activeTemplate === 'dark' ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ ...styles.templateIcon, backgroundColor: '#0F172A', border: '1px solid #8B5CF6', color: '#A78BFA' }}>
                      🌙
                    </div>
                    <div style={{ textAlign: 'left', flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        2. Dark Premium / Black Gold (Elegante)
                        {activeTemplate === 'dark' && <Check size={14} style={{ color: '#8B5CF6' }} />}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                        Tema escuro luxuoso com gradiente e estrelas douradas para clínicas, lounges e barbearias
                      </div>
                    </div>
                  </div>
                </button>

                {/* Template 3: Delivery Card */}
                <button
                  type="button"
                  onClick={() => setActiveTemplate('delivery')}
                  style={{
                    ...styles.templateOption,
                    borderColor: activeTemplate === 'delivery' ? '#10B981' : 'rgba(255, 255, 255, 0.08)',
                    backgroundColor: activeTemplate === 'delivery' ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ ...styles.templateIcon, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34D399' }}>
                      📦
                    </div>
                    <div style={{ textAlign: 'left', flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        3. Cartão de Agradecimento & Delivery
                        {activeTemplate === 'delivery' && <Check size={14} style={{ color: '#10B981' }} />}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                        Formato postal retangular para sacolas, caixas de entrega, pedidos e tags de produtos
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Export Actions (DOWNLOAD CARD IMAGE AS PNG) */}
            <div className="card" style={{ padding: '20px' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '14px', color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Download size={16} style={{ color: '#3B82F6' }} />
                Baixar & Imprimir Cartão
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* PRIMARY ACTION: DOWNLOAD ENTIRE CARD IMAGE */}
                <button
                  type="button"
                  onClick={downloadCardAsImage}
                  disabled={downloadingImage || !qrCodeDataUrl}
                  style={styles.downloadCardBtn}
                >
                  {downloadingImage ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Gerando Imagem em Alta Resolução (PNG)...
                    </>
                  ) : (
                    <>
                      <ImageIcon size={18} />
                      Baixar Imagem deste Cartão (PNG HD)
                    </>
                  )}
                </button>

                {/* Secondary Actions */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={downloadQrOnly}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <QrCode size={14} /> Baixar Apenas QR Code
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Printer size={14} /> Imprimir Diretamente
                  </button>
                </div>
              </div>
            </div>

            {/* WhatsApp Text Message Generator */}
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <MessageCircle size={18} style={{ color: '#10B981' }} />
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                  Mensagem Pronta para WhatsApp
                </h4>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '12px' }}>
                Envie logo após o atendimento pelo WhatsApp com o link direto:
              </p>

              <div
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  color: '#E2E8F0',
                  fontSize: '0.8125rem',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-line',
                  marginBottom: '12px',
                }}
              >
                {whatsappMessage}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => copyToClipboard(whatsappMessage)}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {copied ? <Check size={14} style={{ color: '#10B981' }} /> : <Copy size={14} />}
                  {copied ? 'Copiado!' : 'Copiar Mensagem'}
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-success btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Share2 size={14} /> Compartilhar no WhatsApp
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Preview of Active Template */}
          <div>
            <div className="card" style={styles.previewContainer}>
              <div style={styles.previewBadge}>
                {activeTemplate === 'table' && 'Prévia: Display de Balcão (Clássico Google)'}
                {activeTemplate === 'dark' && 'Prévia: Dark Premium / Black Gold'}
                {activeTemplate === 'delivery' && 'Prévia: Cartão Delivery & Embalagem'}
              </div>

              {/* TEMPLATE 1: DISPLAY DE BALCÃO (CLASSIC WHITE GOOGLE) */}
              {activeTemplate === 'table' && (
                <div ref={cardRef} className="print-card" style={styles.tableCard}>
                  <div style={styles.googleGLogo}>G</div>
                  <h3 style={styles.cardBusinessName}>{selectedClient.business_name}</h3>
                  <p style={styles.cardTagline}>Como foi sua experiência conosco?</p>

                  <div style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={28} fill="#F59E0B" color="#F59E0B" />
                    ))}
                  </div>

                  {qrCodeDataUrl && (
                    <div style={styles.qrWrapper}>
                      <img src={qrCodeDataUrl} alt="QR Code de Avaliação" style={styles.qrImg} />
                    </div>
                  )}

                  <p style={styles.scanInstruction}>
                    Aponte a câmera do seu celular para nos avaliar no <strong>Google</strong>
                  </p>
                  <span style={styles.thankYouNote}>Sua avaliação nos ajuda a crescer! ❤️</span>
                </div>
              )}

              {/* TEMPLATE 2: DARK PREMIUM / BLACK GOLD */}
              {activeTemplate === 'dark' && (
                <div ref={cardRef} className="print-card" style={styles.darkCard}>
                  <div style={styles.darkGlowLine} />
                  <div style={styles.darkGoogleLogo}>
                    <span style={{ fontWeight: 900, color: '#3B82F6' }}>G</span>
                  </div>
                  <h3 style={styles.darkBusinessName}>{selectedClient.business_name}</h3>
                  <p style={styles.darkTagline}>Avalie nosso atendimento no Google</p>

                  <div style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={28} fill="#F59E0B" color="#F59E0B" style={{ filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.6))' }} />
                    ))}
                  </div>

                  {qrCodeDataUrl && (
                    <div style={styles.darkQrWrapper}>
                      <img src={qrCodeDataUrl} alt="QR Code de Avaliação" style={styles.qrImg} />
                    </div>
                  )}

                  <p style={styles.darkScanInstruction}>
                    Escaneie com a câmera do celular para abrir o perfil <strong>Google Meu Negócio</strong>
                  </p>
                  <span style={styles.darkThankYouNote}>Sua nota 5 estrelas faz toda a diferença! ✨</span>
                </div>
              )}

              {/* TEMPLATE 3: CARTÃO DELIVERY / EMBALAGEM */}
              {activeTemplate === 'delivery' && (
                <div ref={cardRef} className="print-card" style={styles.deliveryCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ display: 'inline-block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#10B981', fontWeight: 800, backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '3px 8px', borderRadius: '6px', marginBottom: '6px' }}>
                        MUITO OBRIGADO!
                      </span>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '2px 0 6px 0', lineHeight: 1.2 }}>
                        {selectedClient.business_name}
                      </h3>
                      <p style={{ fontSize: '0.8125rem', color: '#475569', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                        Ficou satisfeito com seu produto e atendimento? Sua avaliação 5 estrelas nos ajuda a continuar entregando o melhor!
                      </p>
                      <div style={{ display: 'flex', gap: '3px', marginBottom: '8px' }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={20} fill="#F59E0B" color="#F59E0B" />
                        ))}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
                        Aponte a câmera ao lado para nos avaliar no Google ❤️
                      </span>
                    </div>

                    {qrCodeDataUrl && (
                      <div style={{ backgroundColor: '#FFFFFF', padding: '8px', borderRadius: '10px', border: '1px solid #E2E8F0', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', flexShrink: 0 }}>
                        <img src={qrCodeDataUrl} alt="QR Code" style={{ width: '120px', height: '120px', display: 'block' }} />
                        <span style={{ fontSize: '0.625rem', color: '#475569', fontWeight: 700, display: 'block', marginTop: '4px' }}>
                          Avaliar no Google
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
  pageTitle: { fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#F9FAFB' },
  pageSubtitle: { fontSize: '0.875rem', color: '#9CA3AF', marginTop: '4px' },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.1fr',
    gap: '24px',
    alignItems: 'start',
  },
  templateOption: {
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
  },
  templateIcon: {
    fontSize: '1.25rem',
    width: '38px',
    height: '38px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  downloadCardBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '12px 20px',
    borderRadius: '10px',
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '0.9rem',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
    transition: 'all 0.2s',
  },
  previewContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    position: 'relative',
    backgroundColor: 'rgba(11, 15, 25, 0.8)',
    borderRadius: '16px',
    minHeight: '520px',
  },
  previewBadge: {
    position: 'absolute',
    top: '14px',
    left: '18px',
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#9CA3AF',
    fontWeight: 700,
  },

  // TEMPLATE 1: TABLE / COUNTER DISPLAY
  tableCard: {
    width: '330px',
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    borderRadius: '18px',
    padding: '30px 26px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    border: '1px solid #E2E8F0',
  },
  googleGLogo: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    backgroundColor: '#4285F4',
    color: '#FFFFFF',
    fontWeight: 900,
    fontSize: '1.3rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '10px',
    boxShadow: '0 4px 10px rgba(66, 133, 244, 0.3)',
  },
  cardBusinessName: {
    fontSize: '1.2rem',
    fontWeight: 800,
    color: '#0F172A',
    lineHeight: '1.3',
    margin: '0 0 2px 0',
  },
  cardTagline: {
    fontSize: '0.8125rem',
    color: '#64748B',
    margin: '4px 0 0 0',
  },
  starsRow: {
    display: 'flex',
    gap: '4px',
    margin: '12px 0 16px',
  },
  qrWrapper: {
    padding: '8px',
    backgroundColor: '#FFFFFF',
    borderRadius: '14px',
    border: '2px solid #F1F5F9',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.05)',
  },
  qrImg: {
    width: '180px',
    height: '180px',
    display: 'block',
  },
  scanInstruction: {
    fontSize: '0.84rem',
    color: '#334155',
    marginTop: '16px',
    lineHeight: '1.4',
    marginBottom: '0',
  },
  thankYouNote: {
    fontSize: '0.72rem',
    color: '#94A3B8',
    marginTop: '8px',
  },

  // TEMPLATE 2: DARK PREMIUM / BLACK GOLD
  darkCard: {
    width: '330px',
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    borderRadius: '18px',
    padding: '30px 26px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    position: 'relative',
    overflow: 'hidden',
  },
  darkGlowLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: 'linear-gradient(90deg, #3B82F6, #8B5CF6, #EC4899)',
  },
  darkGoogleLogo: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    fontSize: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '10px',
    boxShadow: '0 0 15px rgba(59, 130, 246, 0.3)',
  },
  darkBusinessName: {
    fontSize: '1.2rem',
    fontWeight: 800,
    color: '#F8FAFC',
    lineHeight: '1.3',
    margin: '0 0 2px 0',
  },
  darkTagline: {
    fontSize: '0.8125rem',
    color: '#94A3B8',
    margin: '4px 0 0 0',
  },
  darkQrWrapper: {
    padding: '8px',
    backgroundColor: '#FFFFFF',
    borderRadius: '14px',
    boxShadow: '0 0 20px rgba(255, 255, 255, 0.15)',
  },
  darkScanInstruction: {
    fontSize: '0.84rem',
    color: '#CBD5E1',
    marginTop: '16px',
    lineHeight: '1.4',
    marginBottom: '0',
  },
  darkThankYouNote: {
    fontSize: '0.72rem',
    color: '#FBBF24',
    marginTop: '8px',
    fontWeight: 600,
  },

  // TEMPLATE 3: DELIVERY CARD
  deliveryCard: {
    width: '420px',
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    padding: '24px 26px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    border: '1px solid #E2E8F0',
  },
};
