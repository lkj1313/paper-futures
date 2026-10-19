const GRAB_DISTANCE_PX = 5;

export function findDraggableLine(
  lines: { id?: string; y: number | null }[],
  pointerY: number,
): string | null {
  let nearest: { id: string; distance: number } | null = null;
  for (const { id, y } of lines) {
    if (!id || y === null) continue;
    const distance = Math.abs(y - pointerY);
    if (distance > GRAB_DISTANCE_PX) continue;
    if (!nearest || distance < nearest.distance) nearest = { id, distance };
  }
  return nearest?.id ?? null;
}
