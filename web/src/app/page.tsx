import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-8 py-6 border-b border-white/10">
        <span className="text-xl font-bold tracking-tight">Clarifi</span>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm text-white/60 hover:text-white">
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="text-sm bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-white/90"
          >
            Get started free
          </Link>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-8 pt-24 pb-16 text-center">
        <div className="inline-block text-xs bg-white/10 border border-white/20 rounded-full px-3 py-1 mb-6">
          AI-powered meeting assistant
        </div>
        <h1 className="text-6xl font-bold tracking-tight mb-6 leading-tight">
          Your AI co-pilot
          <br />
          in every meeting
        </h1>
        <p className="text-xl text-white/60 mb-10 max-w-2xl mx-auto">
          Clarifi listens to your conversations and suggests exactly what to say next —
          invisibly, in real time.
        </p>
        <Link
          href="/sign-up"
          className="inline-block bg-white text-black px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/90 transition"
        >
          Try free — no credit card
        </Link>
        <p className="text-sm text-white/30 mt-4">
          Works on macOS · Invisible to screen share
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-8 py-16 grid grid-cols-3 gap-8">
        {[
          {
            icon: '🎙️',
            title: 'Real-time transcription',
            desc: 'Captures both sides of your conversation instantly',
          },
          {
            icon: '🤖',
            title: 'AI suggestions',
            desc: 'Claude suggests what to say next based on context',
          },
          {
            icon: '👁️',
            title: 'Completely invisible',
            desc: 'Hidden from Zoom, Meet, Teams screen sharing',
          },
        ].map((f) => (
          <div key={f.title} className="p-6 border border-white/10 rounded-2xl">
            <div className="text-3xl mb-4">{f.icon}</div>
            <h3 className="font-semibold mb-2">{f.title}</h3>
            <p className="text-sm text-white/50">{f.desc}</p>
          </div>
        ))}
      </section>

      <section className="max-w-4xl mx-auto px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Simple pricing</h2>
        <div className="grid grid-cols-3 gap-6">
          {[
            {
              name: 'Free',
              price: '$0',
              period: 'forever',
              features: ['5 sessions/day', 'Mic transcription', 'Basic suggestions'],
              cta: 'Get started',
              href: '/sign-up',
              highlight: false,
            },
            {
              name: 'Pro',
              price: '$20',
              period: '/month',
              features: [
                'Unlimited sessions',
                'AI suggestions',
                'Meeting history',
                'Playbook editor',
              ],
              cta: 'Start Pro',
              href: '/sign-up?plan=pro',
              highlight: true,
            },
            {
              name: 'Pro+',
              price: '$75',
              period: '/month',
              features: [
                'Everything in Pro',
                'System audio capture',
                'Priority support',
                'Early features',
              ],
              cta: 'Start Pro+',
              href: '/sign-up?plan=proplus',
              highlight: false,
            },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`p-6 rounded-2xl border ${
                plan.highlight ? 'border-white bg-white/5' : 'border-white/10'
              }`}
            >
              {plan.highlight && (
                <div className="text-xs bg-white text-black rounded-full px-3 py-1 inline-block mb-4 font-medium">
                  Most popular
                </div>
              )}
              <div className="text-2xl font-bold mb-1">{plan.price}</div>
              <div className="text-sm text-white/40 mb-6">{plan.period}</div>
              <div className="font-medium mb-4">{plan.name}</div>
              <ul className="space-y-2 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="text-sm text-white/60 flex items-center gap-2">
                    <span className="text-green-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={`block text-center py-3 rounded-xl text-sm font-medium transition ${
                  plan.highlight
                    ? 'bg-white text-black hover:bg-white/90'
                    : 'border border-white/20 hover:bg-white/5'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
