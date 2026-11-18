export type MaskBounds = { width: number; height: number };
export type MaskPoint = { x: number; y: number };

/** Map viewport input into the viewer's quarter-turn presentation coordinates. */
export function getReadingMaskPoint(
  client: MaskPoint,
  rect: { left: number; top: number; right: number; bottom: number },
  rotation: number,
): MaskPoint {
  switch (((rotation % 360) + 360) % 360) {
    case 90:
      return { x: client.y - rect.top, y: rect.right - client.x };
    case 180:
      return { x: rect.right - client.x, y: rect.bottom - client.y };
    case 270:
      return { x: rect.bottom - client.y, y: client.x - rect.left };
    default:
      return { x: client.x - rect.left, y: client.y - rect.top };
  }
}

/** The aperture always stays within the mask, including very small viewers. */
export function getReadingMaskWindow(bounds: MaskBounds, center: MaskPoint) {
  const width = Math.min(360, Math.max(0, bounds.width));
  const height = Math.min(140, Math.max(0, bounds.height));
  return {
    width,
    height,
    left: Math.max(0, Math.min(center.x - width / 2, bounds.width - width)),
    top: Math.max(0, Math.min(center.y - height / 2, bounds.height - height)),
  };
}
