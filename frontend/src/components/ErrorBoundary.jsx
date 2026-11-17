import { Component } from 'react'

// Catches render errors in any child so one broken panel shows a fallback
// instead of blanking the whole page.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('UI error:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    if (this.props.fallback !== undefined) return this.props.fallback
    return (
      <div role="alert" style={{
        padding: '16px 20px', margin: '12px 0', borderRadius: 10,
        background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
        color: 'var(--text-secondary)', fontSize: 13,
      }}>
        <div style={{ marginBottom: 8 }}>出错了，请刷新页面。 / Something went wrong. Please refresh.</div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '4px 12px', borderRadius: 6, cursor: 'pointer',
            border: '1px solid var(--border-primary)', background: 'transparent', color: 'inherit',
          }}
        >
          刷新 / Reload
        </button>
      </div>
    )
  }
}
