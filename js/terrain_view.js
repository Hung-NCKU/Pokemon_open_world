// Reuse composed terrain while the camera travels inside the same tile.
// Dynamic actors, weather and grass overlays still draw every frame.
export class TerrainView {
  draw(g, world, { x0, y0, width, height, tileSize, ox, oy, frame, assets, onError }) {
    const key = `${x0},${y0},${width},${height},${frame},${world.revision || 0},${assets}`;
    if (!this.canvas) this.canvas = document.createElement('canvas');
    if (this.key !== key || this.tiles !== world.tiles || this.tileCache !== world.tileCache) {
      this.canvas.width = (width + 1) * tileSize;
      this.canvas.height = (height + 1) * tileSize;
      const ctx = this.canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
      for (let y = 0; y <= height; y++) for (let x = 0; x <= width; x++) {
        try { world.drawTile(ctx, world.tile(x0 + x, y0 + y), x0 + x, y0 + y, x * tileSize, y * tileSize, frame); }
        catch (error) { onError(error, x0 + x, y0 + y); }
      }
      this.key = key; this.tiles = world.tiles; this.tileCache = world.tileCache;
    }
    g.drawImage(this.canvas, x0 * tileSize - ox, y0 * tileSize - oy);
  }
}
