import Image from 'next/image'

const PARTICIPANTS = [
  {
    name: 'Maya Chen',
    you: true,
    email: 'maya.chen@clarifi.app',
    role: 'Owner',
    initials: 'MC',
    color: '#7c3aed',
  },
  {
    name: 'Jordan Blake',
    email: 'jordan.blake@clarifi.app',
    role: 'Speaker',
    initials: 'JB',
    color: '#d97706',
  },
  {
    name: 'Priya Kapoor',
    email: 'priya.kapoor@clarifi.app',
    role: 'Speaker',
    initials: 'PK',
    color: '#db2777',
  },
  {
    name: 'Marcus Webb',
    email: 'marcus.webb@clarifi.app',
    role: 'Speaker',
    initials: 'MW',
    color: '#2563eb',
  },
] as const

export function MeetingParticipantsMock() {
  return (
    <div className="participants-mock">
      <div className="participants-mock-card">
        <div className="participants-mock-header">
          <p className="participants-mock-title">Meeting participants (4)</p>
          <span className="participants-mock-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"
                fill="currentColor"
                opacity="0.2"
              />
              <path
                d="M9.5 12.5l2 2 4-4.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            No bots detected
          </span>
        </div>
        <ul className="participants-mock-list">
          {PARTICIPANTS.map((person, index) => (
            <li key={person.email} className="participants-mock-row">
              <div
                className="participants-mock-avatar"
                style={{ background: person.color }}
                aria-hidden
              >
                {person.initials}
              </div>
              <div className="participants-mock-info">
                <p className="participants-mock-name">
                  {person.name}
                  {'you' in person && person.you ? (
                    <span className="participants-mock-you"> (You)</span>
                  ) : null}
                </p>
                <p className="participants-mock-email">{person.email}</p>
              </div>
              <div className="participants-mock-role">
                {person.role === 'Owner' ? (
                  <span className="participants-mock-role-label">{person.role}</span>
                ) : (
                  <button type="button" className="participants-mock-role-btn" tabIndex={-1}>
                    {person.role}
                    <span aria-hidden>▾</span>
                  </button>
                )}
              </div>
              {index < PARTICIPANTS.length - 1 ? (
                <div className="participants-mock-divider" aria-hidden />
              ) : null}
            </li>
          ))}
        </ul>
      </div>
      <div className="participants-mock-footer">
        <div className="participants-mock-brand">
          <Image src="/clarifi-logo.png" alt="" width={18} height={18} />
          <span>Clarifi</span>
        </div>
        <svg
          className="participants-mock-stealth"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <path
            d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}
