import type { ReactNode } from 'react';

import './CaseDetailLayout.css';

interface CaseDetailLayoutProps {
  header: ReactNode;
  left: ReactNode;
  right: ReactNode;
}

export function CaseDetailLayout({ header, left, right }: CaseDetailLayoutProps) {
  return (
    <div className='llmh-case-layout'>
      <header className='llmh-case-layout__header'>{header}</header>
      <div className='llmh-case-layout__grid'>
        <section className='llmh-case-layout__col llmh-case-layout__col--left'>
          {left}
        </section>
        <section className='llmh-case-layout__col llmh-case-layout__col--right'>
          {right}
        </section>
      </div>
    </div>
  );
}
