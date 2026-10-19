import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated, Easing } from 'react-native'
import Svg, { Polygon } from 'react-native-svg'
import { colors, typography, spacing } from '../constants/design'

const DOMAIN_COLORS = [
  colors.domains.Body,
  colors.domains.Mind,
  colors.domains.Craft,
  colors.domains.Relationships,
  colors.domains.Wealth,
  colors.domains.Purpose,
]

const SIZE = 120
const CENTER = SIZE / 2
const RADIUS = SIZE / 2 - 6

function hexPoints(cx, cy, r) {
  const points = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`)
  }
  return points.join(' ')
}

export default function TerminalLoader({ mode = 'quiz' }) {
  const AnimatedPolygon = Animated.createAnimatedComponent(Polygon)
  const rotation = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(0.9)).current
  const colorIndex = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start()

    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.05,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.9,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start()

    Animated.loop(
      Animated.timing(colorIndex, {
        toValue: DOMAIN_COLORS.length,
        duration: DOMAIN_COLORS.length * 1800,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    ).start()
  }, [])

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const strokeColor = colorIndex.interpolate({
    inputRange: DOMAIN_COLORS.map((_, i) => i),
    outputRange: DOMAIN_COLORS,
  })

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          transform: [{ rotate: spin }, { scale }],
        }}
      >
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <AnimatedPolygon
            points={hexPoints(CENTER, CENTER, RADIUS)}
            fill="none"
            stroke={strokeColor}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  loadingText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    letterSpacing: typography.tracking.wide,
  },
})