/**
 * Geo-Grid Generator for Local SEO Rank Tracking
 * Generates an NxN matrix of equidistant coordinates around a central location.
 */

const EARTH_RADIUS_KM = 6371.0;
const KM_PER_LAT_DEGREE = 111.32;

/**
 * Convert degrees to radians
 */
function degToRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Calculate distance in km between two lat/lng points using Haversine formula
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const dLat = degToRad(lat2 - lat1);
  const dLon = degToRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degToRad(lat1)) * Math.cos(degToRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Get cardinal direction string from dx (east/west) and dy (north/south)
 */
export function getCardinalDirection(dx, dy) {
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.1) return 'Centro';

  // Angle in degrees from North (0 to 360)
  let angle = Math.atan2(dx, dy) * (180 / Math.PI);
  if (angle < 0) angle += 360;

  if (angle >= 337.5 || angle < 22.5) return 'Norte';
  if (angle >= 22.5 && angle < 67.5) return 'Nordeste (NE)';
  if (angle >= 67.5 && angle < 112.5) return 'Leste (L)';
  if (angle >= 112.5 && angle < 157.5) return 'Sudeste (SE)';
  if (angle >= 157.5 && angle < 202.5) return 'Sul (S)';
  if (angle >= 202.5 && angle < 247.5) return 'Sudoeste (SO)';
  if (angle >= 247.5 && angle < 292.5) return 'Oeste (O)';
  return 'Noroeste (NO)';
}

/**
 * Generate an NxN grid of coordinates around a central lat/lng
 * @param {Object} options
 * @param {number} options.centerLat - Latitude of the business center
 * @param {number} options.centerLng - Longitude of the business center
 * @param {number} [options.gridSize=5] - Number of points per axis (3 = 9pts, 5 = 25pts, 7 = 49pts)
 * @param {number} [options.radiusKm=3] - Radius in kilometers from center to edge
 * @returns {Array<Object>} List of grid points with lat, lng, row, col, distanceKm, direction
 */
export function generateGeoGrid({ centerLat, centerLng, gridSize = 5, radiusKm = 3 }) {
  if (!centerLat || !centerLng) {
    throw new Error('Coordenadas centrais (centerLat e centerLng) são obrigatórias.');
  }

  const validSizes = [3, 5, 7];
  const size = validSizes.includes(Number(gridSize)) ? Number(gridSize) : 5;
  const radius = Math.max(0.5, Math.min(25, Number(radiusKm) || 3));

  const points = [];
  const stepKm = (2 * radius) / (size - 1);
  const cosLat = Math.cos(degToRad(centerLat));
  const kmPerLngDegree = KM_PER_LAT_DEGREE * (cosLat === 0 ? 0.0001 : cosLat);

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      // Row 0 is North (+radius), Row (size-1) is South (-radius)
      const dy = radius - row * stepKm;
      // Col 0 is West (-radius), Col (size-1) is East (+radius)
      const dx = -radius + col * stepKm;

      const lat = Number((centerLat + dy / KM_PER_LAT_DEGREE).toFixed(6));
      const lng = Number((centerLng + dx / kmPerLngDegree).toFixed(6));
      const distanceKm = Number(Math.sqrt(dx * dx + dy * dy).toFixed(2));
      const direction = getCardinalDirection(dx, dy);

      points.push({
        id: `pt_${row}_${col}`,
        row,
        col,
        lat,
        lng,
        dxKm: Number(dx.toFixed(2)),
        dyKm: Number(dy.toFixed(2)),
        distanceKm,
        direction,
        isCenter: row === Math.floor(size / 2) && col === Math.floor(size / 2),
      });
    }
  }

  return {
    gridSize: size,
    totalPoints: points.length,
    radiusKm: radius,
    center: {
      lat: Number(centerLat),
      lng: Number(centerLng),
    },
    stepKm: Number(stepKm.toFixed(2)),
    points,
  };
}
