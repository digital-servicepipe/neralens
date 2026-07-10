import type { PropsWithChildren, ReactNode } from 'react';

interface PanelProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Panel({ title, subtitle, action, className = '', bodyClassName = '', children }: PropsWithChildren<PanelProps>) {
  return (
    <article className={`panel h-full p-4 ${className}`.trim()}>
      {(title || action) && (
        <div className="mb-4 flex min-h-11 items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-extrabold text-ink">{title}</h2>}
            {subtitle && <p className="mt-1 break-words text-xs leading-5 text-muted">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </article>
  );
}
