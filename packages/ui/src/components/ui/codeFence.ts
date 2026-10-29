/** Fence names that CodeBlock knows under another name. */
const FENCE_ALIASES: Partial<Record<string, string>> = {
  jsonc: 'json',
  yml: 'yaml',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  console: 'bash',
};

/**
 * The CodeBlock language of a fenced code block's `language-<name>` class,
 * `text` when the fence names none.
 */
export function fenceLanguage(className: string | undefined): string {
  const name = (className ?? '')
    .split(' ')
    .find((c) => c.startsWith('language-'))
    ?.slice('language-'.length);
  return name === undefined ? 'text' : (FENCE_ALIASES[name] ?? name);
}
