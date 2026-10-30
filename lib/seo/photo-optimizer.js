import piexif from 'piexifjs';

export const BRAZIL_CITIES_COORDS = {
  // Principais capitais e cidades
  'curitiba': { lat: -25.4284, lng: -49.2733, state: 'PR' },
  'campina grande do sul': { lat: -25.3056, lng: -49.0558, state: 'PR' },
  'colombo': { lat: -25.2917, lng: -49.2242, state: 'PR' },
  'sao jose dos pinhais': { lat: -25.5347, lng: -49.2064, state: 'PR' },
  'araucaria': { lat: -25.5925, lng: -49.4103, state: 'PR' },
  'ponta grossa': { lat: -25.0994, lng: -50.1583, state: 'PR' },
  'londrina': { lat: -23.3045, lng: -51.1696, state: 'PR' },
  'maringa': { lat: -23.4205, lng: -51.9331, state: 'PR' },
  'cascavel': { lat: -24.9578, lng: -53.4595, state: 'PR' },
  'foz do iguacu': { lat: -25.5159, lng: -54.5854, state: 'PR' },
  
  'sao paulo': { lat: -23.5505, lng: -46.6333, state: 'SP' },
  'campinas': { lat: -22.9056, lng: -47.0608, state: 'SP' },
  'santos': { lat: -23.9608, lng: -46.3336, state: 'SP' },
  'sao bernardo do campo': { lat: -23.6944, lng: -46.5653, state: 'SP' },
  'santo andre': { lat: -23.6639, lng: -46.5383, state: 'SP' },
  'osasco': { lat: -23.5329, lng: -46.7920, state: 'SP' },
  'guarulhos': { lat: -23.4542, lng: -46.5337, state: 'SP' },
  'sorocaba': { lat: -23.5015, lng: -47.4587, state: 'SP' },
  'votorantim': { lat: -23.5412, lng: -47.4431, state: 'SP' },
  'passo fundo': { lat: -28.2628, lng: -52.4067, state: 'RS' },
  'barueri': { lat: -23.5110, lng: -46.8761, state: 'SP' },
  'santana de parnaiba': { lat: -23.4444, lng: -46.9178, state: 'SP' },
  'itapevi': { lat: -23.5489, lng: -46.9328, state: 'SP' },
  'cotia': { lat: -23.6039, lng: -46.9192, state: 'SP' },
  'jundiai': { lat: -23.1857, lng: -46.8978, state: 'SP' },
  'piracicaba': { lat: -22.7253, lng: -47.6492, state: 'SP' },
  'bauru': { lat: -22.3145, lng: -49.0587, state: 'SP' },
  'sao carlos': { lat: -22.0175, lng: -47.8908, state: 'SP' },
  'sao jose do rio preto': { lat: -20.8113, lng: -49.3758, state: 'SP' },
  'ribeirao preto': { lat: -21.1704, lng: -47.8103, state: 'SP' },
  'sao jose dos campos': { lat: -23.1791, lng: -45.8872, state: 'SP' },

  'rio de janeiro': { lat: -22.9068, lng: -43.1729, state: 'RJ' },
  'niteroi': { lat: -22.8859, lng: -43.1153, state: 'RJ' },
  'duque de caxias': { lat: -22.7856, lng: -43.3117, state: 'RJ' },
  'nova iguacu': { lat: -22.7564, lng: -43.4607, state: 'RJ' },

  'belo horizonte': { lat: -19.9167, lng: -43.9345, state: 'MG' },
  'uberlandia': { lat: -18.9186, lng: -48.2772, state: 'MG' },
  'contagem': { lat: -19.9386, lng: -44.0536, state: 'MG' },
  'juiz de fora': { lat: -21.7642, lng: -43.3497, state: 'MG' },

  'porto alegre': { lat: -30.0346, lng: -51.2177, state: 'RS' },
  'caxias do sul': { lat: -29.1678, lng: -51.1794, state: 'RS' },
  'canoas': { lat: -29.9177, lng: -51.1836, state: 'RS' },

  'florianopolis': { lat: -27.5954, lng: -48.5480, state: 'SC' },
  'joinville': { lat: -26.3045, lng: -48.8487, state: 'SC' },
  'blumenau': { lat: -26.9194, lng: -49.0661, state: 'SC' },

  'brasilia': { lat: -15.7975, lng: -47.8919, state: 'DF' },
  'goiania': { lat: -16.6869, lng: -49.2648, state: 'GO' },
  'salvador': { lat: -12.9777, lng: -38.5016, state: 'BA' },
  'fortaleza': { lat: -3.7172, lng: -38.5433, state: 'CE' },
  'recife': { lat: -8.0476, lng: -34.8770, state: 'PE' },
  'manaus': { lat: -3.1190, lng: -60.0217, state: 'AM' },
  'belem': { lat: -1.4558, lng: -48.5044, state: 'PA' },
  'cuiaba': { lat: -15.6010, lng: -56.0974, state: 'MT' },
  'campo grande': { lat: -20.4697, lng: -54.6201, state: 'MS' },
  'vitoria': { lat: -20.3155, lng: -40.3128, state: 'ES' },
  'natal': { lat: -5.7945, lng: -35.2110, state: 'RN' },
  'joao pessoa': { lat: -7.1153, lng: -34.8610, state: 'PB' },
  'maceio': { lat: -9.6658, lng: -35.7353, state: 'AL' },
  'teresina': { lat: -5.0920, lng: -42.8038, state: 'PI' },
  'sao luis': { lat: -2.5307, lng: -44.3068, state: 'MA' },
  'aracaju': { lat: -10.9472, lng: -37.0731, state: 'SE' },
};

function normalizeStr(str = '') {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Safely parse client address into structured object
 */
export function parseClientAddress(address) {
  if (!address) return { city: '', state: '', neighborhood: '', street: '', formatted: '' };
  let addrObj = address;
  if (typeof address === 'string') {
    try {
      addrObj = JSON.parse(address);
    } catch {
      addrObj = { formatted: address };
    }
  }

  const city = addrObj.locality || addrObj.city || '';
  const state = addrObj.administrativeArea || addrObj.state || '';
  const neighborhood = addrObj.sublocality || addrObj.neighborhood || '';
  const street = Array.isArray(addrObj.addressLines)
    ? addrObj.addressLines.join(', ')
    : (addrObj.addressLines || addrObj.street || '');
  const postalCode = addrObj.postalCode || addrObj.cep || '';

  const parts = [street, neighborhood, city, state].filter(Boolean);
  const formatted = addrObj.formatted || parts.join(' - ');

  return { city, state, neighborhood, street, postalCode, formatted, raw: addrObj };
}

/**
 * Get coordinates for a given city / address
 */
export function getCoordinatesForCity(cityName = '', stateName = '') {
  const normCity = normalizeStr(cityName);
  if (BRAZIL_CITIES_COORDS[normCity]) {
    return BRAZIL_CITIES_COORDS[normCity];
  }

  // Check if string contains known city
  for (const [key, coords] of Object.entries(BRAZIL_CITIES_COORDS)) {
    if (normCity.includes(key) || key.includes(normCity)) {
      return coords;
    }
  }

  // Default to Curitiba / Brazil fallback
  return { lat: -25.4284, lng: -49.2733, state: stateName || 'BR' };
}

/**
 * Generate SEO-optimized filename for Google Meu Negócio
 */
export function generateSeoFilename({
  businessName = '',
  category = '',
  city = '',
  photoType = 'foto',
  serviceName = '',
  originalFilename = 'imagem.jpg'
}) {
  const extMatch = originalFilename.match(/\.(jpg|jpeg|png|webp)$/i);
  const ext = extMatch ? extMatch[0].toLowerCase() : '.jpg';

  const parts = [
    businessName,
    serviceName || category,
    city,
    photoType
  ]
    .filter(Boolean)
    .map(p => normalizeStr(p).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    .filter(p => p.length > 0);

  const base = parts.join('-') || 'foto-google-meu-negocio';
  return `${base.slice(0, 80)}${ext}`;
}

/**
 * Generate rich Local SEO Alt Text
 */
export function generateSeoAltText({
  businessName = '',
  category = '',
  serviceName = '',
  city = '',
  photoCategory = 'PRODUCT'
}) {
  const categoryLabels = {
    'EXTERIOR': 'Fachada externa e entrada do estabelecimento',
    'INTERIOR': 'Ambiente interno e recepção confortável',
    'PRODUCT': 'Produtos e procedimentos especializados',
    'AT_WORK': 'Atendimento profissional e dedicação aos clientes',
    'TEAM': 'Equipe qualificada e profissionais especializados',
    'ADDITIONAL': 'Estrutura e atendimento com alto padrão',
  };

  const typeDesc = categoryLabels[photoCategory] || 'Atendimento e estrutura';
  const locationDesc = city ? `em ${city}` : 'com localização de fácil acesso';
  const nicheDesc = serviceName ? `${serviceName} - ${category}` : (category || 'Serviços especializados');

  return `${businessName} - ${nicheDesc} ${locationDesc} (${typeDesc})`;
}

/**
 * Inject EXIF Metadata (GPS, Description, Artist, Copyright, Keywords) into JPEG Data URL
 */
export function injectExifToDataUrl(jpegDataUrl, {
  lat,
  lng,
  altText = '',
  businessName = '',
  city = '',
  category = '',
}) {
  try {
    if (!jpegDataUrl || !jpegDataUrl.startsWith('data:image/jpeg')) {
      return jpegDataUrl; // Return as-is if not JPEG
    }

    const zeroth = {};
    const exif = {};
    const gps = {};

    // 0th IFD (Main Image Metadata)
    if (businessName) {
      zeroth[piexif.ImageIFD.Make] = businessName.slice(0, 60);
      zeroth[piexif.ImageIFD.Artist] = businessName.slice(0, 60);
      zeroth[piexif.ImageIFD.Copyright] = `© ${new Date().getFullYear()} ${businessName}. Todos os direitos reservados.`;
    }
    if (altText) {
      zeroth[piexif.ImageIFD.ImageDescription] = altText.slice(0, 200);
    }
    zeroth[piexif.ImageIFD.Software] = 'GBP Manager Local SEO Geo-tagger';

    // GPS IFD (Latitude & Longitude)
    if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
      gps[piexif.GPSIFD.GPSLatitudeRef] = lat >= 0 ? 'N' : 'S';
      gps[piexif.GPSIFD.GPSLatitude] = piexif.GPSHelper.degToDmsRational(Math.abs(lat));
      gps[piexif.GPSIFD.GPSLongitudeRef] = lng >= 0 ? 'E' : 'W';
      gps[piexif.GPSIFD.GPSLongitude] = piexif.GPSHelper.degToDmsRational(Math.abs(lng));
    }

    // EXIF IFD
    const tagsStr = [businessName, category, city, 'Google Meu Negócio', 'SEO Local'].filter(Boolean).join(', ');
    exif[piexif.ExifIFD.UserComment] = tagsStr;
    exif[piexif.ExifIFD.DateTimeOriginal] = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '').replace(/-/g, ':');

    const exifObj = { '0th': zeroth, 'Exif': exif, 'GPS': gps };
    const exifBytes = piexif.dump(exifObj);
    return piexif.insert(exifBytes, jpegDataUrl);
  } catch (err) {
    console.warn('[Photo Optimizer] EXIF insertion error, keeping original image:', err.message);
    return jpegDataUrl;
  }
}
