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
  /** Noun used in the total count, e.g. "个步骤". */
  unit?: string;
  className?: string;
}

export function Pagination({
  page,
  pageSize,
  total = 0,
  onChange,
  pageSizeOptions,
  unit = '条记录',
  className,
}: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const cls = ['aegis-pagination', className ?? ''].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <span className="aegis-pagination__count">{`共 ${total} ${unit}`}</span>
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
        aria-label="上一页"
        onClick={() => {
          onChange(page - 1, pageSize);
        }}
      >
        上一页
      </Button>
      <span className="aegis-pagination__page">{`${page} / ${pages}`}</span>
      <Button
        tone="secondary"
        disabled={page >= pages}
        aria-label="下一页"
        onClick={() => {
          onChange(page + 1, pageSize);
        }}
      >
        下一页
      </Button>
    </div>
  );
}
