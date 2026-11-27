
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

const INDIGO = '#352F87';
const VIOLET = '#5B4BDB';
const MUTED = '#777394';
const TAB_BG = '#EDEAFD';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'rides', label: 'Rides' },
  { key: 'payments', label: 'Payments' },
];

export default function NotificationTabs({
  activeTab,
  onChange,
  unreadCounts = {},
}) {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const active = activeTab === tab.key;
        const count = unreadCounts[tab.key] || 0;

        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              active && styles.activeTab,
            ]}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                active && styles.activeText,
              ]}
            >
              {tab.label}
            </Text>

            {count > 0 && (
              <View
                style={[
                  styles.badge,
                  active && styles.activeBadge,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    active && styles.activeBadgeText,
                  ]}
                >
                  {count > 99 ? '99+' : count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: TAB_BG,
    borderRadius: 20,
    padding: 4,
    marginHorizontal: 20,
    marginBottom: 12,
  },

  tab: {
    flex: 1,
    height: 42,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeTab: {
    backgroundColor: INDIGO,
  },

  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: MUTED,
  },

  activeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  badge: {
    minWidth: 19,
    height: 19,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: VIOLET,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
  },

  activeBadge: {
    backgroundColor: '#FFFFFF',
  },

  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  activeBadgeText: {
    color: INDIGO,
  },
});
