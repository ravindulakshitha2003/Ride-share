// =============================================================================
// Small formatting helpers used by the screens.
// =============================================================================

/** 1200 -> "1.2 km", 250 -> "250 m" */
export function formatDistance(meters) {
  if (meters === null || meters === undefined) return '-';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** 300 -> "5 min", 3900 -> "1 h 5 min" */
export function formatDuration(seconds) {
  if (!seconds) return '0 min';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

/** ISO date -> "just now", "5 min ago", "2 h ago", or a date */
export function timeAgo(isoDate) {
  const diffSeconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (diffSeconds < 60) return 'just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} min ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} h ago`;
  return new Date(isoDate).toLocaleDateString();
}

/** ISO date -> "19 Nov, 10:05" */
export function formatDateTime(isoDate) {
  return new Date(isoDate).toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** WALK_TO_ROUTE -> readable text for the driver */
export function describeMode(mode) {
  return mode === 'DRIVER_DETOUR' ? 'You drive to this point' : 'Passenger walks to your route';
}
