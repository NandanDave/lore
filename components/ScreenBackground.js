import { useState, useRef, useEffect } from 'react'
import { StyleSheet, View, TouchableOpacity, Animated } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import SettingsModal from './SettingsModal'
import useStore from '../store/useStore'
import { colors, spacing } from '../constants/design'

const HP_WARNING_THRESHOLD = 40
const MAX_VIGNETTE_OPACITY = 0.35

function getVignetteIntensity(hp) {
  if (hp === undefined || hp === null) return 0
  if (hp >= HP_WARNING_THRESHOLD) return 0
  const ratio = 1 - hp / HP_WARNING_THRESHOLD
  return Math.min(ratio, 1)
}

export default function ScreenBackground({ children }) {
  const insets = useSafeAreaInsets()
  const [settingsVisible, setSettingsVisible] = useState(false)
  const user = useStore((state) => state.user)
  const character = useStore((state) => state.character)

  const intensity = getVignetteIntensity(character?.hp)
  const peakOpacity = intensity * MAX_VIGNETTE_OPACITY

  const animatedOpacity = useRef(new Animated.Value(peakOpacity)).current

  useEffect(() => {
    Animated.timing(animatedOpacity, {
      toValue: peakOpacity,
      duration: 900,
      useNativeDriver: true,
    }).start()
  }, [peakOpacity])

  return (
    <LinearGradient
      colors={['#0d0a1a', '#000000']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 0.6 }}
      style={styles.gradient}
    >
      <View style={[styles.container, { paddingTop: insets.top - 40, paddingBottom: insets.bottom }]}>
        {children}
      </View>

      <Animated.View
        style={[styles.vignetteContainer, { opacity: animatedOpacity }]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={['rgba(200,30,30,1)', 'rgba(200,30,30,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.vignetteTop}
        />
        <LinearGradient
          colors={['rgba(200,30,30,0)', 'rgba(200,30,30,1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.vignetteBottom}
        />
        <LinearGradient
          colors={['rgba(200,30,30,1)', 'rgba(200,30,30,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.vignetteLeft}
        />
        <LinearGradient
          colors={['rgba(200,30,30,0)', 'rgba(200,30,30,1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.vignetteRight}
        />
      </Animated.View>

      {user && (
        <TouchableOpacity
          style={[styles.gearButton, { top: insets.top + spacing.sm }]}
          onPress={() => setSettingsVisible(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  gearButton: {
    position: 'absolute',
    right: spacing.lg,
    zIndex: 10,
    padding: spacing.xs,
  },
  vignetteContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  vignetteTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  vignetteBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  vignetteLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 30,
  },
  vignetteRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 30,
  },
})