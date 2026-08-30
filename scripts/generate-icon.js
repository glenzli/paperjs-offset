const fs = require('node:fs');
const path = require('node:path');
const paper = require('paper');
const paperjsOffset = require('../dist/index.cjs');

const SIZE = 512;
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'paperjs-offset-icon.svg');
const COLORS = {
  ink: '#707986',
  cobalt: '#7898e2',
  cyan: '#9bced8',
  teal: '#78b8ac',
  coral: '#e7a0a8',
  paper: '#f8fafe',
};

paper.setup(new paper.Size(SIZE, SIZE));

function transformPoint(point) {
  const scale = 1;
  const rotation = -36 * Math.PI / 180;
  const bend = -18;
  const x = point[0];
  const edge = Math.min(1, Math.abs(x) / 220);
  const y = point[1] + bend * (1 - edge * edge);
  const scaledX = x * scale;
  const scaledY = y * scale;

  return new paper.Point(
    292 + scaledX * Math.cos(rotation) - scaledY * Math.sin(rotation),
    227 + scaledX * Math.sin(rotation) + scaledY * Math.cos(rotation)
  );
}

function makePath(points, closed) {
  const result = new paper.Path({
    segments: points.map(transformPoint),
    closed,
    insert: false,
  });
  result.smooth({ type: 'continuous' });
  return result;
}

function createArtwork() {
  const body = makePath([
    [180, 0], [167, -28], [140, -46], [100, -58],
    [46, -57], [-18, -49], [-86, -34], [-136, -18],
    [-176, -54], [-220, -72], [-202, -18], [-174, 0],
    [-202, 18], [-220, 72], [-176, 54], [-136, 18],
    [-86, 34], [-18, 49], [46, 57], [100, 58],
    [140, 46], [167, 28],
  ], true);
  body.clockwise = true;

  const offsetOptions = {
    join: 'round',
    limit: 4,
    algorithm: 'robust',
    insert: false,
  };
  const outer44 = paperjsOffset.offset(body, 44, offsetOptions);
  const outer30 = paperjsOffset.offset(body, 30, offsetOptions);
  const outer16 = paperjsOffset.offset(body, 16, offsetOptions);
  const inset16 = paperjsOffset.offset(body, -16, offsetOptions);

  const gill = makePath([
    [113, -34], [96, -13], [97, 10], [108, 27],
  ], false);
  const gillBand = paperjsOffset.offsetStroke(gill, 4, {
    join: 'round',
    cap: 'round',
    limit: 4,
    algorithm: 'robust',
    insert: false,
  });

  const eyeCenter = transformPoint([139, -7]);
  const eyeOuter = new paper.Path.Circle({
    center: eyeCenter,
    radius: 14,
    insert: false,
  });
  const eyeInner = new paper.Path.Circle({
    center: eyeCenter,
    radius: 6,
    insert: false,
  });

  return {
    body,
    outer44,
    outer30,
    outer16,
    inset16,
    gill,
    gillBand,
    eyeOuter,
    eyeInner,
  };
}

function escapeAttribute(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

function svgPath(item, style) {
  const attributes = [
    `d="${escapeAttribute(item.pathData)}"`,
    `fill="${style.fill || 'none'}"`,
    'fill-rule="evenodd"',
  ];
  if (style.stroke) {
    attributes.push(`stroke="${style.stroke}"`);
    attributes.push(`stroke-width="${style.strokeWidth}"`);
    attributes.push('stroke-linejoin="round"');
    attributes.push('stroke-linecap="round"');
  }
  return `  <path ${attributes.join(' ')}/>`;
}

function verifyArtwork(artwork) {
  const checks = [
    ['outer-44', artwork.body, artwork.outer44, 44, { join: 'round' }],
    ['outer-30', artwork.body, artwork.outer30, 30, { join: 'round' }],
    ['outer-16', artwork.body, artwork.outer16, 16, { join: 'round' }],
    ['inset-16', artwork.body, artwork.inset16, -16, { join: 'round' }],
    ['gill', artwork.gill, artwork.gillBand, 4, {
      stroke: true,
      join: 'round',
      cap: 'round',
    }],
  ];

  return checks.map(([name, source, result, distance, options]) => {
    const bounds = result && result.bounds;
    const hasFiniteBounds = bounds && [bounds.x, bounds.y, bounds.width, bounds.height]
      .every(Number.isFinite);
    if (!result || result.isEmpty() || !hasFiniteBounds) {
      throw new Error(`${name} offset did not produce finite geometry`);
    }
    const quality = paperjsOffset.analyze(source, result, distance, options);
    if (quality.selfIntersections > 0) {
      throw new Error(`${name} offset contains ${quality.selfIntersections} self-intersection(s)`);
    }
    return {
      name,
      algorithm: quality.algorithm,
      score: quality.score,
      warnings: quality.warnings,
      segmentCount: quality.segmentCount,
    };
  });
}

function renderSvg(artwork) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" role="img" aria-labelledby="title desc">`,
    '  <title id="title">paperjs-offset icon</title>',
    '  <desc id="desc">A koi surrounded by positive and negative offset contours generated with paperjs-offset.</desc>',
    svgPath(artwork.body, { fill: COLORS.paper }),
    svgPath(artwork.outer44, { stroke: COLORS.cyan, strokeWidth: 6 }),
    svgPath(artwork.outer30, { stroke: COLORS.teal, strokeWidth: 6 }),
    svgPath(artwork.outer16, { stroke: COLORS.cobalt, strokeWidth: 6 }),
    svgPath(artwork.body, { stroke: COLORS.ink, strokeWidth: 7 }),
    svgPath(artwork.inset16, { stroke: COLORS.coral, strokeWidth: 6 }),
    svgPath(artwork.gillBand, { fill: COLORS.coral }),
    svgPath(artwork.eyeOuter, { fill: COLORS.paper, stroke: COLORS.ink, strokeWidth: 5 }),
    svgPath(artwork.eyeInner, { fill: COLORS.coral }),
    '</svg>',
    '',
  ].join('\n');
}

const artwork = createArtwork();
const quality = verifyArtwork(artwork);
const svg = renderSvg(artwork);

if (process.argv.includes('--check')) {
  const current = fs.readFileSync(OUTPUT_PATH, 'utf8');
  if (current !== svg) {
    throw new Error(`${path.relative(process.cwd(), OUTPUT_PATH)} is not up to date`);
  }
} else {
  fs.writeFileSync(OUTPUT_PATH, svg, 'utf8');
}

console.log(JSON.stringify({
  output: path.relative(process.cwd(), OUTPUT_PATH),
  size: [SIZE, SIZE],
  quality,
}, null, 2));
