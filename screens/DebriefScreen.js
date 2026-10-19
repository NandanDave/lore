import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { useState } from 'react'
import { useAudioPlayer } from 'expo-audio'
import { supabase } from '../supabase'
import ScreenBackground from '../components/ScreenBackground'
import { colors, typography, spacing, radius } from '../constants/design'
import useStore from '../store/useStore'
import { callClaude } from '../constants/api'
import { refreshQuests, getLevelFromXp, wordCount, getCycleStatus } from '../utils'
import { ERROR_CODES } from '../constants/api'
import { useRef } from 'react'
import { AUDIO_SOURCES } from '../constants/audio'


const QUESTIONS = [
  {
    id: 1,
    question: 'Did you complete it?',
    options: ['Fully', 'Mostly', 'Barely', 'Not really'],
  },
  {
    id: 2,
    question: 'What shifted?',
    type: 'text',
    placeholder: 'One honest sentence. 15 words max.',
  },
]

const NARRATOR_PROMPT = `You are a narrator for a life RPG app. Generate a single narrator line responding to a completed quest debrief.
You will receive:
{
  "event": "complete",
  "quest": { "domain": "string", "title": "string", "difficulty": "Easy | Medium | Hard" },
  "completion": "Fully | Mostly | Barely | Not really",
  "reflection": "string — what the user said shifted"
}
Tone and style:
- Write in the spirit of powerful anime mentor moments — the emotional directness of a Haikyuu coach, the quiet precision of an Itachi observation, the weight of an Attack on Titan reckoning
- Original lines only — never quote directly from any anime. Capture the energy, not the words.
- The narrator sees the user clearly and speaks with conviction
- Short. Never more than 2 sentences. The best lines are one.
- No cynicism. No flattery. Just fire.
For "Fully": honor what they did and point them toward what comes next — they earned the moment, now push them further.
For "Mostly": acknowledge how far they came, then name the gap as the exact thing that will make them stronger if they face it.
For "Barely": make barely feel like the first rep of something — not a stumble, but a starting line they now know exists.
For "Not really": do not shame. Remind them that showing up and being honest about it is itself a form of courage — then challenge them to return.
Never use: amazing, great, proud, awesome, well done, keep it up, that's okay
Reference the domain or their reflection if it sharpens the line.
Return ONLY valid JSON:
{
  "narrator_line": "string"
}`

const DEBRIEF_PROMPT = `You are a debrief processor for a life RPG app. Read a quest debrief and decide how the user's domain score should change.

You will receive:
{
  "quest": { "domain": "string", "title": "string", "difficulty": "Easy | Medium | Hard" },
  "character": { "archetype_name": "string", "passive_traits": ["array"] },
  "completion": "Fully | Mostly | Barely | Not really",
  "reflection": "string"
}

Return ONLY valid JSON:
{
  "domain_score_delta": "integer between -5 and +15. Positive if genuine engagement. Zero if disconnected. Negative only if actively went against the domain.",
  "trait_note": "string or null — if responses reveal a new pattern, write a short factual observation under 10 words. Null if nothing notable."
}`

export default function DebriefScreen({ route, navigation }) {
  const { quest } = route.params
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [narratorLine, setNarratorLine] = useState(null)
  

  const character = useStore((state) => state.character)
  const domainScores = useStore((state) => state.domainScores)
  const setDomainScores = useStore((state) => state.setDomainScores)
  const setCharacter = useStore((state) => state.setCharacter)
  const profile = useStore((state) => state.profile)
  const setProfile = useStore((state) => state.setProfile)
  const updateProfile = useStore((state) => state.updateProfile)
  const levelUpData = useRef(null)
  const questCompletePlayer = useAudioPlayer(AUDIO_SOURCES.quest_complete)
  const isDrifting = useStore((state) => state.isDrifting)
  const setIsDrifting = useStore((state) => state.setIsDrifting)
  const pendingDriftExit = useRef(null)

  const domainColor = colors.domains[quest.domain] ?? colors.textSecondary

  function setAnswer(id, value) {
    setAnswers((prev) => ({ ...prev, [id]: value }))
  }

  function isComplete() {
    return QUESTIONS.every((q) => {
      const answer = answers[q.id]
      if (!answer || answer.trim() === '') return false
      return true
    })
  }

  async function handleSubmit() {
    setSubmitting(true)

    const { error: questError } = await supabase
      .from('quests')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', quest.id)

    if (questError) {
      Alert.alert('Error', questError.message)
      setSubmitting(false)
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user

    const { data: characterData } = await supabase
      .from('characters')
      .select('id, xp')
      .eq('user_id', user.id)
      .single()

    if (characterData) {
      const newXp = characterData.xp + quest.xp_reward
      const oldLevel = getLevelFromXp(characterData.xp).level
      const newLevel = getLevelFromXp(newXp).level
      const didLevelUp = newLevel > oldLevel

      await supabase
        .from('characters')
        .update({ xp: newXp, level: newLevel })
        .eq('id', characterData.id)
      setCharacter({ ...character, xp: newXp, level: newLevel })

      if (isDrifting && quest.is_recovery) {
        const restoredHp = 40
        await supabase
          .from('characters')
          .update({ hp: restoredHp, is_drifting: false })
          .eq('id', characterData?.id)

        await supabase
          .from('quests')
          .delete()
          .eq('user_id', user.id)
          .eq('is_recovery', true)
          .eq('status', 'active')

        // Restore paused normal quests, extending expiry to 1 day minimum
        const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        await supabase
          .from('quests')
          .update({ status: 'active' })
          .eq('user_id', user.id)
          .eq('status', 'paused')

        await supabase
          .from('quests')
          .update({ expires_at: oneDayFromNow })
          .eq('user_id', user.id)
          .eq('status', 'active')
          .or('is_recovery.is.null,is_recovery.eq.false')
          .lt('expires_at', oneDayFromNow)

        pendingDriftExit.current = { hp: restoredHp }
      }

      if (didLevelUp) {
        levelUpData.current = { newLevel }
      }

      if (profile && !quest.is_recovery) {
        const { needsReset, slotsUsed } = getCycleStatus(profile)
        const canGenerate = needsReset || slotsUsed < 3

        if (canGenerate) {
          await refreshQuests(1)
          const now = new Date().toISOString()
          const newUsed = needsReset ? 1 : slotsUsed + 1
          const updates = { quest_cycle_used: newUsed }
          if (needsReset) updates.quest_cycle_start = now
          await supabase.from('profiles').update(updates).eq('id', user.id)
          updateProfile(updates)
        }
      }
    }

    const narratorInput = {
      event: 'complete',
      quest: { domain: quest.domain, title: quest.title, difficulty: quest.difficulty },
      completion: answers[1],
      reflection: answers[2],
    }

    try {
        const narratorResult = await callClaude(
          NARRATOR_PROMPT,
          [{ role: 'user', content: JSON.stringify(narratorInput) }],
          500
        )
        setNarratorLine(narratorResult.narrator_line)
        if (AUDIO_SOURCES.quest_complete) {
          questCompletePlayer.seekTo(0)
          questCompletePlayer.volume = 0.8
          questCompletePlayer.play()
        }
      } catch (err) {
        setNarratorLine('The record stands.')
        Alert.alert('Error', `Something went wrong. (${ERROR_CODES.QUIZ_API_FAIL})`)
      } finally {
        if (pendingDriftExit.current) {
          setCharacter({ ...character, hp: pendingDriftExit.current.hp, is_drifting: false })
          setIsDrifting(false)
          pendingDriftExit.current = null
        }
      }

    const debriefInput = {
      quest: { domain: quest.domain, title: quest.title, difficulty: quest.difficulty },
      character: { archetype_name: character?.archetype_name, passive_traits: character?.passive_traits },
      completion: answers[1],
      reflection: answers[2],
    }

    try {
      const debriefResult = await callClaude(
        DEBRIEF_PROMPT,
        [{ role: 'user', content: JSON.stringify(debriefInput) }],
        500
      )

      const currentScore = typeof domainScores[quest.domain] === 'object'
        ? domainScores[quest.domain].score
        : domainScores[quest.domain] ?? 0

      const newScore = Math.max(0, Math.min(100, currentScore + debriefResult.domain_score_delta))

      await supabase
        .from('domain_scores')
        .update({ score: newScore, updated_at: new Date().toISOString() })
        .eq('character_id', characterData?.id)
        .eq('domain', quest.domain)

      const existingData = domainScores[quest.domain]
      const updatedDomainData = typeof existingData === 'object'
        ? { ...existingData, score: newScore }
        : { score: newScore, description: null }

      setDomainScores({ ...domainScores, [quest.domain]: updatedDomainData })

    } catch (err) {
      Alert.alert('Error', `Something went wrong. (${ERROR_CODES.QUIZ_API_FAIL})`)
      // debrief processing failed silently
    }

    await supabase.from('debriefs').insert({
      quest_id: quest.id,
      user_id: user.id,
      response_1: answers[1],
      response_2: answers[2],
    })

    setSubmitting(false)
  }

  if (narratorLine) {
    return (
      <ScreenBackground>
        <View style={styles.narratorContainer}>
          <Text style={styles.domainLabel}>{quest.domain.toUpperCase()}</Text>
          <Text style={styles.narratorLine}>{narratorLine}</Text>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => {
              if (levelUpData.current) {
                navigation.replace('LevelUp', levelUpData.current)
                levelUpData.current = null
              } else {
                navigation.goBack()
              }
            }}
          >
            <Text style={styles.continueText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </ScreenBackground>
    )
  }

  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.label}>MISSION DEBRIEF</Text>
          <Text style={styles.questTitle}>{quest.title}</Text>
          <View style={[styles.divider, { backgroundColor: domainColor }]} />

          {QUESTIONS.map((q) => (
            <View key={q.id} style={styles.questionBlock}>
              <Text style={styles.question}>{q.question}</Text>

              {q.options ? (
                <View style={styles.optionsRow}>
                  {q.options.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.optionButton,
                        answers[q.id] === option && {
                          borderColor: domainColor,
                          backgroundColor: domainColor + '22',
                        },
                      ]}
                      onPress={() => setAnswer(q.id, option)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          answers[q.id] === option && { color: domainColor },
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <>
                  <TextInput
                    style={styles.textInput}
                    placeholder={q.placeholder}
                    placeholderTextColor={colors.textMuted}
                    value={answers[q.id] ?? ''}
                    onChangeText={(text) => {
                      if (wordCount(text) <= 15) setAnswer(q.id, text)
                    }}
                    multiline
                  />
                  {answers[q.id] && (
                    <Text style={styles.wordCount}>
                      {wordCount(answers[q.id])} / 15 words
                    </Text>
                  )}
                </>
              )}
            </View>
          ))}

          <TouchableOpacity
            style={[styles.submitButton, !isComplete() && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={!isComplete() || submitting}
          >
            <Text style={[styles.submitText, !isComplete() && styles.submitTextDisabled]}>
              {submitting ? 'Processing...' : 'Submit Debrief'}
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
  narratorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  domainLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    letterSpacing: typography.tracking.widest,
    marginBottom: spacing.xl,
  },
  narratorLine: {
    fontSize: typography.sizes.xl,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 34,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.xxxl,
  },
  continueButton: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  continueText: {
    color: colors.textMuted,
    fontSize: typography.sizes.md,
  },
  label: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    letterSpacing: typography.tracking.widest,
    marginBottom: spacing.md,
  },
  questTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
    lineHeight: 36,
  },
  divider: {
    height: 2,
    width: 40,
    borderRadius: radius.full,
    marginBottom: spacing.xxl,
  },
  questionBlock: {
    marginBottom: spacing.xxl,
  },
  question: {
    fontSize: typography.sizes.lg,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    fontWeight: typography.weights.semibold,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  optionText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.md,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  wordCount: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
    alignSelf: 'flex-end',
  },
  submitButton: {
    backgroundColor: colors.textPrimary,
    paddingVertical: spacing.lg + 2,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitDisabled: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  submitText: {
    color: colors.background,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  submitTextDisabled: {
    color: colors.textMuted,
  },
})