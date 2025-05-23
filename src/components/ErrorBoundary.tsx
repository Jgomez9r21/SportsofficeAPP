
"use client";

import type React from 'react';
import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in ErrorBoundary:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    // Optionally, you could try to re-render the children or refresh the page
    // For now, just resetting the error state.
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-4 text-center">
          <h2 className="text-2xl font-semibold text-destructive mb-4">
            {this.props.fallbackMessage || "Algo salió mal."}
          </h2>
          <p className="text-muted-foreground mb-6">
            Por favor, intenta refrescar la página o inténtalo de nuevo más tarde.
          </p>
          {this.state.error && (
            <details className="mb-4 text-left p-3 bg-muted rounded-md w-full max-w-lg overflow-auto">
              <summary className="cursor-pointer font-medium text-sm">Detalles del Error</summary>
              <pre className="mt-2 text-xs whitespace-pre-wrap">
                {this.state.error.toString()}
                {this.state.errorInfo && `\nComponent Stack:\n${this.state.errorInfo.componentStack}`}
              </pre>
            </details>
          )}
          <Button onClick={() => window.location.reload()} variant="outline" className="mr-2">
            Refrescar Página
          </Button>
          <Button onClick={this.handleRetry}>
            Intentar de Nuevo
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
