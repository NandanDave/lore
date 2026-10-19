import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Alert, ActivityIndicator } from 'react-native'
import { supabase } from '../supabase'
import useStore from '../store/useStore'
import { colors, typography, spacing, radius } from '../constants/design'
import { generateRecoveryQuests, refreshQuests } from '../utils'
import { useNavigation } from '@react-navigation/native'

const SHOW_DEV_TOOLS = false

const DEV_CHARACTER = {
  archetype_name: 'The Wanderer',
  archetype_description: 'A dev test character.',
  hp: 100, xp: 0, level: 1,
  passive_traits: ['Adaptable', 'Curious', 'Observant'],
  shadow_state: 'Stagnation',
  is_drifting: false,
}
const DOMAINS = ['Body', 'Mind', 'Craft', 'Relationships', 'Wealth', 'Purpose']

export default function SettingsModal({ visible, onClose }) {
  const [deleting, setDeleting] = useState(false)
  const reset = useStore((state) => state.reset)
  const setIsDrifting = useStore((state) => state.setIsDrifting)
  const setCharacter = useStore((state) => state.setCharacter)
  const setDomainScores = useStore((state) => state.setDomainScores)
  const updateProfile = useStore((state) => state.updateProfile)
  const character = useStore((state) => state.character)
  const navigation = useNavigation()

  function handleLogout() {
    Alert.alert(
      'Log out',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            onClose()
            await supabase.auth.signOut()
            reset()
          },
        },
      ]
    )
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete account',
      'This permanently deletes your account and all character data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true)
            const { error } = await supabase.functions.invoke('delete-account')
            setDeleting(false)

            if (error) {
              Alert.alert('Error', 'Something went wrong deleting your account. Please try again.')
              return
            }

            onClose()
            await supabase.auth.signOut()
            reset()
          },
        },
      ]
    )
  }

  async function handleTriggerDrift() {
    Alert.alert(
      'Trigger Drift (Test)',
      'This will set your HP to 0 and trigger Drift State.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Trigger',
          style: 'destructive',
          onPress: async () => {
          const { data: { session } } = await supabase.auth.getSession()
          const user = session?.user
          const { data: characterData } = await supabase
            .from('characters')
            .select('id')
            .eq('user_id', user.id)
            .single()

          if (characterData) {
            await supabase
              .from('characters')
              .update({ hp: 0, is_drifting: true })
              .eq('id', characterData.id)
            setCharacter({ ...character, hp: 0, is_drifting: true })
            setIsDrifting(true)
            await generateRecoveryQuests(user.id, characterData.id)
          }
          onClose()
        },
        },
      ]
    )
  }

  async function handleSkipQuiz() {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return

    // Wipe existing character data so we start clean
    const { data: existingChars } = await supabase.from('characters').select('id').eq('user_id', user.id)
    if (existingChars?.length) {
      await supabase.from('domain_scores').delete().in('character_id', existingChars.map((c) => c.id))
    }
    await supabase.from('characters').delete().eq('user_id', user.id)
    await supabase.from('quests').delete().eq('user_id', user.id)

    const { data: characterData, error } = await supabase
      .from('characters')
      .insert({ user_id: user.id, ...DEV_CHARACTER })
      .select()
      .single()

    if (error) { Alert.alert('Dev Error', error.message); return }

    await supabase.from('domain_scores').insert(
      DOMAINS.map((domain) => ({ character_id: characterData.id, domain, score: 50, description: null }))
    )

    const cycleStart = new Date().toISOString()
    await supabase.from('profiles').update({
      onboarding_complete: true,
      quest_cycle_start: cycleStart,
      quest_cycle_used: 0,
      skips_remaining: 2,
    }).eq('id', user.id)

    const scores = {}
    DOMAINS.forEach((d) => { scores[d] = { score: 50, description: null } })
    setCharacter(characterData)
    setDomainScores(scores)
    setIsDrifting(false)
    updateProfile({ onboarding_complete: true, quest_cycle_start: cycleStart, quest_cycle_used: 0, skips_remaining: 2 })

    await refreshQuests(3)
    onClose()
  }

  async function handleResetSlots() {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return

    const updates = { quest_cycle_used: 2, skips_remaining: 1 }
    await supabase.from('profiles').update(updates).eq('id', user.id)
    updateProfile(updates)
    onClose()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Settings</Text>

          <View style={styles.section}>
            <TouchableOpacity style={[styles.row, styles.rowBorder]} onPress={handleLogout}>
              <Text style={styles.rowTextDanger}>Log out</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.row} onPress={handleDeleteAccount} disabled={deleting}>
              {deleting ? (
                <ActivityIndicator color={colors.danger} />
              ) : (
                <Text style={styles.rowTextDanger}>Delete account</Text>
              )}
            </TouchableOpacity>
          </View>

          {SHOW_DEV_TOOLS && (
            <View style={styles.section}>
              <TouchableOpacity style={[styles.row, styles.rowBorder]} onPress={handleSkipQuiz}>
                <Text style={styles.rowTextMuted}>⚡ Skip Quiz (Dev)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.row, styles.rowBorder]} onPress={handleResetSlots}>
                <Text style={styles.rowTextMuted}>↺ Reset to 1 Slot + 1 Skip (Dev)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.row} onPress={handleTriggerDrift}>
                <Text style={styles.rowTextMuted}>⚠ Trigger Drift State (Dev)</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => {
                onClose()
                setTimeout(() => navigation.navigate('Feedback'), 300)
              }}
            >
              <Text style={styles.rowTextNormal}>Send Feedback</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.versionText}>Lore · Early Access</Text>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.xl,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  section: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  row: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  rowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  rowTextDanger: {
    color: colors.danger,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
  },
  rowTextMuted: {
    color: colors.textMuted,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
  },
  versionText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    letterSpacing: typography.tracking.wide,
    textAlign: 'center',
  },
  rowTextNormal: {
  color: colors.textSecondary,
  fontSize: typography.sizes.md,
  fontWeight: typography.weights.medium,
},
})