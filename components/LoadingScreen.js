import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated, Easing } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, typography, spacing } from '../constants/design'

const BARS = [
  { color: colors.domains.Body,          height: 20, delay: 0 },
  { color: colors.domains.Mind,          height: 32, delay: 180 },
  { color: colors.domains.Craft,         height: 16, delay: 360 },
  { color: colors.domains.Relationships, height: 28, delay: 540 },
  { color: colors.domains.Wealth,        height: 12, delay: 720 },
  { color: colors.domains.Purpose,       height: 24, delay: 900 },
]

function PulseBar({ color, height, delay }) {
  const anim = useRef(new Animated.Value(0.25)).current

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 0.9,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.25,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start()
    }, delay)

    return () => clearTimeout(timeout)
  }, [])

  return (
    <Animated.View
      style={{
        width: 4,
        height,
        backgroundColor: color,
        borderRadius: 2,
        opacity: anim,
      }}
    />
  )
}

export default function LoadingScreen() {
  const wordmarkOpacity = useRef(new Animated.Value(0)).current
  const wordmarkY = useRef(new Animated.Value(20)).current
  const lineOpacity = useRef(new Animated.Value(0)).current
  const spectrumOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.stagger(200, [
      Animated.parallel([
        Animated.timing(wordmarkOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(wordmarkY, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
      Animated.timing(lineOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(spectrumOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start()
  }, [])

  return (
    <LinearGradient
      colors={['#0d0a1a', '#000000']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 0.6 }}
      style={styles.gradient}
    >
      <View style={styles.container}>
        <Animated.Text
          style={[
            styles.wordmark,
            {
              opacity: wordmarkOpacity,
              transform: [{ translateY: wordmarkY }],
            },
          ]}
        >
          LORE
        </Animated.Text>

        <Animated.View style={[styles.accentLine, { opacity: lineOpacity }]} />

        <Animated.View style={[styles.spectrum, { opacity: spectrumOpacity }]}>
          {BARS.map((bar, i) => (
            <PulseBar key={i} color={bar.color} height={bar.height} delay={bar.delay} />
          ))}
        </Animated.View>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  wordmark: {
    fontSize: 72,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: 12,
    lineHeight: 72,
  },
  accentLine: {
    width: 36,
    height: 1.5,
    backgroundColor: colors.domains.Purpose,
  },
  spectrum: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    height: 36,
  },
})
