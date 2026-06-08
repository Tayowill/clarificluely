export type Subprocessor = {
  name: string
  purpose: string
  location: string
  website: string
}

/** Third parties that may process personal data on Clarifi's behalf. */
export const SUBPROCESSORS: Subprocessor[] = [
  {
    name: 'Vercel',
    purpose: 'Application hosting, deployment, and analytics',
    location: 'United States',
    website: 'https://vercel.com',
  },
  {
    name: 'Supabase',
    purpose: 'Database, waitlist authentication, and edge functions',
    location: 'United States',
    website: 'https://supabase.com',
  },
  {
    name: 'Clerk',
    purpose: 'User authentication and account management',
    location: 'United States',
    website: 'https://clerk.com',
  },
  {
    name: 'Stripe',
    purpose: 'Payment processing and subscription billing',
    location: 'United States',
    website: 'https://stripe.com',
  },
  {
    name: 'Anthropic',
    purpose: 'AI language model services',
    location: 'United States',
    website: 'https://anthropic.com',
  },
  {
    name: 'Groq',
    purpose: 'Speech-to-text transcription',
    location: 'United States',
    website: 'https://groq.com',
  },
  {
    name: 'Google',
    purpose: 'OAuth sign-in for waitlist registration',
    location: 'United States',
    website: 'https://google.com',
  },
]
