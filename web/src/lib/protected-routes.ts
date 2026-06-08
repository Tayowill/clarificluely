const PUBLIC_PREFIXES = [
  '/',
  '/sitemap.xml',
  '/robots.txt',
  '/auth/callback',
  '/auth/confirm',
  '/auth/',
  '/blog',
  '/pricing',
  '/privacy',
  '/terms',
  '/subprocessors',
  '/sign-in',
  '/sign-up',
  '/desktop/connect',
  '/desktop/sign-in',
  '/desktop/sign-up',
  '/api/desktop/exchange',
  '/api/desktop/status',
  '/api/waitlist',
  '/api/llm/chat',
  '/api/llm/suggest',
  '/api/llm/transcribe',
] as const

export function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith('/preview')) return true
  if (pathname.startsWith('/_next')) return true

  return PUBLIC_PREFIXES.some((prefix) => {
    if (prefix === '/') return pathname === '/'
    return pathname === prefix || pathname.startsWith(`${prefix}/`)
  })
}
