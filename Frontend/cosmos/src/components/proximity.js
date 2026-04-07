// Calculate Euclidean distance between two points
export function getDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export const PROXIMITY_RADIUS = 120; // pixels

export function isInProximity(userA, userB) {
  return getDistance(userA, userB) < PROXIMITY_RADIUS;
}

export function getNearbyUsers(me, others) {
  return others.filter((other) => isInProximity(me, other));
}