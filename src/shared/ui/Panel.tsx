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
    <article className={`panel ui-panel h-full ${className}`.trim()}>
      {(title || action) && (
        <div className="ui-panel-head">
          <div className="min-w-0">
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </article>
  );
}
