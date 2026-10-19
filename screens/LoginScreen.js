import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, ScrollView, Platform, Animated } from 'react-native'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabase'
import ScreenBackground from '../components/ScreenBackground'
import { colors, typography, spacing, radius } from '../constants/design'

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [focusedField, setFocusedField] = useState(null)

  const anims = useRef(
    Array.from({ length: 3 }, () => new Animated.Value(0))
  ).current

  useEffect(() => {
    Animated.stagger(
      120,
      anims.map((v) =>
        Animated.timing(v, { toValue: 1, duration: 600, useNativeDriver: true })
      )
    ).start()
  }, [])

  function fadeUp(anim) {
    return {
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
    }
  }

  async function handleLogin() {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      Alert.alert('Error', error.message)
      setLoading(false)
      return
    }
    setLoading(false)
  }

  async function handleForgotPassword() {
    if (!email) {
      Alert.alert('Enter your email', 'Type your email address above and then tap Forgot password.')
      return
    }
    setResetLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    setResetLoading(false)
    if (error) {
      Alert.alert('Error', error.message)
      return
    }
    Alert.alert(
      'Check your email',
      'A password reset link has been sent to ' + email + '. Open it in your browser to set a new password.'
    )
  }

  function inputStyle(field) {
    return [styles.input, focusedField === field && styles.inputFocused]
  }

  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >

          <Animated.View style={fadeUp(anims[0])}>
            <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[styles.header, fadeUp(anims[1])]}>
            <Text style={styles.eyebrow}>LOG IN</Text>
            <Text style={styles.title}>Welcome{'\n'}Back.</Text>
          </Animated.View>

          <Animated.View style={[styles.form, fadeUp(anims[2])]}>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>EMAIL</Text>
              <TextInput
                style={inputStyle('email')}
                placeholder="your@email.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>PASSWORD</Text>
                <TouchableOpacity
                  onPress={handleForgotPassword}
                  disabled={resetLoading}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.forgotText}>
                    {resetLoading ? 'Sending...' : 'Forgot?'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={inputStyle('password')}
                placeholder="Your password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.primaryButtonLoading]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Logging in...' : 'Log In'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signupLink}
              onPress={() => navigation.navigate('SignUp')}
            >
              <Text style={styles.signupLinkText}>Don't have an account? </Text>
              <Text style={[styles.signupLinkText, styles.signupLinkAction]}>Sign up</Text>
            </TouchableOpacity>

          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: 48,
    paddingBottom: spacing.xxl,
    justifyContent: 'space-between',
  },
  back: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.md,
    paddingRight: spacing.xxl,
  },
  backText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    letterSpacing: 0.5,
  },
  header: {
    paddingVertical: spacing.xxxl,
  },
  eyebrow: {
    fontSize: typography.sizes.xs,
    letterSpacing: typography.tracking.widest,
    color: colors.textMuted,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    lineHeight: 50,
  },
  form: {
    gap: spacing.md,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: typography.sizes.xs,
    letterSpacing: typography.tracking.wider,
    color: colors.textMuted,
    fontWeight: typography.weights.semibold,
  },
  forgotText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
  },
  inputFocused: {
    borderColor: colors.domains.Purpose,
    borderWidth: 1,
  },
  primaryButton: {
    backgroundColor: colors.textPrimary,
    paddingVertical: spacing.lg + 2,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryButtonLoading: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.5,
  },
  signupLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  signupLinkText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
  },
  signupLinkAction: {
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
})


// ─── PREVIOUS CODE (v1 — original) ───────────────────────────────────────────
//
// import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
// import { useState } from 'react'
// import { supabase } from '../supabase'
// import ScreenBackground from '../components/ScreenBackground'
// import { colors, typography, spacing, radius } from '../constants/design'
//
// export default function LoginScreen({ navigation }) {
//   const [email, setEmail] = useState('')
//   const [password, setPassword] = useState('')
//   const [loading, setLoading] = useState(false)
//   const [resetLoading, setResetLoading] = useState(false)
//
//   async function handleLogin() {
//     setLoading(true)
//     const { data, error } = await supabase.auth.signInWithPassword({ email, password })
//     if (error) {
//       Alert.alert('Error', error.message)
//       setLoading(false)
//       return
//     }
//     setLoading(false)
//   }
//
//   async function handleForgotPassword() {
//     if (!email) {
//       Alert.alert('Enter your email', 'Type your email address above and then tap Forgot password.')
//       return
//     }
//     setResetLoading(true)
//     const { error } = await supabase.auth.resetPasswordForEmail(email)
//     setResetLoading(false)
//     if (error) {
//       Alert.alert('Error', error.message)
//       return
//     }
//     Alert.alert('Check your email', 'A password reset link has been sent to ' + email + '. Open it in your browser to set a new password.')
//   }
//
//   return (
//     <ScreenBackground>
//       <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
//         <View style={styles.container}>
//           <View style={styles.header}>
//             <Text style={styles.appName}>LORE</Text>
//             <Text style={styles.title}>Welcome back.</Text>
//           </View>
//           <View style={styles.form}>
//             <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
//             <TextInput style={styles.input} placeholder="Password" placeholderTextColor={colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
//             <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword} disabled={resetLoading}>
//               <Text style={styles.forgotPasswordText}>{resetLoading ? 'Sending...' : 'Forgot password?'}</Text>
//             </TouchableOpacity>
//             <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
//               <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Log In'}</Text>
//             </TouchableOpacity>
//             <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('SignUp')}>
//               <Text style={styles.linkText}>Don't have an account? Sign up</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </KeyboardAvoidingView>
//     </ScreenBackground>
//   )
// }
//
// const styles = StyleSheet.create({
//   container: { flex: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, justifyContent: 'space-between' },
//   header: { flex: 1, justifyContent: 'center' },
//   appName: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold, color: colors.textMuted, letterSpacing: typography.tracking.widest, marginBottom: spacing.lg },
//   title: { fontSize: typography.sizes.xxxl, fontWeight: typography.weights.bold, color: colors.textPrimary },
//   form: { gap: spacing.md },
//   input: { backgroundColor: colors.surface, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, color: colors.textPrimary, fontSize: typography.sizes.md },
//   forgotPassword: { alignSelf: 'flex-end', paddingVertical: spacing.xs },
//   forgotPasswordText: { color: colors.textMuted, fontSize: typography.sizes.sm },
//   button: { backgroundColor: colors.textPrimary, paddingVertical: spacing.lg, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.sm },
//   buttonText: { color: colors.background, fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
//   link: { alignItems: 'center', paddingVertical: spacing.sm },
//   linkText: { color: colors.textMuted, fontSize: typography.sizes.sm },
// })
