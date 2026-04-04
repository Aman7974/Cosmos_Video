import { useEffect, useRef } from 'react';

// SPEED controls pixels per frame your avatar moves
const SPEED = 3;

export function useMovement() {
  // useRef stores values that DON'T cause re-renders
  // Perfect for tracking key state (changes 60x/sec)
  const keys = useRef({});

  useEffect(() => {
    const onKeyDown = (e) => {
      keys.current[e.key] = true;
      // Prevent arrow keys from scrolling the page
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
    };
    const onKeyUp = (e) => {
      keys.current[e.key] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      // Cleanup: remove listeners when component unmounts
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Call this every frame to get dx/dy movement deltas
  function getDelta() {
    let dx = 0;
    let dy = 0;

    if (keys.current['w'] || keys.current['W'] || keys.current['ArrowUp'])    dy -= SPEED;
    if (keys.current['s'] || keys.current['S'] || keys.current['ArrowDown'])  dy += SPEED;
    if (keys.current['a'] || keys.current['A'] || keys.current['ArrowLeft'])  dx -= SPEED;
    if (keys.current['d'] || keys.current['D'] || keys.current['ArrowRight']) dx += SPEED;

    return { dx, dy };
  }

  return { getDelta };
}