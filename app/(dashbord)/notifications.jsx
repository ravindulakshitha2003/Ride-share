
import React, { useMemo, useCallback, useState } from 'react';

import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';


import NotificationHeader from '../../components/notifications/NotificationHeader';
import NotificationTabs from '../../components/notifications/NotificationTabs';
import NotificationCard from '../../components/notifications/NotificationCard';
import NotificationEmptyState from '../../components/notifications/NotificationEmptyState';

import { useNotifications } from '../../hooks/useNotifications';


export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState('All');

 const {
  notifications,
  unreadCount,
  loading,
  refreshing,
  loadingMore,
  error,
  pagination,
  refreshNotifications: refresh,
  loadMoreNotifications: loadMore,
  markRead,
  markAllRead,
} = useNotifications();

  // Filter notifications according to the selected tab.
  const filteredNotifications = useMemo(() => {
    if (activeTab === 'Rides') {
      return notifications.filter(
        (item) => item.type?.startsWith('ride.')
          || item.type?.startsWith('booking.')
      );
    }

    if (activeTab === 'Payments') {
      return notifications.filter(
        (item) => item.type?.startsWith('payment.')
      );
    }

    return notifications;
  }, [notifications, activeTab]);

  // Calculate category counts.
  const unreadCounts = useMemo(() => {
    const rides = notifications.filter(
      (item) =>
        !item.readAt &&
        (item.type?.startsWith('ride.')
          || item.type?.startsWith('booking.'))
    ).length;

    const payments = notifications.filter(
      (item) =>
        !item.readAt &&
        item.type?.startsWith('payment.')
    ).length;

    return {
      All: unreadCount,
      Rides: rides,
      Payments: payments,
    };
  }, [notifications, unreadCount]);

  const handleNotificationPress = useCallback(
    async (item) => {
      if (!item.readAt) {
        await markRead(item._id);
      }
    },
    [markRead]
  );

  const handleMarkAllRead = useCallback(async () => {
    await markAllRead();
  }, [markAllRead]);

  const handleLoadMore = useCallback(() => {
    if (
      !loading &&
      !loadingMore &&
      pagination &&
      pagination.page < pagination.totalPages
    ) {
      loadMore();
    }
  }, [loading, loadingMore, pagination, loadMore]);

  const renderNotification = ({ item }) => (
    <NotificationCard
      item={item}
      onPress={handleNotificationPress}
    />
  );

  const renderEmptyState = () => {
    if (loading) return null;

    if (error) {
      return (
        <NotificationEmptyState
          title="Couldn't load notifications"
          message={error}
        />
      );
    }

    if (activeTab === 'Rides') {
      return (
        <NotificationEmptyState
          title="No ride notifications"
          message="Updates about your rides and bookings will appear here."
        />
      );
    }

    if (activeTab === 'Payments') {
      return (
        <NotificationEmptyState
          title="No payment notifications"
          message="Your payment updates will appear here."
        />
      );
    }

    return <NotificationEmptyState />;
  };

  return (
    <View style={styles.container}>
      <NotificationHeader
        unreadCount={unreadCount}
        onMarkAllRead={handleMarkAllRead}
      />

      <NotificationTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        unreadCounts={unreadCounts}
      />

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6256D9" />
          <Text style={styles.loadingText}>
            Loading notifications...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item._id}
          renderItem={renderNotification}
          contentContainerStyle={
            filteredNotifications.length === 0
              ? styles.emptyList
              : styles.listContent
          }
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              colors={['#6256D9']}
              tintColor="#6256D9"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                size="small"
                color="#6256D9"
                style={styles.footerLoader}
              />
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FC',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#858B9B',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 25,
  },
  emptyList: {
    flexGrow: 1,
  },
  footerLoader: {
    marginVertical: 20,
  },
});
