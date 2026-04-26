import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { fallback, compact } = this.props;
    if (fallback) return fallback;

    if (compact) {
      return (
        <div className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-950/30 rounded-lg border border-red-800/40">
          <AlertTriangle size={14} className="shrink-0" />
          <span>Bileşen yüklenemedi.</span>
          <button
            onClick={this.handleReset}
            className="ml-auto text-xs underline hover:no-underline"
          >
            Yeniden Dene
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-4 text-slate-400">
        <AlertTriangle size={32} className="text-red-400" />
        <div className="text-center">
          <p className="font-semibold text-slate-200 mb-1">Beklenmeyen bir hata oluştu</p>
          <p className="text-xs text-slate-500 max-w-xs">
            {this.state.error?.message || 'Bileşen render edilemedi.'}
          </p>
        </div>
        <button
          onClick={this.handleReset}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
        >
          <RefreshCw size={14} />
          Yeniden Dene
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
