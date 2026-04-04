import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { useMovement } from './useMovement';
import { PROXIMITY_RADIUS, isInProximity } from './proximity';

// Props:
//   me         — { socketId, username, color, x, y }  (the local user)
//   others     — array of other connected users
//   onMove     — callback(x, y) called when we move, to emit to server
//   onProximity — callback(nearbyUsers[]) called when nearby users change
export default function CosmosCanvas({ me, others, onMove, onProximity }) {
  const canvasRef = useRef(null);   // DOM element where PixiJS renders
  const appRef = useRef(null);      // PixiJS Application instance
  const sprites = useRef({});       // { socketId: PIXI.Graphics } map
  const myPos = useRef({ x: 400, y: 300 }); // local position (mutable, no re-render)
  const { getDelta } = useMovement();

  // ── INITIALIZE PIXI ON MOUNT ────────────────────────────────────
  useEffect(() => {
    const app = new PIXI.Application();

    // async init — PixiJS v8 requires awaiting
    (async () => {
      await app.init({
        canvas: canvasRef.current,
        resizeTo: canvasRef.current.parentElement,
        background: 0x0a0a0f,
        antialias: true,
      });

      appRef.current = app;

      // Draw a dot-grid background (decorative)
      const grid = new PIXI.Graphics();
      for (let x = 0; x < app.screen.width; x += 40) {
        for (let y = 0; y < app.screen.height; y += 40) {
          grid.circle(x, y, 1).fill({ color: 0xffffff, alpha: 0.06 });
        }
      }
      app.stage.addChild(grid);

      // Create MY avatar sprite
      sprites.current[me.socketId] = createUserSprite(app, me, true);

      // Game loop — runs every frame (~60fps)
      app.ticker.add(() => {
        const { dx, dy } = getDelta();

        if (dx !== 0 || dy !== 0) {
          // Clamp position so user can't leave the canvas
          myPos.current.x = Math.max(20, Math.min(app.screen.width - 20, myPos.current.x + dx));
          myPos.current.y = Math.max(20, Math.min(app.screen.height - 20, myPos.current.y + dy));

          // Update my sprite position
          const mySprite = sprites.current[me.socketId];
          if (mySprite) {
            mySprite.x = myPos.current.x;
            mySprite.y = myPos.current.y;
          }

          // Emit to server (throttled to every 2 frames to reduce traffic)
          onMove(myPos.current.x, myPos.current.y);
        }

        // Recalculate proximity every frame
        // Build the "me" object with current position for comparison
        const currentMe = { ...me, ...myPos.current };
        const nearby = others.filter(u => isInProximity(currentMe, u));
        onProximity(nearby);

        // Draw proximity rings and connection lines
        renderProximity(app, sprites.current, currentMe, others);
      });
    })();

    return () => {
      // Cleanup when component unmounts
      app.destroy(true);
      appRef.current = null;
    };
  }, []); // Empty deps — only run on mount/unmount

  // ── SYNC OTHER USERS ────────────────────────────────────────────
  // When `others` changes (someone joined/moved/left), update their sprites
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;

    const currentIds = new Set(others.map(u => u.socketId));

    // Remove sprites for users who left
    Object.keys(sprites.current).forEach(id => {
      if (id !== me.socketId && !currentIds.has(id)) {
        app.stage.removeChild(sprites.current[id]);
        sprites.current[id].destroy();
        delete sprites.current[id];
      }
    });

    // Add or update sprites for current users
    others.forEach(user => {
      if (!sprites.current[user.socketId]) {
        sprites.current[user.socketId] = createUserSprite(app, user, false);
      } else {
        // Update position smoothly
        sprites.current[user.socketId].x = user.x;
        sprites.current[user.socketId].y = user.y;
      }
    });
  }, [others]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}

// ── HELPER: Create a user avatar (circle + label) ────────────────
function createUserSprite(app, user, isMe) {
  const container = new PIXI.Container();
  container.x = user.x;
  container.y = user.y;

  const radius = isMe ? 18 : 15;
  const color = parseInt(user.color.replace('#', ''), 16);

  // Glow / proximity ring (only visible when in range — updated separately)
  const ring = new PIXI.Graphics();
  ring.circle(0, 0, PROXIMITY_RADIUS)
    .stroke({ color, alpha: 0.15, width: 1.5 });
  ring.label = 'ring';
  container.addChild(ring);

  // Avatar circle
  const circle = new PIXI.Graphics();
  circle.circle(0, 0, radius).fill({ color });
  circle.circle(0, 0, radius).stroke({ color: 0xffffff, alpha: 0.3, width: 1.5 });
  container.addChild(circle);

  // Name label
  const label = new PIXI.Text({
    text: user.username + (isMe ? ' (you)' : ''),
    style: {
      fontSize: 11,
      fill: 0xe8e8f0,
      fontFamily: 'Space Grotesk, sans-serif',
    },
  });
  label.anchor.set(0.5, 0);
  label.y = radius + 4;
  container.addChild(label);

  app.stage.addChild(container);
  return container;
}

// ── HELPER: Draw connection lines between nearby users ───────────
function renderProximity(app, sprites, me, others) {
  // Remove previous connection lines
  const existing = app.stage.getChildByLabel('connections');
  if (existing) app.stage.removeChild(existing);

  const lines = new PIXI.Graphics();
  lines.label = 'connections';

  others.forEach(user => {
    const d = Math.hypot(me.x - user.x, me.y - user.y);
    if (d < PROXIMITY_RADIUS) {
      // Alpha fades from 1 (very close) to 0 (at edge of range)
      const alpha = 1 - d / PROXIMITY_RADIUS;
      lines.moveTo(me.x, me.y)
        .lineTo(user.x, user.y)
        .stroke({ color: 0x7c6dfa, alpha: alpha * 0.6, width: 1.5 });
    }
  });

  app.stage.addChildAt(lines, 1); // behind avatars
}