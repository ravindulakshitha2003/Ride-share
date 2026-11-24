import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  ImageBackground,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
  primary: '#6545DC',
  secondary: '#38258F',
  background: '#F8F6FF',
  text: '#21194B',
  muted: '#77738F',
  white: '#FFFFFF',
  border: '#E8E2FA',
};

export default function LandingScreen() {
  const router = useRouter();

  const features = [
    { icon: 'account-group', title: 'Share Rides', description: 'Travel together with other people' },
    { icon: 'wallet', title: 'Save Money', description: 'Share travel costs and pay less' },
    { icon: 'shield-check', title: 'Travel Safely', description: 'Connect with verified users' },
    { icon: 'leaf', title: 'Go Greener', description: 'Reduce traffic and emissions' },
  ];

  const handleGetStarted = () => router.push('/(auth)/register');
  const handleLogin = () => router.push('/(auth)/login');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              style={styles.logoIcon}
            >
              <Icon name="car" size={28} color="#FFFFFF" />
            </LinearGradient>

            <View>
              <Text style={styles.logoText}>
                Route<Text style={styles.logoHighlight}>Mate</Text>
              </Text>
              <Text style={styles.logoSubtitle}>RIDE SHARE</Text>
            </View>
          </View>

          <Pressable onPress={handleLogin}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>

        {/* Hero section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>
            Share Rides,{"\n"}
            Save Cost,{"\n"}
            <Text style={styles.heroHighlight}>Travel Together</Text>
          </Text>

          <Text style={styles.heroDescription}>
            A smarter, safer and more affordable way to travel with people going the same way.
          </Text>

          {/* Scenic background image */}
          <ImageBackground
            source={require('../assets/routemate-hero.png')}
            style={styles.heroBackground}
            imageStyle={styles.heroImage}
            resizeMode="cover"
          />
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresHeading}>Why choose RouteMate?</Text>

          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={styles.featureIcon}>
                  <Icon name={feature.icon} size={28} color={COLORS.primary} />
                </View>

                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Page indicators */}
        <View style={styles.dotsContainer}>
          <View style={styles.activeDot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          <Pressable
            onPress={handleGetStarted}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              style={styles.gradientButton}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
              <Icon name="arrow-right" size={23} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={handleLogin}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              I already have an account
            </Text>
          </Pressable>
        </View>

        <Text style={styles.footerText}>Travel together. Save together.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 25,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 30,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 25,
    fontWeight: '900',
    color: COLORS.text,
  },
  logoHighlight: {
    color: COLORS.primary,
  },
  logoSubtitle: {
    fontSize: 9,
    letterSpacing: 3,
    color: COLORS.muted,
    fontWeight: '800',
  },
  skipText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  heroSection: {
    marginBottom: 25,
  },
  heroTitle: {
    fontSize: 35,
    lineHeight: 44,
    fontWeight: '900',
    color: COLORS.text,
  },
  heroHighlight: {
    color: COLORS.primary,
    fontStyle: 'italic',
  },
  heroDescription: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
    maxWidth: 330,
  },
  heroBackground: {
    width: '100%',
    height: 280,
    marginTop: 22,
    borderRadius: 24,
    overflow: 'hidden',
  },
  heroImage: {
    borderRadius: 24,
  },
  featuresSection: {
    marginBottom: 20,
  },
  featuresHeading: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 14,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  featureCard: {
    width: '48%',
    minHeight: 135,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: '#F0EBFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 9,
  },
  featureTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  featureDescription: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
    marginVertical: 18,
  },
  activeDot: {
    width: 20,
    height: 9,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#D3CDE5',
  },
  buttonsContainer: {
    gap: 13,
  },
  primaryButton: {
    borderRadius: 17,
    overflow: 'hidden',
  },
  gradientButton: {
    height: 57,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.white,
  },
  secondaryButton: {
    height: 55,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  footerText: {
    textAlign: 'center',
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 20,
  },
});
