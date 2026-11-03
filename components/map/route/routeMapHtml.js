
function safeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function createRouteMapHtml(
  routes,
  selectedIndex,
  origin,
  destination
) {
  const routesJson = safeJson(routes);
  const originJson = safeJson(origin);
  const destinationJson = safeJson(destination);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport"
    content="width=device-width, initial-scale=1.0, maximum-scale=1.0">

  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />

  <style>
    html, body, #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
    }

    .leaflet-container {
      background: #EAF2F8;
    }
  </style>
</head>

<body>
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

  <script>
    const map = L.map("map", {
      zoomControl: true
    });

    L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
      }
    ).addTo(map);

    const routes = ${routesJson};
    const origin = ${originJson};
    const destination = ${destinationJson};

    let selectedIndex = ${selectedIndex};
    const routeLayers = [];

    function drawRoutes() {

      routeLayers.forEach(layer => {
        map.removeLayer(layer);
      });

      routeLayers.length = 0;

      // Draw alternative routes first
      routes.forEach((route, index) => {

        if (index === selectedIndex) return;

        const layer = L.geoJSON(route.geometry, {
          style: {
            color: "#E53935",
            weight: 6,
            opacity: 0.85
          }
        }).addTo(map);

        layer.on("click", () => {
          selectRoute(index);
        });

        routeLayers.push(layer);
      });

      // Draw selected route last so it stays visible
      const selectedRoute = routes[selectedIndex];

      if (selectedRoute) {

        const selectedLayer = L.geoJSON(
          selectedRoute.geometry,
          {
            style: {
              color: "#2563EB",
              weight: 7,
              opacity: 1
            }
          }
        ).addTo(map);

        selectedLayer.on("click", () => {
          selectRoute(selectedIndex);
        });

        routeLayers.push(selectedLayer);
      }
    }

    function selectRoute(index) {

      if (index < 0 || index >= routes.length) return;

      selectedIndex = index;

      drawRoutes();

      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: "routeSelected",
          index: index
        })
      );
    }

    // Pickup marker
    L.marker([
      origin.latitude,
      origin.longitude
    ])
      .addTo(map)
      .bindPopup("Pickup location");

    // Destination marker
    L.marker([
      destination.latitude,
      destination.longitude
    ])
      .addTo(map)
      .bindPopup("Destination");

    drawRoutes();

    // Fit map around every available route
    const allCoordinates = routes.flatMap(route =>
      route.geometry.coordinates.map(point => [
        point[1],
        point[0]
      ])
    );

    if (allCoordinates.length > 0) {
      map.fitBounds(allCoordinates, {
        padding: [35, 35]
      });
    }

    // Notify React Native that map is ready
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: "mapReady"
      })
    );

  </script>
</body>
</html>
`;
}
