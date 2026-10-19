import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: characters } = await adminClient
      .from('characters')
      .select('id')
      .eq('user_id', user.id)

    if (characters?.length) {
      await adminClient
        .from('domain_scores')
        .delete()
        .in('character_id', characters.map((c) => c.id))
    }

    await adminClient.from('characters').delete().eq('user_id', user.id)
    await adminClient.from('quests').delete().eq('user_id', user.id)
    await adminClient.from('profiles').delete().eq('id', user.id)

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)
    if (deleteError) {
      return Response.json({ error: deleteError.message }, { status: 500 })
    }

    return Response.json({ success: true }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
})
