const assert = require('assert');
const paper = require('paper');
const { analyze, offset, offsetStroke } = require('../dist/index.cjs');

const DEFAULT_CASES = 400;
const DEFAULT_SEED = 0x5eed1234;
const CRITICAL_WARNINGS = new Set([
  'non-finite-bounds',
  'unexpected-closed-state',
  'self-intersection',
  'source-outside-positive-offset',
  'negative-offset-outside-source',
  'positive-offset-area-shrank',
  'negative-offset-area-grew',
  'offset-center-shift',
]);

function readIntegerArgument(name, fallback) {
  const prefix = `--${name}=`;
  const argument = process.argv.find((value) => value.startsWith(prefix));
  if (!argument) {
    return fallback;
  }
  const value = Number(argument.slice(prefix.length));
  assert.ok(Number.isInteger(value) && value > 0, `${name} must be a positive integer`);
  return value;
}

let state = readIntegerArgument('seed', DEFAULT_SEED) | 0;
const initialSeed = state >>> 0;
const total = readIntegerArgument('cases', DEFAULT_CASES);

function random() {
  state = state + 0x6d2b79f5 | 0;
  let value = Math.imul(state ^ state >>> 15, 1 | state);
  value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
  return ((value ^ value >>> 14) >>> 0) / 4294967296;
}

function range(min, max) {
  return min + (max - min) * random();
}

function makeRadialPath() {
  const count = 5 + Math.floor(range(0, 16));
  const base = range(35, 110);
  const segments = [];
  for (let i = 0; i < count; i += 1) {
    const angle = Math.PI * 2 * (i + range(-0.25, 0.25)) / count;
    const radius = base * range(0.28, 1.15);
    segments.push([
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
    ]);
  }
  const path = new paper.Path({ segments, closed: true, insert: false });
  if (random() < 0.35) {
    path.smooth({ type: 'continuous' });
  }
  return path;
}

function makeOpenPath() {
  const count = 2 + Math.floor(range(0, 9));
  const segments = [];
  let x = -90;
  for (let i = 0; i < count; i += 1) {
    segments.push([x, range(-70, 70)]);
    x += range(12, 42);
  }
  const path = new paper.Path({ segments, insert: false });
  if (random() < 0.5) {
    path.smooth({ type: 'continuous' });
  }
  return path;
}

function makeHoledCompound() {
  let result = new paper.Path.Circle({
    center: [0, 0],
    radius: range(65, 110),
    insert: false,
  });
  const count = 1 + Math.floor(range(0, 4));
  for (let i = 0; i < count; i += 1) {
    const cutter = new paper.Path.Circle({
      center: [range(-30, 30), range(-30, 30)],
      radius: range(5, 18),
      insert: false,
    });
    const next = result.subtract(cutter, { insert: false });
    result.remove();
    cutter.remove();
    result = next;
  }
  return result;
}

function makeNestedCompound() {
  const outerRadius = range(75, 110);
  const contours = [
    { radius: outerRadius, clockwise: true },
    { radius: outerRadius * range(0.48, 0.68), clockwise: false },
    { radius: outerRadius * range(0.16, 0.28), clockwise: true },
  ];
  if (random() < 0.5) {
    contours.push({ radius: outerRadius * range(0.05, 0.1), clockwise: false });
  }
  return new paper.CompoundPath({
    children: contours.map((contour) => {
      const child = new paper.Path.Circle({
        center: [0, 0],
        radius: contour.radius,
        insert: false,
      });
      if (child.clockwise !== contour.clockwise) {
        child.reverse();
      }
      return child;
    }),
    insert: false,
  });
}

function makeDisjointCompound() {
  const largeRadius = range(55, 100);
  const smallRadius = range(1.5, 7);
  const distance = largeRadius + smallRadius + range(20, 50);
  return new paper.CompoundPath({
    children: [
      new paper.Path.Circle({ center: [-distance / 2, 0], radius: largeRadius, insert: false }),
      new paper.Path.Circle({ center: [distance / 2, 0], radius: smallRadius, insert: false }),
    ],
    insert: false,
  });
}

function finiteBounds(path) {
  const bounds = path.bounds;
  return [bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite);
}

function summarizeAlgorithms(testCase, options) {
  const summaries = {};
  ['legacy', 'split', 'robust', 'adaptive', 'auto'].forEach((algorithm) => {
    const source = testCase.source.clone({ insert: false });
    try {
      const result = testCase.operation === 'stroke'
        ? offsetStroke(source, testCase.distance, Object.assign({}, options, { algorithm }))
        : offset(source, testCase.distance, Object.assign({}, options, { algorithm }));
      const quality = analyze(source, result, testCase.distance, {
        stroke: testCase.operation === 'stroke',
        join: options.join,
        cap: options.cap,
      });
      summaries[algorithm] = {
        area: quality.area,
        segmentCount: quality.segmentCount,
        score: quality.score,
        warnings: quality.warnings,
      };
    } catch (error) {
      summaries[algorithm] = {
        error: error && error.message ? error.message : String(error),
      };
    }
  });
  return summaries;
}

function medianBoundaryDistance(source, result, samples = 48) {
  if (!result.length) {
    return null;
  }
  const distances = [];
  for (let i = 0; i < samples; i += 1) {
    const point = result.getPointAt(result.length * i / samples);
    if (point) {
      distances.push(source.getNearestLocation(point).distance);
    }
  }
  distances.sort((left, right) => left - right);
  return distances[Math.floor(distances.length / 2)];
}

function hasErodibleInterior(source, distance) {
  const bounds = source.bounds;
  const candidates = source instanceof paper.CompoundPath
    ? source.children.map((child) => child.interiorPoint)
    : [source.interiorPoint];
  candidates.push(bounds.center);
  const divisions = 9;
  for (let y = 0; y < divisions; y += 1) {
    for (let x = 0; x < divisions; x += 1) {
      candidates.push(new paper.Point(
        bounds.left + bounds.width * (x + 0.5) / divisions,
        bounds.top + bounds.height * (y + 0.5) / divisions
      ));
    }
  }
  return candidates.some((point) => {
    return source.contains(point)
      && source.getNearestLocation(point).distance >= Math.abs(distance) * 1.02;
  });
}

function makeCase(index) {
  const operation = index % 6 === 0 ? 'stroke' : 'offset';
  if (operation === 'stroke') {
    return {
      operation,
      source: makeOpenPath(),
      distance: range(1, 20),
    };
  }
  const kind = index % 5;
  const source = kind === 0
    ? makeHoledCompound()
    : kind === 1
      ? makeNestedCompound()
      : kind === 2
        ? makeDisjointCompound()
        : makeRadialPath();
  const maxDistance = kind === 1 ? 9 : 24;
  return {
    operation,
    source,
    distance: (random() < 0.45 ? -1 : 1) * range(1, maxDistance),
  };
}

paper.setup(new paper.Size(1200, 900));

const failures = [];
const warningCounts = {};

for (let index = 0; index < total; index += 1) {
  paper.project.clear();
  const testCase = makeCase(index);
  const options = {
    algorithm: 'auto',
    join: index % 3 === 0 ? 'round' : index % 3 === 1 ? 'miter' : 'bevel',
    cap: index % 2 === 0 ? 'round' : 'butt',
    limit: 4,
    insert: false,
  };

  try {
    const result = testCase.operation === 'stroke'
      ? offsetStroke(testCase.source, testCase.distance, options)
      : offset(testCase.source, testCase.distance, options);
    const quality = analyze(testCase.source, result, testCase.distance, {
      stroke: testCase.operation === 'stroke',
      join: options.join,
      cap: options.cap,
    });
    quality.warnings.forEach((warning) => {
      warningCounts[warning] = (warningCounts[warning] || 0) + 1;
    });

    const emptyInwardResult = testCase.operation === 'offset'
      && testCase.distance < 0
      && quality.segmentCount === 0;
    const critical = quality.warnings.filter((warning) => {
      return CRITICAL_WARNINGS.has(warning)
        || (warning === 'empty-result'
          && (!emptyInwardResult || hasErodibleInterior(testCase.source, testCase.distance)));
    });
    if (!finiteBounds(result) || critical.length > 0) {
      failures.push({
        index,
        operation: testCase.operation,
        distance: testCase.distance,
        options,
        critical,
        quality,
        candidates: summarizeAlgorithms(testCase, options),
        sourceSelfIntersections: testCase.source.getIntersections(testCase.source)
          .filter((location) => location.isCrossing() || location.hasOverlap())
          .length,
        source: testCase.source.exportJSON({ asString: true, precision: 16 }),
      });
      continue;
    }

    if (testCase.operation === 'offset'
      && options.join === 'round'
      && quality.segmentCount > 0
      && testCase.source instanceof paper.Path
      && result instanceof paper.Path) {
      const median = medianBoundaryDistance(testCase.source, result);
      if (median !== null
        && Math.abs(median - Math.abs(testCase.distance)) > Math.max(1, Math.abs(testCase.distance) * 0.2)) {
        failures.push({
          index,
          operation: testCase.operation,
          distance: testCase.distance,
          options,
          median,
          quality,
          source: testCase.source.exportJSON({ asString: true, precision: 16 }),
        });
      }
    }
  } catch (error) {
    failures.push({
      index,
      operation: testCase.operation,
      distance: testCase.distance,
      options,
      error: error && error.message ? error.message : String(error),
      source: testCase.source.exportJSON({ asString: true, precision: 16 }),
    });
  }
}

assert.strictEqual(failures.length, 0, JSON.stringify({
  seed: `0x${initialSeed.toString(16)}`,
  total,
  failures: failures.slice(0, 10),
}, null, 2));

console.log(JSON.stringify({
  seed: `0x${initialSeed.toString(16)}`,
  total,
  failures: 0,
  warningCounts,
}, null, 2));
