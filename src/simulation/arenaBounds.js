export function createArenaBounds({ canvas, arena }) {
  return {
    left: arena.wallPadding,
    right: canvas.width - arena.wallPadding,
    floorY: arena.floorY,
    overscan: arena.overscan,
  };
}
