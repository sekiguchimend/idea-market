'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { recordErrorLog } from '@/lib/logging';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * エラーバウンダリコンポーネント
 * 子コンポーネントでエラーが発生した場合にエラーログを記録する
 */
export class ErrorBoundaryLogger extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // エラーログを記録
    recordErrorLog({
      errorLevel: 'error',
      errorCode: 'REACT_ERROR',
      errorMessage: error.message,
      errorStack: error.stack,
      requestPath: typeof window !== 'undefined' ? window.location.pathname : undefined,
      additionalInfo: {
        componentStack: errorInfo.componentStack,
      },
    });

    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold text-destructive mb-4">
              エラーが発生しました
            </h2>
            <p className="text-muted-foreground mb-4">
              申し訳ありませんが、予期しないエラーが発生しました。
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              ページを再読み込み
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
