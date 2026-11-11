import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Photon = free OpenStreetMap search. No API key.
const PHOTON_URL = "https://photon.komoot.io/api/";
// Sri Lanka bounding box: minLng,minLat,maxLng,maxLat. Remove "bbox" in the URL to search worldwide.
const SL_BBOX = "79.4,5.8,82.0,9.95";
const MIN_CHARS = 3;
const DEBOUNCE_MS = 400;

// Photon feature -> { id, name, detail, latitude, longitude }
function toPlace(feature) {
  const p = feature.properties || {};
  const [lng, lat] = feature.geometry.coordinates; // Photon is [lng, lat]
  const name = p.name || p.street || p.city || "Unnamed place";
  const detail = [p.district || p.city, p.state]
    .filter((v, i, arr) => v && v !== name && arr.indexOf(v) === i)
    .join(", ");
  return {
    id: `${p.osm_type}${p.osm_id}`,
    name,
    detail,
    latitude: lat,
    longitude: lng,
  };
}

/**
 * Props
 *  label        "Pickup" / "Destination"
 *  color        dot colour
 *  value        text shown in the box (owned by the parent)
 *  onChangeText called when the user types (parent should clear its coordinates)
 *  onSelect     called with { name, latitude, longitude } when a suggestion is tapped
 *  onPickMap    called when the pin button is tapped
 *  hasCoords    true when the parent has coordinates for the current text
 */
export default function PlaceInput({
  label,
  color = "#1F6FEB",
  value,
  onChangeText,
  onSelect,
  onPickMap,
  hasCoords,
}) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [focused, setFocused] = useState(false);

  const timer = useRef(null);
  const controller = useRef(null);
  const cache = useRef({});

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      controller.current?.abort();
    },
    []
  );

  function search(text) {
    clearTimeout(timer.current);
    controller.current?.abort();

    const q = text.trim();
    if (q.length < MIN_CHARS) {
      setResults([]);
      setLoading(false);
      setNoResults(false);
      return;
    }

    if (cache.current[q]) {
      setResults(cache.current[q]);
      setNoResults(cache.current[q].length === 0);
      setLoading(false);
      return;
    }

    timer.current = setTimeout(async () => {
      const c = new AbortController();
      controller.current = c;
      setLoading(true);
      try {
        const url = `${PHOTON_URL}?q=${encodeURIComponent(q)}&limit=6&lang=en&bbox=${SL_BBOX}`;
        const res = await fetch(url, { signal: c.signal });
        if (!res.ok) throw new Error(`Search error ${res.status}`);
        const data = await res.json();

        const seen = new Set();
        const places = (data.features || [])
          .map(toPlace)
          .filter((p) => (seen.has(p.id) ? false : seen.add(p.id)));

        cache.current[q] = places;
        setResults(places);
        setNoResults(places.length === 0);
      } catch (e) {
        if (e.name !== "AbortError") {
          console.log("[PlaceInput] search failed:", e.message);
          setResults([]);
          setNoResults(false);
        }
      } finally {
        if (!c.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
  }

  function handleChange(text) {
    onChangeText?.(text);
    search(text);
  }

  function handleSelect(place) {
    onSelect?.({
      name: place.name,
      latitude: place.latitude,
      longitude: place.longitude,
    });
    setResults([]);
    setNoResults(false);
    Keyboard.dismiss();
  }

  const showList = focused && (loading || results.length > 0 || noResults);

  return (
    <View>
      <View style={[styles.box, focused && { borderColor: color }]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <View style={styles.inputWrap}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            placeholder="Search a place"
            placeholderTextColor="#9AA7B4"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={color} style={styles.right} />
        ) : hasCoords ? (
          <Text style={styles.check}>✓</Text>
        ) : null}

        <TouchableOpacity
          style={styles.pinBtn}
          onPress={onPickMap}
          accessibilityRole="button"
          accessibilityLabel={`Pick ${label} on map`}
        >
          <Text style={styles.pin}>📍</Text>
        </TouchableOpacity>
      </View>

      {showList && (
        <View style={styles.list}>
          {loading && results.length === 0 && (
            <Text style={styles.hint}>Searching...</Text>
          )}
          {noResults && !loading && (
            <Text style={styles.hint}>No places found. Try another name or use the map.</Text>
          )}
          {results.map((p, i) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.item, i > 0 && styles.itemBorder]}
              onPress={() => handleSelect(p)}
              activeOpacity={0.7}
            >
              <Text style={styles.itemName} numberOfLines={1}>
                {p.name}
              </Text>
              {!!p.detail && (
                <Text style={styles.itemDetail} numberOfLines={1}>
                  {p.detail}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E3E9EF",
    paddingLeft: 14,
    paddingRight: 6,
    minHeight: 58,
  },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  inputWrap: { flex: 1, paddingVertical: 6 },
  label: { fontSize: 11, fontWeight: "600", color: "#6B7B8C" },
  input: { fontSize: 16, fontWeight: "600", color: "#12263A", paddingVertical: 2 },
  right: { marginRight: 6 },
  check: { color: "#1F9D63", fontSize: 16, fontWeight: "800", marginRight: 6 },
  pinBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  pin: { fontSize: 18 },

  list: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E3E9EF",
    marginTop: 6,
    overflow: "hidden",
  },
  hint: { padding: 14, fontSize: 13, color: "#6B7B8C" },
  item: { paddingVertical: 11, paddingHorizontal: 14 },
  itemBorder: { borderTopWidth: 1, borderTopColor: "#EEF2F6" },
  itemName: { fontSize: 15, fontWeight: "700", color: "#12263A" },
  itemDetail: { fontSize: 12, color: "#6B7B8C", marginTop: 2 },
});
