import Image from 'next/image'
import Link from 'next/link'

export function BlogNav() {
  return (
    <nav className="blog-nav">
      <Link href="/" className="blog-logo">
        <span className="blog-logo-icon">
          <Image src="/clarifi-logo.png" alt="Clarifi" width={22} height={22} />
        </span>
        Clarifi
      </Link>
      <div className="blog-nav-links">
        <Link href="/">← Home</Link>
      </div>
      <Link href="/#join" className="blog-nav-cta">
        Join the waitlist
      </Link>
    </nav>
  )
}
