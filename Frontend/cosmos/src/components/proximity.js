// Calculate Euclidean distance between two points
// Math.hypot(dx, dy) = √(dx² + dy²)
export function getDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Returns true if two users are within chat range
export const PROXIMITY_RADIUS = 120; // pixels

export function isInProximity(userA, userB) {
  return getDistance(userA, userB) < PROXIMITY_RADIUS;
}

// Given the current user and a list of others,
// return only the ones who are close enough to chat
export function getNearbyUsers(me, others) {
  return others.filter((other) => isInProximity(me, other));
}