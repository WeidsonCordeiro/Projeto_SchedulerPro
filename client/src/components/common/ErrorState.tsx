interface ErrorStateProps { message: string; onRetry?: () => void; }

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="alert alert-danger app-error" role="alert">
      <div>{message}</div>
      {onRetry && <button type="button" className="btn btn-outline-danger btn-sm mt-3" onClick={onRetry}>Tentar novamente</button>}
    </div>
  );
}
