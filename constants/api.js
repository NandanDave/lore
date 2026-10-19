import { supabase } from '../supabase'

export const CLAUDE_SONNET = 'claude-sonnet-4-6'
export const CLAUDE_HAIKU = 'claude-haiku-4-5-20251001'
export const ERROR_CODES = {
  QUIZ_JSON_PARSE: 'ERR_001',
  QUIZ_API_FAIL: 'ERR_002', 
  CHARACTER_API_FAIL: 'ERR_003',
  CHARACTER_DB_FAIL: 'ERR_004',
  QUEST_API_FAIL: 'ERR_005',
  QUEST_DB_FAIL: 'ERR_006',
  DEBRIEF_API_FAIL: 'ERR_007',
  NARRATOR_API_FAIL: 'ERR_008',
  SKIP_API_FAIL: 'ERR_009',
}

export async function callClaude(system, messages, max_tokens = 1000, model = CLAUDE_SONNET) {
  const { data: { session } } = await supabase.auth.getSession()

  const response = await fetch(
    'https://iaacctqzmvkysdzwhhvy.supabase.co/functions/v1/claude-proxy',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': 'sb_publishable_JedKWmaQ6m39RtrQBEaZOA_ivonEydT',
      },
      body: JSON.stringify({
        model,
        max_tokens,
        system,
        messages,
      }),
    }
  )

  const data = await response.json()

  if (!data.content || !data.content[0]) {
    throw new Error(data.error?.message ?? 'No response from AI')
  }

  const text = data.content[0].text
  const cleanText = text.replace(/```json\n?|\n?```/g, '').trim()

  if (cleanText.startsWith('QUIZ_COMPLETE')) {
      const jsonStr = cleanText.replace('QUIZ_COMPLETE', '').trim()
      return { quiz_complete: true, final_state: JSON.parse(jsonStr) }
    }

    const parsed = JSON.parse(cleanText)

    if (parsed.status === 'QUIZ_COMPLETE' || parsed.quiz_complete) {
      return { quiz_complete: true, final_state: parsed.final_state ?? parsed }
    }

    return parsed

}