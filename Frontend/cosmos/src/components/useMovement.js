import { useEffect, useRef } from 'react';


const SPEED = 3;

export function useMovement() {
  const keys = useRef({});

  useEffect(() => {
    const onKeyDown = (e) => {
      keys.current[e.key] = true;
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
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

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