import Link from 'next/link'
import { notFound } from 'next/navigation'
import '../../landing-blog.css'

const POSTS: Record<string, { title: string; date: string; readTime: string; body: string[] }> = {
  'undetectable-ai-meetings': {
    title: 'Why undetectable AI changes how you run meetings',
    date: 'May 28, 2026',
    readTime: '6 min read',
    body: [
      'Most meeting AI tools join as a visible participant or produce notes only after you hang up. Clarifi is different: it runs as a lightweight overlay on your Mac, listening and assisting in real time without ever appearing on the guest list.',
      'That means no awkward "Clarifi bot has joined" moments. No extra tile in Zoom. Your clients and colleagues see only you — while you get live suggestions, answers, and transcription.',
      'Screen share invisibility is equally important. When you share your screen, Clarifi stays hidden from the recording. Only you see the overlay.',
    ],
  },
  'real-time-vs-after': {
    title: 'Real-time AI vs. after-the-call notetakers',
    date: 'May 15, 2026',
    readTime: '4 min read',
    body: [
      'After-the-call summaries are great for documentation. But the highest-stakes moment in any meeting is when someone asks a question you did not expect — and you have three seconds to respond.',
      'Real-time AI closes that gap. Clarifi surfaces talking points, follow-up questions, and factual answers while the conversation is still happening.',
      'The result: you sound prepared even when you are not. And you still get beautiful notes when the call ends.',
    ],
  },
  'clarifi-launch': {
    title: 'Introducing Clarifi for Mac',
    date: 'Jun 1, 2026',
    readTime: '3 min read',
    body: [
      'Today we are launching Clarifi for Mac — an invisible AI co-pilot for every meeting.',
      'Download from our website, sign in, and connect your desktop app in one click. No API keys, no pairing codes, no bots.',
      'We are starting with macOS and building mobile next. Try it free on your next call.',
    ],
  },
}

type PageProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const post = POSTS[slug]
  if (!post) return { title: 'Blog — Clarifi' }
  return { title: `${post.title} — Clarifi Blog` }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = POSTS[slug]
  if (!post) notFound()

  return (
    <div className="blog-root">
      <nav className="blog-nav">
        <Link href="/" className="blog-logo">
          <span className="blog-logo-icon">✦</span>
          Clarifi
        </Link>
        <div className="blog-nav-links">
          <Link href="/blog">← Blog</Link>
        </div>
      </nav>
      <article className="blog-post">
        <h1>{post.title}</h1>
        <p className="blog-post-meta">
          {post.date} · {post.readTime}
        </p>
        {post.body.map((para) => (
          <p key={para.slice(0, 24)}>{para}</p>
        ))}
      </article>
    </div>
  )
}
