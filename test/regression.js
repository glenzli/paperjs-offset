const assert = require('node:assert/strict');
const { test } = require('node:test');
const paper = require('paper');
const { offset, offsetStroke, analyze } = require('../dist/index.cjs');

const algorithms = ['auto', 'adaptive', 'robust', 'split', 'legacy'];
paper.setup(new paper.Size(1200, 900));

function approx(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-5, `${message}: expected ${expected}, got ${actual}`);
}

function assertBounds(result, expected) {
  ['x', 'y', 'width', 'height'].forEach((key) => approx(result.bounds[key], expected[key], `bounds.${key}`));
}

function snapshot(source) {
  return source.exportJSON({ asString: true, precision: 16 });
}

const transforms = {
  translation: (path) => path.translate([200, 100]),
  scaling: (path) => path.scale(2, 3, [0, 0]).translate([200, 100]),
  rotation: (path) => path.rotate(90, [0, 0]).translate([200, 100]),
  reflection: (path) => path.scale(-1, 1, [0, 0]).translate([200, 100]),
};

for (const [name, transform] of Object.entries(transforms)) {
  for (const algorithm of algorithms) {
    test(`${algorithm}: ${name} uses parent coordinates without changing the source`, () => {
      const source = new paper.Path.Rectangle({
        point: [0, 0], size: [100, 60], applyMatrix: false, insert: false,
      });
      transform(source);
      const before = snapshot(source);
      const bounds = source.bounds.clone();
      for (const distance of [-5, 5]) {
        const result = offset(source, distance, { algorithm, join: 'miter', insert: false });
        assertBounds(result, bounds.expand(distance * 2));
        approx(result.area, (bounds.width + distance * 2) * (bounds.height + distance * 2), 'offset area');
        assert.deepEqual(analyze(source, result, distance).warnings, []);
        result.remove();
      }
      const outline = offsetStroke(source, 5, { algorithm, insert: false });
      assertBounds(outline, bounds.expand(10));
      approx(outline.area, 20 * (bounds.width + bounds.height), 'stroke area');
      assert.equal(outline.contains(bounds.center), false, 'stroke should retain its interior hole');
      assert.equal(outline.contains([bounds.left, bounds.center.y]), true, 'stroke should cover the translated edge');
      assert.deepEqual(analyze(source, outline, 5, { stroke: true }).warnings, []);
      assert.equal(snapshot(source), before);
      outline.remove();
      source.remove();
    });
  }
}

for (const algorithm of algorithms) {
  test(`${algorithm}: compound and child matrices are both applied`, () => {
    const first = new paper.Path.Rectangle({ point: [0, 0], size: [100, 60], applyMatrix: false, insert: false });
    const second = new paper.Path.Rectangle({ point: [0, 0], size: [50, 60], applyMatrix: false, insert: false });
    second.translate([200, 0]);
    const source = new paper.CompoundPath({ children: [first, second], applyMatrix: false, insert: false });
    source.scale(2, [0, 0]);
    source.translate([200, 100]);
    const before = snapshot(source);
    const result = offset(source, 5, { algorithm, insert: false });
    assertBounds(result, new paper.Rectangle(195, 95, 510, 130));
    approx(result.area, 210 * 130 + 110 * 130, 'compound offset area');
    assert.equal(result.contains([300, 160]), true);
    assert.equal(result.contains([500, 160]), false);
    const outline = offsetStroke(source, 5, { algorithm, insert: false });
    approx(outline.area, 20 * (200 + 120 + 100 + 120), 'compound stroke area');
    assert.equal(outline.contains([300, 160]), false);
    assert.equal(outline.contains([200, 160]), true);
    assert.equal(outline.contains([600, 160]), true);
    assert.equal(snapshot(source), before);
    source.remove();
    result.remove();
    outline.remove();
  });
}

const degeneratePaths = {
  empty: () => new paper.Path({ insert: false }),
  point: () => new paper.Path({ segments: [[300, 200]], insert: false }),
  duplicate: () => new paper.Path({ segments: [[300, 200], [300, 200]], insert: false }),
};

for (const [kind, makeDegenerate] of Object.entries(degeneratePaths)) {
  for (const algorithm of algorithms) {
    test(`${algorithm}: compound ${kind} child does not break valid geometry`, () => {
      const source = new paper.CompoundPath({
        children: [new paper.Path.Rectangle({ point: [0, 0], size: [100, 60], insert: false }), makeDegenerate()],
        insert: false,
      });
      const before = snapshot(source);
      const result = offset(source, 5, { algorithm, insert: false });
      assertBounds(result, new paper.Rectangle(-5, -5, 110, 70));
      approx(result.area, 7700, 'offset with degenerate child');
      const outline = offsetStroke(source, 5, { algorithm, insert: false });
      approx(outline.area, 3200, 'stroke with degenerate child');
      assert.equal(outline.contains([50, 30]), false);
      assert.deepEqual(analyze(source, result, 5).warnings, [], 'degenerate children should not distort quality bounds');
      assert.equal(snapshot(source), before);
      source.remove();
      result.remove();
      outline.remove();
    });
  }
}

test('entirely degenerate sources still fail with a clear input error', () => {
  const source = new paper.CompoundPath({ children: Object.values(degeneratePaths).map((make) => make()), insert: false });
  for (const operation of [offset, offsetStroke]) {
    assert.throws(() => operation(source, 5, { insert: false }), /at least one non-zero-length curve/);
  }
  source.remove();
});

for (const algorithm of algorithms) {
  for (const cap of ['butt', 'round']) {
    test(`${algorithm}/${cap}: stroke distance sign is consistent for open and closed paths`, () => {
      const sources = [
        new paper.Path.Line({ from: [0, 0], to: [100, 0], insert: false }),
        new paper.Path.Rectangle({ point: [0, 0], size: [100, 60], insert: false }),
        new paper.CompoundPath({ children: [
          new paper.Path.Rectangle({ point: [0, 0], size: [100, 60], insert: false }),
          new paper.Path.Rectangle({ point: [200, 0], size: [100, 60], insert: false }),
        ], insert: false }),
      ];
      for (const source of sources) {
        const options = { algorithm, cap, insert: false };
        const positive = offsetStroke(source, 5, options);
        const negative = offsetStroke(source, -5, options);
        assert.ok(positive.area > 0);
        approx(negative.area, positive.area, 'negative stroke area');
        assertBounds(negative, positive.bounds);
        assert.equal(negative.pathData, positive.pathData);
        assert.equal(offsetStroke(source, 0, options).area, 0);
        source.remove();
        positive.remove();
        negative.remove();
      }
    });
  }
}

test('analyze accepts matrices on both input and result without mutating either', () => {
  const source = new paper.Path.Rectangle({ point: [0, 0], size: [100, 60], applyMatrix: false, insert: false });
  const result = new paper.Path.Rectangle({ point: [-5, -5], size: [110, 70], applyMatrix: false, insert: false });
  source.translate([200, 100]);
  result.translate([200, 100]);
  const before = [snapshot(source), snapshot(result)];
  assert.deepEqual(analyze(source, result, 5).warnings, []);
  assert.deepEqual([snapshot(source), snapshot(result)], before);
  source.remove();
  result.remove();
});
