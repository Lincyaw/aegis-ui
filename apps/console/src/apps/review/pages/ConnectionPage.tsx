import { type FormEvent, type ReactElement, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  Alert,
  Button,
  Chip,
  ChoiceCardGroup,
  KeyValueList,
  MonoValue,
  PageHeader,
  Panel,
  SkeletonText,
  TextField,
} from '@lincyaw/aegis-ui';

import {
  defaultUrl,
  describeUrl,
  REVIEWER_PATTERN,
  type SourceMode,
  trimUrl,
} from '../connection';
import { useReviewStrings } from '../locale/context';
import { useServerInfo } from '../queries';
import { useReview } from '../review';

import './ConnectionPage.css';

function ServerStatus(): ReactElement {
  const s = useReviewStrings();
  const { connection } = useReview();
  const info = useServerInfo();
  if (info.isPending) {
    return <SkeletonText lines={2} />;
  }
  if (info.isError) {
    return (
      <Alert tone='error' title={s.unreachable}>
        {`${describeUrl(connection.url, s)}: ${info.error.message}`}
      </Alert>
    );
  }
  return (
    <KeyValueList
      items={[
        {
          k: s.sourceKind,
          v: <MonoValue>{describeUrl(connection.url, s)}</MonoValue>,
        },
        { k: s.server, v: `${info.data.name} ${info.data.version}`.trim() },
        {
          k: s.verdicts,
          v: info.data.writable ? (
            <Chip tone='success'>{s.savedOnServer}</Chip>
          ) : (
            <Chip tone='caution'>{s.readOnly}</Chip>
          ),
        },
        {
          k: s.reviewer,
          v:
            connection.reviewer === '' ? (
              <Chip tone='caution'>{s.notSet}</Chip>
            ) : (
              <MonoValue>{connection.reviewer}</MonoValue>
            ),
        },
      ]}
    />
  );
}

export function ConnectionPage(): ReactElement {
  const s = useReviewStrings();
  const { connection, setConnection } = useReview();
  const [url, setUrl] = useState(connection.url);
  const [mode, setMode] = useState<SourceMode>(connection.mode);
  const [reviewer, setReviewer] = useState(connection.reviewer);
  const reviewerError =
    reviewer.trim() !== '' && !REVIEWER_PATTERN.test(reviewer.trim())
      ? s.reviewerInvalid
      : undefined;
  const dirty =
    trimUrl(url) !== connection.url ||
    mode !== connection.mode ||
    reviewer.trim() !== connection.reviewer;

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (reviewerError === undefined) {
      setConnection({ url: trimUrl(url), mode, reviewer: reviewer.trim() });
    }
  };

  return (
    <div className='review-connection'>
      <PageHeader title={s.connectionTitle} description={s.connectionHint} />
      <div className='review-connection__grid'>
        <Panel title={s.sourceAndReviewer}>
          <form className='review-connection__form' onSubmit={submit}>
            <ChoiceCardGroup
              ariaLabel={s.sourceKind}
              options={[
                {
                  value: 'server',
                  title: s.serverTitle,
                  description: s.serverHint,
                },
                {
                  value: 'static',
                  title: s.staticTitle,
                  description: s.staticHint,
                },
              ]}
              value={mode}
              onChange={(value) => {
                setMode(value === 'static' ? 'static' : 'server');
              }}
            />
            <TextField
              label={s.url}
              value={url}
              placeholder={describeUrl('', s)}
              helperText={
                url.trim() === '' ? s.urlEmpty(describeUrl('', s)) : s.urlHint
              }
              onChange={(event) => {
                setUrl(event.target.value);
              }}
            />
            <TextField
              label={s.reviewerName}
              value={reviewer}
              placeholder={s.reviewerPlaceholder}
              error={reviewerError}
              helperText={s.reviewerHint}
              onChange={(event) => {
                setReviewer(event.target.value);
              }}
            />
            <div className='review-connection__actions'>
              <Button
                type='submit'
                tone='primary'
                disabled={!dirty || reviewerError !== undefined}
              >
                {s.save}
              </Button>
              <Button
                tone='ghost'
                onClick={() => {
                  setUrl(defaultUrl());
                }}
              >
                {s.defaultUrl}
              </Button>
            </div>
          </form>
        </Panel>
        <Panel
          title={s.status}
          extra={
            <Link to='..' relative='path'>
              {s.tasks} →
            </Link>
          }
        >
          <ServerStatus />
        </Panel>
      </div>
    </div>
  );
}
