import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import {
  Breadcrumb,
  Button,
  Chip,
  ErrorState,
  PanelTitle,
  SkeletonText,
} from '@lincyaw/aegis-ui';

import { useFileContent } from '../api/github-client';
import { TableOfContents } from '../components/TableOfContents';
import { WikiMarkdown } from '../components/WikiMarkdown';
import { parseFrontmatter } from '../lib/frontmatter';
import { useNotesContext } from '../lib/notes-context';
import { makeWikilinkResolver } from '../lib/routes';
import { useMediaQuery } from '../lib/use-media-query';

function deriveTitle(path: string): string {
  const name = path.split('/').pop() ?? path;
  return name.replace(/\.md$/i, '');
}

export default function NoteView(): JSX.Element {
  const params = useParams();
  const path = params['*'] ?? '';
  const { slugIndex } = useNotesContext();
  const file = useFileContent(path);
  const showToc = useMediaQuery('(min-width: 1200px)');

  const parsed = useMemo(() => parseFrontmatter(file.data ?? ''), [file.data]);
  const resolveSlug = useMemo(
    () => makeWikilinkResolver(slugIndex),
    [slugIndex]
  );

  const title = parsed.frontmatter.title ?? deriveTitle(path);
  const tags = parsed.frontmatter.tags ?? [];

  const breadcrumbItems = useMemo(() => {
    const segments = path.split('/');
    return segments.map((segment, idx) => ({
      label:
        idx === segments.length - 1 ? segment.replace(/\.md$/i, '') : segment,
    }));
  }, [path]);

  return (
    <div className='notes-view-wrapper'>
      <article className='notes-view'>
        <header className='notes-view__header'>
          {path && (
            <Breadcrumb
              className='notes-view__breadcrumb'
              items={breadcrumbItems}
            />
          )}
          <PanelTitle as='h1' size='lg' className='notes-view__title'>
            {title}
          </PanelTitle>
          {tags.length > 0 && (
            <div className='notes-view__tags'>
              {tags.map((tag) => (
                <Chip key={tag}>{tag}</Chip>
              ))}
            </div>
          )}
        </header>
        {file.isLoading ? (
          <SkeletonText lines={8} />
        ) : file.isError ? (
          <ErrorState
            title='Failed to load note'
            description={`Could not fetch ${path}.`}
            action={
              <Button tone='secondary' onClick={() => void file.refetch()}>
                Try again
              </Button>
            }
          />
        ) : (
          <WikiMarkdown content={parsed.content} resolveSlug={resolveSlug} />
        )}
      </article>
      {showToc && !file.isLoading && !file.isError && parsed.content && (
        <TableOfContents content={parsed.content} />
      )}
    </div>
  );
}
