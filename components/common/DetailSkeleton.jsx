import React from 'react';
import { StyleSheet, View } from 'react-native';

import SkeletonBox from './SkeletonBox';
import { colors } from '../../theme/colors';

export default function DetailSkeleton() {
  return (
    <View style={styles.container}>
      {/* Driver/Vehicle Card Skeleton */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <SkeletonBox width={48} height={48} borderRadius={24} />
          <View style={{ marginLeft: 14, flex: 1 }}>
            <SkeletonBox width="60%" height={16} borderRadius={6} />
            <SkeletonBox width="35%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <SkeletonBox width="45%" height={14} borderRadius={6} />
          <SkeletonBox width="35%" height={14} borderRadius={6} />
        </View>
        <View style={[styles.row, { marginTop: 10 }]}>
          <SkeletonBox width="40%" height={14} borderRadius={6} />
          <SkeletonBox width="30%" height={14} borderRadius={6} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
