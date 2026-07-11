import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button, Card } from '@strangr/ui'

export class RootErrorBoundary extends Component<{ children?: ReactNode }, { failed: boolean }> {
  override state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Admin error reporting is connected only after sensitive-data redaction is configured.
    void error
    void info
  }
  override render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="admin-centered">
        <Card>
          <p className="admin-kicker">SAFE FAILURE</p>
          <h1>Admin surface unavailable.</h1>
          <p>No privileged action was submitted. Reload before continuing case work.</p>
          <Button onClick={() => this.setState({ failed: false })}>Try again</Button>
        </Card>
      </main>
    )
  }
}
