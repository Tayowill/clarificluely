const PARTICIPANTS = [
  {
    name: 'Tayo williams',
    you: true,
    sub: 'Meeting host',
    initials: 'T',
    color: '#92400e',
    kind: 'host' as const,
  },
  {
    name: 'Maya Chen',
    sub: 'maya.chen@clarifi.app',
    initials: 'MC',
    color: '#7c3aed',
    kind: 'badges' as const,
    badges: ['Co-host', 'Owner'],
  },
  {
    name: 'Jordan Blake',
    sub: 'jordan.blake@clarifi.app',
    initials: 'JB',
    color: '#ea580c',
    kind: 'speaker' as const,
  },
  {
    name: 'Riley Nguyen',
    sub: 'riley.nguyen@clarifi.app',
    initials: 'R',
    color: '#db2777',
    kind: 'speaker' as const,
  },
]

function RowMenu() {
  return (
    <span className="participants-feature-menu" aria-hidden>
      <span />
      <span />
      <span />
    </span>
  )
}

export function MeetingParticipantsMock() {
  return (
    <div className="participants-feature-wrap">
      <div className="participants-feature-panel">
        <div className="participants-feature-header">
          <h3 className="participants-feature-title">Contributors</h3>
          <span className="participants-feature-count">4</span>
          <span className="participants-feature-chevron" aria-hidden>
            ^
          </span>
        </div>
        <ul className="participants-feature-list">
          {PARTICIPANTS.map((person) => (
            <li key={person.name} className="participants-feature-row">
              <span
                className="participants-feature-avatar"
                style={{ backgroundColor: person.color }}
              >
                {person.initials}
              </span>
              <div className="participants-feature-info">
                <p className="participants-feature-name">
                  {person.name}
                  {person.you ? (
                    <span className="participants-feature-you"> (You)</span>
                  ) : null}
                </p>
                <p className="participants-feature-sub">{person.sub}</p>
              </div>
              <div className="participants-feature-actions">
                {person.kind === 'host' ? (
                  <span className="participants-feature-host-btn" aria-hidden>
                    <span className="participants-feature-host-dots">
                      <span />
                      <span />
                      <span />
                    </span>
                  </span>
                ) : null}
                {person.kind === 'badges' ? (
                  <span className="participants-feature-pills">
                    {person.badges?.map((badge) => (
                      <span key={badge} className="participants-feature-pill">
                        {badge}
                      </span>
                    ))}
                  </span>
                ) : null}
                {person.kind === 'speaker' ? (
                  <span className="participants-feature-role-btn">
                    Speaker <span>▾</span>
                  </span>
                ) : null}
              </div>
              <RowMenu />
            </li>
          ))}
        </ul>
      </div>
      <span className="participants-feature-badge">
        <span className="participants-feature-badge-icon" aria-hidden>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="6" fill="#22c55e" />
            <path
              d="M3.5 6l1.75 1.75L8.5 4.5"
              stroke="#fff"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        No bots detected
      </span>
    </div>
  )
}
