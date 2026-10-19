import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useEffect } from 'react'
import { useAudioPlayer } from 'expo-audio'
import ScreenBackground from '../components/ScreenBackground'
import { colors, typography, spacing, radius } from '../constants/design'
import { AUDIO_SOURCES } from '../constants/audio'

export default function LevelUpScreen({ route, navigation }) {
  const { newLevel } = route.params
  const levelUpPlayer = useAudioPlayer(AUDIO_SOURCES.level_up)

  useEffect(() => {
    if (AUDIO_SOURCES.level_up) {
      levelUpPlayer.volume = 0.8
      levelUpPlayer.play()
    }
  }, [])

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.label}>LEVEL UP</Text>
          <View style={styles.accentLine} />
          <Text style={styles.level}>{newLevel}</Text>
        </View>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    letterSpacing: typography.tracking.widest,
    marginBottom: spacing.lg,
  },
  accentLine: {
    width: 36,
    height: 1.5,
    backgroundColor: colors.domains.Purpose,
    marginBottom: spacing.xl,
  },
  level: {
    fontSize: 120,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    lineHeight: 130,
  },
  button: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.textMuted,
    fontSize: typography.sizes.md,
  },
})