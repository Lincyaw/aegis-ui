import { useEffect, useState } from 'react';

interface MermaidProps {
  code: string;
}

let renderCounter = 0;

export function Mermaid({ code }: MermaidProps): JSX.Element {
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
          theme: 'default',
        });
        const result = await mod.default.render(renderId, code);
        if (!cancelled) {
          setSvg(result.svg);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <pre className="wiki-code wiki-mermaid__error" title={error}>
        <code>{code}</code>
      </pre>
    );
  }
  if (!svg) {
    return <div className="wiki-mermaid wiki-mermaid--loading">Rendering diagram…</div>;
  }
  return (
    <div className="wiki-mermaid" dangerouslySetInnerHTML={{ __html: svg }} />
  );
}
