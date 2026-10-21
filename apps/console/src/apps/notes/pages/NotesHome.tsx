import { useMemo } from 'react';

import { BookOutlined } from '@ant-design/icons';
import { EmptyState, SkeletonText } from '@lincyaw/aegis-ui';

import { NOTES_REPO, useFileContent } from '../api/github-client';
import { WikiMarkdown } from '../components/WikiMarkdown';
import { parseFrontmatter } from '../lib/frontmatter';
import { useNotesContext } from '../lib/notes-context';
import { makeWikilinkResolver } from '../lib/routes';

export default function NotesHome(): JSX.Element {
  const { files, slugIndex } = useNotesContext();
  const readme = useFileContent('README.md');
  const resolveSlug = useMemo(
    () => makeWikilinkResolver(slugIndex),
    [slugIndex]
  );

  if (readme.isLoading) {
    return <SkeletonText lines={8} />;
  }

  if (readme.isSuccess && readme.data) {
    const parsed = parseFrontmatter(readme.data);
    return (
      <article className='notes-view'>
        <WikiMarkdown content={parsed.content} resolveSlug={resolveSlug} />
      </article>
    );
  }

  return (
    <EmptyState
      icon={<BookOutlined />}
      title={NOTES_REPO}
      description={`${files.length} note${files.length === 1 ? '' : 's'} in this knowledge base. Pick one to start reading.`}
    />
  );
}
