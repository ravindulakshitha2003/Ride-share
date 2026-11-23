// =============================================================================
// Booking API client
// All HTTP calls to the booking service live here. Screens never call fetch()
// directly - they call these functions. Benefits:
//   - if a URL changes, fix it in one place
//   - when you add JWT login, add the token in ONE place (authHeaders below)
// =============================================================================

import { API_BASE_URL, DEV_DRIVER_ID } from '../config/bookingConfig';

const BOOKINGS_URL = `${API_BASE_URL}/bookings`;
const TIMEOUT_MS = 10000;

/**
 * Error thrown when the server answers with success: false.
 * `status` (HTTP code) and `code` (e.g. 'NOT_ENOUGH_SEATS') let screens react
 * differently, e.g. 409 -> "someone changed this booking, refreshing...".
 */
export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Later: return { Authorization: `Bearer ${token}` } instead.
function authHeaders() {
  return { 'x-driver-id': DEV_DRIVER_ID };
}

/**
 * One generic request helper used by every function below.
 * Handles: JSON, timeouts, network errors and the { success, data } envelope.
 */
async function request(path, { method = 'GET', body } = {}) {
  // AbortController lets us give up if the server does not answer in time.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${BOOKINGS_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...authHeaders(),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    // No response at all: wrong IP, server off, no internet, or timeout.
    throw new ApiError(
      error.name === 'AbortError'
        ? 'The server took too long to respond.'
        : 'Cannot reach the server. Check your connection.',
      0,
      'NETWORK_ERROR',
    );
  } finally {
    clearTimeout(timer);
  }

  // Server answered. Try to read JSON (it might be HTML if something is wrong).
  let json = null;
  try {
    json = await response.json();
  } catch {
    // ignore - handled below
  }

  if (!response.ok || !json?.success) {
    throw new ApiError(
      json?.message || `Request failed (${response.status})`,
      response.status,
      json?.code,
    );
  }

  return json.data;
}

// ---------------------------------------------------------------------------
// Functions used by the screens
// ---------------------------------------------------------------------------

/** D1: list requests. status defaults to PENDING on the server. */
export function getIncomingRequests({ status = 'PENDING', rideId } = {}) {
  const params = new URLSearchParams({ status });
  if (rideId) params.append('rideId', rideId);
  return request(`/driver/requests?${params.toString()}`);
}

/** D2: one request with full details, history and allowedActions. */
export function getRequestDetails(bookingId) {
  return request(`/driver/requests/${bookingId}`);
}

export function acceptRequest(bookingId) {
  return request(`/${bookingId}/accept`, { method: 'PATCH' });
}

export function rejectRequest(bookingId, reason) {
  return request(`/${bookingId}/reject`, { method: 'PATCH', body: { reason: reason || null } });
}

export function cancelBookingAsDriver(bookingId, reason) {
  return request(`/${bookingId}/cancel`, { method: 'PATCH', body: { reason: reason || null } });
}

export function completeBooking(bookingId) {
  return request(`/${bookingId}/complete`, { method: 'PATCH' });
}
