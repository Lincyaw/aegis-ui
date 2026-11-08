import { Component, type ContextType, type ReactNode } from 'react';

import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { LocaleContext } from '../../locale/localeContext';
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
  static override contextType = LocaleContext;
  declare context: ContextType<typeof LocaleContext>;

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
    const strings = this.context;
    return (
      <PageWrapper>
        <ErrorState
          title={strings.routeErrorTitle}
          description={error.message}
          action={
            <Button tone="secondary" onClick={this.retry}>
              {strings.tryAgain}
            </Button>
          }
        />
      </PageWrapper>
    );
  }
}
