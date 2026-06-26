const assert = require('assert');
const paper = require('paper');
const { PaperOffset } = require('../dist/index.umd.js');

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

paper.setup(new paper.Size(1200, 900));

{
  const path = new paper.Path.Rectangle({
    point: [10, 10],
    size: [40, 40],
    insert: false,
  });
  const result = PaperOffset.offset(path, 5, { insert: false });

  assert.strictEqual(result.className, 'Path');
  approx(result.area, 2500, 0.001, 'rectangle offset area');
}

{
  const path = new paper.Path.Line({
    from: [10, 80],
    to: [60, 80],
    strokeColor: 'black',
    insert: false,
  });
  const result = PaperOffset.offsetStroke(path, 5, {
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
  const result = PaperOffset.offsetStroke(path, 5, {
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

  const legacy = PaperOffset.offset(path, 24, {
    insert: false,
    algorithm: 'legacy',
  });
  const robust = PaperOffset.offset(path, 24, {
    insert: false,
    algorithm: 'robust',
  });
  const result = PaperOffset.offset(path, 24, {
    insert: false,
    algorithm: 'auto',
  });
  const legacyQuality = PaperOffset.analyze(path, legacy, 24);
  const resultQuality = PaperOffset.analyze(path, result, 24);

  assert.strictEqual(result.className, 'Path');
  assert.strictEqual(result.closed, true);
  assert.ok(resultQuality.score < legacyQuality.score, 'auto result should score better than legacy result');
  approx(legacy.area, 27427.13, 0.5, 'legacy concave miter offset area');
  approx(robust.area, 27465.24, 0.5, 'robust concave miter offset area');
  approx(result.area, 27465.24, 0.5, 'closed concave miter offset area');
}
