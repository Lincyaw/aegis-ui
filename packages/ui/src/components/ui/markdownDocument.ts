import { type ComponentProps, type ElementType, createElement } from 'react';

import './markdownDocument.css';

/**
 * The one style of a long-form document, shared by `MdxDocument` and
 * `Markdown variant="document"`: the root takes `DOCUMENT_CLASS` and each
 * Markdown element its class here. Only these classes are styled, so the
 * components a document embeds keep their own type and spacing.
 */
export const DOCUMENT_CLASS = 'aegis-document';

export const DOCUMENT_CODE_BLOCK_CLASS = 'aegis-document__code-block';

const DOCUMENT_ELEMENT_CLASSES = {
  h1: 'aegis-document__title',
  h2: 'aegis-document__heading',
  h3: 'aegis-document__subheading',
  h4: 'aegis-document__minor-heading',
  h5: 'aegis-document__minor-heading',
  h6: 'aegis-document__minor-heading',
  p: 'aegis-document__paragraph',
  ul: 'aegis-document__list',
  ol: 'aegis-document__list',
  strong: 'aegis-document__strong',
  code: 'aegis-document__code',
  blockquote: 'aegis-document__quote',
  table: 'aegis-document__table',
  hr: 'aegis-document__rule',
  img: 'aegis-document__image',
  a: 'aegis-document__link',
} as const;

export type DocumentTag = keyof typeof DOCUMENT_ELEMENT_CLASSES;

export const DOCUMENT_TAGS = Object.keys(
  DOCUMENT_ELEMENT_CLASSES,
) as DocumentTag[];

type DocumentElementProps = ComponentProps<DocumentTag> & {
  /** react-markdown's syntax-tree node; only a host component receives it. */
  node?: unknown;
};

/**
 * A Markdown element with its document class. A host component that
 * replaces the element receives the class in `className` and applies it to
 * keep the document's style.
 */
export function documentElement(tag: DocumentTag, host?: ElementType) {
  return function DocumentElement({
    className,
    node,
    ...rest
  }: DocumentElementProps) {
    const documentClass = [DOCUMENT_ELEMENT_CLASSES[tag], className ?? '']
      .filter(Boolean)
      .join(' ');
    return host === undefined
      ? createElement(tag, { ...rest, className: documentClass })
      : createElement(host, { ...rest, node, className: documentClass });
  };
}
