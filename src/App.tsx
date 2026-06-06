import { useEffect, useState, type CSSProperties } from 'react'

type ConnectionStatus = 'connecting' | 'connected' | 'error'

function App() {
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [response, setResponse] = useState<string>('')

  useEffect(() => {
    window.electronAPI
      .invoke('ping')
      .then((result) => {
        setResponse(String(result))
        setStatus('connected')
      })
      .catch(() => {
        setStatus('error')
      })
  }, [])

  const statusColor =
    status === 'connected' ? '#22c55e' : status === 'error' ? '#ef4444' : '#eab308'

  const statusLabel =
    status === 'connected'
      ? 'Connected'
      : status === 'error'
        ? 'Disconnected'
        : 'Connecting...'

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>MyApp</h1>
        <p style={styles.subtitle}>Electron + React + TypeScript</p>
      </header>

      <main style={styles.card}>
        <div style={styles.statusRow}>
          <span
            style={{
              ...styles.statusDot,
              backgroundColor: statusColor,
              boxShadow: `0 0 8px ${statusColor}`,
            }}
            aria-hidden="true"
          />
          <span style={styles.statusText}>{statusLabel}</span>
        </div>

        {status === 'connected' && (
          <p style={styles.response}>
            IPC ping response: <strong>{response}</strong>
          </p>
        )}

        {status === 'error' && (
          <p style={styles.error}>
            Failed to reach the main process. Ensure the app is running inside Electron.
          </p>
        )}
      </main>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
    color: '#f8fafc',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  title: {
    margin: 0,
    fontSize: '2rem',
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    margin: '0.5rem 0 0',
    fontSize: '0.95rem',
    color: '#94a3b8',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    padding: '1.75rem',
    borderRadius: '12px',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  statusText: {
    fontSize: '1rem',
    fontWeight: 500,
  },
  response: {
    margin: '1.25rem 0 0',
    fontSize: '0.9rem',
    color: '#cbd5e1',
  },
  error: {
    margin: '1.25rem 0 0',
    fontSize: '0.9rem',
    color: '#fca5a5',
  },
}

export default App
