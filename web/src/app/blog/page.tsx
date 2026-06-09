import Image from 'next/image'
import Link from 'next/link'
import { MarketingNav } from '@/components/marketing/MarketingNav'
import { BLOG_POSTS } from '@/lib/blog-posts'
import '../landing-blog.css'

export const metadata = {
  title: 'Blog — Clarifi',
  description:
    'Sales tips, meeting AI guides, and product updates from Clarifi — the invisible real-time co-pilot for every call.',
  alternates: { canonical: '/blog' },
}

export default function BlogPage() {
  return (
    <div className="blog-root">
      <MarketingNav active="blog" showBack />

      <header className="blog-header">
        <h1>Blog</h1>
        <p>Product updates, meeting tips, and how to get the most from Clarifi.</p>
      </header>

      <div className="blog-grid">
        {BLOG_POSTS.map((post) => (
          <article key={post.slug} className="blog-card blog-card-featured">
            <Link href={`/blog/${post.slug}`} className="blog-card-image-link">
              <Image
                src={post.image}
                alt={post.imageAlt}
                width={900}
                height={506}
                className="blog-card-image"
              />
            </Link>
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
