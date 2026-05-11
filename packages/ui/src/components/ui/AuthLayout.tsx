import type { ReactNode } from 'react';

import './AuthLayout.css';

interface AuthLayoutProps {
  brand?: ReactNode;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function AuthLayout({
  brand,
  title,
  description,
  children,
  footer,
  className,
}: AuthLayoutProps) {
  const cls = ['aegis-auth-layout', className ?? ''].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <div className="aegis-auth-layout__inner">
        {brand && <div className="aegis-auth-layout__brand">{brand}</div>}
        <section className="aegis-auth-layout__card">
          <header className="aegis-auth-layout__header">
            <h1 className="aegis-auth-layout__title">{title}</h1>
            {description && (
              <p className="aegis-auth-layout__desc">{description}</p>
            )}
          </header>
          <div className="aegis-auth-layout__body">{children}</div>
        </section>
        {footer && <div className="aegis-auth-layout__footer">{footer}</div>}
      </div>
    </div>
  );
}

export default AuthLayout;
