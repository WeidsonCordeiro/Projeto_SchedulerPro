import type { ReactNode } from "react";

interface EmptyStateProps { title: string; description?: string; action?: ReactNode; icon?: string; }

export default function EmptyState({ title, description, action, icon = "○" }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">{icon}</div>
      <h2 className="h5 mb-2">{title}</h2>
      {description && <p className="text-muted mb-3">{description}</p>}
      {action}
    </div>
  );
}
