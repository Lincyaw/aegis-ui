import { Alert, Breadcrumb, Skeleton, Tag, Typography } from 'antd';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { useFileContent } from '../api/github-client';
import { TableOfContents } from '../components/TableOfContents';
import { WikiMarkdown } from '../components/WikiMarkdown';
import { parseFrontmatter } from '../lib/frontmatter';
import { useMediaQuery } from '../lib/use-media-query';
import { useNotesContext } from '../lib/notes-context';
import { makeWikilinkResolver } from '../lib/routes';

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

  const parsed = useMemo(
    () => parseFrontmatter(file.data ?? ''),
    [file.data],
  );
  const resolveSlug = useMemo(
    () => makeWikilinkResolver(slugIndex),
    [slugIndex],
  );

  const title = parsed.frontmatter.title ?? deriveTitle(path);
  const tags = parsed.frontmatter.tags ?? [];

  const breadcrumbItems = useMemo(() => {
    const segments = path.split('/');
    return segments.map((segment, idx) => ({
      title: idx === segments.length - 1 ? segment.replace(/\.md$/i, '') : segment,
    }));
  }, [path]);

  return (
    <div className="notes-view-wrapper">
      <article className="notes-view">
        <header className="notes-view__header">
          {path && (
            <Breadcrumb
              className="notes-view__breadcrumb"
              items={breadcrumbItems}
            />
          )}
          <Typography.Title level={2} className="notes-view__title">
            {title}
          </Typography.Title>
          {tags.length > 0 && (
            <div className="notes-view__tags">
              {tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          )}
        </header>
        {file.isLoading ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : file.isError ? (
          <Alert
            type="error"
            showIcon
            message="Failed to load note"
            description={`Could not fetch ${path}.`}
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
