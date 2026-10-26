import { google } from 'googleapis';
import { getAuthenticatedClient } from './auth.js';

/**
 * GBP Service — Central service to interact with Google Business Profile APIs
 * Uses the modern federated API structure (not deprecated v4)
 */

// ============================================
// ACCOUNT & LOCATION MANAGEMENT
// ============================================

/**
 * List all accounts accessible by the authenticated user
 */
export async function listAccounts(refreshToken) {
  const auth = getAuthenticatedClient(refreshToken);
  const accountManagement = google.mybusinessaccountmanagement({
    version: 'v1',
    auth,
  });

  const allAccounts = [];
  let pageToken = null;
  do {
    const response = await accountManagement.accounts.list({
      pageSize: 20,
      pageToken: pageToken || undefined,
    });
    const accounts = response.data.accounts || [];
    allAccounts.push(...accounts);
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return allAccounts;
}

/**
 * List all locations for a given account (with automatic pagination)
 */
export async function listLocations(refreshToken, accountId) {
  const auth = getAuthenticatedClient(refreshToken);
  const businessInfo = google.mybusinessbusinessinformation({
    version: 'v1',
    auth,
  });

  const allLocations = [];
  let pageToken = null;
  do {
    const response = await businessInfo.accounts.locations.list({
      parent: `accounts/${accountId}`,
      pageSize: 100,
      pageToken: pageToken || undefined,
      readMask: 'name,title,storefrontAddress,phoneNumbers,websiteUri,regularHours,categories,profile,metadata,openInfo',
    });
    const locations = response.data.locations || [];
    allLocations.push(...locations);
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return allLocations;
}

/**
 * Get details for a specific location
 */
export async function getLocation(refreshToken, locationName) {
  const auth = getAuthenticatedClient(refreshToken);
  const businessInfo = google.mybusinessbusinessinformation({
    version: 'v1',
    auth,
  });

  const response = await businessInfo.locations.get({
    name: locationName,
    readMask: 'name,title,storefrontAddress,phoneNumbers,websiteUri,regularHours,categories,profile,metadata,openInfo,serviceArea',
  });
  return response.data;
}

/**
 * Update a location's information
 */
export async function updateLocation(refreshToken, locationName, updateData, updateMask) {
  const auth = getAuthenticatedClient(refreshToken);
  const businessInfo = google.mybusinessbusinessinformation({
    version: 'v1',
    auth,
  });

  const response = await businessInfo.locations.patch({
    name: locationName,
    updateMask: updateMask,
    requestBody: updateData,
  });
  return response.data;
}

/**
 * Update full location data directly via GBP REST API
 * Supports: title, profile.description, phoneNumbers.primaryPhone, websiteUri
 */
export async function updateGoogleLocationFull(refreshToken, locationId, fields) {
  const token = await getAuthToken(refreshToken);
  const locPath = locationId.startsWith('locations/') ? locationId : `locations/${locationId}`;

  const updateMaskParts = [];
  const requestBody = {};

  if (fields.business_name) {
    requestBody.title = fields.business_name;
    updateMaskParts.push('title');
  }

  if (fields.description !== undefined) {
    requestBody.profile = { description: fields.description };
    updateMaskParts.push('profile.description');
  }

  if (fields.phone) {
    requestBody.phoneNumbers = { primaryPhone: fields.phone };
    updateMaskParts.push('phoneNumbers.primaryPhone');
  }

  if (fields.website) {
    requestBody.websiteUri = fields.website;
    updateMaskParts.push('websiteUri');
  }

  let patchData = null;
  if (updateMaskParts.length > 0) {
    const res = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${locPath}?updateMask=${updateMaskParts.join(',')}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[GBP updateGoogleLocationFull error] ${res.status}:`, errText);
      return { success: false, error: errText };
    }

    patchData = await res.json();
  }

  // Update social profile attributes if provided
  if (fields.social_links && typeof fields.social_links === 'object') {
    try {
      await updateLocationSocialAttributes(refreshToken, locationId, fields.social_links);
    } catch (socErr) {
      console.warn('[GBP updateGoogleLocationFull] Warning updating social links:', socErr.message);
    }
  }

  return { success: true, data: patchData };
}

/**
 * Fetch official attributes (social profiles, amenities, etc.) for a GBP location
 */
export async function fetchLocationAttributes(refreshToken, locationId) {
  try {
    const token = await getAuthToken(refreshToken);
    const locId = locationId.replace('locations/', '');
    const url = `https://mybusinessbusinessinformation.googleapis.com/v1/locations/${locId}/attributes`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.warn(`[GBP fetchLocationAttributes error] ${res.status}`);
      return [];
    }
    const data = await res.json();
    return data.attributes || [];
  } catch (err) {
    console.warn('[GBP fetchLocationAttributes exception]:', err.message);
    return [];
  }
}

/**
 * Update social profile attributes on Google Business Profile
 */
export async function updateLocationSocialAttributes(refreshToken, locationId, socialLinks) {
  if (!socialLinks) return { success: true };
  try {
    const token = await getAuthToken(refreshToken);
    const locId = locationId.replace('locations/', '');

    const mapping = [
      { key: 'instagram', attr: 'attributes/url_instagram' },
      { key: 'facebook', attr: 'attributes/url_facebook' },
      { key: 'linkedin', attr: 'attributes/url_linkedin' },
      { key: 'youtube', attr: 'attributes/url_youtube' },
      { key: 'whatsapp', attr: 'attributes/url_whatsapp' },
      { key: 'tiktok', attr: 'attributes/url_tiktok' },
    ];

    const attributesToPatch = [];
    const attributeMask = [];

    for (const m of mapping) {
      const val = socialLinks[m.key];
      if (val !== undefined && val !== null) {
        attributeMask.push(m.attr);
        let uri = String(val).trim();
        if (uri) {
          if (m.key === 'whatsapp' && !uri.startsWith('http')) {
            const clean = uri.replace(/\D/g, '');
            uri = `https://wa.me/${clean.length === 11 ? '55' + clean : clean}`;
          } else if (!uri.startsWith('http') && !uri.startsWith('wa.me')) {
            if (m.key === 'instagram') uri = `https://instagram.com/${uri.replace('@', '')}`;
            else if (m.key === 'facebook') uri = `https://facebook.com/${uri}`;
            else if (m.key === 'linkedin') uri = `https://linkedin.com/in/${uri}`;
            else if (m.key === 'youtube') uri = `https://youtube.com/@${uri.replace('@', '')}`;
          }

          attributesToPatch.push({
            name: m.attr,
            valueType: 'URL',
            uriValues: [{ uri }],
          });
        }
      }
    }

    if (attributeMask.length === 0) {
      return { success: true };
    }

    const url = `https://mybusinessbusinessinformation.googleapis.com/v1/locations/${locId}/attributes?attributeMask=${attributeMask.join(',')}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ attributes: attributesToPatch }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn(`[GBP updateLocationSocialAttributes error] ${res.status}:`, err);
      return { success: false, error: err };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    console.warn('[GBP updateLocationSocialAttributes exception]:', err.message);
    return { success: false, error: err.message };
  }
}

// ============================================
// POSTS (LOCAL POSTS)
// ============================================

async function getAuthToken(refreshToken) {
  const auth = getAuthenticatedClient(refreshToken);
  const tokenRes = await auth.getAccessToken();
  return tokenRes.token;
}

/**
 * Create a new local post
 */
export async function createPost(refreshToken, locationName, postData) {
  const token = await getAuthToken(refreshToken);

  let cleanPath = locationName.replace(/^accounts\//, '');
  if (!cleanPath.includes('/locations/')) {
    cleanPath = `accounts/${cleanPath}`;
  } else {
    cleanPath = `accounts/${cleanPath}`;
  }
  cleanPath = cleanPath.replace(/^(accounts\/)+/, 'accounts/');

  const url = `https://mybusiness.googleapis.com/v4/${cleanPath}/localPosts`;

  const payload = {
    languageCode: postData.languageCode || 'pt-BR',
    summary: (postData.content || postData.summary || '').trim(),
    topicType: postData.topicType || 'STANDARD',
  };

  // Call to action button
  if (postData.callToAction && postData.callToAction.actionType && postData.callToAction.actionType !== 'NONE') {
    payload.callToAction = {
      actionType: postData.callToAction.actionType,
    };
    if (postData.callToAction.actionType !== 'CALL' && postData.callToAction.url) {
      payload.callToAction.url = postData.callToAction.url;
    }
  }

  // Media (Photos and Videos)
  if (postData.mediaItems && Array.isArray(postData.mediaItems) && postData.mediaItems.length > 0) {
    const validMedia = postData.mediaItems
      .filter((m) => m && m.url && (m.url.startsWith('http://') || m.url.startsWith('https://')))
      .map((m) => ({
        mediaFormat: m.format === 'VIDEO' ? 'VIDEO' : 'PHOTO',
        sourceUrl: m.url,
      }));
    if (validMedia.length > 0) {
      // Google Business Profile API strict limit: maximum 1 media item (photo or video) per post
      payload.media = validMedia.slice(0, 1);
    }
  }

  // Event schedule
  if ((postData.topicType === 'EVENT' || postData.topicType === 'OFFER') && postData.eventSchedule) {
    payload.event = {
      title: postData.eventSchedule.title || '',
      schedule: postData.eventSchedule.schedule || postData.eventSchedule,
    };
  }

  // Offer data
  if (postData.topicType === 'OFFER' && postData.offerData) {
    payload.offer = {
      couponCode: postData.offerData.couponCode || '',
      redeemOnlineUrl: postData.offerData.redeemOnlineUrl || '',
      termsConditions: postData.offerData.termsConditions || '',
    };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[GBP createPost error] (${res.status}):`, errText);
    throw new Error(`Erro na API do Google Posts (${res.status}): ${errText}`);
  }

  return await res.json();
}

/**
 * Update an existing local post on Google Meu Negócio via PATCH
 */
export async function updatePost(refreshToken, postName, postData) {
  const token = await getAuthToken(refreshToken);

  let cleanName = postName.startsWith('accounts/') ? postName : `accounts/${postName}`;
  cleanName = cleanName.replace(/^(accounts\/)+/, 'accounts/');

  const mask = [];
  const payload = {};

  // Summary (text description)
  if (postData.content !== undefined || postData.summary !== undefined) {
    payload.summary = (postData.content ?? postData.summary ?? '').trim();
    mask.push('summary');
  }

  // Call to Action
  if (postData.callToAction !== undefined) {
    if (postData.callToAction && postData.callToAction.actionType && postData.callToAction.actionType !== 'NONE') {
      payload.callToAction = {
        actionType: postData.callToAction.actionType,
      };
      if (postData.callToAction.actionType !== 'CALL' && postData.callToAction.url) {
        payload.callToAction.url = postData.callToAction.url;
      }
    } else {
      payload.callToAction = null;
    }
    mask.push('callToAction');
  }

  // Media
  if (postData.mediaItems && Array.isArray(postData.mediaItems) && postData.mediaItems.length > 0) {
    const validMedia = postData.mediaItems
      .filter((m) => m && m.url && (m.url.startsWith('http://') || m.url.startsWith('https://')))
      .map((m) => ({
        mediaFormat: m.format === 'VIDEO' ? 'VIDEO' : 'PHOTO',
        sourceUrl: m.url,
      }));
    if (validMedia.length > 0) {
      payload.media = validMedia;
      mask.push('media');
    }
  }

  // Event schedule
  if (postData.eventSchedule) {
    payload.event = {
      title: postData.eventSchedule.title || '',
      schedule: postData.eventSchedule.schedule || postData.eventSchedule,
    };
    mask.push('event');
  }

  // Offer data
  if (postData.offerData) {
    payload.offer = {
      couponCode: postData.offerData.couponCode || '',
      redeemOnlineUrl: postData.offerData.redeemOnlineUrl || '',
      termsConditions: postData.offerData.termsConditions || '',
    };
    mask.push('offer');
  }

  if (mask.length === 0) {
    mask.push('summary');
    payload.summary = (postData.content || '').trim();
  }

  const url = `https://mybusiness.googleapis.com/v4/${cleanName}?updateMask=${mask.join(',')}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[GBP updatePost error] (${res.status}):`, errText);
    throw new Error(`Erro ao atualizar post no Google (${res.status}): ${errText}`);
  }

  return await res.json();
}

/**
 * List posts for a location
 */
export async function listPosts(refreshToken, locationName, pageSize = 20) {
  try {
    const token = await getAuthToken(refreshToken);
    const res = await fetch(`https://mybusiness.googleapis.com/v4/${locationName}/localPosts?pageSize=${pageSize}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[GBP listPosts error] ${res.status}:`, errText);
      return [];
    }

    const data = await res.json();
    return data.localPosts || [];
  } catch (err) {
    console.warn('[GBP listPosts exception]:', err.message);
    return [];
  }
}

/**
 * Delete a post
 */
export async function deletePost(refreshToken, postName) {
  const token = await getAuthToken(refreshToken);
  const res = await fetch(`https://mybusiness.googleapis.com/v4/${postName}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return { success: res.ok };
}

// ============================================
// REVIEWS
// ============================================

/**
 * List reviews for a location
 */
export async function listReviews(refreshToken, locationName, pageSize = 50) {
  try {
    const token = await getAuthToken(refreshToken);
    const res = await fetch(
      `https://mybusiness.googleapis.com/v4/${locationName}/reviews?pageSize=${pageSize}&orderBy=updateTime%20desc`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[GBP listReviews error] ${res.status}:`, errText);
      return { reviews: [], averageRating: 0, totalReviewCount: 0 };
    }

    const data = await res.json();
    return {
      reviews: data.reviews || [],
      averageRating: data.averageRating || 0,
      totalReviewCount: data.totalReviewCount || 0,
    };
  } catch (err) {
    console.warn('[GBP listReviews exception]:', err.message);
    return { reviews: [], averageRating: 0, totalReviewCount: 0 };
  }
}

/**
 * Reply to a review
 */
export async function replyToReview(refreshToken, reviewName, replyText) {
  const token = await getAuthToken(refreshToken);
  const res = await fetch(`https://mybusiness.googleapis.com/v4/${reviewName}/reply`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ comment: replyText }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Reply Error (${res.status}): ${errText}`);
  }

  return await res.json();
}

/**
 * Delete a review reply
 */
export async function deleteReviewReply(refreshToken, reviewName) {
  const token = await getAuthToken(refreshToken);
  const res = await fetch(`https://mybusiness.googleapis.com/v4/${reviewName}/reply`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return { success: res.ok };
}

// ============================================
// SERVICES (BUSINESS INFORMATION API V1)
// ============================================

/**
 * Fetch all services for a location from Google Business Information API
 */
export async function fetchLocationServices(refreshToken, locationId) {
  try {
    const token = await getAuthToken(refreshToken);
    const locId = locationId.replace('locations/', '');
    const url = `https://mybusinessbusinessinformation.googleapis.com/v1/locations/${locId}?readMask=serviceItems,title,categories`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    
    if (!res.ok) {
      const err = await res.text();
      console.warn(`[GBP fetchLocationServices error] ${res.status}:`, err);
      return { services: [], rawServiceItems: [] };
    }

    const data = await res.json();
    const serviceTypeNames = {};
    if (data.categories?.primaryCategory?.serviceTypes) {
      for (const st of data.categories.primaryCategory.serviceTypes) {
        if (st.serviceTypeId && st.displayName) {
          serviceTypeNames[st.serviceTypeId] = st.displayName;
        }
      }
    }
    if (Array.isArray(data.categories?.additionalCategories)) {
      for (const cat of data.categories.additionalCategories) {
        if (Array.isArray(cat.serviceTypes)) {
          for (const st of cat.serviceTypes) {
            if (st.serviceTypeId && st.displayName) {
              serviceTypeNames[st.serviceTypeId] = st.displayName;
            }
          }
        }
      }
    }

    const primaryCategoryName = data.categories?.primaryCategory?.displayName || 'Serviços';
    const primaryCategoryResource = data.categories?.primaryCategory?.name || 'categories/gcid:internet_marketing_service';

    const services = (data.serviceItems || []).map((item, idx) => {
      if (item.structuredServiceItem) {
        const stId = item.structuredServiceItem.serviceTypeId;
        const localizedName = serviceTypeNames[stId] || stId.replace('job_type_id:', '').replace(/_/g, ' ');
        return {
          id: `structured_${stId.replace('job_type_id:', '')}`,
          name: localizedName.charAt(0).toUpperCase() + localizedName.slice(1),
          description: item.structuredServiceItem.description || '',
          price: '',
          category: primaryCategoryName,
          service_type_id: stId,
          is_freeform: false,
          is_active: true,
        };
      } else if (item.freeFormServiceItem) {
        const label = item.freeFormServiceItem.label?.displayName || `Serviço ${idx + 1}`;
        return {
          id: `freeform_${idx}_${label.toLowerCase().replace(/\s+/g, '_')}`,
          name: label,
          description: item.freeFormServiceItem.label?.description || '',
          price: '',
          category: primaryCategoryName,
          service_type_id: null,
          is_freeform: true,
          is_active: true,
        };
      }
      return null;
    }).filter(Boolean);

    return {
      services,
      primaryCategoryResource,
      primaryCategoryName,
      rawServiceItems: data.serviceItems || []
    };
  } catch (err) {
    console.warn('[GBP fetchLocationServices exception]:', err.message);
    return { services: [], rawServiceItems: [] };
  }
}

/**
 * Update services list for a location on Google Business Information API
 */
export async function updateLocationServices(refreshToken, locationId, services, primaryCategoryResource = null) {
  try {
    const token = await getAuthToken(refreshToken);
    const locId = locationId.replace('locations/', '');

    // Dynamically resolve the official primary category resource from Google if not specified or generic
    let resolvedCategory = primaryCategoryResource;
    if (!resolvedCategory || resolvedCategory.includes('internet_marketing_service')) {
      try {
        const locRes = await fetch(
          `https://mybusinessbusinessinformation.googleapis.com/v1/locations/${locId}?readMask=categories`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (locRes.ok) {
          const locData = await locRes.json();
          if (locData.categories?.primaryCategory?.name) {
            resolvedCategory = locData.categories.primaryCategory.name;
          }
        }
      } catch (catErr) {
        console.warn('[GBP updateLocationServices] Failed to fetch real category resource:', catErr.message);
      }
    }

    if (!resolvedCategory) {
      resolvedCategory = 'categories/gcid:podiatrist';
    }

    const serviceItems = [];
    for (const s of services) {
      if (!s || !s.name) continue;
      if (s.service_type_id && !s.is_freeform) {
        serviceItems.push({
          structuredServiceItem: {
            serviceTypeId: s.service_type_id,
            ...(s.description ? { description: s.description.slice(0, 300) } : {}),
          },
        });
      } else {
        serviceItems.push({
          freeFormServiceItem: {
            category: s.categoryResource || resolvedCategory,
            label: {
              displayName: (s.name || '').slice(0, 100),
              ...(s.description ? { description: s.description.slice(0, 300) } : {}),
            },
          },
        });
      }
    }

    const url = `https://mybusinessbusinessinformation.googleapis.com/v1/locations/${locId}?updateMask=serviceItems`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ serviceItems }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn(`[GBP updateLocationServices error] ${res.status}:`, err);
      return { success: false, error: `Google API (${res.status}): ${err}` };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    console.warn('[GBP updateLocationServices exception]:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Update business description on Google Business Information API
 */
export async function updateBusinessDescription(refreshToken, locationId, description) {
  try {
    const token = await getAuthToken(refreshToken);
    const locId = locationId.replace('locations/', '');
    const url = `https://mybusinessbusinessinformation.googleapis.com/v1/locations/${locId}?updateMask=profile.description`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profile: {
          description: (description || '').slice(0, 750),
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn(`[GBP updateBusinessDescription error] ${res.status}:`, err);
      return { success: false, error: `Google API (${res.status}): ${err}` };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    console.warn('[GBP updateBusinessDescription exception]:', err.message);
    return { success: false, error: err.message };
  }
}

// ============================================
// PHOTOS & MEDIA
// ============================================

/**
 * Fetch all media items / photos for a location from Google My Business API v4
 */
export async function fetchLocationPhotos(refreshToken, accountId, locationId) {
  try {
    const token = await getAuthToken(refreshToken);
    const locId = locationId.replace('locations/', '');
    const accId = accountId.replace('accounts/', '');
    const url = `https://mybusiness.googleapis.com/v4/accounts/${accId}/locations/${locId}/media`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn(`[GBP fetchLocationPhotos error] ${res.status}:`, err);
      return [];
    }
    const data = await res.json();
    return data.mediaItems || [];
  } catch (err) {
    console.warn('[GBP fetchLocationPhotos exception]:', err.message);
    return [];
  }
}

/**
 * Upload a photo to a location
 */
export async function uploadPhoto(refreshToken, locationName, photoData) {
  const token = await getAuthToken(refreshToken);
  const locPath = locationName.startsWith('accounts/') ? locationName : locationName;

  const res = await fetch(`https://mybusiness.googleapis.com/v4/${locPath}/media`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mediaFormat: 'PHOTO',
      locationAssociation: {
        category: photoData.category || 'ADDITIONAL',
      },
      sourceUrl: photoData.url,
      description: photoData.description || '',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Media Error (${res.status}): ${errText}`);
  }

  return await res.json();
}

/**
 * List photos for a location
 */
export async function listPhotos(refreshToken, locationName) {
  try {
    const token = await getAuthToken(refreshToken);
    const res = await fetch(`https://mybusiness.googleapis.com/v4/${locationName}/media`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.mediaItems || [];
  } catch (err) {
    return [];
  }
}

/**
 * Delete a photo
 */
export async function deletePhoto(refreshToken, mediaName) {
  const token = await getAuthToken(refreshToken);
  const res = await fetch(`https://mybusiness.googleapis.com/v4/${mediaName}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return { success: res.ok };
}

// ============================================
// LOCAL POSTS (GOOGLE MEU NEGÓCIO)
// ============================================

/**
 * Fetch local posts for a location
 */
export async function fetchLocationPosts(refreshToken, accountId, locationId) {
  try {
    const token = await getAuthToken(refreshToken);
    const accId = accountId.replace('accounts/', '');
    const locId = locationId.replace('locations/', '');
    const url = `https://mybusiness.googleapis.com/v4/accounts/${accId}/locations/${locId}/localPosts`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.localPosts || [];
  } catch (err) {
    console.warn('[GBP fetchLocationPosts exception]:', err.message);
    return [];
  }
}

/**
 * Delete a local post
 */
export async function deleteLocalPost(refreshToken, postName) {
  const token = await getAuthToken(refreshToken);
  const res = await fetch(`https://mybusiness.googleapis.com/v4/${postName}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return { success: res.ok };
}

// ============================================
// PERFORMANCE / INSIGHTS
// ============================================

/**
 * Get performance metrics for a location
 */
export async function getPerformanceMetrics(refreshToken, locationName, startDate, endDate) {
  const auth = getAuthenticatedClient(refreshToken);
  const performance = google.businessprofileperformance({
    version: 'v1',
    auth,
  });

  try {
    // Fetch daily metric values
    const response = await performance.locations.fetchMultiDailyMetricsTimeSeries({
      location: locationName,
      dailyMetrics: [
        'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
        'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
        'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
        'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
        'CALL_CLICKS',
        'WEBSITE_CLICKS',
        'BUSINESS_DIRECTION_REQUESTS',
      ],
      'dailyRange.startDate.year': startDate.getFullYear(),
      'dailyRange.startDate.month': startDate.getMonth() + 1,
      'dailyRange.startDate.day': startDate.getDate(),
      'dailyRange.endDate.year': endDate.getFullYear(),
      'dailyRange.endDate.month': endDate.getMonth() + 1,
      'dailyRange.endDate.day': endDate.getDate(),
    });

    return response.data;
  } catch (error) {
    console.error('[GBP Service] Error fetching metrics:', error.message);
    return null;
  }
}

/**
 * Get search keywords for a location
 */
export async function getSearchKeywords(refreshToken, locationName, startDate, endDate) {
  const auth = getAuthenticatedClient(refreshToken);
  const performance = google.businessprofileperformance({
    version: 'v1',
    auth,
  });

  try {
    const response = await performance.locations.searchkeywords.impressions.monthly.list({
      parent: locationName,
      'monthlyRange.startMonth.year': startDate.getFullYear(),
      'monthlyRange.startMonth.month': startDate.getMonth() + 1,
      'monthlyRange.endMonth.year': endDate.getFullYear(),
      'monthlyRange.endMonth.month': endDate.getMonth() + 1,
    });

    return response.data.searchKeywordsCounts || [];
  } catch (error) {
    console.error('[GBP Service] Error fetching keywords:', error.message);
    return [];
  }
}

const DAY_MAP = {
  MONDAY: 'segunda',
  TUESDAY: 'terca',
  WEDNESDAY: 'quarta',
  THURSDAY: 'quinta',
  FRIDAY: 'sexta',
  SATURDAY: 'sabado',
  SUNDAY: 'domingo',
};

/**
 * Parse Google Location into structured database fields
 */
export function parseGoogleLocationDetails(loc, existingClient = {}, attributes = []) {
  const primaryCat = loc.categories?.primaryCategory?.displayName || existingClient.category || null;
  const secondaryCats = (loc.categories?.additionalCategories || [])
    .map((c) => c.displayName)
    .filter(Boolean);

  // Opening hours
  const defaultHours = {
    segunda: { open: '08:00', close: '18:00', closed: true },
    terca: { open: '08:00', close: '18:00', closed: true },
    quarta: { open: '08:00', close: '18:00', closed: true },
    quinta: { open: '08:00', close: '18:00', closed: true },
    sexta: { open: '08:00', close: '18:00', closed: true },
    sabado: { open: '08:00', close: '12:00', closed: true },
    domingo: { open: '08:00', close: '12:00', closed: true },
  };

  let openingHours = existingClient.opening_hours || defaultHours;
  if (loc.regularHours?.periods && Array.isArray(loc.regularHours.periods) && loc.regularHours.periods.length > 0) {
    openingHours = { ...defaultHours };
    for (const p of loc.regularHours.periods) {
      const day = DAY_MAP[p.openDay];
      if (day && p.openTime && p.closeTime) {
        const pad = (n) => String(n ?? 0).padStart(2, '0');
        openingHours[day] = {
          open: `${pad(p.openTime.hours)}:${pad(p.openTime.minutes)}`,
          close: `${pad(p.closeTime.hours)}:${pad(p.closeTime.minutes)}`,
          closed: false,
        };
      }
    }
  }

  // Social Links detection
  const currentSocial = existingClient.social_links || {};
  const socials = {
    whatsapp: currentSocial.whatsapp || '',
    instagram: currentSocial.instagram || '',
    facebook: currentSocial.facebook || '',
    linkedin: currentSocial.linkedin || '',
    youtube: currentSocial.youtube || '',
  };

  // 1. Highest Priority: Official Google Business Profile Attributes
  if (Array.isArray(attributes)) {
    for (const attr of attributes) {
      const uri = attr.uriValues?.[0]?.uri;
      if (!uri) continue;
      if (attr.name === 'attributes/url_instagram') socials.instagram = uri;
      else if (attr.name === 'attributes/url_facebook') socials.facebook = uri;
      else if (attr.name === 'attributes/url_linkedin') socials.linkedin = uri;
      else if (attr.name === 'attributes/url_youtube') socials.youtube = uri;
      else if (attr.name === 'attributes/url_whatsapp') socials.whatsapp = uri;
    }
  }

  // 2. Secondary fallback: detect from websiteUri
  const site = loc.websiteUri || existingClient.website || '';
  if (site) {
    if (site.includes('instagram.com/') && !socials.instagram) socials.instagram = site;
    if (site.includes('facebook.com/') && !socials.facebook) socials.facebook = site;
    if (site.includes('linkedin.com/') && !socials.linkedin) socials.linkedin = site;
    if ((site.includes('youtube.com/') || site.includes('youtu.be/')) && !socials.youtube) socials.youtube = site;
  }

  // 3. Fallback for WhatsApp from primaryPhone
  const phone = loc.phoneNumbers?.primaryPhone || existingClient.phone || '';
  const cleanPhone = phone.replace(/\D/g, '');
  if (!socials.whatsapp && cleanPhone.length === 11 && cleanPhone[2] === '9') {
    socials.whatsapp = phone;
  }

  // 4. Fallback: regex search inside business description
  const desc = loc.profile?.description || existingClient.description || '';
  if (!socials.whatsapp && desc) {
    const wa = desc.match(/(?:whatsapp|whats|zap)[^\d]*(\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4})/i);
    if (wa && wa[1]) socials.whatsapp = wa[1].trim();
  }
  if (!socials.instagram && desc) {
    const ig = desc.match(/(?:instagram(?:\.com\/|:\s*@?)|@)([a-zA-Z0-9._]{3,30})/i);
    if (ig && ig[1] && !['gmail', 'hotmail', 'outlook', 'yahoo', 'contato'].includes(ig[1].toLowerCase())) {
      socials.instagram = `https://instagram.com/${ig[1]}`;
    }
  }

  return {
    business_name: loc.title || existingClient.business_name,
    category: primaryCat,
    secondary_categories: secondaryCats.length > 0 ? secondaryCats : (existingClient.secondary_categories || []),
    description: loc.profile?.description ?? existingClient.description ?? '',
    phone: loc.phoneNumbers?.primaryPhone ?? existingClient.phone ?? '',
    website: loc.websiteUri ?? existingClient.website ?? '',
    address: loc.storefrontAddress || existingClient.address || {},
    opening_hours: openingHours,
    social_links: socials,
    // Google metadata (placeId, mapsUri, newReviewUri) - essential for review links
    google_place_id: loc.metadata?.placeId || existingClient.google_place_id || null,
    google_maps_uri: loc.metadata?.mapsUri || existingClient.google_maps_uri || null,
    google_new_review_uri: loc.metadata?.newReviewUri || existingClient.google_new_review_uri || null,
  };
}


