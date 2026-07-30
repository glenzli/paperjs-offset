const { performance } = require('perf_hooks');
const paper = require('paper');
const { analyze, offset, offsetStroke } = require('../dist/index.cjs');
const createStressCases = require('../dev-site/fixtures/stress-cases.js');

const algorithms = ['legacy', 'split', 'robust', 'adaptive', 'auto'];

paper.setup(new paper.Size(1200, 900));

function percentile(values, ratio) {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

function runCase(testCase, algorithm) {
  paper.project.clear();
  const source = testCase.draw();
  const options = Object.assign({}, testCase.options, {
    algorithm,
    insert: false,
  });
  const start = performance.now();
  const result = testCase.operation === 'stroke'
    ? offsetStroke(source, testCase.distance, options)
    : offset(source, testCase.distance, options);
  const duration = performance.now() - start;
  const quality = analyze(source, result, testCase.distance, {
    stroke: testCase.operation === 'stroke',
  });
  return {
    id: testCase.id,
    ms: duration,
    warnings: quality.warnings,
  };
}

const cases = createStressCases(paper);
const summary = {};

algorithms.forEach((algorithm) => {
  const results = cases.map((testCase) => runCase(testCase, algorithm));
  const timings = results.map((result) => result.ms);
  summary[algorithm] = {
    totalMs: Number(timings.reduce((sum, value) => sum + value, 0).toFixed(3)),
    medianMs: Number(percentile(timings, 0.5).toFixed(3)),
    p95Ms: Number(percentile(timings, 0.95).toFixed(3)),
    maxMs: Number(Math.max.apply(null, timings).toFixed(3)),
    warningCount: results.reduce((sum, result) => sum + result.warnings.length, 0),
    slowest: results
      .sort((left, right) => right.ms - left.ms)
      .slice(0, 8)
      .map((result) => ({
        id: result.id,
        ms: Number(result.ms.toFixed(3)),
        warnings: result.warnings,
      })),
  };
});

console.log(JSON.stringify({
  node: process.version,
  cases: cases.length,
  summary,
}, null, 2));
