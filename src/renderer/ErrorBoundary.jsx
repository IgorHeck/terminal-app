import React from 'react'

// ============================================================
// ErrorBoundary — captura erros de renderização React e
// os reporta ao main via IPC para gravação em error.log.
// ============================================================

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Reporta ao main process para gravar no log local.
    window.api?.app?.reportError?.({
      message: error?.message || String(error),
      stack: error?.stack,
      componentStack: info?.componentStack,
    })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '16px',
          color: 'var(--text-1, #e0e0e0)',
          background: 'var(--bg-0, #0c0c0e)',
          fontFamily: 'monospace',
          padding: '32px',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: '2rem' }}>⚠</span>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
          Erro inesperado na interface
        </h2>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-2, #888)', maxWidth: '480px' }}>
          {this.state.error?.message || 'Ocorreu um erro desconhecido.'}
        </p>
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-2, #888)' }}>
          O erro foi registrado em{' '}
          <code style={{ color: 'var(--accent, #7aa2f7)' }}>~/.terminal-app/error.log</code>
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '8px',
            padding: '8px 20px',
            background: 'var(--accent, #7aa2f7)',
            color: '#0c0c0e',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          Recarregar app
        </button>
      </div>
    )
  }
}
