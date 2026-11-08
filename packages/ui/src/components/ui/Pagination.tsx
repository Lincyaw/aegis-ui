import { LeftOutlined, RightOutlined } from '@ant-design/icons';

import { useStrings } from '../../locale';
import { Button } from './Button';
import { PageSizeSelect } from './PageSizeSelect';
import './Pagination.css';

export interface PaginationProps {
  /** 1-based. */
  page: number;
  pageSize: number;
  /**
   * Rows across all pages. Omit when the backend doesn't count them: the
   * range drops "of N" and Next stays enabled while the page is full.
   */
  total?: number;
  /**
   * Rows on the current page. Sets the range and Next when `total` is
   * omitted; defaults to a full page.
   */
  pageRowCount?: number;
  /** Changing the page size always resets to page 1. */
  onChange: (page: number, pageSize: number) => void;
  /** Renders a "Rows per page" select offering these sizes. */
  pageSizeOptions?: number[];
  /** Disables Previous and Next, e.g. while the next page loads. */
  disabled?: boolean;
  className?: string;
}

export function Pagination({
  page,
  pageSize,
  total,
  pageRowCount = pageSize,
  onChange,
  pageSizeOptions,
  disabled = false,
  className,
}: PaginationProps) {
  const strings = useStrings();
  const offset = (page - 1) * pageSize;
  const shown =
    total === undefined
      ? pageRowCount
      : Math.max(0, Math.min(pageSize, total - offset));
  const hasNext =
    total === undefined ? pageRowCount >= pageSize : offset + pageSize < total;
  const cls = ['aegis-pagination', className ?? ''].filter(Boolean).join(' ');

  return (
    <div className={cls}>
      {pageSizeOptions && (
        <PageSizeSelect
          value={pageSize}
          options={pageSizeOptions}
          onChange={(size) => {
            onChange(1, size);
          }}
        />
      )}
      <div className="aegis-pagination__pager">
        <span className="aegis-pagination__range">
          <span className="aegis-pagination__range-num">
            {shown > 0
              ? `${(offset + 1).toLocaleString()}–${(offset + shown).toLocaleString()}`
              : '0'}
          </span>
          {total !== undefined && (
            <>
              {strings.rangeOf}
              <span className="aegis-pagination__range-num">
                {total.toLocaleString()}
              </span>
            </>
          )}
        </span>
        <Button
          tone="secondary"
          className="aegis-pagination__step"
          aria-label={strings.previousPage}
          disabled={disabled || page <= 1}
          onClick={() => {
            onChange(page - 1, pageSize);
          }}
        >
          <LeftOutlined />
        </Button>
        <Button
          tone="secondary"
          className="aegis-pagination__step"
          aria-label={strings.nextPage}
          disabled={disabled || !hasNext}
          onClick={() => {
            onChange(page + 1, pageSize);
          }}
        >
          <RightOutlined />
        </Button>
      </div>
    </div>
  );
}
