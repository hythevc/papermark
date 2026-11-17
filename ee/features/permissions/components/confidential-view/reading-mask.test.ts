import assert from "node:assert/strict";
import test from "node:test";

import { getReadingMaskPoint, getReadingMaskWindow } from "./reading-mask";

test("pointer coordinates follow each supported fullscreen quarter turn", () => {
  const rect = { left: 20, top: 30, right: 420, bottom: 630 };
  const point = { x: 100, y: 200 };
  assert.deepEqual(getReadingMaskPoint(point, rect, 0), { x: 80, y: 170 });
  assert.deepEqual(getReadingMaskPoint(point, rect, 90), { x: 170, y: 320 });
  assert.deepEqual(getReadingMaskPoint(point, rect, 180), { x: 320, y: 430 });
  assert.deepEqual(getReadingMaskPoint(point, rect, 270), { x: 430, y: 80 });
  assert.deepEqual(getReadingMaskPoint(point, rect, -90), { x: 430, y: 80 });
});

test("the revealed window cannot escape any edge or exceed a small viewport", () => {
  for (const bounds of [
    { width: 390, height: 600 },
    { width: 200, height: 80 },
    { width: 0, height: 0 },
  ]) {
    for (const center of [
      { x: -100, y: -100 },
      { x: 10000, y: 10000 },
      { x: 195, y: 300 },
    ]) {
      const aperture = getReadingMaskWindow(bounds, center);
      assert.ok(aperture.left >= 0 && aperture.top >= 0);
      assert.ok(aperture.left + aperture.width <= bounds.width);
      assert.ok(aperture.top + aperture.height <= bounds.height);
    }
  }
});
