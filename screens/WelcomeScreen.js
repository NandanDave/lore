import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native'
import { useEffect, useRef } from 'react'
import ScreenBackground from '../components/ScreenBackground'
import { colors, typography, spacing, radius } from '../constants/design'

const SPECTRUM = [
  { color: colors.domains.Body,          height: 20 },
  { color: colors.domains.Mind,          height: 32 },
  { color: colors.domains.Craft,         height: 16 },
  { color: colors.domains.Relationships, height: 28 },
  { color: colors.domains.Wealth,        height: 12 },
  { color: colors.domains.Purpose,       height: 24 },
]

export default function WelcomeScreen({ navigation }) {
  const anims = useRef(
    Array.from({ length: 5 }, () => new Animated.Value(0))
  ).current

  useEffect(() => {
    Animated.stagger(
      110,
      anims.map((v) =>
        Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: true })
      )
    ).start()
  }, [])

  function fadeUp(anim) {
    return {
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }],
    }
  }

  return (
    <ScreenBackground>
      <View style={styles.container}>

        <View style={styles.hero}>

          {/* Domain spectrum art */}
          <Animated.View style={[styles.spectrum, fadeUp(anims[0])]}>
            {SPECTRUM.map(({ color, height }, i) => (
              <View key={i} style={[styles.spectrumBar, { height, backgroundColor: color }]} />
            ))}
          </Animated.View>

          <Animated.Text style={[styles.appName, fadeUp(anims[1])]}>
            LORE
          </Animated.Text>

          <Animated.View style={[styles.accentLine, fadeUp(anims[2])]} />

          <Animated.Text style={[styles.descriptor, fadeUp(anims[3])]}>
            Your Character,{'\n'}Your Story.
          </Animated.Text>

        </View>

        <Animated.View style={[styles.actions, fadeUp(anims[4])]}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('SignUp')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Text style={styles.outlineButtonText}>Log In</Text>
          </TouchableOpacity>
        </Animated.View>

      </View>
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
  },
  spectrum: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    height: 36,
    marginBottom: spacing.xl,
  },
  spectrumBar: {
    width: 4,
    borderRadius: 2,
    opacity: 0.85,
  },
  appName: {
    fontSize: 96,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: 10,
    lineHeight: 96,
    marginBottom: spacing.xl,
  },
  accentLine: {
    width: 48,
    height: 1.5,
    backgroundColor: colors.domains.Purpose,
    marginBottom: spacing.xl,
  },
  descriptor: {
    fontSize: 26,
    color: colors.textSecondary,
    lineHeight: 42,
    fontWeight: typography.weights.medium,
  },
  actions: {
    gap: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.textPrimary,
    paddingVertical: spacing.lg + 2,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.5,
  },
  outlineButton: {
    borderWidth: 0.5,
    borderColor: '#333333',
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  outlineButtonText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.md,
    letterSpacing: 0.5,
  },
})


// ─── PREVIOUS CODE (v2 — with badge + domain chips) ──────────────────────────
//
// import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native'
// import { useEffect, useRef } from 'react'
// import ScreenBackground from '../components/ScreenBackground'
// import { colors, typography, spacing, radius } from '../constants/design'
//
// const DOMAIN_ITEMS = [
//   { label: 'BODY',    color: colors.domains.Body },
//   { label: 'MIND',    color: colors.domains.Mind },
//   { label: 'CRAFT',   color: colors.domains.Craft },
//   { label: 'BONDS',   color: colors.domains.Relationships },
//   { label: 'WEALTH',  color: colors.domains.Wealth },
//   { label: 'PURPOSE', color: colors.domains.Purpose },
// ]
//
// export default function WelcomeScreen({ navigation }) {
//   const anims = useRef(
//     Array.from({ length: 6 }, () => new Animated.Value(0))
//   ).current
//
//   useEffect(() => {
//     Animated.stagger(
//       110,
//       anims.map((v) =>
//         Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: true })
//       )
//     ).start()
//   }, [])
//
//   function fadeUp(anim) {
//     return {
//       opacity: anim,
//       transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }],
//     }
//   }
//
//   return (
//     <ScreenBackground>
//       <View style={styles.container}>
//         <Animated.View style={[styles.badge, fadeUp(anims[0])]}>
//           <View style={styles.badgeDot} />
//           <Text style={styles.badgeText}>LIFE · RPG · SYSTEM</Text>
//         </Animated.View>
//         <View style={styles.hero}>
//           <Animated.Text style={[styles.appName, fadeUp(anims[1])]}>LORE</Animated.Text>
//           <Animated.View style={[styles.accentLine, fadeUp(anims[2])]} />
//           <Animated.Text style={[styles.descriptor, fadeUp(anims[3])]}>
//             Your character,{'\n'}shaped by your{'\n'}actual life.
//           </Animated.Text>
//         </View>
//         <Animated.View style={[styles.domainsRow, fadeUp(anims[4])]}>
//           {DOMAIN_ITEMS.map(({ label, color }) => (
//             <View key={label} style={[styles.domainChip, { borderColor: color + '44' }]}>
//               <View style={[styles.domainDot, { backgroundColor: color }]} />
//               <Text style={[styles.domainChipText, { color }]}>{label}</Text>
//             </View>
//           ))}
//         </Animated.View>
//         <Animated.View style={[styles.actions, fadeUp(anims[5])]}>
//           <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('SignUp')} activeOpacity={0.85}>
//             <Text style={styles.primaryButtonText}>Create Account</Text>
//           </TouchableOpacity>
//           <TouchableOpacity style={styles.ghostButton} onPress={() => navigation.navigate('Login')} activeOpacity={0.6}>
//             <Text style={styles.ghostButtonText}>Log In</Text>
//           </TouchableOpacity>
//         </Animated.View>
//       </View>
//     </ScreenBackground>
//   )
// }
//
// ─── PREVIOUS CODE (v1 — original) ───────────────────────────────────────────
//
// import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
// import ScreenBackground from '../components/ScreenBackground'
// import { colors, typography, spacing, radius } from '../constants/design'
//
// export default function WelcomeScreen({ navigation }) {
//   return (
//     <ScreenBackground>
//       <View style={styles.container}>
//         <View style={styles.hero}>
//           <Text style={styles.appName}>LORE</Text>
//           <Text style={styles.tagline}>Write your story.</Text>
//         </View>
//         <View style={styles.actions}>
//           <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('SignUp')}>
//             <Text style={styles.buttonText}>Create Account</Text>
//           </TouchableOpacity>
//           <TouchableOpacity style={styles.buttonOutline} onPress={() => navigation.navigate('Login')}>
//             <Text style={styles.buttonOutlineText}>Log In</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </ScreenBackground>
//   )
// }
