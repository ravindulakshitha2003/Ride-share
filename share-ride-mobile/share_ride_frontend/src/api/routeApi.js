
// const API_URL = "http://10.0.2.2:5000";
   const API_URL = "http://localhost:5000";

// Test the backend connection without publishing a ride.
export async function testBackendConnection() {
  try {
    console.log("Testing backend:", API_URL);

    const response = await fetch(`${API_URL}/routes`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    console.log("Backend GET status:", response.status);

    if (!response.ok) {
      throw new Error(`Backend returned HTTP ${response.status}`);
    }

    const routes = await response.json();

    console.log("Backend connection successful!");
    console.log("Routes received:", routes.length);

    return routes;
  } catch (error) {
    console.error("Backend connection test failed:", error.message);
    throw error;
  }
}

// Publish a ride.
export async function publishRide(rideData) {
  const url = `${API_URL}/routes`;

  console.log("Publishing RouteMate ride");
  console.log("API URL:", url);
  console.log("Ride data:", JSON.stringify(rideData, null, 2));

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rideData),
    });

    console.log("Backend HTTP status:", response.status);

    const responseText = await response.text();
    console.log("Backend response:", responseText);

    let result;

    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch {
      throw new Error(
        `Backend returned invalid JSON. HTTP ${response.status}`
      );
    }

    if (!response.ok) {
      throw new Error(
        result.message ||
          result.error ||
          `Request failed with HTTP ${response.status}`
      );
    }

    console.log("Ride published successfully:", result);
    return result;
  } catch (error) {
    console.error("Publish ride API error:", error.message);

    throw error;
  }
}

// Retrieve published rides.
export async function getRoutes() {
  return testBackendConnection();
}
