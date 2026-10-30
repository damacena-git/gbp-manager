'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useRef, useEffect } from 'react';
import {
  Check, X, Image as ImageIcon, Video, Camera, Plus, Sparkles,
  Calendar, Clock, Send, Globe, Phone, MapPin, Trash2,
  ExternalLink, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Loader2, Edit3, Save, Star, Crop
} from 'lucide-react';
import ImageEditorModal from '@/components/media/ImageEditorModal';

/**
 * WhatsApp SVG icon
 */
function WhatsAppIcon({ size = 16, style, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

/**
 * Helper to get the best WhatsApp URL for a client
 */
export function getClientWhatsAppUrl(client) {
  if (!client) return '';
  // 1. Check social_links for WHATSAPP
  if (Array.isArray(client.social_links)) {
    const waSocial = client.social_links.find(
      (s) => s.type?.toUpperCase() === 'WHATSAPP' || s.platform?.toUpperCase() === 'WHATSAPP'
    );
    if (waSocial?.url) {
      return waSocial.url.startsWith('http') ? waSocial.url : `https://${waSocial.url}`;
    }
  }
  // 2. Check client.whatsapp or client.phone
  const raw = client.whatsapp || client.phone || '';
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const fullDigits = digits.length >= 10 && !digits.startsWith('55') ? `55${digits}` : digits;
  return `https://wa.me/${fullDigits}`;
}

/**
 * Helper to get website URL
 */
export function getClientWebsiteUrl(client) {
  if (!client?.website && !client?.website_url) return '';
  const site = client.website || client.website_url;
  return site.startsWith('http://') || site.startsWith('https://') ? site : `https://${site}`;
}

const EMPTY_CLIENTS = [];

/**
 * GooglePostModal - Modal for creating and editing posts aligned with the system's dark glass visual identity
 */
export default function GooglePostModal({
  isOpen,
  onClose,
  client,
  clients = EMPTY_CLIENTS,
  postToEdit = null,
  onPostCreated,
  onPostUpdated,
}) {
  const [selectedClientId, setSelectedClientId] = useState(client?.id || postToEdit?.client_id || '');
  const [currentClient, setCurrentClient] = useState(client || null);

  // Computed active client resolving immediately without needing async effect
  const activeClient = client || currentClient || (selectedClientId ? clients.find((c) => c.id === selectedClientId) : null) || null;

  // Post State flags
  const isEditing = Boolean(postToEdit?.id);
  const isAlreadyPublished = Boolean(postToEdit?.google_post_id || postToEdit?.status === 'published');
  const isScheduledPost = Boolean(postToEdit?.status === 'scheduled' && !isAlreadyPublished);

  // Post Type: 'STANDARD' (Atualização) | 'OFFER' (Oferta) | 'EVENT' (Evento)
  const [postType, setPostType] = useState('STANDARD');

  // Form Fields
  const [description, setDescription] = useState('');

  // Offer Fields
  const [offerTitle, setOfferTitle] = useState('');
  const [offerStartDate, setOfferStartDate] = useState('');
  const [offerEndDate, setOfferEndDate] = useState('');
  const [offerCouponCode, setOfferCouponCode] = useState('');
  const [offerRedeemUrl, setOfferRedeemUrl] = useState('');
  const [offerTerms, setOfferTerms] = useState('');
  const [showOfferMoreDetails, setShowOfferMoreDetails] = useState(false);

  // Event Fields
  const [eventTitle, setEventTitle] = useState('');
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('09:00');
  const [eventEndDate, setEventEndDate] = useState('');
  const [eventEndTime, setEventEndTime] = useState('18:00');

  // Schedule Toggle (Programar esta postagem)
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('10:00');

  // Call to Action (Adicionar mais detalhes / + Botão)
  const [showButtonOptions, setShowButtonOptions] = useState(false);
  const [buttonType, setButtonType] = useState('NONE'); // NONE, BOOK, ORDER, SHOP, LEARN_MORE, SIGN_UP, CALL
  const [buttonUrl, setButtonUrl] = useState('');

  // Media (Photos and Videos)
  const [mediaItems, setMediaItems] = useState([]); // [{ id, file, url, previewUrl, format: 'PHOTO' | 'VIDEO', name }]
  const [isDragging, setIsDragging] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const fileInputRef = useRef(null);

  // AI Generation
  const [generatingAI, setGeneratingAI] = useState(false);
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [aiTopicPrompt, setAiTopicPrompt] = useState('');
  const [aiNeighborhoodsPrompt, setAiNeighborhoodsPrompt] = useState('');

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState(null);

  // Update current client when prop or selection changes (only if modal is open and values differ)
  useEffect(() => {
    if (!isOpen) return;

    if (client) {
      if (selectedClientId !== client.id) {
        setSelectedClientId(client.id);
      }
      if (currentClient?.id !== client.id) {
        setCurrentClient(client);
      }
    } else if (selectedClientId && clients.length > 0) {
      const found = clients.find((c) => c.id === selectedClientId);
      if (found && currentClient?.id !== found.id) {
        setCurrentClient(found);
      }
    }

    if (activeClient?.address) {
      try {
        const addr = typeof activeClient.address === 'string' ? JSON.parse(activeClient.address) : activeClient.address;
        const sub = addr.sublocality || addr.neighborhood || '';
        if (sub && !aiNeighborhoodsPrompt) {
          setAiNeighborhoodsPrompt(sub);
        }
      } catch {}
    }
  }, [isOpen, client?.id, selectedClientId, clients, activeClient?.address]);

  // Handle Edit Mode vs Create Mode
  useEffect(() => {
    if (!isOpen) return;

    if (postToEdit) {
      setDescription(postToEdit.content || '');
      setPostType(postToEdit.topic_type || 'STANDARD');
      if (postToEdit.client_id) {
        setSelectedClientId(postToEdit.client_id);
        const matched = clients.find((c) => c.id === postToEdit.client_id);
        if (matched) setCurrentClient(matched);
      }

      // Call to action
      if (postToEdit.call_to_action) {
        const cta = typeof postToEdit.call_to_action === 'string'
          ? JSON.parse(postToEdit.call_to_action)
          : postToEdit.call_to_action;
        setShowButtonOptions(true);
        setButtonType(cta.actionType || 'LEARN_MORE');
        setButtonUrl(cta.url || '');
      } else {
        setShowButtonOptions(false);
        setButtonType('NONE');
        setButtonUrl('');
      }

      // Schedule
      if (postToEdit.scheduled_for) {
        setIsScheduled(true);
        const d = new Date(postToEdit.scheduled_for);
        setScheduledDate(d.toISOString().split('T')[0]);
        setScheduledTime(d.toTimeString().slice(0, 5));
      } else {
        setIsScheduled(false);
        setScheduledDate('');
        setScheduledTime('10:00');
      }

      // Event data
      if (postToEdit.event_data) {
        const ev = typeof postToEdit.event_data === 'string'
          ? JSON.parse(postToEdit.event_data)
          : postToEdit.event_data;
        setEventTitle(ev.title || '');
        if (ev.schedule?.startDate) {
          const { year, month, day } = ev.schedule.startDate;
          setEventStartDate(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
        }
        if (ev.schedule?.endDate) {
          const { year, month, day } = ev.schedule.endDate;
          setEventEndDate(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
        }
      }

      // Offer data
      if (postToEdit.offer_data) {
        const off = typeof postToEdit.offer_data === 'string'
          ? JSON.parse(postToEdit.offer_data)
          : postToEdit.offer_data;
        setOfferCouponCode(off.couponCode || '');
        setOfferRedeemUrl(off.redeemOnlineUrl || '');
        setOfferTerms(off.termsConditions || '');
        setShowOfferMoreDetails(Boolean(off.couponCode || off.redeemOnlineUrl || off.termsConditions));
      }

      // Media
      if (Array.isArray(postToEdit.media_urls) && postToEdit.media_urls.length > 0) {
        setMediaItems(
          postToEdit.media_urls.map((url, idx) => ({
            id: `existing_${idx}_${Date.now()}`,
            url,
            previewUrl: url,
            format: url.match(/\.(mp4|mov|webm|avi)(\?.*)?$/i) ? 'VIDEO' : 'PHOTO',
            name: `Mídia #${idx + 1}`,
          }))
        );
      } else {
        setMediaItems([]);
      }
    } else {
      // Clean state for new post
      setDescription('');
      setPostType('STANDARD');
      setOfferTitle('');
      setOfferStartDate('');
      setOfferEndDate('');
      setOfferCouponCode('');
      setOfferRedeemUrl('');
      setOfferTerms('');
      setShowOfferMoreDetails(false);
      setEventTitle('');
      setEventStartDate('');
      setEventEndDate('');
      setIsScheduled(false);
      setScheduledDate('');
      setShowButtonOptions(false);
      setButtonType('NONE');
      setButtonUrl('');
      setMediaItems([]);
      setSubmitFeedback(null);
    }
  }, [isOpen, postToEdit]);

  if (!isOpen) return null;

  // File Upload Handlers - strictly 1 photo or video per post
  function handleFiles(files) {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    // Take only the first file (Google strictly accepts 1 media per post)
    const file = fileList[0];
    const isVideo = file.type.startsWith('video') || Boolean(file.name.match(/\.(mp4|mov|webm|avi|mkv)(\?.*)?$/i));

    if (isVideo) {
      if (file.size > 75 * 1024 * 1024) {
        alert('O vídeo selecionado excede 75 MB. O Google Meu Negócio aceita vídeos de no máximo 75 MB.');
        return;
      }
    }

    const previewUrl = URL.createObjectURL(file);
    const newItem = {
      id: `media_${Date.now()}_0`,
      file,
      previewUrl,
      format: isVideo ? 'VIDEO' : 'PHOTO',
      name: file.name,
      size: file.size,
    };

    // Replace any existing media (strictly 1)
    setMediaItems([newItem]);

    // Check video duration if video
    if (isVideo) {
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.onloadedmetadata = () => {
        window.URL.revokeObjectURL(tempVideo.src);
        const durationSec = Math.round(tempVideo.duration);
        if (durationSec > 30) {
          setSubmitFeedback({
            type: 'warning',
            message: `Atenção: O vídeo possui ${durationSec}s. O Google Meu Negócio recomenda vídeos de até 30 segundos.`,
          });
        }
      };
      tempVideo.src = previewUrl;
    }
  }

  function handleSaveEditedMedia(updatedItem) {
    setMediaItems([updatedItem]);
    setSubmitFeedback({
      type: 'success',
      message: 'Foto tratada e ajustada com sucesso! ✨',
    });
    setTimeout(() => setSubmitFeedback(null), 3000);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  function handleFileSelect(e) {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }

  function removeMediaItem(id) {
    setMediaItems((prev) => prev.filter((item) => item.id !== id));
  }

  // Quick Action Link Shortcuts
  function applyWhatsAppLink(target = 'button') {
    const waUrl = getClientWhatsAppUrl(activeClient);
    if (!waUrl) {
      alert('Nenhum número de WhatsApp ou telefone cadastrado na ficha deste cliente.');
      return;
    }
    if (target === 'offer') {
      setOfferRedeemUrl(waUrl);
    } else {
      setButtonUrl(waUrl);
      if (buttonType === 'NONE' || buttonType === 'CALL') {
        setButtonType('LEARN_MORE');
      }
    }
  }

  function applyWebsiteLink(target = 'button') {
    const webUrl = getClientWebsiteUrl(activeClient);
    if (!webUrl) {
      alert('Nenhum site cadastrado na ficha deste cliente.');
      return;
    }
    if (target === 'offer') {
      setOfferRedeemUrl(webUrl);
    } else {
      setButtonUrl(webUrl);
      if (buttonType === 'NONE' || buttonType === 'CALL') {
        setButtonType('LEARN_MORE');
      }
    }
  }

  // AI Generator helper
  async function generatePostTextWithAI() {
    if (!activeClient) {
      alert('Selecione um cliente primeiro.');
      return;
    }
    setGeneratingAI(true);
    try {
      const res = await fetch('/api/posts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: activeClient.id,
          topic: aiTopicPrompt || (postType === 'OFFER' ? 'Oferta especial de serviços' : postType === 'EVENT' ? 'Evento especial' : 'Dicas de cuidados, novidades e destaque de serviços'),
          tone: 'persuasivo',
          type: postType,
          neighborhoods: aiNeighborhoodsPrompt,
        }),
      });
      const data = await res.json();
      if (data.generated) {
        const text = data.generated.content || data.generated;
        setDescription(text);
        if (data.generated.callToAction?.type && (buttonType === 'NONE' || !buttonType)) {
          setShowButtonOptions(true);
          setButtonType(data.generated.callToAction.type);
          if (!buttonUrl) {
            const wa = getClientWhatsAppUrl(activeClient);
            const web = getClientWebsiteUrl(activeClient);
            if (wa) setButtonUrl(wa);
            else if (web) setButtonUrl(web);
          }
        }
        setShowAIPrompt(false);
      } else {
        alert(data.error || 'Erro ao gerar conteúdo com IA');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao gerar texto');
    } finally {
      setGeneratingAI(false);
    }
  }

  // Submit Handler (Supports both Create and Update)
  async function handleSubmit(action = 'publish_now') {
    const targetClientId = activeClient?.id || selectedClientId;
    if (!targetClientId) {
      alert('Por favor, selecione um cliente para a postagem.');
      return;
    }

    if (!description.trim()) {
      alert('Por favor, escreva a descrição da postagem.');
      return;
    }

    if (postType === 'OFFER' && !offerTitle.trim()) {
      alert('Por favor, informe o título da oferta.');
      return;
    }

    if (postType === 'EVENT' && !eventTitle.trim()) {
      alert('Por favor, informe o título do evento.');
      return;
    }

    if (buttonType !== 'NONE' && buttonType !== 'CALL' && !buttonUrl.trim()) {
      alert('Por favor, informe o link para o botão de ação.');
      return;
    }

    setSubmitting(true);
    setSubmitFeedback(null);

    try {
      // 1. Process media: upload files to /api/upload to get public storage URLs and avoid large payloads
      const processedMedia = [];
      for (let i = 0; i < mediaItems.length; i++) {
        const item = mediaItems[i];
        if (item.file) {
          setSubmitFeedback({
            type: 'info',
            message: `Fazendo upload de mídia (${i + 1}/${mediaItems.length})...`,
          });
          const formData = new FormData();
          formData.append('file', item.file);
          formData.append('folder', 'posts');

          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          let uploadData = null;
          try {
            uploadData = await uploadRes.json();
          } catch {
            const errText = await uploadRes.text().catch(() => '');
            throw new Error(`Falha no upload (${uploadRes.status}): ${errText || 'O arquivo de vídeo/imagem é muito grande para o servidor.'}`);
          }

          if (!uploadRes.ok || uploadData?.error) {
            throw new Error(uploadData?.error || 'Falha ao fazer upload da imagem/vídeo');
          }

          processedMedia.push({
            url: uploadData.url,
            format: uploadData.format || item.format || 'PHOTO',
          });
        } else if (item.url) {
          processedMedia.push({
            url: item.url,
            format: item.format || 'PHOTO',
          });
        }
      }

      // Google Business Profile strictly allows at most 1 photo/video per post
      const finalMedia = processedMedia.slice(0, 1);

      // 2. Build Call to Action
      let callToAction = null;
      if (buttonType !== 'NONE') {
        callToAction = {
          actionType: buttonType,
          ...(buttonType !== 'CALL' ? { url: buttonUrl.trim() } : {}),
        };
      }

      // 3. Build Event or Offer data
      let eventData = null;
      let offerData = null;

      if (postType === 'EVENT') {
        const startParts = eventStartDate ? eventStartDate.split('-') : [];
        const endParts = eventEndDate ? eventEndDate.split('-') : [];
        const [startH, startM] = (eventStartTime || '09:00').split(':');
        const [endH, endM] = (eventEndTime || '18:00').split(':');

        eventData = {
          title: eventTitle.trim(),
          schedule: {
            startDate: startParts.length === 3 ? { year: parseInt(startParts[0]), month: parseInt(startParts[1]), day: parseInt(startParts[2]) } : undefined,
            startTime: { hours: parseInt(startH) || 9, minutes: parseInt(startM) || 0, seconds: 0, nanos: 0 },
            endDate: endParts.length === 3 ? { year: parseInt(endParts[0]), month: parseInt(endParts[1]), day: parseInt(endParts[2]) } : undefined,
            endTime: { hours: parseInt(endH) || 18, minutes: parseInt(endM) || 0, seconds: 0, nanos: 0 },
          },
        };
      } else if (postType === 'OFFER') {
        const startParts = offerStartDate ? offerStartDate.split('-') : [];
        const endParts = offerEndDate ? offerEndDate.split('-') : [];

        eventData = {
          title: offerTitle.trim(),
          schedule: {
            startDate: startParts.length === 3 ? { year: parseInt(startParts[0]), month: parseInt(startParts[1]), day: parseInt(startParts[2]) } : undefined,
            endDate: endParts.length === 3 ? { year: parseInt(endParts[0]), month: parseInt(endParts[1]), day: parseInt(endParts[2]) } : undefined,
          },
        };

        offerData = {
          couponCode: offerCouponCode.trim() || undefined,
          redeemOnlineUrl: offerRedeemUrl.trim() || undefined,
          termsConditions: offerTerms.trim() || undefined,
        };
      }

      // 4. Calculate schedule timestamp
      let scheduledForIso = null;
      if (isScheduled && scheduledDate) {
        const [hour, min] = (scheduledTime || '10:00').split(':');
        const dateObj = new Date(`${scheduledDate}T${hour.padStart(2, '0')}:${min.padStart(2, '0')}:00`);
        scheduledForIso = dateObj.toISOString();
      }

      const shouldPublishImmediately = action === 'publish_now' && !isScheduled;

      if (postToEdit?.id) {
        // --- UPDATE MODE (PUT) ---
        let targetStatus;
        let publishNow = false;

        if (isAlreadyPublished) {
          targetStatus = 'published';
          publishNow = false;
        } else if (isScheduledPost) {
          if (action === 'publish_now') {
            targetStatus = 'published';
            publishNow = true;
          } else {
            targetStatus = 'scheduled';
            publishNow = false;
          }
        } else {
          // Draft
          if (action === 'publish_now') {
            targetStatus = isScheduled ? 'scheduled' : 'published';
            publishNow = !isScheduled;
          } else {
            targetStatus = 'draft';
            publishNow = false;
          }
        }

        const updatePayload = {
          id: postToEdit.id,
          content: description.trim(),
          topic_type: postType,
          media_items: finalMedia,
          media_urls: finalMedia.map((m) => m.url),
          call_to_action: callToAction,
          event_data: eventData,
          offer_data: offerData,
          scheduled_for: isAlreadyPublished ? (postToEdit.scheduled_for || null) : scheduledForIso,
          publish_now: publishNow,
          status: targetStatus,
        };

        const res = await fetch('/api/posts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || 'Erro ao atualizar postagem');
        }

        setSubmitFeedback({
          type: 'success',
          message: isAlreadyPublished
            ? 'Post atualizado no Google Meu Negócio com sucesso! 🚀'
            : publishNow
              ? 'Post publicado no Google Meu Negócio com sucesso! 🚀'
              : targetStatus === 'scheduled'
                ? 'Agendamento atualizado com sucesso! ⏰'
                : 'Alterações salvas com sucesso! 💾',
        });

        if (onPostUpdated) {
          onPostUpdated(data.post);
        } else if (onPostCreated) {
          onPostCreated(data.post);
        }

        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        // --- CREATE MODE (POST) ---
        const createPayload = {
          client_id: targetClientId,
          content: description.trim(),
          topic_type: postType,
          media_items: finalMedia,
          media_urls: finalMedia.map((m) => m.url),
          call_to_action: callToAction,
          event_data: eventData,
          offer_data: offerData,
          scheduled_for: scheduledForIso,
          publish_now: shouldPublishImmediately,
          status: shouldPublishImmediately ? 'published' : isScheduled ? 'scheduled' : 'draft',
        };

        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createPayload),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || 'Erro ao processar postagem');
        }

        setSubmitFeedback({
          type: 'success',
          message: shouldPublishImmediately
            ? 'Postagem publicada no Google com sucesso! 🚀'
            : isScheduled
              ? 'Postagem agendada com sucesso! 📅'
              : 'Rascunho salvo com sucesso! 💾',
        });

        if (onPostCreated) {
          onPostCreated(data.post || data.posts?.[0]);
        }

        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error('Error submitting post:', err);
      setSubmitFeedback({
        type: 'error',
        message: err.message || 'Ocorreu um erro ao salvar o post.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 7, 18, 0.78)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '880px',
          maxHeight: '92vh',
          backgroundColor: '#0F172A',
          background: 'linear-gradient(180deg, #111827 0%, #0B0F17 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 30px rgba(59, 130, 246, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#F9FAFB',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: isAlreadyPublished
                  ? 'linear-gradient(135deg, #10B981, #059669)'
                  : isScheduledPost
                    ? 'linear-gradient(135deg, #8B5CF6, #6366F1)'
                    : isEditing
                      ? 'linear-gradient(135deg, #F59E0B, #D97706)'
                      : 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: isAlreadyPublished
                  ? '0 0 16px rgba(16, 185, 129, 0.35)'
                  : isScheduledPost
                    ? '0 0 16px rgba(139, 92, 246, 0.35)'
                    : '0 0 16px rgba(59, 130, 246, 0.35)',
              }}
            >
              {isAlreadyPublished ? (
                <CheckCircle2 size={20} />
              ) : isScheduledPost ? (
                <Calendar size={20} />
              ) : isEditing ? (
                <Edit3 size={20} />
              ) : (
                <Plus size={22} />
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#F9FAFB', margin: 0, letterSpacing: '-0.01em' }}>
                  {isAlreadyPublished
                    ? 'Editar Post Publicado'
                    : isScheduledPost
                      ? 'Editar Post Agendado'
                      : isEditing
                        ? 'Editar Rascunho'
                        : 'Criar Postagem'}
                </h2>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: isAlreadyPublished
                      ? 'rgba(16, 185, 129, 0.15)'
                      : isScheduledPost
                        ? 'rgba(139, 92, 246, 0.15)'
                        : 'rgba(59, 130, 246, 0.15)',
                    color: isAlreadyPublished ? '#34D399' : isScheduledPost ? '#C084FC' : '#60A5FA',
                    border: `1px solid ${isAlreadyPublished ? 'rgba(16, 185, 129, 0.3)' : isScheduledPost ? 'rgba(139, 92, 246, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                  }}
                >
                  {isAlreadyPublished ? '✓ Publicado no Google' : isScheduledPost ? '⏰ Agendado' : 'Google Meu Negócio'}
                </span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#9CA3AF', margin: '3px 0 0' }}>
                {activeClient?.business_name ? `Perfil: ${activeClient.business_name}` : 'Selecione a empresa'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#9CA3AF',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Client selector (if multiple clients available and not fixed) */}
        {!client && clients.length > 0 && (
          <div style={{ padding: '12px 24px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>
              Selecionar Empresa:
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '0.875rem',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                color: '#F9FAFB',
              }}
            >
              <option value="" style={{ background: '#111827', color: '#F9FAFB' }}>Selecione o cliente...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id} style={{ background: '#111827', color: '#F9FAFB' }}>
                  {c.business_name} {c.category ? `(${c.category})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* TOP TABS - FIXED & VISIBLE (Atualização | Oferta | Evento) */}
        <div
          style={{
            padding: '14px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(17, 24, 39, 0.6)',
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          {/* Atualização (STANDARD) */}
          <button
            type="button"
            onClick={() => setPostType('STANDARD')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              backgroundColor: postType === 'STANDARD' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              color: postType === 'STANDARD' ? '#60A5FA' : '#9CA3AF',
              border: postType === 'STANDARD' ? '1px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: postType === 'STANDARD' ? '0 0 14px rgba(59, 130, 246, 0.3)' : 'none',
            }}
          >
            {postType === 'STANDARD' && <Check size={16} strokeWidth={2.5} />}
            Atualização
          </button>

          {/* Oferta (OFFER) */}
          <button
            type="button"
            onClick={() => setPostType('OFFER')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              backgroundColor: postType === 'OFFER' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              color: postType === 'OFFER' ? '#FBBF24' : '#9CA3AF',
              border: postType === 'OFFER' ? '1px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: postType === 'OFFER' ? '0 0 14px rgba(245, 158, 11, 0.3)' : 'none',
            }}
          >
            {postType === 'OFFER' && <Check size={16} strokeWidth={2.5} />}
            Oferta
          </button>

          {/* Evento (EVENT) */}
          <button
            type="button"
            onClick={() => setPostType('EVENT')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              backgroundColor: postType === 'EVENT' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              color: postType === 'EVENT' ? '#A78BFA' : '#9CA3AF',
              border: postType === 'EVENT' ? '1px solid #8B5CF6' : '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: postType === 'EVENT' ? '0 0 14px rgba(139, 92, 246, 0.3)' : 'none',
            }}
          >
            {postType === 'EVENT' && <Check size={16} strokeWidth={2.5} />}
            Evento
          </button>
        </div>

        {/* Modal Body with Scroll */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* TWO COLUMNS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '24px',
              alignItems: 'start',
            }}
          >
            {/* LEFT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* SPECIFIC FIELDS FOR OFERTA */}
              {postType === 'OFFER' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#F9FAFB', display: 'block', marginBottom: '6px' }}>
                      Título da oferta *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 20% de desconto no primeiro atendimento"
                      value={offerTitle}
                      onChange={(e) => setOfferTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        fontSize: '0.875rem',
                        color: '#F9FAFB',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                        Data de início *
                      </label>
                      <input
                        type="date"
                        value={offerStartDate}
                        onChange={(e) => setOfferStartDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          color: '#F9FAFB',
                          fontSize: '0.8125rem',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                        Data de término *
                      </label>
                      <input
                        type="date"
                        value={offerEndDate}
                        onChange={(e) => setOfferEndDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          color: '#F9FAFB',
                          fontSize: '0.8125rem',
                        }}
                      />
                    </div>
                  </div>

                  {/* Detalhes extras da oferta */}
                  <button
                    type="button"
                    onClick={() => setShowOfferMoreDetails(!showOfferMoreDetails)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#60A5FA',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 0',
                    }}
                  >
                    {showOfferMoreDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    {showOfferMoreDetails ? 'Ocultar detalhes da oferta' : 'Adicionar cupom, link ou termos'}
                  </button>

                  {showOfferMoreDetails && (
                    <div style={{ padding: '14px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                          Código do cupom (opcional):
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: PROMO20"
                          value={offerCouponCode}
                          onChange={(e) => setOfferCouponCode(e.target.value)}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.04)', color: '#F9FAFB', fontSize: '0.8125rem' }}
                        />
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF' }}>
                            Link para resgatar a oferta (opcional):
                          </label>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => applyWhatsAppLink('offer')}
                              style={{
                                background: 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                color: '#34D399',
                                borderRadius: '6px',
                                fontSize: '0.7rem',
                                padding: '3px 8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 600,
                              }}
                            >
                              <WhatsAppIcon size={12} /> WhatsApp
                            </button>
                            <button
                              type="button"
                              onClick={() => applyWebsiteLink('offer')}
                              style={{
                                background: 'rgba(59, 130, 246, 0.15)',
                                border: '1px solid rgba(59, 130, 246, 0.35)',
                                color: '#60A5FA',
                                borderRadius: '6px',
                                fontSize: '0.7rem',
                                padding: '3px 8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 600,
                              }}
                            >
                              <Globe size={12} /> Site
                            </button>
                          </div>
                        </div>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={offerRedeemUrl}
                          onChange={(e) => setOfferRedeemUrl(e.target.value)}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.04)', color: '#F9FAFB', fontSize: '0.8125rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                          Termos e condições (opcional):
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Válido até o fim do mês, 1 por cliente."
                          value={offerTerms}
                          onChange={(e) => setOfferTerms(e.target.value)}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.04)', color: '#F9FAFB', fontSize: '0.8125rem' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SPECIFIC FIELDS FOR EVENTO */}
              {postType === 'EVENT' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#F9FAFB', display: 'block', marginBottom: '6px' }}>
                      Título do evento *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Workshop ou Inauguração Especial"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        fontSize: '0.875rem',
                        color: '#F9FAFB',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                        Data de início *
                      </label>
                      <input
                        type="date"
                        value={eventStartDate}
                        onChange={(e) => setEventStartDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          color: '#F9FAFB',
                          fontSize: '0.8125rem',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                        Horário de início
                      </label>
                      <input
                        type="time"
                        value={eventStartTime}
                        onChange={(e) => setEventStartTime(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          color: '#F9FAFB',
                          fontSize: '0.8125rem',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                        Data de término *
                      </label>
                      <input
                        type="date"
                        value={eventEndDate}
                        onChange={(e) => setEventEndDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          color: '#F9FAFB',
                          fontSize: '0.8125rem',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                        Horário de término
                      </label>
                      <input
                        type="time"
                        value={eventEndTime}
                        onChange={(e) => setEventEndTime(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          color: '#F9FAFB',
                          fontSize: '0.8125rem',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* DESCRIÇÃO TEXTAREA (0/1.500 COUNTER & AI BUTTON) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#F9FAFB' }}>
                    {postType === 'OFFER' ? 'Detalhes da oferta' : postType === 'EVENT' ? 'Detalhes do evento' : 'Descrição'}
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowAIPrompt(!showAIPrompt)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#A78BFA',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Sparkles size={13} />
                    {showAIPrompt ? 'Fechar IA' : '✨ Escrever com IA (Gemini)'}
                  </button>
                </div>

                {/* AI Prompt Box */}
                {showAIPrompt && (
                  <div
                    style={{
                      marginBottom: '12px',
                      padding: '14px',
                      backgroundColor: 'rgba(139, 92, 246, 0.08)',
                      borderRadius: '12px',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontSize: '0.8125rem', color: '#DDD6FE', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={14} color="#A78BFA" /> Especialista em SEO Local (Post Completo & Aprofundado)
                      </span>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34D399',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          fontWeight: 600,
                        }}
                      >
                        Benefício + 3 Termos Técnicos + Contexto Local + CTA
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#C4B5FD', marginBottom: '4px' }}>
                          Tema ou Serviço Abordado:
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Remoção de calosidades, unha encravada, hidratação profunda..."
                          value={aiTopicPrompt}
                          onChange={(e) => setAiTopicPrompt(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(139, 92, 246, 0.35)',
                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                            color: '#F9FAFB',
                            fontSize: '0.8125rem',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#C4B5FD', marginBottom: '4px' }}>
                          Bairros de Atuação (Opcional):
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Sudoeste, Octogonal, Cruzeiro"
                          value={aiNeighborhoodsPrompt}
                          onChange={(e) => setAiNeighborhoodsPrompt(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(139, 92, 246, 0.35)',
                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                            color: '#F9FAFB',
                            fontSize: '0.8125rem',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                        💡 Cria um post rico (até 1.400 caracteres) com autoridade técnica, sem superficialidade.
                      </span>
                      <button
                        type="button"
                        onClick={generatePostTextWithAI}
                        disabled={generatingAI}
                        style={{
                          background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 18px',
                          fontSize: '0.8125rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {generatingAI ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        {generatingAI ? 'Criando Post Profundo...' : 'Gerar Post Completo com IA'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Textarea Container with 0/1.500 */}
                <div
                  style={{
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '14px',
                    position: 'relative',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <textarea
                    placeholder="Escreva o conteúdo da postagem..."
                    value={description}
                    onChange={(e) => {
                      if (e.target.value.length <= 1500) {
                        setDescription(e.target.value);
                      }
                    }}
                    rows={postType === 'STANDARD' ? 5 : 4}
                    style={{
                      width: '100%',
                      border: 'none',
                      outline: 'none',
                      resize: 'vertical',
                      fontSize: '0.875rem',
                      lineHeight: '1.6',
                      color: '#F9FAFB',
                      backgroundColor: 'transparent',
                      fontFamily: 'inherit',
                      padding: 0,
                      minHeight: '90px',
                    }}
                  />
                  <div
                    style={{
                      textAlign: 'right',
                      fontSize: '0.75rem',
                      color: description.length > 1400 ? '#EF4444' : '#9CA3AF',
                      marginTop: '6px',
                    }}
                  >
                    {description.length}/1.500
                  </div>
                </div>
              </div>

              {/* PROGRAMAR ESTA POSTAGEM (SLIDER SWITCH) OU AVISO DE PUBLICADO */}
              {isAlreadyPublished ? (
                <div
                  style={{
                    padding: '12px 14px',
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <CheckCircle2 size={20} style={{ color: '#34D399', flexShrink: 0 }} />
                  <div style={{ fontSize: '0.8125rem', color: '#D1FAE5', lineHeight: 1.45 }}>
                    <strong>Post ativo no Google Meu Negócio:</strong> Suas alterações de texto e detalhes serão atualizadas diretamente na publicação existente no Google, sem duplicar o post e sem reagendar.
                  </div>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                    }}
                  >
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#F9FAFB' }}>
                      Programar esta postagem
                    </span>

                    {/* Switch Toggle */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isScheduled}
                      onClick={() => setIsScheduled(!isScheduled)}
                      style={{
                        width: '46px',
                        height: '24px',
                        borderRadius: '999px',
                        backgroundColor: isScheduled ? '#3B82F6' : 'rgba(255, 255, 255, 0.15)',
                        border: 'none',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease',
                        padding: 0,
                        boxShadow: isScheduled ? '0 0 10px rgba(59, 130, 246, 0.4)' : 'none',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: '2px',
                          left: isScheduled ? '24px' : '2px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#FFFFFF',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                          transition: 'left 0.2s ease',
                        }}
                      />
                    </button>
                  </div>

                  {/* Scheduled Inputs */}
                  {isScheduled && (
                    <div
                      style={{
                        padding: '14px',
                        backgroundColor: 'rgba(59, 130, 246, 0.08)',
                        borderRadius: '12px',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                      }}
                    >
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                          Data do agendamento *
                        </label>
                        <input
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            fontSize: '0.8125rem',
                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                            color: '#F9FAFB',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                          Horário *
                        </label>
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            fontSize: '0.8125rem',
                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                            color: '#F9FAFB',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.08)', margin: '4px 0' }} />

              {/* ADICIONAR MAIS DETALHES (+ BOTÃO) */}
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#F9FAFB', marginBottom: '10px' }}>
                  Adicionar mais detalhes
                </div>

                {!showButtonOptions && buttonType === 'NONE' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowButtonOptions(true);
                      setButtonType('LEARN_MORE');
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: '1px solid rgba(59, 130, 246, 0.35)',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      color: '#60A5FA',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Plus size={16} strokeWidth={2.5} />
                    + Botão
                  </button>
                ) : (
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#F9FAFB' }}>
                        Ação do Botão:
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setButtonType('NONE');
                          setShowButtonOptions(false);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#EF4444',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        Remover botão
                      </button>
                    </div>

                    <select
                      value={buttonType}
                      onChange={(e) => setButtonType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        fontSize: '0.875rem',
                        backgroundColor: '#1E293B',
                        color: '#F9FAFB',
                      }}
                    >
                      <option value="NONE">Nenhum</option>
                      <option value="BOOK">Reservar</option>
                      <option value="ORDER">Pedir on-line</option>
                      <option value="SHOP">Comprar</option>
                      <option value="LEARN_MORE">Saiba mais</option>
                      <option value="SIGN_UP">Cadastre-se</option>
                      <option value="CALL">Ligar agora</option>
                    </select>

                    {/* URL FIELD FOR BUTTON (WITH WHATSAPP SHORTCUT) */}
                    {buttonType !== 'NONE' && buttonType !== 'CALL' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF' }}>
                            Link para o botão (URL):
                          </label>

                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => applyWhatsAppLink('button')}
                              title="Puxa o número do WhatsApp da ficha e gera o link wa.me direto"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                color: '#34D399',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              <WhatsAppIcon size={13} />
                              📲 Puxar WhatsApp da Ficha
                            </button>

                            <button
                              type="button"
                              onClick={() => applyWebsiteLink('button')}
                              title="Puxa a URL do site da empresa"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                border: '1px solid rgba(59, 130, 246, 0.35)',
                                color: '#60A5FA',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              <Globe size={13} />
                              Site
                            </button>
                          </div>
                        </div>

                        <input
                          type="url"
                          placeholder="https://exemplo.com.br ou https://wa.me/..."
                          value={buttonUrl}
                          onChange={(e) => setButtonUrl(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            fontSize: '0.8125rem',
                            backgroundColor: 'rgba(0, 0, 0, 0.25)',
                            color: '#F9FAFB',
                          }}
                        />
                      </div>
                    )}

                    {buttonType === 'CALL' && (
                      <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: 0 }}>
                        📞 No Google, o botão <strong>Ligar agora</strong> utilizará automaticamente o telefone cadastrado no perfil da empresa ({activeClient?.phone || 'cadastrado'}).
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN - MEDIA DRAG AND DROP (1 PHOTO OR VIDEO) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#F9FAFB' }}>
                Foto ou vídeo
              </label>

              {/* Drag & Drop Box */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                style={{
                  border: isDragging ? '2px dashed #3B82F6' : '1.5px dashed rgba(59, 130, 246, 0.35)',
                  borderRadius: '16px',
                  backgroundColor: isDragging ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                  minHeight: '220px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px 16px',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                <p style={{ fontSize: '0.9rem', color: '#E2E8F0', fontWeight: 500, margin: '0 0 8px' }}>
                  {mediaItems.length > 0 ? 'Arraste para substituir a foto ou vídeo' : 'Arraste 1 imagem ou vídeo até aqui'}
                </p>

                <p style={{ fontSize: '0.8125rem', color: '#6B7280', margin: '0 0 14px' }}>
                  ou
                </p>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 18px',
                    borderRadius: '10px',
                    border: '1px solid rgba(59, 130, 246, 0.35)',
                    backgroundColor: 'rgba(59, 130, 246, 0.12)',
                    color: '#60A5FA',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Camera size={18} />
                  {mediaItems.length > 0 ? 'Trocar imagem / vídeo' : 'Selecionar imagem ou vídeo'}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />

                <span style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '14px' }}>
                  O Google aceita 1 foto ou vídeo por post · JPG, PNG, WEBP, MP4, MOV
                </span>
              </div>

              {/* MEDIA PREVIEW (SINGLE MEDIA) */}
              {mediaItems.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#9CA3AF' }}>
                      Mídia selecionada:
                    </span>
                    {mediaItems[0].format === 'PHOTO' && (
                      <button
                        type="button"
                        onClick={() => setIsEditorOpen(true)}
                        style={{
                          background: 'rgba(59, 130, 246, 0.15)',
                          border: '1px solid rgba(59, 130, 246, 0.35)',
                          color: '#60A5FA',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          borderRadius: '8px',
                          padding: '4px 10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Crop size={13} /> Editar Foto
                      </button>
                    )}
                  </div>
                  <div
                    style={{
                      position: 'relative',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '1.5px solid rgba(59, 130, 246, 0.4)',
                      backgroundColor: '#000',
                      maxHeight: '260px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {mediaItems[0].format === 'VIDEO' ? (
                      <video
                        src={mediaItems[0].previewUrl}
                        controls
                        style={{ maxWidth: '100%', maxHeight: '260px', objectFit: 'contain' }}
                      />
                    ) : (
                      <img
                        src={mediaItems[0].previewUrl}
                        alt={mediaItems[0].name}
                        style={{ maxWidth: '100%', maxHeight: '260px', objectFit: 'contain' }}
                      />
                    )}

                    {mediaItems[0].format === 'PHOTO' && (
                      <button
                        type="button"
                        onClick={() => setIsEditorOpen(true)}
                        title="Editar enquadramento e cores da foto"
                        style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          padding: '4px 10px',
                          backgroundColor: 'rgba(15, 23, 42, 0.85)',
                          backdropFilter: 'blur(4px)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: '#F9FAFB',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          zIndex: 2,
                        }}
                      >
                        <Crop size={13} color="#60A5FA" /> Editar
                      </button>
                    )}

                    <span
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '8px',
                        padding: '3px 8px',
                        backgroundColor: 'rgba(0,0,0,0.75)',
                        color: '#fff',
                        fontSize: '0.7rem',
                        borderRadius: '6px',
                        fontWeight: 700,
                      }}
                    >
                      {mediaItems[0].format === 'VIDEO' ? 'Vídeo' : 'Foto'}
                    </span>

                    <button
                      type="button"
                      onClick={() => removeMediaItem(mediaItems[0].id)}
                      title="Remover mídia"
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(239, 68, 68, 0.85)',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Feedback message banner */}
          {submitFeedback && (
            <div
              style={{
                marginTop: '20px',
                padding: '12px 16px',
                borderRadius: '10px',
                backgroundColor: submitFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : submitFeedback.type === 'info' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${submitFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.35)' : submitFeedback.type === 'info' ? 'rgba(59, 130, 246, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                color: submitFeedback.type === 'success' ? '#34D399' : submitFeedback.type === 'info' ? '#60A5FA' : '#F87171',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {submitFeedback.type === 'success' ? (
                <CheckCircle2 size={18} />
              ) : submitFeedback.type === 'info' ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <AlertCircle size={18} />
              )}
              <span>{submitFeedback.message}</span>
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#9CA3AF',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'color 0.15s ease',
            }}
          >
            Cancelar
          </button>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {isAlreadyPublished ? (
              <button
                type="button"
                onClick={() => handleSubmit('save_published')}
                disabled={submitting}
                style={{
                  padding: '10px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                }}
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Salvar e Atualizar no Google
              </button>
            ) : isScheduledPost ? (
              <>
                <button
                  type="button"
                  onClick={() => handleSubmit('publish_now')}
                  disabled={submitting}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid rgba(59, 130, 246, 0.35)',
                    backgroundColor: 'rgba(59, 130, 246, 0.12)',
                    color: '#60A5FA',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  title="Publicar imediatamente no Google Meu Negócio sem aguardar o agendamento"
                >
                  <Send size={15} />
                  Publicar Agora no Google
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmit('save_schedule')}
                  disabled={submitting}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)',
                  }}
                >
                  {submitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Calendar size={16} />
                  )}
                  Salvar Alterações do Agendamento
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSubmit('save_draft')}
                  disabled={submitting}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#F9FAFB',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Save size={15} />
                  {isEditing ? 'Salvar Rascunho' : 'Salvar Rascunho'}
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmit('publish_now')}
                  disabled={submitting}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isScheduled
                      ? 'linear-gradient(135deg, #8B5CF6, #6366F1)'
                      : 'linear-gradient(135deg, #3B82F6, #2563EB)',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: isScheduled
                      ? '0 4px 14px rgba(139, 92, 246, 0.4)'
                      : '0 4px 14px rgba(59, 130, 246, 0.4)',
                  }}
                >
                  {submitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : isScheduled ? (
                    <Calendar size={16} />
                  ) : (
                    <Send size={16} />
                  )}
                  {isScheduled ? 'Agendar Postagem' : 'Publicar no Google Agora'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Image Editor Modal */}
      {isEditorOpen && mediaItems.length > 0 && mediaItems[0].format === 'PHOTO' && (
        <ImageEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          mediaItem={mediaItems[0]}
          onSave={handleSaveEditedMedia}
          client={activeClient}
        />
      )}
    </div>
  );
}
