import { Component, type ErrorInfo, type ReactNode } from "react";
import { RetryableError } from "./PageHeader";

interface Props {
  resetKey?: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <RetryableError
        message={this.state.error.message || "This page failed to render."}
        onRetry={() => this.setState({ error: null })}
      />
    );
  }
}
