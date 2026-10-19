import { supabase } from './supabase'
import { callClaude } from './constants/api'

const CYCLE_DAYS = 7
const CYCLE_SLOTS = 3

export function getCycleStatus(profile) {
  const cycleStart = profile?.quest_cycle_start ? new Date(profile.quest_cycle_start) : null

  if (!cycleStart) {
    return { needsReset: true, slotsUsed: 0, slotsRemaining: CYCLE_SLOTS, daysLeft: 0 }
  }

  const cycleEndMs = cycleStart.getTime() + CYCLE_DAYS * 24 * 60 * 60 * 1000
  const now = Date.now()
  const needsReset = now >= cycleEndMs
  const daysLeft = Math.max(0, Math.ceil((cycleEndMs - now) / (24 * 60 * 60 * 1000)))
  const slotsUsed = profile?.quest_cycle_used ?? 0

  return { needsReset, slotsUsed, slotsRemaining: Math.max(0, CYCLE_SLOTS - slotsUsed), daysLeft }
}

export function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

// XP needed to reach next level = currentLevel * 500
// Level 1→2: 500 XP, Level 2→3: 1000 XP, Level 3→4: 1500 XP, etc.
export function getLevelFromXp(totalXp) {
  let level = 1
  let xpRequired = 500
  let xpAccumulated = 0

  while (totalXp >= xpAccumulated + xpRequired) {
    xpAccumulated += xpRequired
    level++
    xpRequired = level * 500
  }

  return {
    level,
    currentLevelXp: totalXp - xpAccumulated,
    nextLevelXp: xpRequired,
    totalXp,
  }
}

export const QUEST_PROMPT = `You are a quest generation engine for a life RPG app.

You will receive a character state as JSON:
{
  "archetype_name": "string",
  "passive_traits": ["array"],
  "domain_scores": { "Body": int, "Mind": int, "Craft": int, "Relationships": int, "Wealth": int, "Purpose": int },
  "active_quest_domains": ["domains already covered by active quests — do not duplicate"],
  "recent_completed_domains": ["domains of last 3 completed quests — deprioritise these"],
  "is_premium": boolean,
  "count": integer
}

Generate exactly the number of quests specified in count. Prioritise the domains with the lowest scores. Do not generate quests for domains already in active_quest_domains.

Each quest must be:
- Grounded and specific — a real action in the real world, not a vague aspiration
- Completable within 3 to 7 days
- Honest about what it is — do not dress up hard things

Difficulty rules:
- If domain score is below 35: generate Easy quests for that domain
- If domain score is 35–65: Medium
- If domain score is above 65: Hard

Return ONLY valid JSON in this exact shape:
{
  "quests": [
    {
      "domain": "string",
      "title": "string — 4 to 7 words, plain language, no fluff",
      "description": "string — 2 to 4 sentences. Speak directly to the user. Say what to do, why it matters for them specifically, and what done looks like. Tone: honest friend who knows you well.",
      "difficulty": "Easy | Medium | Hard",
      "xp_reward": "integer — Easy: 50–80, Medium: 100–150, Hard: 180–250",
      "hp_penalty": "integer — Easy: 5, Medium: 10, Hard: 20",
      "duration_days": "integer 3 to 7"
    }
  ]
}

Do not output anything outside the JSON object.`

const RECOVERY_QUEST_PROMPT = `You are a quest generation engine for a life RPG app. The user has entered a Drift State — their character has lost all HP by failing to complete quests.

You will receive a character state as JSON:
{
  "archetype_name": "string",
  "passive_traits": ["array"],
  "domain_scores": { "Body": int, "Mind": int, "Craft": int, "Relationships": int, "Wealth": int, "Purpose": int }
}

Generate exactly 3 Recovery Quests. These are harder than normal quests and target the user's weakest domains.

Each quest must be:
- Grounded and specific — a real action in the real world, not a vague aspiration
- Completable within 3 to 7 days
- Honest about what it is — do not dress up hard things

Rules:
- Each quest must target a different domain
- Prioritise the 3 lowest scoring domains
- All quests are Hard difficulty regardless of domain score
- Tone is direct and honest — the user needs to face something real

Return ONLY valid JSON:
{
  "quests": [
    {
      "domain": "string",
      "title": "string — 4 to 7 words, plain language",
      "description": "string — 2 to 4 sentences. Direct tone. What to do and why it matters right now.",
      "difficulty": "Hard",
      "xp_reward": 250,
      "hp_reward": 30,
      "duration_days": 99
    }
  ]
}`

export async function generateRecoveryQuests(userId, characterId) {
  try {
    const { data: character } = await supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .single()

    if (!character) return false

    const { data: domainData } = await supabase
      .from('domain_scores')
      .select('*')
      .eq('character_id', characterId)

    const domainScores = {}
    domainData?.forEach((row) => { domainScores[row.domain] = row.score })

    const result = await callClaude(
      RECOVERY_QUEST_PROMPT,
      [{ role: 'user', content: JSON.stringify({
        archetype_name: character.archetype_name,
        passive_traits: character.passive_traits,
        domain_scores: domainScores,
      })}],
      2000
    )

    // Pause active normal quests so they don't expire during drift
  await supabase
    .from('quests')
    .update({ status: 'paused' })
    .eq('user_id', userId)
    .eq('status', 'active')
    .or('is_recovery.is.null,is_recovery.eq.false')

  const recoveryInserts = result.quests.map((quest) => ({
      user_id: userId,
      domain: quest.domain,
      title: quest.title,
      description: quest.description,
      difficulty: 'Hard',
      xp_reward: 250,
      hp_penalty: 0,
      status: 'active',
      assigned_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 99 * 24 * 60 * 60 * 1000).toISOString(),
      is_recovery: true,
    }))

    await supabase.from('quests').insert(recoveryInserts)

    return true
  } catch (err) {
    //console.error('generateRecoveryQuests error', err)
    return false
  }
}

export async function processExpiredQuests() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user

    const now = new Date().toISOString()

    const { data: expiredQuests } = await supabase
      .from('quests')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .lt('expires_at', now)

    if (!expiredQuests || expiredQuests.length === 0) return { driftTriggered: false }

    const { data: characterData } = await supabase
      .from('characters')
      .select('id, hp, is_drifting')
      .eq('user_id', user.id)
      .single()

    if (!characterData) return { driftTriggered: false }

    const expiredIds = expiredQuests.map((q) => q.id)
    await supabase
      .from('quests')
      .update({ status: 'expired', completed_at: new Date().toISOString() })
      .in('id', expiredIds)

    const hpPenalty = expiredQuests.reduce((sum, q) => sum + (q.hp_penalty ?? 10), 0)
    const newHp = Math.max(0, characterData.hp - hpPenalty)
    const shouldDrift = newHp <= 0 && !characterData.is_drifting

    await supabase
      .from('characters')
      .update({
        hp: newHp,
        is_drifting: shouldDrift ? true : characterData.is_drifting,
      })
      .eq('id', characterData.id)

    if (shouldDrift) {
      await generateRecoveryQuests(user.id, characterData.id)
      return { driftTriggered: true, newHp: 0 }
    }

    return { driftTriggered: false, newHp }

  } catch (err) {
    //console.error('processExpiredQuests error', err)
    return { driftTriggered: false }
  }
}

export async function refreshQuests(count = 1) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user

    const { data: character } = await supabase
      .from('characters')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!character) return

    const { data: domainData } = await supabase
      .from('domain_scores')
      .select('*')
      .eq('character_id', character.id)

    const domainScores = {}
    domainData?.forEach((row) => {
      domainScores[row.domain] = row.score
    })

    const { data: activeQuests } = await supabase
      .from('quests')
      .select('domain, is_recovery')
      .eq('user_id', user.id)
      .eq('status', 'active')

    const { data: recentQuests } = await supabase
      .from('quests')
      .select('domain')
      .eq('user_id', user.id)
      .in('status', ['completed', 'skipped'])
      .order('completed_at', { ascending: false })
      .limit(3)

    let occupiedDomains = new Set(
      activeQuests?.filter((q) => !q.is_recovery).map((q) => q.domain) ?? []
    )
    const recentCompletedDomains = recentQuests?.map((q) => q.domain) ?? []

    const allQuests = []
    let remaining = count
    let attempts = 0
    const maxAttempts = 4

    while (remaining > 0 && attempts < maxAttempts) {
      attempts++

      const questInput = {
        archetype_name: character.archetype_name,
        passive_traits: character.passive_traits,
        domain_scores: domainScores,
        active_quest_domains: Array.from(occupiedDomains),
        recent_completed_domains: recentCompletedDomains,
        is_premium: false,
        count: remaining,
      }

      const result = await callClaude(
        QUEST_PROMPT,
        [{ role: 'user', content: JSON.stringify(questInput) }],
        2000
      )

      for (const quest of result.quests ?? []) {
        if (allQuests.length >= count) break
        if (occupiedDomains.has(quest.domain)) continue

        allQuests.push(quest)
        occupiedDomains.add(quest.domain)
      }

      remaining = count - allQuests.length
    }

    if (allQuests.length === 0) return false

    const questInserts = allQuests.map((quest) => ({
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

    return true

  } catch (err) {
    //console.error('Quest refresh error', err)
    return false
  }
}