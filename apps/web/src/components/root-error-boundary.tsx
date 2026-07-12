import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, Card } from "@paramingle/ui";

interface Props {
  children?: ReactNode;
}
interface State {
  failed: boolean;
}

export class RootErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Error reporting is connected in the observability unit. Content is intentionally not logged here.
    void error;
    void info;
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="centered-state" id="main-content">
        <Card className="state-card">
          <p className="eyebrow">RECOVERABLE ERROR</p>
          <h1>Something got crossed.</h1>
          <p>
            Your account and conversation data were not changed. Reload this
            surface and try again.
          </p>
          <Button onClick={() => this.setState({ failed: false })}>
            Try this screen again
          </Button>
        </Card>
      </main>
    );
  }
}
