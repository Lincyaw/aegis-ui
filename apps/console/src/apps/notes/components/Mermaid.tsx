import { useEffect, useState } from 'react';

import { Alert, useTheme } from '@lincyaw/aegis-ui';

interface MermaidProps {
  code: string;
}

let renderCounter = 0;

export function Mermaid({ code }: MermaidProps): JSX.Element {
  const { resolved: scheme } = useTheme();
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    renderCounter += 1;
    const renderId = `wiki-mermaid-${renderCounter}`;
    void (async () => {
      try {
        const mod = await import('mermaid');
        mod.default.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: scheme === 'dark' ? 'dark' : 'default',
        });
        const result = await mod.default.render(renderId, code);
        if (!cancelled) {
          setSvg(result.svg);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to render diagram'
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, scheme]);

  if (error) {
    return (
      <div className='wiki-mermaid__error'>
        <Alert tone='error' title='Diagram failed to render'>
          {error}
        </Alert>
        <pre>
          <code>{code}</code>
        </pre>
      </div>
    );
  }
  if (!svg) {
    return (
      <div className='wiki-mermaid wiki-mermaid--loading'>
        Rendering diagram…
      </div>
    );
  }
  return (
    <div className='wiki-mermaid' dangerouslySetInnerHTML={{ __html: svg }} />
  );
}
