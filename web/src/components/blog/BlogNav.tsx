import Image from 'next/image'
import Link from 'next/link'
import '@/app/landing-blog.css'

type BlogNavProps = {
  ctaVariant?: 'blue' | 'pink'
}

export function BlogNav({ ctaVariant = 'blue' }: BlogNavProps) {
  return (
    <nav className="blog-nav">
      <Link href="/" className="blog-logo">
        <span className="blog-logo-icon">
          <Image src="/clarifi-logo.png" alt="Clarifi" width={22} height={22} />
        </span>
        Clarifi
      </Link>
      <div className="blog-nav-links">
        <Link href="/blog">Blog</Link>
        <Link href="/pricing">Pricing</Link>
      </div>
      <Link
        href="/#join"
        className={`blog-nav-cta ${ctaVariant === 'pink' ? 'blog-nav-cta-pink' : ''}`}
      >
        Join the waitlist
      </Link>
    </nav>
  )
}
