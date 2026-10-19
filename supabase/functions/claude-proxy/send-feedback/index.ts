import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await userClient.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 })
    }

    const { category, message, context } = await req.json()

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const TO_EMAIL = Deno.env.get('FEEDBACK_EMAIL')

    const contextLines = Object.entries(context ?? {})
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')

    const body = `
CATEGORY: ${category}

MESSAGE:
${message}

---
APP CONTEXT:
${contextLines}
    `.trim()

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Lore Feedback <onboarding@resend.dev>',
        to: TO_EMAIL,
        subject: `[Lore Feedback] ${category}`,
        text: body,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return new Response(JSON.stringify({ error: err }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})