import { useStrings } from '../../locale';
import { Button } from './Button';
import { PageSizeSelect } from './PageSizeSelect';
import './Pagination.css';

interface PaginationProps {
  page: number;
  pageSize: number;
  /** Optional so a `DataTablePagination` can be spread straight in. */
  total?: number;
  onChange: (page: number, pageSize: number) => void;
  pageSizeOptions?: number[];
  /** Noun used in the total count, e.g. "steps"; defaults to the locale's records unit. */
  unit?: string;
  className?: string;
}

export function Pagination({
  page,
  pageSize,
  total = 0,
  onChange,
  pageSizeOptions,
  unit,
  className,
}: PaginationProps) {
  const strings = useStrings();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const cls = ['aegis-pagination', className ?? ''].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <span className="aegis-pagination__count">
        {strings.totalCount(total, unit ?? strings.recordsUnit)}
      </span>
      <PageSizeSelect
        value={pageSize}
        options={pageSizeOptions}
        onChange={(size) => {
          onChange(1, size);
        }}
      />
      <Button
        tone="secondary"
        disabled={page <= 1}
        onClick={() => {
          onChange(page - 1, pageSize);
        }}
      >
        {strings.previousPage}
      </Button>
      <span className="aegis-pagination__page">{`${String(page)} / ${String(pages)}`}</span>
      <Button
        tone="secondary"
        disabled={page >= pages}
        onClick={() => {
          onChange(page + 1, pageSize);
        }}
      >
        {strings.nextPage}
      </Button>
    </div>
  );
}
