// =====================================================
// Geolocation Utilities
// Haversine formula and coordinate helpers
// =====================================================

/**
 * Calculate the Haversine distance between two points in meters.
 * This is the great-circle distance on the Earth's surface.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Average multiple geo samples into a single coordinate.
 * Returns the mean lat/lng and mean accuracy.
 */
export function averageSamples(
  samples: Array<{ latitude: number; longitude: number; accuracy: number }>
): { latitude: number; longitude: number; averageAccuracy: number; sampleCount: number } {
  if (samples.length === 0) {
    throw new Error('No samples to average');
  }

  const sum = samples.reduce(
    (acc, s) => ({
      lat: acc.lat + s.latitude,
      lng: acc.lng + s.longitude,
      acc: acc.acc + s.accuracy,
    }),
    { lat: 0, lng: 0, acc: 0 }
  );

  return {
    latitude: sum.lat / samples.length,
    longitude: sum.lng / samples.length,
    averageAccuracy: sum.acc / samples.length,
    sampleCount: samples.length,
  };
}

/**
 * Simple density-based clustering of coordinates.
 * Groups points that are within `radiusMeters` of each other.
 * Returns clusters sorted by size (largest first).
 */
export function clusterCoordinates(
  points: Array<{ latitude: number; longitude: number; id?: string }>,
  radiusMeters: number
): Array<{
  centroid: { latitude: number; longitude: number };
  members: typeof points;
  averageDistance: number;
}> {
  if (points.length === 0) return [];

  const visited = new Set<number>();
  const clusters: Array<typeof points> = [];

  for (let i = 0; i < points.length; i++) {
    if (visited.has(i)) continue;

    const cluster = [points[i]];
    visited.add(i);

    // Find all neighbors within radius
    const queue = [i];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (let j = 0; j < points.length; j++) {
        if (visited.has(j)) continue;
        const dist = haversineDistance(
          points[current].latitude,
          points[current].longitude,
          points[j].latitude,
          points[j].longitude
        );
        if (dist <= radiusMeters) {
          visited.add(j);
          cluster.push(points[j]);
          queue.push(j);
        }
      }
    }

    clusters.push(cluster);
  }

  // Compute centroids and sort by size
  return clusters
    .map((members) => {
      const avgLat = members.reduce((s, m) => s + m.latitude, 0) / members.length;
      const avgLng = members.reduce((s, m) => s + m.longitude, 0) / members.length;
      const centroid = { latitude: avgLat, longitude: avgLng };

      const avgDist =
        members.reduce(
          (s, m) => s + haversineDistance(centroid.latitude, centroid.longitude, m.latitude, m.longitude),
          0
        ) / members.length;

      return { centroid, members, averageDistance: avgDist };
    })
    .sort((a, b) => b.members.length - a.members.length);
}

/**
 * Format distance for display.
 */
export function formatDistance(meters: number): string {
  if (meters < 1) return '< 1 m';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
