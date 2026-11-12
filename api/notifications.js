const DAY = 24 * 60 * 60 * 1000;

const mockNotifications = [
  {
    id: "n1",
    type: "ride_accepted",
    title: "Ride accepted",
    message: "Your request for Kandy → Colombo was accepted.",
    rideId: "r101",
    isRead: false,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: "n2",
    type: "ride_rejected",
    title: "Ride rejected",
    message: "Your request for Kandy → Galle was rejected.",
    rideId: "r102",
    isRead: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "n3",
    type: "ride_published",
    title: "Ride published",
    message: "Your ride Kandy → Jaffna is now live.",
    rideId: "r103",
    isRead: true,
    createdAt: new Date(Date.now() - 1 * DAY).toISOString(),
  },
  {
    id: "n4",
    type: "ride_accepted",
    title: "Ride accepted",
    message: "Your request for Colombo → Negombo was accepted.",
    rideId: "r104",
    isRead: true,
    createdAt: new Date(Date.now() - 3 * DAY).toISOString(),
  },

    {
    id: "n5",
    type: "payment_success",
    title: "Payment successful",
    message: "You paid Rs. 1,500 for Kandy → Colombo.",
    amount: 1500,
    rideId: "r101",
    isRead: false,
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  },
  {
    id: "n6",
    type: "payment_received",
    title: "Payment received",
    message: "You received Rs. 1,500 from Nimal for Kandy → Colombo.",
    amount: 1500,
    rideId: "r101",
    isRead: false,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "n7",
    type: "payment_failed",
    title: "Payment failed",
    message: "Your payment for Kandy → Galle could not be completed.",
    amount: 1500,
    rideId: "r102",
    isRead: true,
    createdAt: new Date(Date.now() - 2 * DAY).toISOString(),
  },
];

// Later, replace these bodies with real calls using ./client.js
export async function getNotifications() {
  return mockNotifications;
}

export async function markNotificationRead(id) {
  return { id, isRead: true };
}