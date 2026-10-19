import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { useState } from 'react'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { supabase } from '../supabase'
import useStore from '../store/useStore'
import ScreenBackground from '../components/ScreenBackground'
import { colors, typography, spacing, radius } from '../constants/design'
import { getLevelFromXp } from '../utils'

const CATEGORIES = ['Bug', 'Suggestion', 'Other']

export default function FeedbackScreen({ navigation }) {
  const [category, setCategory] = useState(null)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const character = useStore((state) => state.character)
  const isDrifting = useStore((state) => state.isDrifting)

  function isComplete() {
    return category !== null && message.trim().length > 0
  }

  async function handleSubmit() {
    setSubmitting(true)

    const xpData = getLevelFromXp(character?.xp ?? 0)

    const context = {
      app_version: Constants.expoConfig?.version ?? 'unknown',
      platform: Platform.OS,
      os_version: Device.osVersion ?? 'unknown',
      device_model: Device.modelName ?? 'unknown',
      character_level: xpData.level,
      character_archetype: character?.archetype_name ?? 'none',
      hp: character?.hp ?? 'unknown',
      is_drifting: isDrifting,
      timestamp: new Date().toISOString(),
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-feedback', {
        body: { category, message, context },
      })

      if (error) throw error

      Alert.alert(
        'Feedback sent',
        'Thanks — this helps a lot.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      )
    } catch (err) {
      //console.error('Feedback error:', err)
      Alert.alert('Error', 'Something went wrong sending your feedback. Please try again.')
    }

    setSubmitting(false)
  }

  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Send Feedback</Text>
          <Text style={styles.subtitle}>
            Found a bug or have a suggestion? Let us know.
          </Text>

          <Text style={styles.label}>CATEGORY</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryButton,
                  category === cat && styles.categoryButtonSelected,
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[
                  styles.categoryText,
                  category === cat && styles.categoryTextSelected,
                ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>MESSAGE</Text>
          <TextInput
            style={styles.input}
            placeholder="Describe the bug or suggestion..."
            placeholderTextColor={colors.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          <Text style={styles.contextNote}>
            Basic device and app state info will be included automatically to help with debugging. No personal data is collected.
          </Text>

          <TouchableOpacity
            style={[styles.button, !isComplete() && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!isComplete() || submitting}
          >
            <Text style={[styles.buttonText, !isComplete() && styles.buttonTextDisabled]}>
              {submitting ? 'Sending...' : 'Send Feedback'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingTop: spacing.xxl + spacing.lg,
  },
  backButton: {
    marginBottom: spacing.xl,
  },
  backText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.md,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.xxl,
  },
  label: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    letterSpacing: typography.tracking.widest,
    marginBottom: spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  categoryButtonSelected: {
    borderColor: colors.textSecondary,
    backgroundColor: colors.surfaceRaised,
  },
  categoryText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  categoryTextSelected: {
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    minHeight: 140,
    marginBottom: spacing.lg,
  },
  contextNote: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: spacing.xxl,
  },
  button: {
    backgroundColor: colors.textPrimary,
    paddingVertical: spacing.lg + 2,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  buttonText: {
    color: colors.background,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  buttonTextDisabled: {
    color: colors.textMuted,
  },
})