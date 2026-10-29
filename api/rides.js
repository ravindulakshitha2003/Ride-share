// The shared axios client (adds the token header and the server address)
import client from './client';

// TEMPORARY: true uses fake rides so the screens work without a backend (set to false when the Rides service is ready)
const USE_MOCK = true;
// Waits a moment so loading spinners are visible
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Fake drivers used to build fake rides
const DRIVERS = [
  { id: 'd1', name: 'Nimal Perera', rating: 4.9, ridesCount: 128, verified: true, vehicle: 'White Toyota Prius', hasAC: true },
  { id: 'd2', name: 'Kasun Fernando', rating: 4.7, ridesCount: 64, verified: true, vehicle: 'Silver Suzuki Alto', hasAC: false },
  { id: 'd3', name: 'Dilini Silva', rating: 4.8, ridesCount: 91, verified: true, vehicle: 'Blue Honda Vezel', hasAC: true },
  { id: 'd4', name: 'Ruwan Jayasinghe', rating: 4.6, ridesCount: 37, verified: true, vehicle: 'Black Nissan Sunny', hasAC: true },
  { id: 'd5', name: 'Amali Wickrama', rating: 5.0, ridesCount: 12, verified: true, vehicle: 'Red Toyota Aqua', hasAC: true },
];
// Fake departure times through the day
const DEPARTURES = ['06:30', '09:00', '12:15', '15:45', '18:30'];

// Add minutes to a time like "09:00" and return the new time like "11:30"
function addMinutes(time, minutes) {
  // Split "09:00" into hours and minutes
  const [h, m] = time.split(':').map(Number);
  // Total minutes since midnight after adding
  const total = h * 60 + m + minutes;
  // Back to hours (wrapping past midnight) and minutes
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  // Join them
  return `${hh}:${mm}`;
}

// Build a list of fake rides for the searched route
function buildMockRides({ from, to, date, passengers }) {
  // A number made from the city names, so the same route always gives the same fake prices
  const seed = from.length * 31 + to.length * 17;
  // Base fare per seat for this route
  const basePrice = 400 + (seed % 12) * 50;
  // Journey length in minutes
  const duration = 90 + (seed % 8) * 20;
  // Make one ride per departure time
  return DEPARTURES.map((time, i) => ({
    // A unique id for the ride
    id: `${from}-${to}-${date}-${i}`,
    // The driver for this ride
    driver: DRIVERS[i % DRIVERS.length],
    // The route and date searched
    from,
    to,
    date,
    // Times and journey length
    departureTime: time,
    arrivalTime: addMinutes(time, duration),
    durationMin: duration,
    // Fare per seat, rounded to the nearest Rs. 10 (BR-13)
    pricePerSeat: Math.round((basePrice + (i % 3) * 60 - 40) / 10) * 10,
    // Free seats (1 to 4)
    seatsFree: 1 + ((seed + i) % 4),
    // Show only rides that have enough seats for the passengers
  })).filter((ride) => ride.seatsFree >= passengers);
}

// Search for rides on a route (the Rides service endpoint will be agreed with the team)
export async function searchRides({ from, to, date, passengers }) {
  // Mock mode: return fake rides after a short wait
  if (USE_MOCK) {
    await wait(700);
    return buildMockRides({ from, to, date, passengers });
  }
  // Real mode: GET the matching rides from the backend
  const res = await client.get('/rides/search', { params: { from, to, date, seats: passengers } });
  // Accept either { rides: [...] } or a plain list
  return res.data.rides ?? res.data;
}

// Ask the driver to accept a booking (the seats are held only after the driver accepts)
export async function requestBooking({ rideId, seats }) {
  // Mock mode: pretend the request was sent
  if (USE_MOCK) {
    await wait(700);
    return { id: `b-${Date.now()}`, rideId, seats, status: 'Requested' };
  }
  // Real mode: POST the booking request to the backend
  const res = await client.post('/bookings', { rideId, seats });
  // Return the created booking
  return res.data.booking ?? res.data;
}