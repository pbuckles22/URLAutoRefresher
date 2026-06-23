/** Backlog #8 — overlay snap (left/right) and optional drag position (global pref). */

export type OverlayPositionAnchor = 'left' | 'right';

export type OverlayPosition = {
  /** Snap anchor when drag coords are unset. Default top-right. */
  anchor: OverlayPositionAnchor;
  /** Fixed pixel offset from viewport top-left; when set, anchor is ignored. */
  dragTop?: number;
  dragLeft?: number;
};

export const DEFAULT_OVERLAY_POSITION: OverlayPosition = { anchor: 'right' };

const DEFAULT_MARGIN_PX = 12;
const MINIMIZED_INSET_PX = 56;

export function parseOverlayPosition(raw: unknown): OverlayPosition {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_OVERLAY_POSITION };
  }
  const o = raw as Record<string, unknown>;
  const anchor: OverlayPositionAnchor = o.anchor === 'left' ? 'left' : 'right';
  let dragTop: number | undefined;
  let dragLeft: number | undefined;
  if (typeof o.dragTop === 'number' && Number.isFinite(o.dragTop)) {
    dragTop = o.dragTop;
  }
  if (typeof o.dragLeft === 'number' && Number.isFinite(o.dragLeft)) {
    dragLeft = o.dragLeft;
  }
  if (dragTop !== undefined && dragLeft !== undefined) {
    return { anchor, dragTop, dragLeft };
  }
  return { anchor };
}

export function toggleOverlaySnapAnchor(pos: OverlayPosition): OverlayPosition {
  return {
    anchor: pos.anchor === 'right' ? 'left' : 'right',
  };
}

export function clampOverlayDragPosition(
  top: number,
  left: number,
  hostWidth: number,
  hostHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  margin = 4
): { top: number; left: number } {
  const maxTop = Math.max(margin, viewportHeight - hostHeight - margin);
  const maxLeft = Math.max(margin, viewportWidth - hostWidth - margin);
  return {
    top: Math.min(Math.max(margin, top), maxTop),
    left: Math.min(Math.max(margin, left), maxLeft),
  };
}

export type OverlayHostStyle = {
  top: string;
  left: string;
  right: string;
  snapLeft: boolean;
};

/** CSS values for the shadow host element (fixed positioning). */
export function computeOverlayHostStyle(
  pos: OverlayPosition,
  minimized: boolean
): OverlayHostStyle {
  if (pos.dragTop !== undefined && pos.dragLeft !== undefined) {
    return {
      top: `${pos.dragTop}px`,
      left: `${pos.dragLeft}px`,
      right: 'auto',
      snapLeft: false,
    };
  }
  const inset = minimized ? MINIMIZED_INSET_PX : DEFAULT_MARGIN_PX;
  if (pos.anchor === 'left') {
    return {
      top: `${DEFAULT_MARGIN_PX}px`,
      left: `${inset}px`,
      right: 'auto',
      snapLeft: true,
    };
  }
  return {
    top: `${DEFAULT_MARGIN_PX}px`,
    left: 'auto',
    right: `${inset}px`,
    snapLeft: false,
  };
}
