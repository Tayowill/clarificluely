'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type AuthRedirectProps = {
  next?: string
}

/** Client fallback when the server has not yet seen the session cookie. */
export function AuthRedirect({ next = '/dashboard' }: AuthRedirectProps) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace(next)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace(next)
    })

    return () => subscription.unsubscribe()
  }, [next, router])

  return null
}
