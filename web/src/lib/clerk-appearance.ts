/** Light card for embedded desktop onboarding sign-in pane */
export const clerkAppearanceEmbed = {
  variables: {
    colorBackground: '#f0f0f2',
    colorInputBackground: '#ffffff',
    colorInputText: '#111111',
    colorText: '#111111',
    colorTextSecondary: '#6b7280',
    colorPrimary: '#2563eb',
    colorDanger: '#dc2626',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'mx-auto w-full',
    card: 'bg-white border border-gray-200 shadow-sm',
    headerTitle: 'text-gray-900',
    headerSubtitle: 'text-gray-500',
    socialButtonsBlockButton: 'bg-white border-gray-200 text-gray-900',
    formButtonPrimary: 'bg-blue-600 text-white hover:bg-blue-700',
    footerActionLink: 'text-blue-600 hover:text-blue-700',
    identityPreviewText: 'text-gray-900',
    identityPreviewEditButton: 'text-gray-500',
    formFieldInput: 'bg-white border-gray-200 text-gray-900',
    dividerLine: 'bg-gray-200',
    dividerText: 'text-gray-400',
  },
}

export const clerkAppearance = {
  variables: {
    colorBackground: '#141414',
    colorInputBackground: '#1a1a1a',
    colorInputText: '#ffffff',
    colorText: '#ffffff',
    colorTextSecondary: 'rgba(255,255,255,0.6)',
    colorPrimary: '#ffffff',
    colorDanger: '#f87171',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'mx-auto',
    card: 'bg-zinc-900 border border-white/10 shadow-none',
    headerTitle: 'text-white',
    headerSubtitle: 'text-white/60',
    socialButtonsBlockButton: 'bg-white/10 border-white/20 text-white',
    formButtonPrimary: 'bg-white text-black hover:bg-white/90',
    footerActionLink: 'text-white hover:text-white/80',
    identityPreviewText: 'text-white',
    identityPreviewEditButton: 'text-white/70',
    formFieldInput: 'bg-black border-white/20 text-white',
    dividerLine: 'bg-white/10',
    dividerText: 'text-white/40',
  },
}
