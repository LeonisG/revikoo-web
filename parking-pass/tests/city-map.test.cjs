const { test } = require('node:test');
const assert = require('node:assert/strict');

test('every destination is connected through the illustrated street network', async () => {
  const { cityRoads, getParkingRoute, parkings } = await import('../city-map.js');
  const segments = cityRoads.flatMap(road => road.slice(1).map((b, i) => [road[i], b]));
  function onSegment(point, [a, b]) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy);
    return t >= -.0001 && t <= 1.0001 && Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dy) < .01;
  }
  for (const parking of parkings) {
    const route = getParkingRoute(parking);
    assert.deepEqual(route[0], [320, 695]);
    assert.deepEqual(route.at(-1), [parking.x * 10, parking.y * 7]);
    assert.ok(route.length > 3, `${parking.id} must traverse the network`);
    // Only the first/last legs are driveways; all intermediate legs stay on a road.
    for (let i = 2; i < route.length - 1; i++) {
      assert.ok(segments.some(segment => onSegment(route[i - 1], segment) && onSegment(route[i], segment)), `${parking.id}: street continuity at ${i}`);
    }
  }
});
