import { useEffect, useState, useRef } from 'react'
import { View, Text, ScrollView, StyleSheet, Animated } from 'react-native'
import { useAudioPlayer } from 'expo-audio'
import { colors, typography, spacing, radius } from '../constants/design'
import { AUDIO_SOURCES } from '../constants/audio'

const GLITCH_CHARS = '!@#$%^&*<>?/\\|[]{}ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

function scramble(length) {
  return Array.from({ length }, () =>
    GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
  ).join('')
}

function GlitchText({ finalText, delay, duration = 1000 }) {
  const [display, setDisplay] = useState(scramble(finalText.length))
  const [done, setDone] = useState(false)

  useEffect(() => {
    const startTimeout = setTimeout(() => {
      const startTime = Date.now()
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const resolvedChars = Math.floor(progress * finalText.length)

        setDisplay(
          finalText.slice(0, resolvedChars) +
          scramble(finalText.length - resolvedChars)
        )

        if (progress >= 1) {
          clearInterval(interval)
          setDisplay(finalText)
          setDone(true)
        }
      }, 50)

      return () => clearInterval(interval)
    }, delay)

    return () => clearTimeout(startTimeout)
  }, [finalText, delay, duration])

  return (
    <Text style={done ? styles.textDone : styles.textGlitch}>
      {display}
    </Text>
  )
}

function GlitchBar({ score, color, delay }) {
  const width = useRef(new Animated.Value(0)).current
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setStarted(true)
      Animated.timing(width, {
        toValue: score,
        duration: 800,
        useNativeDriver: false,
      }).start()
    }, delay)

    return () => clearTimeout(timeout)
  }, [delay, score])

  return (
    <View style={styles.barBackground}>
      <Animated.View
        style={[
          styles.barFill,
          {
            width: width.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }),
            backgroundColor: color,
          },
        ]}
      />
    </View>
  )
}

export default function GlitchReveal({ character, domainScores, onComplete }) {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const revealPlayer = useAudioPlayer(AUDIO_SOURCES.character_reveal)

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start()
    if (AUDIO_SOURCES.character_reveal) {
      revealPlayer.volume = 0.8
      revealPlayer.play()
    }
  }, [])

    

  const domainList = Object.entries(domainScores)
  const domainColors = {
    Body: '#e05c5c',
    Mind: '#5c8ee0',
    Craft: '#e0a85c',
    Relationships: '#5ce07a',
    Wealth: '#a05ce0',
    Purpose: '#2ab8c4',
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.systemLabel}>PROFILE LOCKED</Text>

        <GlitchText
          finalText={character.archetype_name}
          delay={200}
          duration={1200}
        />

        <View style={styles.divider} />

        {domainList.map(([domain, data], index) => {
          const score = typeof data === 'object' ? data.score : data
          return (
            <View key={domain} style={styles.domainRow}>
              <GlitchText
                finalText={domain}
                delay={800 + index * 200}
                duration={400}
              />
              <GlitchBar
                score={score}
                color={domainColors[domain]}
                delay={800 + index * 200}
              />
              <GlitchText
                finalText={String(score)}
                delay={800 + index * 200}
                duration={400}
              />
            </View>
          )
        })}

        <View style={styles.divider} />

        <Text style={styles.tapToContinue} onPress={onComplete}>
          TAP TO CONTINUE
        </Text>
      </ScrollView>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    zIndex: 999,
  },
  content: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingTop: spacing.xxxl,
  },
  systemLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    letterSpacing: typography.tracking.widest,
    marginBottom: spacing.xl,
  },
  textGlitch: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
    fontFamily: 'Courier',
    marginBottom: spacing.lg,
  },
  textDone: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.border,
    marginVertical: spacing.xl,
  },
  domainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  barBackground: {
    flex: 1,
    height: 4,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  tapToContinue: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    letterSpacing: typography.tracking.widest,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
})