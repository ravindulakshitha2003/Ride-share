// Short day names, indexed by JavaScript's getDay() (0 = Sunday)
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Short month names, indexed by getMonth() (0 = January)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Turn a Date into text like "2026-10-27" using the phone's local date (not UTC, which can be a day off)
export function formatDate(d) {
  // Four-digit year
  const y = d.getFullYear();
  // Month number (0-11 in JavaScript, so add 1) with a leading zero
  const m = String(d.getMonth() + 1).padStart(2, '0');
  // Day of the month with a leading zero
  const day = String(d.getDate()).padStart(2, '0');
  // Join them in YYYY-MM-DD order
  return `${y}-${m}-${day}`;
}

// A Date for today at midnight, used to stop people choosing a date in the past
export function startOfToday() {
  // Now
  const d = new Date();
  // Reset the time part to 00:00:00
  d.setHours(0, 0, 0, 0);
  // Give it back
  return d;
}

// Turn a Date into friendly text: "Today", "Tomorrow", or something like "Tue, 3 Nov"
export function friendlyDate(d) {
  // Compare as YYYY-MM-DD text so the time of day does not matter
  const key = formatDate(d);
  // Today at midnight
  const today = startOfToday();
  // Same day as today
  if (key === formatDate(today)) return 'Today';
  // Build tomorrow's date
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  // Same day as tomorrow
  if (key === formatDate(tomorrow)) return 'Tomorrow';
  // Otherwise show day name, day number and month name
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

// Turn minutes into text like "2h 30m"
export function formatDuration(min) {
  // Whole hours
  const h = Math.floor(min / 60);
  // Minutes left over
  const m = min % 60;
  // Under an hour: just minutes
  if (h === 0) return `${m}m`;
  // Whole hours only
  if (m === 0) return `${h}h`;
  // Hours and minutes
  return `${h}h ${m}m`;
}