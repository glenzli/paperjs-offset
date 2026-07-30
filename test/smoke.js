const assert = require('assert');
const paper = require('paper');
const { PaperOffset, offset, offsetStroke, analyze } = require('../dist/index.cjs');

function approx(actual, expected, tolerance, message) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${expected}, got ${actual}`
  );
}

function unionAll(paths) {
  return paths.slice(1).reduce((result, path) => {
    const next = result.unite(path, { insert: true });
    result.remove();
    path.remove();
    return next;
  }, paths[0]);
}

function point(cx, cy, radius, angle) {
  return [
    cx + Math.cos(angle) * radius,
    cy + Math.sin(angle) * radius,
  ];
}

function makeLegacyStressStar(index, positive) {
  const points = 5 + index % 7;
  const radii = [];
  const rotations = [0, 0.17, 0.39, 0.61];
  for (let j = 0; j < points * 2; j += 1) {
    radii.push(j % 2 === 0 ? 58 + index * 2 : 15 + (index * 7 + j * 3) % 22);
  }
  return new paper.Path({
    segments: radii.map((radius, i) => point(0, 0, radius, rotations[(index + (positive ? 0 : 1)) % rotations.length] + Math.PI * 2 * i / radii.length)),
    closed: true,
    insert: false,
  });
}

function makeRegularStar(points, outerRadius, innerRadius) {
  return new paper.Path({
    segments: Array.from({ length: points * 2 }, (_, index) => {
      const radius = index % 2 === 0 ? outerRadius : innerRadius;
      return point(0, 0, radius, -Math.PI / 2 + Math.PI * index / points);
    }),
    closed: true,
    insert: false,
  });
}

function makeSmoothFallbackPath() {
  return new paper.Path({
    segments: [
      [[28.83699, 1.77406], [-0.72665, -8.14494], [0.72665, 8.14494]],
      [[9.87784, 17.66603], [11.76148, -5.86271], [-11.76148, 5.86271]],
      [[-25.64183, 24.13061], [8.15953, 9.23923], [-8.15953, -9.23923]],
      [[-27.45471, -26.46779], [-7.06706, 13.03961], [7.06706, -13.03961]],
      [[6.56689, -29.02241], [-12.10001, -8.24466], [12.10001, 8.24466]],
    ],
    closed: true,
    insert: false,
  });
}

function assertMonotonicInwardSeries(source, join, magnitudes, label) {
  let previousArea = Number.POSITIVE_INFINITY;
  let fullyEroded = false;
  magnitudes.forEach((magnitude) => {
    const result = offset(source, -magnitude, {
      insert: false,
      join,
      limit: 4,
      algorithm: 'auto',
    });
    const quality = analyze(source, result, -magnitude, { join });
    const area = Math.abs(result.area || 0);
    assert.ok(
      area <= previousArea + 0.5,
      `${label} should not grow at distance ${-magnitude}`
    );
    if (fullyEroded) {
      assert.strictEqual(
        quality.segmentCount,
        0,
        `${label} should not reappear at distance ${-magnitude}`
      );
    }
    fullyEroded = fullyEroded || quality.segmentCount === 0;
    previousArea = area;
    result.remove();
  });
}

function makeRectCircleHole(width, height, radius) {
  const rect = new paper.Path.Rectangle({
    point: [-width / 2, -height / 2],
    size: [width, height],
    insert: false,
  });
  const circle = new paper.Path.Circle({
    center: [0, 0],
    radius,
    insert: false,
  });
  const result = rect.exclude(circle, { insert: false });
  rect.remove();
  circle.remove();
  return result;
}

function makeHookWithHole() {
  const outer = new paper.Path({ insert: false, closed: true });
  outer.moveTo([75, 470]);
  outer.lineTo([75, 94]);
  outer.lineTo([257, 94]);
  outer.cubicCurveTo([257, 205], [273, 300], [336, 356]);
  outer.cubicCurveTo([393, 408], [470, 447], [540, 470]);
  outer.lineTo([75, 470]);

  const hole = new paper.Path.Circle({
    center: [196, 349],
    radius: 62,
    insert: false,
  });
  const result = outer.subtract(hole, { insert: false });
  outer.remove();
  hole.remove();
  return result;
}

function makeJaggedSilhouette() {
  return new paper.Path({
    segments: [
      [74, 30], [95, 60], [103, 35], [108, 49], [119, 41], [129, 58],
      [131, 75], [125, 84], [130, 95], [149, 103], [128, 110], [121, 132],
      [116, 153], [107, 181], [92, 193], [76, 196], [63, 190], [50, 174],
      [47, 156], [55, 140], [65, 128], [61, 116], [54, 104], [58, 87],
      [72, 84], [76, 72], [88, 70], [94, 57],
    ],
    closed: true,
    insert: false,
  });
}

function makeConcaveNestedCompound() {
  const outer = new paper.Path({
    segments: [
      [0, 0], [100, 0], [100, 20], [20, 20],
      [20, 80], [100, 80], [100, 100], [0, 100],
    ],
    closed: true,
    insert: false,
  });
  const hole = new paper.Path({
    segments: [
      [5, 5], [95, 5], [95, 15], [15, 15],
      [15, 85], [95, 85], [95, 95], [5, 95],
    ],
    closed: true,
    insert: false,
  });
  if (!outer.clockwise) {
    outer.reverse();
  }
  if (hole.clockwise) {
    hole.reverse();
  }
  return new paper.CompoundPath({
    children: [outer, hole],
    insert: false,
  });
}

function makeNestedIslandCompound(withInnerHole) {
  const contours = [
    { radius: 100, clockwise: true },
    { radius: 60, clockwise: false },
    { radius: 20, clockwise: true },
  ];
  if (withInnerHole) {
    contours.push({ radius: 8, clockwise: false });
  }
  return new paper.CompoundPath({
    children: contours.map(({ radius, clockwise }) => {
      const child = new paper.Path.Circle({
        center: [0, 0],
        radius,
        insert: false,
      });
      if (child.clockwise !== clockwise) {
        child.reverse();
      }
      return child;
    }),
    insert: false,
  });
}

function makeUnevenDisjointCompound() {
  return new paper.CompoundPath({
    children: [
      new paper.Path.Circle({ center: [-130, 0], radius: 100, insert: false }),
      new paper.Path.Circle({ center: [130, 0], radius: 3, insert: false }),
    ],
    insert: false,
  });
}

function medianBoundaryDistance(source, result, sampleCount = 64) {
  const distances = [];
  for (let i = 0; i < sampleCount; i += 1) {
    const point = result.getPointAt(result.length * i / sampleCount);
    const nearest = source.getNearestPoint(point);
    distances.push(point.getDistance(nearest));
  }
  distances.sort((a, b) => a - b);
  return distances[Math.floor(distances.length / 2)];
}

paper.setup(new paper.Size(1200, 900));

{
  const path = new paper.Path.Rectangle({
    point: [10, 10],
    size: [40, 40],
    insert: false,
  });
  assert.throws(
    () => offset(path, Number.NaN, { insert: false }),
    /Offset distance must be a finite number/
  );
  assert.throws(
    () => offsetStroke(path, Number.POSITIVE_INFINITY, { insert: false }),
    /Offset distance must be a finite number/
  );
  assert.throws(
    () => analyze(path, path, Number.NaN),
    /Offset distance must be a finite number/
  );
  assert.throws(
    () => offset(path, 5, { insert: false, algorithm: 'unknown' }),
    /Unsupported offset algorithm/
  );
  assert.throws(
    () => offset(new paper.Path({ insert: false }), 5, { insert: false }),
    /at least one non-zero-length curve/
  );
  const clone = offset(path, 0, { insert: false });
  assert.notStrictEqual(clone, path);
  assert.strictEqual(clone.pathData, path.pathData);
}

{
  const path = new paper.Path.Rectangle({
    point: [10, 10],
    size: [40, 40],
    insert: false,
  });
  const result = offset(path, 5, { insert: false });

  assert.strictEqual(result.className, 'Path');
  approx(result.area, 2500, 0.001, 'rectangle offset area');
  assert.deepStrictEqual(analyze(path, result, 5).warnings, []);
}

{
  const path = new paper.Path({
    segments: [[0, 0], [20, 20], [0, 20], [20, 0]],
    closed: true,
    insert: false,
  });
  const quality = analyze(path, path, 1);

  assert.ok(quality.selfIntersections > 0, 'crossing geometry should be reported as self-intersecting');
  assert.ok(quality.warnings.includes('self-intersection'));
}

{
  const path = new paper.Path.Line({
    from: [10, 80],
    to: [60, 80],
    strokeColor: 'black',
    insert: false,
  });
  const result = offsetStroke(path, 5, {
    insert: false,
    cap: 'round',
  });

  assert.strictEqual(result.className, 'Path');
  assert.strictEqual(result.closed, true);
  approx(result.area, 500 + Math.PI * 25, 0.5, 'horizontal round stroke area');
}

{
  const path = new paper.Path({
    pathData: 'M700 400 L900 550',
    strokeColor: 'black',
    insert: false,
  });
  const result = PaperOffset.offsetStroke(path, 10, {
    insert: false,
    cap: 'round',
    join: 'round',
  });

  assert.strictEqual(result.className, 'Path');
  assert.strictEqual(result.closed, true);
  approx(result.area, 5000 + Math.PI * 100, 1, 'diagonal round stroke area');
}

{
  const angle = Math.atan(0.9266588281199828);
  const x = Math.cos(angle) * 100;
  const y = Math.sin(angle) * 100;
  const xOffset = 0.7260725539107398 - x / 2;
  const yOffset = 1.2302079087572793 - y / 2;
  const path = new paper.Path.Line({
    from: [xOffset, yOffset],
    to: [x + xOffset, y + yOffset],
    strokeColor: 'black',
    insert: false,
  });
  const result = offsetStroke(path, 5, {
    insert: false,
    cap: 'round',
  });

  assert.strictEqual(result.className, 'Path');
  assert.strictEqual(result.closed, true);
  approx(result.area, 1000 + Math.PI * 25, 0.5, 'near-zero area round stroke area');
}

{
  const path = unionAll([
    new paper.Path.Circle({ center: [180, 260], radius: 50, insert: false }),
    new paper.Path.Circle({ center: [230, 260], radius: 40, insert: false }),
    new paper.Path.Circle({ center: [205, 200], radius: 40, insert: false }),
  ]);
  path.translate(new paper.Point(-100, -100));

  const legacy = offset(path, 24, {
    insert: false,
    algorithm: 'legacy',
  });
  const robust = offset(path, 24, {
    insert: false,
    algorithm: 'robust',
  });
  const result = offset(path, 24, {
    insert: false,
    algorithm: 'auto',
  });
  const legacyQuality = analyze(path, legacy, 24);
  const resultQuality = analyze(path, result, 24);

  assert.strictEqual(result.className, 'Path');
  assert.strictEqual(result.closed, true);
  assert.ok(resultQuality.score < legacyQuality.score, 'auto result should score better than legacy result');
  approx(legacy.area, 27427.13, 0.5, 'legacy concave miter offset area');
  approx(robust.area, 27465.24, 0.5, 'robust concave miter offset area');
  approx(result.area, 27465.24, 0.5, 'closed concave miter offset area');
}

{
  const legacySource = makeLegacyStressStar(9, true);
  const autoSource = makeLegacyStressStar(9, true);
  const legacy = offset(legacySource, 14, {
    insert: false,
    join: 'miter',
    limit: 4,
    algorithm: 'robust',
  });
  const result = offset(autoSource, 14, {
    insert: false,
    join: 'miter',
    limit: 4,
    algorithm: 'auto',
  });
  const legacyQuality = analyze(legacySource, legacy, 14);
  const resultQuality = analyze(autoSource, result, 14);

  assert.ok(legacyQuality.warnings.includes('offset-center-shift'), 'strict miter star should report center shift');
  assert.strictEqual(resultQuality.warnings.includes('offset-center-shift'), false);
  assert.ok(resultQuality.score < legacyQuality.score, 'auto should avoid miter spike center shift');
}

{
  const source = makeLegacyStressStar(5, true);
  const result = offset(source, -12, {
    insert: false,
    join: 'bevel',
    algorithm: 'robust',
  });
  const roundAssumption = analyze(source, result, -12, { join: 'round' });
  const bevelQuality = analyze(source, result, -12, { join: 'bevel' });

  assert.ok(roundAssumption.distanceErrors > 0, 'round diagnostics should enforce radial join distance');
  assert.strictEqual(bevelQuality.distanceErrors, 0, 'bevel diagnostics should allow the expected join shortcut');
  assert.strictEqual(bevelQuality.warnings.includes('offset-distance-collapse'), false);
}

{
  ['adaptive', 'auto'].forEach((algorithm) => {
    const source = makeLegacyStressStar(10, false);
    const result = offset(source, -11, {
      insert: false,
      join: 'round',
      limit: 4,
      algorithm,
    });
    approx(
      medianBoundaryDistance(source, result),
      11,
      0.5,
      `${algorithm} should preserve the requested inward distance`
    );
  });
}

{
  const pathData = 'M74,0l-48.01924,15l11.01924,49.08588l-37,-28.08588l-37,28.08588l19.67949,-54.08588l-56.67949,-10l51.48334,-13l-14.48334,-51.08588l37,32.08588l37,-32.08588l-23.14359,56.08588z';
  const source = new paper.Path({ pathData, insert: false });
  const surviving = offset(source, -21, {
    insert: false,
    join: 'round',
    limit: 4,
    algorithm: 'auto',
  });
  const eroded = offset(source, -22, {
    insert: false,
    join: 'round',
    limit: 4,
    algorithm: 'auto',
  });

  assert.ok(Math.abs(surviving.area) > 0, 'playground star should retain its last valid inward region');
  assert.strictEqual(
    analyze(source, eroded, -22, { join: 'round' }).segmentCount,
    0,
    'playground star should not grow a collapsed contour after full erosion'
  );

  let previousArea = Number.POSITIVE_INFINITY;
  let fullyEroded = false;
  for (let magnitude = 15; magnitude <= 24; magnitude += 1) {
    const result = offset(source, -magnitude, {
      insert: false,
      join: 'round',
      limit: 4,
      algorithm: 'auto',
    });
    const quality = analyze(source, result, -magnitude, { join: 'round' });
    const area = Math.abs(result.area || 0);
    assert.ok(
      area <= previousArea + 0.5,
      `playground star inward area should not grow at distance ${-magnitude}`
    );
    if (fullyEroded) {
      assert.strictEqual(
        quality.segmentCount,
        0,
        `playground star should not reappear at distance ${-magnitude}`
      );
    }
    fullyEroded = fullyEroded || quality.segmentCount === 0;
    previousArea = area;
  }
}

{
  const source = makeRegularStar(8, 70, 12);
  const result = offset(source, -12, {
    insert: false,
    join: 'round',
    limit: 4,
    algorithm: 'auto',
  });
  assert.strictEqual(
    analyze(source, result, -12, { join: 'round' }).segmentCount,
    0,
    'round erosion should be empty when only a zero-area center point remains'
  );
  result.remove();
  source.remove();
}

{
  const source = makeRegularStar(12, 70, 28);
  assertMonotonicInwardSeries(
    source,
    'miter',
    Array.from({ length: 31 }, (_, index) => index + 6),
    'regular star miter erosion'
  );
  source.remove();
}

{
  const source = makeRegularStar(5, 70, 28);
  assertMonotonicInwardSeries(
    source,
    'bevel',
    Array.from({ length: 17 }, (_, index) => index + 20),
    'regular star bevel erosion'
  );
  source.remove();
}

{
  const source = makeSmoothFallbackPath();
  const distance = -24.03534;
  const strict = offset(source, distance, {
    insert: false,
    join: 'bevel',
    algorithm: 'robust',
  });
  const rounded = offset(source, distance, {
    insert: false,
    join: 'round',
    algorithm: 'robust',
  });
  const adaptive = offset(source, distance, {
    insert: false,
    join: 'bevel',
    algorithm: 'adaptive',
  });
  const automatic = offset(source, distance, {
    insert: false,
    join: 'bevel',
    algorithm: 'auto',
  });

  assert.ok(
    analyze(source, strict, distance, { join: 'bevel' }).warnings.includes('offset-distance-collapse'),
    'strict bevel erosion should expose the collapsed boundary candidate'
  );
  assert.deepStrictEqual(
    analyze(source, adaptive, distance, { join: 'bevel' }).warnings,
    [],
    'adaptive erosion should replace a distance-collapsed join'
  );
  assert.deepStrictEqual(
    analyze(source, automatic, distance, { join: 'bevel' }).warnings,
    [],
    'auto erosion should retain the healthy adaptive fallback'
  );
  approx(
    Math.abs(automatic.area),
    Math.abs(rounded.area),
    0.001,
    'auto distance-collapse fallback area'
  );

  strict.remove();
  rounded.remove();
  adaptive.remove();
  automatic.remove();
  source.remove();
}

{
  const source = new paper.Path.Circle({
    center: [3, -5],
    radius: 20,
    insert: false,
  });
  const result = offset(source, -19.872, {
    insert: false,
    join: 'round',
    algorithm: 'auto',
  });
  const expected = new paper.Path.Circle({
    center: [3, -5],
    radius: 0.128,
    insert: false,
  });
  assert.strictEqual(
    analyze(source, result, -19.872, { join: 'round' }).segmentCount,
    4,
    'near-collapsed circle should retain its canonical four segments'
  );
  approx(
    Math.abs(result.area),
    Math.abs(expected.area),
    0.0001,
    'near-collapsed circle area'
  );

  const eroded = offset(source, -20, {
    insert: false,
    join: 'round',
    algorithm: 'auto',
  });
  assert.strictEqual(
    analyze(source, eroded, -20, { join: 'round' }).segmentCount,
    0,
    'circle should be empty at its radius'
  );

  result.remove();
  expected.remove();
  eroded.remove();
  source.remove();
}

{
  const outer = new paper.Path.Circle({
    center: [0, 0],
    radius: 70,
    insert: false,
  });
  const hole = new paper.Path.Circle({
    center: [10, -10],
    radius: 12.5,
    insert: false,
  });
  const source = outer.subtract(hole, { insert: false });
  const result = offset(source, 12.4, {
    insert: false,
    join: 'round',
    algorithm: 'auto',
  });
  const quality = analyze(source, result, 12.4, { join: 'round' });
  assert.deepStrictEqual(quality.warnings, [], 'near-collapsed circular hole should remain healthy');
  assert.ok(
    quality.segmentCount <= 8,
    'near-collapsed circular hole should not create excessive segments'
  );

  outer.remove();
  hole.remove();
  source.remove();
  result.remove();
}

{
  const source = makeRectCircleHole(386, 350, 163);
  for (let i = 1; i < 5; i += 0.5) {
    const distance = -i * 163 / 20;
    const result = offset(source, distance, {
      insert: false,
      join: 'miter',
      limit: 10,
    });
    const quality = analyze(source, result, distance);

    assert.deepStrictEqual(quality.warnings, [], `rect-circle hole inward offset ${distance} should stay clean`);
    assert.strictEqual(quality.selfIntersections, 0, `rect-circle hole inward offset ${distance} should not self-intersect`);
  }
}

{
  const distances = [-80, -100, -120, -140];
  distances.forEach((distance) => {
    const source = makeHookWithHole();
    const result = offset(source, distance, {
      insert: false,
      join: 'miter',
      limit: 10,
    });
    const quality = analyze(source, result, distance);

    if (distance === -80) {
      assert.deepStrictEqual(quality.warnings, [], `hook hole inward offset ${distance} should stay clean`);
      assert.strictEqual(quality.selfIntersections, 0, `hook hole inward offset ${distance} should not self-intersect`);
    } else {
      assert.strictEqual(quality.segmentCount, 0, `hook hole inward offset ${distance} should be fully eroded`);
      assert.ok(quality.warnings.includes('empty-result'));
    }
  });
}

{
  const source = makeConcaveNestedCompound();
  const result = offset(source, 2, {
    insert: false,
    join: 'miter',
    algorithm: 'robust',
  });

  assert.strictEqual(source.children[0].contains(source.children[1].bounds.center), false);
  assert.strictEqual(source.children[0].contains(source.children[1].interiorPoint), true);
  assert.strictEqual(result.contains(new paper.Point(10, 50)), false, 'concave compound hole should remain a hole');
  assert.strictEqual(result.contains(new paper.Point(50, 50)), false, 'concave outer cavity should stay outside');
}

{
  [-1, 1].forEach((distance) => {
    const source = makeNestedIslandCompound(false);
    const result = offset(source, distance, {
      insert: false,
      join: 'round',
      algorithm: 'robust',
    });

    assert.strictEqual(result.contains(new paper.Point(0, 0)), true, `nested island offset ${distance} should keep the island`);
    assert.strictEqual(result.contains(new paper.Point(40, 0)), false, `nested island offset ${distance} should keep the outer hole`);
    assert.strictEqual(result.contains(new paper.Point(80, 0)), true, `nested island offset ${distance} should keep the outer shell`);
  });
}

{
  const source = makeNestedIslandCompound(true);
  const result = offset(source, 1, {
    insert: false,
    join: 'round',
    algorithm: 'robust',
  });

  assert.strictEqual(result.contains(new paper.Point(0, 0)), false, 'four-level compound should keep the inner hole');
  assert.strictEqual(result.contains(new paper.Point(15, 0)), true, 'four-level compound should keep the island');
  assert.strictEqual(result.contains(new paper.Point(40, 0)), false, 'four-level compound should keep the outer hole');
  assert.strictEqual(result.contains(new paper.Point(80, 0)), true, 'four-level compound should keep the outer shell');
}

{
  const source = makeUnevenDisjointCompound();
  const result = offset(source, 1, {
    insert: false,
    join: 'round',
    algorithm: 'robust',
  });

  assert.strictEqual(result.contains(new paper.Point(-130, 0)), true, 'large disjoint component should remain');
  assert.strictEqual(result.contains(new paper.Point(130, 0)), true, 'small disjoint component should not be removed by relative area filtering');
}

{
  const source = makeJaggedSilhouette();
  const result = offset(source, 10, { insert: false });
  const quality = analyze(source, result, 10);

  assert.deepStrictEqual(quality.warnings, [], 'jagged silhouette outward offset should stay clean');
  assert.strictEqual(quality.selfIntersections, 0, 'jagged silhouette outward offset should not self-intersect');
}
