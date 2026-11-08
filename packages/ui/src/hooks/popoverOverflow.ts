import type { PopoverProps } from 'antd';

/**
 * Flip on either axis, then slide along the trigger to stay on screen. antd's
 * `AdjustOverflow` type omits `shiftX`, but antd hands the object through to
 * rc-trigger, which supports it — without it a wide popover opened from the
 * middle of a phone screen runs off the edge.
 */
export const POPOVER_OVERFLOW = {
  adjustX: 1,
  adjustY: 1,
  shiftX: true,
} as PopoverProps['autoAdjustOverflow'];
