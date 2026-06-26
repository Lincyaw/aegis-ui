import { BookOutlined } from '@ant-design/icons';
import { Skeleton, Typography } from 'antd';
import { useMemo } from 'react';

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
    [slugIndex],
  );

  if (readme.isLoading) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }

  if (readme.isSuccess && readme.data) {
    const parsed = parseFrontmatter(readme.data);
    return (
      <article className="notes-view">
        <WikiMarkdown content={parsed.content} resolveSlug={resolveSlug} />
      </article>
    );
  }

  return (
    <div className="notes-home">
      <BookOutlined className="notes-home__icon" />
      <Typography.Title level={3}>{NOTES_REPO}</Typography.Title>
      <Typography.Paragraph type="secondary">
        {files.length} note{files.length === 1 ? '' : 's'} in this knowledge
        base. Pick one from the sidebar to start reading.
      </Typography.Paragraph>
    </div>
  );
}
