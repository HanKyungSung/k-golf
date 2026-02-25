import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global error boundary — catches unhandled React render errors.
 * Logs to console.error (preserved in prod builds) and shows a fallback UI.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught render error:', error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif',
          background: '#0f172a',
          color: '#e2e8f0',
        }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Something went wrong</h1>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem', textAlign: 'center', maxWidth: '400px' }}>
            An unexpected error occurred. Please refresh the page or contact support if the issue persists.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = '/';
            }}
            style={{
              padding: '0.5rem 1.5rem',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            Go to Home
          </button>
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <pre style={{
              marginTop: '2rem',
              padding: '1rem',
              background: '#1e293b',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              maxWidth: '600px',
              overflow: 'auto',
              color: '#f87171',
            }}>
              {this.state.error.message}
              {'\n'}
              {this.state.error.stack}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
