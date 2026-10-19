import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useState, useCallback, useRef } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../supabase'
import useStore from '../store/useStore'
import ScreenBackground from '../components/ScreenBackground'
import { colors, typography, spacing, radius } from '../constants/design'
import { callClaude } from '../constants/api'
import { refreshQuests, processExpiredQuests, getCycleStatus } from '../utils'
import {ERROR_CODES } from '../constants/api'


const SKIP_PROMPT = `You are a narrator for a life RPG app. Generate a single line shown to a user who is about to skip a quest.
You will receive:
{
  "quest": { "domain": "string", "title": "string", "difficulty": "Easy | Medium | Hard" }
}
The line appears before they confirm the skip. It should make them pause — not guilt trip, not lecture. One sentence that speaks to what they're walking away from — not at the user's choice or capacity.
Tone: quiet, understated, like a mentor who noticed but isn't making a scene. The kind of thing said before turning away.
Never: preach, moralize, threaten, encourage, use exclamation marks
Never: reference the difficulty rating or imply the task was small or manageable
Never: imply the user is failing, weak, or making a mistake — they are simply pausing
Reference the domain or quest title if it sharpens the line.
Return ONLY valid JSON:
{
  "narrator_line": "string"
}`

function daysRemaining(expiresAt) {
  const diff = new Date(expiresAt) - new Date()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'Expires today'
  if (days === 1) return '1 day left'
  return `${days} days left`
}

function QuestCard({ quest, onSkip, onComplete, skipLoading, hideSkip }) {
  const domainColor = colors.domains[quest.domain] ?? colors.textSecondary
  const difficultyColor = colors.difficulty[quest.difficulty] ?? colors.textSecondary

  return (
    <View style={[styles.card, { borderColor: domainColor + '33' }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.badge, { backgroundColor: domainColor + '18' }]}>
          <Text style={[styles.badgeText, { color: domainColor }]}>
            {quest.domain.toUpperCase()}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.surface }]}>
          <Text style={[styles.badgeText, { color: difficultyColor }]}>
            {quest.difficulty.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.questTitle}>{quest.title}</Text>
      <Text style={styles.questDescription}>{quest.description}</Text>

      <View style={styles.cardFooter}>
        <Text style={styles.timeLeft}>{daysRemaining(quest.expires_at)}</Text>
        <Text style={[styles.xpReward, { color: domainColor }]}>
          +{quest.xp_reward} XP
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.completeButton}
          onPress={() => onComplete(quest)}
        >
          <Text style={styles.completeText}>Mark Complete</Text>
        </TouchableOpacity>
        {!hideSkip && (
          <TouchableOpacity
            style={[styles.skipButton, skipLoading === quest.id && styles.skipButtonDisabled]}
            onPress={() => !skipLoading && onSkip(quest)}
            disabled={!!skipLoading}
          >
            <Text style={styles.skipText}>
              {skipLoading === quest.id ? '...' : 'Skip'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

export default function QuestScreen({ navigation }) {
  const [quests, setQuests] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [skipLoading, setSkipLoading] = useState(null)
  const [skipModal, setSkipModal] = useState(null)
  const [skipNarratorCache, setSkipNarratorCache] = useState({})
  const [showDriftIntro, setShowDriftIntro] = useState(false)

  const profile = useStore((state) => state.profile)
  const setProfile = useStore((state) => state.setProfile)
  const updateProfile = useStore((state) => state.updateProfile)
  const isDrifting = useStore((state) => state.isDrifting)
  const setIsDrifting = useStore((state) => state.setIsDrifting)
  const setCharacter = useStore((state) => state.setCharacter)
  const character = useStore((state) => state.character)
  const driftIntroSeen = useStore((state) => state.driftIntroSeen)
  const setDriftIntroSeen = useStore((state) => state.setDriftIntroSeen)

  const loadQuestsRef = useRef(loadQuests)
  loadQuestsRef.current = loadQuests

  useFocusEffect(
    useCallback(() => {
      loadQuestsRef.current()
    }, [])
  )

async function loadQuests() {
  setLoading(true)
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) { setLoading(false); return }

  const result = await processExpiredQuests()
  if (result.driftTriggered) {
  setIsDrifting(true)
  setCharacter({ ...character, hp: 0, is_drifting: true })
  if (!driftIntroSeen) {
    setShowDriftIntro(true)
  }
}

  const currentlyDrifting = result.driftTriggered || isDrifting

  const { data, error } = await supabase
    .from('quests')
    .select('*')
    .eq('status', 'active')
    .eq('user_id', user.id)
    .order('assigned_at', { ascending: true })

  if (error) {
    Alert.alert('Error', error.message)
    setLoading(false)
    return
  }

  const activeQuests = data ?? []
  setQuests(activeQuests)

  const normalQuests = activeQuests.filter((q) => !q.is_recovery)

  if (!currentlyDrifting) {
    const { needsReset } = getCycleStatus(profile)

    if (needsReset) {
      const now = new Date().toISOString()
      const cycleReset = { quest_cycle_start: now, quest_cycle_used: 0, skips_remaining: 2 }
      await supabase.from('profiles').update(cycleReset).eq('id', user.id)
      updateProfile(cycleReset)

      if (normalQuests.length < 3) {
        await refreshQuests(3 - normalQuests.length)
        const { data: refreshed } = await supabase
          .from('quests')
          .select('*')
          .eq('status', 'active')
          .eq('user_id', user.id)
          .order('assigned_at', { ascending: true })
        setQuests(refreshed ?? [])
      }
    }
  }

  setLoading(false)
  if ((result.driftTriggered || isDrifting) && !driftIntroSeen) {
    setShowDriftIntro(true)
  }
}

  async function handleSkip(quest) {
    if (profile?.skips_remaining <= 0) {
      Alert.alert('No skips left', 'You have no skips remaining this month.')
      return
    }

    setSkipLoading(quest.id)

    let narratorLine = skipNarratorCache[quest.id]

    if (!narratorLine) {
      narratorLine = "You already know this one matters. Sure you want to walk away?"

      try {
        const result = await callClaude(
          SKIP_PROMPT,
          [{ role: 'user', content: JSON.stringify({
            quest: {
              domain: quest.domain,
              title: quest.title,
              difficulty: quest.difficulty,
            }
          })}],
          200
        )
        narratorLine = result.narrator_line
        setSkipNarratorCache(prev => ({ ...prev, [quest.id]: narratorLine }))
      } catch (err) {
        //console.error('Skip narrator error', err)
        Alert.alert('Error', `Something went wrong. (${ERROR_CODES.QUIZ_API_FAIL})`)
      }
    }

    setSkipLoading(null)
    setSkipModal({ quest, narratorLine })
  }

  function handleComplete(quest) {
    navigation.navigate('Debrief', { quest })
  }

  async function confirmSkip(quest) {
    const { error: questError } = await supabase
      .from('quests')
      .update({ status: 'skipped' })
      .eq('id', quest.id)

    if (questError) {
      Alert.alert('Error', questError.message)
      return
    }

    const newSkips = Math.max(0, (profile?.skips_remaining ?? 2) - 1)
    const { needsReset, slotsUsed } = getCycleStatus(profile)
    const newUsed = needsReset ? 1 : slotsUsed + 1
    const now = new Date().toISOString()
    const profileUpdates = { skips_remaining: newSkips, quest_cycle_used: newUsed }
    if (needsReset) profileUpdates.quest_cycle_start = now

    const { error: skipError } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', profile.id)

    if (skipError) {
      Alert.alert('Error', skipError.message)
      return
    }

    updateProfile(profileUpdates)
    setSkipNarratorCache(prev => {
      const updated = { ...prev }
      delete updated[quest.id]
      return updated
    })
    setQuests((prev) => prev.filter((q) => q.id !== quest.id))
    setSkipModal(null)
    setGenerating(true)

    await refreshQuests(1)

    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) { setGenerating(false); return }
    const { data: refreshed } = await supabase
      .from('quests')
      .select('*')
      .eq('status', 'active')
      .eq('user_id', user.id)
      .order('assigned_at', { ascending: true })

    setQuests(refreshed ?? [])
    setGenerating(false)
  }

  if (loading) {
    return (
      <ScreenBackground>
        <View style={styles.centered}>
          <Text style={styles.mutedText}>Loading quests...</Text>
        </View>
      </ScreenBackground>
    )
  }

  if (quests.length === 0 && !loading) {
    const { slotsRemaining, daysLeft } = getCycleStatus(profile)
    return (
      <ScreenBackground>
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No active quests.</Text>
          <Text style={styles.mutedText}>
            {slotsRemaining > 0
              ? 'Complete a quest to generate the next one.'
              : `New cycle in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}.`}
          </Text>
        </View>
      </ScreenBackground>
    )
  }

if (isDrifting) {
  const recoveryQuests = quests.filter((q) => q.is_recovery)
  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.driftContainer}>
        <Text style={styles.driftEyebrow}>DRIFT STATE</Text>
        <View style={styles.driftAccentLine} />
        <Text style={styles.driftHeadline}>Your character{'\n'}has gone still.</Text>
        <Text style={styles.driftSubtext}>
          Complete one Recovery Quest to return to the path.
        </Text>
        {recoveryQuests.map((quest) => (
          <QuestCard
            key={quest.id}
            quest={quest}
            onComplete={handleComplete}
            onSkip={() => {}}
            skipLoading={null}
            hideSkip
          />
        ))}
      </ScrollView>

      {showDriftIntro && (
        <View style={styles.modalOverlay}>
          <View style={styles.driftIntroCard}>
            <Text style={styles.driftIntroLabel}>DRIFT STATE</Text>
            <View style={styles.driftIntroAccentLine} />
            <Text style={styles.driftIntroTagline}>
              Stillness has a cost.{'\n'}Your character is paying it.
            </Text>
            <Text style={styles.driftIntroBody}>
              Your HP hit zero — not from failure, but from inaction. Quests expired. The gap between who you are and who you could be got wider.
            </Text>
            <Text style={styles.driftIntroBody}>
              Your normal quests are paused. Three Recovery Quests have taken their place. Complete one to restore your character and return to the path.
            </Text>
            <TouchableOpacity
              style={styles.driftIntroButton}
              onPress={async () => {
                setShowDriftIntro(false)
                setDriftIntroSeen(true)
                const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
                await supabase
                  .from('profiles')
                  .update({ drift_intro_seen: true })
                  .eq('id', user.id)
              }}
            >
              <Text style={styles.driftIntroButtonText}>Understood</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScreenBackground>
  )
}

  const { slotsUsed, slotsRemaining, daysLeft } = getCycleStatus(profile)

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Quest Log</Text>
        <Text style={styles.subtitle}>
          {quests.length} active {quests.length === 1 ? 'quest' : 'quests'}
        </Text>

        <View style={styles.cycleRow}>
          <View style={styles.cycleDots}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[styles.cycleDot, i < slotsRemaining ? styles.cycleDotAvailable : styles.cycleDotUsed]}
              />
            ))}
          </View>
          <Text style={styles.cycleText}>
            {slotsRemaining === 0
              ? `Resets in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`
              : `${slotsRemaining} ${slotsRemaining === 1 ? 'slot' : 'slots'} left · resets in ${daysLeft}d`}
          </Text>
          <View style={styles.cycleDivider} />
          <View style={styles.cycleDots}>
            {[0, 1].map((i) => (
              <View
                key={i}
                style={[styles.cycleDot, i < (profile?.skips_remaining ?? 0) ? styles.cycleDotAvailable : styles.cycleDotUsed]}
              />
            ))}
          </View>
          <Text style={styles.cycleText}>
            {profile?.skips_remaining ?? 0} {(profile?.skips_remaining ?? 0) === 1 ? 'skip' : 'skips'}
          </Text>
        </View>

        {quests.map((quest) => (
          <QuestCard
            key={quest.id}
            quest={quest}
            onSkip={handleSkip}
            onComplete={handleComplete}
            skipLoading={skipLoading}
          />
        ))}

        {generating && (
          <View style={styles.generatingCard}>
            <Text style={styles.generatingLabel}>NEW QUEST</Text>
            <Text style={styles.generatingText}>Generating your next quest...</Text>
          </View>
        )}
      </ScrollView>

      {skipModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalDomain}>
              {skipModal.quest.domain.toUpperCase()}
            </Text>
            <Text style={styles.modalNarrator}>{skipModal.narratorLine}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalKeepButton}
                onPress={() => setSkipModal(null)}
              >
                <Text style={styles.modalKeepText}>Keep it</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSkipButton}
                onPress={() => confirmSkip(skipModal.quest)}
              >
                <Text style={styles.modalSkipText}>Skip anyway</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.xl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  cycleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  cycleDots: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  cycleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cycleDotAvailable: {
    backgroundColor: colors.domains.Purpose,
  },
  cycleDotUsed: {
    backgroundColor: colors.border,
  },
  cycleText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    letterSpacing: typography.tracking.wide,
  },
  cycleDivider: {
    width: 1,
    height: 10,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  generatingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: spacing.xl,
    marginBottom: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  generatingLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    letterSpacing: typography.tracking.widest,
  },
  generatingText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.tracking.wide,
  },
  questTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    lineHeight: 26,
  },
  questDescription: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  timeLeft: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  xpReward: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  completeButton: {
    flex: 1,
    backgroundColor: colors.textPrimary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  completeText: {
    color: colors.background,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
  },
  skipButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  skipButtonDisabled: {
    borderColor: colors.borderSubtle,
    opacity: 0.4,
  },
  skipText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  mutedText: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    width: '100%',
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  modalDomain: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    letterSpacing: typography.tracking.widest,
    marginBottom: spacing.lg,
  },
  modalNarrator: {
    fontSize: typography.sizes.lg,
    color: colors.textPrimary,
    lineHeight: 28,
    marginBottom: spacing.xxl,
    fontWeight: typography.weights.medium,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalKeepButton: {
    flex: 1,
    backgroundColor: colors.textPrimary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  modalKeepText: {
    color: colors.background,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.md,
  },
  modalSkipButton: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  modalSkipText: {
    color: colors.textMuted,
    fontSize: typography.sizes.md,
  },
  // Drift state screen
  driftContainer: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingTop: spacing.xxl + spacing.lg,
    paddingBottom: spacing.xxl,
  },
  driftEyebrow: {
    fontSize: typography.sizes.xs,
    color: colors.danger,
    letterSpacing: typography.tracking.widest,
    marginBottom: spacing.lg,
  },
  driftAccentLine: {
    width: 32,
    height: 1.5,
    backgroundColor: colors.danger,
    marginBottom: spacing.xl,
  },
  driftHeadline: {
    fontSize: typography.sizes.xxxl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    lineHeight: 44,
    marginBottom: spacing.lg,
  },
  driftSubtext: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.xxxl,
  },

  // Drift intro modal
  driftIntroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    width: '100%',
    borderWidth: 0.5,
    borderColor: colors.danger + '40',
  },
  driftIntroLabel: {
    fontSize: typography.sizes.xs,
    color: colors.danger,
    letterSpacing: typography.tracking.widest,
    marginBottom: spacing.lg,
  },
  driftIntroAccentLine: {
    width: 32,
    height: 1.5,
    backgroundColor: colors.danger,
    marginBottom: spacing.xl,
  },
  driftIntroTagline: {
    fontSize: typography.sizes.xl,
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
    lineHeight: 32,
    marginBottom: spacing.xl,
  },
  driftIntroBody: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    lineHeight: 26,
    marginBottom: spacing.lg,
  },
  driftIntroButton: {
    backgroundColor: colors.textPrimary,
    paddingVertical: spacing.lg + 2,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  driftIntroButtonText: {
    color: colors.background,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
})