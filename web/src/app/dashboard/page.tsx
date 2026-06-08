import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { DesktopConnect } from '@/components/DesktopConnect'
import { getServerUser } from '@/lib/auth-server'
import { getMacDownloadUrl } from '@/lib/downloads'
import { PLAN_LIMITS } from '@/lib/plans'
import { getUsageStats } from '@/lib/usage'

export const metadata = {
  title: 'Dashboard — Clarifi',
  robots: { index: false, follow: false },
}

export default async function DashboardPage() {
  const user = await getServerUser()
  if (!user) redirect('/sign-in?next=/dashboard')

  const stats = await getUsageStats(user.id)
  const limitLabel = Number.isFinite(stats.limit)
    ? `${stats.used} / ${stats.limit}`
    : `${stats.used} (unlimited)`
  const macDownloadUrl = getMacDownloadUrl()
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'there'

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-8 py-6 border-b border-white/10">
        <span className="text-xl font-bold">Clarifi</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/60">{user.email}</span>
          <SignOutButton />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-8 py-12">
        <h1 className="text-3xl font-bold mb-2">Welcome, {displayName}</h1>
        <p className="text-white/50 mb-10">Manage your Clarifi account and settings</p>

        <div className="grid grid-cols-3 gap-6 mb-10">
          {[
            { label: 'Plan', value: PLAN_LIMITS[stats.plan].label },
            { label: 'Sessions today', value: limitLabel },
            { label: 'Billing', value: stats.plan === 'free' ? 'Free tier' : 'Active' },
          ].map((stat) => (
            <div key={stat.label} className="p-6 border border-white/10 rounded-2xl">
              <div className="text-sm text-white/40 mb-1">{stat.label}</div>
              <div className="text-2xl font-semibold">{stat.value}</div>
            </div>
          ))}
        </div>

        <DesktopConnect />

        <div className="p-6 border border-white/10 rounded-2xl mb-6">
          <h2 className="font-semibold mb-1">Download Clarifi</h2>
          <p className="text-sm text-white/50 mb-4">
            Install the desktop app, then use Open Clarifi Desktop above to connect automatically.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={macDownloadUrl}
              download
              className="inline-block bg-white text-black px-6 py-2 rounded-lg text-sm font-medium hover:bg-white/90"
            >
              Download for macOS
            </a>
            <Link
              href="/desktop/connect"
              className="inline-block border border-white/20 px-6 py-2 rounded-lg text-sm hover:bg-white/5"
            >
              Connect after install →
            </Link>
          </div>
        </div>

        <div className="p-6 border border-white/10 rounded-2xl">
          <h2 className="font-semibold mb-1">Upgrade to Pro</h2>
          <p className="text-sm text-white/50 mb-4">
            Unlimited sessions, AI suggestions, meeting history
          </p>
          <Link
            href="/billing"
            className="inline-block border border-white/20 px-6 py-2 rounded-lg text-sm hover:bg-white/5"
          >
            View plans →
          </Link>
        </div>
      </div>
    </main>
  )
}
