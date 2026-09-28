interface LoadingStateProps { label?: string; compact?: boolean; }

export default function LoadingState({ label = "A carregar…", compact = false }: LoadingStateProps) {
  return (
    <div className={`loading-state ${compact ? "loading-state-compact" : ""}`} role="status">
      <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
