import { useMemo, useState } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import NotificationItem from "../components/notifications/NotificationItem";
import { colors } from "../theme/colors";
import { useNotifications } from "../context/notificationContext";

const isToday = (iso) =>
  new Date(iso).toDateString() === new Date().toDateString();

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "payments", label: "Payments" },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, unreadCount, refresh, markRead, markAllRead } =
    useNotifications();

  const [filter, setFilter] = useState("all"); // "all" | "unread" | "payments"
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const sections = useMemo(() => {
    const visible =
      filter === "unread"
        ? notifications.filter((n) => !n.isRead)
        : filter === "payments"
        ? notifications.filter((n) => n.type.startsWith("payment_"))
        : notifications;

    return [
      { title: "Today", data: visible.filter((n) => isToday(n.createdAt)) },
      { title: "Earlier", data: visible.filter((n) => !isToday(n.createdAt)) },
    ].filter((section) => section.data.length > 0);
  }, [notifications, filter]);

  const handlePress = (item) => {
    markRead(item.id);
    // TODO: open ride details, e.g. router.push("/Rideinfoscreen")
  };

  const emptyMessage =
    filter === "unread"
      ? "You're all caught up"
      : filter === "payments"
      ? "No payment notifications"
      : "No notifications yet";

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.secondary} />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={styles.heading}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.subheading}>{unreadCount} unread</Text>
          )}
        </View>

        <TouchableOpacity onPress={markAllRead} disabled={unreadCount === 0}>
          <Text style={[styles.action, unreadCount === 0 && styles.actionOff]}>
            Read all
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <View style={styles.chips}>
        {FILTERS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.chip, filter === key && styles.chipActive]}
            onPress={() => setFilter(key)}
          >
            <Text
              style={[styles.chipText, filter === key && styles.chipTextActive]}
            >
              {label}
              {key === "unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem item={item} onPress={handlePress} />
        )}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons
              name="notifications-off-outline"
              size={48}
              color={colors.border}
            />
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerText: { flex: 1, marginLeft: 8 },
  heading: { fontSize: 22, fontWeight: "700", color: colors.secondary },
  subheading: { fontSize: 12, color: colors.primary, marginTop: 1 },
  action: { color: colors.primary, fontSize: 14, fontWeight: "600" },
  actionOff: { color: colors.border },

  chips: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.border,
    marginRight: 8,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, color: colors.secondary, fontWeight: "500" },
  chipTextActive: { color: colors.white },

  list: { paddingBottom: 24, flexGrow: 1 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text + "99",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  emptyWrap: { alignItems: "center", marginTop: 80 },
  emptyText: { marginTop: 12, color: colors.text + "80", fontSize: 14 },
});