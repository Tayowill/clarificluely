import type { SupabaseClient } from '@supabase/supabase-js'

export async function joinWaitlist(
  supabase: SupabaseClient,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user?.email) {
    return { ok: false, error: 'not_authenticated' }
  }

  const { error } = await supabase.from('waitlist_signups').upsert(
    {
      user_id: user.id,
      email: user.email,
    },
    { onConflict: 'user_id' },
  )

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true }
}
