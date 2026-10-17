// World coordinates stay on tiles; drawing follows one complete, constant-speed step.
export function movementDuration({ charging = false, fleeing = false } = {}) {
  return charging ? 180 : fleeing ? 210 : 260;
}

export function motionPose(w, now) {
  const duration = w.moveMs || 260;
  const elapsed = w.moved === undefined ? duration : Math.max(0, now - w.moved);
  const progress = Math.min(1, elapsed / duration);
  const fromX = w.px ?? w.x, fromY = w.py ?? w.y;
  const moving = progress < 1 && (fromX !== w.x || fromY !== w.y);
  return {
    x: fromX + (w.x - fromX) * progress,
    y: fromY + (w.y - fromY) * progress,
    dir: w.dir || 'down', moving, progress,
    frame: moving ? Math.floor(progress * 4) % 2 : 0,
  };
}
