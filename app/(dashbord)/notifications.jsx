import { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SectionList,
  StyleSheet,
  Share,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import NotificationItem from "../../components/notifications/NotificationItem";
import { useNotifications } from "../../context/notificationContext";
import { colors } from "../../theme/colors";

const INDIGO = colors.secondary ?? "#2E2A7E";
const VIOLET = colors.primary ?? "#5B4BDB";
const BG = "#F7F5FF";
const TAB_BG = "#EDEAFD";
const MUTED = "#6B6893";

const TABS = [
  { key: "all", label: "All" },
  { key: "rides", label: "Rides" },
  { key: "payments", label: "Payments" },
];

const isToday = (iso) => new Date(iso).toDateString() === new Date().toDateString();

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, markRead, markAllRead } = useNotifications();
  const [tab, setTab] = useState("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const handleConfirm = () => {
    markAllRead();
    setConfirmOpen(false);
  };

  const unreadByTab = useMemo(
    () => ({
      all: 0,
      rides: notifications.filter((n) => !n.isRead && n.type.startsWith("ride_")).length,
      payments: notifications.filter((n) => !n.isRead && n.type.startsWith("payment_")).length,
    }),
    [notifications]
  );

  const sections = useMemo(() => {
    const filtered = notifications
      .filter((n) => {
        if (tab === "rides") return n.type.startsWith("ride_");
        if (tab === "payments") return n.type.startsWith("payment_");
        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const today = filtered.filter((n) => isToday(n.createdAt));
    const earlier = filtered.filter((n) => !isToday(n.createdAt));

    return [
      { title: "TODAY", data: today },
      { title: "EARLIER", data: earlier },
    ].filter((s) => s.data.length > 0);
  }, [notifications, tab]);

  const openRide = (item) => {
    markRead(item.id);
    if (item.rideId) {
      router.push({ pathname: "/rideDetailsScreen", params: { id: item.rideId } });
    }
  };

  const handleShare = async (item) => {
    try {
      await Share.share({
        message: `Ride ${item.route.from} → ${item.route.to} (${item.when ?? ""}) is live. Find it on Ride-share!`,
      });
    } catch (e) {
      console.warn("Share failed:", e.message);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1A1840" />
        </TouchableOpacity>
      </View>

      <View style={styles.headingRow}>
        <Text style={styles.heading}>Notifications</Text>
        <TouchableOpacity
          style={styles.cleanBtn}
          onPress={() => setConfirmOpen(true)}
          hitSlop={10}
          accessibilityLabel="Mark all as read"
        >
          <MaterialCommunityIcons name="broom" size={22} color={INDIGO} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => {
          const active = tab === t.key;
          const count = unreadByTab[t.key];
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              {count > 0 && (
                <View style={[styles.pill, active && styles.pillActive]}>
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>
                    {count > 99 ? "99+" : count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        renderItem={({ item, section }) => (
          <NotificationItem
            item={item}
            expanded={section.title === "TODAY"}
            onPress={(n) => markRead(n.id)}
            onViewRide={openRide}
            onShare={handleShare}
            onMessage={(n) => markRead(n.id)}
            onFindRide={() => router.push("/")}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No notifications yet</Text>}
      />

      <Modal
        visible={confirmOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setConfirmOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setConfirmOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Mark all as read?</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setConfirmOpen(false)}
              hitSlop={10}
            >
              <Ionicons name="close" size={18} color="#1A1840" />
            </TouchableOpacity>
          </View>
          <Text style={styles.sheetText}>This action cannot be undone</Text>
          <View style={styles.sheetDivider} />
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmText}>Confirm</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmOpen(false)}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E0F7",
    alignItems: "center",
    justifyContent: "center",
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 14,
  },
  heading: { fontSize: 34, fontWeight: "800", color: INDIGO },
  cleanBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TAB_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { fontSize: 22, fontWeight: "700", color: "#1A1840" },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F0EEFF",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetText: { fontSize: 16, color: MUTED, marginTop: 14, marginBottom: 24 },
  sheetDivider: { height: 1, backgroundColor: "#EEEBFA", marginHorizontal: -20, marginBottom: 20 },
  confirmBtn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: VIOLET,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  cancelBtn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F2F1F7",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  cancelText: { fontSize: 17, fontWeight: "600", color: "#1A1840" },
  tabs: {
    flexDirection: "row",
    backgroundColor: TAB_BG,
    borderRadius: 20,
    padding: 4,
    marginHorizontal: 20,
  },
  tab: {
    flex: 1,
    height: 42,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    marginLeft: 6,
    backgroundColor: VIOLET,
    alignItems: "center",
    justifyContent: "center",
  },
  pillActive: { backgroundColor: "#FFFFFF" },
  pillText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  pillTextActive: { color: INDIGO },
  tabActive: { backgroundColor: INDIGO },
  tabText: { fontSize: 16, fontWeight: "500", color: MUTED },
  tabTextActive: { color: "#FFFFFF", fontWeight: "700" },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: MUTED,
    marginTop: 22,
    marginBottom: 12,
  },
  empty: { textAlign: "center", color: MUTED, marginTop: 40, fontSize: 15 },
});
