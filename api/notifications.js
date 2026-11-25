const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const ago = (ms) => new Date(Date.now() - ms).toISOString();

const mockNotifications = [
  {
    id: "n1",
    type: "ride_published",
    title: "Your ride is published",
    message: "Riders can now find it and send requests.",
    rideId: "r101",
    route: { from: "Colombo Fort", to: "Matara" },
    seats: 4,
    when: "Tomorrow, 7:30 AM",
    amount: 1800,
    isRead: false,
    createdAt: ago(1 * MIN),
  },
  {
    id: "n2",
    type: "ride_accepted",
    title: "Ride request accepted",
    message: "Nimal confirmed your seat. Pickup at 7:30 AM.",
    rideId: "r101",
    route: { from: "Colombo Fort", to: "Matara" },
    seats: 2,
    when: "Tomorrow",
    amount: 1800,
    person: "Nimal",
    isRead: false,
    createdAt: ago(2 * MIN),
  },
  {
    id: "n3",
    type: "ride_rejected",
    title: "Ride request rejected",
    message: "Kasun can’t take your request this time.",
    rideId: "r102",
    route: { from: "Colombo Fort", to: "Galle" },
    seats: 1,
    when: "Friday",
    amount: 1200,
    person: "Kasun",
    isRead: false,
    createdAt: ago(2 * HOUR),
  },
  {
    id: "n4",
    type: "ride_published",
    title: "Your ride is published",
    message: "Riders can now find it and send requests.",
    rideId: "r103",
    route: { from: "Colombo Fort", to: "Galle" },
    seats: 3,
    when: "Friday",
    amount: 1200,
    isRead: true,
    createdAt: ago(1 * DAY),
  },
  {
    id: "n5",
    type: "payment_success",
    title: "Payment successful",
    message: "You paid Nimal for Colombo Fort → Matara.",
    rideId: "r101",
    person: "Nimal",
    amount: 1800,
    isRead: true,
    createdAt: ago(1 * DAY + HOUR),
  },
  {
    id: "n6",
    type: "payment_received",
    title: "Payment received",
    message: "You received a payment from Dilani.",
    rideId: "r103",
    person: "Dilani",
    amount: 1200,
    isRead: true,
    createdAt: ago(3 * DAY),
  },
];

// Later, replace these bodies with real calls using ./client.js
export async function getNotifications() {
  return mockNotifications;
}

export async function markNotificationRead(id) {
  return { id, isRead: true };
}
