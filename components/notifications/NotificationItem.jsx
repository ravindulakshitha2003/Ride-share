import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";

// Placeholder palette: swap for theme/colors.js values later
const TYPE_STYLES = {
  ride_accepted: { icon: "checkmark", color: "#16a34a", bg: "#dcfce7" },
  ride_rejected: { icon: "close", color: colors.error, bg: colors.error + "1A" }, //1A is 10% opacity
  ride_published: { icon: "car-sport", color: colors.primary, bg: colors.primary + "1A" },
  payment_success: { icon: "card", color: "#16a34a", bg: "#dcfce7" },
  payment_received: { icon: "cash", color: "#0d9488", bg: "#ccfbf1" },
  payment_failed: { icon: "alert-circle", color: "#d97706", bg: "#fef3c7" },
};

function timeAgo(iso) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function NotificationItem({ item, onPress }) {
  const type = TYPE_STYLES[item.type] ?? TYPE_STYLES.ride_published;

  const amountPrefix =
    item.type === "payment_received" ? "+" : item.type === "payment_success" ? "−" : "";

  return (
    <TouchableOpacity
      style={[styles.card, !item.isRead && styles.unreadCard]}
      onPress={() => onPress?.(item)}
      activeOpacity={0.8}
    >
      {!item.isRead && (
        <View style={[styles.accent, { backgroundColor: type.color }]} />
      )}

      <View style={[styles.iconWrap, { backgroundColor: type.bg }]}>
        <Ionicons name={type.icon} size={22} color={type.color} />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, !item.isRead && styles.titleUnread]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
        </View>

        <Text style={styles.message} numberOfLines={2}>
          {item.message}
        </Text>

        {item.amount != null && item.type !== "payment_failed" && (
          <Text style={[styles.amount, { color: type.color }]}>
            {amountPrefix} Rs. {item.amount.toLocaleString()}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    shadowColor: colors.secondary,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  unreadCard: { backgroundColor: colors.white, borderColor: colors.primary + "55" },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  accent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
  titleUnread: { fontWeight: "700" },
  amount: { fontSize: 15, fontWeight: "700", marginTop: 6 },

  content: { flex: 1, marginLeft: 12 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.text },
  time: { fontSize: 12, color: colors.text + "80", marginLeft: 8 },
  message: { fontSize: 13, color: colors.text + "B3", marginTop: 3, lineHeight: 18 },
});