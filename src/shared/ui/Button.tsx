import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

export function Button({ children, className = '', ...props }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button className={`control inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-bold text-ink ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
