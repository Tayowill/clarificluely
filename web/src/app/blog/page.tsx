import Link from 'next/link'
import { BlogNav } from '@/components/blog/BlogNav'
import '../landing-blog.css'

const POSTS = [
  {
    slug: 'undetectable-ai-meetings',
    title: 'Why undetectable AI changes how you run meetings',
    excerpt:
      'Real-time assistance without bots, without screen-share leaks, and without breaking flow.',
    date: 'May 28, 2026',
    readTime: '6 min read',
  },
  {
    slug: 'real-time-vs-after',
    title: 'Real-time AI vs. after-the-call notetakers',
    excerpt:
      'Post-meeting summaries are useful — but they cannot help you in the moment you need it most.',
    date: 'May 15, 2026',
    readTime: '4 min read',
  },
  {
    slug: 'clarifi-launch',
    title: 'Introducing Clarifi for Mac',
    excerpt:
      'Your invisible co-pilot for every conversation. Download free and connect in one click.',
    date: 'Jun 1, 2026',
    readTime: '3 min read',
  },
]

export const metadata = {
  title: 'Blog — Clarifi',
  description: 'News, guides, and product updates from the Clarifi team.',
  alternates: { canonical: '/blog' },
}

export default function BlogPage() {
  return (
    <div className="blog-root">
      <BlogNav />

      <header className="blog-header">
        <h1>Blog</h1>
        <p>Product updates, meeting tips, and how to get the most from Clarifi.</p>
      </header>

      <div className="blog-grid">
        {POSTS.map((post) => (
          <article key={post.slug} className="blog-card">
            <p className="blog-card-meta">
              {post.date} · {post.readTime}
            </p>
            <h2>
              <Link href={`/blog/${post.slug}`}>{post.title}</Link>
            </h2>
            <p className="blog-card-excerpt">{post.excerpt}</p>
            <Link href={`/blog/${post.slug}`} className="blog-card-link">
              Read more →
            </Link>
          </article>
        ))}
      </div>

      <footer className="blog-footer">
        <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
          AI that helps you, invisibly.
        </p>
        <Link href="/">← Back to home</Link>
      </footer>
    </div>
  )
}
