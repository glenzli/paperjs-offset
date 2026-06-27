const assert = require('assert');
const paper = require('paper');
const { analyze, offset, offsetStroke } = require('../dist/index.cjs');
const createStressCases = require('../demo/stress-cases.js');

const algorithms = ['legacy', 'split', 'robust', 'adaptive', 'auto'];
const criticalWarnings = new Set([
  'empty-result',
  'non-finite-bounds',
  'unexpected-closed-state',
  'self-intersection',
  'source-outside-positive-offset',
  'negative-offset-outside-source',
  'positive-offset-area-shrank',
  'negative-offset-area-grew',
  'negative-offset-collapse',
  'offset-center-shift',
]);

paper.setup(new paper.Size(1200, 900));

function getSelectedGroups() {
  const groupArg = process.argv.find((arg) => arg.indexOf('--groups=') === 0);
  if (!groupArg) {
    return null;
  }
  const groups = groupArg
    .replace('--groups=', '')
    .split(',')
    .map((group) => group.trim())
    .filter(Boolean);
  return groups.length > 0 ? new Set(groups) : null;
}

function cloneOptions(options, algorithm) {
  return Object.assign({}, options, {
    algorithm,
    insert: false,
  });
}

function runCase(testCase, algorithm) {
  paper.project.clear();
  const source = testCase.draw();
  const options = cloneOptions(testCase.options, algorithm);
  const result = testCase.operation === 'stroke'
    ? offsetStroke(source, testCase.distance, options)
    : offset(source, testCase.distance, options);
  const quality = analyze(source, result, testCase.distance, {
    stroke: testCase.operation === 'stroke',
  });

  return {
    algorithm,
    area: Number(result.area.toFixed(4)),
    score: Number(quality.score.toFixed(4)),
    warnings: quality.warnings,
    selfIntersections: quality.selfIntersections,
    containmentErrors: quality.containmentErrors,
    distanceErrors: quality.distanceErrors,
    segmentCount: quality.segmentCount,
  };
}

function hasCriticalWarning(summary) {
  return summary.warnings.some((warning) => criticalWarnings.has(warning));
}

const selectedGroups = getSelectedGroups();
const cases = createStressCases(paper).filter((testCase) => {
  return !selectedGroups || selectedGroups.has(testCase.kind);
});
assert.ok(cases.length > 0, 'stress group selection did not match any cases');
const failures = [];
const summaries = [];

cases.forEach((testCase) => {
  const results = {};
  algorithms.forEach((algorithm) => {
    try {
      results[algorithm] = runCase(testCase, algorithm);
    } catch (error) {
      results[algorithm] = {
        algorithm,
        error: error && error.message ? error.message : String(error),
        score: Number.POSITIVE_INFINITY,
        warnings: ['exception'],
      };
    }
  });

  summaries.push({
    id: testCase.id,
    title: testCase.title,
    kind: testCase.kind,
    operation: testCase.operation,
    distance: testCase.distance,
    results,
  });

  assert.ok(results.auto, `${testCase.id}: missing auto result`);
  if (results.auto.error || hasCriticalWarning(results.auto)) {
    failures.push({
      id: testCase.id,
      title: testCase.title,
      auto: results.auto,
      bestManual: algorithms
        .filter((algorithm) => algorithm !== 'auto' && !results[algorithm].error)
        .map((algorithm) => results[algorithm])
        .sort((a, b) => a.score - b.score)[0],
    });
  }
});

if (failures.length > 0) {
  console.error(JSON.stringify({
    total: cases.length,
    groups: selectedGroups ? Array.from(selectedGroups) : ['all'],
    failures,
  }, null, 2));
  process.exitCode = 1;
} else {
  const worst = summaries
    .map((summary) => ({
      id: summary.id,
      title: summary.title,
      autoScore: summary.results.auto.score,
      autoWarnings: summary.results.auto.warnings,
      bestManual: algorithms
        .filter((algorithm) => algorithm !== 'auto' && !summary.results[algorithm].error)
        .map((algorithm) => summary.results[algorithm])
        .sort((a, b) => a.score - b.score)[0],
    }))
    .sort((a, b) => b.autoScore - a.autoScore)
    .slice(0, 8);

  console.log(JSON.stringify({
    total: cases.length,
    groups: selectedGroups ? Array.from(selectedGroups) : ['all'],
    failures: 0,
    worst,
  }, null, 2));
}
