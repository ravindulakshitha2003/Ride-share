import React from 'react';
import { StyleSheet, View } from 'react-native';

import SkeletonBox from './SkeletonBox';
import { colors } from '../../theme/colors';

export default function CardSkeleton() {
  return (
    <View style={styles.card}>
      {/* Top Driver Row */}
      <View style={styles.topRow}>
        <SkeletonBox width={54} height={54} borderRadius={27} />
        <View style={styles.driverInfo}>
          <SkeletonBox width="55%" height={16} borderRadius={6} />
          <View style={{ marginTop: 6 }}>
            <SkeletonBox width="30%" height={12} borderRadius={4} />
          </View>
        </View>
        <SkeletonBox width={70} height={26} borderRadius={13} />
      </View>

      {/* Middle Route Row */}
      <View style={styles.routeRow}>
        <View style={styles.pointRow}>
          <SkeletonBox width={10} height={10} borderRadius={5} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <SkeletonBox width="70%" height={14} borderRadius={6} />
          </View>
        </View>
        <View style={styles.linePlaceholder} />
        <View style={styles.pointRow}>
          <SkeletonBox width={10} height={10} borderRadius={5} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <SkeletonBox width="80%" height={14} borderRadius={6} />
          </View>
        </View>
      </View>

      {/* Bottom Pills Row */}
      <View style={styles.pillsRow}>
        <SkeletonBox width={65} height={24} borderRadius={12} style={{ marginRight: 8 }} />
        <SkeletonBox width={85} height={24} borderRadius={12} style={{ marginRight: 8 }} />
        <SkeletonBox width={75} height={24} borderRadius={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverInfo: {
    marginLeft: 12,
    flex: 1,
  },
  routeRow: {
    marginTop: 16,
    paddingVertical: 4,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  linePlaceholder: {
    width: 2,
    height: 14,
    backgroundColor: colors.borderSubtle,
    marginLeft: 4,
    marginVertical: 2,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
});
