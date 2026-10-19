import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Animated } from 'react-native'
import { useState, useRef, useEffect } from 'react'
import ScreenBackground from '../components/ScreenBackground'
import { colors, typography, spacing, radius } from '../constants/design'
import { supabase } from '../supabase'
import useStore from '../store/useStore'
import { callClaude, CLAUDE_SONNET, CLAUDE_HAIKU, ERROR_CODES } from '../constants/api'
import GlitchReveal from '../components/GlitchReveal'
import TerminalLoader from '../components/TerminalLoader'
import LoadingScreen from '../components/LoadingScreen'
import { KeyboardAvoidingView, Platform } from 'react-native'
import { wordCount, QUEST_PROMPT } from '../utils'

const INITIAL_STATE = {
  domains: {
    Body: { confidence: 0, score: 50 },
    Mind: { confidence: 0, score: 50 },
    Craft: { confidence: 0, score: 50 },
    Relationships: { confidence: 0, score: 50 },
    Wealth: { confidence: 0, score: 50 },
    Purpose: { confidence: 0, score: 50 },
  },
  history: [],
  total_questions_asked: 0,
}

const QUIZ_PROMPT = `You are the assessment engine for a life RPG app. 
Your role is to build an accurate psychological and behavioural 
profile of the user across six life domains through indirect, 
conversational questions. You reveal who someone is through how 
they respond to situations and gut reactions — never through 
direct self-assessment.

The experience should feel like a conversation with someone 
perceptive, not a personality test. The user should feel 
understood, not evaluated.

═══════════════════════════════════════
THE SIX DOMAINS
═══════════════════════════════════════

Body: physical health, fitness, sleep, energy, relationship 
with movement and physical discipline

Mind: mental clarity, emotional regulation, self-awareness, 
stress response, inner life quality

Craft: skills, ambition, growth mindset, relationship with 
mastery and what they are building

Relationships: depth of connections, ability to open up, 
family, friendships, social energy

Wealth: financial health, security, relationship with money, 
financial anxiety or freedom

Purpose: sense of direction, meaning, north star, clarity 
on why they do what they do

═══════════════════════════════════════
INPUT FORMAT
═══════════════════════════════════════

You will receive the current quiz state as JSON:
{
  "domains": {
    "Body": { "confidence": 0-3, "score": 0-100 },
    "Mind": { "confidence": 0-3, "score": 0-100 },
    "Craft": { "confidence": 0-3, "score": 0-100 },
    "Relationships": { "confidence": 0-3, "score": 0-100 },
    "Wealth": { "confidence": 0-3, "score": 0-100 },
    "Purpose": { "confidence": 0-3, "score": 0-100 }
  },
  "history": [
    {
      "question": "...",
      "answer": "...",
      "domain_targeted": "...",
      "was_custom": true or false
    }
  ],
  "total_questions_asked": 0
}

═══════════════════════════════════════
YOUR TASK EACH TURN
═══════════════════════════════════════

1. Read the full history — look for patterns across all 
   answers, not just the most recent one
2. Identify the domain with lowest confidence — if tied, 
   pick the one with fewest questions asked
3. Generate one question that probes that domain
4. Generate exactly 4 answer options plus a custom option
5. Update BOTH confidence AND score for ALL domains based 
   on everything in the history — answers often reveal 
   information about multiple domains simultaneously
6. Return valid JSON only — no prose, no explanation

═══════════════════════════════════════
QUESTION RULES
═══════════════════════════════════════

— Never use phrases that sound like therapy or self-help content: 
  trajectory, journey, authentic, align, resonate, sit with, 
  lean into, unpack, growth mindset, comfort zone
— Write questions the way a direct, perceptive friend would ask 
  them out loud — not the way a coach would write them in a workbook
— Never repeat a question from the history
— Never use a question that appears word for word in 
  the question bank below — the bank is a style 
  reference only, never a question pool
— Never mention domain names to the user
— Never ask anything that sounds like a personality 
  test, therapy exercise, or self-help quiz
— Every question must assume familiarity — skip 
  preamble, just ask
— Every question must point at something real that 
  exists in everyone's life and ask about it plainly
— Never telegraph what a good answer looks like
— Use the word "actually" when it adds honesty to 
  the question
— Never use these words inside the question itself: 
  feel, usually, often, tend to, typically
— Never put answer options inside the question
— Never manufacture a setting that feels staged — 
  if a scenario is used it must feel inevitable 
  not constructed
— Vary question format across the quiz. Formats:
    * Direct and plain: asks something straight 
      without scenario framing
    * Scenario with trade-off: places user in a real 
      situation with a genuine choice
    * Reflective reveal: points at something that 
      exists in everyone's life and asks about it
    * Gut reaction: asks for first instinct, 
      no overthinking
— Never use the same format twice in a row

ENDING RULE — do not output QUIZ_COMPLETE before 
total_questions_asked reaches 12, even if all domains 
reach confidence 3 earlier. The minimum quiz length 
is 12 questions.

═══════════════════════════════════════
QUESTION BANK — STYLE REFERENCE ONLY
NEVER USE THESE QUESTIONS VERBATIM
Generate new questions inspired by this tone and format
═══════════════════════════════════════

Body:
"How would you honestly describe your relationship with 
sleep right now?"
"When did you last push your body at something and feel 
good for it after?"
"How would someone who knows you well describe your 
relationship with taking care of yourself physically?"

Mind:
"When's the last time you did something just because it 
made you happy, no other reason?"
"When a decision won't leave you alone, how do you 
usually end up handling it?"
"You mess something up and it affects someone else. 
What happens inside you after?"

Craft:
"What's something you keep meaning to do but somehow 
never get around to?"
"Is there something you're genuinely trying to get 
better at right now — or has that been on pause?"
"When you imagine the work you actually want to be 
doing, how far is it from what you're doing now?"
"Last time you made something you were proud of — 
what was it and how long ago?"

Relationships:
"If your closest friend described you to someone who'd 
never met you, what do you think they'd actually say?"
"Someone you care about is clearly not okay but hasn't 
said anything. What do you do?"
"How many people in your life would notice within 48 
hours if something was genuinely wrong with you?"
"After a full day with people — even people you love 
— what do you need?"

Wealth:
"If you checked your bank account right now, what 
feeling comes up first?"
"Is money something you think about a lot, a little, 
or something you try not to think about at all?"
"Is your financial situation something you have a 
handle on, something you're working on, or something 
you'd rather not look at too closely?"
"Think about where you want to be in ten years. Does 
money feel like something that will get you there or 
something standing in the way?"

Purpose:
"There's a version of your life you think about 
sometimes — the one where you made a different call 
somewhere. How often does it show up?"
"Five years from now, same life as now. Does that 
feel okay or does something in you resist it?"
"What are you building toward right now — or is that 
a harder question than it should be?"
"Is there something you're genuinely working toward, 
or is the answer to that more complicated than 
you'd like?"
"Something you thought you wanted — a job, a 
relationship, a goal — turns out not to be what you 
expected once you have it. What do you do with that?"

Cross-domain:
"A close friend needs help moving this weekend. You 
had plans — nothing major, just your own time. 
What do you do?"
"Someone you respect gives you honest critical 
feedback about something you made. What's your 
first instinct?"

═══════════════════════════════════════
ANSWER OPTION RULES
═══════════════════════════════════════

— Exactly 4 options per question
— Each option 10 words or less
— No option should feel obviously correct or superior
— Each option must represent a genuinely different 
  type of person — not variations of the same position
— Options must feel plausible for different types of 
  people — nobody should feel forced into a wrong answer
— A fifth option always exists in the UI labelled 
  "Actually, it's more like..." which allows the user 
  to type a custom answer up to 15 words. When a custom 
  answer is received, interpret it against the scoring 
  rubric rather than mapping to a preset weight

EXAMPLE QUESTIONS AND OPTIONS — 
match this standard exactly:

"How would you honestly describe your relationship 
with sleep right now?"
A) It's fine — I sleep, I function
B) I get by — some nights are better than others
C) I prioritise it — it affects everything and I 
   treat it that way
D) I survive on less than I should and I'm used to it

"When did you last push your body at something and 
feel good for it after?"
A) Recently — that feeling is pretty familiar to me
B) A while ago — I miss it more than I act on it
C) I can't remember the last time honestly
D) I don't really push myself physically — that's 
   just not me

═══════════════════════════════════════
SCORING RUBRIC
═══════════════════════════════════════

Use this to update domain scores consistently. One 
answer can move multiple domain scores simultaneously 
if it reveals cross-domain information.

Body:
High score signals — movement is default behaviour, 
physical discipline is consistent, body and mental 
state are connected, misses exercise and genuinely 
feels the difference
Low score signals — mostly sedentary, exercise is 
aspirational not actual, energy is low, physical 
self-care has fallen off

Mind:
High score signals — sits with hard problems until 
they resolve, strong self-awareness, processes 
emotions rather than suppressing them, inner life 
is active and examined
Low score signals — avoids difficult feelings, 
reactive under pressure, poor stress response, 
little self-reflection, pushes things aside

Craft:
High score signals — actively building or learning 
something, clear relationship with mastery, 
ambitious, flow state is familiar and recent
Low score signals — coasting, no active skill 
development, not building toward anything, pride 
in work is a distant memory

Relationships:
High score signals — deep bonds exist, able to 
open up, people feel genuinely known by them, 
invests in connections, noticed quickly when 
something is wrong
Low score signals — surface level connections, 
guarded, deals with things alone, drains easily 
around people, few people would notice if 
something was wrong

Wealth:
High score signals — financially intentional, low 
money anxiety, has a rough system or plan, money 
feels like a tool not a threat
Low score signals — avoids thinking about money, 
financial stress is present, no clear system, 
money feels like something happening to them not 
something they control

Purpose:
High score signals — clear direction, knows what 
they are working toward and why, decisions feel 
values-driven, life and desired life are roughly 
aligned
Low score signals — drifting, coasting, unclear 
what they want, gap between current life and 
desired life is felt but not addressed, future 
is abstract

═══════════════════════════════════════
CONFIDENCE RULES
═══════════════════════════════════════

0 — domain has not been probed
1 — one signal received, weak read
2 — two signals, reasonable picture forming
3 — solid read, domain is complete

— Ambiguous or vague answers keep confidence at 
  current level — probe again
— Strong revealing answers can move confidence up by 1
— Custom free text answers should be interpreted 
  carefully — they often reveal more than preset options
— One answer can increase confidence in multiple 
  domains simultaneously
— Never ask more questions about a domain that has 
  reached confidence 3
— Never output QUIZ_COMPLETE before 
  total_questions_asked reaches 12

═══════════════════════════════════════
ENDING THE QUIZ
═══════════════════════════════════════

End the quiz when EITHER condition is met:
— All six domains reach confidence 3 AND 
  total_questions_asked is at least 12
— total_questions_asked reaches 18

When ending output exactly:
QUIZ_COMPLETE
Then on the next line, the final state JSON with 
all domain scores filled in.

═══════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════

{
  "question": "question text here",
  "options": [
    { "label": "option text", "value": "option_key" },
    { "label": "option text", "value": "option_key" },
    { "label": "option text", "value": "option_key" },
    { "label": "option text", "value": "option_key" }
  ],
  "domain_targeted": "Body | Mind | Craft | Relationships | Wealth | Purpose",
  "updated_state": {
    "domains": {
      "Body": { "confidence": 0-3, "score": 0-100 },
      "Mind": { "confidence": 0-3, "score": 0-100 },
      "Craft": { "confidence": 0-3, "score": 0-100 },
      "Relationships": { "confidence": 0-3, "score": 0-100 },
      "Wealth": { "confidence": 0-3, "score": 0-100 },
      "Purpose": { "confidence": 0-3, "score": 0-100 }
    },
    "history": [
      {
        "question": "...",
        "answer": "...",
        "domain_targeted": "...",
        "was_custom": true or false
      }
    ],
    "total_questions_asked": 0
  }
}

═══════════════════════════════════════
TONE
═══════════════════════════════════════

Conversational. Direct. Assumes familiarity without 
being performed. The user should feel like something 
perceptive is paying attention to them — not like 
they are filling out a form.

The single filter for every question and every option: 
would a self-aware 25 year old roll their eyes at this? 
If yes, rewrite it.`

const CHARACTER_PROMPT = `You are a character generation engine for a life RPG app.

You will receive a completed quiz result as JSON containing:
- domains: an object with six keys (Body, Mind, Craft, Relationships, Wealth, Purpose), each with confidence and score
- history: an array of {question, answer, domain_targeted, was_custom} objects

Your job is to generate a character sheet that reflects who this person actually is — not who they want to be. Be honest. Be specific. Avoid flattery.

═══════════════════════════════════════
ARCHETYPE NAME
═══════════════════════════════════════

2 to 4 words. Original and evocative. Should feel like a title that was earned, not assigned.
Do not use generic RPG archetypes like Warrior, Mage, Rogue.
Examples of the right register: The Grounded Drifter, The Careful Builder, The Reluctant Architect, The Steady Void.

═══════════════════════════════════════
ARCHETYPE DESCRIPTION
═══════════════════════════════════════

3 to 5 sentences. Second person. Present tense.

Write like a portrait, not a report. One person, one through-line.
Start with what is genuinely working — not as flattery, but as the foundation of who they are.
Then move to what sits underneath — the pattern that limits them, specific and observable.
The final sentence should land. It should be the thing they already know but haven't said out loud.

Rules:
— No contrast sentences structured as "you do X but you don't do Y"
— No bullet-point energy — each sentence must flow from the last
— No generic self-help language — growth, potential, journey, authentic
— Never mention domain names
— The tone is: someone who has been watching this person for a long time and finally said something

═══════════════════════════════════════
DOMAIN SCORES AND DESCRIPTIONS
═══════════════════════════════════════

For each domain provide:
- A score 0-100 calibrated from the quiz answers
- A 2-3 sentence description that gives: the score as context, one specific observation about this person in this domain, and the thing they haven't said out loud about it

Domain description rules:
— Specific to this person — not generic advice or observation
— Second person, present tense
— The last sentence in each domain description should say something true that they didn't explicitly say
— Never use domain names inside the descriptions
— Tone matches the archetype description — grounded, direct, honest

═══════════════════════════════════════
PASSIVE TRAITS
═══════════════════════════════════════

3 to 5 traits. Each trait has a name and a one-line description.

The name is 1-3 words, capitalised, reads like a character ability or observed pattern.
The description is one plain sentence — what a perceptive person would notice after watching them for a month.

Rules:
— No conjunctions or "but" in the description
— No clever phrasing or metaphors
— Plain, direct, observational
— The traits should feel like they belong to the same person and add up to a coherent picture

Example format:
"Forge Protocol — converts hardship into fuel rather than damage"
"Locked Vault — emotional interior rarely accessed by others"
"Sustained Output — physical and mental endurance well above average"
"Threat Sense — reads situations and people before they reveal themselves"

═══════════════════════════════════════
DRIFT PATTERN
═══════════════════════════════════════

One paragraph, 3-4 sentences. Describes what happens to this specific person when things go wrong or when they lose direction.

Not a generic warning — specific to their pattern. What does coasting look like for them? What does the gap between who they are and who they could be feel like from the inside?

Tone: the narrator describing a future state that hasn't happened yet but could. Honest, not alarming.

═══════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════

Return ONLY valid JSON in this exact shape:
{
  "archetype_name": "string",
  "archetype_description": "string",
  "domain_scores": {
    "Body": { "score": "integer 0-100", "description": "string" },
    "Mind": { "score": "integer 0-100", "description": "string" },
    "Craft": { "score": "integer 0-100", "description": "string" },
    "Relationships": { "score": "integer 0-100", "description": "string" },
    "Wealth": { "score": "integer 0-100", "description": "string" },
    "Purpose": { "score": "integer 0-100", "description": "string" }
  },
  "passive_traits": [
    { "name": "string", "description": "string" }
  ],
  "shadow_state": "string",
  "hp": 100,
  "xp": 0,
  "level": 1
}

Do not output anything outside the JSON object. No preamble. No explanation.`

export default function QuizScreen() {
  const [quizState, setQuizState] = useState(INITIAL_STATE)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [selectedOption, setSelectedOption] = useState(null)
  const [customAnswer, setCustomAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [glitchData, setGlitchData] = useState(null)
  const [quizStarted, setQuizStarted] = useState(false)

  const setCharacter = useStore((state) => state.setCharacter)
  const setDomainScores = useStore((state) => state.setDomainScores)
  const profile = useStore((state) => state.profile)
  const setProfile = useStore((state) => state.setProfile)
  const updateProfile = useStore((state) => state.updateProfile)

  const startAnims = useRef(
    Array.from({ length: 2 }, () => new Animated.Value(0))
  ).current

  useEffect(() => {
    Animated.stagger(
      120,
      startAnims.map((v) =>
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

async function fetchNextQuestion(state, retryCount = 0) {
    setQuizStarted(true)
    setLoading(true)
    setSelectedOption(null)
    setCustomAnswer('')

    const model = questionNumber < 4 ? CLAUDE_SONNET : CLAUDE_HAIKU

    try {
      const deduplicatedHistory = state.history.filter(
        (item, index, self) =>
          index === self.findIndex((h) => h.question === item.question)
      )

      const deduplicatedState = {
        ...state,
        history: deduplicatedHistory,
        total_questions_asked: deduplicatedHistory.length,
      }

      const completedDomains = Object.entries(deduplicatedState.domains)
        .filter(([_, data]) => data.confidence >= 3)
        .map(([domain]) => domain)

      const stateWithGuidance = {
        ...deduplicatedState,
        completed_domains: completedDomains,
        instruction: completedDomains.length > 0
          ? `DO NOT ask about these domains — they are complete: ${completedDomains.join(', ')}`
          : null
      }

      const result = await callClaude(
        QUIZ_PROMPT,
        [{ role: 'user', content: JSON.stringify(stateWithGuidance) }],
        2000,
        model
      )
      
      if (result.quiz_complete) {
        await generateCharacter(result.final_state)
        return
      }

      setCurrentQuestion(result)
      setQuizState({
        ...result.updated_state,
        total_questions_asked: quizState.total_questions_asked,
      })
      setQuestionNumber(prev => prev + 1)

    } catch (err) {
      
      if (retryCount < 3) {
        
        const delay = (retryCount + 1) * 3000
        await new Promise(resolve => setTimeout(resolve, delay))
        return fetchNextQuestion(state, retryCount + 1)
      }
      Alert.alert('Error', `Something went wrong. (${ERROR_CODES.QUIZ_API_FAIL})`)
    }

    setLoading(false)
  }

async function handleSubmit() {
    const isCustom = customAnswer.trim() !== ''
    const answer = isCustom ? customAnswer.trim() : selectedOption?.label
    if (!answer) return

    const newQuestionNumber = questionNumber + 1

    const updatedHistory = [
      ...quizState.history,
      {
        question: currentQuestion.question,
        answer,
        domain_targeted: currentQuestion.domain_targeted,
        was_custom: isCustom,
      }
    ]

    const updatedState = {
      ...quizState,
      history: updatedHistory,
      total_questions_asked: newQuestionNumber,
    }

    setQuizState(updatedState)

    if (newQuestionNumber >= 18) {
      await generateCharacter(updatedState)
      return
    }

    await fetchNextQuestion(updatedState)
  }

  async function generateCharacter(finalQuizState) {
    setLoading(true)

    try {
      const character = await callClaude(
        CHARACTER_PROMPT,
        [{ role: 'user', content: JSON.stringify(finalQuizState) }],
        2000
      ) 
      

      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) {
        Alert.alert('Session expired', 'Please log in again.')
        setLoading(false)
        return
      }

      const { data: characterData, error: characterError } = await supabase
        .from('characters')
        .insert({
          user_id: user.id,
          archetype_name: character.archetype_name,
          archetype_description: character.archetype_description,
          hp: character.hp,
          xp: character.xp,
          level: character.level,
          passive_traits: character.passive_traits,
          shadow_state: character.shadow_state,
        })
        .select()
        .single()

      if (characterError) {
        Alert.alert('Error', characterError.message)
        setLoading(false)
        return
      }

      const domainInserts = Object.entries(character.domain_scores).map(([domain, data]) => ({
        character_id: characterData.id,
        domain,
        score: data.score,
        description: data.description,
      }))

      const { error: domainError } = await supabase
        .from('domain_scores')
        .insert(domainInserts)

      if (domainError) {
        Alert.alert('Error', domainError.message)
        setLoading(false)
        return
      }

      const scores = {}
      Object.entries(character.domain_scores).forEach(([domain, data]) => {
        scores[domain] = data.score
      })
      setCharacter({ ...character, shadow_state: character.shadow_state })
      setDomainScores(scores)

      generateQuests(character, character.domain_scores, characterData.id)
      setGlitchData({ character, scores })

    } catch (err) {
      Alert.alert('Error', `Something went wrong. (${ERROR_CODES.QUIZ_API_FAIL})`)
      setLoading(false)
    }
  }

  async function generateQuests(character, domainScores, characterId) {
    try {
      const questInput = {
        archetype_name: character.archetype_name,
        passive_traits: character.passive_traits,
        domain_scores: domainScores,
        active_quest_domains: [],
        recent_completed_domains: [],
        is_premium: false,
        count: 3,
      }

      const result = await callClaude(
        QUEST_PROMPT,
        [{ role: 'user', content: JSON.stringify(questInput) }],
        2000
      )

      const { data: { session: questSession } } = await supabase.auth.getSession()
      const user = questSession?.user
      if (!user) return

      const questInserts = result.quests.map((quest) => ({
        user_id: user.id,
        domain: quest.domain,
        title: quest.title,
        description: quest.description,
        difficulty: quest.difficulty,
        xp_reward: quest.xp_reward,
        hp_penalty: quest.hp_penalty,
        status: 'active',
        assigned_at: new Date().toISOString(),
        expires_at: new Date(
          Date.now() + quest.duration_days * 24 * 60 * 60 * 1000
        ).toISOString(),
      }))

      await supabase.from('quests').insert(questInserts)

      const cycleStart = new Date().toISOString()
      const cycleInit = { quest_cycle_start: cycleStart, quest_cycle_used: 0, skips_remaining: 2 }
      await supabase.from('profiles').update(cycleInit).eq('id', user.id)
      updateProfile(cycleInit)

    } catch (err) {
      Alert.alert('Error', `Something went wrong. (${ERROR_CODES.QUIZ_API_FAIL})`)
    }
  }

    if (glitchData) {
      
      return (
        <ScreenBackground>
          <GlitchReveal
            character={glitchData.character}
            domainScores={glitchData.scores}
            onComplete={async () => {
              const { data: { session: glitchSession } } = await supabase.auth.getSession()
              const user = glitchSession?.user
              if (!user) return
              await supabase
                .from('profiles')
                .update({ onboarding_complete: true })
                .eq('id', user.id)
              updateProfile({ onboarding_complete: true })
              setGlitchData(null)
            }}
          />
        </ScreenBackground>
      )
    }

    if (loading) {
    return <LoadingScreen />
  }

    if (!currentQuestion && !loading && !quizStarted) {
    return (
      <ScreenBackground>
        <View style={styles.startContainer}>
          <Animated.View style={[styles.startContent, fadeUp(startAnims[0])]}>
            <View style={styles.startAccentLine} />
            <Text style={styles.startEyebrow}>ASSESSMENT</Text>
            <Text style={styles.startTitle}>Before we{'\n'}begin.</Text>
            <Text style={styles.startSubtitle}>Answer honestly.{'\n'}This only works if you do.</Text>
          </Animated.View>
          <Animated.View style={fadeUp(startAnims[1])}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => fetchNextQuestion(INITIAL_STATE)}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Begin</Text>
            </TouchableOpacity>
          </Animated.View>
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
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.progressRow}>
          <Text style={styles.questionNumber}>{String(questionNumber).padStart(2, '0')}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, {
              width: `${Math.min(
                Object.values(quizState.domains).reduce((sum, d) => sum + d.confidence, 0) / 18 * 100,
                100
              )}%`
            }]} />
          </View>
        </View>

        <Text style={styles.question}>{currentQuestion.question}</Text>

        <View style={styles.options}>
          {(currentQuestion.options ?? []).map((option, index) => {
            const isSelected = selectedOption?.value === option.value
            return (
              <TouchableOpacity
                key={index}
                style={[styles.option, isSelected && styles.optionSelected]}
                onPress={() => {
                  setSelectedOption(option)
                  setCustomAnswer('')
                }}
                activeOpacity={0.75}
              >
                <View style={[styles.optionBadge, isSelected && styles.optionBadgeSelected]}>
                  <Text style={[styles.optionBadgeText, isSelected && styles.optionBadgeTextSelected]}>
                    {String.fromCharCode(65 + index)}
                  </Text>
                </View>
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={styles.divider} />

        <View style={styles.customAnswerSection}>
          <Text style={styles.orText}>Actually, it's more like...</Text>
          <TextInput
            style={[
              styles.input,
              customAnswer.trim() !== '' && styles.inputActive,
            ]}
            placeholder="Your answer (15 words max)"
            placeholderTextColor={colors.textMuted}
            value={customAnswer}
            onChangeText={(text) => {
              if (wordCount(text) <= 15) {
                setCustomAnswer(text)
                setSelectedOption(null)
              }
            }}
            multiline
          />
          {customAnswer.trim() !== '' && (
            <Text style={styles.wordCount}>{wordCount(customAnswer)} / 15</Text>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            (!selectedOption && customAnswer.trim() === '') && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!selectedOption && customAnswer.trim() === ''}
          activeOpacity={0.85}
        >
          <Text style={[
            styles.primaryButtonText,
            (!selectedOption && customAnswer.trim() === '') && styles.buttonTextDisabled,
          ]}>
            Next
          </Text>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  )
  
}

const styles = StyleSheet.create({
  // ── Start screen ────────────────────────────────────────────────────────────
  startContainer: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: 48,
    paddingBottom: spacing.xxl,
    justifyContent: 'space-between',
  },
  startContent: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: spacing.xxl,
  },
  startAccentLine: {
    width: 32,
    height: 1.5,
    backgroundColor: colors.domains.Purpose,
    marginBottom: spacing.lg,
  },
  startEyebrow: {
    fontSize: typography.sizes.xs,
    letterSpacing: typography.tracking.widest,
    color: colors.textMuted,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.md,
  },
  startTitle: {
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    lineHeight: 50,
    marginBottom: spacing.xl,
  },
  startSubtitle: {
    fontSize: typography.sizes.lg,
    color: colors.textSecondary,
    lineHeight: typography.sizes.lg * 1.6,
  },

  // ── Main quiz ────────────────────────────────────────────────────────────────
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: 48,
    paddingBottom: spacing.xxl,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  questionNumber: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.tracking.wide,
  },
  progressBar: {
    flex: 1,
    height: 2,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.domains.Purpose,
    borderRadius: radius.full,
  },
  question: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    lineHeight: typography.sizes.xxl * 1.35,
    marginBottom: spacing.xxl,
  },
  options: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    borderColor: colors.domains.Purpose,
    backgroundColor: colors.domains.Purpose + '0d',
  },
  optionBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  optionBadgeSelected: {
    borderColor: colors.domains.Purpose,
    backgroundColor: colors.domains.Purpose + '20',
  },
  optionBadgeText: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  optionBadgeTextSelected: {
    color: colors.domains.Purpose,
  },
  optionText: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    lineHeight: typography.sizes.md * 1.5,
  },
  optionTextSelected: {
    color: colors.textPrimary,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  customAnswerSection: {
    marginBottom: spacing.xl,
  },
  orText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    letterSpacing: typography.tracking.wide,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    minHeight: 80,
    textAlignVertical: 'top',
    lineHeight: typography.sizes.md * 1.5,
  },
  inputActive: {
    borderColor: colors.domains.Purpose,
  },
  wordCount: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing.xs,
  },

  // ── Shared buttons ───────────────────────────────────────────────────────────
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
  buttonDisabled: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  buttonTextDisabled: {
    color: colors.textMuted,
  },
})