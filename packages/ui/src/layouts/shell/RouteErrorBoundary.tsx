import { Component, type ReactNode } from 'react';

import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { PageWrapper } from '../PageWrapper';

interface RouteErrorBoundaryProps {
  /** A new key — the next location — clears the error and renders the route again. */
  resetKey: string;
  children: ReactNode;
}

interface RouteErrorBoundaryState {
  error: Error | null;
  resetKey: string;
}

/**
 * Catches a render error in the routed page, so the shell around it stays
 * up. Shows the error in the page area with a retry; navigating elsewhere
 * clears it.
 */
export class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  override state: RouteErrorBoundaryState = {
    error: null,
    resetKey: this.props.resetKey,
  };

  static getDerivedStateFromError(
    error: unknown,
  ): Partial<RouteErrorBoundaryState> {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  static getDerivedStateFromProps(
    props: RouteErrorBoundaryProps,
    state: RouteErrorBoundaryState,
  ): Partial<RouteErrorBoundaryState> | null {
    return props.resetKey === state.resetKey
      ? null
      : { error: null, resetKey: props.resetKey };
  }

  private readonly retry = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }
    return (
      <PageWrapper>
        <ErrorState
          title="This page failed to render"
          description={error.message}
          action={
            <Button tone="secondary" onClick={this.retry}>
              Try again
            </Button>
          }
        />
      </PageWrapper>
    );
  }
}
