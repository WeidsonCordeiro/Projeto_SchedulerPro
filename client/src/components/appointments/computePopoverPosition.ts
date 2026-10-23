export interface PopoverSize {
  width: number;
  height: number;
}

export interface PopoverCoords {
  top: number;
  left: number;
}

const VIEWPORT_MARGIN = 8;

/**
 * Posiciona um popover junto ao bloco âncora, preferindo abaixo e centrado,
 * com clamp ao viewport.
 */
export function computePopoverPosition(
  anchor: DOMRect,
  popover: PopoverSize,
  viewportWidth = window.innerWidth,
  viewportHeight = window.innerHeight,
): PopoverCoords {
  let top = anchor.bottom + VIEWPORT_MARGIN;
  if (top + popover.height > viewportHeight - VIEWPORT_MARGIN) {
    top = anchor.top - popover.height - VIEWPORT_MARGIN;
  }
  top = Math.max(
    VIEWPORT_MARGIN,
    Math.min(top, viewportHeight - popover.height - VIEWPORT_MARGIN),
  );

  let left = anchor.left + anchor.width / 2 - popover.width / 2;
  left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(left, viewportWidth - popover.width - VIEWPORT_MARGIN),
  );

  return { top, left };
}
