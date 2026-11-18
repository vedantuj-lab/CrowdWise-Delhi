import React from 'react';
import { AlertCircle, Info, RefreshCw } from 'lucide-react';

export function DemoDataTag({ label = 'DATA STATUS' }: { label?: string }) {
  const cleanLabel = label.replace(/DEMO\s*/gi, '').replace(/DEMONSTRATION\s*/gi, '').trim() || 'DATA STATUS';
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold tracking-wide text-cyan-200 bg-cyan-500/10 border border-cyan-400/30 px-2 py-0.5 rounded whitespace-nowrap shrink-0">
      {cleanLabel}
    </span>
  );
}

export function DemoEstimateDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border border-cyan-400/25 bg-cyan-500/10 text-cyan-100 ${
        compact ? 'px-3.5 py-2.5 text-xs' : 'px-4 py-3 text-sm'
      }`}
    >
      <Info className="h-4 w-4 shrink-0 mt-0.5 text-cyan-300" aria-hidden="true" />
      <span>
        <strong className="text-white">Historical &amp; schedule-based demand intelligence — not a live passenger count.</strong>{' '}
        Metrics reflect only connected Static GTFS and historical ticketing datasets. Live GTFS-Realtime
        vehicle telemetry is displayed only when a live feed is connected.
      </span>
    </div>
  );
}

export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse" aria-busy="true" aria-label="Loading content">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-14 w-full rounded-xl border border-slate-700/40 bg-slate-800/45"
        />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="cw-card rounded-xl p-8 text-center">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-1.5 max-w-md mx-auto text-sm text-[var(--cw-text-muted)]">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="cw-btn-primary mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-6 text-rose-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <h3 className="text-sm font-semibold text-white">Unable to load requested data</h3>
          <p className="mt-1 text-sm text-rose-200">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-lg border border-rose-400/40 bg-rose-900/40 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-900/70 whitespace-nowrap shrink-0"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
    >
      <div className="cw-card w-full max-w-md rounded-xl p-6 shadow-2xl">
        <h3 id="confirm-dialog-title" className="text-lg font-semibold text-white">
          {title}
        </h3>
        <p className="mt-2 text-sm text-[var(--cw-text-secondary)] leading-relaxed">{description}</p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-600 bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
              destructive ? 'bg-rose-600 hover:bg-rose-700' : 'cw-btn-primary'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message || 'Unexpected rendering error.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-2xl mx-auto">
          <ErrorState
            message={this.state.message}
            onRetry={() => this.setState({ hasError: false, message: '' })}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
