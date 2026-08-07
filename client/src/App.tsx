import { useState } from 'react'

type SystemState = 'idle' | 'loading' | 'online' | 'offline'

function App() {
  const [systemState, setSystemState] = useState<SystemState>('idle')
  const [error, setError] = useState<string | null>(null)

  async function checkSystem() {
    setSystemState('loading')
    setError(null)
    try {
      const res = await fetch('/api/health')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setSystemState(data.status === 'ok' ? 'online' : 'offline')
    } catch {
      setSystemState('offline')
      setError('Unable to connect to TokTickIT API')
    }
  }

  return (
    <div className="min-vh-100 d-flex flex-column">
      <nav className="navbar navbar-dark bg-primary">
        <div className="container">
          <span className="navbar-brand fw-bold">TokTickIT IT Service Desk</span>
        </div>
      </nav>
      <main className="container py-4 flex-grow-1">
        <h1 className="h3">TokTickIT IT Service Desk</h1>
        <button type="button" className="btn btn-primary" onClick={checkSystem}>
          Check System
        </button>

        {systemState === 'loading' && (
          <p className="mt-3 text-body-secondary">&#8987; loading&hellip;</p>
        )}

        {systemState === 'online' && (
          <p className="mt-3">
            System Status: <span className="badge text-bg-success">Online</span>
          </p>
        )}

        {systemState === 'offline' && (
          <div className="mt-3">
            <p>
              System Status: <span className="badge text-bg-danger">Offline</span>
            </p>
            {error && <p className="alert alert-danger">{error}</p>}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
