import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNotifications } from '../../hooks/useNotifications'; // Adjust path if needed

/* =======================================================
   DESIGN TOKENS (From ResultsScreen)
======================================================= */
const C = {
  primary: '#5B4BDB',
  secondary: '#312E81',
  accent: '#F0ABFC',
  background: '#F8F7FF',
  text: '#24213B',
  textMuted: 'rgba(36,33,59,0.6)',
  white: '#FFFFFF',
  border: '#E4E1F5',
  tint: '#EEEBFF',
  gradientEnd: '#E9E4FF',
  line: '#CFC9F5',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  success: '#16A34A',
  successSoft: '#E8F7EE',
  amber: '#B45309',
  amberSoft: '#FEF3C7',
  greySoft: '#F6F5FC',
  grey: '#6B7280',
};

const R = { sm: 12, md: 16, lg: 20, xl: 24, pill: 999 };
const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 };
const MAX_W = 560;

const SHADOW = Platform.select({
  ios: {
    shadowColor: C.primary,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  android: { elevation: 4, shadowColor: C.primary },
  default: {},
});

/* =======================================================
   ANIMATION PRESSABLE
======================================================= */
function PressScale({ onPress, disabled, style, children }) {
  const scale = useRef(new Animated.Value(1)).current;

  function animateTo(value) {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => animateTo(0.97)}
      onPressOut={() => animateTo(1)}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

function timeAgo(dateString) {
  if (!dateString) return '';
  const diffSec = Math.floor((new Date() - new Date(dateString)) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return new Date(dateString).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
}

function getEventMeta(type) {
  switch (type) {
    case 'ride.published':
      return {
        icon: 'car-clock',
        tag: 'Ride Published',
        tone: { bg: C.successSoft, fg: C.success },
      };
    case 'booking.created':
    case 'booking.confirmed':
      return {
        icon: 'seat-passenger',
        tag: 'Booking Alert',
        tone: { bg: C.tint, fg: C.primary },
      };
    case 'ride.cancelled':
      return {
        icon: 'alert-circle-outline',
        tag: 'Cancelled',
        tone: { bg: C.dangerSoft, fg: C.danger },
      };
    default:
      return {
        icon: 'bell-ring-outline',
        tag: 'Update',
        tone: { bg: C.amberSoft, fg: C.amber },
      };
  }
}

/* =======================================================
   NOTIFICATION CARD WITH "SEE MORE"
======================================================= */
function NotificationCard({ item, onMarkAsRead, onNavigateDetails }) {
  const [expanded, setExpanded] = useState(false);
  const isUnread = !item.readAt;
  const meta = getEventMeta(item.type);
  const { origin, destination, rideId } = item.data || {};

  const handleToggle = () => {
    if (isUnread) onMarkAsRead(item._id);
    setExpanded((prev) => !prev);
  };

  return (
    <View style={[styles.card, isUnread && styles.cardUnread]}>
      {/* Top Row: 44px Icon + Type Pill + Time */}
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: meta.tone.bg }]}>
          <Icon name={meta.icon} size={22} color={meta.tone.fg} />
        </View>

        <View style={styles.headerInfo}>
          <View style={styles.pillRow}>
            <View style={[styles.pill, { backgroundColor: meta.tone.bg }]}>
              <Text style={[styles.pillText, { color: meta.tone.fg }]}>
                {meta.tag}
              </Text>
            </View>
            {isUnread && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
          </View>
          <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={[styles.cardTitle, isUnread && styles.cardTitleUnread]}>
        {item.title}
      </Text>

      {/* See More Button */}
      <Pressable onPress={handleToggle} style={styles.seeMoreRow}>
        <Text style={styles.seeMoreText}>
          {expanded ? 'Show less' : 'See more'}
        </Text>
        <Icon
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={C.primary}
        />
      </Pressable>

      {/* Expanded First-Style Content */}
      {expanded && (
        <View style={styles.expandedSection}>
          <Text style={styles.cardBody}>{item.body}</Text>

          {/* Route Stop Visualizer */}
          {origin && destination && (
            <View style={styles.routeBox}>
              <View style={styles.routeHeader}>
                <Icon name="map-marker-path" size={16} color={C.primary} />
                <Text style={styles.routeHeaderTitle}>Route Details</Text>
              </View>

              <View style={styles.stopRow}>
                <View style={styles.dotFrom} />
                <Text style={styles.stopText} numberOfLines={1}>
                  {origin}
                </Text>
              </View>

              <View style={styles.timelineLine} />

              <View style={styles.stopRow}>
                <Icon name="map-marker" size={16} color={C.danger} />
                <Text style={styles.stopText} numberOfLines={1}>
                  {destination}
                </Text>
              </View>
            </View>
          )}

          {/* Action Button */}
          {rideId ? (
            <View style={styles.footerRow}>
              <PressScale
                onPress={() => onNavigateDetails(rideId)}
                style={styles.actionBtn}
              >
                <Text style={styles.actionBtnText}>View Ride Details</Text>
                <Icon name="arrow-right" size={15} color={C.white} />
              </PressScale>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const MemoNotificationCard = memo(NotificationCard);

/* =======================================================
   MAIN SCREEN
======================================================= */
export default function NotificationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filterMode, setFilterMode] = useState('all');

  const {
    notifications,
    unreadCount,
    loading,
    refreshing,
    refresh,
    markAsRead,
    markAllAsRead,
  } = useNotifications(12000);

  const displayedList = useMemo(() => {
    if (filterMode === 'unread') {
      return notifications.filter((n) => !n.readAt);
    }
    return notifications;
  }, [notifications, filterMode]);

  const handleNavigateRide = useCallback(
    (rideId) => {
      router.push({
        pathname: '/ride-details',
        params: { rideId: String(rideId) },
      });
    },
    [router]
  );

  const renderHeader = (
    <View style={styles.header}>
      <View style={styles.headerTopBar}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.screenHeading}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 && (
          <PressScale onPress={markAllAsRead} style={styles.markAllBtn}>
            <Icon name="check-all" size={16} color={C.primary} />
            <Text style={styles.markAllText}>Mark all read</Text>
          </PressScale>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsWrap}>
        <Pressable
          onPress={() => setFilterMode('all')}
          style={[styles.tab, filterMode === 'all' && styles.tabActive]}
        >
          <Text
            style={[
              styles.tabText,
              filterMode === 'all' && styles.tabTextActive,
            ]}
          >
            All ({notifications.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setFilterMode('unread')}
          style={[styles.tab, filterMode === 'unread' && styles.tabActive]}
        >
          <Text
            style={[
              styles.tabText,
              filterMode === 'unread' && styles.tabTextActive,
            ]}
          >
            Unread ({unreadCount})
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={[C.background, C.gradientEnd]} style={styles.container}>
      {/* Background glow orbs */}
      <View pointerEvents="none" style={styles.glowA} />
      <View pointerEvents="none" style={styles.glowB} />

      <SafeAreaView style={styles.container}>
        <FlatList
          data={displayedList}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <MemoNotificationCard
              item={item}
              onMarkAsRead={markAsRead}
              onNavigateDetails={handleNavigateRide}
            />
          )}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 110 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={C.primary}
              colors={[C.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator
                size="large"
                color={C.primary}
                style={{ marginTop: 40 }}
              />
            ) : (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIconCircle}>
                  <Icon name="bell-off-outline" size={40} color={C.primary} />
                </View>
                <Text style={styles.emptyHeading}>No notifications</Text>
                <Text style={styles.emptySubheading}>
                  You're all caught up! You'll receive updates here when rides are published or booked.
                </Text>
              </View>
            )
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

/* =======================================================
   STYLES (Balanced Normal Size)
======================================================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  glowA: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: C.accent,
    opacity: 0.25,
  },
  glowB: {
    position: 'absolute',
    bottom: 80,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: C.primary,
    opacity: 0.1,
  },
  listContent: {
    width: '100%',
    maxWidth: MAX_W,
    alignSelf: 'center',
    paddingHorizontal: SP.xl,
    paddingTop: SP.md,
    flexGrow: 1,
  },
  header: {
    marginBottom: SP.lg,
  },
  headerTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SP.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  screenHeading: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
  },
  headerBadge: {
    backgroundColor: C.primary,
    borderRadius: R.pill,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: SP.sm,
  },
  headerBadgeText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '800',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.tint,
    borderRadius: R.pill,
    paddingHorizontal: SP.md,
    paddingVertical: 7,
  },
  markAllText: {
    color: C.primary,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  tabsWrap: {
    flexDirection: 'row',
    backgroundColor: C.tint,
    borderRadius: R.pill,
    padding: 4,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: R.pill,
  },
  tabActive: {
    backgroundColor: C.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.secondary,
  },
  tabTextActive: {
    color: C.white,
  },

  /* Card */
  card: {
    backgroundColor: C.white,
    borderRadius: R.lg,
    padding: SP.xl,
    marginBottom: SP.md,
    borderWidth: 1,
    borderColor: C.border,
    ...SHADOW,
  },
  cardUnread: {
    backgroundColor: '#FAF9FF',
    borderColor: C.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SP.sm,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: SP.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    borderRadius: R.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  newBadge: {
    backgroundColor: C.primary,
    borderRadius: R.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  newBadgeText: {
    color: C.white,
    fontSize: 10,
    fontWeight: '800',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textMuted,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginTop: 2,
  },
  cardTitleUnread: {
    fontWeight: '800',
    color: C.secondary,
  },

  /* See More Toggle */
  seeMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: SP.sm,
    paddingVertical: 2,
  },
  seeMoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
    marginRight: 4,
  },

  /* Expanded Section */
  expandedSection: {
    marginTop: SP.md,
    paddingTop: SP.md,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 21,
    color: C.textMuted,
  },

  /* Route details snippet */
  routeBox: {
    backgroundColor: C.greySoft,
    borderRadius: R.md,
    padding: SP.md,
    marginTop: SP.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  routeHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: C.primary,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotFrom: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: C.primary,
    backgroundColor: C.white,
    marginLeft: 3,
    marginRight: 3,
  },
  stopText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
    marginLeft: 6,
    flex: 1,
  },
  timelineLine: {
    width: 2,
    height: 12,
    backgroundColor: C.line,
    marginLeft: 7,
    marginVertical: 1,
  },

  /* Action Button */
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SP.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primary,
    borderRadius: R.pill,
    paddingHorizontal: SP.lg,
    paddingVertical: 9,
    ...SHADOW,
  },
  actionBtnText: {
    color: C.white,
    fontSize: 13,
    fontWeight: '800',
    marginRight: 6,
  },

  /* Empty state */
  emptyWrap: {
    alignItems: 'center',
    marginTop: SP.xxl,
    paddingHorizontal: SP.md,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SP.md,
  },
  emptyHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
    marginBottom: 4,
  },
  emptySubheading: {
    fontSize: 14,
    lineHeight: 20,
    color: C.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
});