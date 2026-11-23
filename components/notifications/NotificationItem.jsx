import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";

const INDIGO = colors.secondary ?? "#2E2A7E";
const VIOLET = colors.primary ?? "#5B4BDB";
const PINK = "#F0ABFC";
const LAVENDER = "#F0EEFF";
const LINE = "#E4E0F7";
const MUTED = "#6B6893";
const DANGER = colors.error ?? "#E11D48";

const TYPE_STYLES = {
  ride_published: { icon: "megaphone", color: INDIGO, bg: PINK },
  ride_accepted: { icon: "checkmark", color: "#FFFFFF", bg: VIOLET },
  ride_rejected: { icon: "close", color: DANGER, bg: "#FDE2E4" },
  payment_success: { icon: "card", color: "#FFFFFF", bg: INDIGO },
  payment_received: { icon: "card", color: "#FFFFFF", bg: INDIGO },
  payment_failed: { icon: "alert-circle", color: DANGER, bg: "#FDE2E4" },
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTime(d) {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${suffix}`;
}

export function timeAgo(iso) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 10) return "Now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function whenLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${formatTime(d)}`;
  }
  return `${WEEKDAYS[d.getDay()]}, ${formatTime(d)}`;
}

const lkr = (n) => `LKR ${Number(n).toLocaleString("en-US")}`;
const seatsLabel = (n) => `${n} seat${n === 1 ? "" : "s"}`;

function compactSubtitle(item) {
  if (item.type === "payment_received") return `From ${item.person} · ${whenLabel(item.createdAt)}`;
  if (item.type === "payment_success") return `${item.person} · ${whenLabel(item.createdAt)}`;
  if (item.route) {
    const day = whenLabel(item.createdAt).split(",")[0];
    return `${item.route.from} → ${item.route.to} · ${day}`;
  }
  return item.message;
}

function Icon({ type, size = 44 }) {
  const t = TYPE_STYLES[type] ?? TYPE_STYLES.ride_published;
  return (
    <View style={[styles.icon, { width: size, height: size, backgroundColor: t.bg }]}>
      <Ionicons name={t.icon} size={22} color={t.color} />
    </View>
  );
}

function ActionButtons({ item, handlers }) {
  if (item.type === "ride_rejected") {
    return (
      <TouchableOpacity
        style={[styles.btn, styles.btnFilled, { marginTop: 12 }]}
        onPress={() => handlers.onFindRide?.(item)}
      >
        <Text style={styles.btnFilledText}>Find another ride</Text>
      </TouchableOpacity>
    );
  }

  const secondary =
    item.type === "ride_published"
      ? { label: "Share", onPress: () => handlers.onShare?.(item) }
      : { label: "Message", onPress: () => handlers.onMessage?.(item) };

  return (
    <View style={styles.actions}>
      <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={secondary.onPress}>
        <Text style={styles.btnOutlineText}>{secondary.label}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btn, styles.btnFilled]}
        onPress={() => handlers.onViewRide?.(item)}
      >
        <Text style={styles.btnFilledText}>View ride</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function NotificationItem({ item, expanded, onPress, ...handlers }) {
  // Expanded card: ride notifications from today
  if (expanded && item.route) {
    const when = item.when ?? "Tomorrow";
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onPress?.(item)}
        style={[styles.card, styles.cardShadow]}
      >
        <View style={styles.headerRow}>
          <Icon type={item.type} />
          <View style={styles.headerText}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              <View style={styles.timeWrap}>
                {!item.isRead && <View style={styles.dot} />}
                <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
              </View>
            </View>
            <Text style={styles.message}>{item.message}</Text>
          </View>
        </View>

        <View style={styles.routeBox}>
          <View style={{ flex: 1 }}>
            <Text style={styles.route}>
              {item.route.from} → {item.route.to}
            </Text>
            <Text style={styles.routeMeta}>
              {seatsLabel(item.seats)} · {when}
            </Text>
          </View>
          <Text style={styles.price}>{lkr(item.amount)}</Text>
        </View>

        <ActionButtons item={item} handlers={handlers} />
      </TouchableOpacity>
    );
  }

  // Compact card
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress?.(item)}
      style={[styles.card, styles.compact]}
    >
      <Icon type={item.type} size={56} />
      <View style={styles.compactText}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.message} numberOfLines={1}>{compactSubtitle(item)}</Text>
      </View>
      {item.amount != null && item.type !== "payment_failed" && item.type.startsWith("payment") && (
        <Text style={styles.compactAmount}>{lkr(item.amount)}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: LINE,
    marginBottom: 12,
    padding: 16,
  },
  cardShadow: {
    shadowColor: INDIGO,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  compact: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  compactText: { flex: 1, marginLeft: 14 },
  compactAmount: { fontSize: 14, color: MUTED, marginLeft: 8 },

  icon: { borderRadius: 16, alignItems: "center", justifyContent: "center" },

  headerRow: { flexDirection: "row", alignItems: "flex-start" },
  headerText: { flex: 1, marginLeft: 14 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { flex: 1, fontSize: 18, fontWeight: "700", color: INDIGO },
  message: { fontSize: 14, color: MUTED, marginTop: 2, lineHeight: 20 },
  timeWrap: { flexDirection: "row", alignItems: "center", marginLeft: 8 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: VIOLET, marginRight: 6 },
  time: { fontSize: 14, color: MUTED },

  routeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LAVENDER,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 14,
  },
  route: { fontSize: 16, fontWeight: "600", color: "#1A1840" },
  routeMeta: { fontSize: 13, color: MUTED, marginTop: 3 },
  price: { fontSize: 20, fontWeight: "800", color: INDIGO, marginLeft: 8 },

  actions: { flexDirection: "row", gap: 12, marginTop: 12 },
  btn: { flex: 1, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  btnOutline: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: LINE },
  btnOutlineText: { fontSize: 16, fontWeight: "700", color: INDIGO },
  btnFilled: { backgroundColor: VIOLET },
  btnFilledText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
});
