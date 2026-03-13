import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 max-w-2xl">
            <h2 className="text-2xl font-bold text-red-900 mb-4">Something went wrong</h2>
            <p className="text-red-700 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <details className="mb-4">
              <summary className="cursor-pointer text-red-600 font-medium mb-2">
                Error Details (click to expand)
              </summary>
              <pre className="bg-red-100 p-3 rounded text-xs overflow-auto max-h-64">
                {this.state.error?.stack}
              </pre>
            </details>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
